import { describe, expect, it } from 'vitest'
import {
  computeArenaMetrics,
  scoreUserMessage,
  type DbConversation,
  type DbMessage,
} from './arenaRules'

describe('scoreUserMessage', () => {
  it('đánh giá thấp câu trả lời né tránh hoặc cộc lốc', () => {
    const res = scoreUserMessage('không biết', null)
    expect(res.a).toBeLessThanOrEqual(35)
    expect(res.r).toBeLessThanOrEqual(40)
  })

  it('tăng điểm lập luận khi có liên từ logic và luận điểm rõ ràng', () => {
    const text = 'Tôi nghĩ sinh viên không nên đi làm thêm quá nhiều vì sẽ dẫn đến sa sút việc học và mất cân bằng thời gian.'
    const res = scoreUserMessage(text, null)
    expect(res.a).toBeGreaterThanOrEqual(75)
    expect(res.r).toBeGreaterThanOrEqual(70)
  })

  it('trừ điểm lý lẽ đáng kể nếu bị bắt lỗi ngụy biện logic (Ad Hominem, Straw Man)', () => {
    const text = 'Ông ta nói sai vì nhìn mặt là thấy không đáng tin rồi!'
    const res = scoreUserMessage(text, 'AD_HOMINEM')
    expect(res.r).toBeLessThanOrEqual(45)

    const strawMan = scoreUserMessage('Bạn nói thế chẳng khác nào bảo sinh viên nghỉ học hết!', 'STRAW_MAN')
    expect(strawMan.r).toBeLessThanOrEqual(45)
  })

  it('trừ nặng điểm luận điểm nếu mắc bẫy thiên kiến tự mãn (Overconfidence Bias)', () => {
    const text = 'Chắc chắn 100% tôi luôn luôn đúng, quan điểm của tôi là chân lý tuyệt đối không cần bàn cãi!'
    const clean = scoreUserMessage(text, null)
    const biased = scoreUserMessage(text, 'OVERCONFIDENCE_BIAS')
    expect(biased.a).toBeLessThan(clean.a)
    expect(biased.a).toBeLessThanOrEqual(60)
  })

  it('trừ nặng điểm dẫn chứng nếu mắc bẫy thiên kiến xác nhận hoặc khái quát vội', () => {
    const text = 'Tôi thấy anh A bị trượt môn nên chắc chắn cả cái trường này dạy dở tệ!'
    const biased = scoreUserMessage(text, 'HASTY_GENERALIZATION')
    expect(biased.e).toBeLessThanOrEqual(30)
  })

  it('tăng mạnh điểm bằng chứng khi có số liệu và nguồn nghiên cứu', () => {
    const text = 'Theo khảo sát của trường năm 2024, có 68% sinh viên gặp khó khăn khi cân bằng giữa làm thêm và đồ án.'
    const res = scoreUserMessage(text, null)
    expect(res.e).toBeGreaterThanOrEqual(85)
  })
})

