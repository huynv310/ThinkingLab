import { Award, ShieldCheck, Sparkles, Trophy, Zap } from 'lucide-react'

interface SkillMetric {
  name: string
  code: 'A' | 'R' | 'E'
  label: string
  score: number
  gradient: string
}

const METRICS: SkillMetric[] = [
  { name: 'Assertion', code: 'A', label: 'Luận điểm trực diện', score: 92, gradient: 'from-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(34,211,238,0.5)]' },
  { name: 'Reasoning', code: 'R', label: 'Lý lẽ đa chiều', score: 85, gradient: 'from-indigo-400 to-cyan-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]' },
  { name: 'Evidence', code: 'E', label: 'Dẫn chứng có căn cứ', score: 80, gradient: 'from-amber-400 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]' },
]

const BADGES = [
  { id: 'ad-hominem', title: 'Khắc tinh Ad Hominem', desc: 'Bẻ gãy 5 lần công kích cá nhân', icon: ShieldCheck, unlocked: true },
  { id: 'sunk-cost', title: 'Thợ săn Chi phí chìm', desc: 'Dừng kịp thời phương án ngõ cụt', icon: Zap, unlocked: true },
  { id: 'confirmation', title: 'Vượt bẫy Thiên kiến', desc: 'Tìm bằng chứng phản biện quan điểm cá nhân', icon: Award, unlocked: false },
]

export function ArenaGamification() {
  const averageScore = Math.round(METRICS.reduce((acc, m) => acc + m.score, 0) / METRICS.length)

  return (
    <div className="story-glass-strong border border-white/10 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" aria-label="Chỉ số phản biện Arena">
      {/* Header cấp độ */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
            <Trophy size={22} aria-hidden />
          </span>
          <div>
            <h3 className="font-extrabold text-white">Chỉ số phản biện ARE</h3>
            <p className="text-xs text-slate-400">Hạng: Nhà phản biện sắc bén · Cấp 3</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
          <Sparkles size={14} /> {averageScore}% Sức mạnh
        </span>
      </div>

      {/* Thanh đo năng lực ARE */}
      <div className="mt-4 space-y-3">
        {METRICS.map((m) => (
          <div key={m.code}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-200">
                <span className="grid size-5 place-items-center rounded border border-white/10 bg-white/5 text-xs font-black text-cyan-400">{m.code}</span>
                {m.label}
              </span>
              <span className="tabular-nums text-slate-400 font-mono">{m.score}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${m.gradient} transition-all duration-500`}
                style={{ width: `${m.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Huy hiệu Fallacy Slayer */}
      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">Huy hiệu phòng thủ ngụy biện</p>
        <div className="mt-2.5 grid grid-cols-3 gap-2.5">
          {BADGES.map((b) => {
            const Icon = b.icon
            return (
              <div
                key={b.id}
                title={b.desc}
                className={`flex flex-col items-center rounded-2xl p-2.5 text-center transition-transform hover:scale-105 ${
                  b.unlocked
                    ? 'story-glass border border-cyan-500/30 bg-slate-900/60 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                    : 'border border-white/5 bg-white/[0.02] opacity-40'
                }`}
              >
                <span className={`grid size-8 place-items-center rounded-xl ${b.unlocked ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-500'}`}>
                  <Icon size={16} aria-hidden />
                </span>
                <span className="mt-1.5 line-clamp-1 text-xs font-bold text-slate-200">{b.title}</span>
                {b.unlocked && <span className="text-xs font-semibold text-emerald-400">Đã mở</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
