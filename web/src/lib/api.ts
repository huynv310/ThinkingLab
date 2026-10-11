import { supabase } from './supabase'

export type FallacyCode = 'HASTY_GENERALIZATION' | 'AD_HOMINEM' | 'STRAW_MAN'

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
  if (!res.ok) throw new Error(json.error ?? 'Không kết nối được máy chủ')
  return json as T
}

export const startChat = (topic: string) =>
  callChat<{ conversation: Conversation; messages: ChatMessage[] }>({ action: 'start', topic })

export const sendReply = (conversationId: string, content: string) =>
  callChat<{ messages: ChatMessage[] }>({ action: 'reply', conversation_id: conversationId, content })

// Đọc trực tiếp qua RLS (chỉ thấy dữ liệu của chính mình)
export async function listConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, topic, status, last_interacted_at, context_summary')
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
