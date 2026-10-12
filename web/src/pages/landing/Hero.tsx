import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ChevronsDown, Shield, Sparkles } from 'lucide-react'
import { useRef } from 'react'
import logo from '../../assets/logo.webp'
import { AuthButtons } from '../../components/AuthButtons'

gsap.registerPlugin(ScrollTrigger, SplitText)

// Màu đặc (không dùng text-gradient): SplitText tách chữ thành phần tử con nên background-clip mất tác dụng
const SLOGAN = [
  { text: 'Nghĩ sâu sắc', className: 'text-white drop-shadow-[0_4px_25px_rgba(255,255,255,0.2)]' },
  { text: 'Hỏi rõ ràng', className: 'text-cyan-400 drop-shadow-[0_4px_30px_rgba(34,211,238,0.45)]' },
  { text: 'Vững vàng lập luận', className: 'text-rose-400 drop-shadow-[0_4px_30px_rgba(251,113,133,0.35)]' },
]

const FACTS = ['6 buổi × 60 phút', '2 buổi trực tiếp · 4 buổi online']

export function Hero() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const split = SplitText.create('.hero-line', { type: 'words' })
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        tl.from('.hero-logo-container', { scale: 0.75, rotate: -8, autoAlpha: 0, duration: 0.7 })
          .from('.hero-eyebrow', { y: 20, autoAlpha: 0, duration: 0.5 }, '-=0.4')
          .from(split.words, { yPercent: 80, rotateX: -45, autoAlpha: 0, stagger: 0.05, duration: 0.7 }, '-=0.3')
          .from('.hero-fade', { y: 20, autoAlpha: 0, stagger: 0.09, duration: 0.6 }, '-=0.3')

        gsap.to('.hero-logo-glow', {
          scale: 1.15,
          opacity: 0.7,
          duration: 3,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
        gsap.to('.hero-logo-img', {
          y: -12,
          rotate: 2,
          duration: 3.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
        gsap.to('.hero-hint', { y: 6, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1 })

        // Rời hero: nội dung trôi lên và mờ dần
        gsap.to('.hero-content', {
          yPercent: -18,
          autoAlpha: 0.15,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })
        return () => split.revert()
      })
    },
    { scope: root },
  )

  return (
    <section
      data-tour-stop
      ref={root}
      className="relative grid min-h-dvh place-items-center px-4 pt-28 pb-16 overflow-hidden"
      aria-labelledby="hero-title"
    >
      <div className="hero-content relative z-10 mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.3fr_1fr]">
        <div>
          {/* Chapter Eyebrow Tag */}
          <div className="hero-eyebrow inline-flex items-center gap-2.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold tracking-widest text-cyan-300 uppercase backdrop-blur-md">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-cyan-400" />
            </span>
            Chương I // Sự Thức Tỉnh
          </div>

          {/* Slogan */}
          <h1
            id="hero-title"
            className="font-display mt-6 text-4xl leading-[1.08] font-extrabold tracking-tight sm:text-6xl xl:text-7xl [perspective:600px]"
          >
            {SLOGAN.map((s) => (
              <span key={s.text} className={`hero-line block pb-1 ${s.className}`}>
                {s.text}
              </span>
            ))}
          </h1>

          {/* Awakening Quote Box */}
          <blockquote className="hero-fade mt-7 max-w-xl rounded-2xl border-l-4 border-cyan-400/80 bg-white/[0.04] p-4 backdrop-blur-md sm:p-5">
            <p className="text-lg sm:text-xl font-medium leading-relaxed text-slate-200">
              Bạn đang tự tư duy, hay đang để người khác suy nghĩ thay mình?
            </p>
          </blockquote>

          {/* Auth CTA buttons */}
          <div className="hero-fade mt-8 flex flex-wrap items-center gap-4">
            <AuthButtons size="lg" />
            <a
              href="#phong-tap-thu"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 font-semibold text-white backdrop-blur-md transition-all hover:bg-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
            >
              <Sparkles size={18} className="text-cyan-400" aria-hidden />
              Thử thách phản biện
            </a>
          </div>

          {/* Facts list */}
          <ul
            className="hero-fade mt-8 flex flex-col gap-x-4 sm:flex-row sm:flex-wrap gap-y-2 text-sm font-medium text-slate-400"
            aria-label="Thông tin khóa học"
          >
            {FACTS.map((text, i) => (
              <li key={text} className="flex items-center gap-2.5">
                {i > 0 && <span className="hidden size-1 rounded-full bg-slate-600 sm:block" aria-hidden />}
                <span className="flex items-center gap-1.5">
                  <Shield size={14} className="text-cyan-400/80" aria-hidden />
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Visual Centerpiece: Illuminated Logic Core */}
        <div className="hero-logo-container relative mx-auto w-64 sm:w-80 lg:w-full lg:max-w-md" aria-hidden>
          {/* Multi-layered orbital aura rings */}
          <div className="hero-logo-glow absolute -inset-6 rounded-full bg-gradient-to-tr from-indigo-500/30 via-cyan-500/20 to-rose-500/25 blur-3xl" />
          <div className="absolute inset-4 rounded-full border border-cyan-400/20 animate-[spin_20s_linear_infinite]" />
          <div className="absolute inset-10 rounded-full border border-dashed border-indigo-400/25 animate-[spin_25s_linear_infinite_reverse]" />

          <div className="relative rounded-3xl border border-white/15 bg-slate-900/60 p-6 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.7)]">
            <img
              src={logo}
              alt=""
              width={512}
              height={512}
              className="hero-logo-img relative w-full drop-shadow-[0_20px_40px_rgba(34,211,238,0.35)]"
            />
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
              <span className="font-mono text-cyan-400">STATUS: CORE ACTIVE</span>
              <span className="font-mono">THINKINGLAB V2.0</span>
            </div>
          </div>
        </div>
      </div>

      <a
        href="#van-de"
        aria-label="Cuộn xuống"
        className="hero-hint absolute bottom-6 left-1/2 grid size-11 -translate-x-1/2 place-items-center rounded-full border border-white/15 bg-slate-900/60 text-slate-400 backdrop-blur-md transition-colors hover:border-cyan-400/50 hover:text-white"
      >
        <ChevronsDown size={22} aria-hidden />
      </a>
    </section>
  )
}
