import { ArrowLeft, Check, Eye, EyeOff, Loader2, MailCheck, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../lib/auth'
import { PASSWORD_RULES, emailError, normalizeEmail, passwordOk, suggestEmail } from '../lib/authRules'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup'

function translateError(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email hoặc mật khẩu không đúng.'
  if (m.includes('already registered')) return 'Email này đã được đăng ký. Hãy đăng nhập.'
  if (m.includes('email not confirmed')) return 'Bạn chưa xác nhận email. Hãy kiểm tra hộp thư.'
  if (m.includes('known to be weak') || m.includes('pwned')) return 'Mật khẩu này đã từng bị lộ trên mạng, hãy chọn mật khẩu khác.'
  if (m.includes('password should')) return 'Mật khẩu chưa đủ mạnh theo yêu cầu.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Bạn thao tác quá nhanh, thử lại sau ít phút.'
  if (m.includes('invalid') && m.includes('email')) return 'Email không hợp lệ.'
  if (m.includes('provider is not enabled')) return 'Đăng nhập bằng Google chưa được bật.'
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
  const [showPassword, setShowPassword] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [busy, setBusy] = useState<false | 'form' | 'google'>(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  if (session) return <Navigate to={from} replace />

  const signup = mode === 'signup'
  const emailMsg = emailTouched ? emailError(email) : null
  const suggestion = emailTouched && !emailMsg ? suggestEmail(email) : null

  // Đổi tab = form mới: không mang dữ liệu đã nhập sang tab kia
  const switchMode = (next: Mode) => {
    setFullName('')
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setEmailTouched(false)
    setError(null)
    setParams({ mode: next }, { replace: true })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setEmailTouched(true)
    if (emailError(email)) return
    if (signup && (!fullName.trim() || !passwordOk(password, email))) return

    setBusy('form')
    setError(null)
    try {
      if (!signup) {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: normalizeEmail(email),
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

  async function signInWithGoogle() {
    setBusy('google')
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${from}` },
    })
    // Thành công -> trình duyệt chuyển sang Google, không quay lại đây
    if (error) {
      setError(translateError(error.message))
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
                Chúng mình đã gửi link xác nhận tới <strong className="text-ink">{normalizeEmail(email)}</strong>. Bấm vào
                link để kích hoạt tài khoản rồi quay lại đăng nhập.
              </p>
              <button className="btn-ghost mt-6" onClick={() => { setCheckEmail(false); switchMode('login') }}>
                Đến trang đăng nhập
              </button>
            </div>
          ) : (
            <>
              <h1 className="mt-8 text-2xl font-bold sm:text-3xl">
                {signup ? 'Tham gia ThinkingLab' : 'Chào mừng trở lại'}
              </h1>
              <p className="mt-1 text-ink-soft">Nghĩ sâu sắc · Hỏi rõ ràng · Vững vàng lập luận</p>

              <div className="mt-6 grid grid-cols-2 rounded-full bg-white/60 p-1" role="tablist" aria-label="Chọn hình thức">
                {(['login', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => mode !== m && switchMode(m)}
                    className={`min-h-11 rounded-full font-semibold transition-colors ${
                      mode === m ? 'bg-brand text-white shadow' : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={!!busy}
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-ink/15 bg-white font-semibold text-ink shadow-sm transition-colors hover:bg-paper disabled:opacity-60"
              >
                {busy === 'google' ? <Loader2 className="animate-spin" size={20} aria-hidden /> : <GoogleIcon />}
                {signup ? 'Đăng ký với Google' : 'Đăng nhập với Google'}
              </button>

              <div className="my-6 flex items-center gap-3 text-sm text-ink-soft" aria-hidden>
                <span className="h-px flex-1 bg-ink/15" /> hoặc dùng email <span className="h-px flex-1 bg-ink/15" />
              </div>

              {/* key: đổi tab tạo form mới, trình duyệt không giữ giá trị cũ */}
              <form key={mode} onSubmit={onSubmit} className="space-y-4" noValidate>
                {signup && (
                  <Field label="Họ và tên" id="fullName">
                    <input id="fullName" required maxLength={100} autoComplete="name" value={fullName}
                      onChange={(e) => setFullName(e.target.value)} className="input" />
                  </Field>
                )}

                <Field label="Email" id="email" error={emailMsg ?? undefined}>
                  <input id="email" type="email" required autoComplete={signup ? 'email' : 'username'} value={email}
                    inputMode="email" spellCheck={false} aria-invalid={!!emailMsg} aria-describedby="email-msg"
                    onChange={(e) => setEmail(e.target.value)} onBlur={() => email && setEmailTouched(true)}
                    className="input" />
                </Field>
                {suggestion && (
                  <p className="-mt-2 text-sm text-ink-soft">
                    Có phải ý bạn là{' '}
                    <button type="button" className="font-semibold text-brand underline" onClick={() => setEmail(suggestion)}>
                      {suggestion}
                    </button>
                    ?
                  </p>
                )}

                <Field label="Mật khẩu" id="password">
                  <div className="relative">
                    <input id="password" type={showPassword ? 'text' : 'password'} required
                      autoComplete={signup ? 'new-password' : 'current-password'} value={password}
                      aria-describedby={signup ? 'password-rules' : undefined}
                      onChange={(e) => setPassword(e.target.value)} className="input pr-12" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-1 grid w-11 place-items-center text-ink-soft hover:text-ink"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                      {showPassword ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
                    </button>
                  </div>
                </Field>
                {signup && <PasswordChecklist password={password} email={email} />}

                {error && (
                  <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!!busy || (signup && (!fullName.trim() || !!emailError(email) || !passwordOk(password, email)))}
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === 'form' && <Loader2 className="animate-spin" size={18} aria-hidden />}
                  {signup ? 'Tạo tài khoản' : 'Đăng nhập'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function PasswordChecklist({ password, email }: { password: string; email: string }) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password, email)).length
  const level = !password ? 0 : passed <= 3 ? 1 : passed < PASSWORD_RULES.length ? 2 : 3
  const LEVELS = [
    { label: '', color: 'bg-ink/10' },
    { label: 'Yếu', color: 'bg-red-500' },
    { label: 'Trung bình', color: 'bg-amber' },
    { label: 'Mạnh', color: 'bg-teal-deep' },
  ]

  return (
    <div id="password-rules" className="-mt-2 rounded-2xl bg-white/60 p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= level ? LEVELS[level].color : 'bg-ink/10'}`} />
          ))}
        </div>
        {level > 0 && <span className="text-xs font-semibold" aria-live="polite">Độ mạnh: {LEVELS[level].label}</span>}
      </div>
      <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password, email)
          return (
            <li key={r.id} className={`flex items-center gap-1.5 ${ok ? 'text-teal-deep' : 'text-ink-soft'}`}>
              {ok ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
              {r.label}
              <span className="sr-only">{ok ? '(đạt)' : '(chưa đạt)'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {error && <p id={`${id}-msg`} className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
