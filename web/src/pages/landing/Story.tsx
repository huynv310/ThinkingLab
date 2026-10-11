import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight } from 'lucide-react'
import { useRef } from 'react'
import { SURVEY_STATS } from '../../data/course'
import { paginate, type TourStops } from '../../lib/idleAutoScroll'

gsap.registerPlugin(ScrollTrigger)

const PIN_ID = 'story-pin'

/**
 * Điểm dừng cho chế độ trình chiếu trong đoạn pin (desktop): mỗi bước lật sang
 * "trang thẻ" kế, thẻ đầu trang nằm sát lề trái. Cuộn dọc khớp 1:1 với dịch ngang.
 */
export function storyTourStops(): TourStops {
  const st = ScrollTrigger.getById(PIN_ID)
  const track = document.querySelector<HTMLElement>('[data-story-track]')
  if (!st || !track) return { stops: [] }
  const distance = st.end - st.start
  const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0
  const offsets = [...track.children]
    .filter((c): c is HTMLElement => c instanceof HTMLElement && c.offsetWidth > 8)
    .map((c) => Math.min(Math.max(c.offsetLeft - track.offsetLeft - pad, 0), distance))
  const pages = paginate([0, ...offsets, distance], window.innerWidth * 0.7)
  return { stops: pages.map((x) => st.start + x), pinned: [[st.start, st.end]] }
}

/** Vấn đề (số liệu khảo sát) - pin màn hình, thẻ kính trôi ngang (desktop); xếp dọc (mobile). */
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
            id: PIN_ID,
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
      data-tour-stop
      aria-labelledby="story-title"
      className="relative flex flex-col justify-center overflow-hidden py-20 lg:min-h-dvh lg:py-0"
    >
      <div
        ref={track}
        data-story-track
        className="flex flex-col gap-5 px-4 sm:px-8 lg:w-max lg:flex-row lg:items-stretch lg:gap-8 lg:px-[8vw]"
      >
        {/* Mở đầu */}
        <div className="flex shrink-0 flex-col justify-center lg:w-[38vw]">
          <p className="font-semibold text-teal-deep">Khảo sát 33 sinh viên</p>
          <h2 id="story-title" className="mt-3 text-4xl leading-tight font-extrabold sm:text-5xl">
            Sinh viên năm nhất đang <span className="text-flame-deep">kẹt</span> ở đâu?
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Rào cản không chỉ là kiến thức, mà còn ở cách thẩm định thông tin, cách lập luận và nỗi sợ khi lên tiếng.
          </p>
          <p className="mt-6 hidden items-center gap-2 font-medium text-brand lg:flex">
            Tiếp tục cuộn <ArrowRight size={18} aria-hidden />
          </p>
        </div>

        {SURVEY_STATS.map((s) => (
          <article key={s.value + s.label} className="story-card glass flex shrink-0 flex-col justify-between rounded-3xl p-7 lg:h-[52vh] lg:w-[22vw] lg:min-w-72">
            <p className="text-5xl font-extrabold tracking-tight text-brand lg:text-7xl">{s.value}</p>
            <p className="mt-3 text-lg font-medium lg:mt-6">{s.label}</p>
          </article>
        ))}

        <article className="story-card glass-strong flex shrink-0 flex-col justify-center rounded-3xl p-7 lg:h-[52vh] lg:w-[28vw] lg:p-8">
          <p className="text-5xl font-extrabold text-flame-deep lg:text-6xl">91,3%</p>
          <p className="mt-4 text-xl font-semibold">sẵn sàng tham gia khóa học để cải thiện kỹ năng.</p>
          <p className="mt-4 text-ink-soft">Vì vậy khóa học được thiết kế tinh gọn: 6 buổi, mỗi buổi 60 phút.</p>
        </article>

        <div className="hidden shrink-0 lg:block lg:w-[4vw]" aria-hidden />
      </div>

      <div className="absolute inset-x-[8vw] bottom-10 hidden h-1.5 overflow-hidden rounded-full bg-white/60 lg:block" aria-hidden>
        <div className="story-progress h-full origin-left rounded-full bg-gradient-to-r from-brand via-teal to-amber" />
      </div>
    </section>
  )
}
