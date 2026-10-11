import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup'

function translateError(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email hoặc mật khẩu không đúng.'
  if (m.includes('already registered')) return 'Email này đã được đăng ký. Hãy đăng nhập.'
  if (m.includes('email not confirmed')) return 'Bạn chưa xác nhận email. Hãy kiểm tra hộp thư.'
  if (m.includes('password should be')) return 'Mật khẩu cần tối thiểu 6 ký tự.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Bạn thao tác quá nhanh, thử lại sau ít phút.'
  if (m.includes('invalid') && m.includes('email')) return 'Email không hợp lệ.'
  return 'Có lỗi xảy ra, vui lòng thử lại.'
}

export default function AuthPage() {
  const { session } = useAuth()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const mode: Mode = params.get('mode') === 'signup' ? 'signup' : 'login'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  if (session) return <Navigate to={from} replace />

  const switchMode = (next: Mode) => {
    setError(null)
    setParams({ mode: next }, { replace: true })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        })
        if (error) throw error
        if (!data.session) setCheckEmail(true) // dự án bật xác nhận email
      }
    } catch (err) {
      setError(translateError(err instanceof Error ? err.message : String(err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex min-h-11 items-center gap-2 text-ink-soft hover:text-ink">
          <ArrowLeft size={18} aria-hidden /> Về trang giới thiệu
        </Link>

        <section className="glass-strong rounded-3xl p-6 sm:p-8">
          <Logo size={48} />
          {checkEmail ? (
            <div className="mt-8 text-center" role="status">
              <MailCheck className="mx-auto text-teal-deep" size={48} aria-hidden />
              <h1 className="mt-4 text-2xl font-bold">Kiểm tra hộp thư của bạn</h1>
              <p className="mt-2 text-ink-soft">
                Chúng mình đã gửi link xác nhận tới <strong className="text-ink">{email}</strong>. Bấm vào link để
                kích hoạt tài khoản rồi quay lại đăng nhập.
              </p>
              <button className="btn-ghost mt-6" onClick={() => { setCheckEmail(false); switchMode('login') }}>
                Đến trang đăng nhập
              </button>
            </div>
          ) : (
            <>
              <h1 className="mt-8 text-2xl font-bold sm:text-3xl">
                {mode === 'login' ? 'Chào mừng trở lại' : 'Tham gia ThinkingLab'}
              </h1>
              <p className="mt-1 text-ink-soft">Nghĩ sâu sắc · Hỏi rõ ràng · Vững vàng lập luận</p>

              <div className="mt-6 grid grid-cols-2 rounded-full bg-white/60 p-1" role="tablist" aria-label="Chọn hình thức">
                {(['login', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => switchMode(m)}
                    className={`min-h-11 rounded-full font-semibold transition-colors ${
                      mode === m ? 'bg-brand text-white shadow' : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                  </button>
                ))}
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate={false}>
                {mode === 'signup' && (
                  <Field label="Họ và tên" id="fullName">
                    <input id="fullName" required maxLength={100} autoComplete="name" value={fullName}
                      onChange={(e) => setFullName(e.target.value)} className="input" />
                  </Field>
                )}
                <Field label="Email" id="email">
                  <input id="email" type="email" required autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} className="input" />
                </Field>
                <Field label="Mật khẩu" id="password" hint={mode === 'signup' ? 'Tối thiểu 6 ký tự' : undefined}>
                  <input id="password" type="password" required minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} className="input" />
                </Field>

                {error && (
                  <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={busy} className="btn-primary w-full">
                  {busy && <Loader2 className="animate-spin" size={18} aria-hidden />}
                  {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  )
}
