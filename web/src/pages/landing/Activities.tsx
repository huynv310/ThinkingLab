import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Award, ClipboardCheck, Compass, Mic, Search, ShieldAlert, Swords, Target } from 'lucide-react'
import { useRef } from 'react'
import { GOALS } from '../../data/course'

gsap.registerPlugin(ScrollTrigger)

const ACTIVITIES = [
  {
    icon: ClipboardCheck,
    title: 'Pre-test 10 câu tình huống',
    text: 'Làm trên Google Form trước buổi 1 để có mốc dữ liệu gốc: Sự thật vs Ý kiến, kiểm chứng nguồn tin, bẫy ngụy biện, phản ứng khi bị phản biện.',
    span: 'lg:col-span-2',
  },
  {
    icon: Compass,
    title: 'Truy vấn Socrates 4 tầng + 5 Whys',
    text: 'Làm rõ khái niệm → kiểm tra giả định ngầm → tìm bằng chứng → phân tích hệ quả. Hỏi "Tại sao" 5 lần để chạm tới gốc rễ.',
    span: 'lg:row-span-2',
  },
  {
    icon: Mic,
    title: 'Nói gãy gọn với ARE & PREP',
    text: 'Trình bày quan điểm trong 60–90 giây: Luận điểm – Lý lẽ – Bằng chứng, rồi khẳng định lại.',
    span: '',
  },
  {
    icon: ShieldAlert,
    title: 'Gỡ 5 bẫy ngụy biện',
    text: 'Ad Hominem, Bù nhìn rơm, Dốc trượt, Lưỡng nan giả, Ngụy biện đám đông — kèm câu hóa giải lịch sự.',
    span: '',
  },
  {
    icon: Search,
    title: 'Đọc ngang + CRAAP Test',
    text: 'Mở tab mới để kiểm chứng chéo như chuyên gia, chấm nguồn theo 5 tiêu chí và bắt AI "ảo giác" phải lộ nguồn thật.',
    span: 'lg:col-span-2',
  },
  {
    icon: Swords,
    title: 'Bàn tròn thực chiến',
    text: '"Bóc phốt" trên mạng xã hội: dũng cảm hay bạo lực mạng? 2 nhóm, mỗi lượt 90 giây theo PREP, không công kích cá nhân.',
    span: 'lg:col-span-2',
  },
  {
    icon: Award,
    title: 'Final-test & vinh danh',
    text: 'Đo mức tiến bộ trước – sau, vinh danh 3 học viên tích cực nhất và cấp chứng chỉ số.',
    span: '',
  },
]

/** Hồi 3: các hoạt động thực hành của dự án. */
export function Activities() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set('.reveal', { y: 50, autoAlpha: 0 })
        ScrollTrigger.batch('.reveal', {
          start: 'top 88%',
          onEnter: (els) => gsap.to(els, { y: 0, autoAlpha: 1, stagger: 0.1, duration: 0.9, ease: 'expo.out', overwrite: true }),
        })
      })
    },
    { scope: root },
  )

  return (
    <section data-tour-stop id="hoat-dong" ref={root} aria-labelledby="act-title" className="px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="reveal max-w-2xl">
          <p className="font-semibold text-teal-deep">Hồi 3 · Thực hành</p>
          <h2 id="act-title" className="mt-3 text-4xl leading-tight font-extrabold sm:text-5xl">
            Không học thuộc lòng. <span className="text-gradient">Luyện bằng tình huống thật.</span>
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Mỗi buổi gắn với trải nghiệm của chính sinh viên: lời đồn về giảng viên, đồ án thức trắng, bài báo do AI gợi
            ý, tranh cãi trên hội nhóm.
          </p>
        </div>

        <ul className="mt-12 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIVITIES.map(({ icon: Icon, title, text, span }) => (
            <li key={title} className={`reveal glass group rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1 ${span}`}>
              <span className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <Icon size={24} aria-hidden />
              </span>
              <h3 className="mt-5 text-xl font-bold">{title}</h3>
              <p className="mt-2 text-ink-soft">{text}</p>
            </li>
          ))}
        </ul>

        <div className="reveal glass-strong mt-16 rounded-3xl p-7 sm:p-10">
          <div className="flex items-center gap-3">
            <Target className="text-flame-deep" size={28} aria-hidden />
            <h3 className="text-2xl font-bold">Mục tiêu đo lường được</h3>
          </div>
          <dl className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {GOALS.map((g) => (
              <div key={g.label}>
                <dt className="text-4xl font-extrabold tracking-tight text-brand">{g.value}</dt>
                <dd className="mt-2 text-ink-soft">{g.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
