# ThinkingLab

**Nghĩ sâu sắc · Hỏi rõ ràng · Vững vàng lập luận**

ThinkingLab là nền tảng web cho khóa học nâng cao kỹ năng tư duy phản biện dành cho sinh viên. Web gồm 3 phần:

- **Trang giới thiệu khóa học.**
- **Khu học tập:** video bài giảng và tài liệu cho từng buổi.
- **"Bạn luyện phản biện":** chatbot AI luyện tranh luận, nhận diện ngụy biện và ép người học lập luận có căn cứ theo đúng phương pháp của khóa học.

- Bản đang chạy: https://thinkinglab-psi.vercel.app
- Phát triển bởi **YuhnavStudio**

---

## Mục lục

1. [Tổng quan khóa học](#1-tổng-quan-khóa-học)
2. [Tính năng](#2-tính-năng)
3. [Kiến trúc hệ thống](#3-kiến-trúc-hệ-thống)
4. [Chatbot AI "Bạn luyện phản biện"](#4-chatbot-ai-bạn-luyện-phản-biện)
5. [Hạn mức token](#5-hạn-mức-token)
6. [Bảo mật và chống lạm dụng](#6-bảo-mật-và-chống-lạm-dụng)
7. [Cơ sở dữ liệu](#7-cơ-sở-dữ-liệu)
8. [Cấu trúc thư mục](#8-cấu-trúc-thư-mục)
9. [Cài đặt và chạy local](#9-cài-đặt-và-chạy-local)
10. [Kiểm thử](#10-kiểm-thử)
11. [Triển khai](#11-triển-khai)
12. [Quản trị](#12-quản-trị)

---

## 1. Tổng quan khóa học

Nội dung lấy từ bản đề xuất dự án ThinkingLab.

| Hạng mục | Chi tiết |
|---|---|
| Thời gian | 28/9 – 18/10/2026 (3 tuần) |
| Số buổi | 6 buổi chính + 1 buổi dự phòng, mỗi buổi 60 phút |
| Hình thức | 2 buổi trực tiếp tại Trường Đại học FPT; 4 buổi online qua Google Meet (20h–21h cuối tuần, có ghi hình) |
| Đối tượng | Sinh viên dự bị tiếng Anh và sinh viên kỳ 1–3 Đại học FPT |
| Khảo sát đầu vào | 33 sinh viên: 60,6% tự đánh giá kỹ năng ở mức trung bình; 66,7% gặp khó khi kiểm chứng thông tin; 57,6% ngại phát biểu vì sợ sai; 91,3% sẵn sàng tham gia khóa học |

**Lộ trình 6 buổi**

| Buổi | Hình thức | Nội dung |
|---|---|---|
| 1 | Trực tiếp | Pre-test đầu vào; bản chất phản biện; Sự thật vs Ý kiến; nguyên tắc tách ý tưởng khỏi con người |
| 2 | Online | 3 thiên kiến nhận thức (xác nhận, bầy đàn, chi phí chìm); truy vấn Socrates 4 tầng; 5 Whys |
| 3 | Online | Mô hình lập luận ARE; cấu trúc trình bày PREP |
| 4 | Online | 5 ngụy biện kinh điển: Ad Hominem, Straw Man, Slippery Slope, False Dilemma, Bandwagon |
| 5 | Online | Đọc ngang (Lateral Reading); tiêu chuẩn CRAAP; kiểm chứng "ảo giác" AI |
| 6 | Trực tiếp | Tranh biện bàn tròn; Final-test; vinh danh và cấp chứng chỉ |

---

## 2. Tính năng

### Trang giới thiệu (`/`)
- Phần mở đầu có slogan, lời kêu gọi đăng ký và thông tin ngắn về khóa học.
- Số liệu khảo sát:
  - **Máy tính:** màn hình được ghim, các thẻ trôi ngang theo thao tác cuộn (GSAP ScrollTrigger).
  - **Điện thoại:** các thẻ xếp dọc.
- Lộ trình 6 buổi và phần kêu gọi tham gia.
- **Chế độ trình chiếu:** khi người xem không thao tác một lúc, trang tự cuộn qua từng phần (dùng khi thuyết trình). Chạm vào màn hình là dừng.
- Cuộn mượt bằng Lenis. Toàn bộ hiệu ứng tự tắt khi người dùng bật "giảm chuyển động" (`prefers-reduced-motion`).

### Đăng ký / đăng nhập (`/auth`)
- Đăng nhập bằng email + mật khẩu hoặc tài khoản Google (Supabase Auth).
- Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt, và không được chứa tên email. Giao diện hiển thị từng điều kiện đã đạt hay chưa.

### Tài liệu khóa học (`/dashboard/khoa-hoc`)
- Danh sách buổi học. Mỗi buổi có:
  - mục tiêu và nội dung chi tiết;
  - video bản ghi (nhúng YouTube ở chế độ không cookie);
  - tài liệu PDF/PPTX để tải về.

### Bạn luyện phản biện (`/dashboard/tro-chuyen`)
- Chọn 1 trong 6 chủ đề có sẵn (đều là tình huống lấy từ đề xuất dự án), hoặc **tự đặt chủ đề**. Chủ đề tự đặt được AI duyệt trước khi dùng.
- AI trả lời bằng tiếng Việt và nhận diện 9 loại ngụy biện / thiên kiến. Khoảng 2–3 lượt có một meme GIF (GIPHY).
- **Vòng donut hạn mức** ở góc phải đầu khung chat:
  - 2 vòng: hạn mức cuộc trò chuyện này và hạn mức hôm nay.
  - Bấm vào sẽ mở bảng chi tiết dạng thanh ngang.
  - Đóng bằng phím Esc hoặc bấm ra ngoài.

### Quản trị (`/dashboard/quan-tri`, chỉ admin)
- Thêm, sửa, xóa buổi học: tiêu đề, hình thức, mục tiêu, nội dung, link YouTube.
- Tải lên tài liệu PDF/PPTX (tối đa 50 MB mỗi file).

---

## 3. Kiến trúc hệ thống

```
Trình duyệt (React SPA)
   │  anon key + phiên đăng nhập (RLS bảo vệ dữ liệu)
   ├──────────────► Supabase: Auth · Postgres · Storage
   │
   │  Bearer token
   └──► /api/chat  (Python serverless trên Vercel, dùng service_role key)
            ├──► Google Gemini API  (sinh câu trả lời + phân loại ngụy biện)
            ├──► GIPHY API          (tìm meme GIF)
            └──► Supabase           (lưu tin nhắn, cộng token)
```

| Lớp | Công nghệ |
|---|---|
| Frontend | Vite 8, React 19, TypeScript 6, Tailwind CSS 4, React Router 7 |
| Hiệu ứng | GSAP (ScrollTrigger, SplitText), Lenis, lucide-react |
| Backend | Python serverless function (`api/chat.py`) trên Vercel |
| AI | Google Gemini REST API (bản miễn phí) |
| Dữ liệu | Supabase: Postgres + Row Level Security, Auth (email, Google), Storage |
| Kiểm thử | pytest, Vitest, Playwright |
| Hosting | Vercel (tự triển khai khi push lên nhánh `main`) |

**Nguyên tắc chính**
- Trình duyệt chỉ có **anon key**. Mọi quyền truy cập dữ liệu do chính sách RLS trong Postgres quyết định.
- Ghi tin nhắn và cộng token chỉ do **server** làm (dùng service_role). Người dùng không thể tự sửa số token của mình.
- `GEMINI_API_KEY`, `GIPHY_API_KEY` và `SUPABASE_SERVICE_ROLE_KEY` chỉ nằm ở server (biến môi trường của Vercel), không bao giờ có tiền tố `VITE_`.

---

## 4. Chatbot AI "Bạn luyện phản biện"

Mỗi lượt chat chỉ gọi Gemini **đúng 1 lần**. AI trả về JSON có schema cố định, gồm 4 trường: `move`, `fallacy`, `reply`, `meme`.

### Phương pháp sư phạm
AI phải chọn đúng 1 "nước đi" mỗi lượt, theo thứ tự ưu tiên:

1. **FLAW:** người học mắc ngụy biện hoặc thiên kiến → gọi tên lỗi và hỏi lại.
2. **ARE:** lập luận thiếu Luận điểm, Lý lẽ hoặc Bằng chứng → hỏi đúng phần còn thiếu.
3. **SOCRATES:** trả lời lạc đề, hời hợt ("ok", "không biết") → đặt 1 câu hỏi Socrates.
4. **FIVE_WHYS:** lý do còn nông → hỏi "Tại sao?" để đào tới gốc.
5. **CHALLENGE:** lập luận đã tốt → khen cụ thể, rồi phản biện từ phía đối lập.

**9 lỗi được nhận diện:** Hasty Generalization, Ad Hominem, Straw Man, Slippery Slope, False Dilemma, Bandwagon, Confirmation Bias, Herd Mentality, Sunk Cost.

### Tiết kiệm token (dùng API miễn phí)
- **Ngữ cảnh ngắn:** AI chỉ nhận 4 tin gần nhất, mỗi tin cắt còn 200 ký tự. Câu trả lời tối đa 300 token.
- **Chọn model theo độ khó:** câu đơn giản dùng model "lite"; câu cần giải thích dùng model "flash". Tắt chế độ thinking. Model lỗi hoặc hết lượt sẽ tạm nghỉ, hệ thống chuyển sang model dự phòng.
- **Tin nhắn bị chặn** (prompt injection) được trả lời bằng câu soạn sẵn, **không tốn token**.
- **Gemini lỗi:** chuyển sang bộ trả lời theo mẫu dùng từ khóa (`chatbot.py`, `fallacy_detector.py`), 0 token.
- Chi phí đo thực tế: **khoảng 750 token mỗi lượt**.

### Meme
- AI đề xuất từ khóa meme mỗi lượt. Server quyết định có gửi hay không:
  - lượt có ngụy biện: luôn gửi;
  - lượt khác: khoảng 60%;
  - người dùng xin "meme", "gif" hoặc "ảnh chế": luôn gửi.
- Không gửi 2 lượt liền nhau. Không dùng lại GIF đã xuất hiện trong 12 tin gần nhất. Kết quả GIPHY được lưu tạm 1 giờ.
- Không có GIPHY (hoặc hết lượt): lượt có ngụy biện dùng meme SVG có sẵn trong `web/public/memes`.

---

## 5. Hạn mức token

| Giới hạn | Giá trị | Ước tính |
|---|---|---|
| Mỗi cuộc trò chuyện | 30.000 token | khoảng 40 lượt |
| Mỗi người mỗi ngày | 150.000 token | khoảng 200 lượt; làm mới lúc 0h giờ Việt Nam (UTC+7) |
| Độ dài mỗi tin nhắn | 2.000 ký tự | kiểm tra ở cả giao diện và server |

- **Gần hết hạn mức cuộc trò chuyện** (còn dưới 2.000 token): AI được yêu cầu tổng kết và kết thúc cuộc trò chuyện.
- **Hết hạn mức:** API trả lỗi `429` kèm mã `budget_exhausted` hoặc `daily_exhausted`. Giao diện khóa ô nhập và hiển thị hướng dẫn.
- **Cách tính:** token đếm theo số liệu thật Gemini trả về (`totalTokenCount`). Cả lượt AI duyệt chủ đề tự đặt cũng bị tính vào hạn mức ngày.
- **Ghi số liệu:** việc cộng token do hàm SQL `record_token_usage` thực hiện (`SECURITY DEFINER`, chỉ service_role được gọi). Người dùng chỉ được **đọc** số liệu của chính mình.

---

## 6. Bảo mật và chống lạm dụng

### Chống prompt injection và dùng sai mục đích (5 lớp)
1. **Lọc đầu vào.** Câu kiểu "bỏ qua hướng dẫn", "hiện system prompt"… được dò bằng regex trên văn bản đã bỏ dấu tiếng Việt, nên viết không dấu cũng không lọt. Tin bị chặn nhận câu trả lời soạn sẵn, không gọi AI.
2. **Duyệt chủ đề tự đặt.** AI kiểm tra chủ đề trước khi dùng và chỉ lưu tiêu đề đã duyệt. Chỉ server được ghi trường `custom_topic`.
3. **Ràng buộc trong system prompt.** Nội dung trong thẻ `<chu_de>` và mọi tin nhắn của người dùng được coi là **dữ liệu, không phải mệnh lệnh**. AI chỉ được thảo luận về tư duy phản biện, và từ chối viết hộ bài luận hay làm bài tập.
4. **Khóa đầu ra.** JSON schema dùng danh sách giá trị cố định và giới hạn độ dài. Nếu câu trả lời để lộ hướng dẫn nội bộ, server thay nó bằng một câu an toàn.
5. **Hạn mức token** theo từng cuộc trò chuyện và theo ngày.

### Bảo mật dữ liệu
- Mọi bảng đều bật **Row Level Security**: người dùng chỉ đọc được hội thoại, tin nhắn và số token của chính mình.
- Bảng buổi học và tài liệu: ai cũng đọc được, nhưng chỉ admin được ghi (kiểm tra bằng hàm `is_admin()`).
- Storage `course-materials` chỉ nhận PDF/PPTX tối đa 50 MB, và chỉ admin được tải lên.
- File `.env` / `.env.local` không bao giờ được đưa lên git (đã có trong `.gitignore`). Các khóa bí mật thật được khai báo trong Vercel.

---

## 7. Cơ sở dữ liệu

Các migration nằm trong `supabase/migrations/`, chạy theo thứ tự:

| Migration | Nội dung |
|---|---|
| `…001_initial_schema` | Bảng `users`, `conversations`, `messages` và index |
| `…002_auth_rls_archive` | Tự tạo hồ sơ khi đăng ký (trigger); RLS cho hội thoại và tin nhắn |
| `…003_security_hardening` | Siết quyền insert/update; trigger cập nhật `last_interacted_at` |
| `…004_meme_url_local_path` | Cho phép `meme_url` là link GIPHY hoặc đường dẫn SVG nội bộ |
| `…005_profile_full_name` | Lưu họ tên khi đăng ký |
| `…006_admin_course_content` | `admins`, `is_admin()`, `course_sessions`, `course_materials`, bucket Storage |
| `…007_custom_topic_token_budget` | Cột `custom_topic` và `token_count` cho hội thoại |
| `…008_daily_quota_flaws` | Bảng `token_usage_daily`, hàm `record_token_usage`, 9 mã ngụy biện |

Các file `supabase/checks/*.sql` là kịch bản kiểm tra nhanh quyền truy cập (RLS) và hạn mức. Chạy bằng:

```bash
supabase db query --linked -f supabase/checks/security_smoke.sql
```

---

## 8. Cấu trúc thư mục

```
ThinkingLab/
├── api/chat.py                # API chat: xác thực, hạn mức, gọi AI, meme, lưu tin nhắn
├── companion.py               # Prompt + schema cho AI, duyệt chủ đề, chống injection
├── gemini_client.py           # Gọi Gemini REST, chọn model, đếm token
├── memes.py                   # Tìm GIF trên GIPHY, cache, chống lặp
├── chatbot.py                 # 6 chủ đề có sẵn + trả lời theo mẫu khi AI lỗi
├── fallacy_detector.py        # Phân loại ngụy biện (Gemini + dò từ khóa dự phòng)
├── archive_conversations.py   # Lưu trữ hội thoại không hoạt động quá 7 ngày (chạy thủ công)
├── grant_admin.py             # Cấp / thu hồi quyền admin
├── test_*.py                  # Test Python (pytest)
├── supabase/                  # Migration + kịch bản kiểm tra SQL
├── vercel.json                # Build web + function Python
└── web/
    ├── src/
    │   ├── pages/landing/     # Trang giới thiệu
    │   ├── pages/dashboard/   # Tài liệu, chi tiết buổi, chat, quản trị
    │   ├── components/        # Logo, nút đăng nhập, QuotaRings (donut hạn mức)
    │   ├── lib/               # API client, auth, Supabase, quy tắc + unit test
    │   └── data/              # Nội dung khóa học, chủ đề, tên ngụy biện
    ├── e2e/                   # Test giao diện Playwright (Supabase giả lập)
    └── public/memes/          # Meme SVG dự phòng
```

---

## 9. Cài đặt và chạy local

**Yêu cầu:** Node.js 20+, Python 3.12+, (tùy chọn) Supabase CLI.

1. Cài thư viện:
   ```bash
   pip install -r requirements.txt
   ```
   ```bash
   npm --prefix web install
   ```
2. Tạo file biến môi trường từ file mẫu, rồi điền giá trị thật:
   - `.env.example` → `.env.local` ở thư mục gốc (cho server Python): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GIPHY_API_KEY`.
   - `web/.env.local` (cho giao diện): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

   Để trống `GEMINI_API_KEY` thì chatbot dùng bộ trả lời theo mẫu. Để trống `GIPHY_API_KEY` thì dùng meme SVG có sẵn.
3. Chạy API (cổng 8787):
   ```bash
   python api/chat.py
   ```
4. Chạy giao diện (cổng 5173; Vite tự chuyển `/api` sang cổng 8787):
   ```bash
   npm --prefix web run dev
   ```
5. Mở http://localhost:5173

---

## 10. Kiểm thử

| Bộ test | Lệnh | Phạm vi |
|---|---|---|
| Python (272 test) | `python -m pytest -q` | API chat, hạn mức, chống injection, prompt, meme, phân loại ngụy biện, archive, cấp admin |
| Vitest (73 test) | `npm --prefix web exec vitest run` | Quy tắc mật khẩu, tài liệu, tự cuộn, tính hạn mức |
| Playwright (14 test) | `npm --prefix web run e2e` | Giao diện trên máy tính và điện thoại; Supabase giả lập, không cần tài khoản thật |
| Kiểu dữ liệu + build | `npm --prefix web run build` | `tsc -b` và build bằng Vite |

Playwright tự build bản production rồi chạy `vite preview` trên cổng 4173. Các test kiểm tra:
- **Vòng donut hạn mức:** hiển thị %, mở bảng thanh ngang, đóng bằng Esc hoặc bấm ra ngoài, khóa ô nhập khi hết hạn mức, giới hạn 2.000 ký tự.
- **Trang giới thiệu:** slogan đủ 3 vế, các nội dung đã gỡ không còn, link menu trỏ đúng phần.
- **Mọi trang:** không có thanh cuộn ngang, không có lỗi console.

Ảnh chụp màn hình được lưu ở `web/e2e/.results/` (đã nằm trong `.gitignore`).

---

## 11. Triển khai

- Push lên nhánh `main` thì Vercel tự build và triển khai:
  - giao diện: build từ `web/`, xuất ra `web/dist`;
  - API: `api/chat.py` chạy dạng function Python, tối đa 30 giây mỗi lần gọi.
- Biến môi trường trên Vercel:
  - **Bí mật:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GIPHY_API_KEY`;
  - **Công khai:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Cập nhật database:
  ```bash
  supabase db push --linked
  ```
- Đăng nhập Google: bật provider Google trong Supabase Auth, và thêm URL của web vào danh sách Redirect URLs.

---

## 12. Quản trị

Người được cấp quyền phải **đăng ký tài khoản trên web trước**. Sau đó chạy trên máy quản lý (cần `SUPABASE_SERVICE_ROLE_KEY` trong `.env.local`):

```bash
python grant_admin.py add email@example.com
```
```bash
python grant_admin.py remove email@example.com
```
```bash
python grant_admin.py list
```

Lưu trữ hội thoại cũ: `archive_conversations.py` tóm tắt các hội thoại không hoạt động quá 7 ngày, chuyển sang trạng thái `ARCHIVED` và xóa tin nhắn chi tiết. Script này chưa được lên lịch tự động; muốn chạy định kỳ thì cần thêm cron.

---

© 2026 ThinkingLab · Phát triển bởi YuhnavStudio
