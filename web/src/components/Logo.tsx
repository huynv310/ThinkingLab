import { Link } from 'react-router-dom'
import logo from '../assets/logo.webp'

export function Logo({ to = '/', size = 40, withText = true }: { to?: string; size?: number; withText?: boolean }) {
  return (
    <Link to={to} className="flex min-h-11 items-center gap-2.5 rounded-full" aria-label="ThinkingLab – trang chủ">
      <img src={logo} alt="" width={size} height={size} className="shrink-0" />
      {withText && (
        <span className="text-lg font-extrabold tracking-tight">
          <span className="text-brand">Thinking</span>
          <span className="text-flame-deep">Lab</span>
        </span>
      )}
    </Link>
  )
}
