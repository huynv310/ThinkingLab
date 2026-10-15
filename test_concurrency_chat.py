"""Kiểm thử tính năng đồng thời (Concurrency) và an toàn luồng (Thread-Safety)
cho hệ thống ThinkingLab:
1. Hai người dùng khác nhau gửi tin nhắn cùng lúc -> Xử lý song song, 100% thành công (200 OK).
2. Cùng 1 người dùng gửi 2 tin nhắn cùng lúc -> Chặn đứng đua tranh TOCTOU bằng 429 request_in_progress.
3. Người dùng này không thể can thiệp hay gửi tin vào cuộc trò chuyện của người dùng khác (404 Not Found).
4. Cân bằng tải đồng thời giữa các API key (Least-Loaded Load Balancing).
"""

import concurrent.futures
import os
import threading
import time
import uuid
import pytest

import api.chat as chat_api
from api.chat import handle, reset_rate_limits
import companion
import gemini_client

USER_A = "11111111-1111-1111-1111-111111111111"
USER_B = "22222222-2222-2222-2222-222222222222"
AUTH_A = "Bearer token-a"
AUTH_B = "Bearer token-b"


class _ThreadSafeQuery:
    def __init__(self, db, lock, table):
        self.db = db
        self.lock = lock
        self.table = table
        self.filters = []
        self.row = None
        self.order_by = None
        self.max_rows = None
        self.const = None

    def select(self, *_):
        return self

    def insert(self, row):
        self.row = row
        return self

    def eq(self, col, val):
        self.filters.append((col, val))
        return self

    def limit(self, n):
        self.max_rows = n
        return self

    def order(self, col, desc=False):
        self.order_by = (col, desc)
        return self

    def _const(self, value):
        class _Res:
            def __init__(self, d):
                self.data = d
        self.const = _Res(value)
        return self

    def execute(self):
        class _Res:
            def __init__(self, d):
                self.data = d

        if self.const is not None:
            return self.const

        with self.lock:
            if self.row is not None:
                self.db["_seq"] = self.db.get("_seq", 0) + 1
                defaults = {"token_count": 0, "custom_topic": None} if self.table == "conversations" else {}
                row = {
                    "id": self.db["_seq"] if self.table == "messages" else str(uuid.uuid4()),
                    "created_at": "2026-10-15T00:00:00+00:00",
                    **defaults,
                    **self.row,
                }
                self.db[self.table].append(row)
                return _Res([row])

            rows = [r for r in self.db[self.table] if all(r.get(c) == v for c, v in self.filters)]
            if self.order_by:
                col, desc = self.order_by
                rows = sorted(rows, key=lambda r: r[col], reverse=desc)
            if self.max_rows:
                rows = rows[: self.max_rows]
            return _Res(rows)


class _ThreadSafeAuth:
    def get_user(self, jwt):
        class _User:
            def __init__(self, uid):
                self.id = uid

        class _UserResponse:
            def __init__(self, uid):
                self.user = _User(uid)

        if jwt == "token-a":
            return _UserResponse(USER_A)
        if jwt == "token-b":
            return _UserResponse(USER_B)
        raise Exception("Invalid JWT token")


class ThreadSafeClient:
    def __init__(self):
        self.db = {"conversations": [], "messages": [], "token_usage_daily": []}
        self.lock = threading.Lock()
        self.auth = _ThreadSafeAuth()

    def table(self, name):
        return _ThreadSafeQuery(self.db, self.lock, name)

    def rpc(self, name, params):
        assert name == "record_token_usage"
        with self.lock:
            key = (params["p_user_id"], params["p_day"])
            tokens = max(params["p_tokens"], 0)
            rows = self.db["token_usage_daily"]
            row = next((r for r in rows if (r["user_id"], r["day"]) == key), None)
            if row is None:
                row = {"user_id": key[0], "day": key[1], "tokens": 0}
                rows.append(row)
            row["tokens"] += tokens
            conversation = None
            if params.get("p_conversation_id"):
                conv = next(
                    c for c in self.db["conversations"]
                    if c["id"] == params["p_conversation_id"] and c["user_id"] == params["p_user_id"]
                )
                extra = params.get("p_conversation_tokens")
                conv["token_count"] += max(tokens if extra is None else extra, 0)
                conversation = conv["token_count"]
            return _ThreadSafeQuery(self.db, self.lock, "x")._const(
                {"daily": row["tokens"], "conversation": conversation}
            )


@pytest.fixture(autouse=True)
def clean_state():
    reset_rate_limits()
    gemini_client.reset_cooldowns()
    yield
    reset_rate_limits()
    gemini_client.reset_cooldowns()


