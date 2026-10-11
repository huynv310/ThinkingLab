import pytest

from chatbot import TOPICS, build_reply, is_naive, opening_message

HASTY = "HASTY_GENERALIZATION"
AD_HOMINEM = "AD_HOMINEM"
STRAW_MAN = "STRAW_MAN"


# --- Chủ đề ---

def test_every_topic_has_title_and_opening_question():
    assert len(TOPICS) >= 4
    for topic_id, topic in TOPICS.items():
        assert topic["title"].strip()
        assert opening_message(topic_id).strip().endswith("?")


def test_unknown_topic_is_rejected():
    with pytest.raises(KeyError):
        opening_message("khong-ton-tai")


# --- Phát hiện câu trả lời "ngây thơ" ---

@pytest.mark.parametrize("text", ["Đồng ý", "ok", "Em nghĩ là đúng", "Chắc là không nên đâu ạ"])
def test_short_or_unreasoned_answer_is_naive(text):
    assert is_naive(text)


@pytest.mark.parametrize(
    "text",
    [
        "Tôi không đồng ý vì theo khảo sát 33 sinh viên, 66,7% gặp khó khăn khi kiểm chứng thông tin.",
        "Nên đổi hướng đồ án, bởi chi phí đã bỏ ra không lấy lại được và tiếp tục chỉ làm mất thêm thời gian.",
        "Em sẽ hỏi thêm vài anh chị khác và xem bảng điểm các kỳ trước làm dẫn chứng trước khi quyết định.",
    ],
)
def test_reasoned_answer_is_not_naive(text):
    assert not is_naive(text)


# --- Phản hồi khi mắc ngụy biện: châm chọc + meme + cách hóa giải ---

@pytest.mark.parametrize(
    "text, code",
    [
        ("Tất cả sinh viên đều lười học.", HASTY),
        ("Anh thì biết gì về kinh tế, anh còn chưa học hết cấp 3.", AD_HOMINEM),
        ("Bạn bảo nên hạn chế ăn đồ ngọt, tức là bạn muốn cấm mọi người ăn bánh kẹo suốt đời sao?", STRAW_MAN),
    ],
)
def test_fallacy_gets_code_meme_and_counter_question(text, code):
    reply = build_reply(text, turn=0)
    assert reply.fallacy_code == code
    assert reply.meme_key
    assert reply.text.strip().endswith("?")


def test_naive_answer_gets_meme_without_fallacy_code():
    reply = build_reply("Đồng ý", turn=0)
    assert reply.fallacy_code is None
    assert reply.meme_key == "naive"


def test_reasoned_answer_gets_socratic_question_without_meme():
    reply = build_reply(
        "Tôi không đồng ý vì theo khảo sát 33 sinh viên, 66,7% gặp khó khăn khi kiểm chứng thông tin.",
        turn=0,
    )
    assert reply.fallacy_code is None
    assert reply.meme_key is None
    assert reply.text.strip().endswith("?")


def test_replies_vary_between_turns():
    texts = {build_reply("Tất cả sinh viên đều lười học.", turn=t).text for t in range(4)}
    assert len(texts) > 1


def test_fallacy_takes_priority_over_naive():
    # Câu ngắn nhưng là ngụy biện -> phải gọi tên ngụy biện, không chỉ chê "ngây thơ".
    assert build_reply("Ai cũng thế mà", turn=0).fallacy_code == HASTY


@pytest.mark.parametrize("bad", [None, 123, b"bytes"])
def test_non_string_input_raises_type_error(bad):
    with pytest.raises(TypeError):
        build_reply(bad, turn=0)
