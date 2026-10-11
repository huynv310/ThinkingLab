"""POST /api/chat - Vercel Python serverless function cho chatbot ThinkingLab.

Body JSON:
  {"action": "start", "topic": "<topic_id>"}                     -> tạo phiên + câu mở đầu của bot
  {"action": "reply", "conversation_id": "<uuid>", "content": ""} -> lưu câu user + câu trả lời bot
Header: Authorization: Bearer <access_token của Supabase Auth>

Chạy bằng service_role (bỏ qua RLS) nên MỌI kiểm tra quyền sở hữu phải làm ở đây.
Chạy local: python api/chat.py  (đọc biến môi trường từ .env.local)
"""

import json
import logging
import os
import random
import sys
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import companion  # noqa: E402
import memes  # noqa: E402
from chatbot import TOPICS, build_reply, opening_message  # noqa: E402

logger = logging.getLogger(__name__)

MAX_CONTENT_CHARS = 2000
MAX_BODY_BYTES = 16_384
MEME_CHANCE = 0.3  # lượt không có ngụy biện: chỉ ~30% kèm meme (AI hay đề xuất quá nhiều)
LOCAL_MEMES = {
    "HASTY_GENERALIZATION": "hasty",
    "AD_HOMINEM": "ad-hominem",
    "STRAW_MAN": "straw-man",
}
MESSAGE_FIELDS = ("id", "conversation_id", "sender_type", "content", "fallacy_code", "meme_url", "created_at")


class _HttpError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


def handle(payload, auth_header, client):
    """Logic thuần (không phụ thuộc HTTP) -> (status, body). Dễ test với client giả."""
    try:
        user_id = _authenticate(auth_header, client)
        if not isinstance(payload, dict):
            raise _HttpError(400, "Body phải là JSON object")
        action = payload.get("action")
        if action == "start":
            return 200, _start(client, user_id, payload.get("topic"))
        if action == "reply":
            return 200, _reply(client, user_id, payload.get("conversation_id"), payload.get("content"))
        raise _HttpError(400, "action không hợp lệ")
    except _HttpError as e:
        return e.status, {"error": e.message}
    except Exception:
        logger.exception("chat handler failed")  # chi tiết chỉ vào log server, không trả cho client
        return 500, {"error": "Lỗi máy chủ, vui lòng thử lại"}


def _authenticate(auth_header, client):
    if not isinstance(auth_header, str) or not auth_header.startswith("Bearer "):
        raise _HttpError(401, "Chưa đăng nhập")
    try:
        response = client.auth.get_user(auth_header[len("Bearer "):])
        return response.user.id
    except Exception:
        raise _HttpError(401, "Phiên đăng nhập không hợp lệ")


def _start(client, user_id, topic):
    if not isinstance(topic, str) or topic not in TOPICS:
        raise _HttpError(400, "Chủ đề không hợp lệ")
    conversation = (
        client.table("conversations").insert({"user_id": user_id, "topic": topic}).execute().data[0]
    )
    bot = _insert_message(client, conversation["id"], "BOT", opening_message(topic))
    return {"conversation": conversation, "messages": [bot]}


def _reply(client, user_id, conversation_id, content):
    try:
        conversation_id = str(uuid.UUID(str(conversation_id)))
    except ValueError:
        raise _HttpError(400, "conversation_id không hợp lệ")
    if not isinstance(content, str) or not content.strip():
        raise _HttpError(400, "Tin nhắn trống")
    if len(content) > MAX_CONTENT_CHARS:
        raise _HttpError(400, f"Tin nhắn tối đa {MAX_CONTENT_CHARS} ký tự")

    owned = (
        client.table("conversations").select("id, topic")
        .eq("id", conversation_id).eq("user_id", user_id).limit(1).execute().data
    )
    if not owned:
        raise _HttpError(404, "Không tìm thấy cuộc trò chuyện")

    content = content.strip()
    text, fallacy_code, meme_url = _compose_reply(client, conversation_id, owned[0].get("topic"), content)
    user_msg = _insert_message(client, conversation_id, "USER", content, fallacy_code=fallacy_code)
    bot_msg = _insert_message(client, conversation_id, "BOT", text, meme_url=meme_url)
    return {"messages": [user_msg, bot_msg]}


def _compose_reply(client, conversation_id, topic, content):
    """AI (1 lần gọi Gemini) -> (text, fallacy_code, meme_url). AI lỗi -> trả lời theo mẫu, không gọi AI nữa."""
    try:
        history = _recent_history(client, conversation_id)
        ai = companion.generate_reply(topic, history, content)
    except Exception:
        logger.warning("AI companion unavailable, using template reply", exc_info=True)
        reply = build_reply(content, turn=random.randrange(1_000), use_ai=False)
        meme_url = f"/memes/{reply.meme_key}.svg" if reply.meme_key else None
        return reply.text, reply.fallacy_code, meme_url

    want_meme = ai.fallacy_code is not None or random.random() < MEME_CHANCE
    meme_url = memes.find_meme(ai.meme_query) if want_meme and ai.meme_query else None
    if meme_url is None and ai.fallacy_code:
        meme_url = f"/memes/{LOCAL_MEMES[ai.fallacy_code]}.svg"
    return ai.text, ai.fallacy_code, meme_url


def _recent_history(client, conversation_id):
    rows = (
        client.table("messages").select("sender_type, content")
        .eq("conversation_id", conversation_id)
        .order("id", desc=True).limit(companion.HISTORY_LIMIT).execute().data
    )
    return list(reversed(rows))


def _insert_message(client, conversation_id, sender_type, content, fallacy_code=None, meme_url=None):
    row = {
        "conversation_id": conversation_id,
        "sender_type": sender_type,
        "content": content,
        "fallacy_code": fallacy_code,
        "meme_url": meme_url,
    }
    saved = client.table("messages").insert(row).execute().data[0]
    return {k: saved.get(k) for k in MESSAGE_FIELDS}


_client = None


def _get_client():
    global _client
    if _client is None:
        from supabase import create_client  # import trễ: test không cần thư viện này

        _client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    return _client


class handler(BaseHTTPRequestHandler):  # tên `handler` là quy ước của Vercel
    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY_BYTES:
            return self._send(413, {"error": "Body quá lớn"})
        try:
            payload = json.loads(self.rfile.read(length) or b"null")
        except (ValueError, UnicodeDecodeError):
            return self._send(400, {"error": "JSON không hợp lệ"})
        status, body = handle(payload, self.headers.get("Authorization"), _get_client())
        self._send(status, body)

    def _send(self, status, body):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)


def _load_env_file(path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    _load_env_file(ROOT / ".env.local")
    print("ThinkingLab API dev server: http://127.0.0.1:8787/api/chat")
    ThreadingHTTPServer(("127.0.0.1", 8787), handler).serve_forever()
