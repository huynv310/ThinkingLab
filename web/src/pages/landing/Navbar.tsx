import { AuthButtons } from '../../components/AuthButtons'
import { Logo } from '../../components/Logo'

const LINKS = [
  { href: '#van-de', label: 'Vấn đề' },
  { href: '#hoat-dong', label: 'Hoạt động' },
  { href: '#dang-ky', label: 'Tham gia' },
]

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-3 sm:pt-4">
      <nav
        aria-label="Điều hướng chính"
        className="glass mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full py-2 pr-2 pl-4"
      >
        <Logo size={36} />
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                data-lenis-anchor
                className="inline-flex min-h-11 items-center rounded-full px-4 font-medium text-ink-soft transition-colors hover:bg-white/70 hover:text-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="[&_.btn-ghost]:hidden sm:[&_.btn-ghost]:inline-flex">
          <AuthButtons />
        </div>
      </nav>
    </header>
  )
}
