import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { useEffect, useState } from 'react'

gsap.registerPlugin(ScrollTrigger)

/** Lenis cuộn mượt + đồng bộ với GSAP ScrollTrigger. Chỉ dùng trên landing page. */
export function useLenis() {
  const [lenis, setLenis] = useState<Lenis | null>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const instance = new Lenis({ lerp: reduce ? 1 : 0.1, smoothWheel: !reduce })
    instance.on('scroll', ScrollTrigger.update)
    const raf = (time: number) => instance.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    setLenis(instance)

    return () => {
      gsap.ticker.remove(raf)
      instance.destroy()
      setLenis(null)
    }
  }, [])

  return lenis
}
