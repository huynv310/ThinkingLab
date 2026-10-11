// Luật nội dung khóa học dùng chung cho form admin (database/Storage cũng chặn lại lần nữa).

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

/** Trả về YouTube video id từ link (watch, youtu.be, shorts, embed, live) hoặc id; không hợp lệ -> null. */
export function parseYoutubeId(input: string): string | null {
  const s = input.trim()
  if (YOUTUBE_ID.test(s)) return s

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
  } catch {
    return null
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '')
  let id: string | null = null
  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1] ?? null
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.pathname === '/watch' ? url.searchParams.get('v') : (url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/)?.[1] ?? null)
  }
  return id && YOUTUBE_ID.test(id) ? id : null
}

/** Nhúng chế độ riêng tư nâng cao: YouTube không đặt cookie cho tới khi người xem bấm phát. */
export const youtubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`

export const MATERIAL_TYPES = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
} as const
export type MaterialType = keyof typeof MATERIAL_TYPES

export const MAX_MATERIAL_BYTES = 50 * 1024 * 1024

export type FileCheck = { ok: true; type: MaterialType } | { ok: false; error: string }

/** Kiểm tra đuôi, MIME và dung lượng. Chỉ nhận .pdf và .pptx. */
export function checkMaterialFile(file: { name: string; type: string; size: number }): FileCheck {
  const ext = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  if (ext !== 'pdf' && ext !== 'pptx') return { ok: false, error: 'Chỉ nhận file PDF (.pdf) hoặc PowerPoint (.pptx)' }
  if (file.type && file.type !== MATERIAL_TYPES[ext]) return { ok: false, error: 'Nội dung file không khớp với đuôi .' + ext }
  if (file.size <= 0) return { ok: false, error: 'File rỗng' }
  if (file.size > MAX_MATERIAL_BYTES) return { ok: false, error: 'File vượt quá 50 MB' }
  return { ok: true, type: ext }
}

/** Kiểm tra chữ ký đầu file: PDF bắt đầu bằng "%PDF", PPTX là file ZIP ("PK\x03\x04"). */
export function hasValidSignature(type: MaterialType, head: Uint8Array) {
  const sig = type === 'pdf' ? [0x25, 0x50, 0x44, 0x46] : [0x50, 0x4b, 0x03, 0x04]
  return sig.every((b, i) => head[i] === b)
}

/** "Buổi 1: Tư duy Phản biện" -> "buoi-1-tu-duy-phan-bien" */
export function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
}

/** Mỗi dòng không rỗng thành 1 mục. */
export const linesToList = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

export function formatBytes(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`
}
