#!/usr/bin/env python3
"""ThinkingLab Chatbot Load Testing & Capacity Benchmark Tool.

Được phát triển bởi QA / Performance Testing Lead.
Hỗ trợ 2 chế độ kiểm thử:
1. Benchmark thuần (In-memory engine): Kiểm tra trần hiệu năng của mã nguồn Python & logic Chat
   với Supabase mock và Gemini latency simulation (không tốn quota, không cần internet).
2. HTTP Load Generator (Network engine): Bắn tải HTTP đồng thời vào endpoint thật (Local / Staging / Production).

Cách dùng:
  # Chạy benchmark nội bộ đo năng lực xử lý (50 VUs, mô phỏng Gemini 1.2s):
  python scripts/perf/load_test_chat.py --benchmark --vus 50 --duration 10

  # Bắn tải HTTP vào server local (cần chạy `python api/chat.py` trước):
  python scripts/perf/load_test_chat.py --target http://127.0.0.1:8787/api/chat --vus 20 --duration 15 --token <SUPABASE_JWT>
"""

import argparse
import concurrent.futures
import json
import math
import os
import random
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass


@dataclass
class MetricRecord:
    status_code: int
    duration_ms: float
    is_error: bool
    is_fallback: bool
    error_message: str = ""


@dataclass
class LoadTestSummary:
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    fallback_requests: int = 0
    durations_ms: List[float] = field(default_factory=list)
    status_codes: Dict[int, int] = field(default_factory=dict)
    errors: Dict[str, int] = field(default_factory=dict)
    start_time: float = 0.0
    end_time: float = 0.0

    @property
    def total_time_s(self) -> float:
        return max(self.end_time - self.start_time, 0.001)

    @property
    def rps(self) -> float:
        return self.total_requests / self.total_time_s

    def percentile(self, p: float) -> float:
        if not self.durations_ms:
            return 0.0
        sorted_d = sorted(self.durations_ms)
        k = (len(sorted_d) - 1) * (p / 100.0)
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return sorted_d[int(k)]
        return sorted_d[int(f)] * (c - k) + sorted_d[int(c)] * (k - f)

    def print_report(self, vus: int, scenario_name: str):
        p50 = self.percentile(50)
        p90 = self.percentile(90)
        p95 = self.percentile(95)
        p99 = self.percentile(99)
        avg = sum(self.durations_ms) / len(self.durations_ms) if self.durations_ms else 0.0
        min_d = min(self.durations_ms) if self.durations_ms else 0.0
        max_d = max(self.durations_ms) if self.durations_ms else 0.0

        error_rate = (self.failed_requests / self.total_requests * 100) if self.total_requests else 0.0

        print("\n" + "=" * 70)
        print(f"📊 BÁO CÁO KẾT QUẢ KIỂM THỬ TẢI: {scenario_name}")
        print("=" * 70)
        print(f"👥 Số lượng Virtual Users (VUs):     {vus}")
        print(f"⏱️  Tổng thời gian chạy:              {self.total_time_s:.2f} s")
        print(f"📨 Tổng số yêu cầu (Requests):        {self.total_requests}")
        print(f"✅ Thành công (HTTP 200):             {self.successful_requests}")
        print(f"⚠️  Thất bại / Lỗi:                    {self.failed_requests} ({error_rate:.2f}%)")
        print(f"🔄 Phản hồi Fallback (không dùng AI): {self.fallback_requests}")
        print(f"🚀 Thông lượng (Throughput):           {self.rps:.2f} req/s")
        print("-" * 70)
        print("⏱️  PHÂN BỐ THỜI GIAN ĐÁP ỨNG (RESPONSE LATENCY):")
        print(f"   • Min (Nhanh nhất):               {min_d:.1f} ms")
        print(f"   • Average (Trung bình):           {avg:.1f} ms")
        print(f"   • Median (P50):                   {p50:.1f} ms")
        print(f"   • P90:                            {p90:.1f} ms")
        print(f"   • P95 (Ngưỡng SLA):               {p95:.1f} ms")
        print(f"   • P99 (Độ trễ cao nhất):          {p99:.1f} ms")
        print(f"   • Max (Chậm nhất):                {max_d:.1f} ms")
        print("-" * 70)
        print("📋 PHÂN BỐ MÃ PHẢN HỒI (HTTP STATUS CODES):")
        for code, count in sorted(self.status_codes.items()):
            pct = count / self.total_requests * 100
            print(f"   • HTTP {code}: {count} requests ({pct:.1f}%)")

        if self.errors:
            print("-" * 70)
            print("🚨 CHI TIẾT LỖI GẶP PHẢI:")
            for err, count in self.errors.items():
                print(f"   • [{count}x] {err}")

        print("-" * 70)
        print("🎯 ĐÁNH GIÁ ĐẠT / KHÔNG ĐẠT (ACCEPTANCE CRITERIA):")
        sla_pass = True
        if error_rate > 1.0:
            print("   ❌ Tỷ lệ lỗi vượt quá 1.0% SLA")
            sla_pass = False
        else:
            print("   ✅ Tỷ lệ lỗi đạt chuẩn SLA (<= 1.0%)")

        if p95 > 4500:
            print("   ❌ Độ trễ P95 vượt ngưỡng chấp nhận (4.5s)")
            sla_pass = False
        else:
            print("   ✅ Độ trễ P95 đạt chuẩn cam kết (<= 4.5s)")

        print("=" * 70 + "\n")
        return sla_pass


