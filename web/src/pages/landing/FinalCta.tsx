import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MapPin, MonitorPlay } from 'lucide-react'
import { useRef } from 'react'
import logo from '../../assets/logo.webp'
import { AuthButtons } from '../../components/AuthButtons'
import { COURSE_FACTS } from '../../data/course'

gsap.registerPlugin(ScrollTrigger)

/** Lời kêu gọi hành động cuối trang + Footer bản quyền theo phong cách One Page Love. */
export function FinalCta() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.cta-panel', {
          scale: 0.95,
          y: 40,
          autoAlpha: 0,
          ease: 'power3.out',
          duration: 0.8,
          scrollTrigger: { trigger: '.cta-panel', start: 'top 85%' },
        })
      })
    },
    { scope: root },
  )

  return (
    <section data-tour-stop id="dang-ky" ref={root} aria-labelledby="cta-title" className="relative px-4 pt-16 pb-12 overflow-hidden">
      {/* Background portal glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-gradient-to-tr from-cyan-500/20 via-indigo-500/15 to-rose-500/20 blur-3xl" aria-hidden />

      <div className="cta-panel story-glass-strong relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] border border-white/15 px-6 py-14 text-center sm:px-12 sm:py-20 shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
        <div className="relative mx-auto size-20">
          <div className="absolute -inset-2 rounded-full bg-cyan-400/30 blur-lg animate-pulse" />
          <img src={logo} alt="" width={80} height={80} className="relative mx-auto size-20 object-contain drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]" />
        </div>

        <h2 id="cta-title" className="font-display mx-auto mt-6 max-w-3xl text-3xl leading-tight font-extrabold sm:text-5xl text-white text-balance">
          Sẵn sàng nâng cấp góc nhìn <span className="whitespace-nowrap">sắc bén</span> và <span className="text-rose-400 text-glow-rose">dám lên tiếng</span>?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-300 sm:text-lg text-pretty">
          Trải nghiệm môi trường rèn luyện phản biện văn minh, khách quan và giàu tính ứng dụng thực tiễn.
        </p>

        {/* Cụm nút Đăng ký & Đăng nhập trực tiếp */}
        <div className="mt-8 flex justify-center [&>div]:justify-center">
          <AuthButtons size="lg" />
        </div>

        <ul className="mx-auto mt-8 flex w-fit flex-col items-start gap-3 text-left text-sm text-slate-300 sm:flex-row sm:justify-center sm:gap-6">
          <li className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
            <MapPin size={16} className="shrink-0 text-cyan-400" aria-hidden /> {COURSE_FACTS.offline}
          </li>
          <li className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
            <MonitorPlay size={16} className="shrink-0 text-cyan-400" aria-hidden /> {COURSE_FACTS.online}
          </li>
        </ul>
      </div>

      <footer className="mx-auto mt-16 flex max-w-5xl flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 text-sm text-slate-400 sm:flex-row">
        <p>© 2026 ThinkingLab</p>
        <p>
          Phát triển bởi <span className="font-semibold text-white">YuhnavStudio</span>
        </p>
      </footer>
    </section>
  )
}
