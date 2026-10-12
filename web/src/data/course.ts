// Toàn bộ nội dung lấy từ "Đề xuất dự án ThinkingLab".

export type SessionFormat = 'Trực tiếp' | 'Online' | 'Dự phòng'

export interface CourseSession {
  no: number
  slug: string
  title: string
  format: SessionFormat
  duration: string
  goals: string[]
  parts: { title: string; points: string[] }[]
  /** Link bản ghi buổi học; chưa có thì để trống. */
  videoUrl?: string
}

export const COURSE_SESSIONS: CourseSession[] = [
  {
    no: 1,
    slug: 'buoi-1',
    title: 'Đánh giá năng lực đầu vào & Giải mã bản chất phản biện',
    format: 'Trực tiếp',
    duration: '60 phút',
    goals: [
      'Thấu hiểu bản chất phản biện; phân biệt Sự thật và Quan điểm.',
      'Bài đánh giá năng lực đầu vào được gửi làm online trước 24h.',
    ],
    parts: [
      {
        title: 'Phần 1: Đánh giá năng lực đầu vào',
        points: [
          'Thực hiện qua Google Form, gồm 10 câu hỏi tình huống.',
          'Câu 1–3: phân biệt Sự thật khách quan và Ý kiến chủ quan.',
          'Câu 4–6: phản xạ kiểm chứng nguồn tin trước thông tin giật gân, lời đồn học đường.',
          'Câu 7–8: nhận diện các bẫy ngụy biện sơ cấp trong thảo luận nhóm.',
          'Câu 9–10: thái độ và phản ứng tâm lý khi bị người khác phản biện.',
          'Mục đích: thiết lập mốc dữ liệu gốc để đo mức độ tiến bộ sau khóa học.',
        ],
      },
      {
        title: 'Phần 2: Phản biện khoa học hay Bắt bẻ cá nhân?',
        points: [
          'Tư duy phản biện không phải là "thích cãi", "bới lông tìm vết" hay luôn nói ngược số đông.',
          'Là quá trình tư duy có ý thức, dùng logic và bằng chứng để đánh giá thông tin, nhận ra giả định ngầm và đưa ra kết luận công bằng.',
          'Fact (Sự thật): chứng minh được bằng dữ liệu, số liệu, tài liệu khoa học; khách quan.',
          'Opinion (Ý kiến): cảm xúc, niềm tin, giá trị cá nhân; chủ quan, thay đổi theo góc nhìn.',
          'Tách rời Ý tưởng khỏi Con người: tấn công vào luận điểm, bảo vệ con người.',
          'Công thức phản hồi SBI: Bối cảnh → Hành vi cụ thể → Tác động tới nhóm → Đề xuất giải pháp.',
        ],
      },
    ],
  },
  {
    no: 2,
    slug: 'buoi-2',
    title: 'Thiên kiến nhận thức, truy vấn Socrates & mô hình 5 Whys',
    format: 'Online',
    duration: '60 phút',
    goals: [
      'Nhận diện và tự phát hiện 3 bẫy thiên kiến nhận thức phổ biến nhất.',
      'Làm chủ kỹ thuật đặt câu hỏi Socrates và 5 Whys để tìm nguyên nhân cốt lõi.',
    ],
    parts: [
      {
        title: 'Phần 1: Giải mã thiên kiến nhận thức',
        points: [
          'Thiên kiến là các lối tắt tư duy não bộ tự dùng, dẫn đến nhận định sai mà người mắc không nhận ra.',
          'Thiên kiến xác nhận: chỉ tin dữ liệu ủng hộ quan điểm ban đầu (ví dụ chỉ đọc bài khen ngôn ngữ lập trình mình đang học).',
          'Tâm lý bầy đàn: đồng thuận với số đông vì sợ bị cô lập hoặc lười kiểm chứng.',
          'Ảo giác chi phí chìm: bám lấy hướng làm đồ án không hiệu quả chỉ vì "đã lỡ thức 3 đêm".',
        ],
      },
      {
        title: 'Phần 2: Truy vấn Socrates & 5 Whys',
        points: [
          'Hỏi làm rõ khái niệm: "Chính xác thì từ [X] trong câu này có nghĩa là gì?"',
          'Hỏi kiểm tra giả định ngầm: "Bạn đang mặc định điều gì là hiển nhiên đúng ở đây?"',
          'Hỏi tìm kiếm bằng chứng: "Cơ sở thực tế hoặc số liệu nào chứng minh cho nhận định này?"',
          'Hỏi phân tích hệ quả: "Nếu làm theo phương án của bạn thì điều tồi tệ nhất có thể xảy ra là gì?"',
          '5 Whys: liên tục hỏi "Tại sao" để lần theo chuỗi nhân quả tới điểm nghẽn thực sự.',
        ],
      },
    ],
  },
  {
    no: 3,
    slug: 'buoi-3',
    title: 'Mô hình ARE & cấu trúc PREP trong diễn đạt',
    format: 'Online',
    duration: '60 phút',
    goals: [
      'Chấm dứt thói quen phát biểu cảm tính; nắm vững cấu trúc lập luận ARE.',
      'Dùng PREP để trình bày quan điểm gãy gọn trong 60–90 giây.',
    ],
    parts: [
      {
        title: 'Phần 1: Mô hình ARE (Tam giác logic học thuật)',
        points: [
          'A – Assertion: tuyên bố rõ ràng, trực diện. Quan điểm của bạn là gì?',
          'R – Reasoning: chuỗi suy luận giải thích vì sao luận điểm đúng. Tại sao và như thế nào?',
          'E – Evidence: cứ liệu khách quan củng cố lý lẽ. Đâu là bằng chứng?',
          'Bằng chứng mạnh: số liệu thống kê uy tín, kết quả nghiên cứu, điều khoản luật, ví dụ kiểm chứng được — loại bỏ lời đồn.',
        ],
      },
      {
        title: 'Phần 2: Cấu trúc PREP',
        points: [
          'P – Point: trả lời trực tiếp ngay ở giây đầu tiên.',
          'R – Reason: 1–2 lý do cốt lõi.',
          'E – Example/Evidence: một câu chuyện thực tế hoặc con số cụ thể.',
          'P – Point: tóm lược ý chính và kêu gọi hành động.',
        ],
      },
    ],
  },
  {
    no: 4,
    slug: 'buoi-4',
    title: 'Nhận diện & hóa giải 5 bẫy ngụy biện logic kinh điển',
    format: 'Online',
    duration: '60 phút',
    goals: [
      'Bóc tách cơ chế 5 loại ngụy biện thường gặp trong đời sống sinh viên và mạng xã hội.',
      'Phát hiện và phản bác ngụy biện lịch sự, đưa thảo luận về đúng bản chất.',
    ],
    parts: [
      {
        title: 'Phần 1: Bản chất của ngụy biện',
        points: [
          'Lập luận có vẻ thuyết phục nhưng sai về suy luận, dùng để đánh lừa tâm lý hoặc đánh lạc hướng.',
          'Học ngụy biện để không bị dắt mũi, tuyệt đối không dùng nó làm vũ khí thao túng.',
        ],
      },
      {
        title: 'Phần 2: 5 bẫy ngụy biện và cách hóa giải',
        points: [
          'Ad Hominem (Công kích cá nhân) → "Hãy tạm gác chuyện cá nhân, chúng ta đang bàn về tính chính xác của số liệu."',
          'Straw Man (Bù nhìn rơm) → "Đó không phải điều tôi vừa nói. Quan điểm chính xác của tôi là..."',
          'Slippery Slope (Dốc trượt) → "Đâu là cơ sở chứng minh A chắc chắn dẫn đến D?"',
          'False Dilemma (Lưỡng nan giả) → "Vấn đề không chỉ có trắng và đen, còn lựa chọn C và D..."',
          'Bandwagon (Ngụy biện đám đông) → "Nhiều người tin không làm điều đó tự động thành sự thật."',
        ],
      },
    ],
  },
  {
    no: 5,
    slug: 'buoi-5',
    title: 'Kỹ thuật "Đọc ngang" & tiêu chuẩn CRAAP Test',
    format: 'Online',
    duration: '60 phút',
    goals: [
      'Nắm vững kỹ thuật "Đọc ngang" của Đại học Stanford để kiểm chứng chéo thông tin.',
      'Dùng bộ 5 tiêu chuẩn CRAAP để đánh giá tài liệu và phát hiện ảo giác khi dùng AI.',
    ],
    parts: [
      {
        title: 'Phần 1: Đọc ngang (Lateral Reading)',
        points: [
          '"Đọc dọc" chỉ lướt một trang từ trên xuống, dễ bị lừa bởi giao diện đẹp, logo chuyên nghiệp.',
          'Gặp thông tin lạ, mở tab mới tra cứu: Tác giả là ai? Ai tài trợ trang web? Chuyên gia độc lập nói gì?',
          'Không tin vào lời tự giới thiệu của chính trang web đó.',
        ],
      },
      {
        title: 'Phần 2: CRAAP Test',
        points: [
          'Currency – Tính cập nhật: công bố khi nào, có bản mới hơn, link trích dẫn còn hoạt động?',
          'Relevance – Tính phù hợp: có đúng câu hỏi nghiên cứu, hướng tới ai?',
          'Authority – Thẩm quyền: tác giả có chuyên môn? Đơn vị xuất bản uy tín hay blog nặc danh?',
          'Accuracy – Độ chính xác: có số liệu, bình duyệt, nguồn khác xác nhận?',
          'Purpose – Mục đích: cung cấp thông tin hay bán hàng, định hướng dư luận?',
          'Kiểm tra chéo AI: ép AI trích nguồn thật và phát hiện bài báo "ảo giác".',
        ],
      },
    ],
  },
  {
    no: 6,
    slug: 'buoi-6',
    title: 'Thực chiến phản biện văn minh & vinh danh cuối khóa',
    format: 'Trực tiếp',
    duration: '60 phút',
    goals: [
      'Tổng hợp ARE, Socrates, CRAAP, nhận diện ngụy biện vào một phiên phản biện thực tế.',
      'Hoàn thành Final-test để đo lường độ tăng trưởng năng lực.',
      'Vinh danh và cấp chứng chỉ số cho học viên hoàn thành khóa học.',
    ],
    parts: [
      {
        title: 'Phần 1: Thực chiến phản biện văn minh',
        points: [
          'Bàn tròn: sinh viên "bóc phốt" công khai danh tính người khác khi bị đối xử bất công — dũng cảm bảo vệ cộng đồng hay bạo lực mạng?',
          'Chia 2 nhóm cho 2 góc nhìn; mỗi lượt 90 giây theo cấu trúc PREP.',
          'Phản bác phải chỉ ra điểm thiếu căn cứ hoặc ngụy biện, không công kích cá nhân.',
        ],
      },
      {
        title: 'Phần 2: Đánh giá đầu ra',
        points: [
          'Final-test 10 câu tình huống trên Google Form, tương đương Pre-test.',
          'Khảo sát mức độ tự tin và cảm nhận về khóa học.',
        ],
      },
      {
        title: 'Phần 3: Vinh danh & bế mạc',
        points: [
          'Công bố biểu đồ tiến bộ trước – sau của cả khóa.',
          'Vinh danh 3 học viên tích cực nhất.',
          'Cấp chứng chỉ cho học viên đạt bài đánh giá cuối khóa.',
        ],
      },
    ],
  },
  {
    no: 7,
    slug: 'buoi-7',
    title: 'Buổi dự phòng',
    format: 'Dự phòng',
    duration: '60 phút',
    goals: ['Kích hoạt khi một buổi chính bị gián đoạn vì lý do kỹ thuật hoặc lịch thi đột xuất của trường.'],
    parts: [],
  },
]

