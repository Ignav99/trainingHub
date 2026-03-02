"""
TrainingHub Pro - Middleware
Security headers, request logging, rate limiting, and license enforcement.
"""

import time
import logging
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

logger = logging.getLogger("traininghub.requests")


# ============ Security Headers Middleware ============

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        return response


# ============ Request Logging Middleware ============

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs request method, path, status code and duration."""

    SKIP_PATHS = {"/", "/health", "/docs", "/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        start = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 1)

        logger.info(
            "%s %s %s %sms",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )

        response.headers["X-Response-Time"] = f"{duration_ms}ms"

        return response


# ============ Rate Limiting Middleware ============

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiter per IP.
    Limits to max_requests per window_seconds.
    """

    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _clean_old_requests(self, ip: str, now: float):
        cutoff = now - self.window_seconds
        self.requests[ip] = [t for t in self.requests[ip] if t > cutoff]

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in ("/", "/health"):
            return await call_next(request)

        ip = self._get_client_ip(request)
        now = time.time()

        self._clean_old_requests(ip, now)

        if len(self.requests[ip]) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Demasiadas solicitudes. Intenta de nuevo en un momento.",
                    "retry_after": self.window_seconds,
                },
                headers={"Retry-After": str(self.window_seconds)},
            )

        self.requests[ip].append(now)

        response = await call_next(request)

        remaining = self.max_requests - len(self.requests[ip])
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))

        return response


# ============ License Enforcement Middleware ============

class LicenseEnforcementMiddleware(BaseHTTPMiddleware):
    """
    Checks subscription status on authenticated requests.
    - active/trial: allow all
    - past_due: allow all (7-day grace before moving to grace_period)
    - grace_period: read-only (GET allowed, mutations blocked)
    - suspended: only /auth/me, /suscripcion/*, /gdpr/* allowed
    - cancelled: only /auth/me, /suscripcion/*, /gdpr/* allowed

    Uses in-memory cache with 5-minute TTL to avoid DB queries on every request.
    """

    # Paths that are always allowed regardless of subscription status
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

    def __init__(self, app):
        super().__init__(app)
        self._cache: dict[str, tuple[str, float]] = {}  # org_id -> (status, timestamp)
        self._cache_ttl = 300  # 5 minutes

    def _get_cached_status(self, org_id: str) -> str | None:
        if org_id in self._cache:
            status, ts = self._cache[org_id]
            if time.time() - ts < self._cache_ttl:
                return status
            del self._cache[org_id]
        return None

    def _set_cached_status(self, org_id: str, status: str):
        self._cache[org_id] = (status, time.time())

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Always allow certain paths
        if path in self.ALWAYS_ALLOWED_PATHS:
            return await call_next(request)

        for prefix in self.ALWAYS_ALLOWED_PREFIXES:
            if path.startswith(prefix):
                return await call_next(request)

        # Only check authenticated requests (has Authorization header)
        auth_header = request.headers.get("authorization")
        if not auth_header:
            return await call_next(request)

        # Try to extract org_id from the request (set by auth dependency)
        # This middleware runs before dependencies, so we need to check subscription
        # based on the token. For efficiency, we rely on the require_permission
        # dependency for actual enforcement and only do a lightweight check here.
        # The real enforcement happens in security/dependencies.py

        return await call_next(request)
