/**
 * Chế độ trình chiếu khi người xem không tương tác: sau `idleMs` thì trang tự đi
 * qua từng "slide" (beat). Mỗi bước tăng tốc rồi hãm lại như một cú lăn chuột có quán tính,
 * dừng `dwellMs` để đọc, rồi sang beat kế. Có tương tác -> dừng ngay.
 * Không phụ thuộc DOM/Lenis để test được bằng fake timers; phần gắn sự kiện +
 * requestAnimationFrame nằm ở hook useIdleAutoScroll.
 */

/** Vị trí dừng mong muốn + các đoạn pin (cuộn ngang) không được chia nhỏ thêm. */
export interface TourStops {
  stops: number[]
  pinned?: [number, number][]
}

// Bước nhỏ hơn mức này coi như đã tới nơi, bỏ qua.
const MIN_STEP = 24

/** Tăng tốc mạnh rồi hãm mượt: cảm giác "lướt" có chủ đích như chuyển slide. */
export const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2)

/** Quãng ngắn đi nhanh, quãng dài lâu hơn một chút nhưng không lê thê. */
export const moveDuration = (distance: number) => Math.min(2400, Math.max(1000, 900 + Math.abs(distance) * 0.55))

/**
 * Lên lịch các beat sau vị trí `from`: đi qua mọi điểm dừng; khoảng trống dài hơn
 * `maxGap` (ví dụ section cao) được chia đều để không bỏ sót nội dung nào lúc dừng.
 */
export function planBeats(from: number, limit: number, maxGap: number, { stops, pinned = [] }: TourStops) {
  const sorted = [...stops, limit].map((y) => Math.min(Math.max(y, 0), limit)).sort((a, b) => a - b)
  const beats: number[] = []
  let cur = from
  for (const y of sorted) {
    if (y < cur + MIN_STEP) continue
    const inPin = pinned.some(([a, b]) => cur >= a - 1 && y <= b + 1)
    const parts = inPin ? 1 : Math.ceil((y - cur) / maxGap)
    for (let i = 1; i <= parts; i++) beats.push(cur + ((y - cur) * i) / parts)
    cur = y
  }
  return beats
}

/** Chọn điểm dừng theo "trang": mỗi bước đi xa nhất có thể nhưng không quá `page`. */
export function paginate(positions: number[], page: number) {
  const sorted = [...positions].sort((a, b) => a - b)
  if (!sorted.length) return []
  const out = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const cur = out[out.length - 1]
    const next = sorted[i + 1]
    // Giữ điểm i nếu điểm sau nó đã vượt quá 1 trang tính từ điểm dừng hiện tại
    if (next === undefined || next - cur > page) {
      if (sorted[i] - cur >= MIN_STEP) out.push(sorted[i])
    }
  }
  return out
}

export interface IdleAutoScrollerOptions {
  idleMs: number
  dwellMs: number
  getScroll: () => number
  /** Danh sách beat (đã sắp xếp tăng dần) tính từ vị trí hiện tại. */
  getBeats: (from: number) => number[]
  scrollTo: (y: number) => void
  onActiveChange?: (active: boolean) => void
}

// Khung hình dài hơn mức này (tab bị ẩn, máy lag) bị kẹp lại để không nhảy cóc.
const MAX_FRAME_MS = 100

type Phase =
  | { kind: 'move'; from: number; to: number; elapsed: number; duration: number }
  | { kind: 'dwell'; left: number }

export class IdleAutoScroller {
  private timer: ReturnType<typeof setTimeout> | null = null
  private active = false
  private running = false
  private position = 0
  private beats: number[] = []
  private phase: Phase = { kind: 'dwell', left: 0 }
  private readonly opts: IdleAutoScrollerOptions

  constructor(opts: IdleAutoScrollerOptions) {
    this.opts = opts
  }

  get isActive() {
    return this.active
  }

  start() {
    this.running = true
    this.armTimer()
  }

  stop() {
    this.running = false
    this.clearTimer()
    this.setActive(false)
  }

  notifyActivity() {
    if (!this.running) return
    this.setActive(false)
    this.armTimer()
  }

  /** Gọi mỗi khung hình với số ms đã trôi qua. */
  tick(deltaMs: number) {
    if (!this.active) return
    const dt = Math.min(deltaMs, MAX_FRAME_MS)
    const phase = this.phase

    if (phase.kind === 'move') {
      phase.elapsed += dt
      const p = Math.min(1, phase.elapsed / phase.duration)
      // Giữ vị trí dạng số thực: đọc lại scrollY sẽ bị làm tròn, gây giật.
      this.position = phase.from + (phase.to - phase.from) * easeInOutQuart(p)
      this.opts.scrollTo(this.position)
      if (p >= 1) this.phase = { kind: 'dwell', left: this.opts.dwellMs }
    } else {
      phase.left -= dt
      if (phase.left <= 0) this.advance()
    }
  }

  private advance() {
    const to = this.beats.shift()
    if (to === undefined) return this.setActive(false) // hết trang
    this.phase = { kind: 'move', from: this.position, to, elapsed: 0, duration: moveDuration(to - this.position) }
  }

  private armTimer() {
    this.clearTimer()
    this.timer = setTimeout(() => {
      this.position = this.opts.getScroll()
      this.beats = this.opts.getBeats(this.position).filter((y) => y > this.position)
      if (!this.beats.length) return
      this.setActive(true)
      this.advance() // 4 giây chờ đã là khoảng dừng của slide hiện tại
    }, this.opts.idleMs)
  }

  private clearTimer() {
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
  }

  private setActive(active: boolean) {
    if (this.active === active) return
    this.active = active
    this.opts.onActiveChange?.(active)
  }
}
