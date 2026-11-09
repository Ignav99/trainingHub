"""Pure helpers for the short-lived auth cache.

The API used to call Supabase Auth and `usuarios_equipos` on every request.
A page fires several requests at once, so that cost was paid again and again
and, because the Supabase client is synchronous, the calls also blocked the
event loop. Caching the verified user and their team roles for a few seconds
removes those round trips from every request after the first.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os


def cache_enabled() -> bool:
    """Off under pytest so tests that reuse one bearer token keep seeing fresh mocks."""
    return "PYTEST_CURRENT_TEST" not in os.environ


def token_cache_key(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:32]


def jwt_exp(token: str) -> float | None:
    """Read `exp` from a JWT payload. Identity still comes from a verified lookup."""
    try:
        payload_b64 = token.split(".")[1]
        pad = "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + pad))
    except Exception:
        return None
    exp = payload.get("exp")
    if isinstance(exp, (int, float)):
        return float(exp)
    return None


def token_still_valid(exp: float | None, now: float, skew_seconds: float = 2.0) -> bool:
    if exp is None:
        return True
    return exp > now + skew_seconds
