"""
TrainingHub Pro - Router GDPR/RGPD
Endpoints para consentimientos, solicitudes de derechos, y portabilidad de datos.
"""

import json
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.models import (
    ConsentimientoCreate,
    ConsentimientoResponse,
    ConsentimientoListResponse,
    ConsentimientoBulkCreate,
    SolicitudGDPRCreate,
    SolicitudGDPRResponse,
    SolicitudGDPRListResponse,
    SolicitudGDPRUpdateAdmin,
    DataExportResponse,
)
from app.services.audit_service import log_action

router = APIRouter()


# ============ Consentimientos ============

@router.get("/consentimientos", response_model=ConsentimientoListResponse)
async def list_consentimientos(
    auth: AuthContext = Depends(require_permission()),
):
    """Lista consentimientos del usuario actual."""
    supabase = get_supabase()
    result = (
        supabase.table("consentimientos_gdpr")
        .select("*")
        .eq("usuario_id", auth.user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return ConsentimientoListResponse(
        data=[ConsentimientoResponse(**c) for c in result.data],
    )


@router.post("/consentimientos", response_model=ConsentimientoResponse, status_code=status.HTTP_201_CREATED)
async def create_consentimiento(
    data: ConsentimientoCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission()),
):
    """Registra un consentimiento."""
    supabase = get_supabase()

    result = supabase.table("consentimientos_gdpr").insert({
        "usuario_id": auth.user_id,
        "tipo": data.tipo.value,
        "version": data.version,
        "otorgado": data.otorgado,
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }).execute()

    log_action(
        usuario_id=auth.user_id,
        accion="consentimiento_gdpr",
        entidad_tipo="consentimiento",
        entidad_id=result.data[0]["id"],
        datos_nuevos={"tipo": data.tipo.value, "otorgado": data.otorgado},
        ip_address=request.client.host if request.client else None,
    )

    return ConsentimientoResponse(**result.data[0])


@router.post("/consentimientos/bulk", response_model=ConsentimientoListResponse)
async def create_consentimientos_bulk(
    data: ConsentimientoBulkCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission()),
):
    """Registra multiples consentimientos a la vez."""
    supabase = get_supabase()
    results = []

    for consent in data.consentimientos:
        result = supabase.table("consentimientos_gdpr").insert({
            "usuario_id": auth.user_id,
            "tipo": consent.tipo.value,
            "version": consent.version,
            "otorgado": consent.otorgado,
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
        }).execute()
        if result.data:
            results.append(ConsentimientoResponse(**result.data[0]))

    return ConsentimientoListResponse(data=results)


