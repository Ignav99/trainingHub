"""
TrainingHub Pro - API Backend
Punto de entrada principal de la aplicacion FastAPI.
"""

import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


settings = get_settings()

# ============ Sentry Initialization ============
if settings.SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        environment="production" if not settings.DEBUG else "development",
        release=f"traininghub-backend@{settings.APP_VERSION}",
    )

from app.api.v1.router import api_router
from app.database import init_supabase
from app.middleware import (
    SecurityHeadersMiddleware,
    RequestLoggingMiddleware,
    RateLimitMiddleware,
    CacheControlMiddleware,
    SelectiveGZipMiddleware,
)


# Hilos para el trabajo síncrono (cliente Supabase síncrono, PDFs, scrapers).
# Las rutas `def` usan el limitador de anyio; asyncio.to_thread usa el executor
# por defecto del loop, que sin configurar depende de os.cpu_count() del host.
# Cada hilo puede retener su propia arena de malloc: con 60+32 hilos en 512 MB
# la instancia moría por memoria (nov 2026). Los hilos casi siempre esperan
# red, así que 16 bastan; subir solo si sube la RAM del plan.
THREADPOOL_SIZE = int(os.environ.get("THREADPOOL_SIZE", "16"))
ASYNCIO_EXECUTOR_SIZE = int(os.environ.get("ASYNCIO_EXECUTOR_SIZE", "8"))
MEMORIA_LOG_SEGUNDOS = int(os.environ.get("MEMORIA_LOG_SEGUNDOS", "120"))

_log_memoria = logging.getLogger("traininghub.memoria")


def _leer_mb(path: str) -> int | None:
    try:
        with open(path) as fh:
            valor = fh.read().strip()
        return None if valor == "max" else int(valor) // (1024 * 1024)
    except (OSError, ValueError):
        return None


def _rss_mb() -> int | None:
    try:
        with open("/proc/self/status") as fh:
            for linea in fh:
                if linea.startswith("VmRSS:"):
                    return int(linea.split()[1]) // 1024
    except (OSError, ValueError, IndexError):
        pass
    return None


async def _vigilar_memoria() -> None:
    """Una línea periódica en los logs con la memoria del worker y del
    contenedor, para ver en Render si crece antes de que lo maten."""
    import asyncio
    import threading

    while True:
        _log_memoria.info(
            "rss_worker=%sMB contenedor=%s/%sMB hilos=%s limite_hilos=%s",
            _rss_mb(),
            _leer_mb("/sys/fs/cgroup/memory.current"),
            _leer_mb("/sys/fs/cgroup/memory.max"),
            threading.active_count(),
            THREADPOOL_SIZE,
        )
        await asyncio.sleep(MEMORIA_LOG_SEGUNDOS)


def _configure_thread_pools() -> None:
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    import anyio.to_thread

    anyio.to_thread.current_default_thread_limiter().total_tokens = THREADPOOL_SIZE
    asyncio.get_running_loop().set_default_executor(
        ThreadPoolExecutor(max_workers=ASYNCIO_EXECUTOR_SIZE, thread_name_prefix="th-io")
    )


def _acquire_scheduler_lock():
    """Lock de fichero no bloqueante: el primer worker que lo coge corre el
    scheduler. Si ese worker muere, el SO libera el lock y el worker que lo
    sustituye lo recoge."""
    if os.environ.get("DISABLE_SCHEDULER") == "1":
        return None
    try:
        import fcntl
    except ImportError:  # Windows dev
        return open(os.devnull, "w")
    path = os.environ.get("SCHEDULER_LOCK_FILE", "/tmp/traininghub-scheduler.lock")
    fh = open(path, "w")
    try:
        fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        fh.close()
        return None
    return fh


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle del servidor - inicializacion y cleanup."""
    # Startup
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    _configure_thread_pools()
    init_supabase()
    import asyncio
    vigilante_memoria = (
        asyncio.create_task(_vigilar_memoria()) if MEMORIA_LOG_SEGUNDOS > 0 else None
    )

    # Start RFAF scraping scheduler — SOLO en un worker (con varios workers
    # cada uno lo arrancaría y el scraping/cron se ejecutaría N veces).
    from app.services.rfef_scheduler_service import start_scheduler, stop_scheduler
    scheduler_lock = _acquire_scheduler_lock()
    if scheduler_lock is not None:
        try:
            start_scheduler()
            print("✅ RFAF scheduler started")
        except Exception as e:
            print(f"⚠️ RFAF scheduler failed to start: {e}")
    else:
        print("ℹ️ RFAF scheduler running in another worker")

    yield

    # Shutdown
    if vigilante_memoria is not None:
        vigilante_memoria.cancel()
    if scheduler_lock is not None:
        try:
            stop_scheduler()
        except Exception:
            pass
        scheduler_lock.close()
    print("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## TrainingHub Pro API

    API para gestion de sesiones y tareas de entrenamiento de futbol profesional.

    ### Caracteristicas:
    - Gestion de tareas de entrenamiento
    - Planificacion de sesiones
    - Sistema de recomendacion inteligente
    - Generacion de PDFs profesionales
    - Multi-equipo con roles granulares
    - Sistema de licencias y suscripciones
    - Control parental (RGPD/LOPD)
    - Modulo medico con cifrado

    ### Autenticacion:
    Usar token JWT en header `Authorization: Bearer <token>`
    """,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Middleware stack (order matters: last added = outermost = first executed)
