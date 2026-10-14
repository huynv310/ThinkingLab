"""Kiểm thử cơ chế Multi-Key Ring, Smart 429 Cooldown (RPM vs RPD), Jitter và Model Tiering của gemini_client."""

from datetime import datetime, timezone
import os
from unittest.mock import MagicMock, patch

import pytest
import gemini_client


def test_api_keys_parsing_single(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "key_1")
    monkeypatch.delenv("GEMINI_API_KEYS", raising=False)
    assert gemini_client.api_keys() == ["key_1"]
    assert gemini_client.api_key() == "key_1"


def test_api_keys_parsing_multiple_comma(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEYS", "key_1, key_2 , key_3")
    assert gemini_client.api_keys() == ["key_1", "key_2", "key_3"]
    assert gemini_client.api_key() in ["key_1", "key_2", "key_3"]


def test_api_keys_parsing_newline(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEYS", "key_alpha\nkey_beta;\nkey_gamma")
    assert gemini_client.api_keys() == ["key_alpha", "key_beta", "key_gamma"]


def test_is_daily_quota_exhausted_detection():
    # 1. Text chứa per day
    r1 = MagicMock()
    r1.text = "Quota exceeded for quota metric 'GenerateContent requests per day' and limit '1500'"
    r1.json.side_effect = ValueError
    assert gemini_client.is_daily_quota_exhausted(r1) is True

    # 2. Text chỉ chứa per minute (RPM)
    r2 = MagicMock()
    r2.text = "Rate limit exceeded: 15 requests per minute"
    r2.json.side_effect = ValueError
    assert gemini_client.is_daily_quota_exhausted(r2) is False

    # 3. JSON details chứa quota_metric per_day
    r3 = MagicMock()
    r3.text = ""
    r3.json.return_value = {
        "error": {
            "code": 429,
            "message": "Resource exhausted",
            "details": [{"metadata": {"quota_metric": "generate_content_requests_per_day"}}],
        }
    }
    assert gemini_client.is_daily_quota_exhausted(r3) is True

    # 4. None hoặc phản hồi bình thường
    assert gemini_client.is_daily_quota_exhausted(None) is False


def test_seconds_until_daily_reset():
    # Lúc 18:00:00 UTC -> còn đúng 6 tiếng (21600 giây) đến 00:00:00 UTC ngày mai
    t1 = datetime(2026, 10, 14, 18, 0, 0, tzinfo=timezone.utc)
    assert gemini_client.seconds_until_daily_reset(now=t1) == 21600.0

    # Lúc 23:59:40 UTC -> chỉ còn 20 giây, phải được đệm tối thiểu buffer 60 giây
    t2 = datetime(2026, 10, 14, 23, 59, 40, tzinfo=timezone.utc)
    assert gemini_client.seconds_until_daily_reset(now=t2) == 60.0


def test_key_rotation_on_429_rpm(monkeypatch):
    """Khi key_1 gặp 429 RPM, hệ thống cooldown 60s và failover sang key_2 thành công."""
    monkeypatch.setenv("GEMINI_API_KEYS", "key_1, key_2")
    gemini_client.reset_cooldowns()

    mock_resp_429 = MagicMock()
    mock_resp_429.status_code = 429
    mock_resp_429.text = "Rate limit per minute exceeded"
    mock_resp_429.json.return_value = {"error": {"message": "RPM exceeded"}}

    mock_resp_200 = MagicMock()
    mock_resp_200.status_code = 200
    mock_resp_200.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": '{"result": "ok"}'}]}}],
        "usageMetadata": {"totalTokenCount": 100},
    }

    call_keys = []

    def mock_post(url, **kwargs):
        used_key = kwargs.get("headers", {}).get("x-goog-api-key")
        call_keys.append(used_key)
        if used_key == "key_1":
            return mock_resp_429
        return mock_resp_200

    with patch("random.choice", side_effect=lambda x: x[0]), patch("requests.post", side_effect=mock_post):
        result = gemini_client.generate_json(
            system="system prompt",
            contents=[{"role": "user", "parts": [{"text": "hello"}]}],
            schema={"type": "OBJECT"},
        )

    assert result == {"result": "ok"}
    assert call_keys == ["key_1", "key_2"]
    # Key 1 bị cooldown 60s
    rem = gemini_client.key_cooldown_remaining("key_1")
    assert 55.0 <= rem <= 60.0
    # Key 2 vẫn sẵn sàng
    assert gemini_client.key_cooldown_remaining("key_2") == 0.0
    assert gemini_client.api_key() == "key_2"


def test_key_rotation_on_429_rpd_daily_exhausted(monkeypatch):
    """Khi key_1 gặp 429 RPD (hết hạn mức ngày), hệ thống cooldown dài hạn đến hết ngày (UTC 00:00)."""
    monkeypatch.setenv("GEMINI_API_KEYS", "key_1, key_2")
    gemini_client.reset_cooldowns()

    mock_resp_429_rpd = MagicMock()
    mock_resp_429_rpd.status_code = 429
    mock_resp_429_rpd.text = "Quota exceeded for quota metric 'GenerateContent requests per day'"
    mock_resp_429_rpd.json.return_value = {"error": {"message": "requests per day exhausted"}}

    mock_resp_200 = MagicMock()
    mock_resp_200.status_code = 200
    mock_resp_200.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": '{"result": "ok"}'}]}}],
        "usageMetadata": {"totalTokenCount": 100},
    }

    call_keys = []

    def mock_post(url, **kwargs):
        used_key = kwargs.get("headers", {}).get("x-goog-api-key")
        call_keys.append(used_key)
        if used_key == "key_1":
            return mock_resp_429_rpd
        return mock_resp_200

    with patch("random.choice", side_effect=lambda x: x[0]), patch("requests.post", side_effect=mock_post):
        result = gemini_client.generate_json(
            system="system prompt",
            contents=[{"role": "user", "parts": [{"text": "hello"}]}],
            schema={"type": "OBJECT"},
        )

    assert result == {"result": "ok"}
    assert call_keys == ["key_1", "key_2"]
    # Key 1 bị cooldown dài hạn (> 60s, thường hàng ngàn giây đến 00:00 UTC)
    rem = gemini_client.key_cooldown_remaining("key_1")
    assert rem > 60.0


def test_model_tiering_prioritizes_fast_model_for_lite(monkeypatch):
    """Khi cấu hình GEMINI_MODEL_FAST, tier lite phải ưu tiên model nhẹ này trước."""
    gemini_client.reset_cooldowns()
    monkeypatch.setenv("GEMINI_MODEL_FAST", "gemini-1.5-flash-8b")
    candidates = gemini_client._candidates("lite")
    assert candidates[0][0] == "gemini-1.5-flash-8b"


def test_model_tiering_prioritizes_smart_model(monkeypatch):
    """Khi cấu hình GEMINI_MODEL, tier smart phải ưu tiên model này trước."""
    gemini_client.reset_cooldowns()
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-pro")
    candidates = gemini_client._candidates("smart")
    assert candidates[0][0] == "gemini-2.5-pro"
