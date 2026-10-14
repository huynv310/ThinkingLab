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

from datetime import datetime, timezone, timedelta
import json
import logging
import os
import random
import threading
import time

logger = logging.getLogger(__name__)

API_KEY_ENV = "GEMINI_API_KEY"
API_KEYS_ENV = "GEMINI_API_KEYS"
MODEL_ENV = "GEMINI_MODEL"
MODEL_FAST_ENV = "GEMINI_MODEL_FAST"
JITTER_ENV = "GEMINI_JITTER_ENABLED"
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
COOLDOWN_SECONDS = 60.0
DAILY_COOLDOWN_BUFFER_SECONDS = 60.0

_cooldown_until = {}
_key_cooldown_until = {}
_key_request_timestamps = {}
_key_last_used = {}
_lock = threading.Lock()


def _key_recent_count(key, now, window=60.0):
    timestamps = _key_request_timestamps.get(key, [])
    valid = [t for t in timestamps if now - t < window]
    _key_request_timestamps[key] = valid
    return len(valid)


def _record_key_use(key):
    now = time.monotonic()
    with _lock:
        _key_last_used[key] = now
        if key not in _key_request_timestamps:
            _key_request_timestamps[key] = []
        _key_request_timestamps[key].append(now)


def seconds_until_daily_reset(now=None):
    """Tính số giây từ hiện tại cho tới 00:00:00 UTC tiếp theo (thời điểm Google reset RPD)."""
    current = now or datetime.now(timezone.utc)
    tomorrow = (current + timedelta(days=1)).date()
    reset_time = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, 0, tzinfo=timezone.utc)
    seconds = (reset_time - current).total_seconds()
    return max(DAILY_COOLDOWN_BUFFER_SECONDS, seconds)


def is_daily_quota_exhausted(response) -> bool:
    """Kiểm tra xem response 429 là do cạn hạn mức ngày (RPD) hay chỉ là rate limit phút (RPM)."""
    if response is None:
        return False
    daily_keywords = (
        "requests per day",
        "per_day",
        "per day",
        "daily_requests",
        "requests_per_day",
        "generate_content_requests_per_day",
    )
    try:
        raw_text = (getattr(response, "text", "") or "").lower()
        if any(k in raw_text for k in daily_keywords):
            return True
    except Exception:
        pass

    try:
        data = response.json()
        if isinstance(data, dict):
            err = data.get("error", {})
            msg = str(err.get("message", "")).lower()
            if any(k in msg for k in daily_keywords):
                return True
            for d in err.get("details", []):
                if isinstance(d, dict):
                    metric = str(d.get("metadata", {}).get("quota_metric", "")).lower()
                    reason = str(d.get("reason", "")).lower()
                    if any(k in metric for k in ("per_day", "daily")) or any(k in reason for k in ("per_day", "daily")):
                        return True
    except Exception:
        pass
    return False


def _apply_jitter():
    """Chèn một độ trễ tự nhiên siêu nhỏ (50-150ms) khi chuyển sang key tiếp theo để tránh sybil burst."""
    if os.environ.get(JITTER_ENV, "true").lower() in ("true", "1", "yes"):
        if os.environ.get("PYTEST_CURRENT_TEST") is None:
            time.sleep(random.uniform(0.05, 0.15))


def api_keys():
    """Trả về danh sách API keys (hỗ trợ phân tách dấu phẩy/chấm phẩy/xuống dòng)."""
    raw = os.environ.get(API_KEYS_ENV, "").strip() or os.environ.get(API_KEY_ENV, "").strip()
    if not raw:
        return []
    import re
    return [k.strip() for k in re.split(r"[,;\n]+", raw) if k.strip()]


def api_key():
    """Trả về 1 key sẵn sàng (không bị cooldown) với tải thấp nhất (Least-Loaded Balancing)."""
    keys = api_keys()
    if not keys:
        return ""
    now = time.monotonic()
    with _lock:
        ready = [k for k in keys if _key_cooldown_until.get(k, 0) <= now]
        if not ready:
            return keys[0]
        ready.sort(key=lambda k: (_key_recent_count(k, now), _key_last_used.get(k, 0)))
        return ready[0]


def key_cooldown_remaining(key):
    """Trả về số giây cooldown còn lại của key (0 nếu key đang sẵn sàng)."""
    now = time.monotonic()
    with _lock:
        until = _key_cooldown_until.get(key, 0)
    return max(0.0, until - now)


def reset_cooldowns():
    with _lock:
        _cooldown_until.clear()
        _key_cooldown_until.clear()
        _key_request_timestamps.clear()
        _key_last_used.clear()


def _candidates(tier):
    models = list(TIERS[tier])
    custom = os.environ.get(MODEL_ENV, "").strip()
    custom_fast = os.environ.get(MODEL_FAST_ENV, "").strip()
    if tier == "lite" and custom_fast:
        models = [(custom_fast, {}), *(m for m in models if m[0] != custom_fast)]
    elif custom:
        models = [(custom, {}), *(m for m in models if m[0] != custom)]
    now = time.monotonic()
    with _lock:
        ready = [m for m in models if _cooldown_until.get(m[0], 0) <= now]
    return ready or models[:1]  # tất cả đang nghỉ -> vẫn thử 1 model


def _cool_down(model):
    with _lock:
        _cooldown_until[model] = time.monotonic() + COOLDOWN_SECONDS


def _cool_down_key(key, seconds=COOLDOWN_SECONDS):
    with _lock:
        _key_cooldown_until[key] = time.monotonic() + seconds


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

    active_keys = [key] if key else api_keys()
    if not active_keys:
        raise RuntimeError(f"Missing environment variable {API_KEY_ENV}")

    now = time.monotonic()
    with _lock:
        ready_keys = [k for k in active_keys if _key_cooldown_until.get(k, 0) <= now]
        if ready_keys:
            ready_keys.sort(key=lambda k: (_key_recent_count(k, now), _key_last_used.get(k, 0)))
            keys_to_try = ready_keys
        else:
            keys_to_try = active_keys[:1]

    response = None
    for model, extra in _candidates(tier):
        model_succeeded = False
        for current_key in keys_to_try:
            _record_key_use(current_key)
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
                headers={"x-goog-api-key": current_key},  # key ở header, không nằm trong URL/log
                timeout=timeout,
                allow_redirects=False,  # không để API key đi theo redirect
            )
            if response.status_code == 429:
                if is_daily_quota_exhausted(response):
                    cd_sec = seconds_until_daily_reset()
                    logger.warning(
                        "Gemini key exhausted daily quota (RPD). Cooling down for %.0fs until UTC 00:00", cd_sec
                    )
                    _cool_down_key(current_key, seconds=cd_sec)
                else:
                    logger.warning("Gemini key hit rate limit (RPM). Cooling down for %ss", COOLDOWN_SECONDS)
                    _cool_down_key(current_key, seconds=COOLDOWN_SECONDS)
                _apply_jitter()
                continue
            if response.status_code in RETRY_STATUSES:
                logger.warning("Gemini model %s returned %s, trying next model", model, response.status_code)
                _cool_down(model)
                break
            model_succeeded = True
            break
        if model_succeeded:
            break
        _cool_down(model)
    if response is None:
        raise RuntimeError("No Gemini model or key available")
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
