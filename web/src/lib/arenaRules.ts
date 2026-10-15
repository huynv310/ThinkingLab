import { Award, ShieldAlert, ShieldCheck, Trophy, Zap } from 'lucide-react'

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

export interface RevokedBadge {
  id: string
  title: string
  desc: string
  revokedReason: string
  icon: typeof ShieldAlert
}

export type RankTier = 'NOVICE' | 'ACTIVE' | 'SHARP' | 'MASTER' | 'GRANDMASTER'

export interface ArenaMetricsResult {
  hasData: boolean
  totalUserTurns: number
  totalConversations: number
  rankTitle: string
  rankTier: RankTier
  level: number
  averageScore: number
  recentFlawCount: number
  cleanStreak: number
  penaltyPoints: number
  metrics: SkillMetric[]
  badges: UnlockedBadge[]
  revokedBadges: RevokedBadge[]
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

// 11 Bẫy ngụy biện logic và thiên kiến nhận thức đồng bộ hệ thống
export const LOGICAL_FALLACIES = [
  'HASTY_GENERALIZATION',
  'AD_HOMINEM',
  'STRAW_MAN',
  'SLIPPERY_SLOPE',
  'FALSE_DILEMMA',
  'BANDWAGON',
] as const

export const COGNITIVE_BIASES = [
  'CONFIRMATION_BIAS',
  'HERD_MENTALITY',
  'SUNK_COST',
  'OVERCONFIDENCE_BIAS',
  'INGROUP_BIAS',
] as const

export const ALL_COGNITIVE_FLAWS = [...LOGICAL_FALLACIES, ...COGNITIVE_BIASES] as const

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
 * Phân tích tác động chuyên sâu của 11 bẫy logic & thiên kiến vào 3 trụ cột A - R - E:
 * - Reasoning Flaws (AD_HOMINEM, STRAW_MAN, FALSE_DILEMMA, SLIPPERY_SLOPE) -> Đánh sập trụ cột R.
 * - Evidence Biases (HASTY_GENERALIZATION, CONFIRMATION_BIAS, SUNK_COST) -> Đánh sập trụ cột E.
 * - Sociocognitive Biases (OVERCONFIDENCE_BIAS, BANDWAGON, HERD_MENTALITY, INGROUP_BIAS) -> Đánh sập A và R.
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

  // Phạt bẫy nhận thức ảnh hưởng Luận điểm
  if (fallacyCode === 'OVERCONFIDENCE_BIAS') {
    a = Math.max(15, a - 35)
  } else if (fallacyCode === 'BANDWAGON' || fallacyCode === 'HERD_MENTALITY' || fallacyCode === 'INGROUP_BIAS') {
    a = Math.max(15, a - 25)
  }
  a = Math.min(100, Math.max(10, a))

  // 2. Reasoning (R) - Lý lẽ logic
  let r = 40
  const matches = text.match(REASONING_CONNECTORS) || []
  const connectorCount = matches.length
  if (connectorCount >= 2) r = 85
  else if (connectorCount === 1) r = 70
  else if (wordCount >= 20) r = 60

  // Phạt bẫy ngụy biện logic
  if (fallacyCode) {
    if (
      fallacyCode === 'AD_HOMINEM' ||
      fallacyCode === 'STRAW_MAN' ||
      fallacyCode === 'FALSE_DILEMMA' ||
      fallacyCode === 'SLIPPERY_SLOPE'
    ) {
      // Ngụy biện logic trực diện: Lý lẽ bị đánh gục hoàn toàn
      r = Math.max(10, Math.min(25, r - 45))
    } else {
      r = Math.max(15, Math.min(45, r - 25))
    }
  }
  r = Math.min(100, Math.max(10, r))

  // 3. Evidence (E) - Dẫn chứng có căn cứ
  let e = 30
  const hasNumbers = EVIDENCE_NUMBERS.test(text)
  const hasTerms = EVIDENCE_TERMS.test(text)

  if (hasNumbers && hasTerms) e = 92
  else if (hasNumbers || hasTerms) e = 78
  else if (wordCount >= 25) e = 50

