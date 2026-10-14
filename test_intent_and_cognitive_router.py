"""TDD Test Suite: Bộ điều phối Ý định Nhận thức & Điều phối Lưu lượng 8 Keys (50-100 CCU).

Các nhóm kiểm thử:
  1. Phân biệt Ý định Phát ngôn (Speech Act: INQUIRY vs ARGUMENT):
     - Câu hỏi định nghĩa khái niệm (Concept Query) -> fallacy_code BẮT BUỘC là None.
     - Câu hỏi thắc mắc phán quyết của bot (Meta-debate / Justification) -> fallacy_code là None.
     - Câu hỏi xin lời khuyên / hướng giải quyết (Guidance / Coaching) -> fallacy_code là None.
     - Nguyên tắc vàng: Tuyệt đối KHÔNG gán nhãn ngụy biện cho câu hỏi của người học.
  2. Bóc trần Điểm mù Tâm lý tầng sâu (Deep Cognitive Roots):
     - Mẫu 2 trong ảnh: Ảo tưởng sức mạnh (Overconfidence Bias) -> Phải bắt OVERCONFIDENCE_BIAS, CẤM gán HASTY_GENERALIZATION.
     - Mẫu 3 trong ảnh: Thiên kiến nội nhóm (In-group Bias) -> Phải bắt INGROUP_BIAS, CẤM gán HASTY_GENERALIZATION.
     - Quy nạp vội vã chân chính (Real Hasty Generalization) -> Bắt HASTY_GENERALIZATION.
  3. Điều phối Lưu lượng 8 Keys & Rate Limiting cho 50-100 CCU:
     - Cân bằng tải Least-Loaded Round-Robin trên danh sách 8 API Keys.
     - Giới hạn tốc độ sư phạm: Ngưỡng 8 req/phút và Cooldown 3.5 giây.
"""

import json
import time
import pytest
import requests

import companion
import gemini_client
from api import chat


class _MockGeminiResp:
    def __init__(self, payload, status=200):
        self.status_code = status
        self._gemini = {
            "candidates": [{"content": {"parts": [{"text": json.dumps(payload)}]}}],
            "usageMetadata": {"totalTokenCount": 320},
        }

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"HTTP {self.status_code}")

    def json(self):
        return self._gemini


# ==============================================================================
# NHÓM 1: PHÂN BIỆT Ý ĐỊNH (INQUIRY VS ARGUMENT) & TRIỆT TIÊU GÁN NHÃN OAN
# ==============================================================================

@pytest.mark.parametrize(
    "question_text,inquiry_type",
    [
        ("Chi phí chìm là gì vậy bạn?", "CONCEPT_QUERY"),
        ("Ủa sao bạn lại bảo câu vừa nãy của mình là ngụy biện?", "JUSTIFICATION"),
        ("Thế trong tình huống này mình nên lập luận như thế nào mới đúng?", "GUIDANCE"),
        ("Nếu như ai cũng làm như vậy thì theo bạn có hậu quả gì?", "HYPOTHETICAL"),
        ("Bạn giải thích giúp mình Ad Hominem khác gì với phê bình thông thường không?", "CONCEPT_QUERY"),
    ],
)
def test_inquiry_never_receives_fallacy_code(monkeypatch, question_text, inquiry_type):
    """Khi người dùng HỎI hoặc thắc mắc, hệ thống BẮT BUỘC chọn move ANSWER_QUESTION và fallacy_code = None."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-1")

    # Giả lập phản hồi từ Gemini có chứa phân tích speech_act = INQUIRY
    mock_payload = {
        "speech_act": "INQUIRY",
        "target_scope": "CONCEPT_QUERY",
        "cognitive_root": "NONE",
        "move": "ANSWER_QUESTION",
        "fallacy": "NONE",
        "reply": f"Giải đáp cho câu hỏi '{question_text}': Đây là câu trả lời chuẩn xác sư phạm.",
        "meme": "thinking",
    }

    def fake_post(*args, **kwargs):
        return _MockGeminiResp(mock_payload)

    monkeypatch.setattr(requests, "post", fake_post)

    reply = companion.generate_reply("chi-phi-chim", [], question_text)
    assert reply.fallacy_code is None, f"Câu hỏi không được mang mã ngụy biện, nhận được: {reply.fallacy_code}"
    assert "Giải đáp" in reply.text


def test_inquiry_overrides_accidental_llm_fallacy_flag(monkeypatch):
    """Phòng vệ: Nếu LLM bị ngộ nhận gán nhãn ngụy biện cho câu hỏi, Backend phải chủ động triệt tiêu cờ đó."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-1")

    # Tình huống LLM bị ảo giác gán HASTY_GENERALIZATION cho câu hỏi "ai cũng"
    mock_payload = {
        "speech_act": "INQUIRY",
        "target_scope": "CONCEPT_QUERY",
        "cognitive_root": "NONE",
        "move": "ANSWER_QUESTION",
        "fallacy": "HASTY_GENERALIZATION",  # Lỗi ảo giác từ LLM
        "reply": "Nếu ai cũng làm vậy thì xã hội sẽ có hiệu ứng đám đông.",
        "meme": "curious",
    }

    def fake_post(*args, **kwargs):
        return _MockGeminiResp(mock_payload)

    monkeypatch.setattr(requests, "post", fake_post)

    reply = companion.generate_reply("dam-dong", [], "Ủa nếu ai cũng đăng ký thì sao bạn?")
    # Cơ chế hậu xử lý của companion.py PHẢI ép fallacy_code về None vì speech_act là INQUIRY
    assert reply.fallacy_code is None, "Phải xóa bỏ cờ lỗi khi speech_act là INQUIRY"


