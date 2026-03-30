"""
TrainingHub Pro - API Backend
Punto de entrada principal de la aplicacion FastAPI.
"""

import logging

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
from app.database import init_supabase, get_supabase
from app.middleware import (
    SecurityHeadersMiddleware,
    RequestLoggingMiddleware,
    RateLimitMiddleware,
    CacheControlMiddleware,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle del servidor - inicializacion y cleanup."""
    # Startup
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    init_supabase()

    # Sync player estados from active medical records (one-time fix for existing data)
    try:
        sb = get_supabase()
        rehab = sb.table("registros_medicos").select("jugador_id").eq("tipo", "rehabilitacion").neq("estado", "alta").execute()
        for r in (rehab.data or []):
            sb.table("jugadores").update({"estado": "en_recuperacion"}).eq("id", r["jugador_id"]).eq("estado", "activo").execute()
        if rehab.data:
            print(f"✅ Synced {len(rehab.data)} rehabilitacion → en_recuperacion")
    except Exception as e:
        print(f"⚠️ Player estado sync failed: {e}")

    # Start RFAF scraping scheduler
    from app.services.rfef_scheduler_service import start_scheduler, stop_scheduler
    try:
        start_scheduler()
        print("✅ RFAF scheduler started")
    except Exception as e:
        print(f"⚠️ RFAF scheduler failed to start: {e}")

    yield

    # Shutdown
    try:
        stop_scheduler()
    except Exception:
        pass
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
# 1. Request logging (innermost - logs after processing)
app.add_middleware(RequestLoggingMiddleware)
# 2. Cache-Control headers
app.add_middleware(CacheControlMiddleware)
# 3. Security headers
app.add_middleware(SecurityHeadersMiddleware)
# 4. Rate limiting
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
# 4. CORS (outermost - MUST wrap everything so error responses get CORS headers)
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
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor. Revisa los logs."},
    )


# Incluir routers
app.include_router(api_router, prefix="/v1")

# WebSocket routes
from app.api.v1.websocket import router as ws_router
app.include_router(ws_router, prefix="/v1")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/health")
async def health_check():
    """Health check detallado con verificacion de BD, Redis y Stripe."""
    from fastapi.responses import JSONResponse
    from app.database import get_supabase

    checks = {}
    healthy = True

    # Database check
    try:
        supabase = get_supabase()
        supabase.table("organizaciones").select("id", count="exact").limit(0).execute()
        checks["database"] = "connected"
    except Exception as e:
        checks["database"] = f"disconnected: {e}"
        healthy = False

    # Redis check (optional)
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

    # Stripe check (config only)
    checks["stripe"] = "configured" if settings.STRIPE_SECRET_KEY else "not_configured"

    # Sentry check (config only)
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
