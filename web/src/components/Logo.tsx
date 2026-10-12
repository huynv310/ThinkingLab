import { Link } from 'react-router-dom'
import logo from '../assets/logo.webp'

export function Logo({
  to = '/',
  size = 40,
  withText = true,
  className = '',
}: {
  to?: string
  size?: number
  withText?: boolean
  className?: string
}) {
  return (
    <Link to={to} className={`flex min-h-11 items-center gap-2.5 rounded-full shrink-0 ${className}`} aria-label="ThinkingLab – trang chủ">
      <img src={logo} alt="" width={size} height={size} className="shrink-0 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]" />
      {withText && (
        <span className="text-lg font-extrabold tracking-tight whitespace-nowrap">
          <span className="text-brand">Thinking</span>
          <span className="text-flame-deep">Lab</span>
        </span>
      )}
    </Link>
  )
}