# Add in reverse order: innermost first, outermost last
# 0. Compresión JSON (innermost: comprime el cuerpo de la ruta)
app.add_middleware(SelectiveGZipMiddleware, minimum_size=1024, compresslevel=5)
# 1. Request logging (innermost - logs after processing)
app.add_middleware(RequestLoggingMiddleware)
# 2. Cache-Control headers
app.add_middleware(CacheControlMiddleware)
# 3. Security headers (includes Content-Security-Policy)
app.add_middleware(SecurityHeadersMiddleware)
# 4. Rate limiting
app.add_middleware(
    RateLimitMiddleware,
    max_requests=600,  # por usuario (sub del JWT); antes 100/min por IP
    window_seconds=60,
    anon_max_requests=300,
    auth_max_requests=30,
    expensive_max_requests=40,
)
# 5. CORS (outermost - MUST wrap everything so error responses get CORS headers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global exception handler — ensures unhandled errors return JSON with CORS headers
# (Without this, exceptions propagate to Starlette's ServerErrorMiddleware which
# sits outside CORSMiddleware, producing 500 responses without CORS headers)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger = logging.getLogger("traininghub.errors")
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    if settings.SENTRY_DSN:
        import sentry_sdk
        sentry_sdk.capture_exception(exc)

    # Asegurar CORS también en 500 (el browser bloquea si faltan estas cabeceras)
    origin = request.headers.get("origin")
    headers = {}
    allowed = set(settings.cors_origins_list or [])
    if getattr(settings, "FRONTEND_URL", None):
        allowed.add(settings.FRONTEND_URL.rstrip("/"))
    # Orígenes conocidos de Render (por si CORS_ORIGINS en el servicio está incompleto)
    allowed.update(
        {
            "https://traininghub-frontend-eu.onrender.com",
            "https://traininghub-frontend.onrender.com",
            "http://localhost:3000",
        }
    )
    if origin and (origin in allowed or "*" in allowed):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "*"
        headers["Access-Control-Allow-Headers"] = "*"
        headers["Vary"] = "Origin"

    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor. Revisa los logs."},
        headers=headers,
    )


# Incluir routers
app.include_router(api_router, prefix="/v1")

# WebSocket routes
from app.api.v1.websocket import router as ws_router
app.include_router(ws_router, prefix="/v1")


@app.get("/")
async def root():
    """Liveness probe (rápido). No depende de BD."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/health")
async def health_check():
    """
    Liveness para Render / balanceadores.

    CRÍTICO: no consultar Supabase ni I/O externo aquí.
    Render marca el servicio unhealthy si no responde en ~5s
    (histórico: timeouts periódicos tumbaron la API).
    """
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
    }


@app.get("/ready")
async def readiness_check():
    """Readiness: dependencias. Para monitores internos — NO usar como healthCheckPath de Render."""
    from fastapi.responses import JSONResponse
    from app.database import get_supabase

    checks: dict[str, str] = {}
    healthy = True

    try:
        supabase = get_supabase()
        supabase.table("organizaciones").select("id", count="exact").limit(0).execute()
        checks["database"] = "connected"
    except Exception as e:
        checks["database"] = f"disconnected: {e}"
        healthy = False

    if settings.REDIS_URL:
        try:
            import redis
            r = redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
            r.ping()
            checks["redis"] = "connected"
        except Exception as e:
            checks["redis"] = f"disconnected: {e}"
    else:
        checks["redis"] = "not_configured"

    checks["stripe"] = "configured" if settings.STRIPE_SECRET_KEY else "not_configured"
    checks["sentry"] = "configured" if settings.SENTRY_DSN else "not_configured"

    result = {
        "status": "healthy" if healthy else "unhealthy",
        "checks": checks,
        "version": settings.APP_VERSION,
    }
    if not healthy:
        return JSONResponse(status_code=503, content=result)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
