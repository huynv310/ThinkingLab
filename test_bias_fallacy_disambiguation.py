"""Bộ kiểm thử cho Bộ phân tích lập luận độc lập và Ma trận giải trừ nhập nhằng (Disambiguation Matrix).

Các khía cạnh kiểm thử:
  1. Tính trực giao / độc lập tuyệt đối (Orthogonality):
     - Chỉ có ngụy biện logic (Pure Fallacy) -> Bias phải là None.
     - Chỉ có thiên kiến nhận thức (Pure Cognitive Bias) -> Fallacy phải là None.
  2. Ma trận giải trừ nhập nhằng từ vựng (Disambiguation Matrix):
     - Tình huống xung đột từ khóa "ai cũng": Phân biệt rạch ròi giữa Khái quát hóa vội vã
       (Hasty Generalization) và Tâm lý bầy đàn (Herd Mentality).
  3. Lập luận kép vi phạm đồng thời (Hybrid Flaws):
     - Câu chứa cả Ngụy biện (Ad Hominem, Straw Man) VÀ Thiên kiến (Confirmation Bias, Herd Mentality).
     - Hệ thống phải nhận diện được CẢ HAI độc lập, không che giấu lỗi nào (no masking).
  4. Miễn nhiễm cho tư duy phản biện khách quan (Rational Decision Immunity):
     - Người dùng cắt lỗ khoa học, phản biện đa chiều, dựa vào khảo sát/số liệu -> is_clean = True.
  5. Các trường hợp biên và kiểm soát kiểu dữ liệu (Edge Cases & Safety):
     - Non-string ném TypeError.
     - Chuỗi rỗng, khoảng trắng thừa, teencode, unicode NFD.
"""

import pytest

from argument_analyzer import analyze_argument, ArgumentAssessment
import cognitive_bias_detector as cbd
import fallacy_detector as fd


# ==============================================================================
# 1. Trục độc lập: Pure Fallacy (Chỉ có Ngụy biện logic, KHÔNG có Thiên kiến)
# ==============================================================================

@pytest.mark.parametrize(
    "text,expected_fallacy",
    [
        (
            "Tất cả sinh viên đều lười học.",
            fd.HASTY_GENERALIZATION,
        ),
        (
            "Tôi chắc chắn 100% là lập trình viên đều thức khuya.",
            fd.HASTY_GENERALIZATION,
        ),
        (
            "Anh thì biết gì về kinh tế, anh còn chưa học hết cấp 3.",
            fd.AD_HOMINEM,
        ),
        (
            "Đừng nghe ý kiến của cô ta, cô ta từng ly hôn nên có tư cách gì nói về gia đình.",
            fd.AD_HOMINEM,
        ),
        (
            "Bạn nói nên giảm ngân sách quốc phòng, vậy là bạn muốn đất nước không có quân đội bảo vệ à?",
            fd.STRAW_MAN,
        ),
        (
            "Bạn bảo nên hạn chế ăn đồ ngọt, tức là bạn muốn cấm mọi người ăn bánh kẹo suốt đời sao?",
            fd.STRAW_MAN,
        ),
    ],
)
def test_pure_fallacy_detected_without_bias(text: str, expected_fallacy: str):
    """Lập luận chỉ chứa lỗi logic ngụy biện thì bias phải là None và fallacy được gắn nhãn chính xác."""
    result = analyze_argument(text, use_ai=False)
    assert isinstance(result, ArgumentAssessment)
    assert result.fallacy == expected_fallacy
    assert result.bias is None
    assert result.is_clean is False
    assert "⚠️ Phát hiện ngụy biện:" in result.feedback
    assert "🧠" not in result.feedback


# ==============================================================================
# 2. Trục độc lập: Pure Bias (Chỉ có Thiên kiến nhận thức, KHÔNG có Ngụy biện)
# ==============================================================================

