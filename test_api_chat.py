import uuid

import pytest
import requests

import api.chat as chat_api
from api.chat import MAX_CONTENT_CHARS, handle
from companion import CompanionReply

USER = "11111111-1111-1111-1111-111111111111"
OTHER = "22222222-2222-2222-2222-222222222222"


# --- Fake supabase-py client (service_role) ---

class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, db, table):
        self.db, self.table, self.filters, self.row = db, table, [], None

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

    def execute(self):
        if self.row is not None:
            self.db["_seq"] = self.db.get("_seq", 0) + 1
            row = {"id": self.db["_seq"] if self.table == "messages" else str(uuid.uuid4()),
                   "created_at": "2026-10-11T00:00:00+00:00", **self.row}
            self.db[self.table].append(row)
            return _Result([row])
        rows = [r for r in self.db[self.table] if all(r.get(c) == v for c, v in self.filters)]
        if getattr(self, "order_by", None):
            col, desc = self.order_by
            rows = sorted(rows, key=lambda r: r[col], reverse=desc)
        if getattr(self, "max_rows", None):
            rows = rows[: self.max_rows]
        return _Result(rows)


class _User:
    def __init__(self, uid):
        self.id = uid


class _UserResponse:
    def __init__(self, uid):
        self.user = _User(uid)


class _Auth:
    def get_user(self, jwt):
        if jwt == "valid-token":
            return _UserResponse(USER)
        raise Exception("invalid JWT")


class FakeClient:
    def __init__(self):
        self.db = {"conversations": [], "messages": []}
        self.auth = _Auth()

    def table(self, name):
        return _Query(self.db, name)


@pytest.fixture
def client():
    return FakeClient()


AUTH = "Bearer valid-token"


def _start(client, topic="giang-vien-a"):
    status, body = handle({"action": "start", "topic": topic}, AUTH, client)
    assert status == 200
    return body["conversation"]["id"]


# --- Xác thực ---

@pytest.mark.parametrize("header", [None, "", "valid-token", "Basic abc", "Bearer wrong-token"])
def test_rejects_missing_or_invalid_auth(client, header):
    status, _ = handle({"action": "start", "topic": "giang-vien-a"}, header, client)
    assert status == 401


# --- Bắt đầu cuộc trò chuyện ---

def test_start_creates_conversation_and_bot_opening(client):
    status, body = handle({"action": "start", "topic": "giang-vien-a"}, AUTH, client)

    assert status == 200
    conv = client.db["conversations"][0]
    assert conv["user_id"] == USER and conv["topic"] == "giang-vien-a"
    opening = client.db["messages"][0]
    assert opening["sender_type"] == "BOT" and opening["conversation_id"] == conv["id"]
    assert body["messages"][0]["content"] == opening["content"]


@pytest.mark.parametrize("topic", [None, "", "khong-ton-tai", 123])
def test_start_rejects_unknown_topic(client, topic):
    status, _ = handle({"action": "start", "topic": topic}, AUTH, client)
    assert status == 400
    assert client.db["conversations"] == []


# --- Trả lời ---

def test_reply_with_fallacy_stores_code_and_meme(client):
    conv_id = _start(client)

    status, body = handle(
        {"action": "reply", "conversation_id": conv_id, "content": "Tất cả sinh viên đều lười học."}, AUTH, client
    )

    assert status == 200
    user_msg, bot_msg = body["messages"]
    assert user_msg["sender_type"] == "USER" and user_msg["fallacy_code"] == "HASTY_GENERALIZATION"
    assert bot_msg["sender_type"] == "BOT" and bot_msg["meme_url"] == "/memes/hasty.svg"


def test_reply_to_someone_elses_conversation_is_not_found(client):
    client.db["conversations"].append({"id": str(uuid.uuid4()), "user_id": OTHER, "topic": "dam-dong"})
    conv_id = client.db["conversations"][0]["id"]

    status, _ = handle({"action": "reply", "conversation_id": conv_id, "content": "Xin chào bạn"}, AUTH, client)

    assert status == 404
    assert client.db["messages"] == []


@pytest.mark.parametrize("content", [None, "", "    ", 42, "x" * (MAX_CONTENT_CHARS + 1)])
def test_reply_rejects_invalid_content(client, content):
    conv_id = _start(client)
    before = len(client.db["messages"])

    status, _ = handle({"action": "reply", "conversation_id": conv_id, "content": content}, AUTH, client)

    assert status == 400
    assert len(client.db["messages"]) == before


@pytest.mark.parametrize("conv_id", [None, "", "not-a-uuid", "'; drop table messages; --"])
def test_reply_rejects_malformed_conversation_id(client, conv_id):
    status, _ = handle({"action": "reply", "conversation_id": conv_id, "content": "Xin chào"}, AUTH, client)
    assert status == 400


@pytest.mark.parametrize("payload", [None, [], "text", {"action": "drop"}, {}])
def test_rejects_unknown_action_or_bad_payload(client, payload):
    status, _ = handle(payload, AUTH, client)
    assert status == 400