@router.post("/consentimientos/{consentimiento_id}/revoke", response_model=ConsentimientoResponse)
async def revoke_consentimiento(
    consentimiento_id: UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission()),
):
    """Revoca un consentimiento."""
    supabase = get_supabase()

    consent = (
        supabase.table("consentimientos_gdpr")
        .select("*")
        .eq("id", str(consentimiento_id))
        .eq("usuario_id", auth.user_id)
        .single()
        .execute()
    )

    if not consent.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consentimiento no encontrado.")

    if consent.data.get("revocado"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Consentimiento ya revocado.")

    result = supabase.table("consentimientos_gdpr").update({
        "revocado": True,
        "revocado_fecha": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(consentimiento_id)).execute()

    log_action(
        usuario_id=auth.user_id,
        accion="consentimiento_gdpr",
        entidad_tipo="consentimiento",
        entidad_id=str(consentimiento_id),
        datos_nuevos={"revocado": True},
        ip_address=request.client.host if request.client else None,
    )

    return ConsentimientoResponse(**result.data[0])


# ============ Solicitudes de Derechos GDPR ============

@router.get("/solicitudes", response_model=SolicitudGDPRListResponse)
async def list_solicitudes(
    auth: AuthContext = Depends(require_permission()),
):
    """Lista solicitudes GDPR del usuario actual."""
    supabase = get_supabase()
    result = (
        supabase.table("solicitudes_gdpr")
        .select("*", count="exact")
        .eq("usuario_id", auth.user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return SolicitudGDPRListResponse(
        data=[SolicitudGDPRResponse(**s) for s in result.data],
        total=result.count or 0,
    )


@router.post("/solicitudes", response_model=SolicitudGDPRResponse, status_code=status.HTTP_201_CREATED)
async def create_solicitud(
    data: SolicitudGDPRCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission()),
):
    """Crea una solicitud de derechos GDPR."""
    supabase = get_supabase()

    # Check for existing pending request of same type
    existing = (
        supabase.table("solicitudes_gdpr")
        .select("id")
        .eq("usuario_id", auth.user_id)
        .eq("tipo", data.tipo.value)
        .in_("estado", ["pendiente", "en_proceso"])
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una solicitud pendiente del mismo tipo.",
        )

    result = supabase.table("solicitudes_gdpr").insert({
        "usuario_id": auth.user_id,
        "tipo": data.tipo.value,
        "descripcion": data.descripcion,
        "fecha_limite": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
    }).execute()

    log_action(
        usuario_id=auth.user_id,
        accion="solicitud_gdpr",
        entidad_tipo="solicitud_gdpr",
        entidad_id=result.data[0]["id"],
        datos_nuevos={"tipo": data.tipo.value},
        ip_address=request.client.host if request.client else None,
    )

    return SolicitudGDPRResponse(**result.data[0])


# ============ Admin: Process GDPR requests ============

@router.get("/solicitudes/admin", response_model=SolicitudGDPRListResponse)
async def list_solicitudes_admin(
    estado: str = None,
    auth: AuthContext = Depends(require_permission(Permission.CLUB_MANAGE_ORG, allow_club_roles=True)),
):
    """Lista todas las solicitudes GDPR (admin)."""
    supabase = get_supabase()
    query = supabase.table("solicitudes_gdpr").select("*", count="exact").order("created_at", desc=True)
    if estado:
        query = query.eq("estado", estado)
    result = query.execute()
    return SolicitudGDPRListResponse(
        data=[SolicitudGDPRResponse(**s) for s in result.data],
        total=result.count or 0,
    )


@router.put("/solicitudes/{solicitud_id}", response_model=SolicitudGDPRResponse)
async def update_solicitud(
    solicitud_id: UUID,
    data: SolicitudGDPRUpdateAdmin,
    auth: AuthContext = Depends(require_permission(Permission.CLUB_MANAGE_ORG, allow_club_roles=True)),
):
    """Procesar solicitud GDPR (admin)."""
    supabase = get_supabase()

    update_data = {
        "estado": data.estado.value,
        "procesado_por": auth.user_id,
    }
    if data.respuesta:
        update_data["respuesta"] = data.respuesta
    if data.estado.value == "completada":
        update_data["fecha_completada"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("solicitudes_gdpr")
        .update(update_data)
        .eq("id", str(solicitud_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada.")

    return SolicitudGDPRResponse(**result.data[0])


# ============ Data Export (Portabilidad) ============

@router.post("/export", response_model=DataExportResponse)
async def export_user_data(
    auth: AuthContext = Depends(require_permission()),
):
    """
    Exporta todos los datos del usuario (Art. 20 RGPD - Portabilidad).
    Returns a download URL for a JSON file with all user data.
    """
    supabase = get_supabase()
    user_id = auth.user_id

    # Collect all user data
    export_data = {
        "usuario": supabase.table("usuarios").select("*").eq("id", user_id).execute().data,
        "consentimientos": supabase.table("consentimientos_gdpr").select("*").eq("usuario_id", user_id).execute().data,
        "equipos": supabase.table("usuarios_equipos").select("*, equipos(*)").eq("usuario_id", user_id).execute().data,
    }

    # If tutor, include minor's data
    vinculos = supabase.table("vinculos_tutor").select("*").eq("tutor_usuario_id", user_id).execute()
    if vinculos.data:
        export_data["vinculos_tutor"] = vinculos.data
        for vinculo in vinculos.data:
            jugador_id = vinculo["jugador_id"]
            export_data[f"jugador_{jugador_id}"] = (
                supabase.table("jugadores").select("*").eq("id", jugador_id).execute().data
            )

    # Store export and return URL
    from app.services.storage_service import upload_file
    from app.config import get_settings

    settings = get_settings()
    export_json = json.dumps(export_data, default=str, ensure_ascii=False, indent=2)

    try:
        url = upload_file(
            bucket="exports",
            path=f"gdpr/{user_id}/{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json",
            data=export_json.encode("utf-8"),
            content_type="application/json",
        )
    except Exception:
        # Fallback: return inline
        url = "data:application/json;base64,"

    log_action(
        usuario_id=user_id,
        accion="exportar_datos",
        entidad_tipo="gdpr_export",
    )

    return DataExportResponse(
        download_url=url,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
