"""
TrainingHub Pro - Middleware (Pure ASGI)
Security headers, request logging, rate limiting, and license enforcement.

Uses pure ASGI instead of BaseHTTPMiddleware to avoid the known
"No response returned" bug with stacked BaseHTTPMiddleware classes.
See: https://github.com/encode/starlette/issues/1012
"""

import base64
import json
import time
import logging
from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.responses import JSONResponse

logger = logging.getLogger("traininghub.requests")


# ============ Security Headers Middleware ============

class SecurityHeadersMiddleware:
    """Adds security headers to all responses (pure ASGI).

    Includes Content-Security-Policy as a second line of defence
    against XSS, clickjacking, and data injection.
    """

    # frame-ancestors, base-uri, form-action are strict.
    # script-src allows inline for Next.js RSC streaming (if needed),
    # but unsafe-inline is scoped to 'self'.
    # connect-src allows API, Supabase, and uploads.
    # upgrade-insecure-requests ensures HTTPS for all sub-resources.
    CSP_VALUE = (
        b"default-src 'self'; "
        b"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co; "
        b"style-src 'self' 'unsafe-inline'; "
        b"img-src 'self' data: blob: https://*.supabase.co https://*.unsplash.com; "
        b"font-src 'self' data:; "
        b"connect-src 'self' https://*.supabase.co https://*.googleapis.com https://*.resend.com https://*.stripe.com wss://*.supabase.co; "
        b"media-src 'self' blob: https://*.supabase.co; "
        b"frame-src 'self' https://*.stripe.com https://*.supabase.co; "
        b"frame-ancestors 'none'; "
        b"base-uri 'self'; "
        b"form-action 'self'; "
        b"upgrade-insecure-requests;"
    )

    HEADERS = [
        (b"x-content-type-options", b"nosniff"),
        (b"x-frame-options", b"DENY"),
        (b"x-xss-protection", b"1; mode=block"),
        (b"referrer-policy", b"strict-origin-when-cross-origin"),
        (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
        (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
        (b"content-security-policy", CSP_VALUE),
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
                content_type = b""
                for key, value in headers:
                    if key.lower() == b"content-type":
                        content_type = value.lower()
                        break
                # CSP estricto rompe la vista inline de PDFs en el navegador.
                if content_type.startswith(b"application/pdf"):
                    headers.extend([
                        (b"x-content-type-options", b"nosniff"),
                        (b"referrer-policy", b"strict-origin-when-cross-origin"),
                    ])
                else:
                    headers.extend(self.HEADERS)
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_headers)


# ============ Request Logging Middleware ============

class RequestLoggingMiddleware:
    """Logs request method, path, status code and duration (pure ASGI)."""

    SKIP_PATHS = {"/", "/health", "/ready", "/docs", "/redoc", "/openapi.json"}

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


# ============ Cache Control Middleware ============

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
        # Admin/config surfaces where "save then reload to verify" is the
        # normal workflow (club settings, kit/equipacion editor, club-admin
        # panel). These previously fell through to the 30s default cache,
        # so a GET right after a successful PUT/PATCH could serve a stale
        # cached response and look like the edit was silently lost.
        "/v1/organizacion",
        "/v1/club",
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

def _jwt_sub(auth_header: bytes | None) -> str | None:
    """`sub` del JWT Bearer SIN verificar firma: solo sirve como clave de cuota.

    La autenticación real la hace la dependencia de auth; un token falso solo
    consigue su propio cubo, y sigue limitado.
    """
    if not auth_header or not auth_header[:7].lower() == b"bearer ":
        return None
    try:
        payload_b64 = auth_header[7:].split(b".")[1]
        pad = b"=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + pad))
        sub = payload.get("sub")
        return str(sub)[:64] if sub else None
    except Exception:
        return None


class RateLimitMiddleware:
    """Rate limiter por usuario (sub del JWT) con fallback a IP (pure ASGI).

    Antes era 100 req/min por IP: un cuerpo técnico en la wifi del club comparte
    IP y un dashboard dispara decenas de peticiones, así que usuarios legítimos
    recibían 429 ("fallo al cargar"). Ahora:
      - usuario autenticado: `max_requests` por ventana (por defecto 600/min)
      - anónimo (por IP):    `anon_max_requests` (por defecto 300/min)
      - login/registro/refresh: `auth_max_requests` por IP (anti fuerza bruta)
      - IA / chat (caro):    `expensive_max_requests` por usuario
      - techo por IP (`ip_ceiling`) para quien rote `sub` falsos

    Ventana fija (contador). Con REDIS_URL el contador es compartido entre
    workers e instancias; si no, es en memoria por worker.
    """

    AUTH_PATHS = ("/v1/auth/login", "/v1/auth/register", "/v1/auth/refresh")
    SKIP_PATHS = ("/", "/health", "/ready")
    _MAX_KEYS = 20_000

    def __init__(
        self,
        app: ASGIApp,
        max_requests: int = 600,
        window_seconds: int = 60,
        anon_max_requests: int = 300,
        auth_max_requests: int = 20,
        expensive_max_requests: int = 40,
        ip_ceiling: int = 3000,
    ):
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.anon_max_requests = anon_max_requests
        self.auth_max_requests = auth_max_requests
        self.expensive_max_requests = expensive_max_requests
        # Techo por IP aunque cada petición traiga un `sub` distinto (JWT
        # falsificado para esquivar la cuota). Holgado para una wifi de club.
        self.ip_ceiling = ip_ceiling
        self.counters: dict[str, tuple[int, int]] = {}  # key -> (window, count)
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
                self._redis = redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_timeout=0.3,
                    socket_connect_timeout=0.5,
                )
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

    @staticmethod
    def _is_expensive(method: str, path: str) -> bool:
        if method != "POST":
            return False
        if path.startswith("/v1/ai/") or path == "/v1/ai":
            return True
        return any(
            seg.startswith("ai-") or seg.endswith(("chat", "diagram", "diagrams"))
            for seg in path.split("/")
        )

    def _bucket(self, scope: Scope) -> tuple[str, int]:
        """(clave, límite) para esta petición."""
        path = scope["path"]
        method = scope.get("method", "GET")
        ip = self._get_client_ip(scope)
        if path in self.AUTH_PATHS:
            return f"auth:{ip}", self.auth_max_requests
        sub = _jwt_sub(dict(scope.get("headers", [])).get(b"authorization"))
        if sub and self._is_expensive(method, path):
            return f"exp:{sub}", self.expensive_max_requests
        if sub:
            return f"user:{sub}", self.max_requests
        return f"ip:{ip}", self.anon_max_requests

    def _check_rate_limit_redis(self, key: str, limit: int) -> tuple[bool, int]:
        """Returns (allowed, remaining)."""
        r = self._redis
        window = int(time.time() // self.window_seconds)
        rkey = f"ratelimit:{key}:{window}"
        try:
            pipe = r.pipeline()
            pipe.incr(rkey)
            pipe.expire(rkey, self.window_seconds + 5)
            current = pipe.execute()[0]
            return current <= limit, max(0, limit - current)
        except Exception:
            return True, limit  # Fail open

    def _check_rate_limit_memory(self, key: str, limit: int) -> tuple[bool, int]:
        """Returns (allowed, remaining)."""
        window = int(time.time() // self.window_seconds)
        if len(self.counters) > self._MAX_KEYS:
            self.counters = {k: v for k, v in self.counters.items() if v[0] == window}
        w, count = self.counters.get(key, (window, 0))
        if w != window:
            count = 0
        if count >= limit:
            self.counters[key] = (window, count)
            return False, 0
        count += 1
        self.counters[key] = (window, count)
        return True, limit - count

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if (
            scope["type"] != "http"
            or scope["path"] in self.SKIP_PATHS
            or scope.get("method") == "OPTIONS"  # preflight CORS: no gastar cuota
        ):
            await self.app(scope, receive, send)
            return

        key, limit = self._bucket(scope)
        r = self._get_redis()
        check = self._check_rate_limit_redis if r else self._check_rate_limit_memory

        allowed, remaining = check(key, limit)
        if allowed and key.startswith(("user:", "exp:")):
            ip_ok, _ = check(f"ipall:{self._get_client_ip(scope)}", self.ip_ceiling)
            if not ip_ok:
                allowed, key = False, "ipall:"

        if not allowed:
            retry_after = self.window_seconds - int(time.time() % self.window_seconds)
            logger.warning("Rate limit hit key=%s path=%s", key.split(":")[0], scope["path"])
            response = JSONResponse(
                status_code=429,
                content={
                    "detail": "Demasiadas solicitudes. Intenta de nuevo en un momento.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )
            await response(scope, receive, send)
            return

        async def send_with_rate_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend([
                    (b"x-ratelimit-limit", str(limit).encode()),
                    (b"x-ratelimit-remaining", str(max(0, remaining)).encode()),
                ])
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_rate_headers)


# ============ Compression ============

class SelectiveGZipMiddleware:
    """GZip para JSON/HTML, salvo SSE (rompería el streaming) y binarios ya
    comprimidos (PDF, imágenes, vídeo) donde solo gastaría CPU (0,5 vCPU)."""

    SKIP_SUFFIXES = ("/stream",)
    SKIP_MARKERS = ("pdf", "/escudo", "/foto", "/video", "/clip", "/upload", "/download", "/presentacion")

    def __init__(self, app: ASGIApp, minimum_size: int = 1024, compresslevel: int = 5):
        from starlette.middleware.gzip import GZipMiddleware

        self.app = app
        self.gzip = GZipMiddleware(app, minimum_size=minimum_size, compresslevel=compresslevel)

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            path = scope.get("path", "").lower()
            if not path.endswith(self.SKIP_SUFFIXES) and not any(m in path for m in self.SKIP_MARKERS):
                await self.gzip(scope, receive, send)
                return
        await self.app(scope, receive, send)