def test_internal_error_returns_500_without_leaking_details(client, monkeypatch):
    def boom(*_):
        raise RuntimeError("db password=secret")

    monkeypatch.setattr(client, "table", boom)
    status, body = handle({"action": "start", "topic": "giang-vien-a"}, AUTH, client)

    assert status == 500
    assert "secret" not in str(body)


# --- Bạn trò chuyện AI ---

@pytest.fixture
def ai(monkeypatch):
    state = {"reply": CompanionReply("Ủa, ai nói vậy đâu 😆", "STRAW_MAN", "nice try"), "calls": []}

    def fake_generate(topic, history, text):
        state["calls"].append((topic, list(history), text))
        if isinstance(state["reply"], Exception):
            raise state["reply"]
        return state["reply"]

    monkeypatch.setattr(chat_api.companion, "generate_reply", fake_generate)
    monkeypatch.setattr(chat_api.memes, "find_meme", lambda q: "https://media1.giphy.com/media/x/200.gif" if q else None)
    monkeypatch.setattr(chat_api.random, "random", lambda: 0.0)  # mặc định: luôn cho meme
    return state


def test_reply_uses_ai_companion(client, ai):
    conv_id = _start(client, "dam-dong")
    status, body = handle({"action": "reply", "conversation_id": conv_id, "content": "Vậy là bạn muốn bỏ học à"}, AUTH, client)

    assert status == 200
    user_msg, bot_msg = body["messages"]
    assert user_msg["fallacy_code"] == "STRAW_MAN"
    assert bot_msg["content"] == "Ủa, ai nói vậy đâu 😆"
    assert bot_msg["meme_url"] == "https://media1.giphy.com/media/x/200.gif"


def test_ai_receives_topic_and_history_in_order(client, ai):
    ai["reply"] = CompanionReply("ok", None, None)
    conv_id = _start(client, "dam-dong")
    handle({"action": "reply", "conversation_id": conv_id, "content": "câu 1"}, AUTH, client)
    handle({"action": "reply", "conversation_id": conv_id, "content": "câu 2"}, AUTH, client)

    topic, history, text = ai["calls"][-1]
    assert topic == "dam-dong" and text == "câu 2"
    assert [m["content"] for m in history][-2:] == ["câu 1", "ok"]
    assert history[0]["sender_type"] == "BOT"  # câu mở đầu


def test_fallacy_without_giphy_uses_local_meme(client, ai, monkeypatch):
    monkeypatch.setattr(chat_api.memes, "find_meme", lambda q: None)
    ai["reply"] = CompanionReply("Tất cả luôn hả?", "HASTY_GENERALIZATION", "nice try")
    conv_id = _start(client)
    _, body = handle({"action": "reply", "conversation_id": conv_id, "content": "x y z"}, AUTH, client)
    assert body["messages"][1]["meme_url"] == "/memes/hasty.svg"


def test_no_meme_when_ai_suggests_none(client, ai):
    ai["reply"] = CompanionReply("Hay đó!", None, None)
    conv_id = _start(client)
    _, body = handle({"action": "reply", "conversation_id": conv_id, "content": "x y z"}, AUTH, client)
    assert body["messages"][1]["meme_url"] is None


def test_ai_failure_falls_back_without_more_api_calls(client, ai, monkeypatch):
    ai["reply"] = requests.HTTPError("503")
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setattr(requests, "post", lambda *a, **k: pytest.fail("fallback không được gọi AI"))
    conv_id = _start(client)

    status, body = handle(
        {"action": "reply", "conversation_id": conv_id, "content": "Tất cả sinh viên đều lười học."}, AUTH, client
    )
    assert status == 200
    assert body["messages"][0]["fallacy_code"] == "HASTY_GENERALIZATION"
    assert body["messages"][1]["meme_url"] == "/memes/hasty.svg"


def test_non_fallacy_memes_are_rationed(client, ai, monkeypatch):
    found = []
    monkeypatch.setattr(chat_api.memes, "find_meme", lambda q: found.append(q) or "https://media1.giphy.com/x.gif")
    monkeypatch.setattr(chat_api.random, "random", lambda: 0.99)
    ai["reply"] = CompanionReply("Hay đó!", None, "mind blown")
    conv_id = _start(client)
    _, body = handle({"action": "reply", "conversation_id": conv_id, "content": "x y z"}, AUTH, client)
    assert body["messages"][1]["meme_url"] is None
    assert found == []  # không tốn lượt gọi GIPHY


def test_fallacy_always_gets_meme(client, ai, monkeypatch):
    monkeypatch.setattr(chat_api.random, "random", lambda: 0.99)
    conv_id = _start(client)
    _, body = handle({"action": "reply", "conversation_id": conv_id, "content": "x y z"}, AUTH, client)
    assert body["messages"][1]["meme_url"]
