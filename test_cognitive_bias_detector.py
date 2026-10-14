"""Bước ĐỎ (TDD RED STEP): Bộ Test Cases toàn diện cho hàm detect_cognitive_bias(text).

Hợp đồng (Contract) mà test suite này khóa chặt:
1. Input: str (nội dung người dùng nhập vào).
2. Output:
   - Trả về CognitiveBiasResult(bias_code, warning) nếu phát hiện thiên kiến.
     + bias_code thuộc VALID_BIAS_CODES: "CONFIRMATION_BIAS" | "HERD_MENTALITY" | "SUNK_COST"
     + warning: str là lời cảnh báo / gợi ý phản biện hữu ích cho sinh viên.
   - Trả về None nếu câu hợp lệ, khách quan, tư duy khoa học hoặc chuỗi rỗng.
3. Tính bất biến đối với các trường hợp biên NLP:
   - Không phân biệt chữ hoa / chữ thường / viết hoa lung tung (Case-insensitive).
   - Không bị ảnh hưởng bởi khoảng trắng thừa ở đầu, cuối, giữa các từ, tabs, newlines, NBSP.
   - Chuẩn hóa Unicode: NFD (dấu tách rời trên macOS) được xử lý đồng nhất với NFC.
   - Chịu lỗi chính tả nhẹ, ký tự kéo dài cảm xúc, viết tắt teencode phổ biến của sinh viên.
4. Chống báo động giả (False Positive Defense):
   - Người dùng nhắc đến thời gian/tiền bạc đã bỏ ra nhưng đưa ra quyết định từ bỏ hợp lý -> KHÔNG bắt nhầm Sunk Cost.
   - Người dùng trích dẫn số liệu thống kê đám đông nhưng phân tích khách quan -> KHÔNG bắt nhầm Herd Mentality.
   - Người dùng đối chiếu nhiều nguồn dữ liệu đa chiều -> KHÔNG bắt nhầm Confirmation Bias.
5. An toàn kiểu và hiệu năng:
   - Input không phải str -> TypeError.
   - Input cực lớn (> 200,000 ký tự) không gây ReDoS, thực thi < 1.0 giây.
"""

import time
import unicodedata
import pytest

from cognitive_bias_detector import (
    CONFIRMATION_BIAS,
    HERD_MENTALITY,
    SUNK_COST,
    VALID_BIAS_CODES,
    CognitiveBiasResult,
    detect_cognitive_bias,
)


# ===========================================================================
# 1. TEST PHÁT HIỆN THIÊN KIẾN XÁC NHẬN (CONFIRMATION_BIAS)
# ===========================================================================

@pytest.mark.parametrize(
    "text",
    [
        "Tôi đã bảo mà, chỉ có bài báo của tác giả này là nói đúng sự thật, các nguồn khác toàn bị mua chuộc.",
        "Tôi chỉ tìm kiếm các bài viết ủng hộ việc bỏ học đại học, vì tôi chắc chắn quan điểm của mình là đúng.",
        "Mấy người phản biện toàn có mục đích xấu, tôi chỉ tin những bằng chứng củng cố suy nghĩ của tôi thôi.",
        "Cứ lên Google gõ là thấy đầy bài ủng hộ ý kiến của mình, cần gì phải đọc mấy bài phản bác làm gì.",
        "Tôi không quan tâm số liệu của bạn, tôi chỉ tin vào những thông tin khớp với niềm tin ban đầu của tôi.",
    ],
    ids=[
        "chi-tin-nguon-hop-y",
        "chi-tim-bai-viet-ung-ho",
        "chi-tin-bang-chung-cung-co",
        "google-day-bai-ung-ho",
        "bo-qua-so-lieu-chi-tin-niem-tin",
    ],
)
def test_detects_confirmation_bias(text):
    result = detect_cognitive_bias(text)
    assert result is not None
    assert isinstance(result, CognitiveBiasResult)
    assert result.bias_code == CONFIRMATION_BIAS
    assert isinstance(result.warning, str) and len(result.warning) >= 15
    # Cảnh báo phải chứa hướng dẫn gợi mở tư duy đa chiều
    assert any(kw in result.warning.lower() for kw in ["xác nhận", "phản biện", "đa chiều", "phản bác", "góc nhìn"])


# ===========================================================================
# 2. TEST PHÁT HIỆN TÂM LÝ BẦY ĐÀN / ĐÁM ĐÔNG (HERD_MENTALITY)
# ===========================================================================

