"""Cấp / thu hồi quyền admin. Chỉ chạy trên máy của người quản lý, dùng service_role
key trong .env.local (không bao giờ đưa key này lên client).

    python grant_admin.py add  email@example.com
    python grant_admin.py remove email@example.com
    python grant_admin.py list

Người được cấp phải đăng ký tài khoản trên web trước.
"""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def _find_user_id(client, email):
    rows = client.table("users").select("id").eq("email", email.strip().lower()).limit(1).execute().data
    if not rows:
        raise LookupError(f"Không tìm thấy tài khoản {email} — người này cần đăng ký trên web trước")
    return rows[0]["id"]


def grant_admin(client, email):
    user_id = _find_user_id(client, email)
    client.table("admins").upsert({"user_id": user_id}, on_conflict="user_id").execute()
    return user_id


def revoke_admin(client, email):
    user_id = _find_user_id(client, email)
    client.table("admins").delete().eq("user_id", user_id).execute()
    return user_id


def list_admins(client):
    ids = [row["user_id"] for row in client.table("admins").select("user_id").execute().data]
    if not ids:
        return []
    rows = client.table("users").select("email").in_("id", ids).execute().data
    return sorted(row["email"] or "(không có email)" for row in rows)


def _load_env_file(path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


def main(argv):
    if len(argv) < 1 or argv[0] not in {"add", "remove", "list"} or (argv[0] != "list" and len(argv) != 2):
        print(__doc__)
        return 2

    _load_env_file(ROOT / ".env.local")
    from supabase import create_client

    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    try:
        if argv[0] == "add":
            grant_admin(client, argv[1])
            print(f"Đã cấp quyền admin cho {argv[1]}")
        elif argv[0] == "remove":
            revoke_admin(client, argv[1])
            print(f"Đã thu hồi quyền admin của {argv[1]}")
        else:
            admins = list_admins(client)
            print("\n".join(admins) if admins else "Chưa có admin nào")
    except LookupError as error:
        print(error)
        return 1
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1:]))
