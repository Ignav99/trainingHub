"""
Revisión de vídeo — librería de recortes para informes y sala.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile

from app.database import get_supabase
from app.models.revision import (
    AMBITOS,
    ClipLinkCreate,
    ClipUpdate,
    FolderCreate,
    FolderUpdate,
    PackGetOrCreate,
    SessionCreate,
    SessionStateUpdate,
)
from app.security.dependencies import AuthContext, require_permission
from app.security.permissions import Permission
from app.services.revision_service import (
    MAX_CLIP_BYTES,
    REVISION_BUCKET,
    archive_expired_clips,
    default_folders_for,
    ensure_video_bucket,
    generate_session_code,
    hot_until_from,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _verify_equipo(supabase, equipo_id: str) -> dict:
    result = supabase.table("equipos").select("id, organizacion_id").eq("id", equipo_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Equipo no encontrado.")
    return result.data[0]


def _get_pack(supabase, pack_id: str, equipo_id: str | None = None) -> dict:
    query = supabase.table("revision_packs").select("*").eq("id", pack_id)
    if equipo_id:
        query = query.eq("equipo_id", equipo_id)
    result = query.limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Pack de revisión no encontrado.")
    return result.data[0]


def _ensure_default_folders(supabase, pack: dict) -> list[dict]:
    existing = (
        supabase.table("revision_folders")
        .select("*")
        .eq("pack_id", pack["id"])
        .order("orden")
        .execute()
    )
    rows = existing.data or []
    if rows:
        return rows
    defaults = default_folders_for(pack["ambito"])
    inserts = [
        {
            "pack_id": pack["id"],
            "nombre": nombre,
            "fase": fase,
            "orden": i,
        }
        for i, (fase, nombre) in enumerate(defaults)
    ]
    created = supabase.table("revision_folders").insert(inserts).execute()
    return created.data or []


def _pack_payload(supabase, pack: dict) -> dict:
    folders = _ensure_default_folders(supabase, pack)
    clips = (
        supabase.table("revision_clips")
        .select("*")
        .eq("pack_id", pack["id"])
        .order("created_at", desc=True)
        .execute()
    )
    clip_rows = clips.data or []
    clip_ids = [c["id"] for c in clip_rows]
    links = []
    if clip_ids:
        links_res = (
            supabase.table("revision_clip_links")
            .select("*")
            .in_("clip_id", clip_ids)
            .execute()
        )
        links = links_res.data or []
    return {
        **pack,
        "folders": folders,
        "clips": clip_rows,
        "links": links,
    }


# ============ PACKS ============

@router.post("/packs", status_code=201)
async def get_or_create_pack(
    data: PackGetOrCreate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_READ)),
):
    if data.ambito not in AMBITOS:
        raise HTTPException(status_code=400, detail=f"ambito inválido. Use: {AMBITOS}")
    if data.ambito == "partido_post" and not data.partido_id:
        raise HTTPException(status_code=400, detail="partido_id es requerido para informe de partido.")
    if data.ambito == "rival" and not data.rival_id:
        raise HTTPException(status_code=400, detail="rival_id es requerido para informe rival.")

    supabase = get_supabase()
    equipo_id = str(data.equipo_id)
    _verify_equipo(supabase, equipo_id)

    query = (
        supabase.table("revision_packs")
        .select("*")
        .eq("equipo_id", equipo_id)
        .eq("ambito", data.ambito)
    )
    if data.partido_id:
        query = query.eq("partido_id", str(data.partido_id))
    if data.rival_id:
        query = query.eq("rival_id", str(data.rival_id))
        if data.microciclo_id:
            query = query.eq("microciclo_id", str(data.microciclo_id))
        else:
            query = query.is_("microciclo_id", "null")

    existing = query.limit(1).execute()
    if existing.data:
        return _pack_payload(supabase, existing.data[0])

    row = {
        "equipo_id": equipo_id,
        "ambito": data.ambito,
        "partido_id": str(data.partido_id) if data.partido_id else None,
        "rival_id": str(data.rival_id) if data.rival_id else None,
        "microciclo_id": str(data.microciclo_id) if data.microciclo_id else None,
    }
    created = supabase.table("revision_packs").insert(row).execute()
    pack = created.data[0]
    return _pack_payload(supabase, pack)


@router.get("/packs/{pack_id}")
async def get_pack(
    pack_id: UUID,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_READ)),
):
    supabase = get_supabase()
    pack = _get_pack(supabase, str(pack_id), str(equipo_id))
    return _pack_payload(supabase, pack)


# ============ FOLDERS ============

@router.post("/folders", status_code=201)
async def create_folder(
    data: FolderCreate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    supabase = get_supabase()
    pack = _get_pack(supabase, str(data.pack_id))
    nombre = (data.nombre or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre de la carpeta es obligatorio.")

    siblings = (
        supabase.table("revision_folders")
        .select("orden")
        .eq("pack_id", pack["id"])
        .execute()
    )
    orders = [r.get("orden") or 0 for r in (siblings.data or [])]
    max_orden = max(orders) if orders else -1
    row = {
        "pack_id": pack["id"],
        "parent_id": str(data.parent_id) if data.parent_id else None,
        "nombre": nombre,
        "fase": data.fase,
        "orden": data.orden if data.orden is not None else max_orden + 1,
    }
    created = supabase.table("revision_folders").insert(row).execute()
    return created.data[0]


@router.patch("/folders/{folder_id}")
async def update_folder(
    folder_id: UUID,
    data: FolderUpdate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    supabase = get_supabase()
    existing = supabase.table("revision_folders").select("id").eq("id", str(folder_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Carpeta no encontrada.")
    updates = data.model_dump(exclude_none=True)
    if "parent_id" in updates and updates["parent_id"] is not None:
        updates["parent_id"] = str(updates["parent_id"])
    if not updates:
        raise HTTPException(status_code=400, detail="Nada que actualizar.")
    if updates.get("nombre") is not None:
        updates["nombre"] = updates["nombre"].strip()
        if not updates["nombre"]:
            raise HTTPException(status_code=400, detail="El nombre no puede estar vacío.")
    updates["updated_at"] = _now()
    result = supabase.table("revision_folders").update(updates).eq("id", str(folder_id)).execute()
    return result.data[0]


@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    supabase = get_supabase()
    existing = supabase.table("revision_folders").select("id").eq("id", str(folder_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Carpeta no encontrada.")
    supabase.table("revision_folders").delete().eq("id", str(folder_id)).execute()
    return {"status": "deleted"}


# ============ CLIPS ============

@router.post("/clips/upload", status_code=201)
async def upload_clip(
    pack_id: str = Form(...),
    equipo_id: str = Form(...),
    titulo: str = Form(...),
    frase: str = Form(None),
    folder_id: str = Form(None),
    fase: str = Form(None),
    duration_ms: int = Form(None),
    start_ms: int = Form(None),
    end_ms: int = Form(None),
    source_video_id: str = Form(None),
    rival_jugador_nombre: str = Form(None),
    rival_jugador_dorsal: str = Form(None),
    jugador_id: str = Form(None),
    slot_tipo: str = Form("folder"),
    file: UploadFile = File(...),
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    """Sube un recorte corto (no el partido entero). Máx 200MB."""
    if not file.content_type or not (
        file.content_type.startswith("video/") or file.content_type in ("application/octet-stream",)
    ):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos de video.")

    supabase = get_supabase()
    _verify_equipo(supabase, equipo_id)
    pack = _get_pack(supabase, pack_id, equipo_id)

    chunks: list[bytes] = []
    size = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        size += len(chunk)
        if size > MAX_CLIP_BYTES:
            raise HTTPException(status_code=400, detail="El recorte no puede superar 200MB.")
        chunks.append(chunk)
    content = b"".join(chunks)
    if size < 1000:
        raise HTTPException(status_code=400, detail="El archivo está vacío o es demasiado pequeño.")

    ensure_video_bucket(supabase)
    timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in (file.filename or "clip.webm"))
    storage_path = f"{equipo_id}/{pack_id}/{timestamp}_{safe_name}"
    mime = file.content_type if file.content_type.startswith("video/") else "video/webm"

    try:
        supabase.storage.from_(REVISION_BUCKET).upload(
            storage_path,
            content,
            file_options={"content-type": mime, "upsert": "true"},
        )
        public_url = supabase.storage.from_(REVISION_BUCKET).get_public_url(storage_path)
    except Exception as e:
        logger.error("Error uploading revision clip: %s", e)
        raise HTTPException(status_code=500, detail="Error al subir el recorte.")

    row = {
        "pack_id": pack_id,
        "equipo_id": equipo_id,
        "titulo": titulo.strip() or "Clip",
        "frase": (frase or "").strip() or None,
        "url": public_url,
        "storage_path": storage_path,
        "mime_type": mime,
        "size_bytes": size,
        "duration_ms": duration_ms,
        "fase": fase,
        "jugador_id": jugador_id or None,
        "rival_jugador_nombre": rival_jugador_nombre,
        "rival_jugador_dorsal": rival_jugador_dorsal,
        "source_video_id": source_video_id or None,
        "start_ms": start_ms,
        "end_ms": end_ms,
        "hot_until": hot_until_from().isoformat(),
        "status": "hot",
        "created_by": auth.user_id,
    }
    created = supabase.table("revision_clips").insert(row).execute()
    clip = created.data[0]

    if folder_id or slot_tipo == "once_jugador":
        link = {
            "clip_id": clip["id"],
            "folder_id": folder_id or None,
            "slot_tipo": slot_tipo if slot_tipo in ("folder", "once_jugador") else "folder",
            "jugador_id": jugador_id or None,
            "rival_jugador_nombre": rival_jugador_nombre,
            "rival_jugador_dorsal": rival_jugador_dorsal,
        }
        supabase.table("revision_clip_links").insert(link).execute()

    return clip


@router.patch("/clips/{clip_id}")
async def update_clip(
    clip_id: UUID,
    data: ClipUpdate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    supabase = get_supabase()
    existing = supabase.table("revision_clips").select("id").eq("id", str(clip_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Clip no encontrado.")
    updates = data.model_dump(exclude_none=True)
    if "jugador_id" in updates and updates["jugador_id"] is not None:
        updates["jugador_id"] = str(updates["jugador_id"])
    if not updates:
        raise HTTPException(status_code=400, detail="Nada que actualizar.")
    updates["updated_at"] = _now()
    result = supabase.table("revision_clips").update(updates).eq("id", str(clip_id)).execute()
    return result.data[0]


@router.delete("/clips/{clip_id}")
async def delete_clip(
    clip_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    supabase = get_supabase()
    existing = (
        supabase.table("revision_clips")
        .select("id, storage_path")
        .eq("id", str(clip_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Clip no encontrado.")
    clip = existing.data[0]
    if clip.get("storage_path"):
        try:
            supabase.storage.from_(REVISION_BUCKET).remove([clip["storage_path"]])
        except Exception as e:
            logger.warning("Could not delete revision clip from storage: %s", e)
    supabase.table("revision_clips").delete().eq("id", str(clip_id)).execute()
    return {"status": "deleted"}


@router.post("/clips/{clip_id}/links", status_code=201)
async def add_clip_link(
    clip_id: UUID,
    data: ClipLinkCreate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    supabase = get_supabase()
    existing = supabase.table("revision_clips").select("id").eq("id", str(clip_id)).limit(1).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Clip no encontrado.")
    if data.slot_tipo not in ("folder", "once_jugador"):
        raise HTTPException(status_code=400, detail="slot_tipo inválido.")
    row = {
        "clip_id": str(clip_id),
        "folder_id": str(data.folder_id) if data.folder_id else None,
        "slot_tipo": data.slot_tipo,
        "jugador_id": str(data.jugador_id) if data.jugador_id else None,
        "rival_jugador_nombre": data.rival_jugador_nombre,
        "rival_jugador_dorsal": data.rival_jugador_dorsal,
    }
    created = supabase.table("revision_clip_links").insert(row).execute()
    return created.data[0]


@router.delete("/clip-links/{link_id}")
async def delete_clip_link(
    link_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    supabase = get_supabase()
    supabase.table("revision_clip_links").delete().eq("id", str(link_id)).execute()
    return {"status": "deleted"}


# ============ SALA ============

@router.post("/sessions", status_code=201)
async def create_session(
    data: SessionCreate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_READ)),
):
    supabase = get_supabase()
    _verify_equipo(supabase, str(data.equipo_id))
    _get_pack(supabase, str(data.pack_id), str(data.equipo_id))

    code = generate_session_code()
    for _ in range(6):
        clash = supabase.table("revision_sessions").select("id").eq("code", code).limit(1).execute()
        if not clash.data:
            break
        code = generate_session_code()

    row = {
        "equipo_id": str(data.equipo_id),
        "pack_id": str(data.pack_id),
        "code": code,
        "host_user_id": auth.user_id,
        "current_clip_id": str(data.clip_id) if data.clip_id else None,
        "paused": True,
        "current_time_ms": 0,
        "overlay_json": [],
    }
    created = supabase.table("revision_sessions").insert(row).execute()
    return created.data[0]


@router.get("/sessions/by-code/{code}")
async def get_session_by_code(
    code: str,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_READ)),
):
    supabase = get_supabase()
    result = (
        supabase.table("revision_sessions")
        .select("*")
        .eq("code", code.upper().strip())
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada. Revisa el código.")
    session = result.data[0]
    pack = _pack_payload(supabase, _get_pack(supabase, session["pack_id"]))
    current_clip = None
    if session.get("current_clip_id"):
        clip = (
            supabase.table("revision_clips")
            .select("*")
            .eq("id", session["current_clip_id"])
            .limit(1)
            .execute()
        )
        current_clip = (clip.data or [None])[0]
    return {**session, "pack": pack, "current_clip": current_clip}


@router.patch("/sessions/{code}")
async def update_session_state(
    code: str,
    data: SessionStateUpdate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_READ)),
):
    supabase = get_supabase()
    existing = (
        supabase.table("revision_sessions")
        .select("id")
        .eq("code", code.upper().strip())
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Sala no encontrada.")
    updates = data.model_dump(exclude_none=True)
    if "current_clip_id" in updates and updates["current_clip_id"] is not None:
        updates["current_clip_id"] = str(updates["current_clip_id"])
    if not updates:
        raise HTTPException(status_code=400, detail="Nada que actualizar.")
    updates["updated_at"] = _now()
    result = (
        supabase.table("revision_sessions")
        .update(updates)
        .eq("code", code.upper().strip())
        .execute()
    )
    return result.data[0]


# ============ CRON ============

@router.post("/cron/archive")
async def cron_archive_clips(request: Request):
    from app.config import get_settings

    settings = get_settings()
    cron_secret = request.headers.get("x-cron-secret")
    if cron_secret != settings.SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid cron secret")
    supabase = get_supabase()
    return archive_expired_clips(supabase)
