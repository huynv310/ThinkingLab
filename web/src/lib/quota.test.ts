import { describe, expect, it } from 'vitest'
import { quotaStatus } from './quota'

describe('quotaStatus', () => {
  it('còn nguyên hạn mức', () => {
    expect(quotaStatus(0, 30_000)).toMatchObject({ left: 30_000, percentLeft: 100, turnsLeft: 35, level: 'ok' })
  })

  it('đổi mức cảnh báo theo phần còn lại', () => {
    expect(quotaStatus(15_000, 30_000).level).toBe('ok') // còn đúng 50%
    expect(quotaStatus(15_001, 30_000).level).toBe('low')
    expect(quotaStatus(24_001, 30_000).level).toBe('critical')
    expect(quotaStatus(30_000, 30_000).level).toBe('empty')
  })

  it('làm tròn xuống: gần hết thì hiện 0% chứ không phải 1%', () => {
    expect(quotaStatus(149_990, 150_000).percentLeft).toBe(0)
    expect(quotaStatus(149_990, 150_000).level).toBe('critical')
  })

  it('kẹp số liệu vượt hạn mức hoặc âm', () => {
    expect(quotaStatus(40_000, 30_000)).toMatchObject({ used: 30_000, left: 0, remaining: 0, turnsLeft: 0 })
    expect(quotaStatus(-5, 30_000)).toMatchObject({ used: 0, left: 30_000 })
  })
})
