from datetime import datetime, timedelta, timezone

import pytest

import archive_conversations as ac


# --- Fake Supabase client: mô phỏng đủ phần query builder mà job dùng ---

class _Result:
    def __init__(self, data):
        self.data = data


class _Query:
    def __init__(self, db, table, direct_writes):
        self.db, self.table, self.direct_writes = db, table, direct_writes
        self.op, self.payload = "select", None
        self.filters, self.order_keys = [], []
        self.start = self.end = self.max_rows = None

    def select(self, *_):
        return self

    def update(self, payload):
        self.op, self.payload = "update", payload
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, col, val):
        self.filters.append(lambda r: r[col] == val)
        return self

    def lt(self, col, val):
        self.filters.append(lambda r: r[col] < val)
        return self

    def lte(self, col, val):
        self.filters.append(lambda r: r[col] <= val)
        return self

    def order(self, col):
        self.order_keys.append(col)
        return self

    def limit(self, n):
        self.max_rows = n
        return self

    def range(self, start, end):
        self.start, self.end = start, end
        return self

    def execute(self):
        rows = [r for r in self.db[self.table] if all(f(r) for f in self.filters)]
        if self.op != "select":
            self.direct_writes.append((self.op, self.table))
        if self.op == "update":
            for r in rows:
                r.update(self.payload)
            return _Result([dict(r) for r in rows])
        if self.op == "delete":
            ids = {id(r) for r in rows}
            self.db[self.table] = [r for r in self.db[self.table] if id(r) not in ids]
            return _Result([dict(r) for r in rows])
        rows.sort(key=lambda r: [r[k] for k in self.order_keys])
        if self.start is not None:
            rows = rows[self.start:self.end + 1]
        if self.max_rows is not None:
            rows = rows[:self.max_rows]
        return _Result([dict(r) for r in rows])


class _ArchiveRpc:
    """Mô phỏng hàm Postgres public.archive_conversation (1 transaction)."""

    def __init__(self, db, params):
        self.db, self.params = db, params

    def execute(self):
        p = self.params
        conv = next((c for c in self.db["conversations"] if c["id"] == p["p_conversation_id"]), None)
        if not conv or conv["status"] != "ACTIVE" or conv["last_interacted_at"] != p["p_cutoff"]:
            return _Result(False)
        conv.update({"context_summary": p["p_summary"], "status": "ARCHIVED"})
        self.db["messages"] = [m for m in self.db["messages"] if m["conversation_id"] != conv["id"]]
        return _Result(True)


class FakeSupabase:
    def __init__(self, conversations, messages):
        self.db = {"conversations": conversations, "messages": messages}
        self.direct_writes = []

    def table(self, name):
        return _Query(self.db, name, self.direct_writes)

    def rpc(self, name, params):
        assert name == "archive_conversation"
        assert set(params) == {"p_conversation_id", "p_summary", "p_cutoff"}
        return _ArchiveRpc(self.db, params)


def _ago(days):
    return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()


def _conv(cid, days_ago, status="ACTIVE"):
    return {"id": cid, "status": status, "last_interacted_at": _ago(days_ago), "context_summary": None}


def _msgs(cid, n, days_ago=10):
    return [
        {"id": f"{cid}-{i}", "conversation_id": cid, "sender_type": "USER" if i % 2 == 0 else "BOT",
         "content": f"{cid} message {i}", "created_at": _ago(days_ago - i * 0.001)}
        for i in range(n)
    ]


def _get(client, cid):
    return next(c for c in client.db["conversations"] if c["id"] == cid)


def _msg_count(client, cid):
    return sum(1 for m in client.db["messages"] if m["conversation_id"] == cid)


# --- Tests ---

def test_archives_stale_active_conversation():
    client = FakeSupabase([_conv("old", 8)], _msgs("old", 3))

    stats = ac.archive_old_conversations(client)

    conv = _get(client, "old")
    assert stats == {"archived": 1, "skipped": 0, "failed": 0}
    assert conv["status"] == "ARCHIVED"
    assert conv["context_summary"] and len(conv["context_summary"]) <= ac.MAX_SUMMARY_CHARS
    assert _msg_count(client, "old") == 0


