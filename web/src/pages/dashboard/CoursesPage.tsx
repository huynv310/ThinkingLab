import { ChevronRight, MapPin, MonitorPlay, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { COURSE_FACTS, type SessionFormat } from '../../data/course'
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
      <h1 className="text-3xl font-extrabold sm:text-4xl">Tài liệu khóa học</h1>
      <p className="mt-2 text-ink-soft">{COURSE_FACTS.period} · 6 buổi × 60 phút · 2 buổi trực tiếp, 4 buổi online</p>

      {error && <p role="alert" className="glass mt-8 rounded-3xl p-6 text-flame-deep">Không tải được danh sách buổi học: {error}</p>}
      {!sessions && !error && <p className="mt-8 text-ink-soft" aria-live="polite">Đang tải buổi học…</p>}
      {sessions?.length === 0 && <p className="glass mt-8 rounded-3xl p-6 text-ink-soft">Chưa có buổi học nào.</p>}

      <ol className="mt-8 grid gap-4 sm:grid-cols-2">
        {sessions?.map((s) => {
          const Icon = FORMAT_ICON[s.format]
          return (
            <li key={s.id}>
              <Link
                to={s.slug}
                className="glass group flex h-full flex-col rounded-3xl p-6 transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold tracking-widest text-teal-deep uppercase">Buổi {s.position}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">
                    <Icon size={14} aria-hidden /> {s.format} · {s.duration}
                  </span>
                </div>
                <h2 className="mt-3 text-xl leading-snug font-bold">{s.title}</h2>
                <p className="mt-2 line-clamp-2 text-ink-soft">{s.goals[0]}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-5 font-semibold text-brand">
                  Xem video & tài liệu
                  <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
