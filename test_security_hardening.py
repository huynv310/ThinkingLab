import io
import json
import time
import pytest

import api.chat as chat_api
from api.chat import (
    _UserGuard,
    _check_rate_limit,
    _HttpError,
    _start,
    _insert_message,
    _recent_messages,
    handler,
    reset_rate_limits,
    MAX_BODY_BYTES,
)

USER_1 = "11111111-1111-1111-1111-111111111111"
USER_2 = "22222222-2222-2222-2222-222222222222"


# --- 1. Concurrency Lock (_UserGuard) Tests ---

def test_user_guard_blocks_concurrent_in_flight():
    """Đảm bảo 1 user không thể gửi 2 request song song (chống TOCTOU race condition)."""
    with _UserGuard(USER_1):
        # Khi request 1 đang chạy, request 2 từ cùng user phải bị chặn ngay với HTTP 429
        with pytest.raises(_HttpError) as exc_info:
            with _UserGuard(USER_1):
                pass
        assert exc_info.value.status == 429
        assert exc_info.value.code == "request_in_progress"

    # Sau khi request 1 hoàn tất, request tiếp theo của user_1 phải được thực thi bình thường
    with _UserGuard(USER_1):
        pass


def test_user_guard_allows_different_users_concurrently():
    """Hai user khác nhau có thể trò chuyện song song không bị chặn lẫn nhau."""
    with _UserGuard(USER_1):
        with _UserGuard(USER_2):
            pass


def test_user_guard_releases_lock_on_exception():
    """Nếu handler gặp lỗi/ngoại lệ, lock phải luôn được giải phóng an toàn (finally)."""
    try:
        with _UserGuard(USER_1):
            raise RuntimeError("Unexpected failure")
    except RuntimeError:
        pass

    # Lock đã được nhả, user_1 tiếp tục được
    with _UserGuard(USER_1):
        pass


# --- 2. Rate Limiting Tests ---

def test_rate_limit_blocks_rapid_spam(monkeypatch):
    """Chặn spam bấm liên tục với khoảng cách < 1.0 giây."""
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    reset_rate_limits()

    # Request 1: OK
    _check_rate_limit(USER_1)

    # Request 2 ngay tức thì: Bị chặn với HTTP 429 rate_limited
    with pytest.raises(_HttpError) as exc:
        _check_rate_limit(USER_1)
    assert exc.value.status == 429
    assert exc.value.code == "rate_limited"


def test_rate_limit_blocks_window_burst(monkeypatch):
    """Chặn spam vượt quá số lượng request trong 1 phút (RATE_LIMIT_MAX_PER_MINUTE)."""
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    reset_rate_limits()

    now = time.monotonic()
    # Giả lập số lượng request đã chạm trần trong vòng 1 phút
    chat_api._user_timestamps[USER_1] = [now - 50 + i * 2 for i in range(chat_api.RATE_LIMIT_MAX_PER_MINUTE)]

    # Request tiếp theo: Bị chặn do vượt quá hạn mức cửa sổ trượt
    with pytest.raises(_HttpError) as exc:
        _check_rate_limit(USER_1)
    assert exc.value.status == 429
    assert exc.value.code == "rate_limited"


def test_rate_limit_disabled_when_env_false(monkeypatch):
    """Khi biến môi trường RATE_LIMIT_ENABLED=false, bỏ qua kiểm tra rate limit."""
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "false")
    reset_rate_limits()

    _check_rate_limit(USER_1)
    _check_rate_limit(USER_1)  # Không raise lỗi


# --- 3. HTTP Handler Tests ---

class MockConnection:
    def __init__(self):
        self.timeout = None

    def settimeout(self, timeout):
        self.timeout = timeout


class DummyHandler(handler):
    def __init__(self, headers, body_bytes=b"", has_connection=True):
        self.headers = headers
        self.rfile = io.BytesIO(body_bytes)
        self.wfile = io.BytesIO()
        self.connection = MockConnection() if has_connection else None
        self.response_status = None
        self.response_headers = {}

    def send_response(self, code, message=None):
        self.response_status = code

    def send_header(self, keyword, value):
        self.response_headers[keyword] = value

    def end_headers(self):
        pass


def test_handler_sets_socket_timeout(monkeypatch):
    monkeypatch.setattr(chat_api, "handle", lambda payload, auth, client: (200, {"status": "ok"}))
    monkeypatch.setattr(chat_api, "_get_client", lambda: None)
    h = DummyHandler({"Content-Length": "2"}, body_bytes=b"{}")
    h.do_POST()
    assert h.connection.timeout == 15.0
    assert h.response_status == 200


def test_handler_rejects_invalid_content_length():
    h = DummyHandler({"Content-Length": "not-a-number"})
    h.do_POST()
    assert h.response_status == 400
    resp = json.loads(h.wfile.getvalue().decode("utf-8"))
    assert "Content-Length không hợp lệ" in resp["error"]


def test_handler_rejects_negative_content_length():
    h = DummyHandler({"Content-Length": "-10"})
    h.do_POST()
    assert h.response_status == 400
    resp = json.loads(h.wfile.getvalue().decode("utf-8"))
    assert "Content-Length không hợp lệ" in resp["error"]


def test_handler_rejects_payload_too_large():
    h = DummyHandler({"Content-Length": str(MAX_BODY_BYTES + 1)})
    h.do_POST()
    assert h.response_status == 413
    resp = json.loads(h.wfile.getvalue().decode("utf-8"))
    assert "Body quá lớn" in resp["error"]


def test_handler_rejects_malformed_json():
    bad_json = b'{"action": "start", '
    h = DummyHandler({"Content-Length": str(len(bad_json))}, body_bytes=bad_json)
    h.do_POST()
    assert h.response_status == 400
    resp = json.loads(h.wfile.getvalue().decode("utf-8"))
    assert "JSON không hợp lệ" in resp["error"]


# --- 4. Database Helper Robustness Tests ---

class DummyResult:
    def __init__(self, data):
        self.data = data


class DummyTable:
    def __init__(self, return_data):
        self.return_data = return_data

    def insert(self, row):
        return self

    def select(self, *args):
        return self

    def eq(self, *args):
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, *args):
        return self

    def execute(self):
        return DummyResult(self.return_data)


class DummyClient:
    def __init__(self, return_data):
        self.return_data = return_data

    def table(self, name):
        return DummyTable(self.return_data)


def test_start_raises_500_when_insert_returns_empty():
    client = DummyClient([])
    with pytest.raises(_HttpError) as exc:
        _start(client, USER_1, "boc-phot")
    assert exc.value.status == 500
    assert "Không thể khởi tạo cuộc hội thoại" in exc.value.message


def test_insert_message_raises_500_when_insert_returns_empty():
    client = DummyClient([])
    with pytest.raises(_HttpError) as exc:
        _insert_message(client, "some-id", "BOT", "Hello")
    assert exc.value.status == 500
    assert "Không thể lưu tin nhắn" in exc.value.message


def test_recent_messages_handles_none_data():
    client = DummyClient(None)
    messages = _recent_messages(client, "some-id")
    assert messages == []