# ==============================================================================
# NHÓM 2: BÓC TRẦN ĐIỂM MÙ TÂM LÝ (ẢO TƯỞNG SỨC MẠNH & THIÊN KIẾN NỘI NHÓM)
# ==============================================================================

def test_detects_overconfidence_bias_for_sample_2(monkeypatch):
    """Mẫu 2 trong ảnh: Tự nhận IQ vượt trội 90%, tố chất thiên tài, mặc định không rớt môn.
    Bản chất là ẢO TƯỞNG SỨC MẠNH (OVERCONFIDENCE_BIAS), KHÔNG PHẢI HASTY_GENERALIZATION."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-1")

    user_text = (
        "Mình không cần tìm hiểu nguyên nhân trượt môn của người khác làm gì. "
        "Đơn giản là mình tự nhận thấy chỉ số IQ và khả năng tiếp thu của mình vượt trội hơn 90% sinh viên trong trường. "
        "Những nguyên nhân rớt môn thông thường chỉ áp dụng cho người bình thường, "
        "còn với một người có sẵn tố chất thiên tài như mình thì mình mặc định là không bao giờ thất bại."
    )

    mock_payload = {
        "speech_act": "ARGUMENT",
        "target_scope": "SELF",
        "cognitive_root": "OVERCONFIDENCE",
        "move": "FLAW",
        "fallacy": "OVERCONFIDENCE_BIAS",
        "reply": "Bạn tự tin là tốt, nhưng tố chất thiên tài có đảm bảo bạn miễn nhiễm rủi ro không học vẫn đỗ không?",
        "meme": "smug",
    }

    def fake_post(*args, **kwargs):
        return _MockGeminiResp(mock_payload)

    monkeypatch.setattr(requests, "post", fake_post)

    reply = companion.generate_reply("dam-dong", [], user_text)
    assert reply.fallacy_code == "OVERCONFIDENCE_BIAS"
    assert reply.fallacy_code != "HASTY_GENERALIZATION"


def test_detects_ingroup_bias_for_sample_3(monkeypatch):
    """Mẫu 3 trong ảnh: Nhóm mình chắc chắn đỗ điểm cao, người ngoài vòng tròn đương nhiên kém cỏi.
    Bản chất là THIÊN VỊ NỘI NHÓM (INGROUP_BIAS), KHÔNG PHẢI HASTY_GENERALIZATION."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-1")

    user_text = (
        "Theo mình, những người trượt môn toàn là sinh viên của các lớp khác hoặc khoa khác. "
        "Còn những bạn chơi chung trong nhóm của mình thì chắc chắn sẽ luôn qua môn điểm cao. "
        "Mình mặc định những ai không thuộc vòng tròn bạn bè của mình thì đương nhiên là kém cỏi và thiếu kỹ năng hơn, "
        "nên họ rớt là chuyện hiển nhiên, không cần phân tích thêm"
    )

    mock_payload = {
        "speech_act": "ARGUMENT",
        "target_scope": "IN_GROUP",
        "cognitive_root": "IN_GROUP_FAVORITISM",
        "move": "FLAW",
        "fallacy": "INGROUP_BIAS",
        "reply": "Bạn đang mắc Thiên kiến nội nhóm (In-group Bias) khi tự cho nhóm mình là chuẩn mực còn người ngoài kém cỏi.",
        "meme": "suspicious",
    }

    def fake_post(*args, **kwargs):
        return _MockGeminiResp(mock_payload)

    monkeypatch.setattr(requests, "post", fake_post)

    reply = companion.generate_reply("dam-dong", [], user_text)
    assert reply.fallacy_code == "INGROUP_BIAS"
    assert reply.fallacy_code != "HASTY_GENERALIZATION"


