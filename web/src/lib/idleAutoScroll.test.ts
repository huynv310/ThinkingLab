import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IdleAutoScroller, easeInOutQuart, moveDuration, paginate, planBeats } from './idleAutoScroll'

const DWELL = 2500

function setup(beats = [800, 1600, 2400]) {
  let scroll = 0
  const states: boolean[] = []
  const scroller = new IdleAutoScroller({
    idleMs: 4000,
    dwellMs: DWELL,
    getScroll: () => scroll,
    getBeats: (from) => beats.filter((b) => b > from),
    scrollTo: (y) => { scroll = y },
    onActiveChange: (active) => states.push(active),
  })
  // Mô phỏng requestAnimationFrame ~60fps
  const play = (ms: number) => {
    for (let t = 0; t < ms; t += 16) scroller.tick(Math.min(16, ms - t))
  }
  const activate = () => {
    scroller.start()
    vi.advanceTimersByTime(4000)
  }
  return { scroller, states, play, activate, getScroll: () => scroll, setScroll: (y: number) => { scroll = y } }
}

describe('easing & thời lượng', () => {
  it('easeInOutQuart: chậm ở hai đầu, nhanh ở giữa', () => {
    expect(easeInOutQuart(0)).toBe(0)
    expect(easeInOutQuart(1)).toBe(1)
    expect(easeInOutQuart(0.5)).toBeCloseTo(0.5)
    expect(easeInOutQuart(0.1)).toBeLessThan(0.01) // khởi động êm
    expect(easeInOutQuart(0.55) - easeInOutQuart(0.45)).toBeGreaterThan(0.3) // tăng tốc mạnh ở giữa
  })

  it('quãng dài đi lâu hơn nhưng có giới hạn', () => {
    expect(moveDuration(100)).toBe(1000)
    expect(moveDuration(800)).toBeGreaterThan(moveDuration(400))
    expect(moveDuration(100_000)).toBe(2400)
  })
})

describe('planBeats', () => {
  it('đi qua mọi điểm dừng phía sau vị trí hiện tại, kết thúc ở cuối trang', () => {
    expect(planBeats(0, 3000, 1000, { stops: [0, 900, 1800] })).toEqual([900, 1800, 2400, 3000])
  })

  it('chia đều khoảng trống dài hơn maxGap', () => {
    expect(planBeats(0, 2400, 1000, { stops: [] })).toEqual([800, 1600, 2400])
  })

  it('không chia nhỏ trong đoạn pin cuộn ngang', () => {
    expect(planBeats(0, 3200, 1000, { stops: [500, 2000], pinned: [[500, 2000]] })).toEqual([500, 2000, 2600, 3200])
  })

  it('bỏ điểm quá sát hoặc nằm phía trước vị trí hiện tại', () => {
    expect(planBeats(1000, 1500, 1000, { stops: [200, 1010, 1300] })).toEqual([1300, 1500])
  })
})

describe('paginate', () => {
  it('mỗi bước đi xa nhất trong 1 trang', () => {
    expect(paginate([0, 762, 1216, 1670, 2124], 1344)).toEqual([0, 1216, 2124])
  })

  it('giữ nguyên khi các điểm cách nhau xa', () => {
    expect(paginate([0, 2000, 4000], 1000)).toEqual([0, 2000, 4000])
  })
})

describe('IdleAutoScroller', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('không chạy trước khi đủ 4 giây không tương tác', () => {
    const { scroller } = setup()
    scroller.start()
    vi.advanceTimersByTime(3999)
    expect(scroller.isActive).toBe(false)
  })

  it('kích hoạt sau 4 giây và lướt ngay tới beat đầu tiên có tăng/giảm tốc', () => {
    const { scroller, states, play, activate, getScroll } = setup()
    activate()
    expect(scroller.isActive).toBe(true)
    expect(states).toEqual([true])

    const duration = moveDuration(800)
    play(duration * 0.1)
    const early = getScroll()
    play(duration * 0.4)
    const mid = getScroll()
    expect(early).toBeLessThan(10) // khởi động êm
    expect(mid).toBeGreaterThan(300) // tăng tốc
    play(duration * 0.5 + 50)
    expect(getScroll()).toBeCloseTo(800) // tới đúng điểm dừng
  })

  it('dừng lại đọc dwellMs rồi mới sang beat kế', () => {
    const { play, activate, getScroll } = setup()
    activate()
    play(moveDuration(800) + 20)
    play(DWELL - 100)
    expect(getScroll()).toBeCloseTo(800)
    play(200 + moveDuration(800))
    expect(getScroll()).toBeCloseTo(1600)
  })

  it('đi hết các beat thì tự tắt', () => {
    const { scroller, play, activate, getScroll } = setup([500])
    activate()
    play(moveDuration(500) + DWELL + 100)
    expect(getScroll()).toBeCloseTo(500)
    expect(scroller.isActive).toBe(false)
  })

  it('không kích hoạt khi đã ở cuối trang', () => {
    const { scroller, activate, setScroll } = setup()
    setScroll(2400)
    activate()
    expect(scroller.isActive).toBe(false)
  })

  it('bắt đầu từ vị trí người xem đang đứng', () => {
    const { play, activate, setScroll, getScroll } = setup()
    setScroll(1000)
    activate()
    play(moveDuration(600) + 20)
    expect(getScroll()).toBeCloseTo(1600)
  })

  it('dừng NGAY khi có tương tác và đếm lại 4 giây từ đầu', () => {
    const { scroller, states, play, activate, getScroll } = setup()
    activate()
    play(300)
    scroller.notifyActivity()
    const stoppedAt = getScroll()
    play(1000)
    expect(getScroll()).toBe(stoppedAt)
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

  it('bỏ qua khung hình bị treo lâu (tab ẩn) để không nhảy cóc', () => {
    const { scroller, activate, getScroll } = setup()
    activate()
    scroller.tick(5000)
    expect(getScroll()).toBeLessThan(10)
  })

  it('stop() hủy hẹn giờ và tắt chế độ tự cuộn', () => {
    const { scroller } = setup()
    scroller.start()
    scroller.stop()
    vi.advanceTimersByTime(10_000)
    expect(scroller.isActive).toBe(false)
  })
})