def test_archives_atomically_via_rpc_without_direct_writes():
    client = FakeSupabase([_conv("old", 8)], _msgs("old", 3))

    ac.archive_old_conversations(client)

    # update + delete phải nằm trong 1 transaction ở DB, không gọi lẻ từ client
    assert client.direct_writes == []
    assert _get(client, "old")["status"] == "ARCHIVED"


def test_ignores_recent_and_already_archived_conversations():
    client = FakeSupabase(
        [_conv("recent", 6), _conv("archived", 30, status="ARCHIVED")],
        _msgs("recent", 2) + _msgs("archived", 2),
    )

    stats = ac.archive_old_conversations(client)

    assert stats == {"archived": 0, "skipped": 0, "failed": 0}
    assert _get(client, "recent")["status"] == "ACTIVE"
    assert _msg_count(client, "recent") == 2
    assert _msg_count(client, "archived") == 2


def test_one_failing_conversation_does_not_stop_the_others(monkeypatch):
    client = FakeSupabase([_conv("bad", 9), _conv("good", 8)], _msgs("bad", 2) + _msgs("good", 2))
    real_summarize = ac._mock_summarize_llm

    def flaky_summarize(chat_history):
        if "bad message" in chat_history:
            raise RuntimeError("LLM timeout")
        return real_summarize(chat_history)

    monkeypatch.setattr(ac, "_mock_summarize_llm", flaky_summarize)

    stats = ac.archive_old_conversations(client)

    assert stats == {"archived": 1, "skipped": 0, "failed": 1}
    assert _get(client, "bad")["status"] == "ACTIVE"
    assert _msg_count(client, "bad") == 2  # lỗi -> không mất dữ liệu
    assert _get(client, "good")["status"] == "ARCHIVED"
    assert _msg_count(client, "good") == 0


def test_skips_conversation_that_user_resumed_during_archiving(monkeypatch):
    client = FakeSupabase([_conv("live", 8)], _msgs("live", 2))
    real_summarize = ac._mock_summarize_llm

    def summarize_while_user_chats(chat_history):
        _get(client, "live")["last_interacted_at"] = _ago(0)  # user quay lại chat
        return real_summarize(chat_history)

    monkeypatch.setattr(ac, "_mock_summarize_llm", summarize_while_user_chats)

    stats = ac.archive_old_conversations(client)

    assert stats == {"archived": 0, "skipped": 1, "failed": 0}
    assert _get(client, "live")["status"] == "ACTIVE"
    assert _msg_count(client, "live") == 2


def test_fetches_all_message_pages(monkeypatch):
    monkeypatch.setattr(ac, "PAGE_SIZE", 2)
    client = FakeSupabase([_conv("long", 8)], _msgs("long", 5))

    ac.archive_old_conversations(client)

    assert "5 tin nhắn" in _get(client, "long")["context_summary"]
    assert _msg_count(client, "long") == 0


def test_respects_batch_size():
    client = FakeSupabase([_conv(f"c{i}", 8 + i) for i in range(3)], [])

    stats = ac.archive_old_conversations(client, batch_size=2)

    assert stats["archived"] == 2
    assert sum(c["status"] == "ARCHIVED" for c in client.db["conversations"]) == 2


@pytest.mark.parametrize(
    "history, expected",
    [("", "Phiên hội thoại trống."), ("   \n  ", "Phiên hội thoại trống.")],
)
def test_mock_summarize_handles_empty_history(history, expected):
    assert ac._mock_summarize_llm(history) == expected


def test_mock_summarize_is_bounded_for_huge_history():
    summary = ac._mock_summarize_llm("USER: " + "x" * 100_000)
    assert len(summary) <= ac.MAX_SUMMARY_CHARS
