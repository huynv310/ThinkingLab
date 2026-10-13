// k6 Load Test Script cho ThinkingLab Chatbot (/api/chat)
// Cài đặt k6: https://k6.io/docs/get-started/installation/
// Chạy test: k6 run scripts/perf/load_test_chat.js -e TOKEN="<YOUR_SUPABASE_JWT>" -e TARGET="http://127.0.0.1:8787/api/chat"

import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  scenarios: {
    // 1. Tải tiêu chuẩn: 30 người dùng đồng thời trong 3 phút (mô phỏng 1 lớp học SSA101)
    standard_class: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 15 }, // Khởi động (ramp-up)
        { duration: '1m', target: 30 },  // Duy trì tải 30 sinh viên
        { duration: '30s', target: 50 }, // Tải đỉnh điểm (peak)
        { duration: '30s', target: 0 },  // Hạ tải (ramp-down)
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // 95% số request phải hoàn thành dưới 4.5 giây (bao gồm thời gian gọi AI)
    http_req_duration: ['p(95)<4500'],
    // Tỷ lệ lỗi cho phép dưới 1%
    http_req_failed: ['rate<0.01'],
  },
}

const TARGET = __ENV.TARGET || 'http://127.0.0.1:8787/api/chat'
const TOKEN = __ENV.TOKEN || ''

const TOPICS = ['boc-phot', 'giang-vien-a', 'dam-dong', 'chi-phi-chim', 'ngon-ngu-lap-trinh']

const SAMPLES = [
  'Tôi nghĩ sinh viên năm nhất nên tập trung học chuyên ngành hơn là đi làm thêm.',
  'Theo quan sát của tôi, bạn bè xung quanh ai dùng mạng xã hội cũng ngủ muộn.',
  'Bạn có nghĩ rằng làm thêm từ sớm sẽ rèn luyện kỹ năng thực tế tốt hơn không?',
  'Lập luận này dựa trên khảo sát của 50 sinh viên tại Đại học FPT.',
]

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
  }

  // 1. Khởi tạo cuộc trò chuyện
  const startTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)]
  const startRes = http.post(
    TARGET,
    JSON.stringify({ action: 'start', topic: startTopic }),
    { headers, timeout: '30s' }
  )

  check(startRes, {
    'start chat status is 200': (r) => r.status === 200,
  })

  let convId = null
  try {
    const body = JSON.parse(startRes.body)
    convId = body.conversation && body.conversation.id
  } catch (e) {
    // skip
  }

  if (!convId) {
    sleep(1)
    return
  }

  // Nghỉ giữa các câu hỏi (Think Time mô phỏng sinh viên gõ phím)
  sleep(Math.random() * 2 + 1)

  // 2. Gửi 2-3 lượt tin nhắn đối đáp
  for (let turn = 0; turn < 3; turn++) {
    const text = SAMPLES[Math.floor(Math.random() * SAMPLES.length)]
    const replyRes = http.post(
      TARGET,
      JSON.stringify({
        action: 'reply',
        conversation_id: convId,
        content: text,
      }),
      { headers, timeout: '30s' }
    )

    check(replyRes, {
      'reply status is 200': (r) => r.status === 200,
      'response has messages': (r) => {
        try {
          const b = JSON.parse(r.body)
          return Array.isArray(b.messages) && b.messages.length > 0
        } catch {
          return false
        }
      },
    })

    // Nghỉ 2-4 giây trước câu tiếp theo
    sleep(Math.random() * 2 + 2)
  }
}
