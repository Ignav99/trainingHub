"""
TrainingHub Pro - Organizacion Endpoints
Gestiona la configuracion de la organizacion (club): nombre, colores, logo.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel

from app.dependencies import require_permission, AuthContext
from app.services.audit_service import log_action

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Schemas ============

class OrganizacionUpdate(BaseModel):
    nombre: Optional[str] = None
    color_primario: Optional[str] = None
    color_secundario: Optional[str] = None
    config: Optional[dict] = None


class OrganizacionResponse(BaseModel):
    id: str
    nombre: str
    logo_url: Optional[str] = None
    color_primario: str
    color_secundario: str
    config: dict
    created_at: str
    updated_at: str


# ============ Endpoints ============

@router.get("")
async def get_organizacion(auth: AuthContext = Depends(require_permission())):
    """Obtiene los datos de la organizacion del usuario autenticado."""
    from app.database import get_supabase

    supabase = get_supabase()
    result = (
        supabase.table("organizaciones")
        .select("*")
        .eq("id", auth.organizacion_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Organizacion no encontrada")

    return result.data


@router.patch("")
async def update_organizacion(
    data: OrganizacionUpdate,
    auth: AuthContext = Depends(require_permission()),
):
    """
    Actualiza los datos de la organizacion.
    Solo el admin de la organizacion puede actualizar.
    """
    from app.database import get_supabase
    from datetime import datetime, timezone

    supabase = get_supabase()

    # Build update payload (only non-None fields)
    update_data = {}
    if data.nombre is not None:
        update_data["nombre"] = data.nombre
    if data.color_primario is not None:
        update_data["color_primario"] = data.color_primario
    if data.color_secundario is not None:
        update_data["color_secundario"] = data.color_secundario
    if data.config is not None:
        # Merge config with existing
        existing = (
            supabase.table("organizaciones")
            .select("config")
            .eq("id", auth.organizacion_id)
            .single()
            .execute()
        )
        existing_config = existing.data.get("config", {}) if existing.data else {}
        existing_config.update(data.config)
        update_data["config"] = existing_config

    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("organizaciones")
        .update(update_data)
        .eq("id", auth.organizacion_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Organizacion no encontrada")

    log_action(
        usuario_id=auth.user_id,
        accion="actualizar_organizacion",
        entidad_tipo="organizacion",
        entidad_id=auth.organizacion_id,
        datos_nuevos=update_data,
    )

    return result.data[0] if result.data else result.data


@router.get("/miembros")
async def list_miembros(auth: AuthContext = Depends(require_permission())):
    """Lista los miembros de la organizacion con sus roles de equipo."""
    from app.database import get_supabase

    supabase = get_supabase()
    result = (
        supabase.table("usuarios")
        .select("id, email, nombre, apellidos, rol, created_at, usuarios_equipos(equipo_id, rol_en_equipo, equipos(nombre))")
        .eq("organizacion_id", auth.organizacion_id)
        .execute()
    )

    return result.data or []


@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    auth: AuthContext = Depends(require_permission()),
):
    """
    Sube o actualiza el logo/escudo de la organizacion.
    Acepta PNG, JPG, SVG, WebP. Max 5MB.
    """
    from app.database import get_supabase
    from datetime import datetime, timezone

    # Validate file
    if not file.content_type or not file.content_type.startswith(("image/", "application/svg")):
        raise HTTPException(status_code=400, detail="Solo se permiten imagenes (PNG, JPG, SVG, WebP)")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no puede superar 5MB")

    supabase = get_supabase()

    # Upload to Supabase Storage
    extension = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "png"
    storage_path = f"organizaciones/{auth.organizacion_id}/logo.{extension}"

    try:
        # Try to remove existing logo first
        try:
            supabase.storage.from_("logos").remove([storage_path])
        except Exception:
            pass

        supabase.storage.from_("logos").upload(
            storage_path,
            content,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )

        # Get public URL
        logo_url = supabase.storage.from_("logos").get_public_url(storage_path)

    except Exception as e:
        logger.error(f"Error uploading logo: {e}")
        raise HTTPException(status_code=500, detail="Error al subir el logo")

    # Update organization record
    supabase.table("organizaciones").update({
        "logo_url": logo_url,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", auth.organizacion_id).execute()

    log_action(
        usuario_id=auth.user_id,
        accion="subir_logo",
        entidad_tipo="organizacion",
        entidad_id=auth.organizacion_id,
    )

    return {"logo_url": logo_url}
