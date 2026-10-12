import { Hand } from 'lucide-react'
import { useEffect } from 'react'
import { NeuralCanvas } from '../../components/NeuralCanvas'
import type { TourStops } from '../../lib/idleAutoScroll'
import { useIdleAutoScroll } from '../../lib/useIdleAutoScroll'
import { useLenis } from '../../lib/useLenis'
import { Activities } from './Activities'
import { FinalCta } from './FinalCta'
import { Hero } from './Hero'
import { Navbar } from './Navbar'
import { SparringDemo } from './SparringDemo'
import { Story, storyTourStops } from './Story'

/** Slide của chế độ trình chiếu: đầu mỗi section + các trang thẻ trong đoạn cuộn ngang. */
function getTourStops(): TourStops {
  const y = window.scrollY
  const sections = [...document.querySelectorAll<HTMLElement>('[data-tour-stop]')].map((el) => el.getBoundingClientRect().top + y)
  const story = storyTourStops()
  return { stops: [...sections, ...story.stops], pinned: story.pinned }
}

export default function Landing() {
  const lenis = useLenis()
  const autoScrolling = useIdleAutoScroll(lenis, getTourStops)

  // Link neo (#van-de...) cuộn mượt qua Lenis
  useEffect(() => {
    if (!lenis) return
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]')
      if (!a) return
      e.preventDefault()
      lenis.scrollTo(a.hash, { offset: -16 })
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [lenis])

  return (
    <div className="story-dark min-h-dvh text-slate-100 relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-white">
      <a href="#noi-dung" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900 font-semibold shadow-lg">
        Bỏ qua tới nội dung
      </a>
      {/* 2D Canvas Neural Nodes background with magnetic interactive cursor */}
      <NeuralCanvas />

      <Navbar />
      <main id="noi-dung">
        <Hero />
        <Story />
        <SparringDemo />
        <Activities />
        <FinalCta />
      </main>

      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-5 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-slate-950/90 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl whitespace-nowrap transition-all duration-300 ${
          autoScrolling ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        {autoScrolling && (
          <>
            <Hand size={18} className="text-cyan-400" aria-hidden /> Đang trình chiếu — chạm để dừng
          </>
        )}
      </div>
    </div>
  )
}
