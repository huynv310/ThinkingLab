"""Bạn đồng hành luyện phản biện: chọn câu trả lời cho bot dựa trên câu của user.

Thứ tự ưu tiên: ngụy biện -> câu trả lời ngây thơ -> câu hỏi Socratic đào sâu.
Mọi chủ đề, cách hóa giải và câu hỏi Socratic đều lấy từ đề xuất dự án ThinkingLab.
Bot châm chọc LẬP LUẬN, không bao giờ châm chọc CON NGƯỜI (nếu không chính bot
đang mắc Ad Hominem).
"""

import re
import unicodedata
from dataclasses import dataclass

from fallacy_detector import AD_HOMINEM, HASTY_GENERALIZATION, STRAW_MAN, detect_fallcacy

TOPICS = {
    "boc-phot": {
        "title": "Bóc phốt trên mạng xã hội",
        "opening": "Sinh viên \"bóc phốt\" công khai danh tính người khác lên hội nhóm khi bị đối xử "
                   "bất công: dũng cảm bảo vệ cộng đồng hay bạo lực mạng? Bạn đứng về phía nào, vì sao?",
    },
    "giang-vien-a": {
        "title": "Lời đồn về giảng viên A",
        "opening": "Một đàn anh cảnh báo: \"Đừng đăng ký lớp giảng viên A, thầy chấm gắt lắm, rớt cả "
                   "nửa lớp!\". Bạn sẽ làm gì tiếp theo?",
    },
    "dam-dong": {
        "title": "Cả khóa đăng ký, mình có theo?",
        "opening": "Cả khóa đổ xô đăng ký một môn học/giảng viên. Bạn có đăng ký theo không, "
                   "và lập luận của bạn là gì?",
    },
    "chi-phi-chim": {
        "title": "Đồ án đã lỡ thức 3 đêm",
        "opening": "Nhóm bạn đã thức 3 đêm cho một hướng làm đồ án nhưng nó không hiệu quả. "
                   "Nên tiếp tục hay đổi hướng?",
    },
    "ngon-ngu-lap-trinh": {
        "title": "Ngôn ngữ lập trình \"xịn nhất\"",
        "opening": "Bạn toàn đọc các bài khen ngôn ngữ lập trình mình đang học. Vậy nó có thật sự "
                   "là lựa chọn tốt nhất không?",
    },
    "ai-ao-giac": {
        "title": "AI đưa ra một bài báo",
        "opening": "AI gợi ý cho bạn một bài báo khoa học làm dẫn chứng cho bài luận. Bạn có dùng ngay "
                   "không, hay sẽ kiểm chứng thế nào?",
    },
}

_FALLACY_REPLIES = {
    HASTY_GENERALIZATION: {
        "meme": "hasty",
        "teases": [
            "Ồ, \"tất cả\" luôn cơ à? Một con én đâu làm nên mùa xuân.",
            "Khái quát hóa vội vã detected! Vài trường hợp chưa đủ để kết luận cho cả thế giới đâu.",
            "Chắc chắn 100% nghe kêu thật, nhưng dữ liệu của bạn có to được như câu nói không?",
        ],
        "counter": "Bạn dựa trên bao nhiêu trường hợp, và có số liệu nào cho thấy điều đó đúng với số đông không?",
    },
    AD_HOMINEM: {
        "meme": "ad-hominem",
        "teases": [
            "Khoan, mình đang chấm điểm lập luận chứ không chấm điểm con người nhé.",
            "Công kích cá nhân rồi! Tấn công vào luận điểm, đừng tấn công vào người nói.",
            "Lý lịch của ai đó không làm cho luận điểm của họ đúng hay sai đâu bạn.",
        ],
        "counter": "Tạm gác chuyện cá nhân sang một bên: luận điểm của họ sai ở số liệu hay logic nào?",
    },
    STRAW_MAN: {
        "meme": "straw-man",
        "teases": [
            "Ơ kìa, đối phương đâu có nói vậy! Bạn vừa dựng một hình nộm rơm để đánh.",
            "Ngụy biện bù nhìn: bóp méo ý người ta rồi phản bác bản bóp méo, nghe quen không?",
            "Bạn đang cãi nhau với phiên bản phóng đại của đối phương đấy.",
        ],
        "counter": "Hãy nhắc lại chính xác quan điểm của họ trước, rồi phản bác đúng điểm đó được không?",
    },
}

_NAIVE_TEASES = [
    "Câu trả lời này hơi... ngây thơ đấy. Mình cần nhiều hơn một cảm giác.",
    "Gọn quá! Gọn đến mức chưa thấy lý lẽ đâu cả.",
    "Nghe thì dễ thương, nhưng thầy cô chấm bài luận sẽ không tha cho câu này đâu.",
]
_NAIVE_PROMPT = "Thử lại theo mô hình ARE nhé: Luận điểm của bạn là gì, vì sao, và bằng chứng nào?"

# Bộ khung câu hỏi Socrates 4 tầng (Buổi 2).
_SOCRATIC_QUESTIONS = [
    "Chính xác thì từ khóa quan trọng nhất trong câu của bạn có nghĩa là gì?",
    "Bạn đang mặc định điều gì là hiển nhiên đúng ở đây?",
    "Cơ sở thực tế hoặc số liệu nào chứng minh cho nhận định này?",
    "Nếu làm theo phương án của bạn thì điều tồi tệ nhất có thể xảy ra là gì?",
]
_PRAISES = ["Có lý lẽ đấy!", "Lập luận khá chắc.", "Ổn, bắt đầu có màu phản biện rồi."]

