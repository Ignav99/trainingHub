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

class RateLimitMiddleware:
    """Simple in-memory rate limiter per IP (pure ASGI)."""

    def __init__(self, app: ASGIApp, max_requests: int = 100, window_seconds: int = 60):
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, scope: Scope) -> str:
        headers = dict(scope.get("headers", []))
        forwarded = headers.get(b"x-forwarded-for")
        if forwarded:
            return forwarded.decode().split(",")[0].strip()
        client = scope.get("client")
        return client[0] if client else "unknown"

    def _clean_old_requests(self, ip: str, now: float):
        cutoff = now - self.window_seconds
        self.requests[ip] = [t for t in self.requests[ip] if t > cutoff]

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http" or scope["path"] in ("/", "/health"):
            await self.app(scope, receive, send)
            return

        ip = self._get_client_ip(scope)
        now = time.time()
        self._clean_old_requests(ip, now)

        if len(self.requests[ip]) >= self.max_requests:
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

        self.requests[ip].append(now)
        remaining = self.max_requests - len(self.requests[ip])

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


# ============ License Enforcement Middleware ============

class LicenseEnforcementMiddleware:
    """
    License check placeholder (pure ASGI).
    Currently pass-through - real enforcement in security/dependencies.py.
    """

    ALWAYS_ALLOWED_PATHS = {
        "/", "/health", "/docs", "/redoc", "/openapi.json",
        "/v1/auth/login", "/v1/auth/register", "/v1/auth/refresh", "/v1/auth/logout",
        "/v1/auth/me",
        "/v1/invitaciones/verify",
        "/v1/tutores/verify",
        "/v1/tutores/accept",
        "/v1/stripe/webhook",
    }

    ALWAYS_ALLOWED_PREFIXES = (
        "/v1/suscripciones/",
        "/v1/gdpr/",
        "/v1/invitaciones/verify/",
        "/v1/invitaciones/accept",
        "/v1/tutores/",
        "/v1/stripe/",
    )

    def __init__(self, app: ASGIApp):
        self.app = app
        self._cache: dict[str, tuple[str, float]] = {}
        self._cache_ttl = 300

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        # Pass through - actual enforcement in dependencies
        await self.app(scope, receive, send)