@pytest.mark.parametrize(
    "text",
    [
        "Cả lớp ai cũng đăng ký môn thầy A nên chắc chắn là đúng rồi, mình cứ đăng ký theo số đông thôi.",
        "Hàng triệu người trên mạng đang share và tin bài này rầm rộ, làm sao mà sai được.",
        "Cả cộng đồng mạng đều đang tẩy chay quán đó, mình cũng phải tẩy chay theo mọi người.",
        "Cả khóa đổ xô đi học trung tâm đó thì tội gì mình không đi, mọi người làm gì mình làm nấy.",
        "Xu hướng hiện nay ai cũng làm như vậy, mình không theo thì thành ra lạc loài à.",
    ],
    ids=[
        "ca-lop-ai-cung-dang-ky",
        "trieu-nguoi-share-khong-the-sai",
        "cong-dong-tay-chay-minh-theo",
        "ca-khoa-do-xo-theo-so-dong",
        "ai-cung-lam-minh-lam-theo",
    ],
)
def test_detects_herd_mentality(text):
    result = detect_cognitive_bias(text)
    assert result is not None
    assert isinstance(result, CognitiveBiasResult)
    assert result.bias_code == HERD_MENTALITY
    assert isinstance(result.warning, str) and len(result.warning) >= 15
    # Cảnh báo phải chỉ ra số đông không đồng nghĩa với chân lý
    assert any(kw in result.warning.lower() for kw in ["đám đông", "bầy đàn", "số đông", "chính kiến", "độc lập"])


# ===========================================================================
# 3. TEST PHÁT HIỆN THIÊN KIẾN CHI PHÍ CHÌM (SUNK_COST)
# ===========================================================================

@pytest.mark.parametrize(
    "text",
    [
        "Dù đồ án này bế tắc và sai hướng hoàn toàn, nhưng tôi đã làm 3 tháng rồi, không thể bỏ được, phải cố tiếp.",
        "Tôi đã lỡ đóng 15 triệu học phí rồi, dù học không hiểu gì và rất chán vẫn phải cắn răng đi học cho hết.",
        "Mình đã theo đuổi dự án này cả năm trời, giờ mà dừng lại thì công sức đổ sông đổ biển hết, dù lỗ cũng phải theo.",
        "Đã lỡ mua vé vào cổng đắt tiền rồi thì dù trời mưa to ngập lụt cũng phải vào chơi cho bõ tiền.",
        "Chúng ta đã đầu tư quá nhiều thời gian và tiền bạc vào tính năng này rồi, không thể hủy bỏ giữa chừng được.",
    ],
    ids=[
        "da-lam-3-thang-khong-the-bo",
        "lo-dong-15-trieu-phai-co",
        "do-cong-do-bien-du-lo-phai-theo",
        "lo-mua-ve-dat-mua-cung-phai-di",
        "dau-tu-qua-nhieu-khong-the-huy",
    ],
)
def test_detects_sunk_cost(text):
    result = detect_cognitive_bias(text)
    assert result is not None
    assert isinstance(result, CognitiveBiasResult)
    assert result.bias_code == SUNK_COST
    assert isinstance(result.warning, str) and len(result.warning) >= 15
    # Cảnh báo phải hướng tới việc tối ưu chi phí tương lai thay vì tiếc nuối quá khứ
    assert any(kw in result.warning.lower() for kw in ["chi phí chìm", "quá khứ", "tương lai", "thu hồi", "lãng phí"])


# ===========================================================================
# 4. TEST BIÊN: CHỮ HOA / CHỮ THƯỜNG LỘN XỘN (CASE INSENSITIVITY)
# ===========================================================================

@pytest.mark.parametrize(
    "text, expected_bias",
    [
        ("CẢ LỚP AI CŨNG ĐĂNG KÝ MÔN THẦY A NÊN CHẮC CHẮN LÀ ĐÚNG RỒI.", HERD_MENTALITY),
        ("cẢ lỚp Ai CũNg ĐăNg Ký Môn ThẦy A nÊn ChẮc ChẮn Là ĐúNg.", HERD_MENTALITY),
        ("DÙ ĐỒ ÁN BẾ TẮC NHƯNG ĐÃ LÀM 3 THÁNG RỒI NÊN KHÔNG THỂ BỎ ĐƯỢC.", SUNK_COST),
        ("dÙ đỒ áN bẾ tẮc NhƯnG đÃ lÀm 3 tHáNg RồI nÊn KhÔnG tHể Bỏ.", SUNK_COST),
        ("TÔI ĐÃ BẢO MÀ, CHỈ CÓ NGUỒN NÀY LÀ ĐÚNG, CÁC BÁO KHÁC TOÀN BỊ MUA CHUỘC.", CONFIRMATION_BIAS),
        ("tÔi Đã BảO mÀ, cHỉ Có NgUồN nÀy Là ĐúNg, MấY bÁo KhÁc ToÀn FaKe NeWs.", CONFIRMATION_BIAS),
    ],
    ids=[
        "all-caps-herd",
        "mixed-case-herd",
        "all-caps-sunk-cost",
        "mixed-case-sunk-cost",
        "all-caps-confirmation",
        "mixed-case-confirmation",
    ],
)
def test_mixed_case_normalization(text, expected_bias):
    result = detect_cognitive_bias(text)
    assert result is not None
    assert result.bias_code == expected_bias


