/** Tính trạng thái hạn mức token để hiển thị (server mới là nơi chặn thật). */

export const TOKENS_PER_TURN = 850 // trung bình đo thực tế sau nâng cấp suy luận đa tầng CoT, dùng để ước lượng số lượt còn lại

export type QuotaLevel = 'ok' | 'low' | 'critical' | 'empty'

export interface QuotaStatus {
  used: number
  limit: number
  left: number
  /** Phần còn lại, 0..1 - vòng donut thể hiện "pin" còn lại như điện thoại */
  remaining: number
  percentLeft: number
  turnsLeft: number
  level: QuotaLevel
}

export function quotaStatus(used: number, limit: number): QuotaStatus {
  const safeUsed = Math.min(Math.max(used, 0), limit)
  const left = limit - safeUsed
  const remaining = limit > 0 ? left / limit : 0
  // Làm tròn xuống để không bao giờ hiện "còn 1%" khi thực tế đã hết
  const percentLeft = Math.floor(remaining * 100)
  const level: QuotaLevel = left <= 0 ? 'empty' : remaining < 0.2 ? 'critical' : remaining < 0.5 ? 'low' : 'ok'
  return { used: safeUsed, limit, left, remaining, percentLeft, turnsLeft: Math.floor(left / TOKENS_PER_TURN), level }
}

export const formatTokens = (n: number) => n.toLocaleString('vi-VN')
