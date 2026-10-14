import pytest

import gemini_client


@pytest.fixture(autouse=True)
def _isolated_ai(monkeypatch):
    """Test không bao giờ dùng API key thật trong môi trường -> không tốn lượt gọi."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEYS", raising=False)
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    monkeypatch.delenv("GIPHY_API_KEY", raising=False)
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "false")
    gemini_client.reset_cooldowns()
    try:
        import api.chat as chat_api
        chat_api.reset_rate_limits()
    except Exception:
        pass
    yield
    gemini_client.reset_cooldowns()
    try:
        import api.chat as chat_api
        chat_api.reset_rate_limits()
    except Exception:
        pass
