"""Bước ĐỎ (TDD): test cho detect_fallcacy(text) — hàm CHƯA tồn tại.

Hợp đồng (contract) mà các test này khóa lại:
- Input: str (phản hồi của người dùng).
- Output: một trong các mã lỗi
    "HASTY_GENERALIZATION" | "AD_HOMINEM" | "STRAW_MAN"
  hoặc None nếu câu hợp lệ / rỗng.
- Không phân biệt hoa/thường, không bị ảnh hưởng bởi khoảng trắng thừa.
- Input không phải str -> TypeError (không đoán mò, không ép kiểu ngầm).
"""

import time
import unicodedata

import pytest

from fallacy_detector import detect_fallcacy

HASTY = "HASTY_GENERALIZATION"
AD_HOMINEM = "AD_HOMINEM"
STRAW_MAN = "STRAW_MAN"
VALID_CODES = {HASTY, AD_HOMINEM, STRAW_MAN}


# ---------------------------------------------------------------------------
# 1. Khái quát hóa vội vã (HASTY_GENERALIZATION)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "text",
    [
        "Tất cả sinh viên đều lười học.",
        "Tôi chắc chắn 100% là món này ai cũng thích.",
        "Tôi gặp hai người bán hàng gian dối ở chợ, vậy người buôn bán ai cũng gian dối.",
        "Mọi lập trình viên đều không biết giao tiếp.",
        "Lần trước dùng ứng dụng này bị lỗi, nên ứng dụng này lúc nào cũng lỗi.",
        "Giới trẻ bây giờ không ai chịu đọc sách cả.",
    ],
    ids=[
        "tat-ca-sinh-vien-deu",
        "chac-chan-100-phan-tram",
        "suy-tu-2-mau-ra-toan-bo",
        "moi-X-deu",
        "1-lan-thanh-luon-luon",
        "khong-ai",
    ],
)
def test_detects_hasty_generalization(text):
    assert detect_fallcacy(text) == HASTY


# ---------------------------------------------------------------------------
# 2. Công kích cá nhân (AD_HOMINEM)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "text",
    [
        "Anh thì biết gì về kinh tế, anh còn chưa học hết cấp 3.",
        "Đừng nghe ý kiến của cô ta, cô ta là đứa nghiện thuốc lá.",
        "Ý kiến của bạn ngu ngốc y như con người bạn vậy.",
        "Ông ấy từng ly hôn nên đề xuất về chính sách gia đình của ông ấy chẳng đáng tin.",
        "Loại người nghèo như cậu thì có tư cách gì mà bàn chuyện đầu tư.",
    ],
    ids=[
        "cong-kich-hoc-van",
        "cong-kich-thoi-quen",
        "xuc-pham-truc-tiep",
        "cong-kich-doi-tu",
        "cong-kich-hoan-canh",
    ],
)
def test_detects_ad_hominem(text):
    assert detect_fallcacy(text) == AD_HOMINEM


# ---------------------------------------------------------------------------
# 3. Ngụy biện bù nhìn (STRAW_MAN)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "text",
    [
        "Bạn nói nên giảm ngân sách quốc phòng, vậy là bạn muốn đất nước không có quân đội bảo vệ à?",
        "Bạn bảo nên hạn chế ăn đồ ngọt, tức là bạn muốn cấm mọi người ăn bánh kẹo suốt đời sao?",
        "Anh muốn giảm giờ làm, nói trắng ra là anh chỉ muốn lười biếng mà vẫn nhận lương.",
        "Chị đề xuất kiểm duyệt nội dung bạo lực, hóa ra chị muốn xóa bỏ hoàn toàn tự do ngôn luận.",
    ],
    ids=[
        "bop-meo-quoc-phong",
        "bop-meo-do-ngot",
        "bop-meo-gio-lam",
        "bop-meo-kiem-duyet",
    ],
)
def test_detects_straw_man(text):
    assert detect_fallcacy(text) == STRAW_MAN


# ---------------------------------------------------------------------------
# 4. Test biên: chuỗi rỗng
# ---------------------------------------------------------------------------

def test_empty_string_returns_none():
    assert detect_fallcacy("") is None


@pytest.mark.parametrize("text", [" ", "     ", "\t", "\n", " \t\n\r    "])
def test_whitespace_only_string_returns_none(text):
    assert detect_fallcacy(text) is None


# ---------------------------------------------------------------------------
# 5. Test biên: chữ hoa / chữ thường lộn xộn
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "text, expected",
    [
        ("TẤT CẢ SINH VIÊN ĐỀU LƯỜI HỌC.", HASTY),
        ("tẤt Cả SiNh ViÊn ĐỀu lƯờI hỌc.", HASTY),
        ("Tôi CHẮC CHẮN 100% là món này ai cũng thích.", HASTY),
        ("ANH THÌ BIẾT GÌ VỀ KINH TẾ, ANH CÒN CHƯA HỌC HẾT CẤP 3.", AD_HOMINEM),
        ("đỪnG nGhE ý KiẾn CủA cÔ tA, Cô Ta Là ĐứA nGhIệN tHuỐc Lá.", AD_HOMINEM),
        ("BẠN NÓI NÊN GIẢM NGÂN SÁCH QUỐC PHÒNG, VẬY LÀ BẠN MUỐN ĐẤT NƯỚC KHÔNG CÓ QUÂN ĐỘI BẢO VỆ À?", STRAW_MAN),
        ("bẠn BảO nÊn HạN cHế ĂN đỒ nGọT, tỨc Là BạN mUốN cẤm MọI nGưỜi ĂN bÁnH kẸo SuỐt ĐờI sAo?", STRAW_MAN),
    ],
)
def test_mixed_case_is_detected_case_insensitively(text, expected):
    assert detect_fallcacy(text) == expected


