"""Tầng điều phối phân tích lập luận độc lập (Decoupled Argument Analyzer).

Nhiệm vụ:
  1. Phân tích độc lập hai chiều: Ngụy biện logic (Fallacy) và Thiên kiến nhận thức (Cognitive Bias).
  2. Áp dụng Ma trận giải trừ nhập nhằng (Disambiguation Matrix) khi có xung đột từ khóa (ví dụ "ai cũng" giữa Hasty Generalization và Herd Mentality).
  3. Cung cấp phản hồi sư phạm tổng hợp, giàu tính xây dựng cho sinh viên.
"""

from typing import NamedTuple, Optional

import cognitive_bias_detector as cbd
from cognitive_bias_detector import CognitiveBiasResult, detect_cognitive_bias
import fallacy_detector as fd
from fallacy_detector import detect_fallcacy


class ArgumentAssessment(NamedTuple):
    """Kết quả đánh giá lập luận toàn diện và độc lập."""
    fallacy: Optional[str]
    bias: Optional[CognitiveBiasResult]
    is_clean: bool
    feedback: str


def is_question(text: str) -> bool:
    """Kiểm tra xem phát biểu là câu hỏi tìm hiểu kiến thức thuần túy hay câu hỏi tu từ / lập luận bóp méo."""
    normalized = cbd._normalize_text(text)
    # Nếu câu mang cấu trúc câu hỏi tu từ bóp méo (Straw man / Loaded question) -> Không coi là câu hỏi kiến thức
    rhetorical_straw_man_cues = (
        "bảo vệ à", "suốt đời sao", "vậy là bạn muốn", "tức là bạn muốn",
        "nói thế khác nào", "hóa ra bạn muốn"
    )
    if any(kw in normalized for kw in rhetorical_straw_man_cues):
        return False

    # Các tín hiệu câu hỏi tìm hiểu kiến thức / thắc mắc
    inquiry_cues = (
        "là gì", "tại sao", "vì sao", "thế nào", "như thế nào",
        "sao lại", "có phải không", "làm sao để", "làm thế nào",
        "cho mình hỏi", "giải thích giúp", "khác gì", "ủa sao"
    )
    if any(q in normalized for q in inquiry_cues):
        return True

    s = text.strip()
    return s.endswith("?") and not any(kw in normalized for kw in ("vậy là", "tức là", "nói vậy"))


def analyze_argument(text: str, use_ai: bool = True) -> ArgumentAssessment:
    """Phân tích lập luận của người dùng trên cả 2 trục độc lập: Ngụy biện & Thiên kiến.

    Args:
        text: Nội dung lập luận của người dùng.
        use_ai: Có gọi mô hình LLM hay chạy hoàn toàn trên Heuristic Engine.

    Returns:
        ArgumentAssessment chứa kết quả độc lập cho cả Ngụy biện và Thiên kiến,
        kèm cờ is_clean và phản hồi sư phạm thích hợp.
    """
    if not isinstance(text, str):
        raise TypeError(f"text must be str, got {type(text).__name__}")

    clean_text = text.strip()
    if not clean_text:
        return ArgumentAssessment(
            fallacy=None,
            bias=None,
            is_clean=True,
            feedback="Văn bản trống.",
        )

    # Nếu người dùng đang HỎI hoặc thắc mắc kiến thức: Tuyệt đối không dán nhãn lỗi
    if is_question(text):
        return ArgumentAssessment(
            fallacy=None,
            bias=None,
            is_clean=True,
            feedback="Câu hỏi thắc mắc / tìm hiểu kiến thức, không chứa ngụy biện hay thiên kiến.",
        )

    # 1. Chạy độc lập 2 bộ phân loại
    raw_fallacy = detect_fallcacy(text, use_ai=use_ai)
    raw_bias = detect_cognitive_bias(text, use_ai=use_ai)

    # 2. Ma trận giải trừ nhập nhằng (Disambiguation Matrix)
    fallacy = raw_fallacy
    bias = raw_bias
    normalized = cbd._normalize_text(text)

    # Tình huống A: "ai cũng" bị fallacy_detector bắt nhầm thành HASTY_GENERALIZATION
    # trong khi ngữ cảnh thực sự là hành vi bầy đàn (HERD_MENTALITY)
    if raw_bias and raw_bias.bias_code == cbd.HERD_MENTALITY and raw_fallacy == fd.HASTY_GENERALIZATION:
        # Nếu câu thể hiện rõ động cơ hành vi "cứ theo", "làm theo", "mọi người làm nấy", "tẩy chay theo"
        # chứ không phải quy nạp toán học/khoa học vội vã -> Khử cờ giả HASTY_GENERALIZATION
        herd_action_signals = ("mình cứ", "cứ theo", "làm theo", "tẩy chay theo", "mọi người làm nấy", "sợ lạc loài", "đổ xô")
        if any(sig in normalized for sig in herd_action_signals):
            fallacy = None

    # Tình huống B: Mệnh đề nhượng bộ / Tư duy phản biện đúng đắn (Rational Skepticism)
    if fallacy == fd.HASTY_GENERALIZATION and cbd._is_rational(normalized):
        fallacy = None

    # Tình huống C: Giải trừ xung đột giữa Hasty Generalization với Ảo tưởng sức mạnh hoặc Thiên kiến nội nhóm
    if raw_bias and raw_bias.bias_code in (cbd.OVERCONFIDENCE_BIAS, cbd.INGROUP_BIAS):
        if fallacy == fd.HASTY_GENERALIZATION:
            fallacy = None

    is_clean = (fallacy is None) and (bias is None)

    # 3. Tổng hợp phản hồi sư phạm Socratic
    feedback = _synthesize_feedback(fallacy, bias)

    return ArgumentAssessment(
        fallacy=fallacy,
        bias=bias,
        is_clean=is_clean,
        feedback=feedback,
    )


def _synthesize_feedback(fallacy: Optional[str], bias: Optional[CognitiveBiasResult]) -> str:
    """Tổng hợp lời phản hồi sư phạm tùy theo lỗi lập luận và thiên kiến mắc phải."""
    if fallacy is None and bias is None:
        return "Lập luận khách quan, không phát hiện ngụy biện hay thiên kiến nhận thức rõ rệt."

    parts = []
    if fallacy:
        fallacy_labels = {
            fd.HASTY_GENERALIZATION: "Khái quát hóa vội vã (Hasty Generalization)",
            fd.AD_HOMINEM: "Công kích cá nhân (Ad Hominem)",
            fd.STRAW_MAN: "Ngụy biện bù nhìn (Straw Man)",
        }
        parts.append(f"⚠️ Phát hiện ngụy biện: {fallacy_labels.get(fallacy, fallacy)}")

    if bias:
        parts.append(f"🧠 {bias.warning}")

    return "\n".join(parts)
