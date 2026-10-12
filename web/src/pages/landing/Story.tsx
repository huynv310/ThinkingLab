import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight, TrendingUp } from 'lucide-react'
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
        gsap.fromTo(
          '.story-progress',
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${distance()}`, scrub: true },
          },
        )
        gsap.utils.toArray<HTMLElement>('.story-card').forEach((card) => {
          gsap.from(card, {
            y: 40,
            scale: 0.94,
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
      className="relative flex flex-col justify-center overflow-hidden py-24 lg:min-h-dvh lg:py-0"
    >
      <div
        ref={track}
        data-story-track
        className="flex flex-col gap-6 px-4 sm:px-8 lg:w-max lg:flex-row lg:items-stretch lg:gap-8 lg:px-[8vw]"
      >
        {/* Mở đầu */}
        <div className="flex shrink-0 flex-col justify-center lg:w-[42vw] xl:w-[38vw] lg:max-w-xl">
          <h2 id="story-title" className="font-display text-4xl leading-tight font-extrabold sm:text-5xl text-white text-balance">
            Sinh viên năm nhất đang <span className="text-rose-400 text-glow-rose">kẹt</span> <span className="whitespace-nowrap">ở đâu?</span>
          </h2>
          <p className="mt-4 text-lg text-slate-300 text-pretty">
            Khảo sát 33 sinh viên FPT chỉ ra rằng rào cản lớn nhất không nằm ở kỹ năng code hay học bài, mà ở bẫy tâm lý bầy đàn và nỗi sợ khi lên tiếng.
          </p>
          <p className="mt-6 hidden items-center gap-2 font-semibold text-cyan-400 lg:flex">
            Tiếp tục cuộn ngang để khám phá <ArrowRight size={18} aria-hidden />
          </p>
        </div>

        {/* Thống kê khảo sát 33 sinh viên */}
        {SURVEY_STATS.map((s) => (
          <article
            key={s.value + s.label}
            className="story-card story-glass flex shrink-0 flex-col justify-between rounded-3xl p-7 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] lg:h-[54vh] lg:w-[22vw] lg:min-w-72"
          >
            <div>
              <span className="font-mono text-xs font-bold tracking-wider text-cyan-400/80 uppercase">KHẢO SÁT 33 SV</span>
              <p className="font-display mt-4 text-5xl font-extrabold tracking-tight text-white lg:text-7xl">
                {s.value}
              </p>
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="text-base font-medium leading-snug text-slate-200 lg:text-lg">{s.label}</p>
            </div>
          </article>
        ))}


        {/* Kết luận số liệu */}
        <article className="story-card story-glass-strong border-cyan-500/40 flex shrink-0 flex-col justify-center rounded-3xl p-8 shadow-[0_0_50px_rgba(34,211,238,0.25)] lg:h-[54vh] lg:w-[28vw] lg:p-10">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-cyan-300 uppercase">
            <TrendingUp size={16} /> Nhu cầu cấp thiết
          </div>
          <p className="font-display mt-4 text-6xl font-extrabold text-cyan-400 text-glow-cyan lg:text-7xl">
            91,3%
          </p>
          <p className="mt-4 text-xl font-bold text-white">sẵn sàng tham gia khóa học để cải thiện kỹ năng.</p>
          <p className="mt-3 text-sm text-slate-300">
            Vì vậy chương trình được thiết kế tinh gọn: 6 buổi, mỗi buổi 60 phút, thực chiến ngay tại chỗ.
          </p>
        </article>

        <div className="hidden shrink-0 lg:block lg:w-[4vw]" aria-hidden />
      </div>

      <div className="absolute inset-x-[8vw] bottom-10 hidden h-1.5 overflow-hidden rounded-full bg-white/10 lg:block" aria-hidden>
        <div className="story-progress h-full origin-left rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-rose-500 shadow-[0_0_15px_rgba(56,189,248,0.8)]" />
      </div>
    </section>
  )
}
