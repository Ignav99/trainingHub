# tests/test_subscription_cache.py
"""Tests for TTL subscription cache in dependencies.py."""
import time
import pytest
from unittest.mock import patch, MagicMock


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_supabase_mock(data: dict):
    mock = MagicMock()
    (mock.table.return_value
        .select.return_value
        .eq.return_value
        .single.return_value
        .execute.return_value
        .data) = data
    return mock


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_ttlcache_class_exists():
    """TTLCache must be importable from dependencies."""
    from app.security.dependencies import TTLCache
    assert TTLCache is not None


def test_ttlcache_set_and_get():
    from app.security.dependencies import TTLCache
    cache = TTLCache(ttl_seconds=60, max_size=10)
    cache.set("key1", {"plan": "pro"})
    val = cache.get("key1")
    assert val == {"plan": "pro"}


def test_ttlcache_miss_returns_none():
    from app.security.dependencies import TTLCache
    cache = TTLCache(ttl_seconds=60, max_size=10)
    assert cache.get("missing") is None


def test_ttlcache_expires_after_ttl():
    from app.security.dependencies import TTLCache
    cache = TTLCache(ttl_seconds=60, max_size=10)
    fake_now = time.monotonic()
    with patch("time.monotonic", return_value=fake_now):
        cache.set("key1", {"plan": "basic"})

    # Advance time past TTL
    with patch("time.monotonic", return_value=fake_now + 61):
        result = cache.get("key1")
    assert result is None, "Entry should be expired after TTL"


def test_ttlcache_does_not_expire_before_ttl():
    from app.security.dependencies import TTLCache
    cache = TTLCache(ttl_seconds=300, max_size=10)
    fake_now = time.monotonic()
    with patch("time.monotonic", return_value=fake_now):
        cache.set("org-123", {"estado": "active"})

    with patch("time.monotonic", return_value=fake_now + 299):
        result = cache.get("org-123")
    assert result == {"estado": "active"}


def test_ttlcache_invalidate():
    from app.security.dependencies import TTLCache
    cache = TTLCache(ttl_seconds=300, max_size=10)
    cache.set("org-abc", {"estado": "active"})
    cache.invalidate("org-abc")
    assert cache.get("org-abc") is None


def test_get_subscription_info_caches_result():
    """Second call with same org_id should NOT hit Supabase again."""
    from app.security import dependencies

    # Reset cache state
    dependencies._subscription_cache.invalidate("org-test-1")

    mock_data = {"estado": "active", "planes": {"nombre": "pro"}}
    mock_sb = _make_supabase_mock(mock_data)

    with patch("app.security.dependencies.get_supabase", return_value=mock_sb):
        result1 = dependencies._get_subscription_info("org-test-1")
        result2 = dependencies._get_subscription_info("org-test-1")

    assert result1 == mock_data
    assert result2 == mock_data
    # Supabase .execute() called only ONCE
    assert mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.call_count == 1, \
        "Supabase must be called only once — second call should hit cache"


def test_get_subscription_info_cache_miss_after_expiry():
    """After TTL, Supabase is called again."""
    from app.security import dependencies

    dependencies._subscription_cache.invalidate("org-test-2")

    mock_data = {"estado": "active"}
    mock_sb = _make_supabase_mock(mock_data)

    fake_now = time.monotonic()

    with patch("time.monotonic", return_value=fake_now):
        with patch("app.security.dependencies.get_supabase", return_value=mock_sb):
            dependencies._get_subscription_info("org-test-2")

    # Advance past TTL (5 minutes = 300s)
    with patch("time.monotonic", return_value=fake_now + 301):
        with patch("app.security.dependencies.get_supabase", return_value=mock_sb):
            dependencies._get_subscription_info("org-test-2")

    assert mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.call_count == 2, \
        "Supabase must be called twice — cache expired"


def test_invalidate_subscription_cache_function_exists():
    """invalidate_subscription_cache must be a public function in dependencies."""
    from app.security.dependencies import invalidate_subscription_cache
    invalidate_subscription_cache("org-xyz")  # must not raise


def test_invalidate_clears_cached_value():
    from app.security import dependencies
    from app.security.dependencies import invalidate_subscription_cache

    mock_data = {"estado": "active"}
    mock_sb = _make_supabase_mock(mock_data)

    dependencies._subscription_cache.invalidate("org-inv-test")

    with patch("app.security.dependencies.get_supabase", return_value=mock_sb):
        dependencies._get_subscription_info("org-inv-test")

    # Invalidate and fetch again — should call Supabase a second time
    invalidate_subscription_cache("org-inv-test")

    with patch("app.security.dependencies.get_supabase", return_value=mock_sb):
        dependencies._get_subscription_info("org-inv-test")

    assert mock_sb.table.return_value.select.return_value.eq.return_value.single.return_value.execute.call_count == 2
