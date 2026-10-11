import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { CalendarDays, Clock, ChevronsDown, Users } from 'lucide-react'
import { useRef } from 'react'
import logo from '../../assets/logo.webp'
import { AuthButtons } from '../../components/AuthButtons'
import { COURSE_FACTS } from '../../data/course'

gsap.registerPlugin(ScrollTrigger, SplitText)

const SLOGAN = [
  { text: 'Nghĩ sâu sắc', className: 'text-ink' },
  { text: 'Hỏi rõ ràng', className: 'text-gradient' },
  { text: 'Vững vàng lập luận', className: 'text-flame-deep' },
]

const CHIPS = [
  { icon: CalendarDays, text: COURSE_FACTS.period },
  { icon: Clock, text: '6 buổi · 60 phút/buổi' },
  { icon: Users, text: '2 trực tiếp · 4 online' },
]

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

        // Rời Hồi 1: nội dung trôi lên và mờ dần
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
    <section ref={root} className="relative grid min-h-dvh place-items-center px-4 pt-24 pb-16" aria-labelledby="hero-title">
      <div className="hero-content mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="hero-eyebrow glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-teal-deep">
            <span className="size-2 rounded-full bg-teal" aria-hidden />
            ThinkingLab · Nhóm 3 · SSA101
          </p>
          <h1 id="hero-title" className="mt-6 text-5xl leading-[1.08] font-extrabold tracking-tight sm:text-6xl lg:text-7xl [perspective:600px]">
            {SLOGAN.map((s) => (
              <span key={s.text} className={`hero-line block pb-1 ${s.className}`}>
                {s.text}
              </span>
            ))}
          </h1>
          <p className="hero-fade mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">
            Khóa học nâng cao kỹ năng sử dụng tư duy phản biện — từ phân biệt Sự thật & Ý kiến, nhận diện thiên kiến và
            ngụy biện, đến đặt câu hỏi Socrates và lập luận vững vàng.
          </p>
          <div className="hero-fade mt-8">
            <AuthButtons size="lg" />
          </div>
          <ul className="hero-fade mt-8 flex flex-wrap gap-2" aria-label="Thông tin khóa học">
            {CHIPS.map(({ icon: Icon, text }) => (
              <li key={text} className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
                <Icon size={16} className="text-brand" aria-hidden /> {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-64 sm:w-80 lg:w-full lg:max-w-md" aria-hidden>
          <div className="absolute inset-[8%] rounded-full bg-white/60 blur-2xl" />
          <img src={logo} alt="" width={512} height={512} className="hero-logo relative w-full drop-shadow-[0_30px_40px_rgb(31_59_176/0.25)]" />
        </div>
      </div>

      <a
        href="#van-de"
        className="hero-hint absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 rounded-2xl p-2 text-sm font-medium text-ink-soft"
      >
        <ChevronsDown size={22} aria-hidden />
        Cuộn xuống để khám phá
      </a>
    </section>
  )
}
