import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Compass, MapPin, Mic, MonitorPlay, Scale, Search, ShieldAlert, Swords } from 'lucide-react'
import { useRef } from 'react'

gsap.registerPlugin(ScrollTrigger)

// Tóm tắt 6 buổi chính theo đề xuất dự án (chi tiết đầy đủ nằm trong Dashboard)
const ROADMAP = [
  { icon: Scale, format: 'Trực tiếp', title: 'Bản chất phản biện', text: 'Pre-test đầu vào, phân biệt Sự thật và Ý kiến.' },
  { icon: Compass, format: 'Online', title: 'Thiên kiến, Socrates & 5 Whys', text: 'Nhận diện 3 bẫy thiên kiến, hỏi đến tận gốc vấn đề.' },
  { icon: Mic, format: 'Online', title: 'ARE & PREP', text: 'Lập luận có căn cứ, trình bày gãy gọn trong 60–90 giây.' },
  { icon: ShieldAlert, format: 'Online', title: '5 bẫy ngụy biện', text: 'Phát hiện và phản bác ngụy biện một cách lịch sự.' },
  { icon: Search, format: 'Online', title: 'Đọc ngang & CRAAP', text: 'Kiểm chứng nguồn tin và phát hiện "ảo giác" của AI.' },
  { icon: Swords, format: 'Trực tiếp', title: 'Thực chiến & tổng kết', text: 'Tranh biện bàn tròn, Final-test và cấp chứng chỉ.' },
]

/** Lộ trình 6 buổi của khóa học. */
export function Activities() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set('.reveal', { y: 40, autoAlpha: 0 })
        ScrollTrigger.batch('.reveal', {
          start: 'top 88%',
          onEnter: (els) => gsap.to(els, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.8, ease: 'expo.out', overwrite: true }),
        })
      })
    },
    { scope: root },
  )

  return (
    <section data-tour-stop id="lo-trinh" ref={root} aria-labelledby="roadmap-title" className="px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="reveal max-w-3xl">
          <p className="font-semibold text-teal-deep">Lộ trình</p>
          <h2 id="roadmap-title" className="mt-3 text-4xl leading-tight font-extrabold text-balance sm:text-5xl">
            6 buổi, luyện bằng <span className="text-brand">tình huống thật</span>
          </h2>
        </div>

        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP.map(({ icon: Icon, format, title, text }, i) => (
            <li key={title} className="reveal glass rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-2xl bg-brand/10 text-brand">
                  <Icon size={22} aria-hidden />
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                  {format === 'Online' ? <MonitorPlay size={16} aria-hidden /> : <MapPin size={16} aria-hidden />}
                  {format}
                </span>
              </div>
              <p className="mt-5 text-sm font-bold tracking-widest text-teal-deep uppercase">Buổi {i + 1}</p>
              <h3 className="mt-1 text-xl font-bold">{title}</h3>
              <p className="mt-2 text-ink-soft">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
