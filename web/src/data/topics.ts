// Khớp với TOPICS trong chatbot.py (id lưu ở conversations.topic)
export const TOPICS = [
  { id: 'boc-phot', title: 'Bóc phốt trên mạng xã hội', hint: 'Dũng cảm hay bạo lực mạng?' },
  { id: 'giang-vien-a', title: 'Lời đồn về giảng viên A', hint: 'Tin đàn anh hay tự kiểm chứng?' },
  { id: 'dam-dong', title: 'Cả khóa đăng ký, mình có theo?', hint: 'Tâm lý bầy đàn' },
  { id: 'chi-phi-chim', title: 'Đồ án đã lỡ thức 3 đêm', hint: 'Ảo giác chi phí chìm' },
  { id: 'ngon-ngu-lap-trinh', title: 'Ngôn ngữ lập trình "xịn nhất"', hint: 'Thiên kiến xác nhận' },
  { id: 'ai-ao-giac', title: 'AI đưa ra một bài báo', hint: 'Đọc ngang & CRAAP' },
] as const

export const topicTitle = (id: string | null) => TOPICS.find((t) => t.id === id)?.title ?? 'Cuộc trò chuyện'

export const FALLACY_LABELS = {
  HASTY_GENERALIZATION: 'Khái quát hóa vội vã',
  AD_HOMINEM: 'Công kích cá nhân',
  STRAW_MAN: 'Ngụy biện bù nhìn',
} as const
