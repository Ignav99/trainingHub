"""
TrainingHub Pro - Router de Autenticacion
Endpoints para login, registro y gestion de tokens.
Updated for new licensing and roles system.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, Request, status

from app.models import LoginRequest, TokenResponse, UsuarioCreate, UsuarioResponse
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.services.audit_service import log_action, log_login
from app.services.license_service import LicenseService

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, request: Request):
    """
    Inicia sesion con email y contrasena.
    Devuelve tokens JWT para usar en siguientes requests.
    """
    try:
        supabase = get_supabase()
        response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password,
        })

        # Obtener datos del usuario desde nuestra tabla
        user_data = (
            supabase.table("usuarios")
            .select("*, organizaciones(*)")
            .eq("id", response.user.id)
            .single()
            .execute()
        )

        ud = user_data.data
        ud["organizacion"] = ud.pop("organizaciones", None)

        # Update ultimo_acceso
        supabase.table("usuarios").update({
            "ultimo_acceso": datetime.now(timezone.utc).isoformat(),
        }).eq("id", response.user.id).execute()

        log_login(
            usuario_id=str(response.user.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            success=True,
        )

        return TokenResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            expires_in=response.session.expires_in,
            user=UsuarioResponse(**ud),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas",
        )


@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UsuarioCreate, request: Request):
    """
    Registra un nuevo usuario.
    If organizacion_nombre is provided, creates a new org with:
    - A default team
    - A free trial subscription
    - GDPR consent records
    """
    try:
        supabase = get_supabase()

        # Crear usuario en Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al crear usuario",
            )

        user_id = auth_response.user.id

        # Crear organizacion si es necesario
        org_id = None
        if user_data.organizacion_nombre:
            org_response = supabase.table("organizaciones").insert({
                "nombre": user_data.organizacion_nombre,
                "tipo_licencia": "equipo",
                "owner_id": user_id,
            }).execute()
            org_id = org_response.data[0]["id"]

            # Create default team
            equipo_response = supabase.table("equipos").insert({
                "nombre": user_data.organizacion_nombre,
                "organizacion_id": org_id,
            }).execute()
            equipo_id = equipo_response.data[0]["id"]

            # Create trial subscription
            LicenseService.create_trial_subscription(org_id)

            # Assign user as entrenador_principal of the default team
            supabase.table("usuarios_equipos").insert({
                "usuario_id": user_id,
                "equipo_id": equipo_id,
                "rol_en_equipo": "entrenador_principal",
            }).execute()

            # Update subscription usage
            supabase.table("suscripciones").update({
                "uso_equipos": 1,
            }).eq("organizacion_id", org_id).execute()

        # Crear registro en nuestra tabla de usuarios
        now = datetime.now(timezone.utc)
        usuario_db = supabase.table("usuarios").insert({
            "id": user_id,
            "email": user_data.email,
            "nombre": user_data.nombre,
            "apellidos": user_data.apellidos,
            "rol": "entrenador_principal" if user_data.organizacion_nombre else (
                user_data.rol.value if user_data.rol else "tecnico_asistente"
            ),
            "organizacion_id": org_id,
            "fecha_nacimiento": user_data.fecha_nacimiento.isoformat() if user_data.fecha_nacimiento else None,
            "gdpr_consentimiento": user_data.gdpr_consentimiento,
            "gdpr_consentimiento_fecha": now.isoformat() if user_data.gdpr_consentimiento else None,
            "ultimo_acceso": now.isoformat(),
        }).execute()

        # Record GDPR consents if accepted
        if user_data.gdpr_consentimiento:
            ip = request.client.host if request.client else None
            for consent_type in ("terminos_servicio", "politica_privacidad", "datos_personales"):
                supabase.table("consentimientos_gdpr").insert({
                    "usuario_id": user_id,
                    "tipo": consent_type,
                    "version": "1.0",
                    "otorgado": True,
                    "ip_address": ip,
                    "user_agent": request.headers.get("user-agent"),
                }).execute()

        log_action(
            usuario_id=user_id,
            accion="crear",
            entidad_tipo="usuario",
            entidad_id=user_id,
            ip_address=request.client.host if request.client else None,
        )

        # Return full user with org
        full_user = (
            supabase.table("usuarios")
            .select("*, organizaciones(*)")
            .eq("id", user_id)
            .single()
            .execute()
        )
        ud = full_user.data
        ud["organizacion"] = ud.pop("organizaciones", None)

        return UsuarioResponse(**ud)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/logout")
async def logout():
    """Cierra la sesion actual."""
    return {"message": "Sesion cerrada correctamente"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str):
    """Refresca el access token usando el refresh token."""
    try:
        supabase = get_supabase()
        response = supabase.auth.refresh_session(refresh_token)

        user_data = (
            supabase.table("usuarios")
            .select("*, organizaciones(*)")
            .eq("id", response.user.id)
            .single()
            .execute()
        )

        ud = user_data.data
        ud["organizacion"] = ud.pop("organizaciones", None)

        return TokenResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            expires_in=response.session.expires_in,
            user=UsuarioResponse(**ud),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
        )


@router.get("/me", response_model=UsuarioResponse)
async def get_current_user_info(
    auth: AuthContext = Depends(require_permission()),
):
    """
    Obtiene informacion del usuario actual.
    Util para verificar que la autenticacion funciona correctamente.
    """
    return auth.user
