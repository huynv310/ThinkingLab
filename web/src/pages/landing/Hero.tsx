import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ChevronsDown } from 'lucide-react'
import { useRef } from 'react'
import logo from '../../assets/logo.webp'
import { AuthButtons } from '../../components/AuthButtons'
import { COURSE_FACTS } from '../../data/course'

gsap.registerPlugin(ScrollTrigger, SplitText)

// Màu đặc (không dùng text-gradient): SplitText tách chữ thành phần tử con nên background-clip mất tác dụng
const SLOGAN = [
  { text: 'Nghĩ sâu sắc', className: 'text-ink' },
  { text: 'Hỏi rõ ràng', className: 'text-brand' },
  { text: 'Vững vàng lập luận', className: 'text-flame-deep' },
]

const FACTS = [COURSE_FACTS.period, '6 buổi × 60 phút', '2 buổi trực tiếp · 4 buổi online']

export function Hero() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const split = SplitText.create('.hero-line', { type: 'words' })
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
        tl.from('.hero-logo', { scale: 0.6, rotate: -12, autoAlpha: 0, duration: 1.2 })
          .from('.hero-eyebrow', { y: 20, autoAlpha: 0, duration: 0.8 }, '-=0.9')
          .from(split.words, { yPercent: 90, rotateX: -60, autoAlpha: 0, stagger: 0.06, duration: 1 }, '-=0.6')
          .from('.hero-fade', { y: 24, autoAlpha: 0, stagger: 0.1, duration: 0.8 }, '-=0.6')

        gsap.to('.hero-logo', { y: -14, rotate: 3, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 })
        gsap.to('.hero-hint', { y: 8, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1 })

        // Rời hero: nội dung trôi lên và mờ dần
        gsap.to('.hero-content', {
          yPercent: -18,
          autoAlpha: 0.2,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        })
        return () => split.revert()
      })
    },
    { scope: root },
  )

  return (
    <section data-tour-stop ref={root} className="relative grid min-h-dvh place-items-center px-4 pt-24 pb-16" aria-labelledby="hero-title">
      <div className="hero-content mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="hero-eyebrow font-semibold text-teal-deep">Khóa học tư duy phản biện</p>
          <h1 id="hero-title" className="mt-4 text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl xl:text-6xl [perspective:600px]">
            {SLOGAN.map((s) => (
              <span key={s.text} className={`hero-line block pb-1 ${s.className}`}>
                {s.text}
              </span>
            ))}
          </h1>
          <p className="hero-fade mt-6 max-w-lg text-lg text-ink-soft">
            Phân biệt Sự thật và Ý kiến, nhận diện thiên kiến, ngụy biện và trình bày quan điểm có căn cứ.
          </p>
          <div className="hero-fade mt-8">
            <AuthButtons size="lg" />
          </div>
          <ul className="hero-fade mt-8 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-ink-soft" aria-label="Thông tin khóa học">
            {FACTS.map((text, i) => (
              <li key={text} className="flex items-center gap-3">
                {i > 0 && <span className="size-1 rounded-full bg-ink/30" aria-hidden />}
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-56 sm:w-72 lg:w-full lg:max-w-sm" aria-hidden>
          <div className="absolute inset-[8%] rounded-full bg-white/60 blur-2xl" />
          <img src={logo} alt="" width={512} height={512} className="hero-logo relative w-full drop-shadow-[0_30px_40px_rgb(31_59_176/0.25)]" />
        </div>
      </div>

      <a
        href="#van-de"
        aria-label="Cuộn xuống"
        className="hero-hint absolute bottom-6 left-1/2 grid size-11 -translate-x-1/2 place-items-center rounded-full text-ink-soft hover:text-ink"
      >
        <ChevronsDown size={22} aria-hidden />
      </a>
    </section>
  )
}
