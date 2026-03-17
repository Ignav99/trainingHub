"""
TrainingHub Pro - Permission Dependencies
FastAPI dependencies for role-based access control and license enforcement.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.database import get_supabase
from app.models.usuario import UsuarioResponse
from app.security.permissions import (
    Permission,
    DEFAULT_PERMISSIONS,
    CLUB_ROLE_PERMISSIONS,
)

logger = logging.getLogger(__name__)

security = HTTPBearer()


@dataclass
class AuthContext:
    """
    Authenticated context returned by require_permission.
    Contains all resolved auth info for use in endpoint handlers.
    """
    user: UsuarioResponse
    user_id: str
    organizacion_id: str
    equipo_id: Optional[str] = None
    rol_en_equipo: Optional[str] = None
    rol_organizacion: Optional[str] = None
    permissions: set[Permission] = field(default_factory=set)
    subscription_status: Optional[str] = None
    plan_features: dict = field(default_factory=dict)
    is_read_only: bool = False  # True during grace_period


async def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UsuarioResponse:
    """Validates JWT token and returns the current user."""
    token = credentials.credentials
    try:
        supabase = get_supabase()
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = user_response.user.id
        db_user = (
            supabase.table("usuarios")
            .select("*, organizaciones(*)")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if not db_user.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado en la base de datos",
            )

        if db_user.data.get("activo") is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario desactivado. Contacte al administrador.",
            )

        user_data = db_user.data
        user_data["organizacion"] = user_data.pop("organizaciones", None)
        return UsuarioResponse(**user_data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error de autenticacion: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _resolve_equipo_id(request: Request, equipo_id_param: str) -> Optional[str]:
    """Extract equipo_id from path params, query params, or body."""
    # Path parameters
    path_params = request.path_params
    if equipo_id_param in path_params:
        return str(path_params[equipo_id_param])

    # Query parameters
    query = request.query_params
    if equipo_id_param in query:
        return query[equipo_id_param]

    return None


def _get_subscription_info(organizacion_id: str) -> dict:
    """Fetch subscription and plan info for an organization. Cached logic can be added."""
    supabase = get_supabase()
    try:
        result = (
            supabase.table("suscripciones")
            .select("*, planes(*)")
            .eq("organizacion_id", organizacion_id)
            .single()
            .execute()
        )
        if result.data:
            return result.data
    except Exception:
        pass
    return {}


def _check_subscription_access(sub_info: dict, permissions_requested: tuple[Permission, ...]) -> tuple[bool, str | None]:
    """
    Check subscription status.
    Returns (is_allowed, error_detail).
    """
    if not sub_info:
        # No subscription found — allow access (backwards compatibility / free tier)
        return True, None

    estado = sub_info.get("estado", "active")

    if estado in ("active", "trial"):
        return True, None

    if estado == "past_due":
        return True, None

    if estado == "grace_period":
        # Only READ permissions allowed
        write_permissions = {p for p in permissions_requested if not p.value.endswith(".read")}
        if write_permissions:
            return False, "Suscripcion en periodo de gracia. Solo lectura permitida."
        return True, None

    if estado == "suspended":
        return False, "Suscripcion suspendida. Acceda a facturacion para reactivar."

    if estado == "cancelled":
        return False, "Suscripcion cancelada."

    return True, None


def _check_feature_gate(plan_info: dict, permissions_requested: tuple[Permission, ...]) -> tuple[bool, str | None]:
    """Check if the plan allows the requested feature."""
    if not plan_info:
        return True, None

    features = plan_info.get("features", {})

    for perm in permissions_requested:
        perm_prefix = perm.value.split(".")[0]

        # Medical module — always enabled for all plans
        # (feature gate removed: medical is core functionality)

        # Video check
        if perm_prefix == "video" and not features.get("video_enabled", False):
            return False, "El modulo de video no esta disponible en su plan actual."

        # AI check
        if perm_prefix == "ai" and not features.get("ai_enabled", True):
            return False, "El asistente AI no esta disponible en su plan actual."

        # Rival analysis — only gate scouting AI, not basic CRUD
        # (scouting-chat endpoint checks AI availability separately)

    return True, None


def require_permission(
    *permissions: Permission,
    equipo_id_param: str = "equipo_id",
    allow_superadmin: bool = True,
    allow_club_roles: bool = False,
):
    """
    FastAPI dependency factory for permission-based access control.

    Steps:
    1. Get current_user from JWT
    2. Verify subscription status (trial/active ok, grace_period=read-only, suspended=402)
    3. Verify feature gate from plan
    4. Resolve equipo_id from the request
    5. Get rol_en_equipo for the user on that team
    6. Get default permissions for that role
    7. Apply overrides from permisos_personalizados
    8. Check that requested permission is in the effective set
    9. If denied -> audit_log + 403
    10. Return AuthContext
    """

    async def _dependency(
        request: Request,
        current_user: UsuarioResponse = Depends(get_current_user_from_token),
    ) -> AuthContext:
        supabase = get_supabase()
        user_id = str(current_user.id)
        org_id = str(current_user.organizacion_id) if current_user.organizacion_id else None

        # 1. Superadmin bypass
        if allow_superadmin and current_user.rol == "superadmin_plataforma":
            return AuthContext(
                user=current_user,
                user_id=user_id,
                organizacion_id=org_id or "",
                permissions=set(Permission),
                subscription_status="active",
            )

        # 2. Check subscription status
        sub_info = _get_subscription_info(org_id) if org_id else {}
        plan_info = sub_info.get("planes", {}) if sub_info else {}
        sub_status = sub_info.get("estado", "active") if sub_info else "active"
        is_read_only = sub_status == "grace_period"

        allowed, error = _check_subscription_access(sub_info, permissions)
        if not allowed:
            status_code = 402 if sub_status == "suspended" else 403
            raise HTTPException(status_code=status_code, detail=error)

        # 3. Feature gate
        allowed, error = _check_feature_gate(plan_info, permissions)
        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error)

        # 4. Resolve equipo_id
        equipo_id = _resolve_equipo_id(request, equipo_id_param)

        # 5. Get team role
        rol_en_equipo = None
        if equipo_id:
            try:
                ue_result = (
                    supabase.table("usuarios_equipos")
                    .select("rol_en_equipo")
                    .eq("usuario_id", user_id)
                    .eq("equipo_id", equipo_id)
                    .single()
                    .execute()
                )
                if ue_result.data:
                    rol_en_equipo = ue_result.data["rol_en_equipo"]
            except Exception:
                pass

        # If no specific team, try to get role from any team
        if not rol_en_equipo and not equipo_id:
            try:
                ue_result = (
                    supabase.table("usuarios_equipos")
                    .select("rol_en_equipo, equipo_id")
                    .eq("usuario_id", user_id)
                    .limit(1)
                    .execute()
                )
                if ue_result.data:
                    rol_en_equipo = ue_result.data[0]["rol_en_equipo"]
                    equipo_id = ue_result.data[0]["equipo_id"]
            except Exception:
                pass

        # 6. Get default permissions for the role
        effective_permissions: set[Permission] = set()

        if rol_en_equipo and rol_en_equipo in DEFAULT_PERMISSIONS:
            effective_permissions = DEFAULT_PERMISSIONS[rol_en_equipo].copy()

        # Also check club roles
        rol_org = current_user.rol
        if allow_club_roles and rol_org in CLUB_ROLE_PERMISSIONS:
            effective_permissions |= CLUB_ROLE_PERMISSIONS[rol_org]

        # Legacy role mapping for backwards compatibility
        if current_user.rol == "admin":
            effective_permissions = set(Permission)
        elif current_user.rol == "tecnico_principal" and not rol_en_equipo:
            effective_permissions = DEFAULT_PERMISSIONS.get("entrenador_principal", set()).copy()
        elif current_user.rol == "tecnico_asistente" and not rol_en_equipo:
            effective_permissions = DEFAULT_PERMISSIONS.get("segundo_entrenador", set()).copy()

        # 7. Apply custom permission overrides
        if equipo_id:
            try:
                custom_result = supabase.table("permisos_personalizados").select("*")
                # Check user-specific overrides first
                user_custom = (
                    custom_result.eq("equipo_id", equipo_id)
                    .eq("usuario_id", user_id)
                    .execute()
                )
                if user_custom.data:
                    _apply_custom_permissions(effective_permissions, user_custom.data[0])
                elif rol_en_equipo:
                    # Check role-level overrides
                    role_custom = (
                        supabase.table("permisos_personalizados")
                        .select("*")
                        .eq("equipo_id", equipo_id)
                        .eq("rol_en_equipo", rol_en_equipo)
                        .execute()
                    )
                    if role_custom.data:
                        _apply_custom_permissions(effective_permissions, role_custom.data[0])
            except Exception:
                pass

        # 8. Check required permissions
        missing = set(permissions) - effective_permissions
        if missing and permissions:
            # Log denied access
            try:
                from app.services.audit_service import log_action
                log_action(
                    usuario_id=user_id,
                    accion="acceso_denegado",
                    entidad_tipo="permission",
                    datos_nuevos={
                        "permissions_required": [p.value for p in permissions],
                        "permissions_missing": [p.value for p in missing],
                        "rol_en_equipo": rol_en_equipo,
                        "equipo_id": equipo_id,
                    },
                    ip_address=request.client.host if request.client else None,
                )
            except Exception:
                pass

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permisos insuficientes. Requiere: {', '.join(p.value for p in missing)}",
            )

        return AuthContext(
            user=current_user,
            user_id=user_id,
            organizacion_id=org_id or "",
            equipo_id=equipo_id,
            rol_en_equipo=rol_en_equipo,
            rol_organizacion=rol_org,
            permissions=effective_permissions,
            subscription_status=sub_status,
            plan_features=plan_info.get("features", {}) if plan_info else {},
            is_read_only=is_read_only,
        )

    return _dependency


def require_any_permission(
    *permissions: Permission,
    equipo_id_param: str = "equipo_id",
):
    """Like require_permission but passes if the user has ANY of the listed permissions."""

    async def _dependency(
        request: Request,
        current_user: UsuarioResponse = Depends(get_current_user_from_token),
    ) -> AuthContext:
        supabase = get_supabase()
        user_id = str(current_user.id)
        org_id = str(current_user.organizacion_id) if current_user.organizacion_id else None

        if current_user.rol in ("superadmin_plataforma", "admin"):
            return AuthContext(
                user=current_user,
                user_id=user_id,
                organizacion_id=org_id or "",
                permissions=set(Permission),
            )

        equipo_id = _resolve_equipo_id(request, equipo_id_param)

        rol_en_equipo = None
        if equipo_id:
            try:
                ue = (
                    supabase.table("usuarios_equipos")
                    .select("rol_en_equipo")
                    .eq("usuario_id", user_id)
                    .eq("equipo_id", equipo_id)
                    .single()
                    .execute()
                )
                if ue.data:
                    rol_en_equipo = ue.data["rol_en_equipo"]
            except Exception:
                pass

        # Fallback: if no equipo_id in request, find user's team role
        if not rol_en_equipo and not equipo_id:
            try:
                ue_result = (
                    supabase.table("usuarios_equipos")
                    .select("rol_en_equipo, equipo_id")
                    .eq("usuario_id", user_id)
                    .limit(1)
                    .execute()
                )
                if ue_result.data:
                    rol_en_equipo = ue_result.data[0]["rol_en_equipo"]
                    equipo_id = ue_result.data[0]["equipo_id"]
            except Exception:
                pass

        effective = set()
        if rol_en_equipo and rol_en_equipo in DEFAULT_PERMISSIONS:
            effective = DEFAULT_PERMISSIONS[rol_en_equipo].copy()

        # Legacy role mapping
        if current_user.rol == "admin":
            effective = set(Permission)
        elif current_user.rol == "tecnico_principal" and not rol_en_equipo:
            effective = DEFAULT_PERMISSIONS.get("entrenador_principal", set()).copy()
        elif current_user.rol == "tecnico_asistente" and not rol_en_equipo:
            effective = DEFAULT_PERMISSIONS.get("segundo_entrenador", set()).copy()

        # Apply custom permission overrides
        if equipo_id:
            try:
                user_custom = (
                    supabase.table("permisos_personalizados")
                    .select("*")
                    .eq("equipo_id", equipo_id)
                    .eq("usuario_id", user_id)
                    .execute()
                )
                if user_custom.data:
                    _apply_custom_permissions(effective, user_custom.data[0])
                elif rol_en_equipo:
                    role_custom = (
                        supabase.table("permisos_personalizados")
                        .select("*")
                        .eq("equipo_id", equipo_id)
                        .eq("rol_en_equipo", rol_en_equipo)
                        .execute()
                    )
                    if role_custom.data:
                        _apply_custom_permissions(effective, role_custom.data[0])
            except Exception:
                pass

        if not effective.intersection(permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permisos insuficientes.",
            )

        return AuthContext(
            user=current_user,
            user_id=user_id,
            organizacion_id=org_id or "",
            equipo_id=equipo_id,
            rol_en_equipo=rol_en_equipo,
            permissions=effective,
        )

    return _dependency


def _apply_custom_permissions(effective: set[Permission], custom: dict) -> None:
    """Apply custom permission overrides from permisos_personalizados row."""
    mapping = {
        "puede_crear_sesiones": (Permission.SESSION_CREATE,),
        "puede_editar_sesiones": (Permission.SESSION_UPDATE,),
        "puede_eliminar_sesiones": (Permission.SESSION_DELETE,),
        "puede_crear_tareas": (Permission.TASK_CREATE,),
        "puede_editar_tareas": (Permission.TASK_UPDATE,),
        "puede_eliminar_tareas": (Permission.TASK_DELETE,),
        "puede_gestionar_plantilla": (Permission.PLANTILLA_MANAGE,),
        "puede_crear_convocatorias": (Permission.CONVOCATORIA_CREATE, Permission.CONVOCATORIA_UPDATE),
        "puede_ver_rivales": (Permission.RIVAL_READ,),
        "puede_editar_rivales": (Permission.RIVAL_CREATE, Permission.RIVAL_UPDATE, Permission.RIVAL_DELETE),
        "puede_subir_videos": (Permission.VIDEO_UPLOAD,),
        "puede_exportar": (Permission.EXPORT_DATA,),
        "puede_usar_ai": (Permission.AI_USE,),
        "puede_gestionar_kb": (Permission.KB_CREATE, Permission.KB_UPDATE, Permission.KB_DELETE),
        "puede_ver_datos_medicos": (Permission.MEDICAL_READ, Permission.MEDICAL_READ_SUMMARY),
    }

    for column, perms in mapping.items():
        value = custom.get(column)
        if value is True:
            effective.update(perms)
        elif value is False:
            effective.difference_update(perms)
        # None = no override, keep default
