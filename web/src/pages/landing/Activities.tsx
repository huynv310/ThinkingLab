import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Compass, Mic, Scale, Search, ShieldAlert, Swords } from 'lucide-react'
import { useRef } from 'react'

gsap.registerPlugin(ScrollTrigger)

// 6 trọng tâm kiến thức then chốt của chương trình ThinkingLab
const KNOWLEDGE_PILLARS = [
  {
    icon: Scale,
    category: 'Nền tảng tư duy',
    title: 'Bản chất phản biện',
    text: 'Đánh giá năng lực đầu vào, phân định rõ ràng giữa Sự thật khách quan (Fact) và Ý kiến chủ quan (Opinion).',
    highlights: ['Fact vs. Opinion', 'Công thức SBI', 'Tách con người khỏi ý tưởng'],
    accent: 'cyan',
  },
  {
    icon: Compass,
    category: 'Gỡ bẫy nhận thức',
    title: 'Thiên kiến, Socrates & 5 Whys',
    text: 'Nhận diện 3 lối tắt tư duy sai lệch, thuần thục bộ câu hỏi Socrates và kỹ thuật 5 Whys để đào sâu gốc rễ vấn đề.',
    highlights: ['Thiên kiến xác nhận', 'Ảo giác chi phí chìm', 'Kỹ thuật 5 Whys'],
    accent: 'indigo',
  },
  {
    icon: Mic,
    category: 'Cấu trúc lập luận',
    title: 'Mô hình ARE & Cấu trúc PREP',
    text: 'Xây dựng luận điểm thép qua tam giác ARE (Assertion - Reasoning - Evidence) và kỹ thuật diễn đạt gãy gọn 90s.',
    highlights: ['Mô hình ARE chuẩn', 'Cấu trúc PREP 90 giây', 'Dẫn chứng có trọng lượng'],
    accent: 'emerald',
  },
  {
    icon: ShieldAlert,
    category: 'Vũ khí phòng thủ',
    title: '5 bẫy ngụy biện kinh điển',
    text: 'Vạch trần các chiêu trò đánh tráo khái niệm, công kích cá nhân, ngụy biện bù nhìn và phản bác một cách văn minh.',
    highlights: ['Ad Hominem', 'Bù nhìn (Straw Man)', 'Lập luận vòng quanh'],
    accent: 'rose',
  },
  {
    icon: Search,
    category: 'Thẩm định số',
    title: 'Đọc ngang & Tiêu chuẩn CRAAP',
    text: 'Bộ lọc 5 tiêu chí CRAAP để kiểm chứng nguồn tin, phân biệt tin giả học đường và nhận diện ảo giác của AI.',
    highlights: ['Tiêu chuẩn CRAAP', 'Thẩm định Fact-check', 'Phát hiện AI Hallucination'],
    accent: 'amber',
  },
  {
    icon: Swords,
    category: 'Thực chiến & Hội nhập',
    title: 'Thực chiến phản biện văn minh',
    text: 'Tranh biện bàn tròn trước các chủ đề gai góc, làm bài đánh giá đầu ra đo lường sự tiến bộ và cấp chứng nhận.',
    highlights: ['Tranh biện trực tiếp', 'Final-test năng lực', 'Cấp chứng chỉ hoàn thành'],
    accent: 'cyan',
  },
]

export function Activities() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set('.reveal', { y: 35, autoAlpha: 0 })
        ScrollTrigger.batch('.reveal', {
          start: 'top 88%',
          onEnter: (els) =>
            gsap.to(els, { y: 0, autoAlpha: 1, stagger: 0.07, duration: 0.7, ease: 'power3.out', overwrite: true }),
        })
      })
    },
    { scope: root },
  )

  return (
    <section data-tour-stop id="lo-trinh" ref={root} aria-labelledby="roadmap-title" className="relative px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="reveal max-w-3xl">
          <h2 id="roadmap-title" className="font-display text-4xl leading-tight font-extrabold sm:text-5xl text-white text-balance">
            6 buổi, luyện bằng <span className="text-cyan-400 text-glow-cyan">tình huống thật</span>
          </h2>
          <p className="mt-4 text-lg text-slate-300 text-pretty">
            Toàn bộ chương trình được đóng gói thành các học phần thực chiến, không lý thuyết suông.
          </p>
        </div>

        {/* BẮT BUỘC: #lo-trinh li chỉ được có 6 phần tử top-level, không dùng thẻ li lồng nhau */}
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {KNOWLEDGE_PILLARS.map(({ icon: Icon, category, title, text, highlights }) => (
            <li
              key={title}
              className="reveal story-glass flex flex-col justify-between rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-[0_0_35px_rgba(34,211,238,0.2)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                    <Icon size={22} aria-hidden />
                  </span>
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                    {category}
                  </span>
                </div>
                <h3 className="font-display mt-5 text-xl font-bold text-white">{title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{text}</p>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="flex flex-wrap gap-1.5" aria-label="Từ khóa kỹ năng">
                  {highlights.map((h) => (
                    <span
                      key={h}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