  // Phạt bẫy ngụy biện / thiên kiến ảnh hưởng Dẫn chứng
  if (fallacyCode === 'HASTY_GENERALIZATION' || fallacyCode === 'CONFIRMATION_BIAS' || fallacyCode === 'SUNK_COST') {
    e = Math.max(10, Math.min(25, e - 40))
  } else if (fallacyCode) {
    e = Math.max(15, e - 15)
  }
  e = Math.min(100, Math.max(10, e))

  return { a, r, e }
}

/**
 * Tính toán toàn bộ chỉ số ARE, bậc rank và huy hiệu phòng thủ ngụy biện.
 * - Áp dụng Recency Weighting (trọng số 65% cho 10 lượt gần nhất) để điểm số phản ánh phong độ thực tế.
 * - Tụt rank khi mắc bẫy nhận thức / ngụy biện.
 * - Cấp huy hiệu và thu hồi huy hiệu dựa vào các phản hồi gần đây của người dùng.
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
      rankTier: 'NOVICE',
      level: 0,
      averageScore: 0,
      recentFlawCount: 0,
      cleanStreak: 0,
      penaltyPoints: 0,
      metrics: [],
      badges: [],
      revokedBadges: [],
    }
  }

  const count = userMessages.length
  const scoredMessages = userMessages.map((m) => ({
    msg: m,
    scores: scoreUserMessage(m.content, m.fallacy_code),
  }))

  let scoreA = 0
  let scoreR = 0
  let scoreE = 0
  let highEvidenceCount = 0

  for (const item of scoredMessages) {
    if (item.scores.e >= 75) highEvidenceCount++
  }

  // 1. Recency-Weighted Scoring: Phong độ gần nhất quyết định 65% điểm số
  if (count <= 5) {
    const totalA = scoredMessages.reduce((sum, s) => sum + s.scores.a, 0)
    const totalR = scoredMessages.reduce((sum, s) => sum + s.scores.r, 0)
    const totalE = scoredMessages.reduce((sum, s) => sum + s.scores.e, 0)
    scoreA = Math.round(totalA / count)
    scoreR = Math.round(totalR / count)
    scoreE = Math.round(totalE / count)
  } else {
    const recentWindow = scoredMessages.slice(-10)
    const olderWindow = scoredMessages.slice(0, -10)

    const recentA = recentWindow.reduce((sum, s) => sum + s.scores.a, 0) / recentWindow.length
    const recentR = recentWindow.reduce((sum, s) => sum + s.scores.r, 0) / recentWindow.length
    const recentE = recentWindow.reduce((sum, s) => sum + s.scores.e, 0) / recentWindow.length

    if (olderWindow.length > 0) {
      const olderA = olderWindow.reduce((sum, s) => sum + s.scores.a, 0) / olderWindow.length
      const olderR = olderWindow.reduce((sum, s) => sum + s.scores.r, 0) / olderWindow.length
      const olderE = olderWindow.reduce((sum, s) => sum + s.scores.e, 0) / olderWindow.length

      scoreA = Math.round(recentA * 0.65 + olderA * 0.35)
      scoreR = Math.round(recentR * 0.65 + olderR * 0.35)
      scoreE = Math.round(recentE * 0.65 + olderE * 0.35)
    } else {
      scoreA = Math.round(recentA)
      scoreR = Math.round(recentR)
      scoreE = Math.round(recentE)
    }
  }

  // 2. Tính chuỗi sạch lỗi (Clean Streak) & Lỗi trong 5 lượt gần nhất (Recent Flaws)
  const last5 = userMessages.slice(-5)
  const recentFlawCount = last5.filter((m) => Boolean(m.fallacy_code)).length

  let cleanStreak = 0
  for (let i = userMessages.length - 1; i >= 0; i--) {
    if (userMessages[i].fallacy_code) break
    cleanStreak++
  }

  // 3. Phạt trừ điểm khi mắc lỗi ngụy biện gần đây (Cognitive Penalty) & Thưởng phong độ
  let penaltyPoints = 0
  if (recentFlawCount >= 3) {
    penaltyPoints = 12
  } else if (recentFlawCount === 2) {
    penaltyPoints = 7
  } else if (recentFlawCount === 1) {
    penaltyPoints = 3
  }

  let bonusPoints = 0
  if (cleanStreak >= 8 && count >= 8) {
    bonusPoints = 4
  } else if (cleanStreak >= 4 && count >= 4) {
    bonusPoints = 2
  }

  // Điểm trung bình ARE thực tế sau phạt / thưởng
  const rawAverage = Math.round((scoreA + scoreR + scoreE) / 3)
  const averageScore = Math.min(100, Math.max(10, rawAverage - penaltyPoints + bonusPoints))

  // 4. Thiết lập BẬC RANK theo CHỈ SỐ THỰC TẾ & Kiểm soát Tụt Rank (Rank Demotion)
  let level = 1
  let rankTitle = 'Tập sự phản biện · Cấp 1'
  let rankTier: RankTier = 'NOVICE'

  if (averageScore >= 93 && count >= 20 && scoreA >= 80 && scoreR >= 80 && scoreE >= 80 && cleanStreak >= 8) {
    level = 5
    rankTitle = 'Đại kiện tướng tư duy · Cấp 5'
    rankTier = 'GRANDMASTER'
  } else if (averageScore >= 85 && count >= 12 && scoreA >= 70 && scoreR >= 70 && scoreE >= 70 && recentFlawCount === 0) {
    level = 4
    rankTitle = 'Bậc thầy lập luận · Cấp 4'
    rankTier = 'MASTER'
  } else if (averageScore >= 70 && count >= 5 && scoreA >= 50 && scoreR >= 50 && scoreE >= 50 && recentFlawCount <= 1) {
    level = 3
    rankTitle = 'Nhà phản biện sắc bén · Cấp 3'
    rankTier = 'SHARP'
  } else if (averageScore >= 50 && count >= 2) {
    level = 2
    rankTitle = 'Người tranh biện tích cực · Cấp 2'
    rankTier = 'ACTIVE'
  } else {
    level = 1
    rankTitle = 'Tập sự phản biện · Cấp 1'
    rankTier = 'NOVICE'
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

  // 5. Cung cấp & THU HỒI HUY HIỆU (Dynamic Badge Earning & Revocation)
  const topics = new Set(conversations.map((c) => c.topic).filter(Boolean))
  const recent5Fallacies = new Set(last5.map((m) => m.fallacy_code).filter(Boolean))

  const badges: UnlockedBadge[] = []
  const revokedBadges: RevokedBadge[] = []

  // Badge 1: Khắc tinh Ad Hominem
  if (topics.has('boc-phot') || count >= 5) {
    if (recent5Fallacies.has('AD_HOMINEM')) {
      revokedBadges.push({
        id: 'ad-hominem',
        title: 'Khắc tinh Ad Hominem',
        desc: 'Bẻ gãy công kích cá nhân, bảo vệ luận điểm thép',
        revokedReason: 'Bị thu hồi do tái phạm công kích cá nhân (Ad Hominem) ở lượt tranh luận gần đây.',
        icon: ShieldAlert,
      })
    } else {
      badges.push({
        id: 'ad-hominem',
        title: 'Khắc tinh Ad Hominem',
        desc: 'Bẻ gãy công kích cá nhân, bảo vệ luận điểm thép',
        icon: ShieldCheck,
      })
    }
  }

  // Badge 2: Thợ săn Chi phí chìm
  if (topics.has('chi-phi-chim') || count >= 5) {
    if (recent5Fallacies.has('SUNK_COST')) {
      revokedBadges.push({
        id: 'sunk-cost',
        title: 'Thợ săn Chi phí chìm',
        desc: 'Dừng kịp thời phương án ngõ cụt, tránh lãng phí nguồn lực',
        revokedReason: 'Bị thu hồi do tiếp tục bám chấp chi phí chìm ở các lượt gần đây.',
        icon: ShieldAlert,
      })
    } else {
      badges.push({
        id: 'sunk-cost',
        title: 'Thợ săn Chi phí chìm',
        desc: 'Dừng kịp thời phương án ngõ cụt, tránh lãng phí nguồn lực',
        icon: Zap,
      })
    }
  }

  // Badge 3: Vượt bẫy Thiên kiến
  if (topics.has('ngon-ngu-lap-trinh') || count >= 5) {
    if (recent5Fallacies.has('CONFIRMATION_BIAS')) {
      revokedBadges.push({
        id: 'confirmation-bias',
        title: 'Vượt bẫy Thiên kiến',
        desc: 'Tìm kiếm chứng cứ phản biện quan điểm cá nhân',
        revokedReason: 'Bị thu hồi do chỉ tìm kiếm chứng cứ một chiều (Thiên kiến xác nhận).',
        icon: ShieldAlert,
      })
    } else {
      badges.push({
        id: 'confirmation-bias',
        title: 'Vượt bẫy Thiên kiến',
        desc: 'Tìm kiếm chứng cứ phản biện quan điểm cá nhân',
        icon: Award,
      })
    }
  }

  // Badge 4: Khắc phục Khái quát vội
  if (topics.has('giang-vien-a') || count >= 5) {
    if (recent5Fallacies.has('HASTY_GENERALIZATION')) {
      revokedBadges.push({
        id: 'hasty-generalization',
        title: 'Khắc phục Khái quát vội',
        desc: 'Không vội vã đánh đồng từ thiểu số trường hợp',
        revokedReason: 'Bị thu hồi do vội vàng quy chụp từ số ít trường hợp ở các lượt gần đây.',
        icon: ShieldAlert,
      })
    } else {
      badges.push({
        id: 'hasty-generalization',
        title: 'Khắc phục Khái quát vội',
        desc: 'Không vội vã đánh đồng từ thiểu số trường hợp',
        icon: ShieldCheck,
      })
    }
  }

  // Badge 5: Tư duy độc lập
  if (topics.has('dam-dong') || count >= 5) {
    if (
      recent5Fallacies.has('BANDWAGON') ||
      recent5Fallacies.has('HERD_MENTALITY') ||
      recent5Fallacies.has('INGROUP_BIAS')
    ) {
      revokedBadges.push({
        id: 'independent-mind',
        title: 'Tư duy độc lập',
        desc: 'Giữ vững lập trường lý lẽ, không cuốn theo tâm lý đám đông',
        revokedReason: 'Bị thu hồi do cuốn theo tâm lý đám đông hoặc thiên vị nhóm gần đây.',
        icon: ShieldAlert,
      })
    } else {
      badges.push({
        id: 'independent-mind',
        title: 'Tư duy độc lập',
        desc: 'Giữ vững lập trường lý lẽ, không cuốn theo tâm lý đám đông',
        icon: Zap,
      })
    }
  }

  // Badge 6: Dẫn chứng xác thực (CRAAP)
  if (highEvidenceCount >= 2 || topics.has('ai-ao-giac')) {
    if (scoreE < 45 || recent5Fallacies.has('HASTY_GENERALIZATION')) {
      revokedBadges.push({
        id: 'craap-evidence',
        title: 'Dẫn chứng xác thực',
        desc: 'Cung cấp số liệu, trích dẫn nghiên cứu có kiểm chứng',
        revokedReason: 'Bị thu hồi do điểm dẫn chứng sa sút hoặc mắc lỗi khái quát vội.',
        icon: ShieldAlert,
      })
    } else {
      badges.push({
        id: 'craap-evidence',
        title: 'Dẫn chứng xác thực',
        desc: 'Cung cấp số liệu, trích dẫn nghiên cứu có kiểm chứng',
        icon: Award,
      })
    }
  }

  // Badge 7: Chiến binh Đấu trường
  if (count >= 10 && averageScore >= 60) {
    if (averageScore < 65 || recentFlawCount >= 2) {
      revokedBadges.push({
        id: 'arena-veteran',
        title: 'Chiến binh Đấu trường',
        desc: 'Hoàn thành trên 10 lượt tranh biện với phong độ vững vàng',
        revokedReason: 'Bị thu hồi do phong độ sa sút hoặc mắc nhiều lỗi ngụy biện gần đây.',
        icon: ShieldAlert,
      })
    } else {
      badges.push({
        id: 'arena-veteran',
        title: 'Chiến binh Đấu trường',
        desc: 'Hoàn thành trên 10 lượt tranh biện với phong độ vững vàng',
        icon: Trophy,
      })
    }
  }

  return {
    hasData: true,
    totalUserTurns: count,
    totalConversations: conversations.length,
    rankTitle,
    rankTier,
    level,
    averageScore,
    recentFlawCount,
    cleanStreak,
    penaltyPoints,
    metrics,
    badges,
    revokedBadges,
  }
}