def test_detects_true_hasty_generalization_when_generalizing_population(monkeypatch):
    """Quy nạp vội vã chân chính: Từ 2 sinh viên cụ thể quy chụp cho toàn bộ sinh viên một trường."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-1")

    user_text = "Hôm qua mình gặp 2 bạn sinh viên trường X thấy lười học, chắc chắn 100% sinh viên trường X đều lười học."

    mock_payload = {
        "speech_act": "ARGUMENT",
        "target_scope": "POPULATION",
        "cognitive_root": "HASTY_GENERALIZATION",
        "move": "FLAW",
        "fallacy": "HASTY_GENERALIZATION",
        "reply": "Từ 2 bạn mà quy kết cho cả một ngôi trường là khái quát hóa vội vã rồi bạn ơi!",
        "meme": "facepalm",
    }

    def fake_post(*args, **kwargs):
        return _MockGeminiResp(mock_payload)

    monkeypatch.setattr(requests, "post", fake_post)

    reply = companion.generate_reply("dam-dong", [], user_text)
    assert reply.fallacy_code == "HASTY_GENERALIZATION"


# ==============================================================================
# NHÓM 3: ĐIỀU PHỐI LƯU LƯỢNG 8 KEYS & RATE LIMIT SƯ PHẠM (50-100 CCU)
# ==============================================================================

def test_load_balancer_rotates_smoothly_across_8_keys(monkeypatch):
    """Kiểm tra bộ cân bằng tải phân phối đồng đều các request trên cụm 8 API Keys."""
    test_keys = [f"gemini-key-{i}" for i in range(1, 9)]
    monkeypatch.setenv("GEMINI_API_KEYS", ",".join(test_keys))
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    gemini_client.reset_cooldowns()

    used_keys = []

    def mock_post(url, **kwargs):
        # Lấy key từ header x-goog-api-key
        headers = kwargs.get("headers", {})
        key = headers.get("x-goog-api-key", "")
        used_keys.append(key)
        return _MockGeminiResp({"reply": "ok", "move": "SOCRATES", "fallacy": "NONE", "meme": ""})

    monkeypatch.setattr(requests, "post", mock_post)

    # Gửi 16 requests
    for i in range(16):
        gemini_client.generate_json(
            "test-system",
            [{"role": "user", "parts": [{"text": "hi"}]}],
            {"type": "OBJECT", "properties": {"reply": {"type": "STRING"}}},
        )

    # Đảm bảo cả 8 keys đều được tận dụng cân bằng, không có key nào bị bỏ rơi
    unique_used = set(used_keys)
    assert len(unique_used) == 8, f"Cả 8 keys phải được sử dụng, thực tế: {len(unique_used)}"
    # Mỗi key phải nhận xấp xỉ 2 requests (±1)
    for k in test_keys:
        count = used_keys.count(k)
        assert 1 <= count <= 3, f"Key {k} nhận {count} requests (lệch phân bổ)"


def test_pedagogical_rate_limiter_enforces_cooldown(monkeypatch):
    """Kiểm tra giới hạn tốc độ sư phạm: chặn spam nhanh dưới 3.5 giây."""
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    chat.reset_rate_limits()
    user_id = "test-student-123"

    # Request 1: thành công
    chat._check_rate_limit(user_id)

    # Request 2 ngay tức thì (cách 0.1s) -> Phải bị chặn với mã rate_limited
    with pytest.raises(chat._HttpError) as exc_info:
        chat._check_rate_limit(user_id)
    assert exc_info.value.status == 429
    assert exc_info.value.code == "rate_limited"
    assert any(k in exc_info.value.message for k in ("chậm lại", "Chờ một chút", "dành vài giây", "Lab đang suy nghĩ"))


def test_pedagogical_rate_limiter_enforces_max_per_minute(monkeypatch):
    """Kiểm tra giới hạn tốc độ sư phạm: tối đa 8-10 requests trong 1 phút."""
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    chat.reset_rate_limits()
    user_id = "test-student-456"

    # Giả lập gửi 8 requests cách nhau 4 giây (hợp lệ về khoảng cách)
    now = time.monotonic()
    with chat._rate_lock:
        chat._user_timestamps[user_id] = [now - (8 - i) * 4 for i in range(8)]

    # Request thứ 9 trong cùng phút -> Phải bị chặn
    monkeypatch.setattr(time, "monotonic", lambda: now)
    with pytest.raises(chat._HttpError) as exc_info:
        chat._check_rate_limit(user_id)
    assert exc_info.value.status == 429
    assert exc_info.value.code == "rate_limited"
