"""POST /api/chat - Vercel Python serverless function cho chatbot ThinkingLab.

Body JSON:
  {"action": "start", "topic": "<topic_id>"}                     -> tạo phiên + câu mở đầu của bot
  {"action": "start", "topic": "custom", "custom_topic": "<text>"} -> chủ đề tự đặt (được AI duyệt trước)
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
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import companion  # noqa: E402
import memes  # noqa: E402
from chatbot import TOPICS, build_reply, opening_message  # noqa: E402

logger = logging.getLogger(__name__)

MAX_CONTENT_CHARS = 2000  # đủ cho một lập luận ARE/PREP có dẫn chứng
# Hạn mức token Gemini thực tế (input + output). Đo thực tế: duyệt chủ đề ~350, mỗi lượt ~600-800
# (prompt hệ thống + 2 lượt gần nhất) -> ~40 lượt/cuộc, ~200 lượt (~5 cuộc dài)/ngày mỗi người.
TOKEN_BUDGET = 30_000
DAILY_TOKEN_BUDGET = 150_000  # chặn việc mở cuộc mới liên tục để lách hạn mức cuộc trò chuyện
VN_TZ = timezone(timedelta(hours=7))  # hạn mức ngày reset lúc 0h giờ Việt Nam
# Còn chưa đủ 1 lượt lớn nhất (tin 2.000 ký tự ~ 1.900 token) -> lượt chốt: AI tóm tắt, chào và kết thúc.
WRAP_UP_RESERVE = 2_000
INJECTION_REPLY = (
    "Hehe, mấy câu lệnh kiểu đó không có tác dụng với mình đâu 😎 "
    "Mình chỉ là bạn luyện phản biện thôi. Quay lại chủ đề nha: bạn đang nghĩ sao, và vì sao?"
)
DAILY_EXHAUSTED = "Hôm nay bạn đã luyện hết lượt rồi 💪 Nghỉ ngơi chút, 0h mai quay lại luyện tiếp nhé!"
MAX_BODY_BYTES = 16_384
MEME_CHANCE = 0.3  # lượt không có ngụy biện: chỉ ~30% kèm meme (AI hay đề xuất quá nhiều)
MEME_LOOKBACK = 12  # không dùng lại GIF đã gửi trong 12 tin gần nhất
LOCAL_MEMES = {
    "HASTY_GENERALIZATION": "hasty",
    "AD_HOMINEM": "ad-hominem",
    "STRAW_MAN": "straw-man",
}
MESSAGE_FIELDS = ("id", "conversation_id", "sender_type", "content", "fallacy_code", "meme_url", "created_at")


class _HttpError(Exception):
    def __init__(self, status, message, code=None):
        super().__init__(message)
        self.status, self.message, self.code = status, message, code


def handle(payload, auth_header, client):
    """Logic thuần (không phụ thuộc HTTP) -> (status, body). Dễ test với client giả."""
    try:
        user_id = _authenticate(auth_header, client)
        if not isinstance(payload, dict):
            raise _HttpError(400, "Body phải là JSON object")
        action = payload.get("action")
        if action == "start":
            return 200, _start(client, user_id, payload.get("topic"), payload.get("custom_topic"))
        if action == "reply":
            return 200, _reply(client, user_id, payload.get("conversation_id"), payload.get("content"))
        raise _HttpError(400, "action không hợp lệ")
    except _HttpError as e:
        body = {"error": e.message}
        if e.code:
            body["code"] = e.code
        return e.status, body
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


def _start(client, user_id, topic, custom_topic=None):
    day = _today()
    daily = _daily_used(client, user_id, day)
    if daily >= DAILY_TOKEN_BUDGET:
        raise _HttpError(429, DAILY_EXHAUSTED, code="daily_exhausted")
    if topic == companion.CUSTOM_TOPIC_ID:
        row, opening, daily = _review_custom(client, user_id, day, custom_topic, daily)
    elif isinstance(topic, str) and topic in TOPICS:
        row, opening = {"user_id": user_id, "topic": topic}, opening_message(topic)
    else:
        raise _HttpError(400, "Chủ đề không hợp lệ")
    conversation = client.table("conversations").insert(row).execute().data[0]
    bot = _insert_message(client, conversation["id"], "BOT", opening)
    return {"conversation": conversation, "messages": [bot], "usage": _usage(row.get("token_count", 0), daily)}


def _review_custom(client, user_id, day, custom_topic, daily):
    """Làm sạch + AI duyệt chủ đề tự đặt -> (row conversations, câu mở đầu, token ngày đã dùng)."""
    try:
        text = companion.clean_custom_topic(custom_topic)
    except ValueError as e:
        raise _HttpError(400, str(e))
    usage = {}
    try:
        review = companion.review_custom_topic(text, usage=usage)
    except Exception:
        # Không duyệt được thì không cho tạo: chủ đề chưa duyệt không bao giờ vào prompt
        logger.warning("custom topic review unavailable", exc_info=True)
        raise _HttpError(503, "Hiện chưa duyệt được chủ đề tự chọn. Bạn thử lại sau hoặc chọn chủ đề có sẵn nhé")
    tokens = usage.get("total", 0)
    if tokens:  # lượt duyệt tính vào hạn mức ngày kể cả khi bị từ chối (chống spam thử chủ đề)
        daily = _record_usage(client, user_id, day, tokens).get("daily") or daily + tokens
    if not review.allowed:
        raise _HttpError(
            400,
            "Chủ đề này nằm ngoài phạm vi luyện phản biện của Lab. Hãy chọn một vấn đề có thể "
            "tranh luận, ví dụ: “Có nên cấm điện thoại trong lớp học?”",
            code="topic_rejected",
        )
    row = {"user_id": user_id, "topic": companion.CUSTOM_TOPIC_ID, "custom_topic": review.title, "token_count": tokens}
    return row, review.opening, daily


def _today():
    return datetime.now(VN_TZ).date().isoformat()


def _daily_used(client, user_id, day):
    rows = (
        client.table("token_usage_daily").select("tokens")
        .eq("user_id", user_id).eq("day", day).limit(1).execute().data
    )
    return rows[0]["tokens"] if rows else 0


def _record_usage(client, user_id, day, tokens, conversation_id=None, conversation_tokens=None):
    """Ghi nguyên tử token vào hạn mức ngày (+ cuộc trò chuyện) -> {"daily": int, "conversation": int|None}."""
    params = {"p_user_id": user_id, "p_day": day, "p_tokens": tokens}
    if conversation_id:
        params |= {"p_conversation_id": conversation_id, "p_conversation_tokens": conversation_tokens}
    data = client.rpc("record_token_usage", params).execute().data
    return data if isinstance(data, dict) else {}


def _usage(used, daily):
    return {
        "used": min(used, TOKEN_BUDGET), "limit": TOKEN_BUDGET,
        "daily_used": min(daily, DAILY_TOKEN_BUDGET), "daily_limit": DAILY_TOKEN_BUDGET,
    }


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
        client.table("conversations").select("id, topic, custom_topic, token_count")
        .eq("id", conversation_id).eq("user_id", user_id).limit(1).execute().data
    )
    if not owned:
        raise _HttpError(404, "Không tìm thấy cuộc trò chuyện")
    conversation = owned[0]
    used = conversation.get("token_count") or 0
    if used >= TOKEN_BUDGET:
        raise _HttpError(
            429, "Cuộc trò chuyện này đã dùng hết lượt. Mở cuộc trò chuyện mới để tiếp tục nhé!",
            code="budget_exhausted",
        )
    day = _today()
    daily = _daily_used(client, user_id, day)
    if daily >= DAILY_TOKEN_BUDGET:
        raise _HttpError(429, DAILY_EXHAUSTED, code="daily_exhausted")

    content = content.strip()
    if companion.looks_like_injection(content):
        # Câu lệnh tấn công rõ ràng: trả lời sẵn, không gửi cho AI, không tốn token
        text, fallacy_code, meme_url, tokens = INJECTION_REPLY, None, None, 0
        conversation_tokens = 0
    else:
        closing = used + WRAP_UP_RESERVE >= TOKEN_BUDGET
        wrap_up = closing or daily + WRAP_UP_RESERVE >= DAILY_TOKEN_BUDGET
        text, fallacy_code, meme_url, tokens = _compose_reply(client, conversation, content, wrap_up)
        # AI đã chào kết thúc -> đóng cuộc trò chuyện; hạn mức ngày vẫn chỉ tính token thật
        conversation_tokens = max(tokens, TOKEN_BUDGET - used) if closing and tokens else tokens
    user_msg = _insert_message(client, conversation_id, "USER", content, fallacy_code=fallacy_code)
    bot_msg = _insert_message(client, conversation_id, "BOT", text, meme_url=meme_url)
    if tokens:
        totals = _record_usage(client, user_id, day, tokens, conversation_id, conversation_tokens)
        used = totals.get("conversation") or used + conversation_tokens
        daily = totals.get("daily") or daily + tokens
    return {"messages": [user_msg, bot_msg], "usage": _usage(used, daily)}


def _compose_reply(client, conversation, content, wrap_up):
    """AI (1 lần gọi Gemini) -> (text, fallacy_code, meme_url, token đã dùng).
    AI lỗi -> trả lời theo mẫu, không gọi AI nữa (0 token)."""
    usage = {}
    try:
        recent = _recent_messages(client, conversation["id"])
        ai = companion.generate_reply(
            conversation.get("topic"), recent[-companion.HISTORY_LIMIT:], content,
            custom_topic=conversation.get("custom_topic"), wrap_up=wrap_up, usage=usage,
        )
    except Exception:
        logger.warning("AI companion unavailable, using template reply", exc_info=True)
        reply = build_reply(content, turn=random.randrange(1_000), use_ai=False)
        meme_url = f"/memes/{reply.meme_key}.svg" if reply.meme_key else None
        return reply.text, reply.fallacy_code, meme_url, usage.get("total", 0)
    return ai.text, ai.fallacy_code, _pick_meme(ai, recent), usage.get("total", 0)


def _pick_meme(ai, recent):
    """Meme hiếm và không lặp: không gửi 2 lượt liền, không dùng lại GIF đã gửi gần đây."""
    bot_memes = [m.get("meme_url") for m in recent if m.get("sender_type") == "BOT"]
    if bot_memes and bot_memes[-1]:
        return None
    if ai.fallacy_code is None and random.random() >= MEME_CHANCE:
        return None
    used = {u for u in bot_memes if u}
    url = memes.find_meme(ai.meme_query, exclude=used) if ai.meme_query else None
    local = LOCAL_MEMES.get(ai.fallacy_code)
    if url is None and local and f"/memes/{local}.svg" not in used:
        url = f"/memes/{local}.svg"
    return url


def _recent_messages(client, conversation_id):
    """MEME_LOOKBACK tin gần nhất (cũ -> mới): đủ để tránh lặp meme; AI chỉ nhận HISTORY_LIMIT tin cuối."""
    rows = (
        client.table("messages").select("sender_type, content, meme_url")
        .eq("conversation_id", conversation_id)
        .order("id", desc=True).limit(MEME_LOOKBACK).execute().data
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
