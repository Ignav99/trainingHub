"""
TrainingHub Pro - Permission Dependencies
FastAPI dependencies for role-based access control and license enforcement.
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.database import get_supabase
from app.models.usuario import UsuarioResponse
from app.security.auth_cache import cache_enabled, jwt_exp, token_cache_key, token_still_valid
from app.security.permissions import (
    Permission,
    DEFAULT_PERMISSIONS,
    CLUB_ROLE_PERMISSIONS,
)

logger = logging.getLogger(__name__)

def _team_role_rows(supabase, user_id: str, equipo_id: Optional[str]):
    """Role rows for this user. One retry: a dropped Supabase connection must not become a 403."""
    last_error = None
    for _ in range(2):
        try:
            query = (
                supabase.table("usuarios_equipos")
                .select("rol_en_equipo, equipo_id")
                .eq("usuario_id", user_id)
            )
            if equipo_id:
                query = query.eq("equipo_id", equipo_id)
            else:
                query = query.limit(1)
            return query.execute()
        except Exception as exc:
            last_error = exc
    logger.warning("usuarios_equipos lookup failed for %s: %s", user_id, last_error)
    return None

security = HTTPBearer()


# ---------------------------------------------------------------------------
# TTL Cache for subscription lookups
# ---------------------------------------------------------------------------

class TTLCache:
    """Simple in-process TTL cache backed by a plain dict.
    Thread-safe for CPython (GIL protects dict ops).
    max_size is a soft cap — LRU eviction not implemented; excess entries
    are evicted lazily on get() by expiry sweep.
    """

    def __init__(self, ttl_seconds: int = 300, max_size: int = 512):
        self._ttl = ttl_seconds
        self._max_size = max_size
        self._store: dict[str, tuple[float, object]] = {}  # key -> (expires_at, value)

    def get(self, key: str):
        entry = self._store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() >= expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value) -> None:
        if len(self._store) >= self._max_size:
            # Evict expired entries first
            now = time.monotonic()
            expired = [k for k, (exp, _) in self._store.items() if now >= exp]
            for k in expired:
                del self._store[k]
        self._store[key] = (time.monotonic() + self._ttl, value)

    def invalidate(self, key: str) -> None:
        self._store.pop(key, None)


_subscription_cache = TTLCache(ttl_seconds=300, max_size=512)
# Verified user, team roles and custom permissions. Long enough to cover a
# page of parallel requests, short enough that a deactivated user or a role
# change takes effect within a few seconds.
_user_cache = TTLCache(ttl_seconds=20, max_size=1024)
_roles_cache = TTLCache(ttl_seconds=20, max_size=2048)
_perms_cache = TTLCache(ttl_seconds=20, max_size=2048)
_user_inflight: dict[str, asyncio.Task] = {}
_roles_inflight: dict[str, asyncio.Task] = {}
_perms_inflight: dict[str, asyncio.Task] = {}


def invalidate_subscription_cache(org_id: str) -> None:
    """Evict a specific org's subscription data from the in-process cache.
    Call this from any endpoint that mutates suscripciones state.
    """
    _subscription_cache.invalidate(org_id)


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


def _load_user_sync(token: str) -> UsuarioResponse:
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


async def _cached_user(token: str) -> UsuarioResponse:
    key = token_cache_key(token)
    if not token_still_valid(jwt_exp(token), time.time()):
        _user_cache.invalidate(key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not cache_enabled():
        return _load_user_sync(token)

    cached = _user_cache.get(key)
    if cached is not None:
        return cached

    task = _user_inflight.get(key)
    if task is None:
        task = asyncio.create_task(asyncio.to_thread(_load_user_sync, token))
        _user_inflight[key] = task
    try:
        user = await task
    finally:
        if _user_inflight.get(key) is task:
            _user_inflight.pop(key, None)
    _user_cache.set(key, user)
    return user


async def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UsuarioResponse:
    """Validates JWT token and returns the current user."""
    try:
        return await _cached_user(credentials.credentials)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error de autenticacion: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _fetch_roles_sync(user_id: str):
    supabase = get_supabase()
    last_error = None
    for _ in range(2):
        try:
            result = (
                supabase.table("usuarios_equipos")
                .select("rol_en_equipo, equipo_id")
                .eq("usuario_id", user_id)
                .execute()
            )
            return result.data or []
        except Exception as exc:
            last_error = exc
    logger.warning("usuarios_equipos lookup failed for %s: %s", user_id, last_error)
    return None


async def _roles_for_user(user_id: str):
    if not cache_enabled():
        return _fetch_roles_sync(user_id)
    cached = _roles_cache.get(user_id)
    if cached is not None:
        return cached
    task = _roles_inflight.get(user_id)
    if task is None:
        task = asyncio.create_task(asyncio.to_thread(_fetch_roles_sync, user_id))
        _roles_inflight[user_id] = task
    try:
        rows = await task
    finally:
        if _roles_inflight.get(user_id) is task:
            _roles_inflight.pop(user_id, None)
    if rows is not None:
        _roles_cache.set(user_id, rows)
    return rows


def cached_team_ids(user_id: str) -> Optional[list[str]]:
    """Team ids already resolved for this user, or None if they are not cached yet."""
    rows = _roles_cache.get(user_id)
    if rows is None:
        return None
    return [str(row["equipo_id"]) for row in rows if row.get("equipo_id")]


def _fetch_custom_sync(user_id: str, equipo_id: str, rol_en_equipo: Optional[str]):
    supabase = get_supabase()
    try:
        user_custom = (
            supabase.table("permisos_personalizados")
            .select("*")
            .eq("equipo_id", equipo_id)
            .eq("usuario_id", user_id)
            .execute()
        )
        if user_custom.data:
            return user_custom.data[0]
        if rol_en_equipo:
            role_custom = (
                supabase.table("permisos_personalizados")
                .select("*")
                .eq("equipo_id", equipo_id)
                .eq("rol_en_equipo", rol_en_equipo)
                .execute()
            )
            if role_custom.data:
                return role_custom.data[0]
        return {}
    except Exception:
        return None


async def _custom_override(user_id: str, equipo_id: str, rol_en_equipo: Optional[str]):
    key = f"{user_id}:{equipo_id}:{rol_en_equipo or ''}"
    if not cache_enabled():
        return _fetch_custom_sync(user_id, equipo_id, rol_en_equipo) or {}
    cached = _perms_cache.get(key)
    if cached is not None:
        return cached
    task = _perms_inflight.get(key)
    if task is None:
        task = asyncio.create_task(asyncio.to_thread(_fetch_custom_sync, user_id, equipo_id, rol_en_equipo))
        _perms_inflight[key] = task
    try:
        row = await task
    finally:
        if _perms_inflight.get(key) is task:
            _perms_inflight.pop(key, None)
    if row is None:
        return {}
    _perms_cache.set(key, row)
    return row


async def _resolve_equipo_id(request: Request, equipo_id_param: str) -> Optional[str]:
    """Extract equipo_id from path params, query params, or JSON body.

    Reading the body here does NOT consume it for downstream Pydantic parsing —
    Starlette caches the raw bytes on the Request the first time they're read,
    so `await request.json()` here and the route's own body parsing both work.
    """
    # Path parameters
    path_params = request.path_params
    if equipo_id_param in path_params:
        return str(path_params[equipo_id_param])

    # Query parameters
    query = request.query_params
    if equipo_id_param in query:
        return query[equipo_id_param]

    # JSON body (e.g. POST /invitaciones with equipo_id in the payload).
    # Without this, permission checks for body-scoped equipo_id silently fell
    # back to "any team the user belongs to", letting staff act on teams they
    # have no role in.
    if request.method in ("POST", "PUT", "PATCH"):
        try:
            body = await request.json()
            if isinstance(body, dict) and equipo_id_param in body and body[equipo_id_param]:
                return str(body[equipo_id_param])
        except Exception:
            pass

    return None


def _get_subscription_info(organizacion_id: str) -> dict:
    """Fetch subscription and plan info for an organization. Cached for 5 minutes."""
    cached = _subscription_cache.get(organizacion_id)
    if cached is not None:
        return cached

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
            _subscription_cache.set(organizacion_id, result.data)
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
        equipo_id = await _resolve_equipo_id(request, equipo_id_param)

        # 5. Get team role (cached, so the rest of this page does not repeat the query)
        rol_en_equipo = None
        rows = await _roles_for_user(user_id)
        if rows:
            if equipo_id:
                match = next((r for r in rows if str(r.get("equipo_id")) == str(equipo_id)), None)
                if match:
                    rol_en_equipo = match["rol_en_equipo"]
            else:
                rol_en_equipo = rows[0]["rol_en_equipo"]
                equipo_id = rows[0]["equipo_id"]
        elif rows is None:
            ue_result = _team_role_rows(supabase, user_id, equipo_id)
            if ue_result and ue_result.data:
                first = ue_result.data[0] if isinstance(ue_result.data, list) else ue_result.data
                rol_en_equipo = first["rol_en_equipo"]
                if not equipo_id:
                    equipo_id = first.get("equipo_id")

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
            override = await _custom_override(user_id, str(equipo_id), rol_en_equipo)
            if override:
                _apply_custom_permissions(effective_permissions, override)

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
        user_id = str(current_user.id)
        org_id = str(current_user.organizacion_id) if current_user.organizacion_id else None

        if current_user.rol in ("superadmin_plataforma", "admin"):
            return AuthContext(
                user=current_user,
                user_id=user_id,
                organizacion_id=org_id or "",
                permissions=set(Permission),
            )

        equipo_id = await _resolve_equipo_id(request, equipo_id_param)

        rol_en_equipo = None
        rows = await _roles_for_user(user_id)
        if rows:
            if equipo_id:
                match = next((r for r in rows if str(r.get("equipo_id")) == str(equipo_id)), None)
                if match:
                    rol_en_equipo = match["rol_en_equipo"]
            else:
                rol_en_equipo = rows[0]["rol_en_equipo"]
                equipo_id = rows[0]["equipo_id"]

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

        if equipo_id:
            override = await _custom_override(user_id, str(equipo_id), rol_en_equipo)
            if override:
                _apply_custom_permissions(effective, override)

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
