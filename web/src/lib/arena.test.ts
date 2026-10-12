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

  it('trừ điểm lý lẽ đáng kể nếu bị bắt lỗi ngụy biện', () => {
    const text = 'Ông ta nói sai vì nhìn mặt là thấy không đáng tin rồi!'
    const res = scoreUserMessage(text, 'AD_HOMINEM')
    expect(res.r).toBeLessThanOrEqual(45)
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

  it('không mở huy hiệu nếu người dùng mắc ngụy biện tương ứng', () => {
    const convs: DbConversation[] = [
      { id: 'c1', topic: 'boc-phot', custom_topic: null, created_at: '2026-10-12T00:00:00Z' },
    ]
    const msgs: DbMessage[] = [
      {
        id: 2,
        conversation_id: 'c1',
        sender_type: 'USER',
        content: 'Người đó xấu xa như vậy thì nói cái gì cũng sai!',
        fallacy_code: 'AD_HOMINEM',
        created_at: '2026-10-12T00:00:02Z',
      },
    ]

    const result = computeArenaMetrics(convs, msgs)
    expect(result.hasData).toBe(true)
    const badgeIds = result.badges.map((b) => b.id)
    expect(badgeIds).not.toContain('ad-hominem')
  })
})
