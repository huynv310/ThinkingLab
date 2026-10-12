import { ArrowRight, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/** Đã đăng nhập -> nút vào Dashboard; chưa -> Đăng ký + Đăng nhập (dạng popup modal). */
export function AuthButtons({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { session, loading, openAuth } = useAuth()
  const big = size === 'lg' ? 'min-h-14 px-8 text-lg' : ''

  if (loading) return <div className={`h-11 ${size === 'lg' ? 'w-72' : 'w-48'}`} aria-hidden />

  if (session) {
    return (
      <Link
        to="/dashboard"
        className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-brand px-6 font-semibold text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-all hover:brightness-110 active:scale-95 ${big}`}
      >
        <LayoutDashboard size={18} aria-hidden /> Vào Dashboard
      </Link>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={() => openAuth('signup')}
        className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-brand px-5 font-semibold text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-all hover:brightness-110 active:scale-95 ${big}`}
      >
        Đăng ký học <ArrowRight size={18} className="hidden sm:inline" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => openAuth('login')}
        className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 font-semibold text-slate-200 backdrop-blur-md transition-all hover:bg-white/10 hover:border-cyan-400/50 hover:text-white ${big}`}
      >
        Đăng nhập
      </button>
    </div>
  )
}
