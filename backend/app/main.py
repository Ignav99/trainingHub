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


@app.get("/debug/test-claude")
async def debug_test_claude():
    """Diagnostic endpoint to test Claude API connectivity. Remove after debugging."""
    import anthropic as anth
    from fastapi.responses import JSONResponse

    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        return JSONResponse(status_code=503, content={"error": "ANTHROPIC_API_KEY not set"})

    # Show key info (masked)
    key_info = f"{api_key[:12]}...{api_key[-4:]}" if len(api_key) > 16 else "TOO_SHORT"
    key_len = len(api_key)

    # Check for common issues
    issues = []
    if api_key != api_key.strip():
        issues.append("KEY_HAS_WHITESPACE")
    if '"' in api_key or "'" in api_key:
        issues.append("KEY_HAS_QUOTES")
    if not api_key.startswith("sk-ant-"):
        issues.append("KEY_WRONG_PREFIX")

    # Test actual connection
    try:
        client = anth.AsyncAnthropic(api_key=api_key.strip(), timeout=30.0)
        response = await client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=10,
            messages=[{"role": "user", "content": "Say OK"}],
        )
        return {
            "status": "ok",
            "key_preview": key_info,
            "key_length": key_len,
            "issues": issues,
            "response": response.content[0].text,
            "model": response.model,
        }
    except anth.AuthenticationError as e:
        return JSONResponse(status_code=401, content={
            "status": "AUTH_FAILED",
            "key_preview": key_info,
            "key_length": key_len,
            "issues": issues,
            "error": str(e),
        })
    except anth.APIConnectionError as e:
        cause = e.__cause__
        return JSONResponse(status_code=502, content={
            "status": "CONNECTION_FAILED",
            "key_preview": key_info,
            "key_length": key_len,
            "issues": issues,
            "error": str(e),
            "cause_type": type(cause).__name__ if cause else None,
            "cause": str(cause) if cause else None,
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={
            "status": "UNEXPECTED_ERROR",
            "key_preview": key_info,
            "key_length": key_len,
            "issues": issues,
            "error_type": type(e).__name__,
            "error": str(e),
        })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
