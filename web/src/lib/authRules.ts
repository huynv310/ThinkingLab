// Luật kiểm tra form đăng ký. Supabase Auth kiểm tra lại phía server
// (độ dài tối thiểu + loại ký tự bắt buộc cấu hình trong dashboard).

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

/** Trả về thông báo lỗi, hoặc null nếu email hợp lệ về mặt định dạng. */
export function emailError(raw: string): string | null {
  const email = normalizeEmail(raw)
  if (!email) return 'Nhập email của bạn'
  if (email.length > 254 || !EMAIL.test(email)) return 'Email không đúng định dạng (ví dụ: ten@gmail.com)'
  const [local, domain] = email.split('@')
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || email.includes('..')) {
    return 'Email không đúng định dạng (ví dụ: ten@gmail.com)'
  }
  if (domain.split('.').some((label) => label.startsWith('-') || label.endsWith('-'))) {
    return 'Tên miền của email không hợp lệ'
  }
  return null
}

const COMMON_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'fpt.edu.vn']

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = cur
    }
  }
  return row[b.length]
}

/** Gợi ý sửa lỗi gõ tên miền phổ biến: "an@gmial.com" -> "an@gmail.com". */
export function suggestEmail(raw: string): string | null {
  const email = normalizeEmail(raw)
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const domain = email.slice(at + 1)
  if (!domain || COMMON_DOMAINS.includes(domain)) return null
  const best = COMMON_DOMAINS.find((d) => distance(domain, d) <= 2)
  return best ? `${email.slice(0, at)}@${best}` : null
}

// Ký hiệu khớp với danh sách Supabase Auth chấp nhận cho "symbols"
const SYMBOL = /[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/

export const MIN_PASSWORD_LENGTH = 8

export interface PasswordRule {
  id: string
  label: string
  test: (password: string, email: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: `Ít nhất ${MIN_PASSWORD_LENGTH} ký tự`, test: (p) => p.length >= MIN_PASSWORD_LENGTH },
  { id: 'lower', label: 'Có chữ thường (a–z)', test: (p) => /[a-z]/.test(p) },
  { id: 'upper', label: 'Có chữ hoa (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'digit', label: 'Có chữ số (0–9)', test: (p) => /[0-9]/.test(p) },
  { id: 'symbol', label: 'Có ký tự đặc biệt (!@#$%…)', test: (p) => SYMBOL.test(p) },
  {
    id: 'email',
    label: 'Không chứa tên email của bạn',
    test: (p, email) => {
      const name = normalizeEmail(email).split('@')[0]
      return name.length < 3 || !p.toLowerCase().includes(name)
    },
  },
]

export const passwordOk = (password: string, email: string) => PASSWORD_RULES.every((r) => r.test(password, email))
