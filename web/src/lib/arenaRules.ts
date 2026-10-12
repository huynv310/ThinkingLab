import { Award, ShieldCheck, Trophy, Zap } from 'lucide-react'

export interface SkillMetric {
  code: 'A' | 'R' | 'E'
  name: string
  label: string
  score: number
  gradient: string
}

export interface UnlockedBadge {
  id: string
  title: string
  desc: string
  icon: typeof ShieldCheck
}

export interface ArenaMetricsResult {
  hasData: boolean
  totalUserTurns: number
  totalConversations: number
  rankTitle: string
  level: number
  averageScore: number
  metrics: SkillMetric[]
  badges: UnlockedBadge[]
}

export interface DbMessage {
  id: number
  conversation_id: string
  sender_type: 'USER' | 'BOT'
  content: string
  fallacy_code: string | null
  created_at: string
}

export interface DbConversation {
  id: string
  topic: string | null
  custom_topic: string | null
  created_at: string
}

// Từ khóa & mẫu nhận diện biểu đạt quan điểm (Assertion)
const ASSERTION_REGEX = /\b(tôi|mình|em|quan điểm|nghĩ|thấy|đồng ý|phản đối|cho rằng|nên|không nên|chọn|nghiêng về|khẳng định|bác bỏ|ủng hộ|lập luận)\b/i
const EVASION_REGEX = /^(không biết|sao cũng được|sao cũng xong|kệ|tùy|chắc vậy|chắc thế|ờ|ừ|hả)$/i

// Từ khóa & liên từ lập luận logic (Reasoning)
const REASONING_CONNECTORS = /\b(vì|bởi vì|do|tại vì|bởi lẽ|cho nên|vì vậy|do đó|nguyên nhân|lý do|dẫn đến|nếu|thì|tuy nhiên|mặt khác|ngược lại|hệ quả|bản chất|nhưng|giả sử)\b/gi

// Từ khóa & dữ liệu kiểm chứng (Evidence)
const EVIDENCE_NUMBERS = /\b\d+(\.\d+)?(%| phần trăm| người| sinh viên| vụ| lần| triệu| tỷ| nghìn)?\b/i
const EVIDENCE_TERMS = /\b(số liệu|thống kê|khảo sát|tỷ lệ|con số|nghiên cứu|chuyên gia|báo cáo|khoa học|luật|nghị định|thực nghiệm|nguồn|tài liệu|chứng minh|kiểm chứng|ví dụ|cụ thể|điển hình|trường hợp|thực tế|thực tiễn)\b/i

/**
 * Đánh giá điểm ARE cho từng tin nhắn của người dùng (0 - 100).
 */
export function scoreUserMessage(content: string, fallacyCode: string | null) {
  const text = (content || '').trim()
  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  // 1. Assertion (A) - Luận điểm trực diện
  let a = 35
  if (EVASION_REGEX.test(text) || wordCount < 4) {
    a = 25
  } else {
    if (wordCount >= 12) a = 75
    else if (wordCount >= 6) a = 60
    if (ASSERTION_REGEX.test(text)) a += 20
  }
  a = Math.min(100, Math.max(10, a))

  // 2. Reasoning (R) - Lý lẽ logic
  let r = 40
  const matches = text.match(REASONING_CONNECTORS) || []
  const connectorCount = matches.length
  if (connectorCount >= 2) r = 85
  else if (connectorCount === 1) r = 70
  else if (wordCount >= 20) r = 60

  // Nếu bị hệ thống AI bắt ngụy biện -> trừ điểm lý lẽ
  if (fallacyCode) {
    r = Math.min(r, 45)
    r = Math.max(15, r - 20)
  }
  r = Math.min(100, Math.max(10, r))

  // 3. Evidence (E) - Dẫn chứng có căn cứ
  let e = 30
  const hasNumbers = EVIDENCE_NUMBERS.test(text)
  const hasTerms = EVIDENCE_TERMS.test(text)

  if (hasNumbers && hasTerms) e = 92
  else if (hasNumbers || hasTerms) e = 78
  else if (wordCount >= 25) e = 50
  e = Math.min(100, Math.max(10, e))

  return { a, r, e }
}

/**
 * Tính toán toàn bộ chỉ số ARE và huy hiệu phòng thủ ngụy biện từ dữ liệu thật.
 * Tuyệt đối không sinh dữ liệu ảo: cái nào không có sẽ không hiện.
 */