# ===========================================================================
# 5. TEST BIÊN: KHOẢNG TRẮNG BẤT THƯỜNG (WHITESPACE RESILIENCE)
# ===========================================================================

@pytest.mark.parametrize(
    "text, expected_bias",
    [
        ("    Cả lớp ai cũng đăng ký môn thầy A nên chắc chắn là đúng rồi.    ", HERD_MENTALITY),
        ("Cả   lớp    ai    cũng    đăng   ký    môn    thầy    A    nên đúng.", HERD_MENTALITY),
        ("\t\nCả lớp\tai cũng \r\n đăng ký\n môn thầy A nên đúng.\n\t", HERD_MENTALITY),
        ("   Dù đồ án bế tắc nhưng   đã làm 3 tháng rồi,    không thể bỏ được.   ", SUNK_COST),
        ("Đã   lỡ   đóng\t 15 triệu\ntiền học rồi\r\nphải ráng học hết.", SUNK_COST),
        ("   Tôi   đã   bảo   mà,   chỉ có   nguồn này   là nói đúng sự thật.   ", CONFIRMATION_BIAS),
    ],
)
def test_irregular_whitespace_resilience(text, expected_bias):
    result = detect_cognitive_bias(text)
    assert result is not None
    assert result.bias_code == expected_bias


# ===========================================================================
# 6. TEST BIÊN: CHUẨN HÓA UNICODE (NFD vs NFC)
# ===========================================================================

def test_decomposed_unicode_nfd_matching():
    """Ký tự tiếng Việt dạng NFD (tách dấu trên macOS) phải nhận diện chính xác như NFC."""
    nfc = "Cả lớp ai cũng đăng ký môn thầy A nên chắc chắn là đúng rồi, mình cứ theo thôi."
    nfd = unicodedata.normalize("NFD", nfc)
    assert nfc != nfd  # Khẳng định 2 chuỗi nhị phân khác nhau

    result_nfd = detect_cognitive_bias(nfd)
    assert result_nfd is not None
    assert result_nfd.bias_code == HERD_MENTALITY


# ===========================================================================
# 7. TEST BIÊN: LỖI CHÍNH TẢ, TEENCODE & KÉO DÀI KÝ TỰ (SLANG / TYPOS)
# ===========================================================================

@pytest.mark.parametrize(
    "text, expected_bias",
    [
        # Kéo dài ký tự cảm xúc: cảaaa khóaaa, aiiii cũnggg
        ("Cảaaa khóaaa aiiii cũnggg đki môn thầy A nên chắc chắn đúng rùi.", HERD_MENTALITY),
        # Viết tắt / teencode phổ biến của sinh viên: đki, k/ko, nhg
        ("Đã lỡ đóng 15 củ rùi, nhg k thể bỏ dc vì tiếc tiền lắm.", SUNK_COST),
        # Sai chính tả dấu hỏi/ngã thường gặp: suy nghỉnh, lở đóng
        ("Đả lở theo dự án này 1 năm rùi, bỏ thì uổng công sức quá.", SUNK_COST),
        # Teencode chỉ tin bài: m chỉ tin ngừi ủng hộ ý kiến của m thui
        ("Mình chỉ tin những ngừi cùng quan điểm ủng hộ mình thui.", CONFIRMATION_BIAS),
    ],
    ids=[
        "elongated-characters-herd",
        "teencode-and-slang-sunk-cost",
        "typo-diacritics-sunk-cost",
        "slang-confirmation-bias",
    ],
)
def test_typos_and_student_slangs_resilience(text, expected_bias):
    result = detect_cognitive_bias(text)
    assert result is not None
    assert result.bias_code == expected_bias


# ===========================================================================
# 8. TEST CHỐNG BÁO ĐỘNG GIẢ: CÂU HỢP LỆ / TƯ DUY PHẢN BIỆN ĐÚNG ĐẮN
# ===========================================================================

