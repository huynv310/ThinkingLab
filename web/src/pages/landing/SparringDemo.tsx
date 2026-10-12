import { CheckCircle2, Flame, HelpCircle, ShieldAlert, Sparkles } from 'lucide-react'
import { useState } from 'react'
import logo from '../../assets/logo.webp'
import { sound } from '../../lib/sound'

type ChoiceId = 'ad_hominem' | 'naive' | 'are'

interface Choice {
  id: ChoiceId
  label: string
  quote: string
  botReaction: {
    title: string
    badge: string
    feedback: string
    isSuccess: boolean
    tone: 'alert' | 'warning' | 'success'
  }
}

const CHOICES: Choice[] = [
  {
    id: 'ad_hominem',
    label: 'Phương án A',
    quote: '“Chỉ có mấy người giao tiếp kém, suốt ngày thu mình lại mới có suy nghĩ thiển cận như vậy!”',
    botReaction: {
      title: '⚠️ Ad Hominem detected!',
      badge: 'Ngụy biện Ad Hominem',
      feedback: 'Bạn đang tấn công cá nhân người nói thay vì giải quyết vấn đề rồi! Khi công kích tính cách hay hoàn cảnh đối phương, bạn đã tự làm yếu lập luận của chính mình.',
      isSuccess: false,
      tone: 'alert',
    },
  },
  {
    id: 'naive',
    label: 'Phương án B',
    quote: '“Sai bét, sếp nào hay sách báo nào cũng bảo kỹ năng mềm là quan trọng nhất mà!”',
    botReaction: {
      title: 'Hơi ngây thơ nha!',
      badge: 'Thiếu căn cứ thực chứng',
      feedback: 'Lý lẽ này dựa trên cảm tính nhiều quá, chưa thấy bằng chứng cụ thể đâu cả. "Ai cũng bảo" là bẫy ngụy biện đám đông hoặc viện dẫn thẩm quyền mơ hồ.',
      isSuccess: false,
      tone: 'warning',
    },
  },
  {
    id: 'are',
    label: 'Phương án C',
    quote: '“Chuyên môn là điều kiện cần, nhưng kỹ năng mềm là điều kiện đủ để tiến xa. Theo nghiên cứu của Đại học Harvard, 85% thành công trong công việc đến từ kỹ năng mềm, chỉ 15% đến từ kiến thức chuyên môn cứng...”',
    botReaction: {
      title: 'Ding! 👏 Xuất sắc!',
      badge: 'Chuẩn mô hình ARE',
      feedback: 'Lập luận ARE (Luận điểm - Lý lẽ - Dẫn chứng) chuẩn chỉ! Bạn có tố chất phản biện xuất sắc đó! Bạn tách bạch rõ ràng điều kiện cần/đủ và đưa ra số liệu kiểm chứng uy tín.',
      isSuccess: true,
      tone: 'success',
    },
  },
]

