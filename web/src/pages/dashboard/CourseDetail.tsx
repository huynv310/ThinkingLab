import { ArrowLeft, ArrowRight, CheckCircle2, PlayCircle, VideoOff } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { COURSE_SESSIONS } from '../../data/course'
import { FORMAT_ICON } from './CoursesPage'

export default function CourseDetail() {
  const { slug } = useParams()
  const index = COURSE_SESSIONS.findIndex((s) => s.slug === slug)
  if (index === -1) return <Navigate to="/dashboard/khoa-hoc" replace />

  const s = COURSE_SESSIONS[index]
  const prev = COURSE_SESSIONS[index - 1]
  const next = COURSE_SESSIONS[index + 1]
  const Icon = FORMAT_ICON[s.format]

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
      <Link to="/dashboard/khoa-hoc" className="inline-flex min-h-11 items-center gap-2 font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={18} aria-hidden /> Tất cả buổi học
      </Link>

      <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold tracking-widest text-teal-deep uppercase">
        Buổi {s.no} · <Icon size={16} aria-hidden /> {s.format} · {s.duration}
      </p>
      <h1 className="mt-2 text-3xl leading-tight font-extrabold sm:text-4xl">{s.title}</h1>

      {/* Video */}
      <div className="glass mt-8 aspect-video overflow-hidden rounded-3xl">
        {s.videoUrl ? (
          <iframe
            src={s.videoUrl}
            title={`Bản ghi buổi ${s.no}`}
            className="size-full"
            allow="encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="grid size-full place-items-center p-6 text-center">
            <div>
              {s.format === 'Online' ? (
                <PlayCircle className="mx-auto text-brand" size={56} aria-hidden />
              ) : (
                <VideoOff className="mx-auto text-ink-soft" size={56} aria-hidden />
              )}
              <p className="mt-3 text-lg font-semibold">
                {s.format === 'Online' ? 'Bản ghi bài giảng sẽ được cập nhật sau buổi học' : 'Buổi học không có bản ghi'}
              </p>
              <p className="mt-1 text-ink-soft">
                {s.format === 'Online'
                  ? 'Buổi online qua Google Meet được ghi hình để bạn xem lại.'
                  : s.format === 'Trực tiếp'
                    ? 'Buổi trực tiếp tại Trường Đại học FPT — địa điểm thông báo trước 24h.'
                    : 'Chỉ diễn ra khi một buổi chính bị gián đoạn.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <section className="glass mt-6 rounded-3xl p-6 sm:p-8" aria-labelledby="goals">
        <h2 id="goals" className="text-xl font-bold">Mục tiêu buổi học</h2>
        <ul className="mt-4 space-y-3">
          {s.goals.map((g) => (
            <li key={g} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 shrink-0 text-teal-deep" size={20} aria-hidden /> {g}
            </li>
          ))}
        </ul>
      </section>

      {s.parts.map((part) => (
        <section key={part.title} className="glass mt-6 rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold">{part.title}</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 marker:text-brand">
            {part.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}

      <nav className="mt-8 flex justify-between gap-3" aria-label="Chuyển buổi">
        {prev ? (
          <Link to={`/dashboard/khoa-hoc/${prev.slug}`} className="btn-ghost">
            <ArrowLeft size={18} aria-hidden /> Buổi {prev.no}
          </Link>
        ) : <span />}
        {next && (
          <Link to={`/dashboard/khoa-hoc/${next.slug}`} className="btn-ghost">
            Buổi {next.no} <ArrowRight size={18} aria-hidden />
          </Link>
        )}
      </nav>
    </article>
  )
}
