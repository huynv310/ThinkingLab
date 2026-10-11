"""Dọn rác hội thoại cũ: tóm tắt -> lưu context_summary + ARCHIVED -> xóa messages.

Chạy server-side (vd. Vercel Cron) với service_role key. Không bao giờ dùng key này ở client.
"""

import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

INACTIVE_DAYS = 7
PAGE_SIZE = 1000  # phải <= max-rows của PostgREST (Supabase mặc định 1000)
MAX_SUMMARY_CHARS = 500


def archive_old_conversations(supabase_client, batch_size=50):
    """Archive tối đa `batch_size` phiên ACTIVE không hoạt động quá INACTIVE_DAYS ngày.

    Giới hạn batch để mỗi lần chạy nằm gọn trong timeout của serverless function;
    phần còn lại sẽ được xử lý ở lần cron kế tiếp.
    Trả về thống kê {"archived", "skipped", "failed"}.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=INACTIVE_DAYS)).isoformat()
    conversations = (
        supabase_client.table("conversations")
        .select("id, last_interacted_at")
        .eq("status", "ACTIVE")
        .lt("last_interacted_at", cutoff)
        .order("last_interacted_at")
        .limit(batch_size)
        .execute()
        .data
    )

    stats = {"archived": 0, "skipped": 0, "failed": 0}
    for conversation in conversations:
        try:
            if _archive_conversation(supabase_client, conversation):
                stats["archived"] += 1
            else:
                stats["skipped"] += 1
        except Exception:  # 1 phiên lỗi không được làm dừng cả job
            stats["failed"] += 1
            # Chỉ log id, không log nội dung chat (dữ liệu cá nhân).
            logger.exception("Failed to archive conversation %s", conversation["id"])
    return stats


def _archive_conversation(client, conversation):
    conversation_id = conversation["id"]
    messages = _fetch_all_messages(client, conversation_id)
    chat_history = "\n".join(f"{m['sender_type']}: {m['content']}" for m in messages)
    summary = _mock_summarize_llm(chat_history)

    # RPC chạy UPDATE + DELETE trong 1 transaction, có khóa lạc quan theo
    # last_interacted_at: user vừa chat lại (trigger đã chạm last_interacted_at)
    # -> trả False, không đổi gì.
    archived = (
        client.rpc(
            "archive_conversation",
            {
                "p_conversation_id": conversation_id,
                "p_summary": summary,
                "p_cutoff": conversation["last_interacted_at"],
            },
        )
        .execute()
        .data
    )
    return archived is True


def _fetch_all_messages(client, conversation_id):
    """Lấy toàn bộ tin nhắn theo trang, vì PostgREST cắt kết quả ở max-rows."""
    messages = []
    start = 0
    while True:
        page = (
            client.table("messages")
            .select("sender_type, content")
            .eq("conversation_id", conversation_id)
            .order("created_at")
            .order("id")
            .range(start, start + PAGE_SIZE - 1)
            .execute()
            .data
        )
        messages.extend(page)
        if len(page) < PAGE_SIZE:
            return messages
        start += PAGE_SIZE


def _mock_summarize_llm(chat_history):
    """Giả lập LLM: trả về 1 câu tóm tắt ngắn cho đoạn chat."""
    lines = [line for line in chat_history.splitlines() if line.strip()]
    if not lines:
        return "Phiên hội thoại trống."
    user_turns = sum(1 for line in lines if line.startswith("USER:"))
    summary = (
        f"Phiên gồm {len(lines)} tin nhắn ({user_turns} từ người dùng). "
        f"Mở đầu: {lines[0][:100]}"
    )
    return summary[:MAX_SUMMARY_CHARS]
