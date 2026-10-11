import { CalendarClock, MessageCircle, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { formatTokens, quotaStatus, type QuotaLevel, type QuotaStatus } from '../lib/quota'

/**
 * 2 vòng donut hiển thị hạn mức còn lại (cuộc trò chuyện + hôm nay). Bấm vào -> popover
 * chi tiết dạng thanh ngang. Màu chỉ là tín hiệu phụ: luôn có số % và chữ đi kèm.
 */

type Tone = 'teal' | 'brand'

// Màu cung tròn theo mức; cảnh báo dùng chung amber/flame để người dùng nhận ra ngay
const ARC: Record<Tone, Record<QuotaLevel, string>> = {
  teal: { ok: 'stroke-teal', low: 'stroke-amber', critical: 'stroke-flame', empty: 'stroke-ink/20' },
  brand: { ok: 'stroke-brand', low: 'stroke-amber', critical: 'stroke-flame', empty: 'stroke-ink/20' },
}
const BAR: Record<Tone, Record<QuotaLevel, string>> = {
  teal: { ok: 'bg-teal', low: 'bg-amber', critical: 'bg-flame', empty: 'bg-ink/20' },
  brand: { ok: 'bg-brand', low: 'bg-amber', critical: 'bg-flame', empty: 'bg-ink/20' },
}
const LEVEL_TEXT: Record<QuotaLevel, string> = {
  ok: 'text-ink-soft',
  low: 'text-flame-deep',
  critical: 'text-flame-deep',
  empty: 'text-flame-deep',
}

const SIZE = 40
const STROKE = 4.5
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

function Ring({ status, tone, icon }: { status: QuotaStatus; tone: Tone; icon: ReactNode }) {
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} className="stroke-ink/10" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - status.remaining)}
          className={`${ARC[tone][status.level]} motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out`}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs leading-none font-extrabold tabular-nums text-ink">
        {status.level === 'empty' ? icon : status.percentLeft}
      </span>
    </span>
  )
}

function Row({
  status,
  tone,
  icon,
  title,
  note,
}: {
  status: QuotaStatus
  tone: Tone
  icon: ReactNode
  title: string
  note: string
}) {
  const headline = status.level === 'empty' ? 'Đã hết lượt' : `Còn ~${status.turnsLeft} lượt`
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 font-semibold whitespace-nowrap">
          {icon}
          {title}
        </span>
        <span className={`text-sm font-bold whitespace-nowrap ${LEVEL_TEXT[status.level]}`}>{headline}</span>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-label={`${title}: phần còn lại`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={status.percentLeft}
        aria-valuetext={`Còn ${status.percentLeft}%, ${headline.toLowerCase()}`}
      >
        <div
          className={`h-full rounded-full ${BAR[tone][status.level]} motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out`}
          style={{ width: `${status.remaining * 100}%` }}
        />
      </div>
      <p className="mt-1.5 flex justify-between gap-2 text-xs text-ink-soft">
        <span className="tabular-nums">
          {formatTokens(status.used)} / {formatTokens(status.limit)} token
        </span>
        <span>{note}</span>
      </p>
    </div>
  )
}

export function QuotaRings({
  used,
  limit,
  dailyUsed,
  dailyLimit,
}: {
  used: number
  limit: number
  dailyUsed: number
  dailyLimit: number
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const chat = quotaStatus(used, limit)
  const daily = quotaStatus(dailyUsed, dailyLimit)

  // Đóng khi bấm ra ngoài hoặc Esc (Esc trả focus về nút để không lạc vị trí bàn phím)
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const chatIcon = <MessageCircle size={14} className="text-teal-deep" aria-hidden />
  const dailyIcon = <CalendarClock size={14} className="text-brand" aria-hidden />

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Hạn mức trò chuyện: cuộc này còn ${chat.percentLeft}%, hôm nay còn ${daily.percentLeft}%. Bấm để xem chi tiết`}
        title="Hạn mức trò chuyện"
        className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full p-1 transition-colors hover:bg-white/70 aria-expanded:bg-white/80 aria-expanded:shadow-sm"
        data-testid="quota-button"
      >
        <Ring status={chat} tone="teal" icon={chatIcon} />
        <Ring status={daily} tone="brand" icon={dailyIcon} />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Chi tiết hạn mức"
          className="glass-strong absolute bg-white/95! border-ink/10! top-full right-0 z-30 mt-2 w-[min(20rem,calc(100vw-1.5rem))] origin-top-right rounded-2xl p-4 shadow-xl motion-safe:animate-[quota-pop_160ms_ease-out]"
          data-testid="quota-panel"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold">Hạn mức trò chuyện</h3>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                buttonRef.current?.focus()
              }}
              className="-mr-3 -my-1 grid size-11 cursor-pointer place-items-center rounded-full hover:bg-ink/5"
              aria-label="Đóng chi tiết hạn mức"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <div className="mt-3 space-y-4">
            <Row status={chat} tone="teal" icon={chatIcon} title="Cuộc trò chuyện này" note="Mở cuộc mới để làm mới" />
            <Row status={daily} tone="brand" icon={dailyIcon} title="Hôm nay" note="Làm mới lúc 0h" />
          </div>
          <p className="mt-4 border-t border-ink/10 pt-3 text-xs text-ink-soft">
            Mỗi lượt khoảng 750 token. Tin nhắn bị chặn hoặc trả lời dự phòng không bị tính.
          </p>
        </div>
      )}
    </div>
  )
}
