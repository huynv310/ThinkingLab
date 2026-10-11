import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MapPin, MonitorPlay } from 'lucide-react'
import { useRef } from 'react'
import logo from '../../assets/logo.webp'
import { AuthButtons } from '../../components/AuthButtons'
import { COURSE_FACTS } from '../../data/course'

gsap.registerPlugin(ScrollTrigger)

/** Lời kêu gọi + footer. */
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
        <img src={logo} alt="" width={80} height={80} className="mx-auto" />
        <h2 id="cta-title" className="mx-auto mt-6 max-w-3xl text-4xl leading-tight font-extrabold sm:text-5xl">
          Sẵn sàng rèn góc nhìn sắc bén và <span className="text-flame-deep">dám lên tiếng</span>?
        </h2>
        <div className="mt-8 flex justify-center [&>div]:justify-center">
          <AuthButtons size="lg" />
        </div>
        <ul className="mx-auto mt-8 flex w-fit flex-col items-start gap-2 text-left text-sm text-ink-soft sm:flex-row sm:justify-center sm:gap-6">
          <li className="flex gap-2">
            <MapPin size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden /> {COURSE_FACTS.offline}
          </li>
          <li className="flex gap-2">
            <MonitorPlay size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden /> {COURSE_FACTS.online}
          </li>
        </ul>
      </div>

      <footer className="mx-auto mt-16 flex max-w-5xl flex-col items-center justify-between gap-2 border-t border-ink/10 pt-6 text-sm text-ink-soft sm:flex-row">
        <p>© 2026 ThinkingLab</p>
        <p>
          Phát triển bởi <span className="font-semibold text-ink">YuhnavStudio</span>
        </p>
      </footer>
    </section>
  )
}
