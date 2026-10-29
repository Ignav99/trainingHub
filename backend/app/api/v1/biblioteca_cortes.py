"""Biblioteca permanente de cortes de vídeo."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.database import get_supabase
from app.security.dependencies import AuthContext, require_permission
from app.security.permissions import Permission
from app.services.biblioteca_cortes import (
    catalog_fase,
    clean_search,
    fase_aliases,
    download_filename,
    corte_id_from_path,
    format_storage_bytes,
    is_allowed_biblioteca_path,
    extension_for,
    make_biblioteca_storage_path,
    minute_ok,
    resolve_clip_fase,
    split_fase,
)
from app.services.revision_service import (
    MAX_CLIP_BYTES,
    MIN_CLIP_BYTES,
    REVISION_BUCKET,
    ensure_video_bucket,
    make_clip_storage_path,
    normalize_clip_mime,
    normalize_signed_upload_url,
)
from app.services.r2_storage import copy_object, delete_object, public_url, r2_config_error, r2_enabled

logger = logging.getLogger(__name__)

router = APIRouter()


class UploadUrlBody(BaseModel):
    equipo_id: UUID
    filename: str
    size_bytes: int
    mime_type: str | None = None


class ConfirmBody(BaseModel):
    equipo_id: UUID
    corte_id: UUID
    storage_path: str
    titulo: str = Field(min_length=1, max_length=160)
    descripcion: str | None = None
    size_bytes: int
    mime_type: str | None = None
    partido_id: UUID | None = None
    partido_etiqueta: str | None = None
    minuto_inicio: int | None = None
    minuto_fin: int | None = None
    fase: str | None = None
    subfase: str | None = None
    duration_ms: int | None = None
    start_ms: int | None = None
    end_ms: int | None = None
    source_video_id: UUID | None = None
    jugador_ids: list[UUID] = Field(default_factory=list)
    origen: str = "video"


class UpdateBody(BaseModel):
    titulo: str | None = Field(default=None, max_length=160)
    descripcion: str | None = None
    partido_id: UUID | None = None
    partido_etiqueta: str | None = None
    minuto_inicio: int | None = None
    minuto_fin: int | None = None
    fase: str | None = None
    subfase: str | None = None
    jugador_ids: list[UUID] | None = None
    clear_partido: bool = False


class EnviarRevisionBody(BaseModel):
    pack_id: UUID
    folder_id: UUID
    frase: str | None = None


class DesdeRevisionBody(BaseModel):
    equipo_id: UUID
    clip_id: UUID


class DescargasBody(BaseModel):
    equipo_id: UUID
    ids: list[UUID] = Field(min_length=1, max_length=100)


def _verify_equipo(supabase, equipo_id: str) -> None:
    result = supabase.table("equipos").select("id").eq("id", equipo_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Equipo no encontrado.")


def _check_size(size: int) -> None:
    if size > MAX_CLIP_BYTES:
        raise HTTPException(status_code=400, detail="El recorte no puede superar 200MB.")
    if size < MIN_CLIP_BYTES:
        raise HTTPException(status_code=400, detail="El archivo está vacío o es demasiado pequeño.")


def _check_minutes(inicio: int | None, fin: int | None) -> None:
    if not minute_ok(inicio) or not minute_ok(fin):
        raise HTTPException(status_code=400, detail="El minuto tiene que estar entre 0 y 130.")
    if inicio is not None and fin is not None and fin < inicio:
        raise HTTPException(status_code=400, detail="El minuto final es anterior al inicial.")


def _public(storage_path: str, supabase) -> str:
    if r2_enabled():
        return public_url(storage_path)
    return supabase.storage.from_(REVISION_BUCKET).get_public_url(storage_path)


def _copy_storage(supabase, src: str, dest: str, mime: str) -> None:
    if r2_enabled():
        err = r2_config_error()
        if err:
            raise HTTPException(status_code=400, detail=err)
        try:
            copy_object(src, dest)
        except Exception as exc:
            logger.error("biblioteca copy %s -> %s: %s", src, dest, exc)
            raise HTTPException(status_code=500, detail="No se pudo copiar el vídeo en Cloudflare.") from exc
        return
    try:
        data = supabase.storage.from_(REVISION_BUCKET).download(src)
        supabase.storage.from_(REVISION_BUCKET).upload(
            dest,
            data,
            {"content-type": mime, "upsert": "true"},
        )
    except Exception as exc:
        logger.error("biblioteca storage copy %s -> %s: %s", src, dest, exc)
        raise HTTPException(status_code=500, detail="No se pudo copiar el vídeo.") from exc


def _load_jugadores(supabase, equipo_id: str, corte_ids: list[str]) -> dict[str, list[dict]]:
    if not corte_ids:
        return {}
    links = (
        supabase.table("biblioteca_corte_jugadores")
        .select("corte_id, jugador_id")
        .in_("corte_id", corte_ids)
        .execute()
    )
    rows = links.data or []
    jug_ids = list({r["jugador_id"] for r in rows if r.get("jugador_id")})
    people: dict[str, dict] = {}
    if jug_ids:
        found = (
            supabase.table("jugadores")
            .select("id, nombre, apellidos, dorsal")
            .eq("equipo_id", equipo_id)
            .in_("id", jug_ids)
            .execute()
        )
        people = {p["id"]: p for p in (found.data or [])}
    grouped: dict[str, list[dict]] = {}
    for row in rows:
        person = people.get(row["jugador_id"])
        if not person:
            continue
        grouped.setdefault(row["corte_id"], []).append(person)
    return grouped


def _decorate(row: dict, jugadores: list[dict]) -> dict:
    out = dict(row)
    out["jugadores"] = jugadores
    out["size_label"] = format_storage_bytes(int(row.get("size_bytes") or 0))
    return out


def _get_corte(supabase, corte_id: str, equipo_id: str) -> dict:
    result = (
        supabase.table("biblioteca_cortes")
        .select("*")
        .eq("id", corte_id)
        .eq("equipo_id", equipo_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Ese corte no está en la biblioteca.")
    return result.data[0]


def _replace_jugadores(supabase, equipo_id: str, corte_id: str, jugador_ids: list[str]) -> None:
    unique = list(dict.fromkeys(jugador_ids))
    if unique:
        found = (
            supabase.table("jugadores")
            .select("id")
            .eq("equipo_id", equipo_id)
            .in_("id", unique)
            .execute()
        )
        if len(found.data or []) != len(unique):
            raise HTTPException(status_code=400, detail="Alguno de los jugadores no es de este equipo.")
    supabase.table("biblioteca_corte_jugadores").delete().eq("corte_id", corte_id).execute()
    if unique:
        supabase.table("biblioteca_corte_jugadores").insert(
            [{"corte_id": corte_id, "jugador_id": jug} for jug in unique]
        ).execute()


def _fase_del_recorte(supabase, clip: dict) -> str | None:
    """Fase guardada en el recorte o, si no hay, la de su carpeta (y la carpeta padre)."""
    folder_fases: list[str | None] = []
    links = (
        supabase.table("revision_clip_links")
        .select("folder_id")
        .eq("clip_id", clip["id"])
        .eq("slot_tipo", "folder")
        .execute()
    )
    folder_ids = [row["folder_id"] for row in (links.data or []) if row.get("folder_id")]
    if folder_ids:
        folders = (
            supabase.table("revision_folders")
            .select("id, fase, parent_id")
            .in_("id", folder_ids)
            .execute()
        )
        by_id = {row["id"]: row for row in (folders.data or [])}
        pending = [row.get("parent_id") for row in by_id.values() if row.get("parent_id") and row.get("parent_id") not in by_id]
        if pending:
            parents = (
                supabase.table("revision_folders")
                .select("id, fase, parent_id")
                .in_("id", pending)
                .execute()
            )
            for row in parents.data or []:
                by_id[row["id"]] = row
        for folder_id in folder_ids:
            current = folder_id
            seen: set[str] = set()
            while current and current not in seen:
                seen.add(current)
                folder = by_id.get(current) or {}
                if folder.get("fase"):
                    folder_fases.append(folder.get("fase"))
                current = folder.get("parent_id")
    return resolve_clip_fase(clip.get("fase"), folder_fases)


def _partido_etiqueta(supabase, partido_id: str | None) -> str | None:
    if not partido_id:
        return None
    found = (
        supabase.table("partidos")
        .select("fecha, rival_id")
        .eq("id", partido_id)
        .limit(1)
        .execute()
    )
    partido = (found.data or [None])[0]
    if not partido:
        return None
    fecha = str(partido.get("fecha") or "")[:10]
    nombre = ""
    if partido.get("rival_id"):
        rival = (
            supabase.table("rivales")
            .select("nombre")
            .eq("id", partido["rival_id"])
            .limit(1)
            .execute()
        )
        nombre = ((rival.data or [None])[0] or {}).get("nombre") or ""
    label = f"{fecha} · {nombre}".strip(" ·")
    return label or None


def _text(value: str | None, limit: int) -> str | None:
    text = (value or "").strip()
    if not text:
        return None
    return text[:limit]


@router.get("")
async def list_cortes(
    equipo_id: UUID,
    q: str | None = None,
    partido_id: UUID | None = None,
    fase: str | None = None,
    subfase: str | None = None,
    jugador_id: UUID | None = None,
    minuto_desde: int | None = None,
    minuto_hasta: int | None = None,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_READ)),
):
    del auth
    equipo = str(equipo_id)
    supabase = get_supabase()
    _verify_equipo(supabase, equipo)
    _check_minutes(minuto_desde, minuto_hasta)
    query = supabase.table("biblioteca_cortes").select("*").eq("equipo_id", equipo)
    if partido_id:
        query = query.eq("partido_id", str(partido_id))
    if fase:
        query = query.in_("fase", fase_aliases(fase))
    if subfase:
        query = query.eq("subfase", subfase)
    needle = clean_search(q)
    if needle:
        query = query.or_(f"titulo.ilike.%{needle}%,descripcion.ilike.%{needle}%,partido_etiqueta.ilike.%{needle}%")
    if minuto_desde is not None:
        query = query.gte("minuto_inicio", minuto_desde)
    if minuto_hasta is not None:
        query = query.lte("minuto_inicio", minuto_hasta)
    if jugador_id:
        links = (
            supabase.table("biblioteca_corte_jugadores")
            .select("corte_id")
            .eq("jugador_id", str(jugador_id))
            .execute()
        )
        ids = [row["corte_id"] for row in (links.data or [])]
        if not ids:
            return []
        query = query.in_("id", ids)
    result = query.order("created_at", desc=True).limit(300).execute()
    rows = result.data or []
    grouped = _load_jugadores(supabase, equipo, [row["id"] for row in rows])
    return [_decorate(row, grouped.get(row["id"], [])) for row in rows]


@router.get("/uso")
async def uso_biblioteca(
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_READ)),
):
    del auth
    equipo = str(equipo_id)
    supabase = get_supabase()
    _verify_equipo(supabase, equipo)
    result = (
        supabase.table("biblioteca_cortes")
        .select("size_bytes")
        .eq("equipo_id", equipo)
        .execute()
    )
    rows = result.data or []
    total = sum(int(row.get("size_bytes") or 0) for row in rows)
    return {
        "count": len(rows),
        "size_bytes": total,
        "size_label": format_storage_bytes(total),
        "limit_bytes": None,
    }


@router.post("/descargas")
async def descargas(
    data: DescargasBody,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_READ)),
):
    """URLs firmadas del archivo original de cada corte, para bajarlo sin recodificar."""
    del auth
    equipo = str(data.equipo_id)
    wanted = list(dict.fromkeys(str(i) for i in data.ids))
    supabase = get_supabase()
    _verify_equipo(supabase, equipo)
    found = (
        supabase.table("biblioteca_cortes")
        .select("id, titulo, partido_etiqueta, minuto_inicio, storage_path, mime_type, size_bytes, url")
        .eq("equipo_id", equipo)
        .in_("id", wanted)
        .execute()
    )
    by_id = {row["id"]: row for row in (found.data or [])}
    use_r2 = r2_enabled() and not r2_config_error()
    out = []
    for cid in wanted:
        row = by_id.get(cid)
        if not row:
            continue
        path = row.get("storage_path") or ""
        if path and not is_allowed_biblioteca_path(path, equipo):
            path = ""
        mime = row.get("mime_type") or "video/mp4"
        filename = download_filename(row.get("titulo"), row.get("minuto_inicio"), extension_for(path or None, mime))
        url = row.get("url")
        download_url = None
        if path and use_r2:
            from app.services.r2_storage import presign_get
            try:
                url = presign_get(path, 3600)
                download_url = presign_get(path, 3600, download_name=filename)
            except Exception as exc:
                logger.warning("biblioteca descarga %s: %s", cid, exc)
        if not url:
            continue
        out.append({
            "id": cid,
            "url": url,
            "download_url": download_url or url,
            "filename": filename,
            "mime_type": mime,
            "size_bytes": int(row.get("size_bytes") or 0),
        })
    return out


@router.post("/upload-url")
async def upload_url(
    data: UploadUrlBody,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    _check_size(data.size_bytes)
    try:
        mime = normalize_clip_mime(data.mime_type, data.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    equipo = str(data.equipo_id)
    supabase = get_supabase()
    _verify_equipo(supabase, equipo)
    corte_id = str(uuid4())
    storage_path = make_biblioteca_storage_path(equipo, corte_id, data.filename, mime)
    if r2_enabled():
        err = r2_config_error()
        if err:
            raise HTTPException(status_code=400, detail=err)
        from app.services.r2_storage import presign_put
        try:
            signed = presign_put(storage_path, mime)
        except Exception as exc:
            logger.error("biblioteca signed url: %s", exc)
            raise HTTPException(status_code=500, detail="No se pudo preparar la subida.") from exc
        return {"signed_url": signed, "path": storage_path, "corte_id": corte_id, "mime_type": mime, "storage": "r2"}
    from app.config import get_settings
    ensure_video_bucket(supabase)
    try:
        raw = supabase.storage.from_(REVISION_BUCKET).create_signed_upload_url(storage_path)
    except Exception as exc:
        logger.error("biblioteca signed url: %s", exc)
        raise HTTPException(status_code=500, detail="No se pudo preparar la subida.") from exc
    if hasattr(raw, "model_dump"):
        raw = raw.model_dump()
    elif hasattr(raw, "dict") and not isinstance(raw, dict):
        raw = raw.dict()
    payload = normalize_signed_upload_url(raw if isinstance(raw, dict) else {}, get_settings().SUPABASE_URL, storage_path)
    if not payload.get("signed_url"):
        raise HTTPException(status_code=500, detail="No se pudo preparar la subida.")
    return {**payload, "corte_id": corte_id, "mime_type": mime}


@router.post("/confirm", status_code=201)
async def confirm_upload(
    data: ConfirmBody,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    _check_size(data.size_bytes)
    _check_minutes(data.minuto_inicio, data.minuto_fin)
    equipo = str(data.equipo_id)
    corte_id = str(data.corte_id)
    if not is_allowed_biblioteca_path(data.storage_path, equipo):
        raise HTTPException(status_code=400, detail="Ruta de almacenamiento no válida.")
    if corte_id_from_path(data.storage_path) != corte_id:
        raise HTTPException(status_code=400, detail="El corte no coincide con el archivo subido.")
    try:
        mime = normalize_clip_mime(data.mime_type, data.storage_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    supabase = get_supabase()
    _verify_equipo(supabase, equipo)
    row = {
        "id": corte_id,
        "equipo_id": equipo,
        "titulo": data.titulo.strip()[:160],
        "descripcion": _text(data.descripcion, 2000),
        "partido_id": str(data.partido_id) if data.partido_id else None,
        "partido_etiqueta": _text(data.partido_etiqueta, 160),
        "minuto_inicio": data.minuto_inicio,
        "minuto_fin": data.minuto_fin,
        "fase": _text(catalog_fase(data.fase), 80),
        "subfase": _text(data.subfase, 80),
        "url": _public(data.storage_path, supabase),
        "storage_path": data.storage_path,
        "mime_type": mime,
        "size_bytes": data.size_bytes,
        "duration_ms": data.duration_ms,
        "source_video_id": str(data.source_video_id) if data.source_video_id else None,
        "start_ms": data.start_ms,
        "end_ms": data.end_ms,
        "origen": data.origen if data.origen in ("video", "revision", "manual") else "video",
        "created_by": auth.user_id,
    }
    created = supabase.table("biblioteca_cortes").insert(row).execute()
    corte = created.data[0]
    _replace_jugadores(supabase, equipo, corte_id, [str(j) for j in data.jugador_ids])
    grouped = _load_jugadores(supabase, equipo, [corte_id])
    return _decorate(corte, grouped.get(corte_id, []))


@router.patch("/{corte_id}")
async def update_corte(
    corte_id: UUID,
    data: UpdateBody,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    del auth
    equipo = str(equipo_id)
    cid = str(corte_id)
    supabase = get_supabase()
    _verify_equipo(supabase, equipo)
    current = _get_corte(supabase, cid, equipo)
    inicio = data.minuto_inicio if data.minuto_inicio is not None else current.get("minuto_inicio")
    fin = data.minuto_fin if data.minuto_fin is not None else current.get("minuto_fin")
    _check_minutes(inicio, fin)
    patch: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.titulo is not None:
        title = data.titulo.strip()
        if not title:
            raise HTTPException(status_code=400, detail="El título no puede quedar vacío.")
        patch["titulo"] = title[:160]
    if data.descripcion is not None:
        patch["descripcion"] = _text(data.descripcion, 2000)
    if data.clear_partido:
        patch["partido_id"] = None
        patch["partido_etiqueta"] = None
    elif data.partido_id is not None:
        patch["partido_id"] = str(data.partido_id)
    if data.partido_etiqueta is not None and not data.clear_partido:
        patch["partido_etiqueta"] = _text(data.partido_etiqueta, 160)
    if data.minuto_inicio is not None:
        patch["minuto_inicio"] = data.minuto_inicio
    if data.minuto_fin is not None:
        patch["minuto_fin"] = data.minuto_fin
    if data.fase is not None:
        patch["fase"] = _text(catalog_fase(data.fase), 80)
    if data.subfase is not None:
        patch["subfase"] = _text(data.subfase, 80)
    updated = supabase.table("biblioteca_cortes").update(patch).eq("id", cid).execute()
    corte = (updated.data or [current])[0]
    if data.jugador_ids is not None:
        _replace_jugadores(supabase, equipo, cid, [str(j) for j in data.jugador_ids])
    grouped = _load_jugadores(supabase, equipo, [cid])
    return _decorate(corte, grouped.get(cid, []))


@router.delete("/{corte_id}")
async def delete_corte(
    corte_id: UUID,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    del auth
    equipo = str(equipo_id)
    cid = str(corte_id)
    supabase = get_supabase()
    _verify_equipo(supabase, equipo)
    corte = _get_corte(supabase, cid, equipo)
    path = corte.get("storage_path") or ""
    if path and not is_allowed_biblioteca_path(path, equipo):
        path = ""
    if r2_enabled() and path:
        delete_object(path)
    elif path:
        try:
            supabase.storage.from_(REVISION_BUCKET).remove([path])
        except Exception as exc:
            logger.warning("biblioteca remove %s: %s", path, exc)
    supabase.table("biblioteca_cortes").delete().eq("id", cid).execute()
    return {"ok": True}


@router.post("/desde-revision", status_code=201)
async def desde_revision(
    data: DesdeRevisionBody,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    equipo = str(data.equipo_id)
    clip_id = str(data.clip_id)
    supabase = get_supabase()
    _verify_equipo(supabase, equipo)
    existing = (
        supabase.table("biblioteca_cortes")
        .select("*")
        .eq("equipo_id", equipo)
        .eq("revision_clip_id", clip_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        row = existing.data[0]
        grouped = _load_jugadores(supabase, equipo, [row["id"]])
        return _decorate(row, grouped.get(row["id"], []))
    found = (
        supabase.table("revision_clips")
        .select("*")
        .eq("id", clip_id)
        .eq("equipo_id", equipo)
        .limit(1)
        .execute()
    )
    if not found.data:
        raise HTTPException(status_code=404, detail="Ese recorte no está en revisión.")
    clip = found.data[0]
    if clip.get("status") != "hot" or not clip.get("storage_path"):
        raise HTTPException(status_code=400, detail="Este recorte ya no está en Cloudflare. No se puede guardar.")
    pack = (
        supabase.table("revision_packs")
        .select("id, partido_id, ambito")
        .eq("id", clip["pack_id"])
        .limit(1)
        .execute()
    )
    pack_row = (pack.data or [None])[0] or {}
    corte_id = str(uuid4())
    mime = clip.get("mime_type") or "video/mp4"
    dest = make_biblioteca_storage_path(equipo, corte_id, None, mime)
    _copy_storage(supabase, clip["storage_path"], dest, mime)
    fase, subfase = split_fase(_fase_del_recorte(supabase, clip))
    partido_id = pack_row.get("partido_id")
    row = {
        "id": corte_id,
        "equipo_id": equipo,
        "titulo": (clip.get("titulo") or "Corte")[:160],
        "descripcion": _text(clip.get("frase") or clip.get("nota"), 2000),
        "partido_id": partido_id,
        "partido_etiqueta": _partido_etiqueta(supabase, partido_id),
        "minuto_inicio": int(clip["start_ms"] // 60000) if isinstance(clip.get("start_ms"), int) else None,
        "minuto_fin": int(clip["end_ms"] // 60000) if isinstance(clip.get("end_ms"), int) else None,
        "fase": fase,
        "subfase": subfase,
        "url": _public(dest, supabase),
        "storage_path": dest,
        "mime_type": mime,
        "size_bytes": clip.get("size_bytes") or 0,
        "duration_ms": clip.get("duration_ms"),
        "source_video_id": clip.get("source_video_id"),
        "start_ms": clip.get("start_ms"),
        "end_ms": clip.get("end_ms"),
        "origen": "revision",
        "revision_clip_id": clip_id,
        "created_by": auth.user_id,
    }
    created = supabase.table("biblioteca_cortes").insert(row).execute()
    corte = created.data[0]
    if clip.get("jugador_id"):
        _replace_jugadores(supabase, equipo, corte_id, [clip["jugador_id"]])
    grouped = _load_jugadores(supabase, equipo, [corte_id])
    return _decorate(corte, grouped.get(corte_id, []))


@router.post("/{corte_id}/enviar-revision", status_code=201)
async def enviar_revision(
    corte_id: UUID,
    data: EnviarRevisionBody,
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_UPLOAD)),
):
    from app.api.v1.revision import _get_pack, _insert_clip

    equipo = str(equipo_id)
    cid = str(corte_id)
    pack_id = str(data.pack_id)
    folder_id = str(data.folder_id)
    supabase = get_supabase()
    _verify_equipo(supabase, equipo)
    corte = _get_corte(supabase, cid, equipo)
    if not corte.get("storage_path"):
        raise HTTPException(status_code=400, detail="Este corte no tiene vídeo.")
    _get_pack(supabase, pack_id, equipo)
    folder = (
        supabase.table("revision_folders")
        .select("id, fase, pack_id")
        .eq("id", folder_id)
        .eq("pack_id", pack_id)
        .limit(1)
        .execute()
    )
    if not folder.data:
        raise HTTPException(status_code=404, detail="Esa carpeta no está en el informe.")
    mime = corte.get("mime_type") or "video/mp4"
    dest = make_clip_storage_path(
        equipo,
        pack_id,
        f"{corte.get('titulo') or 'corte'}.{extension_for(None, mime)}",
    )
    _copy_storage(supabase, corte["storage_path"], dest, mime)
    jugadores = _load_jugadores(supabase, equipo, [cid]).get(cid, [])
    jugador_id = jugadores[0]["id"] if jugadores else None
    return _insert_clip(
        supabase,
        pack_id=pack_id,
        equipo_id=equipo,
        titulo=corte.get("titulo") or "Corte",
        frase=_text(data.frase, 400) or _text(corte.get("descripcion"), 400),
        storage_path=dest,
        mime=mime,
        size=int(corte.get("size_bytes") or 0),
        duration_ms=corte.get("duration_ms"),
        start_ms=corte.get("start_ms"),
        end_ms=corte.get("end_ms"),
        source_video_id=corte.get("source_video_id"),
        rival_jugador_nombre=None,
        rival_jugador_dorsal=None,
        jugador_id=jugador_id,
        fase=folder.data[0].get("fase") or corte.get("fase"),
        folder_id=folder_id,
        slot_tipo="folder",
        created_by=auth.user_id,
    )
