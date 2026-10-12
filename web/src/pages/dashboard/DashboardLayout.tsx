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
    `flex min-h-12 items-center gap-3 rounded-2xl px-3.5 font-semibold transition-all duration-200 ${
      isActive
        ? 'border border-cyan-400/50 bg-cyan-500/20 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
        : 'text-slate-400 hover:bg-white/5 hover:text-white'
    } ${collapsed ? 'justify-center px-0' : ''}`

  return (
    <div className="story-dark min-h-dvh text-slate-100 flex flex-col lg:flex-row relative">
      {/* Sidebar desktop có nút thu gọn/mở rộng */}
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col gap-6 p-4 transition-all duration-300 lg:flex story-glass-strong border-r border-white/10 ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className={`flex items-center ${collapsed ? 'flex-col gap-3 justify-center' : 'justify-between'}`}>
          {!collapsed ? (
            <Logo to="/" />
          ) : (
            <Logo to="/" size={36} withText={false} />
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="grid size-11 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer shrink-0"
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

        <div className="mt-auto rounded-2xl story-glass border border-white/10 p-3.5">
          {!collapsed ? (
            <>
              <p className="text-xs font-medium text-slate-400">Xin chào,</p>
              <p className="truncate font-bold text-white">{name}</p>
              <button
                type="button"
                onClick={logout}
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                <LogOut size={18} aria-hidden /> Đăng xuất
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400 border border-cyan-500/30">
                {name.charAt(0).toUpperCase()}
              </span>
              <button
                type="button"
                onClick={logout}
                className="grid size-11 place-items-center rounded-xl text-rose-400 hover:bg-white/10 hover:text-rose-300 cursor-pointer"
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
        <header className="story-glass-strong border-b border-white/10 sticky top-0 z-30 flex items-center justify-between px-4 py-2 lg:hidden">
          <Logo to="/" size={34} />
          <button
            type="button"
            onClick={logout}
            className="grid size-11 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
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
          className="story-glass-strong border border-white/15 fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 grid auto-cols-fr grid-flow-col gap-1 rounded-3xl p-1.5 lg:hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
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
