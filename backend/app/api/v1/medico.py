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

from datetime import timedelta

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
from app.security.dependencies import require_permission, require_any_permission, AuthContext
from app.security.permissions import Permission
from app.security.encryption import encrypt_field, decrypt_field
from app.services.audit_service import log_action, log_create, log_update

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
    record["jugador_id"] = str(record["jugador_id"])
    record["equipo_id"] = str(record["equipo_id"])
    if record.get("registro_padre_id"):
        record["registro_padre_id"] = str(record["registro_padre_id"])

    # Handle estado enum serialization
    if record.get("estado"):
        record["estado"] = record["estado"].value if hasattr(record["estado"], "value") else record["estado"]

    if record.get("fecha_inicio"):
        record["fecha_inicio"] = record["fecha_inicio"].isoformat()
    if record.get("fecha_fin"):
        record["fecha_fin"] = record["fecha_fin"].isoformat()
    if record.get("fecha_alta"):
        record["fecha_alta"] = record["fecha_alta"].isoformat()

    # Encrypt sensitive fields
    record = _encrypt_medical_fields(record)

    result = supabase.table("registros_medicos").insert(record).execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error al crear registro medico.")

    _log_medical_access(result.data[0]["id"], auth.user_id, "crear", request)

    log_create(auth.user_id, "registro_medico", result.data[0]["id"], {"tipo": data.tipo.value})

    # Auto-update player status based on tipo (skip for historical records)
    # molestias: player stays available (activo), no estado change
    # rehabilitacion: player is in recovery, not available
    is_historical = data.estado and data.estado.value == "alta"
    estado_map = {
        "lesion": "lesionado",
        "enfermedad": "enfermo",
        "rehabilitacion": "en_recuperacion",
    }
    new_estado = estado_map.get(data.tipo.value) if not is_historical else None
    if new_estado:
        update_jugador = {
            "estado": new_estado,
            "motivo_baja": data.titulo,
            "fecha_lesion": data.fecha_inicio.isoformat(),
        }
        if data.dias_baja_estimados:
            est_return = data.fecha_inicio + timedelta(days=data.dias_baja_estimados)
            update_jugador["fecha_vuelta_estimada"] = est_return.isoformat()
        try:
            supabase.table("jugadores").update(update_jugador).eq("id", str(data.jugador_id)).execute()
        except Exception:
            pass

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

    for date_field in ("fecha_inicio", "fecha_fin", "fecha_alta"):
        if date_field in update_data and update_data[date_field] is not None:
            update_data[date_field] = update_data[date_field].isoformat()

    if "registro_padre_id" in update_data:
        if update_data["registro_padre_id"] is not None:
            update_data["registro_padre_id"] = str(update_data["registro_padre_id"])

    if update_data.get("estado"):
        update_data["estado"] = update_data["estado"].value if hasattr(update_data["estado"], "value") else update_data["estado"]

    update_data = _encrypt_medical_fields(update_data)

    result = (
        supabase.table("registros_medicos")
        .update(update_data)
        .eq("id", str(registro_id))
        .execute()
    )

    _log_medical_access(str(registro_id), auth.user_id, "editar", request)
    log_update(auth.user_id, "registro_medico", str(registro_id))

    # Auto-sync player estado when medical record estado changes
    updated = result.data[0]
    record_estado = update_data.get("estado") or updated.get("estado")
    if record_estado == "alta":
        # Player recovers → activo
        try:
            supabase.table("jugadores").update({
                "estado": "activo",
                "fecha_lesion": None,
                "fecha_vuelta_estimada": None,
                "motivo_baja": None,
            }).eq("id", updated["jugador_id"]).execute()
        except Exception:
            pass
    else:
        # Sync based on tipo
        tipo = updated.get("tipo")
        estado_map = {
            "lesion": "lesionado",
            "enfermedad": "enfermo",
            "rehabilitacion": "en_recuperacion",
        }
        new_estado = estado_map.get(tipo)
        if new_estado:
            try:
                supabase.table("jugadores").update({
                    "estado": new_estado,
                }).eq("id", updated["jugador_id"]).execute()
            except Exception:
                pass

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

    # If the deleted record was active (not alta), check if player should be restored
    if existing.data["estado"] != "alta":
        # Check if player has other active medical records
        other_records = (
            supabase.table("registros_medicos")
            .select("id")
            .eq("jugador_id", jugador_id)
            .neq("estado", "alta")
            .limit(1)
            .execute()
        )
        if not other_records.data:
            # No other active records — restore player to activo
            try:
                supabase.table("jugadores").update({
                    "estado": "activo",
                    "fecha_lesion": None,
                    "fecha_vuelta_estimada": None,
                    "motivo_baja": None,
                }).eq("id", jugador_id).execute()
            except Exception:
                pass

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
    request: Request,
    auth: AuthContext = Depends(require_permission(Permission.MEDICAL_UPDATE)),
):
    """Marca alta medica de un jugador. Actualiza estado del registro y del jugador."""
    supabase = get_supabase()

    from datetime import date

    registro = (
        supabase.table("registros_medicos")
        .select("jugador_id")
        .eq("id", str(registro_id))
        .single()
        .execute()
    )
    if not registro.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro no encontrado.")

    # Update medical record
    supabase.table("registros_medicos").update({
        "estado": "alta",
        "fecha_alta": date.today().isoformat(),
    }).eq("id", str(registro_id)).execute()

    # Update player status
    supabase.table("jugadores").update({
        "estado": "activo",
        "fecha_lesion": None,
        "fecha_vuelta_estimada": None,
        "motivo_baja": None,
    }).eq("id", registro.data["jugador_id"]).execute()

    _log_medical_access(str(registro_id), auth.user_id, "editar", request)

    return {"message": "Jugador marcado como apto."}


class MoveToRehabRequest(BaseModel):
    dias_recuperacion_estimados: Optional[int] = None


@router.post("/{registro_id}/move-to-rehab")
async def move_to_rehab(
    registro_id: UUID,
    body: MoveToRehabRequest = MoveToRehabRequest(),
    request: Request = None,
    auth: AuthContext = Depends(require_permission(Permission.MEDICAL_UPDATE)),
):
    """Cambia un registro de lesion/activo a rehabilitacion (en_recuperacion)."""
    supabase = get_supabase()

    registro = (
        supabase.table("registros_medicos")
        .select("jugador_id, titulo, fecha_inicio")
        .eq("id", str(registro_id))
        .single()
        .execute()
    )
    if not registro.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro no encontrado.")

    # Update medical record
    update_data: dict = {
        "estado": "en_recuperacion",
        "tipo": "rehabilitacion",
    }
    if body.dias_recuperacion_estimados:
        update_data["dias_baja_estimados"] = body.dias_recuperacion_estimados

    supabase.table("registros_medicos").update(update_data).eq("id", str(registro_id)).execute()

    # Update player status to en_recuperacion
    jugador_update: dict = {
        "estado": "en_recuperacion",
        "motivo_baja": f"Rehabilitación: {registro.data['titulo']}",
    }
    if body.dias_recuperacion_estimados:
        from datetime import date, timedelta
        est_return = date.today() + timedelta(days=body.dias_recuperacion_estimados)
        jugador_update["fecha_vuelta_estimada"] = est_return.isoformat()

    supabase.table("jugadores").update(jugador_update).eq("id", registro.data["jugador_id"]).execute()

    if request:
        _log_medical_access(str(registro_id), auth.user_id, "editar", request)

    return {"message": "Jugador pasado a rehabilitación."}
