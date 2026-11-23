"""
TrainingHub Pro - Conexión a Base de Datos
Configuración del cliente Supabase.
"""

import httpx
from supabase import create_client, Client, ClientOptions
from app.config import get_settings

settings = get_settings()

# Cliente Supabase global
supabase: Client | None = None

# PostgREST: sin esto el cliente espera hasta 120 s por respuesta y cada
# consulta colgada retiene un hilo del threadpool (y con él una petición).
POSTGREST_TIMEOUT = httpx.Timeout(30.0, connect=5.0)


def _server_options() -> ClientOptions:
    # Cliente de servidor: no guarda ni refresca sesión de usuario.
    return ClientOptions(
        postgrest_client_timeout=POSTGREST_TIMEOUT,
        auto_refresh_token=False,
        persist_session=False,
    )


def init_supabase() -> Client:
    """Inicializa el cliente Supabase."""
    global supabase
    supabase = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,  # Service role para backend
        options=_server_options(),
    )
    print("✅ Supabase client initialized")
    return supabase


def get_supabase() -> Client:
    """Obtiene el cliente Supabase."""
    global supabase
    if supabase is None:
        return init_supabase()
    return supabase


def new_auth_client() -> Client:
    """Cliente service-role desechable para sign_up / sign_in / refresh.

    Esas llamadas guardan la sesión del usuario en el cliente. Hacerlas sobre el
    cliente global cambiaría el token de TODAS las consultas del backend.
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
        options=_server_options(),
    )


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
