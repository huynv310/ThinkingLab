import {
  computeArenaMetrics,
  type ArenaMetricsResult,
  type DbConversation,
  type DbMessage,
} from './arenaRules'
import { supabase } from './supabase'

export * from './arenaRules'

/**
 * Tải toàn bộ lịch sử chat của người dùng hiện tại từ Supabase để tính toán chỉ số.
 */
export async function fetchUserArenaData(): Promise<ArenaMetricsResult> {
  const { data: convData, error: convError } = await supabase
    .from('conversations')
    .select('id, topic, custom_topic, created_at')
    .order('created_at', { ascending: false })

  if (convError) throw convError
  const conversations = (convData as DbConversation[]) || []

  if (conversations.length === 0) {
    return computeArenaMetrics([], [])
  }

  const { data: msgData, error: msgError } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_type, content, fallacy_code, created_at')
    .order('created_at', { ascending: true })

  if (msgError) throw msgError
  const messages = (msgData as DbMessage[]) || []

  return computeArenaMetrics(conversations, messages)
}