describe('computeArenaMetrics', () => {
  it('trả về hasData: false và mảng rỗng khi người dùng chưa có tin nhắn nào', () => {
    const convs: DbConversation[] = [
      { id: 'c1', topic: 'boc-phot', custom_topic: null, created_at: '2026-10-12T00:00:00Z' },
    ]
    const msgs: DbMessage[] = [
      { id: 1, conversation_id: 'c1', sender_type: 'BOT', content: 'Chào bạn', fallacy_code: null, created_at: '2026-10-12T00:00:01Z' },
    ]

    const result = computeArenaMetrics(convs, msgs)
    expect(result.hasData).toBe(false)
    expect(result.totalUserTurns).toBe(0)
    expect(result.metrics).toHaveLength(0)
    expect(result.badges).toHaveLength(0)
    expect(result.revokedBadges).toHaveLength(0)
  })

  it('tính toán chính xác chỉ số ARE và chỉ mở huy hiệu đã đạt', () => {
    const convs: DbConversation[] = [
      { id: 'c1', topic: 'boc-phot', custom_topic: null, created_at: '2026-10-12T00:00:00Z' },
    ]
    const msgs: DbMessage[] = [
      { id: 1, conversation_id: 'c1', sender_type: 'BOT', content: 'Chào bạn', fallacy_code: null, created_at: '2026-10-12T00:00:01Z' },
      {
        id: 2,
        conversation_id: 'c1',
        sender_type: 'USER',
        content: 'Tôi cho rằng bóc phốt là hành vi tiêu cực vì nó xâm phạm quyền riêng tư và thiếu bằng chứng xác thực.',
        fallacy_code: null,
        created_at: '2026-10-12T00:00:02Z',
      },
      {
        id: 3,
        conversation_id: 'c1',
        sender_type: 'USER',
        content: 'Theo thống kê có 75% trường hợp bóc phốt dẫn đến bạo lực mạng, do đó cần xử lý theo pháp luật thay vì giải quyết cảm tính.',
        fallacy_code: null,
        created_at: '2026-10-12T00:00:03Z',
      },
    ]

    const result = computeArenaMetrics(convs, msgs)
    expect(result.hasData).toBe(true)
    expect(result.totalUserTurns).toBe(2)
    expect(result.totalConversations).toBe(1)
    expect(result.metrics).toHaveLength(3)
    expect(result.averageScore).toBeGreaterThan(50)

    // Huy hiệu Ad Hominem được mở vì đã tranh luận chủ đề boc-phot và không mắc AD_HOMINEM
    const badgeIds = result.badges.map((b) => b.id)
    expect(badgeIds).toContain('ad-hominem')

    // Cái nào không có thì tuyệt đối không được hiện
    expect(badgeIds).not.toContain('sunk-cost')
    expect(badgeIds).not.toContain('confirmation-bias')
  })

  it('xếp rank theo chỉ số thực tế, không phong Bậc thầy khi điểm chỉ ở mức trung bình (khắc phục case 53% sức mạnh)', () => {
    const convs: DbConversation[] = [
      { id: 'c1', topic: 'boc-phot', custom_topic: null, created_at: '2026-10-12T00:00:00Z' },
    ]
    // Giả lập 30 tin nhắn ngắn/trung bình với điểm khoảng 50-55%
    const msgs: DbMessage[] = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      conversation_id: 'c1',
      sender_type: 'USER' as const,
      content: 'Tôi nghĩ quan điểm này cũng có lý nhưng chưa hẳn đã đúng.',
      fallacy_code: null,
      created_at: new Date(Date.now() + i * 1000).toISOString(),
    }))

    const result = computeArenaMetrics(convs, msgs)
    expect(result.totalUserTurns).toBe(30)
    expect(result.averageScore).toBeLessThan(70)
    // Hệ thống mới tuyệt đối KHÔNG phong Cấp 4 (Bậc thầy lập luận) chỉ vì count >= 30
    expect(result.rankTier).toBe('ACTIVE')
    expect(result.rankTitle).toBe('Người tranh biện tích cực · Cấp 2')
  })

  it('tụt rank và bị trừ điểm khi người dùng mắc ngụy biện ở các lượt gần đây', () => {
    const convs: DbConversation[] = [
      { id: 'c1', topic: 'boc-phot', custom_topic: null, created_at: '2026-10-12T00:00:00Z' },
    ]
    // 6 tin nhắn lập luận xuất sắc trước đó
    const goodMsgs: DbMessage[] = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      conversation_id: 'c1',
      sender_type: 'USER' as const,
      content: 'Theo báo cáo 2024, tôi khẳng định rằng việc này gây hại vì 80% sinh viên phản đối do thiếu minh bạch.',
      fallacy_code: null,
      created_at: new Date(Date.now() + i * 1000).toISOString(),
    }))

    const beforeFlaws = computeArenaMetrics(convs, goodMsgs)
    expect(beforeFlaws.rankTier).toBe('SHARP') // Cấp 3

    // Sau đó người dùng mắc liên tiếp 3 lỗi ngụy biện trong 5 tin gần nhất
    const flawedMsgs: DbMessage[] = [
      ...goodMsgs,
      {
        id: 7,
        conversation_id: 'c1',
        sender_type: 'USER',
        content: 'Bạn nói ngu như bò, nhìn mặt là biết phản động!',
        fallacy_code: 'AD_HOMINEM',
        created_at: new Date(Date.now() + 7000).toISOString(),
      },
      {
        id: 8,
        conversation_id: 'c1',
        sender_type: 'USER',
        content: 'Tôi lỡ đâm lao thì phải theo lao thôi, tiếc tiền bỏ sao được!',
        fallacy_code: 'SUNK_COST',
        created_at: new Date(Date.now() + 8000).toISOString(),
      },
      {
        id: 9,
        conversation_id: 'c1',
        sender_type: 'USER',
        content: 'Ai cũng tin như thế thì chắc chắn đúng rồi cãi gì nữa!',
        fallacy_code: 'BANDWAGON',
        created_at: new Date(Date.now() + 9000).toISOString(),
      },
    ]

    const afterFlaws = computeArenaMetrics(convs, flawedMsgs)
    expect(afterFlaws.recentFlawCount).toBe(3)
    expect(afterFlaws.penaltyPoints).toBeGreaterThanOrEqual(10)
    expect(afterFlaws.averageScore).toBeLessThan(beforeFlaws.averageScore)
    // TỤT RANK từ SHARP (Cấp 3) xuống ACTIVE (Cấp 2) hoặc NOVICE (Cấp 1)
    expect(afterFlaws.level).toBeLessThan(beforeFlaws.level)
  })

  it('thu hồi huy hiệu khi người dùng tái phạm lỗi ngụy biện ở các lượt gần đây', () => {
    const convs: DbConversation[] = [
      { id: 'c1', topic: 'boc-phot', custom_topic: null, created_at: '2026-10-12T00:00:00Z' },
    ]
    // Ban đầu người dùng lập luận tốt về boc-phot -> đạt huy hiệu ad-hominem
    const initialMsgs: DbMessage[] = [
      {
        id: 1,
        conversation_id: 'c1',
        sender_type: 'USER',
        content: 'Tôi cho rằng cần tập trung vào luận điểm và dữ liệu thay vì bôi nhọ cá nhân.',
        fallacy_code: null,
        created_at: new Date(Date.now() + 1000).toISOString(),
      },
      {
        id: 2,
        conversation_id: 'c1',
        sender_type: 'USER',
        content: 'Theo khảo sát 2024, 70% số người đồng ý với giải pháp này vì tính khả thi cao.',
        fallacy_code: null,
        created_at: new Date(Date.now() + 2000).toISOString(),
      },
    ]

    const qualifiedResult = computeArenaMetrics(convs, initialMsgs)
    expect(qualifiedResult.badges.some((b) => b.id === 'ad-hominem')).toBe(true)
    expect(qualifiedResult.revokedBadges).toHaveLength(0)

    // Sau đó người dùng phạm lỗi AD_HOMINEM ở lượt gần nhất
    const regressionMsgs: DbMessage[] = [
      ...initialMsgs,
      {
        id: 3,
        conversation_id: 'c1',
        sender_type: 'USER',
        content: 'Mấy người không có bằng cấp như bạn thì tư cách gì lên tiếng!',
        fallacy_code: 'AD_HOMINEM',
        created_at: new Date(Date.now() + 3000).toISOString(),
      },
    ]

    const revokedResult = computeArenaMetrics(convs, regressionMsgs)
    // Huy hiệu ad-hominem không còn trong badges đang mở
    expect(revokedResult.badges.some((b) => b.id === 'ad-hominem')).toBe(false)
    // Huy hiệu ad-hominem được đưa vào danh sách BỊ THU HỒI kèm lý do giải thích
    expect(revokedResult.revokedBadges.some((b) => b.id === 'ad-hominem')).toBe(true)
    const revoked = revokedResult.revokedBadges.find((b) => b.id === 'ad-hominem')
    expect(revoked?.revokedReason).toContain('Ad Hominem')

    // Khi người dùng chuộc lỗi: gửi thêm 5 tin nhắn sạch ngụy biện
    const redeemedMsgs: DbMessage[] = [
      ...regressionMsgs,
      ...Array.from({ length: 5 }, (_, i) => ({
        id: 4 + i,
        conversation_id: 'c1',
        sender_type: 'USER' as const,
        content: `Tôi xin đính chính luận điểm thứ ${i + 1} dựa trên tài liệu khoa học và số liệu thực tế.`,
        fallacy_code: null,
        created_at: new Date(Date.now() + (4 + i) * 1000).toISOString(),
      })),
    ]

    const restoredResult = computeArenaMetrics(convs, redeemedMsgs)
    // Huy hiệu ad-hominem được khôi phục trở lại danh sách badges
    expect(restoredResult.badges.some((b) => b.id === 'ad-hominem')).toBe(true)
    expect(restoredResult.revokedBadges.some((b) => b.id === 'ad-hominem')).toBe(false)
  })
})