@pytest.mark.parametrize(
    "text",
    [
        "HÔM NAY TRỜI MƯA NÊN TÔI MANG THEO Ô.",
        "hÔm NaY tRờI mƯa NêN tÔi MaNg ThEo Ô.",
    ],
)
def test_mixed_case_valid_sentence_returns_none(text):
    assert detect_fallcacy(text) is None


def test_decomposed_unicode_nfd_is_treated_like_nfc():
    # Tiếng Việt gõ từ macOS/một số bộ gõ hay ra dạng NFD (dấu tách rời).
    # Hai chuỗi trông giống hệt nhau thì phải cho cùng kết quả.
    nfc = "Tất cả sinh viên đều lười học."
    nfd = unicodedata.normalize("NFD", nfc)
    assert nfd != nfc
    assert detect_fallcacy(nfd) == HASTY


# ---------------------------------------------------------------------------
# 6. Test biên: chuỗi KHÔNG chứa ngụy biện
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "text",
    [
        "Hôm nay trời mưa nên tôi mang theo ô.",
        "Theo khảo sát 2.000 sinh viên, 62% cho biết họ đi làm thêm ngoài giờ học.",
        "Tôi không đồng ý với đề xuất này vì chi phí triển khai vượt ngân sách 20%.",
        "Bạn nói nên giảm đồ ngọt, tôi đồng ý vì nó tốt cho sức khỏe.",
        "Lập luận của anh thiếu số liệu ở phần hai, anh có thể bổ sung nguồn không?",
        "Sinh viên",
        "100%",
    ],
    ids=[
        "cau-binh-thuong",
        "khai-quat-co-so-lieu",
        "phan-bien-dua-tren-lap-luan",
        "dien-dat-lai-dung-y",
        "phe-binh-lap-luan-khong-phe-binh-nguoi",
        "chi-chua-danh-tu",
        "chi-chua-con-so",
    ],
)
def test_valid_sentence_returns_none(text):
    assert detect_fallcacy(text) is None


# ---------------------------------------------------------------------------
# 7. Khoảng trắng thừa ở đầu, cuối và giữa các từ
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "text, expected",
    [
        # chỉ thừa ở đầu
        ("      Tất cả sinh viên đều lười học.", HASTY),
        # chỉ thừa ở cuối
        ("Tất cả sinh viên đều lười học.      ", HASTY),
        # chỉ thừa ở giữa các từ
        ("Tất    cả     sinh   viên    đều lười học.", HASTY),
        # thừa ở cả đầu, cuối và giữa
        ("   Tất   cả   sinh   viên   đều   lười   học.   ", HASTY),
        ("  Tôi chắc     chắn    100%   là món này ai cũng thích.  ", HASTY),
        # khoảng trắng hỗn hợp: tab, xuống dòng, CRLF, non-breaking space
        ("\t\nTất\t cả \n sinh\r\nviên đều lười học.\n\t", HASTY),
        ("   Anh   thì  biết   gì  về  kinh tế,   anh còn chưa học hết cấp 3.   ", AD_HOMINEM),
        ("\n\tĐừng  nghe\t ý kiến của  cô ta,\n cô ta là đứa nghiện  thuốc lá.\t\n", AD_HOMINEM),
        ("   Bạn  nói   nên giảm  ngân sách quốc phòng,   vậy là   bạn muốn đất nước không có quân đội bảo vệ à?   ", STRAW_MAN),
        ("\tBạn bảo\n\nnên hạn chế   ăn đồ ngọt,\ttức là bạn muốn cấm mọi người ăn bánh kẹo suốt đời sao?\n", STRAW_MAN),
    ],
)
def test_extra_whitespace_does_not_change_detection(text, expected):
    assert detect_fallcacy(text) == expected


@pytest.mark.parametrize(
    "text",
    [
        "    Hôm   nay   trời   mưa   nên   tôi   mang   theo   ô.    ",
        "\t\nHôm nay\t trời mưa \n nên tôi\r\nmang theo ô.\n\t",
    ],
)
def test_extra_whitespace_in_valid_sentence_returns_none(text):
    assert detect_fallcacy(text) is None


# ---------------------------------------------------------------------------
# 8. Hợp đồng kiểu trả về & an toàn đầu vào
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "text",
    [
        "Tất cả sinh viên đều lười học.",
        "Anh thì biết gì về kinh tế, anh còn chưa học hết cấp 3.",
        "Bạn nói nên giảm ngân sách quốc phòng, vậy là bạn muốn đất nước không có quân đội bảo vệ à?",
        "Hôm nay trời mưa nên tôi mang theo ô.",
    ],
)
def test_return_value_is_error_code_or_none(text):
    result = detect_fallcacy(text)
    assert result is None or result in VALID_CODES


@pytest.mark.parametrize("bad_input", [None, 123, 4.5, b"tat ca sinh vien deu", ["Tất cả sinh viên đều"], {"text": "x"}])
def test_non_string_input_raises_type_error(bad_input):
    with pytest.raises(TypeError):
        detect_fallcacy(bad_input)


def test_very_long_input_completes_quickly():
    # Chặn ReDoS / thuật toán bùng nổ: ~1MB khoảng trắng + chữ phải xử lý nhanh.
    text = ("a " * 250_000) + "   " * 100_000 + "!"
    start = time.perf_counter()
    result = detect_fallcacy(text)
    elapsed = time.perf_counter() - start
    assert result is None or result in VALID_CODES
    assert elapsed < 2.0
