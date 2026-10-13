# 🚀 Hướng Dẫn Kiểm Thử Tải (Performance & Load Testing Guide)

Thư mục này chứa bộ công cụ kiểm thử hiệu năng và sức chịu tải của hệ thống **ThinkingLab**, đặc biệt tối ưu cho luồng **Chatbot Luyện phản biện (`/api/chat`)**.

---

## 📁 Cấu Trúc Thư Mục

- `load_test_chat.py`: Engine kiểm thử tải đa luồng bằng Python (chuẩn hóa đo đạc P50, P90, P95, P99, RPS, Error rate, SLA).
- `load_test_chat.js`: Kịch bản kiểm thử tải bằng **Grafana k6** (chuẩn CI/CD công nghiệp).

---

## 🛠️ 1. Hướng Dẫn Chạy Bằng Python Engine (`load_test_chat.py`)

Python Engine được thiết kế sẵn sàng chạy ngay trên mọi môi trường (Windows, Linux, macOS) mà không cần cài đặt thêm công cụ bên ngoài.

### Chế độ 1: Benchmark Nội Bộ (In-Memory Simulation)
> Dùng để kiểm tra trần thông lượng của mã nguồn Python và logic hội thoại mà **không tốn quota Gemini** và **không cần Internet**:

```bash
# Mô phỏng 30 sinh viên đồng thời (1 lớp học) trong 10 giây
python scripts/perf/load_test_chat.py --benchmark --vus 30 --duration 10

# Mô phỏng 100 sinh viên đồng thời với độ trễ Gemini giả lập 1.5s
python scripts/perf/load_test_chat.py --benchmark --vus 100 --duration 20 --simulated-ai-ms 1500
```

### Chế độ 2: Kiểm Thử Tải Qua Mạng (HTTP Network Mode)
> Bắn tải HTTP thật vào máy chủ dev local (`127.0.0.1:8787`) hoặc link staging/production:

1. Mở một terminal khởi chạy server local:
   ```bash
   python api/chat.py
   ```
2. Mở terminal thứ hai chạy test tải kèm token đăng nhập:
   ```bash
   python scripts/perf/load_test_chat.py --target http://127.0.0.1:8787/api/chat --vus 20 --duration 15 --token "<SUPABASE_JWT_TOKEN>"
   ```

---

## ⚡ 2. Hướng Dẫn Chạy Bằng Grafana k6 (`load_test_chat.js`)

Nếu máy tính của bạn đã cài đặt `k6`:

```bash
# Cài đặt k6 trên Windows (nếu chưa có):
winget install k6 --source winget
# hoặc macOS:
brew install k6

# Chạy k6 test:
k6 run scripts/perf/load_test_chat.js -e TARGET="http://127.0.0.1:8787/api/chat" -e TOKEN="<SUPABASE_JWT_TOKEN>"
```

---

## 🎯 3. Các Ngưỡng SLA Cam Kết (Acceptance Criteria)

- **Độ trễ P95 (95th Percentile Latency):** $\le 4.5\text{s}$ (bao gồm cả thời gian xử lý LLM).
- **Tỷ lệ lỗi (Error Rate):** $\le 1.0\%$ dưới tải tiêu chuẩn.
- **Tính tự phục hồi (Graceful Degradation):** Khi Gemini trả về 429 hoặc lỗi mạng, hệ thống phải tự động fallback về mẫu trả lời tĩnh HTTP 200, tuyệt đối không văng lỗi 500.
