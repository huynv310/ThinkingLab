import { ArrowLeft, ArrowRight, CheckCircle2, Download, FileText, Pencil, PlayCircle, Presentation, VideoOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { listMaterials, materialDownloadUrl, useIsAdmin, useSessions, type CourseMaterial } from '../../lib/course'
import { formatBytes, youtubeEmbedUrl } from '../../lib/courseRules'
import { FORMAT_ICON } from './CoursesPage'

export default function CourseDetail() {
  const { slug } = useParams()
  const { sessions, error } = useSessions()
  const { isAdmin } = useIsAdmin()

  if (error) return <p role="alert" className="glass m-8 rounded-3xl p-6 text-flame-deep">Không tải được buổi học: {error}</p>
  if (!sessions) return <p className="p-8 text-ink-soft" aria-live="polite">Đang tải buổi học…</p>

  const index = sessions.findIndex((s) => s.slug === slug)
  if (index === -1) return <Navigate to="/dashboard/khoa-hoc" replace />

  const s = sessions[index]
  const prev = sessions[index - 1]
  const next = sessions[index + 1]
  const Icon = FORMAT_ICON[s.format]

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/dashboard/khoa-hoc" className="inline-flex min-h-11 items-center gap-2 font-medium text-ink-soft hover:text-ink">
          <ArrowLeft size={18} aria-hidden /> Tất cả buổi học
        </Link>
        {isAdmin && (
          <Link to={`/dashboard/quan-tri?buoi=${s.id}`} className="btn-ghost">
            <Pencil size={18} aria-hidden /> Chỉnh sửa buổi này
          </Link>
        )}
      </div>

      <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold tracking-widest text-teal-deep uppercase">
        Buổi {s.position} · <Icon size={16} aria-hidden /> {s.format} · {s.duration}
      </p>
      <h1 className="mt-2 text-3xl leading-tight font-extrabold sm:text-4xl">{s.title}</h1>

      {/* Video: chỉ nhúng YouTube */}
      <div className="glass mt-8 aspect-video overflow-hidden rounded-3xl">
        {s.youtube_id ? (
          <iframe
            src={youtubeEmbedUrl(s.youtube_id)}
            title={`Bản ghi buổi ${s.position}`}
            className="size-full"
            allow="encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
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

      <Materials key={s.id} sessionId={s.id} />

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
            <ArrowLeft size={18} aria-hidden /> Buổi {prev.position}
          </Link>
        ) : <span />}
        {next && (
          <Link to={`/dashboard/khoa-hoc/${next.slug}`} className="btn-ghost">
            Buổi {next.position} <ArrowRight size={18} aria-hidden />
          </Link>
        )}
      </nav>
    </article>
  )
}

export const FILE_ICON = { pdf: FileText, pptx: Presentation }

function Materials({ sessionId }: { sessionId: number }) {
  const [items, setItems] = useState<CourseMaterial[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listMaterials(sessionId).then(setItems, (e: Error) => setError(e.message))
  }, [sessionId])

  async function download(m: CourseMaterial) {
    try {
      window.location.assign(await materialDownloadUrl(m))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (!items?.length && !error) return null
  return (
    <section className="glass mt-6 rounded-3xl p-6 sm:p-8" aria-labelledby="materials">
      <h2 id="materials" className="text-xl font-bold">Tài liệu buổi học</h2>
      {error && <p role="alert" className="mt-3 text-flame-deep">{error}</p>}
      <ul className="mt-4 space-y-2">
        {items?.map((m) => {
          const Icon = FILE_ICON[m.file_type]
          return (
            <li key={m.id}>
              <button
                onClick={() => download(m)}
                className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-white/60 px-4 py-2 text-left hover:bg-white/90"
              >
                <Icon className="shrink-0 text-brand" size={22} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{m.title}</span>
                  <span className="text-sm text-ink-soft">
                    {m.file_type.toUpperCase()} · {formatBytes(m.size_bytes)}
                  </span>
                </span>
                <Download className="shrink-0 text-ink-soft" size={20} aria-label="Tải về" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
