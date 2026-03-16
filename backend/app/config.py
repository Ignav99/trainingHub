"""
TrainingHub Pro - Configuracion del Backend
"""

from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    """Configuracion de la aplicacion."""

    # App
    APP_NAME: str = "TrainingHub Pro API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS - accepts "*" or comma-separated URLs
    CORS_ORIGINS: str = "http://localhost:3000"

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, list):
            return ','.join(v)
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        """Returns CORS origins as a list."""
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(',')]

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas

    # Storage
    STORAGE_BUCKET_LOGOS: str = "logos"
    STORAGE_BUCKET_GRAFICOS: str = "graficos"
    STORAGE_BUCKET_PDFS: str = "pdfs"

    # Optional: Claude API
    ANTHROPIC_API_KEY: str | None = None

    # AI Provider: "gemini" (default, cheaper) or "claude" (backup)
    AI_PROVIDER: str = "gemini"

    # Google Gemini API for AI recommendations
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_TEMPERATURE: float = 1.0

    # Medical data encryption (AES-256-GCM, base64-encoded 32-byte key)
    MEDICAL_ENCRYPTION_KEY: str | None = None

    # Email service
    RESEND_API_KEY: str | None = None
    FRONTEND_URL: str = "http://localhost:3000"

    # Super admin (comma-separated emails with platform-wide access)
    SUPERADMIN_EMAILS: str = ""

    # Stripe (for payment integration)
    STRIPE_SECRET_KEY: str | None = None
    STRIPE_WEBHOOK_SECRET: str | None = None

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Obtiene la configuracion cacheada."""
    return Settings()
