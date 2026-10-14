"""Script kiem tra suc khoe toan bo Gemini API Keys trong .env / .env.local."""

import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import api.chat as chat_api
import gemini_client

# Nap bien moi truong
chat_api._load_env_file(ROOT / ".env")
chat_api._load_env_file(ROOT / ".env.local")

keys = gemini_client.api_keys()
if not keys:
    print("\n[!] Khong tim thay API Key nao trong file .env hoac .env.local!")
    print("Vui long them bien GEMINI_API_KEYS=\"key1,key2,key3...\" vao file .env.local\n")
    sys.exit(1)

print("\n" + "=" * 65)
print(f"  THINKINGLAB - KIEM TRA SUC KHOE GEMINI API KEYS (Tong: {len(keys)})")
print("=" * 65)

import requests

headers_fmt = "{:<5} {:<24} {:<15} {:<12} {:<10}"
print(headers_fmt.format("STT", "Key (Masked)", "Trang thai", "HTTP Status", "Latency"))
print("-" * 65)

healthy_count = 0

for i, k in enumerate(keys, start=1):
    masked = k[:6] + "..." + k[-4:] if len(k) > 10 else "***"
    start_t = time.time()
    try:
        model = gemini_client._candidates("lite")[0][0]
        url = gemini_client.API_URL.format(model=model)
        payload = {
            "contents": [{"role": "user", "parts": [{"text": "ping"}]}],
            "generationConfig": {"maxOutputTokens": 5},
        }
        resp = requests.post(
            url,
            json=payload,
            headers={"x-goog-api-key": k},
            timeout=5,
        )
        latency = f"{(time.time() - start_t) * 1000:.0f}ms"
        if resp.status_code == 200:
            status_text = "[OK] Hoat dong"
            healthy_count += 1
        elif resp.status_code == 429:
            if gemini_client.is_daily_quota_exhausted(resp):
                status_text = "[!] Het quota ngay"
            else:
                status_text = "[!] 429 RPM Limit"
        elif resp.status_code == 400:
            status_text = "[X] Key sai / Chua bat API"
        else:
            status_text = f"[X] Loi {resp.status_code}"

        print(headers_fmt.format(f"#{i}", masked, status_text, str(resp.status_code), latency), flush=True)
    except Exception as e:
        latency = f"{(time.time() - start_t) * 1000:.0f}ms"
        print(headers_fmt.format(f"#{i}", masked, "[X] Timeout / Network", "ERR", latency), flush=True)

print("-" * 65, flush=True)
print(f"Ket qua: {healthy_count}/{len(keys)} key(s) hoat dong hoan hao!", flush=True)
print(f"Tong throughput ly thuyet: {healthy_count * 15} Requests/Phut (RPM)", flush=True)
print("=" * 65 + "\n", flush=True)
