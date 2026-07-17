"""
TrainingHub Pro - Router Modulo Medico
CRUD para registros medicos con cifrado y auditoria (RGPD Art. 9).
"""

from math import ceil
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, status

from app.database import get_supabase
from app.models import (
    RegistroMedicoCreate,
    RegistroMedicoUpdate,
    RegistroMedicoResponse,
    RegistroMedicoSummary,
    RegistroMedicoListResponse,
    AccesoMedicoLogResponse,
    AccesoMedicoLogListResponse,
    UsuarioResponse,
)
from app.models.medico import (
    MarkFitRequest,
    PruebaMedicaCreate,
    PruebaMedicaUpdate,
    PruebaMedicaResponse,
)
from app.security.dependencies import require_permission, require_any_permission, AuthContext
from app.security.permissions import Permission
from app.security.encryption import encrypt_field, decrypt_field
from app.services.audit_service import log_action, log_create, log_update
from app.services.medical_availability_service import (
    default_disponibilidad,
    sync_jugador_disponibilidad,
)
logger = logging.getLogger(__name__)

router = APIRouter()


def _log_medical_access(
    registro_id: str,
    usuario_id: str,
    accion: str,
    request: Request,
):
    """Log every access to medical data (mandatory under GDPR Art. 9)."""
    supabase = get_supabase()
    try:
        supabase.table("accesos_medicos_log").insert({
            "registro_medico_id": registro_id,
            "usuario_id": usuario_id,
            "accion": accion,
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
        }).execute()
    except Exception:
        pass


def _encrypt_medical_fields(data: dict) -> dict:
    """Encrypt sensitive fields before storing."""
    for field_name in ("diagnostico", "tratamiento", "medicacion"):
        if field_name in data and data[field_name] is not None:
            data[field_name] = encrypt_field(data[field_name])
    return data


def _decrypt_medical_fields(data: dict) -> dict:
    """Decrypt sensitive fields for authorized readers."""
    for field_name in ("diagnostico", "tratamiento", "medicacion"):
        if field_name in data and data[field_name] is not None:
            try:
                data[field_name] = decrypt_field(data[field_name])
            except Exception:
                data[field_name] = "[Error de descifrado]"
    return data


def _serialize_enums(record: dict) -> dict:
    """Convierte enums pydantic a str para Supabase."""
    for key, val in list(record.items()):
        if hasattr(val, "value"):
            record[key] = val.value
        elif isinstance(val, UUID):
            record[key] = str(val)
    return record


def _prepare_record_dates(record: dict) -> dict:
    for date_field in ("fecha_inicio", "fecha_fin", "fecha_alta"):
        if record.get(date_field) is not None:
            v = record[date_field]
            record[date_field] = v.isoformat() if hasattr(v, "isoformat") else v
    return record


# ============ CRUD ============

@router.post("", response_model=RegistroMedicoResponse, status_code=status.HTTP_201_CREATED)
async def create_registro_medico(
    data: RegistroMedicoCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission(Permission.MEDICAL_CREATE)),
):
    """Crea un nuevo registro medico (solo fisio/medico)."""
    supabase = get_supabase()

    record = data.model_dump(exclude_unset=True)
    record["creado_por"] = auth.user_id
    record = _serialize_enums(record)
    record = _prepare_record_dates(record)

    if record.get("registro_padre_id"):
        record["registro_padre_id"] = str(record["registro_padre_id"])
    if record.get("registro_origen_id"):
        record["registro_origen_id"] = str(record["registro_origen_id"])

    # Disponibilidad por defecto si no viene
    is_historical = record.get("estado") == "alta"
    if not record.get("disponibilidad"):
        record["disponibilidad"] = (
            "pleno"
            if is_historical
            else default_disponibilidad(
                tipo=record.get("tipo") or "otro",
                estado=record.get("estado") or "activo",
                fase_rtp=record.get("fase_rtp"),
                severidad=record.get("severidad"),
            )
        )

    # Encrypt sensitive fields
    record = _encrypt_medical_fields(record)

    result = supabase.table("registros_medicos").insert(record).execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error al crear registro medico.")

    _log_medical_access(result.data[0]["id"], auth.user_id, "crear", request)

    log_create(auth.user_id, "registro_medico", result.data[0]["id"], {"tipo": data.tipo.value})

    # Sync disponibilidad/estado del jugador (considera todos los casos abiertos)
    if not is_historical:
        try:
            sync_jugador_disponibilidad(supabase, str(data.jugador_id))
        except Exception:
            logger.exception("Error sync disponibilidad jugador %s", data.jugador_id)

    # Decrypt for response
    response_data = _decrypt_medical_fields(result.data[0])
    return RegistroMedicoResponse(**response_data)

