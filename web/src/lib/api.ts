import { supabase } from './supabase'

// Khớp messages.fallacy_code (migration 008): 6 ngụy biện + 3 thiên kiến của khóa học
export type FallacyCode =
  | 'HASTY_GENERALIZATION'
  | 'AD_HOMINEM'
  | 'STRAW_MAN'
  | 'SLIPPERY_SLOPE'
  | 'FALSE_DILEMMA'
  | 'BANDWAGON'
  | 'CONFIRMATION_BIAS'
  | 'HERD_MENTALITY'
  | 'SUNK_COST'
  | 'OVERCONFIDENCE_BIAS'
  | 'INGROUP_BIAS'

export interface ChatMessage {
  id: number
  conversation_id: string
  sender_type: 'USER' | 'BOT'
  content: string
  fallacy_code: FallacyCode | null
  meme_url: string | null
  created_at: string
}

export interface Conversation {
  id: string
  topic: string | null
  status: 'ACTIVE' | 'ARCHIVED'
  last_interacted_at: string
  context_summary: string | null
  custom_topic: string | null
  token_count: number
}

/** Token AI đã dùng / hạn mức của 1 cuộc trò chuyện (server tính, client chỉ hiển thị). */
export interface TokenUsage {
  used: number
  limit: number
  daily_used: number
  daily_limit: number
}

// Khớp TOKEN_BUDGET / DAILY_TOKEN_BUDGET ở api/chat.py
export const TOKEN_LIMIT = 30_000
export const DAILY_TOKEN_LIMIT = 150_000
export const CUSTOM_TOPIC_MAX = 120

export class ChatApiError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

async function callChat<T>(body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại')

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new ChatApiError(json.error ?? 'Không kết nối được máy chủ', json.code)
  return json as T
}

export const startChat = (topic: string, customTopic?: string) =>
  callChat<{ conversation: Conversation; messages: ChatMessage[]; usage: TokenUsage }>({
    action: 'start',
    topic,
    ...(customTopic !== undefined && { custom_topic: customTopic }),
  })

export const sendReply = (conversationId: string, content: string) =>
  callChat<{ messages: ChatMessage[]; usage: TokenUsage }>({ action: 'reply', conversation_id: conversationId, content })

/** Ngày theo giờ Việt Nam (YYYY-MM-DD) - hạn mức ngày reset lúc 0h, khớp VN_TZ ở api/chat.py. */
const vnToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })

/** Token AI đã dùng hôm nay (RLS: chỉ đọc được dòng của mình). */
export async function getDailyUsage() {
  const { data, error } = await supabase
    .from('token_usage_daily')
    .select('tokens')
    .eq('day', vnToday())
    .maybeSingle()
  if (error) throw error
  return data?.tokens ?? 0
}

// Đọc trực tiếp qua RLS (chỉ thấy dữ liệu của chính mình)
export async function listConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, topic, status, last_interacted_at, context_summary, custom_topic, token_count')
    .order('last_interacted_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data as Conversation[]
}

export async function listMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_type, content, fallacy_code, meme_url, created_at')
    .eq('conversation_id', conversationId)
    .order('id', { ascending: true })
    .limit(500)
  if (error) throw error
  return data as ChatMessage[]
}
