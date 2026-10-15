"""TDD Test Suite: Khả năng phản hồi các yêu cầu thông thường, tin nhắn bình thường
và cơ chế nhắc lại chủ đề mềm mại (Gentle Nudge, Never Force).

1. Xử lý yêu cầu kiểm chứng / review bài tập (Speech Act: INQUIRY):
   - Người dùng nhờ kiểm chứng bộ câu hỏi Socrates / 5 Whys.
   - AI thực sự kiểm chứng, đánh giá, phản hồi có chuyên môn; tuyệt đối không gán nhãn ngụy biện.
2. Xử lý tin nhắn thông thường / chào hỏi / tâm sự (Speech Act: CASUAL_CHAT):
   - Phản hồi đồng cảm, thân thiện, như bạn bè Gen Z; không gán nhãn ngụy biện.
3. Cơ chế chuyển hướng mềm mại (Gentle Nudge):
   - Đếm chuỗi ngoài chủ đề (off_topic_streak).
   - Dưới 3 lượt: Tự do trò chuyện / giải đáp, không ép quay lại chủ đề.
   - Từ 3 lượt trở lên: Trả lời xong mới khéo léo buông 1 cầu nối nhẹ nhàng, không cưỡng ép.
4. Nâng cấp Fallback trong chatbot.py:
   - Khi không có AI, câu hỏi kiểm chứng / chào hỏi không bị nhại lại template Socrates ngớ ngẩn.
"""

import json
import pytest
import requests

import chatbot
import companion


class _MockResp:
    def __init__(self, payload, status=200):
        self.status_code = status
        self._gemini = {
            "candidates": [{"content": {"parts": [{"text": json.dumps(payload)}]}}],
            "usageMetadata": {"totalTokenCount": 280},
        }

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"HTTP {self.status_code}")

    def json(self):
        return self._gemini


def test_inquiry_review_request_generates_constructive_feedback(monkeypatch):
    """Khi người dùng nhờ kiểm chứng bộ câu hỏi Socrates (mẫu trong ảnh),
    AI phải chọn speech_act=INQUIRY, move=ANSWER_QUESTION và fallacy_code=None."""
    monkeypatch.setenv("GEMINI_API_KEY", "mock-key")

    user_text = (
        "Dưới đây là bộ mô hình Socrates, hãy kiểm chứng giúp tôi:\n"
        "1. Khi em nói mình bị điểm thấp, cụ thể điểm số đó phản ánh kiến thức nào chưa nắm vững?\n"
        "2. Những số liệu hay hành động cụ thể nào chứng minh cho sự cố gắng đó?"
    )

    mock_payload = {
        "speech_act": "INQUIRY",
        "topic_relation": "OFF_TOPIC",
        "target_scope": "CONCEPT_QUERY",
        "cognitive_root": "NONE",
        "move": "ANSWER_QUESTION",
        "fallacy": "NONE",
        "reply": "Bộ câu hỏi Socrates này của bạn rất sắc bén! Bạn đã bóc tách được từ kết quả bề mặt đến hành vi và số liệu thực tế.",
        "meme": "thumbs up",
    }

    def fake_post(*args, **kwargs):
        return _MockResp(mock_payload)

    monkeypatch.setattr(requests, "post", fake_post)

    reply = companion.generate_reply("giang-vien-a", [], user_text)
    assert reply.fallacy_code is None
    assert "sắc bén" in reply.text
    assert reply.meme_query == "thumbs up"


def test_casual_chat_greeting_and_empathy(monkeypatch):
    """Tin nhắn chào hỏi hoặc tâm sự mệt mỏi -> speech_act=CASUAL_CHAT, move=CASUAL_CHAT, fallacy=None."""
    monkeypatch.setenv("GEMINI_API_KEY", "mock-key")

    mock_payload = {
        "speech_act": "CASUAL_CHAT",
        "topic_relation": "OFF_TOPIC",
        "target_scope": "NONE",
        "cognitive_root": "NONE",
        "move": "CASUAL_CHAT",
        "fallacy": "NONE",
        "reply": "Chào bạn nha! Học hành căng thẳng quá hả, nghỉ tay uống ngụm nước rồi cùng Lab đàm đạo tiếp nè 😄",
        "meme": "relax",
    }

    def fake_post(*args, **kwargs):
        return _MockResp(mock_payload)

    monkeypatch.setattr(requests, "post", fake_post)

    reply = companion.generate_reply("giang-vien-a", [], "Chào bạn nhé, hôm nay học mệt quá")
    assert reply.fallacy_code is None
    assert "Chào bạn" in reply.text


def test_off_topic_streak_counter():
    """Hàm _detect_off_topic_streak đếm chính xác số lượt ngoài chủ đề gần nhất."""
    # Lịch sử gồm 3 câu hỏi liên tiếp
    history_off = [
        {"sender_type": "USER", "content": "Socrates là ai vậy bạn?"},
        {"sender_type": "BOT", "content": "Socrates là triết gia Hy Lạp cổ đại..."},
        {"sender_type": "USER", "content": "Thế còn mô hình 5 Whys hoạt động ra sao?"},
        {"sender_type": "BOT", "content": "5 Whys là kỹ thuật đào sâu nguyên nhân..."},
        {"sender_type": "USER", "content": "Kiểm chứng giúp tôi câu hỏi này với"},
    ]
    streak = companion._detect_off_topic_streak(history_off)
    assert streak >= 3

    # Lịch sử có câu lập luận trực tiếp về chủ đề
    history_on = [
        {"sender_type": "USER", "content": "Theo mình giảng viên A chấm gắt là có lý do."},
    ]
    assert companion._detect_off_topic_streak(history_on) == 0


def test_chatbot_fallback_handles_review_request():
    """Fallback của chatbot.py: Khi người dùng nhờ kiểm chứng (như trong ảnh),
    KHÔNG ĐƯỢC nhại lại câu hỏi Socrates đối kháng 'Có lý lẽ đấy! Nếu làm theo phương án của bạn...'.
    Mà phải trả về lời nhận xét có tính xây dựng."""
    user_text = (
        "Dưới đây là bộ mô hình Socrates, hãy kiểm chứng giúp tôi:\n"
        "Khi em nói mình bị điểm thấp và thất bại ở môn này..."
    )
    reply = chatbot.build_reply(user_text, turn=0, use_ai=False)
    assert reply.fallacy_code is None
    # Không được chứa template Socrates đối kháng cũ
    assert "Nếu làm theo phương án của bạn thì điều tồi tệ nhất" not in reply.text
    assert "từ khóa quan trọng nhất trong câu của bạn có nghĩa là gì" not in reply.text
    # Phải chứa nội dung đánh giá / kiểm chứng
    assert any(kw in reply.text for kw in ("Bộ câu hỏi", "đặt câu hỏi", "nguyên nhân", "Socrates", "đào sâu"))


def test_chatbot_fallback_handles_casual_greeting():
    """Fallback của chatbot.py: Chào hỏi bình thường -> Trả lời chào hỏi thân thiện, không bắt lỗi."""
    reply = chatbot.build_reply("Chào bạn nhé", turn=0, use_ai=False)
    assert reply.fallacy_code is None
    assert "Chào bạn" in reply.text or "Hé lô" in reply.text
