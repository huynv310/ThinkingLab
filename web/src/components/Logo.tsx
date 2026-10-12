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
    <Link
      to={to}
      className={`group flex min-h-11 min-w-11 items-center gap-3 rounded-full shrink-0 ${className}`}
      aria-label="ThinkingLab – trang chủ"
    >
      <span
        className="relative inline-flex shrink-0 aspect-square items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-sky-500 to-amber-400 p-[2px] shadow-[0_0_15px_rgba(34,211,238,0.45)] group-hover:shadow-[0_0_22px_rgba(34,211,238,0.7)] group-hover:scale-105 transition-all duration-300"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <span className="size-full rounded-full bg-white flex items-center justify-center overflow-hidden shadow-inner">
          <img
            src={logo}
            alt="ThinkingLab logo"
            className="size-[84%] object-contain aspect-square select-none filter contrast-105 brightness-105"
          />
        </span>
      </span>
      {withText && (
        <span className="text-xl font-black tracking-tight whitespace-nowrap">
          <span className="text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.55)]">Thinking</span>
          <span className="text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.55)]">Lab</span>
        </span>
      )}
    </Link>
  )
}
