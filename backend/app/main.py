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
from app.api.v1.router import api_router
from app.database import init_supabase
from app.middleware import (
    SecurityHeadersMiddleware,
    RequestLoggingMiddleware,
    RateLimitMiddleware,
    LicenseEnforcementMiddleware,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle del servidor - inicializacion y cleanup."""
    # Startup
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    init_supabase()

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
# 2. Security headers
app.add_middleware(SecurityHeadersMiddleware)
# 3. License enforcement
app.add_middleware(LicenseEnforcementMiddleware)
# 4. Rate limiting
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
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
    """Health check detallado con verificacion real de BD."""
    from fastapi.responses import JSONResponse
    from app.database import get_supabase

    try:
        supabase = get_supabase()
        result = supabase.table("organizaciones").select("id", count="exact").limit(0).execute()
        return {
            "status": "healthy",
            "database": "connected",
            "version": settings.APP_VERSION,
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "detail": str(e),
                "version": settings.APP_VERSION,
            }
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
