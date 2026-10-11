import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MapPin, MonitorPlay } from 'lucide-react'
import { useRef } from 'react'
import logo from '../../assets/logo.webp'
import { AuthButtons } from '../../components/AuthButtons'
import { COURSE_FACTS, TEAM } from '../../data/course'

gsap.registerPlugin(ScrollTrigger)

/** Hồi 4: lời kêu gọi + footer. */
export function FinalCta() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.cta-panel', {
          scale: 0.92,
          y: 60,
          autoAlpha: 0,
          ease: 'expo.out',
          duration: 1.2,
          scrollTrigger: { trigger: '.cta-panel', start: 'top 85%' },
        })
      })
    },
    { scope: root },
  )

  return (
    <section data-tour-stop id="dang-ky" ref={root} aria-labelledby="cta-title" className="px-4 pt-12 pb-10">
      <div className="cta-panel glass-strong relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] px-6 py-14 text-center sm:px-12 sm:py-20">
        <img src={logo} alt="" width={96} height={96} className="mx-auto" />
        <p className="mt-6 font-semibold text-teal-deep">Hồi 4 · Bắt đầu</p>
        <h2 id="cta-title" className="mx-auto mt-3 max-w-3xl text-4xl leading-tight font-extrabold sm:text-5xl">
          Sẵn sàng rèn góc nhìn sắc bén và <span className="text-flame-deep">dám lên tiếng</span>?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-soft">
          Một không gian để cùng vượt qua thiên vị tư duy, tranh luận logic và phản biện văn minh — tách rời ý tưởng
          khỏi con người.
        </p>
        <div className="mt-8 flex justify-center">
          <AuthButtons size="lg" />
        </div>
        <ul className="mt-10 flex flex-wrap justify-center gap-3 text-sm font-medium">
          <li className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2">
            <MapPin size={16} className="text-brand" aria-hidden /> {COURSE_FACTS.offline}
          </li>
          <li className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2">
            <MonitorPlay size={16} className="text-brand" aria-hidden /> {COURSE_FACTS.online}
          </li>
        </ul>
      </div>

      <footer className="mx-auto mt-16 max-w-5xl border-t border-ink/10 pt-8 text-sm text-ink-soft">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-bold text-ink">ThinkingLab · Nhóm 3</p>
            <p className="mt-1">{COURSE_FACTS.subject}</p>
          </div>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-3" aria-label="Thành viên nhóm">
            {TEAM.map((m) => (
              <li key={m.name}>
                <span className="text-ink">{m.name}</span>
                {m.role !== 'Thành viên' && <span className="text-teal-deep"> · {m.role}</span>}
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </section>
  )
}
