export const PLAYFUL_THINKING_PHRASES = [
  'Để mình nghĩ nha…',
  'Mình đang nghĩ đó…',
  'Đợi tôi nghĩ đã…',
  'Chờ xíu, não đang load 99% nè…',
  'Gượm đã, đang cân não phản biện đây…',
  'Đang lục tìm dữ liệu phản biện nè…',
  'Đang suy nghĩ nè, đừng hối nha 😉',
  'Pha này căng, đợi mình 3 giây gom lý lẽ…',
  'Đang gom chất xám mổ xẻ nè…',
  'Chờ tí nha, đối đáp bén ngót tới liền!',
  'Đang bắt mạch lập luận của bạn…',
  'Để mình suy nghĩ xíu nha 🤔',
  'Đợi tí, đang tra cứu kho tàng logic…',
  'Đang tư duy phản biện cấp tốc…',
] as const

export type ThinkingPhrase = (typeof PLAYFUL_THINKING_PHRASES)[number]

/**
 * Chọn ngẫu nhiên một câu tinh nghịch khi bot đang suy nghĩ.
 * Nếu truyền `exclude`, hàm sẽ tránh lặp lại câu đó khi đổi câu.
 */
export function getRandomThinkingPhrase(exclude?: string): string {
  const pool = exclude
    ? PLAYFUL_THINKING_PHRASES.filter((phrase) => phrase !== exclude)
    : PLAYFUL_THINKING_PHRASES

  const targetPool = pool.length > 0 ? pool : PLAYFUL_THINKING_PHRASES
  const index = Math.floor(Math.random() * targetPool.length)
  return targetPool[index]
}
