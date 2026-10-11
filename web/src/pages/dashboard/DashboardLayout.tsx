import { BookOpen, LogOut, MessageCircleHeart, ShieldCheck } from 'lucide-react'
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

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-12 items-center gap-3 rounded-2xl px-4 font-semibold transition-colors ${
    isActive ? 'bg-brand text-white shadow-[0_10px_24px_-12px_rgb(43_79_216/0.8)]' : 'text-ink-soft hover:bg-white/70 hover:text-ink'
  }`

export default function DashboardLayout() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const name = displayName(session)
  const { isAdmin } = useIsAdmin()
  const nav = isAdmin ? [...NAV, ADMIN_NAV] : NAV

  async function logout() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="glass sticky top-0 hidden h-dvh w-72 shrink-0 flex-col gap-8 rounded-r-3xl p-5 lg:flex">
        <Logo to="/" />
        <nav aria-label="Dashboard" className="flex flex-col gap-1.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navClass}>
              <Icon size={20} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-white/60 p-4">
          <p className="text-sm text-ink-soft">Xin chào,</p>
          <p className="truncate font-bold">{name}</p>
          <button onClick={logout} className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-flame-deep hover:underline">
            <LogOut size={18} aria-hidden /> Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header mobile */}
        <header className="glass sticky top-0 z-30 flex items-center justify-between px-4 py-2 lg:hidden">
          <Logo to="/" size={34} />
          <button onClick={logout} className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-white/70" aria-label="Đăng xuất">
            <LogOut size={20} aria-hidden />
          </button>
        </header>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          <Outlet />
        </main>

        {/* Bottom nav mobile */}
        <nav aria-label="Dashboard" className="glass-strong fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 bg-white/95! grid auto-cols-fr grid-flow-col gap-1 rounded-3xl p-1.5 lg:hidden">
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
