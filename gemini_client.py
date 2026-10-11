"""Gọi Google Gemini (REST) và nhận về JSON theo schema. Dùng chung cho phân loại
ngụy biện và bạn trò chuyện. Không có GEMINI_API_KEY -> api_key() trả "" và
nơi gọi tự dùng phương án không cần AI.

Tối ưu chi phí (free tier):
- 2 hạng model: LITE (rẻ, nhanh) cho câu đơn giản; SMART cho câu cần giải thích.
  Mỗi hạng có model dự phòng của hạng kia.
- Tắt "thinking": cấu hình riêng theo model vì sai loại cấu hình sẽ bị 400
  (đo thực tế: gemini-3.8-flash mặc định tốn ~280 token suy nghĩ cho 1 câu).
- Model trả 429/503/404 bị bỏ qua COOLDOWN_SECONDS để không phí lượt gọi.
"""

import json
import logging
import os
import threading
import time

logger = logging.getLogger(__name__)

API_KEY_ENV = "GEMINI_API_KEY"
MODEL_ENV = "GEMINI_MODEL"
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# (model, generationConfig bổ sung để tắt thinking)
LITE = (
    ("gemini-flash-lite-latest", {}),  # mặc định không thinking
    ("gemini-3.1-flash-lite", {"thinkingConfig": {"thinkingBudget": 0}}),
)
SMART = (
    ("gemini-3.8-flash", {"thinkingConfig": {"thinkingBudget": 0}}),
    ("gemini-flash-latest", {"thinkingConfig": {"thinkingBudget": 0}}),
)
TIERS = {"lite": LITE + SMART, "smart": SMART + LITE}

RETRY_STATUSES = frozenset({404, 429, 500, 502, 503, 504})  # 404: model đã bị gỡ
COOLDOWN_SECONDS = 60

_cooldown_until = {}
_lock = threading.Lock()


def api_key():
    return os.environ.get(API_KEY_ENV, "").strip()


def reset_cooldowns():
    with _lock:
        _cooldown_until.clear()


def _candidates(tier):
    models = list(TIERS[tier])
    custom = os.environ.get(MODEL_ENV, "").strip()
    if custom:
        models = [(custom, {}), *(m for m in models if m[0] != custom)]
    now = time.monotonic()
    with _lock:
        ready = [m for m in models if _cooldown_until.get(m[0], 0) <= now]
    return ready or models[:1]  # tất cả đang nghỉ -> vẫn thử 1 model


def _cool_down(model):
    with _lock:
        _cooldown_until[model] = time.monotonic() + COOLDOWN_SECONDS


def generate_json(
    system,
    contents,
    schema,
    *,
    key=None,
    tier="lite",
    temperature=0.0,
    max_output_tokens=256,
    timeout=(3.05, 12),
    usage=None,
):
    """Trả về dict đã parse; ném lỗi nếu mạng/API hỏng hoặc output không phải JSON object.

    usage: dict tùy chọn, được ghi usage["total"] = tổng token Gemini tính phí cho lần gọi này.
    """
    import requests  # import trễ: không có key thì không cần requests

    key = key or api_key()
    if not key:
        raise RuntimeError(f"Missing environment variable {API_KEY_ENV}")

    for model, extra in _candidates(tier):
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_output_tokens,
                "responseMimeType": "application/json",
                "responseSchema": schema,
                **extra,
            },
        }
        response = requests.post(
            API_URL.format(model=model),
            json=body,
            headers={"x-goog-api-key": key},  # key ở header, không nằm trong URL/log
            timeout=timeout,
            allow_redirects=False,  # không để API key đi theo redirect
        )
        if response.status_code not in RETRY_STATUSES:
            break
        logger.warning("Gemini model %s returned %s, trying next model", model, response.status_code)
        _cool_down(model)
    response.raise_for_status()

    payload = response.json()
    meta = payload.get("usageMetadata", {})
    logger.info(
        "Gemini %s tokens: in=%s out=%s thinking=%s",
        model, meta.get("promptTokenCount"), meta.get("candidatesTokenCount"), meta.get("thoughtsTokenCount", 0),
    )
    if usage is not None:
        usage["total"] = usage.get("total", 0) + _total_tokens(meta)
    raw = payload["candidates"][0]["content"]["parts"][0]["text"]
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("Gemini output is not a JSON object")
    return data


def _total_tokens(meta):
    total = meta.get("totalTokenCount")
    if isinstance(total, int):
        return total
    return sum(meta.get(k) or 0 for k in ("promptTokenCount", "candidatesTokenCount", "thoughtsTokenCount"))
