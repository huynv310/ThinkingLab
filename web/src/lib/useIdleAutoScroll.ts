import type Lenis from 'lenis'
import { useEffect, useState } from 'react'
import { IdleAutoScroller, planBeats, type TourStops } from './idleAutoScroll'

const ACTIVITY_EVENTS = ['mousemove', 'wheel', 'touchstart', 'pointerdown', 'keydown'] as const

/**
 * Gắn chế độ trình chiếu vào trang: 4s không tương tác -> tự lướt qua từng slide.
 * `getStops` đọc vị trí các điểm dừng từ DOM tại thời điểm bắt đầu (layout có thể đã đổi).
 */
export function useIdleAutoScroll(lenis: Lenis | null, getStops: () => TourStops, { idleMs = 4000, dwellMs = 3000 } = {}) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!lenis) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const scroller = new IdleAutoScroller({
      idleMs,
      dwellMs,
      getScroll: () => lenis.scroll,
      // Mỗi bước tối đa 1 màn hình: các lần dừng nối tiếp nhau, không bỏ sót đoạn nào
      getBeats: (from) => planBeats(from, lenis.limit, window.innerHeight + 1, getStops()),
      scrollTo: (y) => lenis.scrollTo(y, { immediate: true, force: true }),
      onActiveChange: setActive,
    })

    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      scroller.tick(now - last)
      last = now
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onActivity = () => scroller.notifyActivity()
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    scroller.start()

    return () => {
      cancelAnimationFrame(raf)
      scroller.stop()
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [lenis, getStops, idleMs, dwellMs])

  return active
}
