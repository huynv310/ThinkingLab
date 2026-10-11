import { ExternalLink, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import type { SessionFormat } from '../../data/course'
import {
  deleteMaterial,
  deleteSession,
  listMaterials,
  listSessions,
  saveSession,
  uploadMaterial,
  type CourseMaterial,
  type CourseSession,
  useIsAdmin,
} from '../../lib/course'
import { checkMaterialFile, formatBytes, linesToList, parseYoutubeId, slugify } from '../../lib/courseRules'
import { FILE_ICON } from './CourseDetail'

const FORMATS: SessionFormat[] = ['Trực tiếp', 'Online', 'Dự phòng']

// Chặn ở giao diện cho gọn; quyền thật do RLS + Storage policy trên Supabase quyết định.
export default function AdminRoute() {
  const { isAdmin, loading } = useIsAdmin()
  if (loading) return <p className="p-8 text-ink-soft">Đang kiểm tra quyền…</p>
  return isAdmin ? <AdminPage /> : <Navigate to="/dashboard/khoa-hoc" replace />
}

function AdminPage() {
  const [sessions, setSessions] = useState<CourseSession[] | null>(null)
  const [error, setError] = useState('')
  const [params, setParams] = useSearchParams()
  const selected = params.get('buoi')

  const reload = () => listSessions().then(setSessions, (e: Error) => setError(e.message))
  useEffect(() => {
    reload()
  }, [])

  const current = sessions?.find((s) => String(s.id) === selected)
  const select = (id: number | 'moi') => setParams({ buoi: String(id) })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Quản trị khóa học</h1>
      <p className="mt-2 text-ink-soft">Sửa nội dung buổi học, gắn video YouTube và tải lên tài liệu PDF / PPTX.</p>
      {error && <p role="alert" className="mt-4 text-flame-deep">{error}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="Danh sách buổi học" className="glass h-fit rounded-3xl p-3">
          <button onClick={() => select('moi')} className="btn-primary mb-2 w-full">
            <Plus size={18} aria-hidden /> Thêm buổi học
          </button>
          {!sessions && <p className="p-3 text-ink-soft">Đang tải…</p>}
          <ul className="space-y-1">
            {sessions?.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => select(s.id)}
                  aria-current={String(s.id) === selected}
                  className={`w-full rounded-2xl px-3 py-2 text-left ${
                    String(s.id) === selected ? 'bg-brand text-white' : 'hover:bg-white/70'
                  }`}
                >
                  <span className="block text-xs font-bold tracking-widest uppercase opacity-80">Buổi {s.position}</span>
                  <span className="line-clamp-2 font-semibold">{s.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          {selected === 'moi' || current ? (
            <SessionEditor
              key={selected}
              session={current}
              nextPosition={(sessions?.reduce((max, s) => Math.max(max, s.position), 0) ?? 0) + 1}
              onSaved={(s) => {
                reload()
                select(s.id)
              }}
              onDeleted={() => {
                reload()
                setParams({})
              }}
            />
          ) : (
            <p className="glass rounded-3xl p-8 text-ink-soft">Chọn một buổi học bên trái để chỉnh sửa, hoặc thêm buổi mới.</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface PartDraft {
  title: string
  points: string
}

function SessionEditor({
  session,
  nextPosition,
  onSaved,
  onDeleted,
}: {
  session?: CourseSession
  nextPosition: number
  onSaved: (s: CourseSession) => void
  onDeleted: () => void
}) {
  const [position, setPosition] = useState(String(session?.position ?? nextPosition))
  const [title, setTitle] = useState(session?.title ?? '')
  const [slug, setSlug] = useState(session?.slug ?? '')
  const [format, setFormat] = useState<SessionFormat>(session?.format ?? 'Online')
  const [duration, setDuration] = useState(session?.duration ?? '60 phút')
  const [youtube, setYoutube] = useState(session?.youtube_id ? `https://youtu.be/${session.youtube_id}` : '')
  const [goals, setGoals] = useState(session?.goals.join('\n') ?? '')
  const [parts, setParts] = useState<PartDraft[]>(session?.parts.map((p) => ({ title: p.title, points: p.points.join('\n') })) ?? [])
  const [status, setStatus] = useState<{ busy: boolean; error: string; saved: boolean }>({ busy: false, error: '', saved: false })

  const youtubeId = youtube.trim() ? parseYoutubeId(youtube) : null
  const youtubeInvalid = youtube.trim() !== '' && !youtubeId

  async function submit(e: FormEvent) {
    e.preventDefault()
    const finalSlug = slug.trim() || slugify(title)
    const pos = Number(position)
    const error = !title.trim()
      ? 'Nhập tên buổi học'
      : !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(finalSlug)
        ? 'Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang'
        : !Number.isInteger(pos) || pos < 1 || pos > 999
          ? 'Thứ tự buổi phải là số từ 1 đến 999'
          : youtubeInvalid
            ? 'Video phải là link YouTube hợp lệ'
            : ''
    if (error) return setStatus({ busy: false, error, saved: false })

    setStatus({ busy: true, error: '', saved: false })
    try {
      const saved = await saveSession(
        {
          position: pos,
          slug: finalSlug,
          title: title.trim(),
          format,
          duration: duration.trim() || '60 phút',
          youtube_id: youtubeId,
          goals: linesToList(goals),
          parts: parts
            .map((p) => ({ title: p.title.trim(), points: linesToList(p.points) }))
            .filter((p) => p.title || p.points.length),
        },
        session?.id,
      )
      setStatus({ busy: false, error: '', saved: true })
      onSaved(saved)
    } catch (err) {
      setStatus({ busy: false, error: (err as Error).message, saved: false })
    }
  }

  async function remove() {
    if (!session || !confirm(`Xóa "Buổi ${session.position}: ${session.title}" cùng toàn bộ tài liệu của buổi này?`)) return
    setStatus({ busy: true, error: '', saved: false })
    try {
      await deleteSession(session.id)
      onDeleted()
    } catch (err) {
      setStatus({ busy: false, error: (err as Error).message, saved: false })
    }
  }

  const setPart = (i: number, patch: Partial<PartDraft>) => setParts(parts.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="glass space-y-5 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">{session ? `Sửa buổi ${session.position}` : 'Buổi học mới'}</h2>
          {session && (
            <Link to={`/dashboard/khoa-hoc/${session.slug}`} className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
              Xem trang học viên <ExternalLink size={16} aria-hidden />
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
          <Field label="Thứ tự">
            <input className="input" inputMode="numeric" value={position} onChange={(e) => setPosition(e.target.value)} />
          </Field>
          <Field label="Tên buổi học">
            <input className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Hình thức">
            <select className="input" value={format} onChange={(e) => setFormat(e.target.value as SessionFormat)}>
              {FORMATS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Thời lượng">
            <input className="input" value={duration} maxLength={40} onChange={(e) => setDuration(e.target.value)} />
          </Field>
          <Field label="Đường dẫn (slug)" hint={slug ? undefined : `Tự tạo: ${slugify(title) || '…'}`}>
            <input className="input" value={slug} maxLength={60} placeholder={slugify(title)} onChange={(e) => setSlug(e.target.value)} />
          </Field>
        </div>

        <Field
          label="Video bài giảng (chỉ YouTube)"
          hint={youtubeInvalid ? undefined : 'Dán link YouTube, ví dụ https://youtu.be/… hoặc youtube.com/watch?v=…  Để trống nếu chưa có.'}
          error={youtubeInvalid ? 'Không phải link YouTube hợp lệ — chỉ chấp nhận video YouTube' : undefined}
        >
          <input className="input" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
        </Field>
        {youtubeId && (
          <img
            src={`https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`}
            alt="Ảnh xem trước video YouTube"
            className="w-56 rounded-2xl"
            referrerPolicy="no-referrer"
          />
        )}

        <Field label="Mục tiêu buổi học" hint="Mỗi dòng một mục tiêu">
          <textarea className="input min-h-28" value={goals} onChange={(e) => setGoals(e.target.value)} />
        </Field>

        <fieldset className="space-y-4">
          <legend className="font-semibold">Nội dung các phần</legend>
          {parts.map((p, i) => (
            <div key={i} className="space-y-3 rounded-2xl bg-white/50 p-4">
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  aria-label={`Tiêu đề phần ${i + 1}`}
                  placeholder={`Phần ${i + 1}: …`}
                  value={p.title}
                  onChange={(e) => setPart(i, { title: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setParts(parts.filter((_, j) => j !== i))}
                  className="grid size-12 shrink-0 place-items-center rounded-2xl text-flame-deep hover:bg-white/80"
                  aria-label={`Xóa phần ${i + 1}`}
                >
                  <Trash2 size={20} aria-hidden />
                </button>
              </div>
              <textarea
                className="input min-h-28"
                aria-label={`Các ý của phần ${i + 1}, mỗi dòng một ý`}
                placeholder="Mỗi dòng một ý"
                value={p.points}
                onChange={(e) => setPart(i, { points: e.target.value })}
              />
            </div>
          ))}
          <button type="button" onClick={() => setParts([...parts, { title: '', points: '' }])} className="btn-ghost">
            <Plus size={18} aria-hidden /> Thêm phần
          </button>
        </fieldset>

        {status.error && <p role="alert" className="text-flame-deep">{status.error}</p>}
        {status.saved && <p role="status" className="font-semibold text-teal-deep">Đã lưu.</p>}

        <div className="flex flex-wrap justify-between gap-3">
          <button type="submit" disabled={status.busy} className="btn-primary">
            {status.busy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Save size={18} aria-hidden />}
            {session ? 'Lưu thay đổi' : 'Tạo buổi học'}
          </button>
          {session && (
            <button type="button" onClick={remove} disabled={status.busy} className="btn-ghost text-flame-deep">
              <Trash2 size={18} aria-hidden /> Xóa buổi học
            </button>
          )}
        </div>
      </form>

      {session ? (
        <MaterialsManager sessionId={session.id} />
      ) : (
        <p className="glass rounded-3xl p-6 text-ink-soft">Lưu buổi học trước, sau đó bạn có thể tải tài liệu lên.</p>
      )}
    </div>
  )
}

function MaterialsManager({ sessionId }: { sessionId: number }) {
  const [items, setItems] = useState<CourseMaterial[]>([])
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listMaterials(sessionId).then(setItems, (e: Error) => setError(e.message))
  }, [sessionId])

  function pick(f: File | null) {
    setError('')
    if (f) {
      const check = checkMaterialFile(f)
      if (!check.ok) {
        setError(check.error)
        if (inputRef.current) inputRef.current.value = ''
        return setFile(null)
      }
      if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''))
    }
    setFile(f)
  }

  async function upload(e: FormEvent) {
    e.preventDefault()
    if (!file) return setError('Chọn file PDF hoặc PPTX')
    if (!title.trim()) return setError('Nhập tên tài liệu')
    setBusy(true)
    setError('')
    try {
      const m = await uploadMaterial(sessionId, title, file)
      setItems((list) => [...list, m])
      setTitle('')
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(m: CourseMaterial) {
    if (!confirm(`Xóa tài liệu "${m.title}"?`)) return
    try {
      await deleteMaterial(m)
      setItems((list) => list.filter((x) => x.id !== m.id))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className="glass space-y-4 rounded-3xl p-6 sm:p-8" aria-labelledby="admin-materials">
      <h2 id="admin-materials" className="text-xl font-bold">Tài liệu (PDF / PPTX)</h2>

      {items.length === 0 && <p className="text-ink-soft">Chưa có tài liệu nào.</p>}
      <ul className="space-y-2">
        {items.map((m) => {
          const Icon = FILE_ICON[m.file_type]
          return (
            <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-white/60 px-4 py-2">
              <Icon className="shrink-0 text-brand" size={22} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{m.title}</span>
                <span className="text-sm text-ink-soft">
                  {m.file_type.toUpperCase()} · {formatBytes(m.size_bytes)}
                </span>
              </span>
              <button
                onClick={() => remove(m)}
                className="grid size-11 shrink-0 place-items-center rounded-full text-flame-deep hover:bg-white/80"
                aria-label={`Xóa ${m.title}`}
              >
                <Trash2 size={20} aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>

      <form onSubmit={upload} className="space-y-3 rounded-2xl bg-white/50 p-4">
        <Field label="File" hint="Chỉ nhận .pdf hoặc .pptx, tối đa 50 MB">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:font-semibold file:text-white"
          />
        </Field>
        <Field label="Tên tài liệu">
          <input className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        {error && <p role="alert" className="text-flame-deep">{error}</p>}
        <button type="submit" disabled={busy || !file} className="btn-primary">
          {busy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Upload size={18} aria-hidden />}
          {busy ? 'Đang tải lên…' : 'Tải lên'}
        </button>
      </form>
    </section>
  )
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-semibold">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-flame-deep">{error}</span> : hint && <span className="mt-1 block text-sm text-ink-soft">{hint}</span>}
    </label>
  )
}
