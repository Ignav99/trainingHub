"""
TrainingHub Pro - Router de Invitaciones
Endpoints para invitar usuarios, verificar y aceptar invitaciones.
"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.models import (
    InvitacionCreate,
    InvitacionResponse,
    InvitacionListResponse,
    InvitacionVerifyResponse,
    InvitacionAcceptRequest,
    TransferenciaCreate,
    TransferenciaResponse,
    UsuarioResponse,
)
from app.security.permissions import Permission
from app.security.license_checker import LicenseChecker
from app.services.audit_service import log_action
from app.services.email_service import send_invitation_email, send_tutor_consent_email, send_ownership_transfer_email
from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter()

INVITE_EXPIRY_DAYS = 7


def _generate_token() -> tuple[str, str]:
    """Generate a secure token and its hash."""
    token = secrets.token_urlsafe(96)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash


@router.post("", response_model=InvitacionResponse, status_code=status.HTTP_201_CREATED)
async def create_invitacion(
    data: InvitacionCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission(Permission.INVITACION_MANAGE)),
):
    """Crear una nueva invitacion."""
    supabase = get_supabase()

    # Check if email already has an active invitation
    existing = (
        supabase.table("invitaciones")
        .select("id")
        .eq("email", data.email)
        .eq("organizacion_id", auth.organizacion_id)
        .eq("estado", "pendiente")
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una invitacion pendiente para este email.",
        )

    # Check if user is already a member
    existing_user = (
        supabase.table("usuarios")
        .select("id")
        .eq("email", data.email)
        .eq("organizacion_id", auth.organizacion_id)
        .execute()
    )
    if existing_user.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este usuario ya pertenece a la organizacion.",
        )

    # Check license limits
    if data.equipo_id:
        if data.rol_en_equipo and data.rol_en_equipo != "jugador":
            allowed, msg = LicenseChecker.check_staff_limit(auth.organizacion_id, str(data.equipo_id))
        else:
            allowed, msg = LicenseChecker.check_player_limit(auth.organizacion_id, str(data.equipo_id))
        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)

    token, token_hash = _generate_token()

    invite_data = {
        "email": data.email,
        "nombre": data.nombre,
        "organizacion_id": auth.organizacion_id,
        "equipo_id": str(data.equipo_id) if data.equipo_id else None,
        "rol_organizacion": data.rol_organizacion,
        "rol_en_equipo": data.rol_en_equipo,
        "token": token,
        "token_hash": token_hash,
        "estado": "pendiente",
        "expira_en": (datetime.now(timezone.utc) + timedelta(days=INVITE_EXPIRY_DAYS)).isoformat(),
        "invitado_por": auth.user_id,
        "es_invitacion_tutor": data.es_invitacion_tutor,
        "jugador_id": str(data.jugador_id) if data.jugador_id else None,
    }

    result = supabase.table("invitaciones").insert(invite_data).execute()

    log_action(
        usuario_id=auth.user_id,
        accion="invitar",
        entidad_tipo="invitacion",
        entidad_id=result.data[0]["id"],
        datos_nuevos={"email": data.email, "rol_en_equipo": data.rol_en_equipo},
        ip_address=request.client.host if request.client else None,
    )

    # Send invitation email
    settings = get_settings()
    token = result.data[0].get("token", "")
    if data.es_invitacion_tutor and data.jugador_id:
        jugador = supabase.table("jugadores").select("nombre").eq("id", str(data.jugador_id)).single().execute()
        equipo_name = ""
        if data.equipo_id:
            eq = supabase.table("equipos").select("nombre").eq("id", str(data.equipo_id)).single().execute()
            equipo_name = eq.data.get("nombre", "") if eq.data else ""
        org = supabase.table("organizaciones").select("nombre").eq("id", auth.organizacion_id).single().execute()
        send_tutor_consent_email(
            to_email=data.email,
            player_name=jugador.data.get("nombre", "") if jugador.data else "",
            team_name=equipo_name,
            organization_name=org.data.get("nombre", "") if org.data else "",
            invite_token=token,
            frontend_url=settings.FRONTEND_URL,
        )
    else:
        org = supabase.table("organizaciones").select("nombre").eq("id", auth.organizacion_id).single().execute()
        equipo_name = None
        if data.equipo_id:
            eq = supabase.table("equipos").select("nombre").eq("id", str(data.equipo_id)).single().execute()
            equipo_name = eq.data.get("nombre") if eq.data else None
        send_invitation_email(
            to_email=data.email,
            inviter_name=auth.user.nombre if auth.user else "",
            organization_name=org.data.get("nombre", "") if org.data else "",
            team_name=equipo_name,
            role=data.rol_en_equipo,
            invite_token=token,
            frontend_url=settings.FRONTEND_URL,
        )

    return InvitacionResponse(**result.data[0])


@router.get("", response_model=InvitacionListResponse)
async def list_invitaciones(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    estado: Optional[str] = None,
    auth: AuthContext = Depends(require_permission(Permission.INVITACION_MANAGE)),
):
    """Lista invitaciones de la organizacion."""
    supabase = get_supabase()

    query = (
        supabase.table("invitaciones")
        .select("*", count="exact")
        .eq("organizacion_id", auth.organizacion_id)
        .order("created_at", desc=True)
    )

    if estado:
        query = query.eq("estado", estado)

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    result = query.execute()

    return InvitacionListResponse(
        data=[InvitacionResponse(**i) for i in result.data],
        total=result.count or 0,
    )


@router.get("/verify/{token}", response_model=InvitacionVerifyResponse)
async def verify_invitacion(token: str):
    """Verifica un token de invitacion (no requiere auth)."""
    supabase = get_supabase()
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    result = (
        supabase.table("invitaciones")
        .select("*, organizaciones(nombre), equipos(nombre), usuarios!invitaciones_invitado_por_fkey(nombre)")
        .eq("token_hash", token_hash)
        .eq("estado", "pendiente")
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitacion no encontrada o expirada.")

    invite = result.data
    expiry = datetime.fromisoformat(invite["expira_en"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expiry:
        supabase.table("invitaciones").update({"estado": "expirada"}).eq("id", invite["id"]).execute()
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="La invitacion ha expirado.")

    org = invite.get("organizaciones", {})
    equipo = invite.get("equipos", {})
    invitador = invite.get("usuarios", {})

    response = InvitacionVerifyResponse(
        email=invite.get("email", ""),
        organizacion_nombre=org.get("nombre", ""),
        equipo_nombre=equipo.get("nombre") if equipo else None,
        rol_en_equipo=invite.get("rol_en_equipo"),
        rol_organizacion=invite.get("rol_organizacion"),
        invitado_por_nombre=invitador.get("nombre", "") if invitador else "",
        es_invitacion_tutor=invite.get("es_invitacion_tutor", False),
    )

    # If tutor invitation, include player name
    if invite.get("es_invitacion_tutor") and invite.get("jugador_id"):
        jugador = (
            supabase.table("jugadores")
            .select("nombre, apellidos")
            .eq("id", invite["jugador_id"])
            .single()
            .execute()
        )
        if jugador.data:
            response.jugador_nombre = f"{jugador.data['nombre']} {jugador.data.get('apellidos', '')}".strip()

    return response


@router.post("/accept", response_model=UsuarioResponse)
async def accept_invitacion(data: InvitacionAcceptRequest, request: Request):
    """Acepta una invitacion, crea usuario si es nuevo y lo asocia a la org/equipo."""
    supabase = get_supabase()
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()

    invite_result = (
        supabase.table("invitaciones")
        .select("*")
        .eq("token_hash", token_hash)
        .eq("estado", "pendiente")
        .single()
        .execute()
    )

    if not invite_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitacion no encontrada o ya procesada.")

    invite = invite_result.data
    expiry = datetime.fromisoformat(invite["expira_en"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expiry:
        supabase.table("invitaciones").update({"estado": "expirada"}).eq("id", invite["id"]).execute()
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="La invitacion ha expirado.")

    # Check if user already exists in our usuarios table
    existing_user = supabase.table("usuarios").select("id").eq("email", invite["email"]).execute()

    user_id = None
    if existing_user.data:
        # Existing user — associate to org/team
        user_id = existing_user.data[0]["id"]
        supabase.table("usuarios").update({
            "organizacion_id": invite["organizacion_id"],
        }).eq("id", user_id).execute()
    else:
        # No row in usuarios table — user may or may not exist in Supabase Auth
        if not data.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere password para usuarios nuevos.",
            )

        try:
            auth_response = supabase.auth.sign_up({
                "email": invite["email"],
                "password": data.password,
            })
            if not auth_response.user:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error al crear usuario.")
            user_id = auth_response.user.id
        except Exception as e:
            if "User already registered" not in str(e):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error al crear usuario: {str(e)}")
            # User exists in Auth but not in usuarios table — sign in to get their ID
            logger.info(f"User {invite['email']} already in Auth, signing in to recover ID")
            try:
                sign_in = supabase.auth.sign_in_with_password({
                    "email": invite["email"],
                    "password": data.password,
                })
                if not sign_in.user:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error de autenticacion.")
                user_id = sign_in.user.id
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya existe una cuenta con este email pero la contraseña no coincide. Usa la contraseña con la que te registraste originalmente.",
                )

        # Use a fresh client for DB operations — sign_up contaminates the
        # current client's auth session, causing RLS infinite recursion on INSERT.
        from supabase import create_client
        settings = get_settings()
        fresh_sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

        rol = invite.get("rol_organizacion") or invite.get("rol_en_equipo") or "tecnico_asistente"
        fresh_sb.table("usuarios").insert({
            "id": user_id,
            "email": invite["email"],
            "nombre": data.nombre,
            "apellidos": data.apellidos,
            "rol": rol,
            "organizacion_id": invite["organizacion_id"],
        }).execute()

    # Use fresh client for remaining operations to avoid RLS issues
    supabase = get_supabase()

    # Associate to team if specified
    if invite.get("equipo_id") and invite.get("rol_en_equipo"):
        # Check if not already a member
        existing_ue = (
            supabase.table("usuarios_equipos")
            .select("id")
            .eq("usuario_id", user_id)
            .eq("equipo_id", invite["equipo_id"])
            .execute()
        )
        if not existing_ue.data:
            supabase.table("usuarios_equipos").insert({
                "usuario_id": user_id,
                "equipo_id": invite["equipo_id"],
                "rol_en_equipo": invite["rol_en_equipo"],
            }).execute()

    # Update invitation status
    supabase.table("invitaciones").update({
        "estado": "aceptada",
        "aceptado_por": user_id,
        "fecha_respuesta": datetime.now(timezone.utc).isoformat(),
    }).eq("id", invite["id"]).execute()

    log_action(
        usuario_id=user_id,
        accion="aceptar_invitacion",
        entidad_tipo="invitacion",
        entidad_id=invite["id"],
        ip_address=request.client.host if request.client else None,
    )

    # Fetch and return complete user
    user_data = supabase.table("usuarios").select("*, organizaciones(*)").eq("id", user_id).single().execute()
    ud = user_data.data
    ud["organizacion"] = ud.pop("organizaciones", None)
    return UsuarioResponse(**ud)


@router.post("/{invitacion_id}/resend", response_model=InvitacionResponse)
async def resend_invitacion(
    invitacion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.INVITACION_MANAGE)),
):
    """Reenviar una invitacion."""
    supabase = get_supabase()

    invite = (
        supabase.table("invitaciones")
        .select("*")
        .eq("id", str(invitacion_id))
        .eq("organizacion_id", auth.organizacion_id)
        .single()
        .execute()
    )

    if not invite.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitacion no encontrada.")

    if invite.data["estado"] not in ("pendiente", "expirada"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo se pueden reenviar invitaciones pendientes o expiradas.")

    token, token_hash = _generate_token()

    result = (
        supabase.table("invitaciones")
        .update({
            "token": token,
            "token_hash": token_hash,
            "estado": "pendiente",
            "expira_en": (datetime.now(timezone.utc) + timedelta(days=INVITE_EXPIRY_DAYS)).isoformat(),
            "reinvitaciones": (invite.data.get("reinvitaciones", 0) or 0) + 1,
            "ultimo_reenvio": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", str(invitacion_id))
        .execute()
    )

    # Re-send the invitation email
    settings = get_settings()
    org = supabase.table("organizaciones").select("nombre").eq("id", auth.organizacion_id).single().execute()
    org_name = org.data.get("nombre", "") if org.data else ""
    equipo_name = None
    if invite.data.get("equipo_id"):
        eq = supabase.table("equipos").select("nombre").eq("id", invite.data["equipo_id"]).single().execute()
        equipo_name = eq.data.get("nombre") if eq.data else None

    if invite.data.get("es_invitacion_tutor") and invite.data.get("jugador_id"):
        jugador = supabase.table("jugadores").select("nombre").eq("id", invite.data["jugador_id"]).single().execute()
        send_tutor_consent_email(
            to_email=invite.data["email"],
            player_name=jugador.data.get("nombre", "") if jugador.data else "",
            team_name=equipo_name or "",
            organization_name=org_name,
            invite_token=token,
            frontend_url=settings.FRONTEND_URL,
        )
    else:
        send_invitation_email(
            to_email=invite.data["email"],
            inviter_name=auth.user.nombre if auth.user else "",
            organization_name=org_name,
            team_name=equipo_name,
            role=invite.data.get("rol_en_equipo"),
            invite_token=token,
            frontend_url=settings.FRONTEND_URL,
        )

    return InvitacionResponse(**result.data[0])


@router.delete("/{invitacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_invitacion(
    invitacion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.INVITACION_MANAGE)),
):
    """Revocar una invitacion pendiente."""
    supabase = get_supabase()

    invite = (
        supabase.table("invitaciones")
        .select("id, estado")
        .eq("id", str(invitacion_id))
        .eq("organizacion_id", auth.organizacion_id)
        .single()
        .execute()
    )

    if not invite.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitacion no encontrada.")

    if invite.data["estado"] != "pendiente":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo se pueden revocar invitaciones pendientes.")

    supabase.table("invitaciones").update({
        "estado": "revocada",
        "fecha_respuesta": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(invitacion_id)).execute()


# ============ Transferencias de Propiedad ============

@router.post("/transferencia", response_model=TransferenciaResponse, status_code=status.HTTP_201_CREATED)
async def create_transferencia(
    data: TransferenciaCreate,
    auth: AuthContext = Depends(require_permission(Permission.TRANSFERIR_PROPIEDAD)),
):
    """Iniciar transferencia de propiedad de equipo."""
    supabase = get_supabase()

    # Verify target user is a member of the team
    target_member = (
        supabase.table("usuarios_equipos")
        .select("id")
        .eq("usuario_id", str(data.a_usuario_id))
        .eq("equipo_id", str(data.equipo_id))
        .execute()
    )
    if not target_member.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario destino debe ser miembro del equipo.",
        )

    token = secrets.token_urlsafe(96)

    result = supabase.table("transferencias_propiedad").insert({
        "equipo_id": str(data.equipo_id),
        "de_usuario_id": auth.user_id,
        "a_usuario_id": str(data.a_usuario_id),
        "token": token,
        "expira_en": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    }).execute()

    # Send transfer email to target user
    settings = get_settings()
    target_user = supabase.table("usuarios").select("email").eq("id", str(data.a_usuario_id)).single().execute()
    equipo = supabase.table("equipos").select("nombre").eq("id", str(data.equipo_id)).single().execute()
    if target_user.data:
        send_ownership_transfer_email(
            to_email=target_user.data["email"],
            from_name=auth.user.nombre if auth.user else "",
            team_name=equipo.data.get("nombre", "") if equipo.data else "",
            transfer_token=token,
            frontend_url=settings.FRONTEND_URL,
        )

    return TransferenciaResponse(**result.data[0])


@router.post("/transferencia/{transferencia_id}/accept", response_model=TransferenciaResponse)
async def accept_transferencia(
    transferencia_id: UUID,
    auth: AuthContext = Depends(require_permission()),
):
    """Aceptar transferencia de propiedad."""
    supabase = get_supabase()

    transfer = (
        supabase.table("transferencias_propiedad")
        .select("*")
        .eq("id", str(transferencia_id))
        .eq("a_usuario_id", auth.user_id)
        .eq("estado", "pendiente")
        .single()
        .execute()
    )

    if not transfer.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transferencia no encontrada.")

    expiry = datetime.fromisoformat(transfer.data["expira_en"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expiry:
        supabase.table("transferencias_propiedad").update({"estado": "expirada"}).eq("id", str(transferencia_id)).execute()
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="La transferencia ha expirado.")

    equipo_id = transfer.data["equipo_id"]
    from_user_id = transfer.data["de_usuario_id"]
    to_user_id = auth.user_id

    # Update roles: new owner becomes entrenador_principal, old owner becomes segundo_entrenador
    supabase.table("usuarios_equipos").update({
        "rol_en_equipo": "entrenador_principal",
    }).eq("usuario_id", to_user_id).eq("equipo_id", equipo_id).execute()

    supabase.table("usuarios_equipos").update({
        "rol_en_equipo": "segundo_entrenador",
    }).eq("usuario_id", from_user_id).eq("equipo_id", equipo_id).execute()

    # Update transfer status
    result = supabase.table("transferencias_propiedad").update({
        "estado": "aceptada",
        "fecha_respuesta": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(transferencia_id)).execute()

    log_action(
        usuario_id=to_user_id,
        accion="transferir_propiedad",
        entidad_tipo="equipo",
        entidad_id=equipo_id,
        datos_nuevos={"de": from_user_id, "a": to_user_id},
    )

    return TransferenciaResponse(**result.data[0])
