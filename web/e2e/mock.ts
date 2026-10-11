import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// URL Supabase là thông tin công khai (đã có trong bundle client); chỉ dùng để tính key localStorage
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
export const supabaseUrl = /^VITE_SUPABASE_URL=(.+)$/m.exec(env)?.[1].trim() ?? ''
const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`

export const CONV_ID = '11111111-2222-3333-4444-555555555555'
export const now = new Date().toISOString()

const SESSIONS = [
  ['Trực tiếp', 'Đánh giá năng lực đầu vào & Giải mã bản chất phản biện'],
  ['Online', 'Thiên kiến nhận thức, truy vấn Socrates & mô hình 5 Whys'],
  ['Online', 'Mô hình ARE & cấu trúc PREP trong diễn đạt'],
].map(([format, title], i) => ({
  id: i + 1,
  position: i + 1,
  slug: `buoi-${i + 1}`,
  title,
  format,
  duration: '60 phút',
  goals: ['Mục tiêu mẫu của buổi học.'],
  parts: [{ title: 'Phần 1', points: ['Ý chính mẫu.'] }],
  youtube_id: null,
}))

/** Phiên đăng nhập giả + giả lập mọi request Supabase (không cần tài khoản thật). */
export async function mockSupabase(page: Page, { used = 0, daily = 0, signedIn = true } = {}) {
  if (signedIn) {
    const session = {
      access_token: 'e2e-fake-token',
      refresh_token: 'e2e-fake-refresh',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'u-e2e', aud: 'authenticated', role: 'authenticated', email: 'e2e@thinkinglab.test', user_metadata: { full_name: 'E2E' }, app_metadata: {}, created_at: now },
    }
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [storageKey, JSON.stringify(session)])
  }

  await page.route(`${supabaseUrl}/**`, async (route) => {
    const url = route.request().url()
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.includes('/rest/v1/conversations'))
      return json([{ id: CONV_ID, topic: 'custom', custom_topic: 'Sinh viên có nên đi làm thêm?', status: 'ACTIVE', last_interacted_at: now, context_summary: null, token_count: used }])
    if (url.includes('/rest/v1/messages'))
      return json([{ id: 1, conversation_id: CONV_ID, sender_type: 'BOT', content: 'Bạn nghiêng về phe nào?', fallacy_code: null, meme_url: null, created_at: now }])
    if (url.includes('/rest/v1/token_usage_daily')) return json({ tokens: daily })
    if (url.includes('/rest/v1/course_sessions')) return json(SESSIONS)
    if (url.includes('/rest/v1/rpc/is_admin')) return json(false)
    return json([])
  })
}
