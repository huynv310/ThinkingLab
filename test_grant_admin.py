import pytest

from grant_admin import grant_admin, list_admins, revoke_admin


class FakeQuery:
    def __init__(self, db, table):
        self.db, self.table, self.filters, self.op, self.payload = db, table, [], "select", None

    def select(self, _cols):
        return self

    def eq(self, col, value):
        self.filters.append(lambda r: r.get(col) == value)
        return self

    def in_(self, col, values):
        self.filters.append(lambda r: r.get(col) in values)
        return self

    def limit(self, _n):
        return self

    def upsert(self, payload, on_conflict):
        self.op, self.payload, self.key = "upsert", payload, on_conflict
        return self

    def delete(self):
        self.op = "delete"
        return self

    def execute(self):
        rows = self.db[self.table]
        match = [r for r in rows if all(f(r) for f in self.filters)]
        if self.op == "upsert":
            if not any(r[self.key] == self.payload[self.key] for r in rows):
                rows.append(dict(self.payload))
        elif self.op == "delete":
            self.db[self.table] = [r for r in rows if r not in match]
        return type("R", (), {"data": match})()


class FakeClient:
    def __init__(self):
        self.db = {
            "users": [{"id": "u1", "email": "a@x.com"}, {"id": "u2", "email": "b@x.com"}],
            "admins": [],
        }

    def table(self, name):
        return FakeQuery(self.db, name)


def test_grant_adds_admin_by_email_case_insensitive():
    client = FakeClient()
    assert grant_admin(client, "  A@X.com ") == "u1"
    assert client.db["admins"] == [{"user_id": "u1"}]


def test_grant_twice_does_not_duplicate():
    client = FakeClient()
    grant_admin(client, "a@x.com")
    grant_admin(client, "a@x.com")
    assert len(client.db["admins"]) == 1


def test_grant_unknown_email_raises():
    with pytest.raises(LookupError):
        grant_admin(FakeClient(), "nobody@x.com")


def test_revoke_removes_only_that_admin():
    client = FakeClient()
    grant_admin(client, "a@x.com")
    grant_admin(client, "b@x.com")
    revoke_admin(client, "a@x.com")
    assert client.db["admins"] == [{"user_id": "u2"}]


def test_list_admins_returns_emails():
    client = FakeClient()
    assert list_admins(client) == []
    grant_admin(client, "b@x.com")
    assert list_admins(client) == ["b@x.com"]