SAMPLE_MESSAGES = [
    "Tôi nghĩ mạng xã hội gây hại cho giới trẻ vì mọi người dành quá nhiều thời gian lướt TikTok.",
    "Theo khảo sát của viện nghiên cứu, 68% sinh viên cảm thấy mất tập trung khi có điện thoại bên cạnh.",
    "Bạn nói thế là ngụy biện công kích cá nhân rồi đấy!",
    "Làm sao để tôi chứng minh được lập luận này có căn cứ vững chắc?",
    "Có nên cấm xe máy ở trung tâm thành phố để giảm thiểu ô nhiễm không?",
    "Mọi người xung quanh tôi ai cũng ủng hộ ý kiến này, chẳng lẽ tất cả đều sai?",
]


def run_benchmark_mode(vus: int, duration_s: int, simulated_ai_ms: int = 1200):
    """Mô phỏng tải in-memory bằng cách gọi logic api.chat.handle với FakeClient và Mock AI."""
    import uuid
    import api.chat as chat_api
    from test_api_chat import FakeClient, USER

    print(f"\n🚀 BẮT ĐẦU BENCHMARK NỘI BỘ: {vus} VUs trong {duration_s}s (Simulated AI Latency: {simulated_ai_ms}ms)...")

    summary = LoadTestSummary()
    summary.start_time = time.time()
    stop_at = summary.start_time + duration_s

    # Mock companion.generate_reply để mô phỏng thời gian phản hồi của LLM
    import companion

    real_generate = companion.generate_reply

    def mock_generate(*args, **kwargs):
        # Giả lập thời gian Gemini phản hồi (dao động quanh simulated_ai_ms)
        jitter = random.uniform(0.8, 1.2) * (simulated_ai_ms / 1000.0)
        time.sleep(jitter)
        usage = kwargs.get("usage")
        if isinstance(usage, dict):
            usage["total"] = random.randint(450, 750)
        return companion.CompanionReply(
            text="Lập luận của bạn rất thú vị, nhưng bạn dựa trên bằng chứng thống kê nào?",
            fallacy_code=None,
            meme_query="slow clap",
        )

    companion.generate_reply = mock_generate

    def vu_worker(user_idx: int):
        client = FakeClient()
        auth_header = "Bearer valid-token"
        conv_id = None

        # 1. Start chat
        start_t = time.perf_counter()
        status, body = chat_api.handle({"action": "start", "topic": "boc-phot"}, auth_header, client)
        d_ms = (time.perf_counter() - start_t) * 1000
        conv_id = body.get("conversation", {}).get("id") if status == 200 else None
        if conv_id is None:
            yield MetricRecord(status, d_ms, True, False, body.get("error", "Không tạo được conversation"))
            return

        while time.time() < stop_at:
            content = random.choice(SAMPLE_MESSAGES)
            req_t0 = time.perf_counter()
            try:
                status, body = chat_api.handle(
                    {"action": "reply", "conversation_id": conv_id, "content": content},
                    auth_header,
                    client,
                )
                req_d = (time.perf_counter() - req_t0) * 1000
                is_err = status >= 400
                err_msg = body.get("error", "") if is_err else ""
                yield MetricRecord(status, req_d, is_err, is_fallback=False, error_message=err_msg)
            except Exception as e:
                req_d = (time.perf_counter() - req_t0) * 1000
                yield MetricRecord(500, req_d, True, False, str(e))

            # Think time giữa các câu chat (0.2s - 0.6s cho benchmark)
            time.sleep(random.uniform(0.1, 0.4))

    with concurrent.futures.ThreadPoolExecutor(max_workers=vus) as executor:
        futures = []
        for i in range(vus):
            def run_vu(idx=i):
                records = []
                for rec in vu_worker(idx):
                    records.append(rec)
                return records
            futures.append(executor.submit(run_vu))

        for f in concurrent.futures.as_completed(futures):
            records = f.result()
            for r in records:
                summary.total_requests += 1
                summary.durations_ms.append(r.duration_ms)
                summary.status_codes[r.status_code] = summary.status_codes.get(r.status_code, 0) + 1
                if r.is_error:
                    summary.failed_requests += 1
                    summary.errors[r.error_message] = summary.errors.get(r.error_message, 0) + 1
                else:
                    summary.successful_requests += 1

    companion.generate_reply = real_generate
    summary.end_time = time.time()
    summary.print_report(vus, f"Benchmark In-Memory (Simulated Gemini {simulated_ai_ms}ms)")


