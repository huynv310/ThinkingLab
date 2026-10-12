import { Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AuthButtons } from '../../components/AuthButtons'
import { Logo } from '../../components/Logo'
import { sound } from '../../lib/sound'

const LINKS = [
  { href: '#van-de', label: 'Vấn đề' },
  { href: '#lo-trinh', label: 'Lộ trình' },
  { href: '#dang-ky', label: 'Tham gia' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [soundActive, setSoundActive] = useState(sound.isEnabled())

  useEffect(() => {
    let lastY = 0
    const onScroll = () => {
      const currentY = window.scrollY
      if (currentY > 60 && currentY > lastY) {
        setScrolled(true)
      } else if (currentY <= 30 || currentY < lastY) {
        setScrolled(false)
      }
      lastY = currentY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    const unsub = sound.subscribe(setSoundActive)
    return () => {
      window.removeEventListener('scroll', onScroll)
      unsub()
    }
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-2.5 sm:px-4 sm:pt-4 transition-transform duration-300">
      <nav
        aria-label="Điều hướng chính"
        className={`mx-auto flex items-center justify-between gap-4 rounded-full py-1.5 pr-2 pl-3.5 sm:py-2 sm:pr-2.5 sm:pl-4 transition-all duration-300 ${
          scrolled
            ? 'max-w-4xl bg-slate-950/90 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
            : 'max-w-6xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-lg'
        }`}
      >
        <div className="flex items-center gap-2 shrink-0">
          <Logo size={36} />
        </div>

        <ul className="hidden items-center gap-1 md:flex shrink-0">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                data-lenis-anchor
                className="inline-flex min-h-11 items-center rounded-full px-3.5 sm:px-4 text-sm sm:text-base font-semibold text-slate-200 whitespace-nowrap transition-colors hover:bg-white/10 hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Nút bật/tắt âm thanh tương tác */}
          <button
            type="button"
            onClick={() => sound.toggle()}
            aria-label={soundActive ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
            title={soundActive ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}
            className="grid size-11 place-items-center rounded-full text-slate-300 transition-colors hover:bg-white/15 hover:text-white cursor-pointer shrink-0"
          >
            {soundActive ? <Volume2 size={18} className="text-cyan-400" aria-hidden /> : <VolumeX size={18} aria-hidden />}
          </button>

          <div className="shrink-0 flex items-center whitespace-nowrap">
            <AuthButtons />
          </div>
        </div>
      </nav>
    </header>
  )
}
