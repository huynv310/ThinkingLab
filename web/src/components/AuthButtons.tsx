import { ArrowRight, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/** Đã đăng nhập -> nút vào Dashboard; chưa -> Đăng ký + Đăng nhập. */
export function AuthButtons({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { session, loading } = useAuth()
  const big = size === 'lg' ? 'min-h-14 px-8 text-lg' : ''

  if (loading) return <div className={`h-12 ${size === 'lg' ? 'w-72' : 'w-48'}`} aria-hidden />

  if (session) {
    return (
      <Link to="/dashboard" className={`btn-primary ${big}`}>
        <LayoutDashboard size={20} aria-hidden /> Vào Dashboard
      </Link>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link to="/auth?mode=signup" className={`btn-accent ${big}`}>
        Đăng ký học <ArrowRight size={20} aria-hidden />
      </Link>
      <Link to="/auth?mode=login" className={`btn-ghost ${big}`}>
        Đăng nhập
      </Link>
    </div>
  )
}
