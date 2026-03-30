"""
TrainingHub Pro - Middleware (Pure ASGI)
Security headers, request logging, rate limiting, and license enforcement.

Uses pure ASGI instead of BaseHTTPMiddleware to avoid the known
"No response returned" bug with stacked BaseHTTPMiddleware classes.
See: https://github.com/encode/starlette/issues/1012
"""

import time
import logging
from collections import defaultdict
from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.responses import JSONResponse

logger = logging.getLogger("traininghub.requests")


# ============ Security Headers Middleware ============

class SecurityHeadersMiddleware:
    """Adds security headers to all responses (pure ASGI)."""

    HEADERS = [
        (b"x-content-type-options", b"nosniff"),
        (b"x-frame-options", b"DENY"),
        (b"x-xss-protection", b"1; mode=block"),
        (b"referrer-policy", b"strict-origin-when-cross-origin"),
        (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
        (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
    ]

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend(self.HEADERS)
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_headers)


# ============ Request Logging Middleware ============

class RequestLoggingMiddleware:
    """Logs request method, path, status code and duration (pure ASGI)."""

    SKIP_PATHS = {"/", "/health", "/docs", "/redoc", "/openapi.json"}

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http" or scope["path"] in self.SKIP_PATHS:
            await self.app(scope, receive, send)
            return

        start = time.time()

        async def send_with_logging(message):
            if message["type"] == "http.response.start":
                duration_ms = round((time.time() - start) * 1000, 1)
                logger.info(
                    "%s %s %s %sms",
                    scope["method"],
                    scope["path"],
                    message["status"],
                    duration_ms,
                )
                headers = list(message.get("headers", []))
                headers.append((b"x-response-time", str(duration_ms).encode()))
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_logging)


# ============ Rate Limiting Middleware ============

class CacheControlMiddleware:
    """Sets Cache-Control headers on GET responses based on endpoint type (pure ASGI).

    Tiers:
      - Catalogs (rarely change): 5 min + 10 min stale
      - Data lists (jugadores, equipos, rivales): 60s + 5 min stale
      - Session-volatile (sesiones, tareas, partidos, dashboard): 30s + 2 min stale
      - No-cache: auth, AI, exports, POST/PUT/PATCH/DELETE
    """

    LONG_CACHE_PREFIXES = (
        "/v1/catalogos/",
    )
    MEDIUM_CACHE_PREFIXES = (
        "/v1/jugadores",
        "/v1/equipos",
        "/v1/rivales",
        "/v1/nutricion",
        "/v1/rfef/competiciones",
    )
    SHORT_CACHE_PREFIXES = (
        "/v1/sesiones",
        "/v1/tareas",
        "/v1/partidos",
        "/v1/dashboard",
        "/v1/microciclos",
        "/v1/carga",
        "/v1/wellness",
        "/v1/convocatorias",
        "/v1/descansos",
        "/v1/rpe",
        "/v1/estadisticas",
    )
    NO_CACHE_PREFIXES = (
        "/v1/auth",
        "/v1/ai",
        "/v1/exports",
        "/v1/stripe",
        "/v1/onboarding",
    )

    def __init__(self, app: ASGIApp):
        self.app = app

    def _get_cache_header(self, method: str, path: str) -> bytes | None:
        if method != "GET":
            return b"no-store"

        for prefix in self.NO_CACHE_PREFIXES:
            if path.startswith(prefix):
                return b"no-store"

        for prefix in self.LONG_CACHE_PREFIXES:
            if path.startswith(prefix):
                return b"private, max-age=300, stale-while-revalidate=600"

        for prefix in self.MEDIUM_CACHE_PREFIXES:
            if path.startswith(prefix):
                return b"private, max-age=60, stale-while-revalidate=300"

        for prefix in self.SHORT_CACHE_PREFIXES:
            if path.startswith(prefix):
                return b"private, max-age=30, stale-while-revalidate=120"

        # Default for other GET endpoints
        return b"private, max-age=30, stale-while-revalidate=60"

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        path = scope.get("path", "/")
        cache_value = self._get_cache_header(method, path)

        if not cache_value:
            await self.app(scope, receive, send)
            return

        async def send_with_cache(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                # Don't override if endpoint already set Cache-Control
                header_names = {h[0] for h in headers}
                if b"cache-control" not in header_names:
                    headers.append((b"cache-control", cache_value))
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_cache)


# ============ Rate Limiting Middleware ============

class RateLimitMiddleware:
    """Per-IP rate limiter with optional Redis backend (pure ASGI).

    If REDIS_URL is configured, uses Redis INCR+EXPIRE for persistence across restarts.
    Otherwise falls back to in-memory (same behavior as before).
    """

    def __init__(self, app: ASGIApp, max_requests: int = 100, window_seconds: int = 60):
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)
        self._redis = None
        self._redis_init_attempted = False

    def _get_redis(self):
        if self._redis_init_attempted:
            return self._redis
        self._redis_init_attempted = True
        try:
            from app.config import get_settings
            settings = get_settings()
            if settings.REDIS_URL:
                import redis
                self._redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
                self._redis.ping()
                logger.info("RateLimitMiddleware: using Redis backend")
        except Exception as e:
            logger.warning(f"RateLimitMiddleware: Redis unavailable, using in-memory: {e}")
            self._redis = None
        return self._redis

    def _get_client_ip(self, scope: Scope) -> str:
        headers = dict(scope.get("headers", []))
        forwarded = headers.get(b"x-forwarded-for")
        if forwarded:
            return forwarded.decode().split(",")[0].strip()
        client = scope.get("client")
        return client[0] if client else "unknown"

    def _check_rate_limit_redis(self, ip: str) -> tuple[bool, int]:
        """Returns (allowed, remaining)."""
        r = self._redis
        key = f"ratelimit:{ip}"
        try:
            current = r.incr(key)
            if current == 1:
                r.expire(key, self.window_seconds)
            remaining = max(0, self.max_requests - current)
            return current <= self.max_requests, remaining
        except Exception:
            return True, self.max_requests  # Fail open

    def _check_rate_limit_memory(self, ip: str) -> tuple[bool, int]:
        """Returns (allowed, remaining)."""
        now = time.time()
        cutoff = now - self.window_seconds
        self.requests[ip] = [t for t in self.requests[ip] if t > cutoff]
        if len(self.requests[ip]) >= self.max_requests:
            return False, 0
        self.requests[ip].append(now)
        remaining = self.max_requests - len(self.requests[ip])
        return True, remaining

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http" or scope["path"] in ("/", "/health"):
            await self.app(scope, receive, send)
            return

        ip = self._get_client_ip(scope)
        r = self._get_redis()

        if r:
            allowed, remaining = self._check_rate_limit_redis(ip)
        else:
            allowed, remaining = self._check_rate_limit_memory(ip)

        if not allowed:
            response = JSONResponse(
                status_code=429,
                content={
                    "detail": "Demasiadas solicitudes. Intenta de nuevo en un momento.",
                    "retry_after": self.window_seconds,
                },
                headers={"Retry-After": str(self.window_seconds)},
            )
            await response(scope, receive, send)
            return

        async def send_with_rate_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend([
                    (b"x-ratelimit-limit", str(self.max_requests).encode()),
                    (b"x-ratelimit-remaining", str(max(0, remaining)).encode()),
                ])
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_rate_headers)