_REASONING_WORDS = {"vì", "bởi", "do", "nếu", "theo", "because"}
_REASONING_PHRASES = ("bằng chứng", "số liệu", "ví dụ", "dẫn chứng", "nghiên cứu", "khảo sát", "cho nên", "vì vậy")
_MIN_WORDS = 6
_REASONED_WORDS = 25


_CASUAL_GREETINGS = [
    "Chào bạn nha! Rất vui được gặp bạn hôm nay. Cứ thoải mái chia sẻ nhé, bạn đang có câu hỏi hay chủ đề nào cần tụi mình cùng thảo luận không nè?",
    "Hé lô bạn! Hôm nay thế nào rồi? Cứ tự nhiên đàm đạo hoặc hỏi bất cứ điều gì bạn đang băn khoăn nhé!",
    "Chào bạn! Lab luôn ở đây để đồng hành cùng bạn. Bạn muốn mổ xẻ vấn đề gì hay có câu hỏi nào cần kiểm chứng không?",
]

_INQUIRY_REVIEWS = [
    "Bộ câu hỏi bạn đưa ra rất chất lượng và có chiều sâu! Các câu hỏi đã đào sâu bóc tách từ kết quả bề mặt đến nguyên nhân gốc rễ và số liệu thực tế, rất chuẩn tinh thần mô hình Socrates và 5 Whys. Điểm sáng là tập trung vào hành động cá nhân thay vì phán xét chung chung.",
    "Cách đặt câu hỏi của bạn rất sắc bén! Bạn đã bóc tách được các giả định ngầm định và cơ chế tâm lý đằng sau niềm tin. Để sắc sảo hơn nữa, bạn có thể bổ sung thêm câu hỏi về giải pháp hành động tiếp theo nhé.",
    "Bộ câu hỏi đào sâu rất tốt! Những câu hỏi này giúp đối tượng nhìn thẳng vào trách nhiệm và sự thật khách quan. Rất đúng phương pháp phản biện!",
]


@dataclass(frozen=True)
class Reply:
    text: str
    fallacy_code: str | None
    meme_key: str | None


def opening_message(topic_id):
    return TOPICS[topic_id]["opening"]


def is_casual_greeting(text):
    """Phát hiện lời chào, hỏi thăm thân mật ngắn."""
    normalized = unicodedata.normalize("NFC", text).lower().strip()
    words = re.findall(r"\w+", normalized)
    casual_words = {"chào", "hi", "hello", "halo", "hé lô", "hey", "alo"}
    return len(words) <= 6 and any(w in casual_words for w in words)


def is_inquiry_or_review(text):
    """Phát hiện người dùng đang hỏi, nhờ giải thích, hoặc nhờ kiểm chứng/review câu hỏi/bài tập."""
    normalized = unicodedata.normalize("NFC", text).lower()
    inquiry_phrases = (
        "kiểm chứng giúp", "hãy kiểm chứng", "nhờ kiểm chứng", "kiểm tra giúp", "xem giúp", "đánh giá giúp",
        "nhờ xem", "so sánh giúp", "giải thích giúp", "bộ mô hình", "mô hình socrates", "câu hỏi socrates",
        "5 whys", "5 why", "là gì vậy", "nghĩa là gì", "khác nhau thế nào", "tại sao lại",
        "cho mình hỏi", "cho em hỏi", "bạn ơi cho hỏi", "thắc mắc", "xin ý kiến",
    )
    if any(p in normalized for p in inquiry_phrases):
        return True
    if normalized.strip().endswith("?") and any(normalized.startswith(q) for q in ("tại sao", "vì sao", "sao lại", "thế nào", "như thế nào", "ai", "cái gì")):
        return True
    return False


def is_naive(text):
    """Câu quá ngắn, hoặc chưa dài mà không có dấu hiệu lý lẽ/bằng chứng nào."""
    normalized = unicodedata.normalize("NFC", text).lower()
    words = re.findall(r"\w+", normalized)
    if len(words) < _MIN_WORDS:
        return True
    has_reasoning = (
        any(w in _REASONING_WORDS for w in words)
        or any(p in normalized for p in _REASONING_PHRASES)
        or any(ch.isdigit() for ch in normalized)
    )
    return len(words) < _REASONED_WORDS and not has_reasoning


def build_reply(text, turn, use_ai=True):
    """Trả lời theo mẫu (phương án dự phòng khi không dùng được AI).
    `turn` dùng để xoay vòng câu châm chọc/câu hỏi cho đỡ lặp."""
    if not isinstance(text, str):
        raise TypeError(f"text must be str, got {type(text).__name__}")

    # 1. Chào hỏi thân thiện
    if is_casual_greeting(text):
        greeting = _CASUAL_GREETINGS[turn % len(_CASUAL_GREETINGS)]
        return Reply(greeting, None, None)

    # 2. Nhờ kiểm chứng / hỏi đáp thông thường
    if is_inquiry_or_review(text):
        review = _INQUIRY_REVIEWS[turn % len(_INQUIRY_REVIEWS)]
        return Reply(review, None, None)

    code = detect_fallcacy(text, use_ai=use_ai)
    if code:
        spec = _FALLACY_REPLIES[code]
        tease = spec["teases"][turn % len(spec["teases"])]
        return Reply(f"{tease} {spec['counter']}", code, spec["meme"])

    if is_naive(text):
        tease = _NAIVE_TEASES[turn % len(_NAIVE_TEASES)]
        return Reply(f"{tease} {_NAIVE_PROMPT}", None, "naive")

    praise = _PRAISES[turn % len(_PRAISES)]
    question = _SOCRATIC_QUESTIONS[turn % len(_SOCRATIC_QUESTIONS)]
    return Reply(f"{praise} {question}", None, None)
