import type Lenis from 'lenis'
import { useEffect, useState } from 'react'
import { IdleAutoScroller } from './idleAutoScroll'

const ACTIVITY_EVENTS = ['mousemove', 'wheel', 'touchstart', 'pointerdown', 'keydown'] as const

/** Gắn IdleAutoScroller vào trang: 4s không tương tác -> tự cuộn chậm qua Lenis. */
export function useIdleAutoScroll(lenis: Lenis | null, { idleMs = 4000, pxPerSecond = 60 } = {}) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!lenis) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const scroller = new IdleAutoScroller({
      idleMs,
      pxPerSecond,
      getScroll: () => lenis.scroll,
      getMaxScroll: () => lenis.limit,
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
  }, [lenis, idleMs, pxPerSecond])

  return active
}