@pytest.mark.parametrize(
    "text,expected_bias",
    [
        (
            "Tôi đã bảo mà, chỉ có nguồn này là nói đúng sự thật, củng cố suy nghĩ của tôi.",
            cbd.CONFIRMATION_BIAS,
        ),
        (
            "Tôi không quan tâm số liệu của ai, tôi chỉ tin bài viết củng cố quan điểm của mình.",
            cbd.CONFIRMATION_BIAS,
        ),
        (
            "Dù đồ án bế tắc nhưng đã làm 3 tháng rồi, không thể bỏ được.",
            cbd.SUNK_COST,
        ),
        (
            "Đã lỡ đóng 15 triệu học phí rồi, dù không thích cũng phải ráng theo.",
            cbd.SUNK_COST,
        ),
        (
            "Cả khóa đổ xô theo số đông, mình cứ làm theo thôi.",
            cbd.HERD_MENTALITY,
        ),
        (
            "Cả cộng đồng mạng tẩy chay theo, mình cứ tẩy chay theo cho yên chuyện.",
            cbd.HERD_MENTALITY,
        ),
    ],
)
def test_pure_bias_detected_without_fallacy(text: str, expected_bias: str):
    """Phát biểu chỉ chứa thiên kiến nhận thức thì fallacy phải là None và bias được gắn nhãn chính xác."""
    result = analyze_argument(text, use_ai=False)
    assert isinstance(result, ArgumentAssessment)
    assert result.fallacy is None
    assert result.bias is not None
    assert result.bias.bias_code == expected_bias
    assert result.is_clean is False
    assert "🧠" in result.feedback
    assert "⚠️ Phát hiện ngụy biện:" not in result.feedback


# ==============================================================================
# 3. Ma trận giải trừ nhập nhằng (Disambiguation Matrix): "Ai cũng"
# ==============================================================================

@pytest.mark.parametrize(
    "text",
    [
        "Cả lớp ai cũng đăng ký môn thầy A nên chắc chắn là đúng rồi, mình cứ theo thôi.",
        "Cả nhóm ai cũng mua khóa này, mình cứ đăng ký theo kẻo sợ lạc loài.",
        "Hàng triệu người ai cũng share, mình cứ làm theo mọi người thôi.",
        "Xu hướng trend ai cũng làm, mình cứ làm theo để khỏi lạc loài.",
    ],
)
def test_disambiguation_clears_hasty_generalization_for_herd_behavior(text: str):
    """Khi người dùng có tâm lý bầy đàn và hành vi bắt chước (mình cứ theo, làm theo),
    cụm 'ai cũng' không được coi là lỗi quy nạp toán học (Hasty Generalization),
    mà phải được chuẩn hóa về đúng bản chất là Tâm lý bầy đàn (Herd Mentality)."""
    result = analyze_argument(text, use_ai=False)
    assert result.fallacy is None, f"Lỗi ngụy biện phải được giải trừ, nhưng nhận được: {result.fallacy}"
    assert result.bias is not None
    assert result.bias.bias_code == cbd.HERD_MENTALITY


@pytest.mark.parametrize(
    "text",
    [
        "Tôi chắc chắn 100% món này ai cũng thích.",
        "Quán này dở tệ, ai cũng chê bai.",
        "Tất cả sinh viên ở đây ai cũng lười biếng.",
    ],
)
def test_disambiguation_preserves_hasty_generalization_when_no_herd_action(text: str):
    """Khi phát biểu mang tính khẳng định tuyệt đối/khái quát hóa từ số ít mà KHÔNG có
    hành động bắt chước số đông, hệ thống giữ nguyên HASTY_GENERALIZATION."""
    result = analyze_argument(text, use_ai=False)
    assert result.fallacy == fd.HASTY_GENERALIZATION
    assert result.bias is None


# ==============================================================================
# 4. Lập luận kép vi phạm đồng thời (Hybrid Flaws: Fallacy + Bias)
# ==============================================================================

