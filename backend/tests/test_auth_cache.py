"""Short-lived auth cache helpers."""

import base64
import json
import time

from app.security.auth_cache import jwt_exp, token_cache_key, token_still_valid
from app.security.dependencies import TTLCache


def _jwt(payload: dict) -> str:
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    return f"aaa.{body}.sig"


def test_token_cache_key_hides_the_raw_token():
    key = token_cache_key("secret-token")
    assert "secret" not in key
    assert key == token_cache_key("secret-token")
    assert key != token_cache_key("other-token")


def test_jwt_exp_reads_payload_without_verifying():
    exp = 1_800_000_000
    assert jwt_exp(_jwt({"sub": "u", "exp": exp})) == exp
    assert jwt_exp("not-a-jwt") is None


def test_token_still_valid_rejects_near_expiry():
    now = time.time()
    assert token_still_valid(now + 30, now)
    assert not token_still_valid(now + 1, now)
    assert token_still_valid(None, now)


def test_ttl_cache_expires():
    cache = TTLCache(ttl_seconds=10, max_size=4)
    cache.set("a", {"id": "1"})
    assert cache.get("a") == {"id": "1"}
    cache._store["a"] = (time.monotonic() - 1, {"id": "1"})
    assert cache.get("a") is None