export const COURSE_FACTS = {
  period: '28/9 – 18/10/2026',
  offline: '2 buổi trực tiếp tại Trường Đại học FPT',
  online: '4 buổi online qua Google Meet, 20h–21h cuối tuần, có ghi hình',
}

export const SURVEY_STATS = [
  { value: '66,7%', label: 'gặp khó khăn khi kiểm chứng độ tin cậy của thông tin' },
  { value: '60,6%', label: 'tự đánh giá kỹ năng tư duy phản biện chỉ ở mức trung bình (3/5)' },
  { value: '57,6%', label: 'ngại phát biểu vì sợ sai hoặc bị phán xét' },
  { value: '57,6%', label: 'dễ bị cuốn theo tâm lý bầy đàn và thông tin lan truyền' },
  { value: '54,5%', label: 'gặp khó khăn khi diễn đạt ý kiến mạch lạc' },
  { value: '51,5%', label: 'chật vật trong việc cấu trúc luận điểm thuyết phục' },
]

export const CASE_STUDIES = [
  {
    tag: 'Tin đồn học đường',
    title: '“Thầy A chấm gắt rớt nửa lớp!”',
    desc: 'Bẫy khái quát vội vã & tâm lý bầy đàn: Lan truyền hoang mang vô căn cứ qua group chat.',
    badge: 'Khái quát vội vã',
  },
  {
    tag: 'Áp lực đồ án',
    title: '“Đã lỡ thức 3 đêm rồi, không thể bỏ!”',
    desc: 'Ảo giác chi phí chìm: Càng tiếc công sức bỏ ra, càng bám víu giải pháp ngõ cụt.',
    badge: 'Chi phí chìm',
  },
  {
    tag: 'Góc nhìn công nghệ',
    title: '“Công nghệ này là xịn nhất thiên hạ!”',
    desc: 'Thiên kiến xác nhận: Chỉ đọc bài ca ngợi và tự bịt mắt trước phản biện khách quan.',
    badge: 'Thiên kiến xác nhận',
  },
]

