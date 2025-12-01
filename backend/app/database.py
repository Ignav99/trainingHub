"""
TrainingHub Pro - Conexión a Base de Datos
Configuración del cliente Supabase.
"""

from supabase import create_client, Client
from app.config import get_settings

settings = get_settings()

# Cliente Supabase global
supabase: Client | None = None


def init_supabase() -> Client:
    """Inicializa el cliente Supabase."""
    global supabase
    supabase = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY  # Service role para backend
    )
    print("✅ Supabase client initialized")
    return supabase


def get_supabase() -> Client:
    """Obtiene el cliente Supabase."""
    global supabase
    if supabase is None:
        return init_supabase()
    return supabase


# Cliente con token de usuario (para RLS)
def get_supabase_with_user_token(access_token: str) -> Client:
    """
    Crea un cliente Supabase con el token del usuario.
    Esto permite que RLS funcione correctamente.
    """
    client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY
    )
    client.auth.set_session(access_token, "")
    return client
