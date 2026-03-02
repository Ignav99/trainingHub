"""
TrainingHub Pro - Router de Control Parental / Tutores
Endpoints para gestion de tutores, vinculos con menores, y flujo de consentimiento.
"""

import hashlib
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.models import (
    VinculoTutorCreate,
    VinculoTutorResponse,
    VinculoTutorListResponse,
    TutorVerifyResponse,
    TutorAcceptRequest,
    UsuarioResponse,
)
from app.services.audit_service import log_action

router = APIRouter()


@router.get("/verify/{token}", response_model=TutorVerifyResponse)
async def verify_tutor_invitation(token: str):
    """Verifica una invitacion de tutor (no requiere auth)."""
    supabase = get_supabase()
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    invite = (
        supabase.table("invitaciones")
        .select("*, organizaciones(nombre), equipos(nombre), jugadores(nombre, apellidos)")
        .eq("token_hash", token_hash)
        .eq("estado", "pendiente")
        .eq("es_invitacion_tutor", True)
        .single()
        .execute()
    )

    if not invite.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitacion no encontrada o expirada.")

    data = invite.data
    expiry = datetime.fromisoformat(data["expira_en"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expiry:
        supabase.table("invitaciones").update({"estado": "expirada"}).eq("id", data["id"]).execute()
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="La invitacion ha expirado.")

    jugador = data.get("jugadores", {})
    org = data.get("organizaciones", {})
    equipo = data.get("equipos", {})

    return TutorVerifyResponse(
        jugador_nombre=jugador.get("nombre", ""),
        jugador_apellidos=jugador.get("apellidos"),
        equipo_nombre=equipo.get("nombre", "") if equipo else "",
        organizacion_nombre=org.get("nombre", "") if org else "",
        consentimientos_requeridos=[
            "terminos_servicio",
            "politica_privacidad",
            "datos_personales",
            "menor_representacion",
        ],
    )


@router.post("/accept", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def accept_tutor_invitation(data: TutorAcceptRequest, request: Request):
    """
    Tutor acepta invitacion, crea cuenta y vinculo con el menor.
    El menor NO tiene cuenta propia — accede via la cuenta del tutor.
    """
    supabase = get_supabase()
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()

    invite = (
        supabase.table("invitaciones")
        .select("*")
        .eq("token_hash", token_hash)
        .eq("estado", "pendiente")
        .eq("es_invitacion_tutor", True)
        .single()
        .execute()
    )

    if not invite.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitacion no encontrada o ya procesada.")

    inv = invite.data
    expiry = datetime.fromisoformat(inv["expira_en"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expiry:
        supabase.table("invitaciones").update({"estado": "expirada"}).eq("id", inv["id"]).execute()
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="La invitacion ha expirado.")

    jugador_id = inv.get("jugador_id")
    if not jugador_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitacion sin jugador asociado.")

    # Check if user already exists
    existing_user = supabase.table("usuarios").select("id").eq("email", inv["email"]).execute()

    if existing_user.data:
        user_id = existing_user.data[0]["id"]
        # Update to tutor role
        supabase.table("usuarios").update({
            "rol": "tutor",
            "organizacion_id": inv["organizacion_id"],
        }).eq("id", user_id).execute()
    else:
        # Create new user account
        auth_response = supabase.auth.sign_up({
            "email": inv["email"],
            "password": data.password,
        })
        if not auth_response.user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error al crear cuenta.")

        user_id = auth_response.user.id
        supabase.table("usuarios").insert({
            "id": user_id,
            "email": inv["email"],
            "nombre": data.nombre,
            "apellidos": data.apellidos,
            "rol": "tutor",
            "organizacion_id": inv["organizacion_id"],
            "gdpr_consentimiento": True,
            "gdpr_consentimiento_fecha": datetime.now(timezone.utc).isoformat(),
        }).execute()

    # Create tutor-player link
    ip = request.client.host if request.client else None
    supabase.table("vinculos_tutor").insert({
        "jugador_id": jugador_id,
        "tutor_usuario_id": user_id,
        "relacion": data.relacion.value,
        "consentimiento_otorgado": True,
        "consentimiento_fecha": datetime.now(timezone.utc).isoformat(),
        "consentimiento_ip": ip,
        "consentimiento_metodo": "digital",
    }).execute()

    # Record GDPR consents
    for consent in data.consentimientos:
        supabase.table("consentimientos_gdpr").insert({
            "usuario_id": user_id,
            "tipo": consent.tipo.value,
            "version": consent.version,
            "otorgado": consent.otorgado,
            "ip_address": ip,
            "user_agent": request.headers.get("user-agent"),
        }).execute()

    # Update invitation
    supabase.table("invitaciones").update({
        "estado": "aceptada",
        "aceptado_por": user_id,
        "fecha_respuesta": datetime.now(timezone.utc).isoformat(),
    }).eq("id", inv["id"]).execute()

    log_action(
        usuario_id=user_id,
        accion="aceptar_invitacion",
        entidad_tipo="tutor_vinculacion",
        entidad_id=jugador_id,
        ip_address=ip,
    )

    # Return user
    user_data = supabase.table("usuarios").select("*, organizaciones(*)").eq("id", user_id).single().execute()
    ud = user_data.data
    ud["organizacion"] = ud.pop("organizaciones", None)
    return UsuarioResponse(**ud)


# ============ Tutor Dashboard ============

@router.get("/mis-menores", response_model=VinculoTutorListResponse)
async def list_mis_menores(
    auth: AuthContext = Depends(require_permission()),
):
    """Lista los menores vinculados al tutor actual."""
    supabase = get_supabase()
    result = (
        supabase.table("vinculos_tutor")
        .select("*")
        .eq("tutor_usuario_id", auth.user_id)
        .eq("activo", True)
        .execute()
    )
    return VinculoTutorListResponse(
        data=[VinculoTutorResponse(**v) for v in result.data],
    )


@router.post("/{vinculo_id}/revoke", response_model=VinculoTutorResponse)
async def revoke_consentimiento_menor(
    vinculo_id: UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission()),
):
    """Tutor revoca consentimiento para un menor."""
    supabase = get_supabase()

    vinculo = (
        supabase.table("vinculos_tutor")
        .select("*")
        .eq("id", str(vinculo_id))
        .eq("tutor_usuario_id", auth.user_id)
        .single()
        .execute()
    )

    if not vinculo.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vinculo no encontrado.")

    result = supabase.table("vinculos_tutor").update({
        "consentimiento_revocado": True,
        "revocacion_fecha": datetime.now(timezone.utc).isoformat(),
        "activo": False,
    }).eq("id", str(vinculo_id)).execute()

    log_action(
        usuario_id=auth.user_id,
        accion="consentimiento_gdpr",
        entidad_tipo="vinculo_tutor",
        entidad_id=str(vinculo_id),
        datos_nuevos={"consentimiento_revocado": True},
        ip_address=request.client.host if request.client else None,
    )

    return VinculoTutorResponse(**result.data[0])


@router.get("/menor/{jugador_id}/sesiones")
async def get_menor_sesiones(
    jugador_id: UUID,
    auth: AuthContext = Depends(require_permission()),
):
    """Tutor ve las sesiones compartidas de su menor."""
    supabase = get_supabase()

    # Verify tutor has active consent for this player
    vinculo = (
        supabase.table("vinculos_tutor")
        .select("id")
        .eq("tutor_usuario_id", auth.user_id)
        .eq("jugador_id", str(jugador_id))
        .eq("consentimiento_otorgado", True)
        .eq("consentimiento_revocado", False)
        .eq("activo", True)
        .execute()
    )

    if not vinculo.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a este jugador.")

    # Get player's team
    jugador = supabase.table("jugadores").select("equipo_id").eq("id", str(jugador_id)).single().execute()
    if not jugador.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jugador no encontrado.")

    # Get sessions for that team
    sesiones = (
        supabase.table("sesiones")
        .select("id, titulo, fecha, match_day, estado")
        .eq("equipo_id", jugador.data["equipo_id"])
        .order("fecha", desc=True)
        .limit(50)
        .execute()
    )

    return {"data": sesiones.data}


@router.get("/menor/{jugador_id}/convocatorias")
async def get_menor_convocatorias(
    jugador_id: UUID,
    auth: AuthContext = Depends(require_permission()),
):
    """Tutor ve las convocatorias de su menor."""
    supabase = get_supabase()

    vinculo = (
        supabase.table("vinculos_tutor")
        .select("id")
        .eq("tutor_usuario_id", auth.user_id)
        .eq("jugador_id", str(jugador_id))
        .eq("consentimiento_otorgado", True)
        .eq("consentimiento_revocado", False)
        .eq("activo", True)
        .execute()
    )

    if not vinculo.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin acceso a este jugador.")

    convocatorias = (
        supabase.table("convocatorias")
        .select("*, partidos(fecha, rivales(nombre))")
        .eq("jugador_id", str(jugador_id))
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )

    return {"data": convocatorias.data}
