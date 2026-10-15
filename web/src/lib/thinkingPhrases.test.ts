import { describe, expect, it } from 'vitest'
import { PLAYFUL_THINKING_PHRASES, getRandomThinkingPhrase } from './thinkingPhrases'

describe('thinkingPhrases', () => {
  it('danh sách câu suy nghĩ phải có ít nhất 10 câu tinh nghịch', () => {
    expect(PLAYFUL_THINKING_PHRASES.length).toBeGreaterThanOrEqual(10)
    for (const phrase of PLAYFUL_THINKING_PHRASES) {
      expect(typeof phrase).toBe('string')
      expect(phrase.trim().length).toBeGreaterThan(0)
    }
  })

  it('chứa các câu người dùng yêu cầu mẫu', () => {
    const text = PLAYFUL_THINKING_PHRASES.join(' ')
    expect(text).toContain('Để mình nghĩ nha')
    expect(text).toContain('Mình đang nghĩ đó')
    expect(text).toContain('Đợi tôi nghĩ đã')
  })

  it('getRandomThinkingPhrase trả về một câu hợp lệ trong danh sách', () => {
    const chosen = getRandomThinkingPhrase()
    expect(PLAYFUL_THINKING_PHRASES).toContain(chosen)
  })

  it('getRandomThinkingPhrase(exclude) tránh câu vừa hiển thị', () => {
    const current = PLAYFUL_THINKING_PHRASES[0]
    for (let i = 0; i < 30; i++) {
      const next = getRandomThinkingPhrase(current)
      expect(next).not.toBe(current)
      expect(PLAYFUL_THINKING_PHRASES).toContain(next)
    }
  })
})
