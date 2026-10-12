import { Award, ShieldCheck, Sparkles, Trophy, Zap } from 'lucide-react'

interface SkillMetric {
  name: string
  code: 'A' | 'R' | 'E'
  label: string
  score: number
  color: string
}

const METRICS: SkillMetric[] = [
  { name: 'Assertion', code: 'A', label: 'Luận điểm trực diện', score: 92, color: 'bg-brand' },
  { name: 'Reasoning', code: 'R', label: 'Lý lẽ đa chiều', score: 85, color: 'bg-teal' },
  { name: 'Evidence', code: 'E', label: 'Dẫn chứng có căn cứ', score: 80, color: 'bg-amber' },
]

const BADGES = [
  { id: 'ad-hominem', title: 'Khắc tinh Ad Hominem', desc: 'Bẻ gãy 5 lần công kích cá nhân', icon: ShieldCheck, unlocked: true },
  { id: 'sunk-cost', title: 'Thợ săn Chi phí chìm', desc: 'Dừng kịp thời phương án ngõ cụt', icon: Zap, unlocked: true },
  { id: 'confirmation', title: 'Vượt bẫy Thiên kiến', desc: 'Tìm bằng chứng phản biện quan điểm cá nhân', icon: Award, unlocked: false },
]

export function ArenaGamification() {
  const averageScore = Math.round(METRICS.reduce((acc, m) => acc + m.score, 0) / METRICS.length)

  return (
    <div className="glass rounded-3xl p-5 sm:p-6" aria-label="Chỉ số phản biện Arena">
      {/* Header cấp độ */}
      <div className="flex items-center justify-between border-b border-ink/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Trophy size={22} aria-hidden />
          </span>
          <div>
            <h3 className="font-extrabold text-ink">Chỉ số phản biện ARE</h3>
            <p className="text-xs text-ink-soft">Hạng: Nhà phản biện sắc bén · Cấp 3</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
          <Sparkles size={14} /> {averageScore}% Sức mạnh
        </span>
      </div>

      {/* Thanh đo năng lực ARE */}
      <div className="mt-4 space-y-3">
        {METRICS.map((m) => (
          <div key={m.code}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-ink">
                <span className="grid size-5 place-items-center rounded bg-ink/10 text-xs font-black">{m.code}</span>
                {m.label}
              </span>
              <span className="tabular-nums text-ink-soft">{m.score}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/10">
              <div
                className={`h-full rounded-full ${m.color} transition-all duration-500`}
                style={{ width: `${m.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Huy hiệu Fallacy Slayer */}
      <div className="mt-5 border-t border-ink/10 pt-4">
        <p className="text-xs font-bold tracking-wider text-ink-soft uppercase">Huy hiệu phòng thủ ngụy biện</p>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {BADGES.map((b) => {
            const Icon = b.icon
            return (
              <div
                key={b.id}
                title={b.desc}
                className={`flex flex-col items-center rounded-2xl p-2.5 text-center transition-transform hover:scale-105 ${
                  b.unlocked ? 'bg-white/80 shadow-sm border border-brand/20' : 'bg-ink/5 opacity-40'
                }`}
              >
                <span className={`grid size-8 place-items-center rounded-xl ${b.unlocked ? 'bg-brand/10 text-brand' : 'bg-ink/10 text-ink-soft'}`}>
                  <Icon size={16} aria-hidden />
                </span>
                <span className="mt-1.5 line-clamp-1 text-xs font-bold text-ink">{b.title}</span>
                {b.unlocked && <span className="text-xs font-medium text-emerald-700">Đã mở</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
