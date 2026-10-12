import { Check, Eye, EyeOff, Loader2, MailCheck, X } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from './Logo'
import { useAuth, type AuthMode } from '../lib/auth'
import { PASSWORD_RULES, emailError, normalizeEmail, passwordOk, suggestEmail } from '../lib/authRules'
import { supabase } from '../lib/supabase'

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

export function AuthModal() {
  const { session, authModal, openAuth, closeAuth } = useAuth()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  // Đồng bộ với param URL nếu người dùng đến qua ?mode=login / ?mode=signup hoặc ?auth=...
  useEffect(() => {
    const urlMode = params.get('mode') || params.get('auth')
    if (urlMode === 'signup' || urlMode === 'login') {
      openAuth(urlMode)
    }
  }, [params, openAuth])

  const [mode, setMode] = useState<AuthMode>(authModal ?? 'login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [busy, setBusy] = useState<false | 'form' | 'google'>(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  // Cập nhật mode khi context thay đổi
  useEffect(() => {
    if (authModal) {
      setMode(authModal)
      setError(null)
    }
  }, [authModal])

  // Đóng bằng phím Escape
  useEffect(() => {
    if (!authModal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [authModal])

  if (!authModal || session) return null

  const handleClose = () => {
    closeAuth()
    // Xóa param URL nếu có
    if (params.get('mode') || params.get('auth')) {
      params.delete('mode')
      params.delete('auth')
      setParams(params, { replace: true })
    }
  }

  const signup = mode === 'signup'
  const emailMsg = emailTouched ? emailError(email) : null
  const suggestion = emailTouched && !emailMsg ? suggestEmail(email) : null

  const switchMode = (next: AuthMode) => {
    setFullName('')
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setEmailTouched(false)
    setError(null)
    setMode(next)
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
        handleClose()
        navigate('/dashboard')
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
        if (!data.session) {
          setCheckEmail(true)
        } else {
          handleClose()
          navigate('/dashboard')
        }
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
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) {
      setError(translateError(error.message))
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop tối mờ vũ trụ */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-200"
        aria-hidden
      />

      {/* Card modal nội dung dạng kính không gian */}
      <div className="story-glass-strong relative z-10 w-full max-w-md my-auto rounded-3xl p-6 sm:p-8 border border-white/15 bg-slate-900/85 backdrop-blur-2xl text-white shadow-[0_30px_90px_rgba(0,0,0,0.85)] motion-safe:animate-in motion-safe:fade-in-50 motion-safe:zoom-in-95">
        {/* Nút đóng modal */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 grid size-11 place-items-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Đóng popup"
        >
          <X size={20} aria-hidden />
        </button>

        {checkEmail ? (
          <div className="text-center py-4" role="status">
            <MailCheck className="mx-auto text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" size={54} aria-hidden />
            <h2 id="auth-modal-title" className="mt-4 text-2xl font-bold text-white">Kiểm tra hộp thư của bạn</h2>
            <p className="mt-2 text-sm text-slate-300">
              Chúng mình đã gửi link xác nhận tới <strong className="text-cyan-300">{normalizeEmail(email)}</strong>. Bấm vào link để kích hoạt tài khoản rồi đăng nhập nhé.
            </p>
            <button
              type="button"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              onClick={() => { setCheckEmail(false); switchMode('login') }}
            >
              Đến phần đăng nhập
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <Logo size={42} withText={true} />
            </div>

            <h2 id="auth-modal-title" className="mt-5 text-center text-2xl font-extrabold sm:text-3xl text-white">
              {signup ? 'Tham gia ThinkingLab' : 'Chào mừng trở lại'}
            </h2>
            <p className="mt-1 text-center text-sm text-slate-400">
              Nghĩ sâu sắc · Hỏi rõ ràng · Vững vàng lập luận
            </p>

            {/* Tab chuyển đổi Đăng nhập / Đăng ký */}
            <div className="mt-6 grid grid-cols-2 rounded-full border border-white/10 bg-white/5 p-1" role="tablist" aria-label="Chọn hình thức">
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => mode !== m && switchMode(m)}
                  className={`min-h-11 cursor-pointer rounded-full font-bold text-sm transition-all ${
                    mode === m
                      ? 'bg-gradient-to-r from-cyan-500 to-brand text-white shadow-[0_0_15px_rgba(34,211,238,0.35)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                </button>
              ))}
            </div>

            {/* Đăng nhập với Google */}
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={!!busy}
              className="mt-6 flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-white/15 bg-white/5 font-semibold text-white shadow-sm transition-all hover:bg-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] disabled:opacity-60"
            >
              {busy === 'google' ? <Loader2 className="animate-spin text-cyan-400" size={20} aria-hidden /> : <GoogleIcon />}
              {signup ? 'Đăng ký với Google' : 'Đăng nhập với Google'}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-slate-400" aria-hidden>
              <span className="h-px flex-1 bg-white/10" /> hoặc dùng email <span className="h-px flex-1 bg-white/10" />
            </div>

            <form key={mode} onSubmit={onSubmit} className="space-y-4" noValidate>
              {signup && (
                <Field label="Họ và tên" id="modal-fullName">
                  <input
                    id="modal-fullName"
                    required
                    maxLength={100}
                    autoComplete="name"
                    value={fullName}
                    placeholder="Nguyễn Văn A"
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full min-h-12 rounded-2xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-cyan-400/20"
                  />
                </Field>
              )}

              <Field label="Email" id="modal-email" error={emailMsg ?? undefined}>
                <input
                  id="modal-email"
                  type="email"
                  required
                  autoComplete={signup ? 'email' : 'username'}
                  value={email}
                  placeholder="name@example.com"
                  inputMode="email"
                  spellCheck={false}
                  aria-invalid={!!emailMsg}
                  aria-describedby="modal-email-msg"
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => email && setEmailTouched(true)}
                  className="w-full min-h-12 rounded-2xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-cyan-400/20"
                />
              </Field>
              {suggestion && (
                <p className="-mt-2 text-xs text-slate-400">
                  Có phải ý bạn là{' '}
                  <button type="button" className="font-semibold text-cyan-400 underline cursor-pointer" onClick={() => setEmail(suggestion)}>
                    {suggestion}
                  </button>
                  ?
                </p>
              )}

              <Field label="Mật khẩu" id="modal-password">
                <div className="relative">
                  <input
                    id="modal-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={signup ? 'new-password' : 'current-password'}
                    value={password}
                    placeholder="••••••••"
                    aria-describedby={signup ? 'modal-password-rules' : undefined}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-h-12 rounded-2xl border border-white/15 bg-white/5 px-4 pr-12 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-cyan-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-1 grid w-11 place-items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                  </button>
                </div>
              </Field>
              {signup && <PasswordChecklist password={password} email={email} />}

              {error && (
                <p role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!!busy || (signup && (!fullName.trim() || !!emailError(email) || !passwordOk(password, email)))}
                className="w-full min-h-12 cursor-pointer inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-brand font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === 'form' && <Loader2 className="animate-spin text-white" size={18} aria-hidden />}
                {signup ? 'Tạo tài khoản' : 'Đăng nhập'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function PasswordChecklist({ password, email }: { password: string; email: string }) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password, email)).length
  const level = !password ? 0 : passed <= 3 ? 1 : passed < PASSWORD_RULES.length ? 2 : 3
  const LEVELS = [
    { label: '', color: 'bg-white/10' },
    { label: 'Yếu', color: 'bg-rose-500' },
    { label: 'Trung bình', color: 'bg-amber-400' },
    { label: 'Mạnh', color: 'bg-cyan-400' },
  ]

  return (
    <div id="modal-password-rules" className="-mt-1 rounded-2xl border border-white/10 bg-white/5 p-3.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= level ? LEVELS[level].color : 'bg-white/10'}`} />
          ))}
        </div>
        {level > 0 && <span className="text-xs font-semibold text-slate-300" aria-live="polite">Độ mạnh: {LEVELS[level].label}</span>}
      </div>
      <ul className="mt-2.5 grid gap-1.5 text-xs sm:grid-cols-2">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password, email)
          return (
            <li key={r.id} className={`flex items-center gap-1.5 ${ok ? 'text-cyan-300' : 'text-slate-400'}`}>
              {ok ? <Check size={14} className="text-cyan-400 shrink-0" aria-hidden /> : <X size={14} className="text-slate-500 shrink-0" aria-hidden />}
              <span>{r.label}</span>
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
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
        {label}
      </label>
      {children}
      {error && <p id={`${id}-msg`} className="mt-1 text-xs font-medium text-rose-400">{error}</p>}
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
