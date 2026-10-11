import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IdleAutoScroller } from './idleAutoScroll'

function setup(maxScroll = 10_000) {
  let scroll = 0
  const states: boolean[] = []
  const scroller = new IdleAutoScroller({
    idleMs: 4000,
    pxPerSecond: 100,
    getScroll: () => scroll,
    getMaxScroll: () => maxScroll,
    scrollTo: (y) => { scroll = y },
    onActiveChange: (active) => states.push(active),
  })
  // Mô phỏng requestAnimationFrame ~60fps
  const play = (ms: number) => {
    for (let t = 0; t < ms; t += 16) scroller.tick(Math.min(16, ms - t))
  }
  return { scroller, states, play, getScroll: () => scroll }
}

describe('IdleAutoScroller', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('không cuộn trước khi đủ 4 giây không tương tác', () => {
    const { scroller } = setup()
    scroller.start()
    vi.advanceTimersByTime(3999)
    expect(scroller.isActive).toBe(false)
  })

  it('kích hoạt sau 4 giây không tương tác', () => {
    const { scroller, states } = setup()
    scroller.start()
    vi.advanceTimersByTime(4000)
    expect(scroller.isActive).toBe(true)
    expect(states).toEqual([true])
  })

  it('cuộn từ từ theo thời gian thực (px/giây)', () => {
    const { scroller, play, getScroll } = setup()
    scroller.start()
    vi.advanceTimersByTime(4000)
    play(500)
    expect(getScroll()).toBeCloseTo(50)
  })

  it('dừng NGAY khi có tương tác và đếm lại 4 giây từ đầu', () => {
    const { scroller, states } = setup()
    scroller.start()
    vi.advanceTimersByTime(4000)
    scroller.notifyActivity()
    expect(scroller.isActive).toBe(false)
    expect(states).toEqual([true, false])

    vi.advanceTimersByTime(3999)
    expect(scroller.isActive).toBe(false)
    vi.advanceTimersByTime(1)
    expect(scroller.isActive).toBe(true)
  })

  it('tương tác liên tục thì không bao giờ tự cuộn', () => {
    const { scroller } = setup()
    scroller.start()
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(3000)
      scroller.notifyActivity()
    }
    expect(scroller.isActive).toBe(false)
  })

  it('tick khi chưa kích hoạt thì không cuộn', () => {
    const { scroller, getScroll } = setup()
    scroller.start()
    scroller.tick(1000)
    expect(getScroll()).toBe(0)
  })

  it('dừng ở cuối trang, không cuộn vượt quá', () => {
    const { scroller, play, getScroll } = setup(120)
    scroller.start()
    vi.advanceTimersByTime(4000)
    play(2000)
    expect(getScroll()).toBe(120)
    expect(scroller.isActive).toBe(false)
  })

  it('bỏ qua khung hình bị treo lâu (tab ẩn) để không nhảy cóc', () => {
    const { scroller, getScroll } = setup()
    scroller.start()
    vi.advanceTimersByTime(4000)
    scroller.tick(5000)
    expect(getScroll()).toBeLessThanOrEqual(10)
  })

  it('stop() hủy hẹn giờ và tắt chế độ tự cuộn', () => {
    const { scroller } = setup()
    scroller.start()
    scroller.stop()
    vi.advanceTimersByTime(10_000)
    expect(scroller.isActive).toBe(false)
  })
})