@router.get("", response_model=RegistroMedicoListResponse)
async def list_registros_medicos(
    equipo_id: UUID,
    jugador_id: Optional[UUID] = None,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    request: Request = None,
    auth: AuthContext = Depends(require_any_permission(
        Permission.MEDICAL_READ, Permission.MEDICAL_READ_SUMMARY,
    )),
):
    """Lista registros medicos. Fisio ve todo, entrenador principal ve resumen."""
    supabase = get_supabase()

    query = (
        supabase.table("registros_medicos")
        .select("*", count="exact")
        .eq("equipo_id", str(equipo_id))
        .order("fecha_inicio", desc=True)
    )

    if jugador_id:
        query = query.eq("jugador_id", str(jugador_id))
    if tipo:
        query = query.eq("tipo", tipo)
    if estado:
        query = query.eq("estado", estado)

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    result = query.execute()

    is_full_access = Permission.MEDICAL_READ in auth.permissions

    records = []
    for r in result.data:
        if request:
            _log_medical_access(r["id"], auth.user_id, "ver", request)

        if is_full_access:
            records.append(RegistroMedicoResponse(**_decrypt_medical_fields(r)))
        else:
            # Summary view — no clinical details
            records.append(RegistroMedicoResponse(
                **{
                    **r,
                    "diagnostico": None,
                    "tratamiento": None,
                    "medicacion": None,
                }
            ))

    return RegistroMedicoListResponse(data=records, total=result.count or 0)


