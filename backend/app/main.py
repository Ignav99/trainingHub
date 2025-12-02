"""
TrainingHub Pro - API Backend
Punto de entrada principal de la aplicación FastAPI.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.api.v1.router import api_router
from app.database import init_supabase


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle del servidor - inicialización y cleanup."""
    # Startup
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    init_supabase()
    yield
    # Shutdown
    print("👋 Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## TrainingHub Pro API
    
    API para gestión de sesiones y tareas de entrenamiento de fútbol profesional.
    
    ### Características:
    - 📋 Gestión de tareas de entrenamiento
    - 📅 Planificación de sesiones
    - 🤖 Sistema de recomendación inteligente
    - 📄 Generación de PDFs profesionales
    - 👥 Multi-equipo con roles
    
    ### Autenticación:
    Usar token JWT en header `Authorization: Bearer <token>`
    """,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(api_router, prefix="/v1")


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
    """Health check detallado."""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: verificar conexión real
        "version": settings.APP_VERSION,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
