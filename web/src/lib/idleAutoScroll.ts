/**
 * Inactivity Timer: sau `idleMs` không có tương tác thì tự cuộn từ từ xuống,
 * dừng ngay khi có tương tác. Không phụ thuộc DOM/Lenis để test được bằng fake timers;
 * phần gắn sự kiện + requestAnimationFrame nằm ở hook useIdleAutoScroll.
 */
export interface IdleAutoScrollerOptions {
  idleMs: number
  pxPerSecond: number
  getScroll: () => number
  getMaxScroll: () => number
  scrollTo: (y: number) => void
  onActiveChange?: (active: boolean) => void
}

// Khung hình dài hơn mức này (tab bị ẩn, máy lag) bị kẹp lại để không nhảy cóc.
const MAX_FRAME_MS = 100

export class IdleAutoScroller {
  private timer: ReturnType<typeof setTimeout> | null = null
  private active = false
  private running = false
  private position = 0
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
    const max = this.opts.getMaxScroll()
    // Giữ vị trí dạng số thực: cuộn ~1px/khung hình sẽ bị làm tròn mất nếu đọc lại scrollY.
    this.position += (this.opts.pxPerSecond * Math.min(deltaMs, MAX_FRAME_MS)) / 1000
    const next = Math.min(this.position, max)
    this.opts.scrollTo(next)
    if (next >= max) this.setActive(false)
  }

  private armTimer() {
    this.clearTimer()
    this.timer = setTimeout(() => {
      this.position = this.opts.getScroll()
      this.setActive(this.position < this.opts.getMaxScroll())
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