@router.get("/{registro_id}", response_model=RegistroMedicoResponse)
async def get_registro_medico(
    registro_id: UUID,
    request: Request,
    auth: AuthContext = Depends(require_any_permission(
        Permission.MEDICAL_READ, Permission.MEDICAL_READ_SUMMARY,
    )),
):
    """Obtiene un registro medico por ID."""
    supabase = get_supabase()

    result = (
        supabase.table("registros_medicos")
        .select("*")
        .eq("id", str(registro_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro medico no encontrado.")

    _log_medical_access(str(registro_id), auth.user_id, "ver", request)

    is_full_access = Permission.MEDICAL_READ in auth.permissions
    if is_full_access:
        return RegistroMedicoResponse(**_decrypt_medical_fields(result.data))
    else:
        return RegistroMedicoResponse(
            **{**result.data, "diagnostico": None, "tratamiento": None, "medicacion": None}
        )


@router.put("/{registro_id}", response_model=RegistroMedicoResponse)
async def update_registro_medico(
    registro_id: UUID,
    data: RegistroMedicoUpdate,
    request: Request,
    auth: AuthContext = Depends(require_permission(Permission.MEDICAL_UPDATE)),
):
    """Actualiza un registro medico (solo fisio/medico)."""
    supabase = get_supabase()

    existing = (
        supabase.table("registros_medicos")
        .select("id")
        .eq("id", str(registro_id))
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro medico no encontrado.")

    update_data = data.model_dump(exclude_unset=True)
    update_data = _serialize_enums(update_data)
    update_data = _prepare_record_dates(update_data)

    if "registro_padre_id" in update_data and update_data["registro_padre_id"] is not None:
        update_data["registro_padre_id"] = str(update_data["registro_padre_id"])
    if "registro_origen_id" in update_data and update_data["registro_origen_id"] is not None:
        update_data["registro_origen_id"] = str(update_data["registro_origen_id"])

    # Si cambia fase_rtp y no hay disponibilidad explícita, recalcular
    if "fase_rtp" in update_data and "disponibilidad" not in update_data:
        existing_full = (
            supabase.table("registros_medicos")
            .select("tipo, estado, severidad, disponibilidad")
            .eq("id", str(registro_id))
            .single()
            .execute()
        )
        if existing_full.data:
            tipo = existing_full.data.get("tipo") or "otro"
            estado_r = update_data.get("estado") or existing_full.data.get("estado") or "activo"
            sev = update_data.get("severidad") or existing_full.data.get("severidad")
            update_data["disponibilidad"] = default_disponibilidad(
                tipo=tipo,
                estado=estado_r,
                fase_rtp=update_data.get("fase_rtp"),
                severidad=sev,
            )

    update_data = _encrypt_medical_fields(update_data)

    result = (
        supabase.table("registros_medicos")
        .update(update_data)
        .eq("id", str(registro_id))
        .execute()
    )

    _log_medical_access(str(registro_id), auth.user_id, "editar", request)
    log_update(auth.user_id, "registro_medico", str(registro_id))

    updated = result.data[0]
    try:
        sync_jugador_disponibilidad(supabase, updated["jugador_id"])
    except Exception:
        logger.exception("Error sync disponibilidad jugador %s", updated.get("jugador_id"))

    return RegistroMedicoResponse(**_decrypt_medical_fields(updated))


@router.delete("/{registro_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_registro_medico(
    registro_id: UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission(Permission.MEDICAL_UPDATE)),
):
    """Elimina un registro medico y restaura estado del jugador si procede."""
    supabase = get_supabase()

    existing = (
        supabase.table("registros_medicos")
        .select("id, jugador_id, estado")
        .eq("id", str(registro_id))
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro medico no encontrado.")

    jugador_id = existing.data["jugador_id"]

    # Delete access logs first (FK constraint)
    supabase.table("accesos_medicos_log").delete().eq("registro_medico_id", str(registro_id)).execute()

    # Delete the record
    supabase.table("registros_medicos").delete().eq("id", str(registro_id)).execute()

    _log_medical_access(str(registro_id), auth.user_id, "eliminar", request)

    try:
        sync_jugador_disponibilidad(supabase, jugador_id)
    except Exception:
        logger.exception("Error sync disponibilidad tras delete %s", jugador_id)

    return None


# ============ Document Upload ============

MEDICAL_BUCKET = "medical-documents"


def _ensure_medical_bucket(supabase) -> None:
    """Create the medical-documents bucket if it doesn't exist."""
    try:
        supabase.storage.get_bucket(MEDICAL_BUCKET)
    except Exception:
        try:
            supabase.storage.create_bucket(MEDICAL_BUCKET, options={"public": True})
        except Exception:
            pass  # May already exist from concurrent request


@router.post("/{registro_id}/upload-document")
async def upload_document(
    registro_id: UUID,
    request: Request,
    file: UploadFile = File(...),
    auth: AuthContext = Depends(require_permission(Permission.MEDICAL_UPDATE)),
):
    """Sube un documento/foto a un registro medico."""
    supabase = get_supabase()

    # Validate file type and size
    allowed_types = ("image/", "application/pdf", "application/msword",
                     "application/vnd.openxmlformats-officedocument")
    if not file.content_type or not any(file.content_type.startswith(t) for t in allowed_types):
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Use imágenes, PDF o documentos Word.")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no puede superar 10MB.")

    # Verify registro exists
    existing = (
        supabase.table("registros_medicos")
        .select("*")
        .eq("id", str(registro_id))
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Registro medico no encontrado.")

    # Ensure bucket exists
    _ensure_medical_bucket(supabase)

    # Upload file
    from datetime import datetime, timezone
    timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in (file.filename or "file"))
    storage_path = f"{registro_id}/{timestamp}_{safe_name}"

    try:
        supabase.storage.from_(MEDICAL_BUCKET).upload(
            storage_path,
            content,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )
        public_url = supabase.storage.from_(MEDICAL_BUCKET).get_public_url(storage_path)
    except Exception as e:
        logger.error(f"Error uploading medical document: {e}")
        raise HTTPException(status_code=500, detail="Error al subir el archivo.")

    # Append URL to registro
    current_urls = existing.data.get("documentos_urls") or []
    current_urls.append(public_url)

    supabase.table("registros_medicos").update({
        "documentos_urls": current_urls,
    }).eq("id", str(registro_id)).execute()

    _log_medical_access(str(registro_id), auth.user_id, "editar", request)

    return {"url": public_url, "documentos_urls": current_urls}


@router.delete("/{registro_id}/document")
async def delete_document(
    registro_id: UUID,
    url: str = Query(...),
    request: Request = None,
    auth: AuthContext = Depends(require_permission(Permission.MEDICAL_UPDATE)),
):
    """Elimina un documento de un registro medico."""
    supabase = get_supabase()

    existing = (
        supabase.table("registros_medicos")
        .select("*")
        .eq("id", str(registro_id))
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Registro medico no encontrado.")

    current_urls = existing.data.get("documentos_urls") or []
    updated_urls = [u for u in current_urls if u != url]

    # Try to remove from storage
    try:
        # Extract storage path from URL
        if MEDICAL_BUCKET in url:
            path = url.split(f"{MEDICAL_BUCKET}/")[1].split("?")[0]
            supabase.storage.from_(MEDICAL_BUCKET).remove([path])
    except Exception:
        pass  # File may not exist in storage

    supabase.table("registros_medicos").update({
        "documentos_urls": updated_urls,
    }).eq("id", str(registro_id)).execute()

    if request:
        _log_medical_access(str(registro_id), auth.user_id, "editar", request)

    return {"documentos_urls": updated_urls}


# ============ Access Log ============

@router.get("/{registro_id}/accesos", response_model=AccesoMedicoLogListResponse)
async def get_accesos_log(
    registro_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    auth: AuthContext = Depends(require_permission(Permission.MEDICAL_READ)),
):
    """Lista el log de accesos a un registro medico (auditoria RGPD)."""
    supabase = get_supabase()

    offset = (page - 1) * limit
    result = (
        supabase.table("accesos_medicos_log")
        .select("*", count="exact")
        .eq("registro_medico_id", str(registro_id))
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return AccesoMedicoLogListResponse(
        data=[AccesoMedicoLogResponse(**a) for a in result.data],
        total=result.count or 0,
    )


# ============ Player fitness status ============

@router.post("/{registro_id}/mark-fit")
async def mark_player_fit(
    registro_id: UUID,
    body: MarkFitRequest = MarkFitRequest(),
    request: Request = None,
    auth: AuthContext = Depends(require_permission(Permission.MEDICAL_UPDATE)),
):
    """Marca alta medica de un jugador. Recalcula disponibilidad si quedan otros casos."""
    supabase = get_supabase()

    from datetime import date

    registro = (
        supabase.table("registros_medicos")
        .select("jugador_id, fecha_inicio")
        .eq("id", str(registro_id))
        .single()
        .execute()
    )
    if not registro.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro no encontrado.")

    fecha_alta = body.fecha_alta or date.today()
    update_reg: dict = {
        "estado": "alta",
        "fecha_alta": fecha_alta.isoformat(),
        "disponibilidad": "pleno",
    }
    if body.dias_baja_reales is not None:
        update_reg["dias_baja_reales"] = body.dias_baja_reales
    elif registro.data.get("fecha_inicio"):
        try:
            start = date.fromisoformat(str(registro.data["fecha_inicio"])[:10])
            update_reg["dias_baja_reales"] = (fecha_alta - start).days
        except Exception:
            pass

    supabase.table("registros_medicos").update(update_reg).eq("id", str(registro_id)).execute()

    try:
        sync_jugador_disponibilidad(supabase, registro.data["jugador_id"])
    except Exception:
        logger.exception("Error sync tras alta %s", registro_id)

    if request:
        _log_medical_access(str(registro_id), auth.user_id, "editar", request)

    return {"message": "Jugador marcado como apto."}


class MoveToRehabRequest(BaseModel):
    dias_recuperacion_estimados: Optional[int] = None
    fase_rtp: Optional[str] = None
    disponibilidad: Optional[str] = None


@router.post("/{registro_id}/move-to-rehab")
async def move_to_rehab(
    registro_id: UUID,
    body: MoveToRehabRequest = MoveToRehabRequest(),
    request: Request = None,
    auth: AuthContext = Depends(require_permission(Permission.MEDICAL_UPDATE)),
):
    """Cambia un registro a rehabilitacion (en_recuperacion) + fase RTP."""
    supabase = get_supabase()

    registro = (
        supabase.table("registros_medicos")
        .select("jugador_id, titulo, fecha_inicio, severidad")
        .eq("id", str(registro_id))
        .single()
        .execute()
    )
    if not registro.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro no encontrado.")

    fase = body.fase_rtp or "fase_1_control_dolor"
    disp = body.disponibilidad or default_disponibilidad(
        tipo="rehabilitacion",
        estado="en_recuperacion",
        fase_rtp=fase,
        severidad=registro.data.get("severidad"),
    )

    update_data: dict = {
        "estado": "en_recuperacion",
        "tipo": "rehabilitacion",
        "fase_rtp": fase,
        "disponibilidad": disp,
    }
    if body.dias_recuperacion_estimados:
        update_data["dias_baja_estimados"] = body.dias_recuperacion_estimados

    supabase.table("registros_medicos").update(update_data).eq("id", str(registro_id)).execute()

    try:
        sync_jugador_disponibilidad(supabase, registro.data["jugador_id"])
    except Exception:
        logger.exception("Error sync tras rehab %s", registro_id)

    if request:
        _log_medical_access(str(registro_id), auth.user_id, "editar", request)

    return {"message": "Jugador pasado a rehabilitación."}


# ============ Pruebas médicas ============

@router.get("/{registro_id}/pruebas", response_model=list[PruebaMedicaResponse])
async def list_pruebas(
    registro_id: UUID,
    auth: AuthContext = Depends(require_any_permission(
        Permission.MEDICAL_READ, Permission.MEDICAL_READ_SUMMARY,
    )),
):
    supabase = get_supabase()
    result = (
        supabase.table("pruebas_medicas")
        .select("*")
        .eq("registro_medico_id", str(registro_id))
        .order("fecha", desc=True)
        .execute()
    )
    return [PruebaMedicaResponse(**p) for p in (result.data or [])]


@router.post("/{registro_id}/pruebas", response_model=PruebaMedicaResponse, status_code=status.HTTP_201_CREATED)
async def create_prueba(
    registro_id: UUID,
    data: PruebaMedicaCreate,
    auth: AuthContext = Depends(require_permission(Permission.MEDICAL_UPDATE)),
):
    supabase = get_supabase()
    registro = (
        supabase.table("registros_medicos")
        .select("id, jugador_id, equipo_id")
        .eq("id", str(registro_id))
        .single()
        .execute()
    )
    if not registro.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro no encontrado.")

    payload = data.model_dump()
    payload = _serialize_enums(payload)
    if payload.get("fecha"):
        payload["fecha"] = payload["fecha"].isoformat() if hasattr(payload["fecha"], "isoformat") else payload["fecha"]
    payload.update({
        "registro_medico_id": str(registro_id),
        "jugador_id": registro.data["jugador_id"],
        "equipo_id": registro.data["equipo_id"],
        "creado_por": str(auth.user_id),
    })
    result = supabase.table("pruebas_medicas").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error al crear prueba")
    return PruebaMedicaResponse(**result.data[0])


@router.put("/{registro_id}/pruebas/{prueba_id}", response_model=PruebaMedicaResponse)
async def update_prueba(
    registro_id: UUID,
    prueba_id: UUID,
    data: PruebaMedicaUpdate,
    auth: AuthContext = Depends(require_permission(Permission.MEDICAL_UPDATE)),
):
    supabase = get_supabase()
    payload = data.model_dump(exclude_unset=True)
    payload = _serialize_enums(payload)
    if payload.get("fecha") is not None:
        payload["fecha"] = payload["fecha"].isoformat() if hasattr(payload["fecha"], "isoformat") else payload["fecha"]
    result = (
        supabase.table("pruebas_medicas")
        .update(payload)
        .eq("id", str(prueba_id))
        .eq("registro_medico_id", str(registro_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prueba no encontrada")
    return PruebaMedicaResponse(**result.data[0])


@router.delete("/{registro_id}/pruebas/{prueba_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prueba(
    registro_id: UUID,
    prueba_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.MEDICAL_UPDATE)),
):
    supabase = get_supabase()
    supabase.table("pruebas_medicas").delete().eq("id", str(prueba_id)).eq(
        "registro_medico_id", str(registro_id)
    ).execute()
    return None
