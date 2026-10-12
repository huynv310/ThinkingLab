import { ChevronRight, MapPin, MonitorPlay, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ArenaGamification } from '../../components/ArenaGamification'
import { type SessionFormat } from '../../data/course'
import { useSessions } from '../../lib/course'

export const FORMAT_ICON: Record<SessionFormat, typeof MapPin> = {
  'Trực tiếp': MapPin,
  Online: MonitorPlay,
  'Dự phòng': RotateCcw,
}

export default function CoursesPage() {
  const { sessions, error } = useSessions()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl text-white">Tài liệu khóa học</h1>
        <p className="text-slate-400">6 buổi thực chiến phản biện · Chuẩn tư duy ARE & Socrates</p>
      </div>

      {/* Gamification widget: Chỉ số phản biện ARE & Huy hiệu */}
      <div className="mt-8">
        <ArenaGamification />
      </div>

      {error && <p role="alert" className="story-glass mt-8 rounded-3xl p-6 text-rose-400 border border-rose-500/30">Không tải được danh sách buổi học: {error}</p>}
      {!sessions && !error && <p className="mt-8 text-slate-400" aria-live="polite">Đang tải buổi học…</p>}
      {sessions?.length === 0 && <p className="story-glass mt-8 rounded-3xl p-6 text-slate-400 border border-white/10">Chưa có buổi học nào.</p>}

      {/* Danh sách 6 buổi học - cốt lõi, tinh gọn */}
      <ol className="mt-8 grid gap-4 sm:grid-cols-2">
        {sessions?.map((s) => {
          const Icon = FORMAT_ICON[s.format]
          return (
            <li key={s.id}>
              <Link
                to={s.slug}
                className="story-glass group flex h-full flex-col justify-between rounded-3xl p-6 border border-white/10 transition-all duration-200 hover:-translate-y-1 hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono">
                      Buổi {s.position}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                      <Icon size={14} className="text-cyan-400" aria-hidden /> {s.format} · {s.duration}
                    </span>
                  </div>
                  <h2 className="mt-4 text-xl leading-snug font-bold text-white group-hover:text-cyan-300 transition-colors text-balance">
                    {s.title}
                  </h2>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-400 group-hover:text-cyan-300">
                    Xem tài liệu & bài tập
                    <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