export function SparringDemo() {
  const [selected, setSelected] = useState<ChoiceId | null>(null)

  const handleSelect = (id: ChoiceId) => {
    setSelected(id)
    if (id === 'are') {
      sound.playChime()
    } else if (id === 'ad_hominem') {
      sound.playAlert()
    } else {
      sound.playPop()
    }
  }

  const activeChoice = CHOICES.find((c) => c.id === selected)

  return (
    <section
      data-tour-stop
      id="phong-tap-thu"
      aria-labelledby="sparring-demo-title"
      className="relative px-4 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 id="sparring-demo-title" className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
            Đấu trường phản biện: <span className="text-cyan-400 text-glow-cyan">Bạn sẽ đáp lại thế nào?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Chọn một trong ba phương án dưới đây
          </p>
        </div>

        {/* Thẻ tình huống tranh luận */}
        <div className="story-glass-strong mt-10 rounded-3xl p-6 sm:p-8 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-300">
            <span className="grid size-9 place-items-center rounded-xl border border-orange-500/30 bg-orange-500/20 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              <Flame size={20} aria-hidden />
            </span>
            <span>Tình huống thảo luận nhóm gây tranh cãi:</span>
          </div>
          <blockquote className="mt-4 border-l-4 border-orange-400 pl-4 text-xl font-bold leading-relaxed text-white sm:text-2xl">
            “Kỹ năng mềm (như giao tiếp, thuyết trình) là không cần thiết. Đi làm chỉ cần giỏi chuyên môn, làm được việc là chắc chắn sẽ thành công và được thăng tiến!”
          </blockquote>
        </div>

        {/* 3 Lựa chọn phản biện (tiêu đề trung tính, không tiết lộ trước đáp án) */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3" role="radiogroup" aria-label="Các phương án phản biện">
          {CHOICES.map((choice) => {
            const isSelected = selected === choice.id
            return (
              <button
                key={choice.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelect(choice.id)}
                className={`group relative flex min-h-[160px] flex-col justify-between rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-1 cursor-pointer backdrop-blur-xl ${
                  isSelected
                    ? 'border-2 border-cyan-400 bg-slate-900/90 ring-1 ring-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.25)]'
                    : 'story-glass border border-white/10 hover:border-cyan-400/40 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-bold text-slate-300 font-mono">
                      {choice.label}
                    </span>
                    <span
                      className={`grid size-6 place-items-center rounded-full border text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-400 text-slate-950 font-black shadow-[0_0_12px_rgba(34,211,238,0.6)]'
                          : 'border-white/20 text-transparent group-hover:border-cyan-400/60'
                      }`}
                    >
                      ✓
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed font-medium text-slate-200">
                    {choice.quote}
                  </p>
                </div>
                <span className="mt-3 block text-xs font-semibold text-cyan-400 group-hover:text-cyan-300">
                  {isSelected ? 'Đang phân tích phương án này ↓' : 'Bấm để kiểm tra phản hồi →'}
                </span>
              </button>
            )
          })}
        </div>

        {/* Khung phản hồi của Bot khi có lựa chọn */}
        {activeChoice && (
          <div
            className={`mt-6 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-300 ${
              activeChoice.botReaction.tone === 'success'
                ? 'bg-emerald-950/30 border-2 border-emerald-400/50 shadow-[0_0_40px_rgba(16,185,129,0.25)]'
                : activeChoice.botReaction.tone === 'alert'
                  ? 'bg-rose-950/30 border-2 border-rose-400/50 shadow-[0_0_40px_rgba(244,63,94,0.25)]'
                  : 'bg-amber-950/30 border-2 border-amber-400/50 shadow-[0_0_40px_rgba(245,158,11,0.25)]'
            }`}
            role="region"
            aria-live="polite"
          >
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full border border-white/20 bg-slate-900/80 p-1.5 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                <img src={logo} alt="" className="size-full object-contain" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-extrabold text-white sm:text-xl">
                    {activeChoice.botReaction.title}
                  </h3>
                  {activeChoice.botReaction.isSuccess ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                      <CheckCircle2 size={14} /> {activeChoice.botReaction.badge}
                    </span>
                  ) : activeChoice.botReaction.tone === 'alert' ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-300">
                      <ShieldAlert size={14} /> {activeChoice.botReaction.badge}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                      <HelpCircle size={14} /> {activeChoice.botReaction.badge}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-base leading-relaxed text-slate-200 sm:text-lg">
                  {activeChoice.botReaction.feedback}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lời kêu gọi hành động cho Hồi 3 */}
        <div className="story-glass mt-10 rounded-3xl p-6 text-center sm:p-8 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <p className="text-lg font-bold text-white sm:text-xl">
            Lý thuyết chỉ là bước khởi đầu. Nâng cấp tư duy phản biện của bạn ngay hôm nay!
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <a
              href="#lo-trinh"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 font-semibold text-slate-200 backdrop-blur-md transition-all hover:bg-white/10 hover:border-cyan-400/50 hover:text-white"
            >
              Xem lộ trình đào tạo
            </a>
            <a
              href="#dang-ky"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all hover:brightness-110 active:scale-95"
            >
              <Sparkles size={18} aria-hidden /> Đăng ký tham gia ngay
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