export function computeArenaMetrics(
  conversations: DbConversation[],
  messages: DbMessage[]
): ArenaMetricsResult {
  const userMessages = messages.filter((m) => m.sender_type === 'USER')

  if (userMessages.length === 0) {
    return {
      hasData: false,
      totalUserTurns: 0,
      totalConversations: conversations.length,
      rankTitle: 'Chưa có xếp hạng',
      level: 0,
      averageScore: 0,
      metrics: [],
      badges: [],
    }
  }

  // Tính điểm trung bình ARE qua toàn bộ tin nhắn người dùng
  let totalA = 0
  let totalR = 0
  let totalE = 0
  let highEvidenceCount = 0

  for (const msg of userMessages) {
    const scores = scoreUserMessage(msg.content, msg.fallacy_code)
    totalA += scores.a
    totalR += scores.r
    totalE += scores.e
    if (scores.e >= 75) highEvidenceCount++
  }

  const count = userMessages.length
  const scoreA = Math.round(totalA / count)
  const scoreR = Math.round(totalR / count)
  const scoreE = Math.round(totalE / count)
  const averageScore = Math.round((scoreA + scoreR + scoreE) / 3)

  // Cấp độ và Danh hiệu phản biện dựa trên số lượt trao đổi thực tế
  let level = 1
  let rankTitle = 'Tập sự phản biện · Cấp 1'
  if (count >= 30) {
    level = 4
    rankTitle = 'Bậc thầy lập luận · Cấp 4'
  } else if (count >= 15) {
    level = 3
    rankTitle = 'Nhà phản biện sắc bén · Cấp 3'
  } else if (count >= 5) {
    level = 2
    rankTitle = 'Người tranh biện tích cực · Cấp 2'
  }

  const metrics: SkillMetric[] = [
    {
      name: 'Assertion',
      code: 'A',
      label: 'Luận điểm trực diện',
      score: scoreA,
      gradient: 'from-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(34,211,238,0.5)]',
    },
    {
      name: 'Reasoning',
      code: 'R',
      label: 'Lý lẽ đa chiều',
      score: scoreR,
      gradient: 'from-indigo-400 to-cyan-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]',
    },
    {
      name: 'Evidence',
      code: 'E',
      label: 'Dẫn chứng có căn cứ',
      score: scoreE,
      gradient: 'from-amber-400 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]',
    },
  ]

  // Huy hiệu: Chỉ trả về những huy hiệu THỰC SỰ ĐÃ MỞ (cái nào không có không được hiện)
  const topics = new Set(conversations.map((c) => c.topic).filter(Boolean))
  const fallacies = new Set(userMessages.map((m) => m.fallacy_code).filter(Boolean))

  const badges: UnlockedBadge[] = []

  // 1. Khắc tinh Ad Hominem
  if ((topics.has('boc-phot') || count >= 5) && !fallacies.has('AD_HOMINEM')) {
    badges.push({
      id: 'ad-hominem',
      title: 'Khắc tinh Ad Hominem',
      desc: 'Bẻ gãy công kích cá nhân, bảo vệ luận điểm thép',
      icon: ShieldCheck,
    })
  }

  // 2. Thợ săn Chi phí chìm
  if ((topics.has('chi-phi-chim') || count >= 5) && !fallacies.has('SUNK_COST')) {
    badges.push({
      id: 'sunk-cost',
      title: 'Thợ săn Chi phí chìm',
      desc: 'Dừng kịp thời phương án ngõ cụt, tránh lãng phí nguồn lực',
      icon: Zap,
    })
  }

  // 3. Vượt bẫy Thiên kiến
  if ((topics.has('ngon-ngu-lap-trinh') || count >= 5) && !fallacies.has('CONFIRMATION_BIAS')) {
    badges.push({
      id: 'confirmation-bias',
      title: 'Vượt bẫy Thiên kiến',
      desc: 'Tìm kiếm chứng cứ phản biện quan điểm cá nhân',
      icon: Award,
    })
  }

  // 4. Khắc phục Khái quát vội
  if ((topics.has('giang-vien-a') || count >= 5) && !fallacies.has('HASTY_GENERALIZATION')) {
    badges.push({
      id: 'hasty-generalization',
      title: 'Khắc phục Khái quát vội',
      desc: 'Không vội vã đánh đồng từ thiểu số trường hợp',
      icon: ShieldCheck,
    })
  }

  // 5. Tư duy độc lập
  if ((topics.has('dam-dong') || count >= 5) && !fallacies.has('BANDWAGON') && !fallacies.has('HERD_MENTALITY')) {
    badges.push({
      id: 'independent-mind',
      title: 'Tư duy độc lập',
      desc: 'Giữ vững lập trường lý lẽ, không cuốn theo tâm lý đám đông',
      icon: Zap,
    })
  }

  // 6. Bậc thầy Dẫn chứng CRAAP
  if (topics.has('ai-ao-giac') || highEvidenceCount >= 2) {
    badges.push({
      id: 'craap-evidence',
      title: 'Dẫn chứng xác thực',
      desc: 'Cung cấp số liệu, trích dẫn nghiên cứu có kiểm chứng',
      icon: Award,
    })
  }

  // 7. Chiến binh Đấu trường
  if (count >= 10 && averageScore >= 70) {
    badges.push({
      id: 'arena-veteran',
      title: 'Chiến binh Đấu trường',
      desc: 'Hoàn thành trên 10 lượt tranh biện với phong độ vững vàng',
      icon: Trophy,
    })
  }

  return {
    hasData: true,
    totalUserTurns: count,
    totalConversations: conversations.length,
    rankTitle,
    level,
    averageScore,
    metrics,
    badges,
  }
}
