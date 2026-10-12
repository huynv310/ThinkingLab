import { BookOpen, ChevronLeft, ChevronRight, LogOut, MessageCircleHeart, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { displayName, useAuth } from '../../lib/auth'
import { useIsAdmin } from '../../lib/course'
import { supabase } from '../../lib/supabase'

const NAV = [
  { to: 'khoa-hoc', label: 'Tài liệu khóa học', short: 'Khóa học', icon: BookOpen },
  { to: 'tro-chuyen', label: 'Bạn luyện phản biện', short: 'Trò chuyện', icon: MessageCircleHeart },
]
const ADMIN_NAV = { to: 'quan-tri', label: 'Quản trị khóa học', short: 'Quản trị', icon: ShieldCheck }

export default function DashboardLayout() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const name = displayName(session)
  const { isAdmin } = useIsAdmin()
  const nav = isAdmin ? [...NAV, ADMIN_NAV] : NAV
  const [collapsed, setCollapsed] = useState(false)

  async function logout() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-12 items-center gap-3 rounded-2xl px-3.5 font-semibold transition-colors ${
      isActive
        ? 'bg-brand text-white shadow-[0_10px_24px_-12px_rgb(43_79_216/0.8)]'
        : 'text-ink-soft hover:bg-white/70 hover:text-ink'
    } ${collapsed ? 'justify-center px-0' : ''}`

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop có nút thu gọn/mở rộng */}
      <aside
        className={`glass sticky top-0 hidden h-dvh shrink-0 flex-col gap-6 rounded-r-3xl p-4 transition-all duration-300 lg:flex ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className="flex items-center justify-between">
          {!collapsed ? (
            <Logo to="/" />
          ) : (
            <Logo to="/" size={36} />
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="grid size-11 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-white/80 hover:text-ink cursor-pointer"
            aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {collapsed ? <ChevronRight size={18} aria-hidden /> : <ChevronLeft size={18} aria-hidden />}
          </button>
        </div>

        <nav aria-label="Dashboard" className="flex flex-col gap-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={navClass}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className="shrink-0" aria-hidden />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl bg-white/60 p-3.5">
          {!collapsed ? (
            <>
              <p className="text-xs font-medium text-ink-soft">Xin chào,</p>
              <p className="truncate font-bold text-ink">{name}</p>
              <button
                type="button"
                onClick={logout}
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-flame-deep hover:underline cursor-pointer"
              >
                <LogOut size={18} aria-hidden /> Đăng xuất
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                {name.charAt(0).toUpperCase()}
              </span>
              <button
                type="button"
                onClick={logout}
                className="grid size-11 place-items-center rounded-xl text-flame-deep hover:bg-white cursor-pointer"
                aria-label="Đăng xuất"
                title="Đăng xuất"
              >
                <LogOut size={18} aria-hidden />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header mobile */}
        <header className="glass sticky top-0 z-30 flex items-center justify-between px-4 py-2 lg:hidden">
          <Logo to="/" size={34} />
          <button
            type="button"
            onClick={logout}
            className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-white/70"
            aria-label="Đăng xuất"
          >
            <LogOut size={20} aria-hidden />
          </button>
        </header>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          <Outlet />
        </main>

        {/* Bottom nav mobile */}
        <nav
          aria-label="Dashboard"
          className="glass-strong fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 bg-white/95! grid auto-cols-fr grid-flow-col gap-1 rounded-3xl p-1.5 lg:hidden"
        >
          {nav.map(({ to, short, icon: Icon }) => (
            <NavLink key={to} to={to} className={(s) => `${navClass(s)} justify-center`}>
              <Icon size={20} aria-hidden /> {short}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