@pytest.mark.parametrize(
    "text,expected_fallacy,expected_bias",
    [
        (
            # Ad Hominem + Confirmation Bias
            "Anh thì biết gì về kinh tế, chỉ có bài báo của tôi mới nói đúng sự thật, các nguồn khác toàn bị mua chuộc!",
            fd.AD_HOMINEM,
            cbd.CONFIRMATION_BIAS,
        ),
        (
            # Ad Hominem + Sunk Cost
            "Đừng nghe ý kiến của anh ta! Tôi đã bỏ ra cả năm trời và 50 triệu học phí rồi, dù bế tắc cũng phải ráng theo!",
            fd.AD_HOMINEM,
            cbd.SUNK_COST,
        ),
        (
            # Straw Man + Herd Mentality
            "Bạn bảo nên hạn chế ăn đồ ngọt, tức là bạn muốn cấm mọi người ăn bánh kẹo suốt đời sao? Cả khóa đổ xô ăn, mình cứ theo thôi!",
            fd.STRAW_MAN,
            cbd.HERD_MENTALITY,
        ),
        (
            # Straw Man + Confirmation Bias
            "Bạn nói vậy nói trắng ra là muốn xóa bỏ hoàn toàn, tôi chỉ tìm đọc các bài viết ủng hộ quan điểm của tôi mà thôi!",
            fd.STRAW_MAN,
            cbd.CONFIRMATION_BIAS,
        ),
    ],
)
def test_hybrid_flaws_both_detected_independently(
    text: str, expected_fallacy: str, expected_bias: str
):
    """Cả Ngụy biện logic và Thiên kiến nhận thức phải được phát hiện đồng thời mà không bị che giấu lẫn nhau."""
    result = analyze_argument(text, use_ai=False)
    assert result.fallacy == expected_fallacy
    assert result.bias is not None
    assert result.bias.bias_code == expected_bias
    assert result.is_clean is False
    # Cả 2 phần feedback đều phải hiển thị đầy đủ
    assert "⚠️ Phát hiện ngụy biện:" in result.feedback
    assert "🧠" in result.feedback


# ==============================================================================
# 5. Tư duy phản biện khoa học & Khách quan (Rational / Clean)
# ==============================================================================

@pytest.mark.parametrize(
    "text",
    [
        "Theo nghiên cứu và khảo sát thực tế, chúng tôi quyết định dừng dự án để tránh lãng phí thêm ngân sách.",
        "Dù đã bỏ công sức nhưng tôi chủ động dừng lại để dành thời gian cho cơ hội tốt hơn.",
        "Dù cả lớp ai cũng theo trào lưu đó, nhưng tôi cần chờ thông tin xác thực và có cái nhìn toàn diện.",
        "Tôi đọc cả bài viết ủng hộ lẫn phản biện để có góc nhìn đa chiều.",
        "Hôm nay trời mưa nên tôi mang theo ô để khỏi ướt.",
        "Xin chào bạn, chúc bạn một ngày tốt lành!",
    ],
)
def test_rational_reasoning_is_clean(text: str):
    """Những câu có tư duy phản biện đúng đắn hoặc câu giao tiếp thông thường phải trả về is_clean = True."""
    result = analyze_argument(text, use_ai=False)
    assert result.fallacy is None
    assert result.bias is None
    assert result.is_clean is True
    assert "Lập luận khách quan" in result.feedback


# ==============================================================================
# 6. Các trường hợp biên, chuẩn hóa và xử lý ngoại lệ (Edge Cases)
# ==============================================================================

def test_empty_string():
    result = analyze_argument("", use_ai=False)
    assert result.fallacy is None
    assert result.bias is None
    assert result.is_clean is True
    assert result.feedback == "Văn bản trống."


@pytest.mark.parametrize("ws", ["   ", "\t\t", "\n\n", " \t \r\n \xa0  "])
def test_whitespace_only(ws: str):
    result = analyze_argument(ws, use_ai=False)
    assert result.fallacy is None
    assert result.bias is None
    assert result.is_clean is True


@pytest.mark.parametrize("bad_input", [None, 123, 4.56, [], {}, True])
def test_non_string_raises_type_error(bad_input):
    with pytest.raises(TypeError, match="text must be str"):
        analyze_argument(bad_input, use_ai=False)


def test_mixed_case_and_noisy_whitespace_resilience():
    text = "   ANH THÌ BIẾT GÌ VỀ KINH TẾ,    TÔI CHỈ TIN CÁC BÀI VIẾT CỦNG CỐ SUY NGHĨ CỦA TÔI!   "
    result = analyze_argument(text, use_ai=False)
    assert result.fallacy == fd.AD_HOMINEM
    assert result.bias is not None
    assert result.bias.bias_code == cbd.CONFIRMATION_BIAS