def run_http_mode(target: str, vus: int, duration_s: int, token: Optional[str] = None):
    """Bắn HTTP request qua mạng vào endpoint API thật."""
    import urllib.request
    import urllib.error

    print(f"\n🚀 BẮT ĐẦU HTTP LOAD TEST: {vus} VUs vào {target} trong {duration_s}s...")

    summary = LoadTestSummary()
    summary.start_time = time.time()
    stop_at = summary.start_time + duration_s

    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    def post_json(payload: dict) -> tuple[int, dict, float]:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(target, data=data, headers=headers, method="POST")
        t0 = time.perf_counter()
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                return resp.status, body, (time.perf_counter() - t0) * 1000
        except urllib.error.HTTPError as e:
            body = json.loads(e.read().decode("utf-8")) if e.fp else {}
            return e.code, body, (time.perf_counter() - t0) * 1000
        except Exception as e:
            return 500, {"error": str(e)}, (time.perf_counter() - t0) * 1000

    def vu_worker(user_idx: int):
        # 1. Khởi tạo phiên
        status, body, d_ms = post_json({"action": "start", "topic": "boc-phot"})
        conv_id = body.get("conversation", {}).get("id") if status == 200 else None
        if not conv_id:
            yield MetricRecord(status, d_ms, True, False, body.get("error", "Không tạo được conversation"))
            return

        while time.time() < stop_at and conv_id:
            content = random.choice(SAMPLE_MESSAGES)
            status, body, d_ms = post_json({"action": "reply", "conversation_id": conv_id, "content": content})
            is_err = status >= 400
            err_msg = body.get("error", "") if is_err else ""
            yield MetricRecord(status, d_ms, is_err, is_fallback=False, error_message=err_msg)
            # Think time ngẫu nhiên giữa 2 lượt chat (mô phỏng người dùng gõ tin)
            time.sleep(random.uniform(1.0, 3.0))

    with concurrent.futures.ThreadPoolExecutor(max_workers=vus) as executor:
        futures = [executor.submit(lambda idx=i: list(vu_worker(idx))) for i in range(vus)]
        for f in concurrent.futures.as_completed(futures):
            records = f.result()
            for r in records:
                summary.total_requests += 1
                summary.durations_ms.append(r.duration_ms)
                summary.status_codes[r.status_code] = summary.status_codes.get(r.status_code, 0) + 1
                if r.is_error:
                    summary.failed_requests += 1
                    summary.errors[r.error_message] = summary.errors.get(r.error_message, 0) + 1
                else:
                    summary.successful_requests += 1

    summary.end_time = time.time()
    summary.print_report(vus, f"HTTP Endpoint ({target})")


def main():
    parser = argparse.ArgumentParser(description="ThinkingLab Chatbot Load Tester")
    parser.add_argument("--benchmark", action="store_true", help="Chạy benchmark in-memory với mock Gemini")
    parser.add_argument("--vus", type=int, default=20, help="Số lượng Virtual Users (mặc định: 20)")
    parser.add_argument("--duration", type=int, default=10, help="Thời gian kiểm thử (giây, mặc định: 10)")
    parser.add_argument("--target", type=str, default="http://127.0.0.1:8787/api/chat", help="Target URL HTTP")
    parser.add_argument("--token", type=str, default="", help="Supabase Auth JWT Token (cho HTTP mode)")
    parser.add_argument("--simulated-ai-ms", type=int, default=1200, help="Độ trễ AI giả lập trong benchmark (ms)")

    args = parser.parse_args()

    if args.benchmark or not args.token:
        if not args.benchmark:
            print("💡 Không phát hiện JWT token cho HTTP mode -> Tự động chuyển sang chế độ --benchmark (In-memory Engine).")
        run_benchmark_mode(args.vus, args.duration, args.simulated_ai_ms)
    else:
        run_http_mode(args.target, args.vus, args.duration, args.token)


if __name__ == "__main__":
    main()
