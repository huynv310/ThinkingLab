import { MessageSquareText, RotateCw, Sparkles, Trophy, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUserArenaData, type ArenaMetricsResult, type UnlockedBadge } from '../lib/arena'

export function ArenaGamification() {
  const [data, setData] = useState<ArenaMetricsResult | null>(null)
  const [selectedBadge, setSelectedBadge] = useState<UnlockedBadge | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchUserArenaData()
      setData(res)
    } catch (err) {
      console.error('Không thể tải dữ liệu chỉ số phản biện:', err)
      setError('Không thể tải dữ liệu lịch sử phản biện')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 1. Trạng thái đang tải dữ liệu từ Supabase
  if (loading) {
    return (
      <div className="story-glass-strong border border-white/10 rounded-3xl p-6 animate-pulse" aria-label="Đang tải chỉ số phản biện">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-white/10" />
            <div className="space-y-2">
              <div className="h-4 w-36 rounded bg-white/10" />
              <div className="h-3 w-48 rounded bg-white/5" />
            </div>
          </div>
          <div className="h-6 w-24 rounded-full bg-white/10" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-full rounded bg-white/5" />
        </div>
      </div>
    )
  }

  // 2. Trạng thái lỗi mạng / Supabase
  if (error || !data) {
    return (
      <div className="story-glass-strong border border-rose-500/20 rounded-3xl p-5 sm:p-6 text-slate-300">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-rose-400">{error || 'Chưa tải được dữ liệu'}</p>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 cursor-pointer"
          >
            <RotateCw size={14} /> Thử lại
          </button>
        </div>
      </div>
    )
  }

  // 3. Trạng thái người dùng chưa có tin nhắn nào: "Cái nào không có không được hiện"
  // Tuyệt đối không sinh điểm phần trăm hoặc huy hiệu ảo
  if (!data.hasData) {
    return (
      <div className="story-glass-strong border border-white/10 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" aria-label="Chỉ số phản biện Arena">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
              <Trophy size={22} aria-hidden />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">Chỉ số phản biện ARE</h3>
              <p className="text-xs text-slate-400">Chưa có dữ liệu phản biện thực tế</p>
            </div>
          </div>
          <span className="self-start sm:self-auto inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
            Chưa kích hoạt
          </span>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs text-slate-300">
          <div className="max-w-xl space-y-1">
            <p className="font-semibold text-slate-200">Dữ liệu được cập nhật tự động từ lịch sử trò chuyện thực tế</p>
            <p className="text-slate-400 leading-relaxed">
              Bạn chưa có lượt trao đổi nào với AI. Hãy bắt đầu cuộc trò chuyện đầu tiên tại Bạn luyện phản biện để hệ thống đo lường 3 trụ cột ARE (Luận điểm - Lý lẽ - Dẫn chứng) và mở khóa bộ huy hiệu phòng thủ ngụy biện.
            </p>
          </div>
          <Link
            to="/dashboard/tro-chuyen"
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 font-bold text-cyan-300 transition-all hover:bg-cyan-500/25 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] shrink-0"
          >
            <MessageSquareText size={16} /> Bắt đầu luyện phản biện
          </Link>
        </div>
      </div>
    )
  }

  // 4. Trạng thái đã có dữ liệu thật từ lịch sử chat
  return (
    <div className="story-glass-strong border border-white/10 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" aria-label="Chỉ số phản biện Arena">
      {/* Header cấp độ */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
            <Trophy size={22} aria-hidden />
          </span>
          <div>
            <h3 className="font-extrabold text-white text-base sm:text-lg">Chỉ số phản biện ARE</h3>
            <p className="text-xs text-slate-400 font-medium">
              Hạng: <span className="text-cyan-300 font-semibold">{data.rankTitle}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
            <Sparkles size={14} /> {data.averageScore}% Sức mạnh
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>Tổng hợp từ {data.totalUserTurns} lượt lập luận qua {data.totalConversations} cuộc trò chuyện</span>
        <button
          type="button"
          onClick={loadData}
          className="hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1"
          title="Cập nhật lại từ lịch sử chat mới nhất"
        >
          <RotateCw size={12} /> Cập nhật
        </button>
      </div>

      {/* Thanh đo năng lực ARE thực tế */}
      <div className="mt-3.5 space-y-3">
        {data.metrics.map((m) => (
          <div key={m.code}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-200">
                <span className="grid size-5 place-items-center rounded border border-white/10 bg-white/5 text-xs font-black text-cyan-400">
                  {m.code}
                </span>
                {m.label}
              </span>
              <span className="tabular-nums text-slate-300 font-mono font-bold">{m.score}%</span>
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

      {/* Huy hiệu phòng thủ ngụy biện - Cái nào không có tuyệt đối KHÔNG ĐƯỢC HIỆN */}
      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
            Huy hiệu phòng thủ ngụy biện
          </p>
          {data.badges.length > 0 && (
            <span className="text-xs font-semibold text-emerald-400 font-mono">
              {data.badges.length} đã mở
            </span>
          )}
        </div>

        {data.badges.length > 0 ? (
          <div>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              {data.badges.map((b) => {
                const Icon = b.icon
                const isSelected = selectedBadge?.id === b.id
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBadge(isSelected ? null : b)}
                    className={`group relative grid size-11 place-items-center rounded-2xl transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-2 border-cyan-400 bg-cyan-500/25 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.5)] scale-105'
                        : 'border border-cyan-500/30 bg-slate-900/60 text-cyan-400/90 hover:border-cyan-400/70 hover:bg-cyan-500/15 hover:text-cyan-300 hover:scale-105 shadow-[0_0_12px_rgba(34,211,238,0.12)]'
                    }`}
                    aria-label={`Huy hiệu ${b.title}`}
                    aria-expanded={isSelected}
                    title={`${b.title} (Bấm để xem chi tiết)`}
                  >
                    <Icon size={20} aria-hidden className="transition-transform group-hover:scale-110" />
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Chi tiết huy hiệu mở ra khi bấm vào icon */}
            {selectedBadge && (
              <div
                className="mt-3 story-glass rounded-2xl border border-cyan-500/40 bg-slate-900/90 p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all animate-in fade-in duration-200"
                role="region"
                aria-label={`Chi tiết huy hiệu ${selectedBadge.title}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
                      <selectedBadge.icon size={20} aria-hidden />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{selectedBadge.title}</h4>
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          ✓ Đã mở
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">{selectedBadge.desc}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBadge(null)}
                    className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0"
                    aria-label="Đóng chi tiết huy hiệu"
                    title="Đóng"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-center text-xs text-slate-400">
            Chưa có huy hiệu nào được mở khóa. Hãy tiếp tục tranh luận cùng AI mà không mắc lỗi ngụy biện để nhận huy hiệu!
          </div>
        )}
      </div>
    </div>
  )
}