@pytest.mark.parametrize(
    "text",
    [
        # Nhắc đến chi phí quá khứ nhưng đưa ra quyết định từ bỏ đúng đắn (Vượt qua Sunk Cost)
        "Dù đã bỏ ra 3 tháng nghiên cứu nhưng vì nhận thấy giải pháp không khả thi nên tôi quyết định dừng lại để tránh lãng phí thêm.",
        "Tôi đã lỡ đóng học phí khóa học này nhưng thấy chất lượng không đạt chuẩn, tôi quyết định dừng để dành thời gian cho việc khác.",

        # Trích dẫn số liệu thống kê đám đông nhưng phân tích khách quan (Không phải Herd Mentality)
        "Theo khảo sát 2.000 sinh viên, 85% chọn học trực tuyến, tuy nhiên chúng ta cần đánh giá thêm về hiệu quả tiếp thu kiến thức.",
        "Mọi người trên mạng đang bàn tán nhiều về sự việc, nhưng chúng ta cần chờ thông tin xác thực từ cơ quan chức năng.",

        # Tìm kiếm thông tin nhưng đối chiếu đa chiều (Không phải Confirmation Bias)
        "Tôi đã tìm đọc các luận điểm ủng hộ lẫn các bài viết phản bác để có cái nhìn toàn diện trước khi kết luận.",
        "Quan điểm ban đầu của tôi là đồng ý, nhưng sau khi xem xét các bằng chứng phản biện, tôi nhận thấy mình cần suy nghĩ lại.",

        # Câu đàm thoại thông thường
        "Hôm nay thời tiết Hà Nội rất đẹp và mát mẻ.",
        "Chào bạn, hôm nay chúng ta sẽ cùng tranh luận về chủ đề gì thế?",
        "123456789",
    ],
    ids=[
        "rational-exit-overcoming-sunk-cost",
        "cut-loss-learning-decision",
        "objective-survey-citation",
        "skeptical-crowd-trend",
        "multi-perspective-verification",
        "changing-mind-on-evidence",
        "casual-weather",
        "greeting-message",
        "digits-only",
    ],
)
def test_valid_objective_reasoning_returns_none(text):
    """Đảm bảo các lập luận phản biện sắc bén, có tư duy logic KHÔNG bị báo lỗi nhầm."""
    result = detect_cognitive_bias(text)
    assert result is None


# ===========================================================================
# 9. TEST BIÊN: CHUỖI RỖNG & KHOẢNG TRẮNG THUẦN TÚY
# ===========================================================================

def test_empty_string_returns_none():
    assert detect_cognitive_bias("") is None


@pytest.mark.parametrize("whitespace_str", [" ", "     ", "\t", "\n", "\r\n", " \t \n \xa0  "])
def test_whitespace_only_returns_none(whitespace_str):
    assert detect_cognitive_bias(whitespace_str) is None


# ===========================================================================
# 10. TEST AN TOÀN KIỂU DỮ LIỆU ĐẦU VÀO (TYPE SAFETY)
# ===========================================================================

@pytest.mark.parametrize(
    "bad_input",
    [
        None,
        12345,
        3.14159,
        b"ca lop ai cung lam theo",
        ["Cả lớp ai cũng làm"],
        {"text": "Cả lớp ai cũng làm"},
        True,
        object(),
    ],
)
def test_non_string_input_raises_type_error(bad_input):
    with pytest.raises(TypeError) as exc_info:
        detect_cognitive_bias(bad_input)
    assert "must be str" in str(exc_info.value)


# ===========================================================================
# 11. TEST AN TOÀN HIỆU NĂNG: CHỐNG REDOS & VĂN BẢN KHỔNG LỒ
# ===========================================================================

def test_extreme_length_input_performance():
    """Phòng chống bùng nổ thuật toán (ReDoS / Quadratic blowup) với input > 300.000 ký tự."""
    massive_text = ("Cả lớp ai cũng bảo thế " * 10_000) + ("   \t\n" * 5_000)
    assert len(massive_text) > 200_000

    start_time = time.perf_counter()
    # Hàm phải xử lý và trả kết quả hoặc cắt độ dài an toàn trong thời gian cực ngắn
    result = detect_cognitive_bias(massive_text)
    elapsed_time = time.perf_counter() - start_time

    assert elapsed_time < 1.0, f"Xử lý quá chậm ({elapsed_time:.3f}s), có nguy cơ nghẽn CPU hoặc ReDoS!"
    assert result is None or result.bias_code in VALID_BIAS_CODES
