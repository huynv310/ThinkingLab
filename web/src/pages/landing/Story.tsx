import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight, MapPin, MonitorPlay } from 'lucide-react'
import { useRef } from 'react'
import { COURSE_SESSIONS, SURVEY_STATS } from '../../data/course'

gsap.registerPlugin(ScrollTrigger)

const MAIN_SESSIONS = COURSE_SESSIONS.filter((s) => s.format !== 'Dự phòng')

/** Hồi 2: Vấn đề & câu chuyện - pin màn hình, thẻ kính trôi ngang (desktop); vuốt ngang (mobile). */
export function Story() {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const el = track.current!
        const distance = () => el.scrollWidth - window.innerWidth
        const tween = gsap.to(el, {
          x: () => -distance(),
          ease: 'none', // bắt buộc để vị trí ngang khớp 1:1 với cuộn dọc
          scrollTrigger: {
            trigger: root.current,
            pin: true,
            scrub: 1,
            start: 'top top',
            end: () => `+=${distance()}`,
            invalidateOnRefresh: true,
          },
        })
        gsap.fromTo('.story-progress', { scaleX: 0 }, {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${distance()}`, scrub: true },
        })
        gsap.utils.toArray<HTMLElement>('.story-card').forEach((card) => {
          gsap.from(card, {
            y: 60,
            rotate: 3,
            autoAlpha: 0.3,
            ease: 'power2.out',
            scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 95%', end: 'left 60%', scrub: true },
          })
        })
      })
      // Giảm chuyển động trên desktop: không pin, cho vuốt ngang như mobile
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: reduce)', () => {
        gsap.set(track.current, { width: '100%', overflowX: 'auto' })
        return () => gsap.set(track.current, { clearProps: 'width,overflowX' })
      })
    },
    { scope: root },
  )

  return (
    <section
      id="van-de"
      ref={root}
      aria-labelledby="story-title"
      className="relative flex min-h-dvh flex-col justify-center overflow-hidden py-24 lg:py-0"
    >
      <div
        ref={track}
        className="flex w-max items-stretch gap-5 px-4 sm:px-8 lg:gap-8 lg:px-[8vw] max-lg:w-full max-lg:snap-x max-lg:snap-mandatory max-lg:overflow-x-auto max-lg:pb-6"
      >
        {/* Mở đầu */}
        <div className="flex w-[85vw] shrink-0 snap-start flex-col justify-center sm:w-[60vw] lg:w-[38vw]">
          <p className="font-semibold text-teal-deep">Hồi 2 · Câu chuyện</p>
          <h2 id="story-title" className="mt-3 text-4xl leading-tight font-extrabold sm:text-5xl">
            Sinh viên năm nhất đang <span className="text-flame-deep">kẹt</span> ở đâu?
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Nhóm khảo sát 33 sinh viên. Rào cản không chỉ nằm ở kiến thức — mà ở thẩm định thông tin, cách lập luận và
            cả nỗi sợ khi lên tiếng.
          </p>
          <p className="mt-6 hidden items-center gap-2 font-medium text-brand lg:flex">
            Tiếp tục cuộn <ArrowRight size={18} aria-hidden />
          </p>
        </div>

        {SURVEY_STATS.map((s) => (
          <article key={s.value + s.label} className="story-card glass flex w-[75vw] shrink-0 snap-start flex-col justify-between rounded-3xl p-7 sm:w-80 lg:h-[52vh] lg:w-[22vw] lg:min-w-72">
            <p className="text-6xl font-extrabold tracking-tight text-brand lg:text-7xl">{s.value}</p>
            <p className="mt-6 text-lg font-medium">{s.label}</p>
          </article>
        ))}

        <article className="story-card glass-strong flex w-[80vw] shrink-0 snap-start flex-col justify-center rounded-3xl p-8 sm:w-96 lg:h-[52vh] lg:w-[28vw]">
          <p className="text-6xl font-extrabold text-flame-deep">91,3%</p>
          <p className="mt-4 text-xl font-semibold">sẵn sàng tham gia khóa học để cải thiện kỹ năng.</p>
          <p className="mt-4 text-ink-soft">
            Vì vậy ThinkingLab được thiết kế cấp tốc, linh hoạt và tinh gọn: 6 buổi, mỗi buổi 60 phút.
          </p>
        </article>

        {MAIN_SESSIONS.map((s) => (
          <article key={s.slug} className="story-card glass flex w-[75vw] shrink-0 snap-start flex-col rounded-3xl p-7 sm:w-80 lg:h-[52vh] lg:w-[24vw] lg:min-w-80">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold tracking-widest text-teal-deep uppercase">Buổi {s.no}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">
                {s.format === 'Online' ? <MonitorPlay size={14} aria-hidden /> : <MapPin size={14} aria-hidden />}
                {s.format}
              </span>
            </div>
            <h3 className="mt-4 text-2xl leading-snug font-bold">{s.title}</h3>
            <p className="mt-auto pt-6 text-ink-soft">{s.goals[0]}</p>
          </article>
        ))}
        <div className="w-1 shrink-0 lg:w-[4vw]" aria-hidden />
      </div>

      <div className="absolute inset-x-[8vw] bottom-10 hidden h-1.5 overflow-hidden rounded-full bg-white/60 lg:block" aria-hidden>
        <div className="story-progress h-full origin-left rounded-full bg-gradient-to-r from-brand via-teal to-amber" />
      </div>
    </section>
  )
}