def test_two_different_users_chat_concurrently(monkeypatch):
    """Hai người dùng khác nhau cùng lúc ấn gửi tin nhắn -> cả 2 đều thành công 200 OK song song."""
    client = ThreadSafeClient()

    # 1. Khởi tạo cuộc trò chuyện cho User A và User B
    s_a, b_a = handle({"action": "start", "topic": "giang-vien-a"}, AUTH_A, client)
    s_b, b_b = handle({"action": "start", "topic": "boc-phot"}, AUTH_B, client)
    assert s_a == 200 and s_b == 200
    conv_a_id = b_a["conversation"]["id"]
    conv_b_id = b_b["conversation"]["id"]

    # 2. Giả lập Gemini có độ trễ ~60ms để 2 luồng chồng lấn thời gian thực thi
    def slow_generate_reply(*args, **kwargs):
        time.sleep(0.06)
        usage = kwargs.get("usage")
        if isinstance(usage, dict):
            usage["total"] = 850
        return companion.CompanionReply(
            text="Góc nhìn thú vị, bạn có thêm dẫn chứng không?",
            fallacy_code=None,
            meme_query="slow clap",
        )

    monkeypatch.setattr(companion, "generate_reply", slow_generate_reply)

    # 3. Kích hoạt 2 request gửi tin nhắn tại cùng một mili-giây
    def send_a():
        return handle({"action": "reply", "conversation_id": conv_a_id, "content": "Tin nhắn từ User A"}, AUTH_A, client)

    def send_b():
        return handle({"action": "reply", "conversation_id": conv_b_id, "content": "Tin nhắn từ User B"}, AUTH_B, client)

    t0 = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f_a = executor.submit(send_a)
        f_b = executor.submit(send_b)
        status_a, res_a = f_a.result()
        status_b, res_b = f_b.result()
    duration = time.perf_counter() - t0

    # Cả 2 đều phải thành công 200
    assert status_a == 200, f"User A failed with: {res_a}"
    assert status_b == 200, f"User B failed with: {res_b}"

    # Cả 2 đều nhận được 2 tin nhắn (User + Bot)
    assert len(res_a["messages"]) == 2
    assert len(res_b["messages"]) == 2
    assert res_a["messages"][0]["content"] == "Tin nhắn từ User A"
    assert res_b["messages"][0]["content"] == "Tin nhắn từ User B"

    # Tổng thời gian xử lý song song ~60ms-120ms (chứ không phải 60ms * 2 = 120ms+ tuần tự)
    assert duration < 0.2, f"Expected parallel execution, took {duration:.3f}s"


def test_same_user_concurrent_requests_blocked_by_guard(monkeypatch):
    """Cùng 1 người dùng gửi 2 tin nhắn tại cùng 1 mili-giây -> 1 request thành công, request kia bị chặn 429."""
    client = ThreadSafeClient()

    s, b = handle({"action": "start", "topic": "giang-vien-a"}, AUTH_A, client)
    assert s == 200
    conv_id = b["conversation"]["id"]

    barrier = threading.Barrier(2)

    def slow_generate_reply(*args, **kwargs):
        # Giữ khóa trong 0.1s để request thứ 2 chắc chắn va chạm với _UserGuard
        time.sleep(0.08)
        usage = kwargs.get("usage")
        if isinstance(usage, dict):
            usage["total"] = 850
        return companion.CompanionReply(
            text="Phản hồi từ AI",
            fallacy_code=None,
            meme_query=None,
        )

    monkeypatch.setattr(companion, "generate_reply", slow_generate_reply)

    def send_tab(idx):
        barrier.wait()  # Bắn 2 luồng tại cùng 1 tích tắc tuyệt đối
        return handle(
            {"action": "reply", "conversation_id": conv_id, "content": f"Tin nhắn từ Tab {idx}"},
            AUTH_A,
            client,
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(send_tab, 1), executor.submit(send_tab, 2)]
        results = [f.result() for f in futures]

    statuses = [r[0] for r in results]
    codes = [r[1].get("code") for r in results if isinstance(r[1], dict)]

    # Phải có chính xác 1 request thành công (200) và 1 request bị chặn (429)
    assert 200 in statuses, f"Expected at least one success: {statuses}"
    assert 429 in statuses, f"Expected one 429 collision rejection: {statuses}"
    assert "request_in_progress" in codes or "rate_limited" in codes


def test_user_cannot_reply_to_another_users_conversation():
    """User B cố tình gửi tin nhắn vào cuộc trò chuyện của User A -> Bị từ chối 404 Not Found."""
    client = ThreadSafeClient()

    # User A tạo cuộc trò chuyện
    s_a, b_a = handle({"action": "start", "topic": "giang-vien-a"}, AUTH_A, client)
    assert s_a == 200
    conv_a_id = b_a["conversation"]["id"]

    # User B cố tình dùng conv_a_id để gửi
    status, body = handle(
        {"action": "reply", "conversation_id": conv_a_id, "content": "Hack cuộc trò chuyện"},
        AUTH_B,
        client,
    )
    assert status == 404
    assert body.get("error") == "Không tìm thấy cuộc trò chuyện"


def test_least_loaded_load_balancer_distributes_concurrent_keys(monkeypatch):
    """Khi có nhiều request đồng thời, Load Balancer phân bổ đều qua các API key."""
    monkeypatch.setenv("GEMINI_API_KEYS", "key-alpha,key-beta,key-gamma")
    monkeypatch.setenv("GEMINI_JITTER_ENABLED", "false")

    # Giả lập 3 request đồng thời lấy API key
    def get_key_task():
        k = gemini_client.api_key()
        gemini_client._record_key_use(k)
        return k

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        f1 = executor.submit(get_key_task)
        f2 = executor.submit(get_key_task)
        f3 = executor.submit(get_key_task)
        keys_chosen = {f1.result(), f2.result(), f3.result()}

    # Cả 3 key đều phải được sử dụng (phân bổ đều, không dồn vào 1 key)
    assert keys_chosen == {"key-alpha", "key-beta", "key-gamma"}
