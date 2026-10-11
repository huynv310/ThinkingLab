"""Tìm GIF meme mới qua GIPHY API (cần GIPHY_API_KEY - miễn phí, ghi "Powered by GIPHY").
Không có key / lỗi -> None, api/chat.py dùng meme SVG có sẵn trong web/public/memes."""

import logging
import os
import random
import threading
import time
from urllib.parse import urlsplit

logger = logging.getLogger(__name__)

API_KEY_ENV = "GIPHY_API_KEY"
SEARCH_URL = "https://api.giphy.com/v1/gifs/search"
CACHE_SECONDS = 3600  # cùng từ khóa trong 1 giờ không gọi lại API
_cache = {}
_lock = threading.Lock()


def clear_cache():
    with _lock:
        _cache.clear()


def find_meme(query, exclude=()):
    """GIF ngẫu nhiên cho từ khóa, bỏ qua các URL trong `exclude` (meme đã gửi gần đây
    trong cuộc trò chuyện). Hết GIF mới -> None (thà không gửi còn hơn lặp lại)."""
    key = os.environ.get(API_KEY_ENV, "").strip()
    if not key or not query:
        return None
    query = " ".join(query.lower().split())

    with _lock:
        cached = _cache.get(query)
    if cached and cached[0] > time.monotonic():
        urls = cached[1]
    else:
        urls = _search(key, query)
        if urls is None:
            return None
        with _lock:
            _cache[query] = (time.monotonic() + CACHE_SECONDS, urls)
    fresh = [u for u in urls if u not in exclude]
    return random.choice(fresh) if fresh else None


def _search(key, query):
    import requests

    try:
        response = requests.get(
            SEARCH_URL,
            params={"api_key": key, "q": query, "limit": 25, "rating": "pg", "lang": "en"},
            timeout=(3.05, 5),
            allow_redirects=False,
        )
        response.raise_for_status()
        items = response.json().get("data", [])
    except Exception:
        logger.warning("GIPHY search failed", exc_info=False)  # không log URL vì chứa api_key
        return None
    urls = []
    for item in items:
        try:
            url = item["images"]["fixed_height"]["url"]
        except (KeyError, TypeError):
            continue
        if _is_giphy_url(url):
            urls.append(url)
    return urls


def _is_giphy_url(url):
    if not isinstance(url, str):
        return False
    parts = urlsplit(url)
    host = parts.hostname or ""
    return parts.scheme == "https" and (host == "giphy.com" or host.endswith(".giphy.com"))
