"""
Revisión de vídeo — packs, carpetas por fase, retención 30 días en R2.
El reloj es partido.fecha + 30 días (si no hay partido, created_at + 30).
"""

from __future__ import annotations

import logging
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

REVISION_BUCKET = "revision-clips"
MAX_CLIP_BYTES = 200 * 1024 * 1024  # 200 MB
MIN_CLIP_BYTES = 1000
HOT_DAYS = 30
WARN_DAYS = 7

# Fases canónicas (informe de partido / Video Análisis)
FOLDERS_PARTIDO = [
    ("ataque_organizado", "Ataque organizado"),
    ("defensa_organizada", "Defensa organizada"),
    ("transicion_defensa_ataque", "Transición defensa → ataque"),
    ("transicion_ataque_defensa", "Transición ataque → defensa"),
    ("balon_parado_ofensivo", "ABP ofensivo"),
    ("balon_parado_defensivo", "ABP defensivo"),
]

# Informe rival / plan (nombres del scout)
FOLDERS_RIVAL = [
    ("ataque_organizado", "Ataque organizado"),
    ("defensa_organizada", "Defensa organizada"),
    ("transicion_ofensiva", "Transición ofensiva"),
    ("transicion_defensiva", "Transición defensiva"),
    ("abp_ofensiva", "ABP ofensiva"),
    ("abp_defensiva", "ABP defensiva"),
    ("once_probable", "Once probable"),
]


def make_fingerprint(filename: str, size_bytes: Optional[int], duration_ms: Optional[int]) -> str:
    """Huella del fichero local: nombre + tamaño + duración."""
    name = (filename or "local_video").strip() or "local_video"
    return f"{name}|{int(size_bytes or 0)}|{int(duration_ms or 0)}"


def generate_session_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    # Evitar 0/O y 1/I
    alphabet = alphabet.replace("0", "").replace("O", "").replace("1", "").replace("I", "")
    return "".join(secrets.choice(alphabet) for _ in range(length))


def default_folders_for(ambito: str) -> list[tuple[str, str]]:
    if ambito in ("rival", "partido_plan"):
        return list(FOLDERS_RIVAL)
    return list(FOLDERS_PARTIDO)


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def pack_expires_at(
    partido_fecha: Optional[datetime],
    created_at: Optional[datetime] = None,
    now: Optional[datetime] = None,
) -> datetime:
    """Caduca 30 días después del partido jugado; si no hay partido, 30 días desde el alta."""
    now = now or datetime.now(timezone.utc)
    if partido_fecha is not None:
        return _aware(partido_fecha) + timedelta(days=HOT_DAYS)
    base = created_at or now
    return _aware(base) + timedelta(days=HOT_DAYS)


def days_until(expires: datetime, now: Optional[datetime] = None) -> int:
    now = now or datetime.now(timezone.utc)
    return (expires.date() - now.date()).days


def hot_until_from(
    now: Optional[datetime] = None,
    partido_fecha: Optional[datetime] = None,
    created_at: Optional[datetime] = None,
) -> datetime:
    return pack_expires_at(partido_fecha, created_at, now)


def should_keep_hot(
    partido_fecha: Optional[datetime],
    now: Optional[datetime] = None,
) -> bool:
    """No archivar si el partido asociado todavía no se ha jugado."""
    now = now or datetime.now(timezone.utc)
    if partido_fecha is None:
        return False
    return _aware(partido_fecha).date() >= now.date()


def parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def drive_connected(org_config: Optional[dict]) -> bool:
    if not org_config:
        return False
    drive = org_config.get("google_drive") or {}
    if isinstance(drive, dict) and drive.get("connected"):
        return True
    return False


def drive_folder_url(org_config: Optional[dict]) -> Optional[str]:
    if not org_config:
        return None
    drive = org_config.get("google_drive") or {}
    if not isinstance(drive, dict):
        return None
    url = (drive.get("folder_url") or "").strip()
    return url or None


def drive_ready(org_config: Optional[dict]) -> bool:
    return drive_connected(org_config) and bool(drive_folder_url(org_config))


def org_config_for_equipo(supabase, equipo_id: Optional[str]) -> dict:
    if not equipo_id:
        return {}
    eq = (
        supabase.table("equipos")
        .select("organizacion_id")
        .eq("id", equipo_id)
        .limit(1)
        .execute()
    )
    if not eq.data:
        return {}
    org_id = eq.data[0].get("organizacion_id")
    if not org_id:
        return {}
    org = (
        supabase.table("organizaciones")
        .select("config")
        .eq("id", org_id)
        .limit(1)
        .execute()
    )
    if not org.data:
        return {}
    return org.data[0].get("config") or {}


def partido_fecha_for_pack(supabase, pack: Optional[dict]) -> Optional[datetime]:
    if not pack or not pack.get("partido_id"):
        return None
    partido = (
        supabase.table("partidos")
        .select("fecha")
        .eq("id", pack["partido_id"])
        .limit(1)
        .execute()
    )
    if not partido.data:
        return None
    return parse_iso(partido.data[0].get("fecha"))


def earliest_clip_created(clips: list[dict]) -> Optional[datetime]:
    dates = [parse_iso(c.get("created_at")) for c in clips]
    dates = [d for d in dates if d]
    return min(dates) if dates else None


def pack_retention_payload(
    supabase,
    pack: dict,
    clips: list[dict],
    now: Optional[datetime] = None,
) -> dict:
    now = now or datetime.now(timezone.utc)
    partido_fecha = partido_fecha_for_pack(supabase, pack)
    created = parse_iso(pack.get("created_at")) or earliest_clip_created(clips)
    expires = pack_expires_at(partido_fecha, created, now)
    pending = should_keep_hot(partido_fecha, now)
    left = days_until(expires, now)
    org_config = org_config_for_equipo(supabase, pack.get("equipo_id"))
    hot_count = sum(1 for c in clips if (c.get("status") or "hot") == "hot")
    return {
        "expires_at": expires.isoformat(),
        "days_left": left,
        "pending_match": pending,
        "warn": (not pending) and hot_count > 0 and left <= WARN_DAYS,
        "hot_count": hot_count,
        "drive_connected": drive_ready(org_config),
        "drive_folder_url": drive_folder_url(org_config),
    }


def delete_clip_storage(supabase, storage_path: Optional[str]) -> None:
    if not storage_path:
        return
    from app.services.r2_storage import delete_object, r2_enabled

    if r2_enabled():
        try:
            delete_object(storage_path)
        except Exception as exc:
            logger.warning("r2 delete %s: %s", storage_path, exc)
    try:
        supabase.storage.from_(REVISION_BUCKET).remove([storage_path])
    except Exception as exc:
        logger.warning("storage remove %s: %s", storage_path, exc)


def purge_hot_clips(supabase, clips: list[dict]) -> int:
    deleted = 0
    for clip in clips:
        try:
            delete_clip_storage(supabase, clip.get("storage_path"))
            supabase.table("revision_clips").delete().eq("id", clip["id"]).execute()
            deleted += 1
        except Exception as exc:
            logger.exception("Error borrando clip %s: %s", clip.get("id"), exc)
    return deleted


def _warn_pack_staff(equipo_id: str, pack_id: str, expires: datetime, days_left: int) -> None:
    try:
        from app.services.notification_service import notify_team_staff

        fecha = expires.date().isoformat()
        notify_team_staff(
            equipo_id=equipo_id,
            tipo="revision_caduca",
            titulo="Los recortes de este partido se borran pronto",
            contenido=(
                f"El {fecha} (en {days_left} días) desaparecen de la app y de Cloudflare. "
                "En Revisión puedes descargar la carpeta entera o abrir Drive y luego borrar todo junto."
            ),
            entidad_tipo="revision_pack",
            entidad_id=pack_id,
            prioridad="alta",
        )
    except Exception as exc:
        logger.warning("revision warn notify pack=%s: %s", pack_id, exc)


def archive_expired_clips(supabase, now: Optional[datetime] = None) -> dict:
    """
    Carpeta completa: aviso 7 días antes y borrado en R2/Storage/DB a los 30 días
    del partido (o del alta si no hay partido). No es clip a clip.
    """
    now = now or datetime.now(timezone.utc)
    now_iso = now.isoformat()

    result = (
        supabase.table("revision_clips")
        .select("id, equipo_id, storage_path, hot_until, status, pack_id, archive_warning, created_at")
        .eq("status", "hot")
        .execute()
    )
    clips = result.data or []
    by_pack: dict[str, list[dict]] = {}
    for clip in clips:
        pack_id = clip.get("pack_id")
        if pack_id:
            by_pack.setdefault(pack_id, []).append(clip)

    skipped_future = 0
    archived = 0
    warned = 0
    packs_purged = 0
    packs_warned = 0
    errors = 0

    for pack_id, pack_clips in by_pack.items():
        try:
            pack = (
                supabase.table("revision_packs")
                .select("id, partido_id, equipo_id, created_at")
                .eq("id", pack_id)
                .limit(1)
                .execute()
            )
            pack_row = (pack.data or [None])[0]
            if not pack_row:
                continue
            partido_fecha = partido_fecha_for_pack(supabase, pack_row)
            created = parse_iso(pack_row.get("created_at")) or earliest_clip_created(pack_clips)
            expires = pack_expires_at(partido_fecha, created, now)

            if should_keep_hot(partido_fecha, now):
                extend_until = expires.isoformat()
                for clip in pack_clips:
                    supabase.table("revision_clips").update({
                        "hot_until": extend_until,
                        "archive_warning": None,
                        "updated_at": now_iso,
                    }).eq("id", clip["id"]).execute()
                skipped_future += len(pack_clips)
                continue

            if now >= expires:
                archived += purge_hot_clips(supabase, pack_clips)
                packs_purged += 1
                continue

            left = days_until(expires, now)
            if left <= WARN_DAYS:
                warning = (
                    f"Esta carpeta se borra de la app y de Cloudflare el {expires.date().isoformat()} "
                    f"({left} días). Descárgala o súbela a Drive; no se guarda recorte a recorte."
                )
                already = all(bool(c.get("archive_warning")) for c in pack_clips)
                for clip in pack_clips:
                    supabase.table("revision_clips").update({
                        "hot_until": expires.isoformat(),
                        "archive_warning": warning,
                        "updated_at": now_iso,
                    }).eq("id", clip["id"]).execute()
                warned += len(pack_clips)
                if not already:
                    _warn_pack_staff(pack_row.get("equipo_id") or pack_clips[0].get("equipo_id"), pack_id, expires, left)
                    packs_warned += 1
        except Exception as exc:
            logger.exception("Error archivando pack %s: %s", pack_id, exc)
            errors += 1

    return {
        "scanned": len(clips),
        "archived": archived,
        "skipped_future_match": skipped_future,
        "warned": warned,
        "packs_purged": packs_purged,
        "packs_warned": packs_warned,
        "errors": errors,
    }


def sanitize_clip_filename(filename: str | None) -> str:
    base = "".join(c if c.isalnum() or c in "._-" else "_" for c in (filename or "clip.webm"))
    base = base.strip("._") or "clip.webm"
    if "." not in base:
        base += ".webm"
    return base[:120]


def make_clip_storage_path(
    equipo_id: str,
    pack_id: str,
    filename: str | None,
    now_ms: int | None = None,
) -> str:
    ts = now_ms if now_ms is not None else int(datetime.now(timezone.utc).timestamp() * 1000)
    return f"{equipo_id}/{pack_id}/{ts}_{sanitize_clip_filename(filename)}"


def strip_bucket_prefix(path: str, bucket: str = REVISION_BUCKET) -> str:
    cleaned = (path or "").lstrip("/")
    prefix = f"{bucket}/"
    if cleaned.startswith(prefix):
        return cleaned[len(prefix) :]
    return cleaned


def is_allowed_clip_path(path: str, equipo_id: str, pack_id: str) -> bool:
    if not path or ".." in path or path.startswith("/") or "\\" in path:
        return False
    return path.startswith(f"{equipo_id}/{pack_id}/")


def flatten_pack_graph(row: dict) -> dict:
    """Separa folders/clips/links de un select anidado de PostgREST."""
    pack = dict(row)
    folders = list(pack.pop("revision_folders", None) or [])
    clips_raw = list(pack.pop("revision_clips", None) or [])
    links: list[dict] = []
    clips: list[dict] = []
    for clip_row in clips_raw:
        clip = dict(clip_row)
        nested = clip.pop("revision_clip_links", None) or []
        links.extend(nested)
        clips.append(clip)
    folders.sort(key=lambda f: (f.get("orden") is None, f.get("orden") or 0))
    clips.sort(key=lambda c: c.get("created_at") or "", reverse=True)
    pack["folders"] = folders
    pack["clips"] = clips
    pack["links"] = links
    return pack


def mime_from_filename(filename: str | None) -> str:
    name = (filename or "").lower()
    if name.endswith(".mp4"):
        return "video/mp4"
    if name.endswith(".webm"):
        return "video/webm"
    if name.endswith(".mov"):
        return "video/quicktime"
    if name.endswith(".mkv"):
        return "video/x-matroska"
    return "video/webm"


def normalize_clip_mime(mime: str | None, filename: str | None = None) -> str:
    value = (mime or "").split(";")[0].strip().lower()
    if not value or value == "application/octet-stream":
        return mime_from_filename(filename)
    if value.startswith("video/"):
        return value
    raise ValueError("Solo se permiten archivos de video.")


def normalize_signed_upload_url(
    raw: dict,
    supabase_url: str,
    storage_path: str,
    bucket: str = REVISION_BUCKET,
) -> dict:
    """Normaliza la respuesta de create_signed_upload_url (claves y URL absoluta)."""
    token = str(raw.get("token") or "")
    signed = str(
        raw.get("signed_url")
        or raw.get("signedUrl")
        or raw.get("signedURL")
        or raw.get("url")
        or ""
    )
    path = strip_bucket_prefix(str(raw.get("path") or storage_path), bucket)
    base = supabase_url.rstrip("/")
    if signed and not signed.startswith("http"):
        if not signed.startswith("/"):
            signed = "/" + signed
        if signed.startswith("/storage/v1/"):
            signed = base + signed
        else:
            signed = base + "/storage/v1" + signed
    if token and signed and "token=" not in signed:
        signed = f"{signed}{'&' if '?' in signed else '?'}token={token}"
    return {"signed_url": signed, "token": token, "path": path}


def bucket_file_size_limit(bucket) -> int:
    if bucket is None:
        return 0
    if isinstance(bucket, dict):
        return int(bucket.get("file_size_limit") or 0)
    return int(getattr(bucket, "file_size_limit", 0) or 0)


def ensure_video_bucket(supabase, bucket: str = REVISION_BUCKET) -> None:
    """Crea el bucket o sube su tope a 200MB (el default de Storage es 50MB)."""
    options = {"public": True, "file_size_limit": MAX_CLIP_BYTES}
    try:
        existing = supabase.storage.get_bucket(bucket)
    except Exception:
        existing = None

    if existing is None:
        try:
            supabase.storage.create_bucket(bucket, options=options)
        except Exception as exc:
            logger.warning("could not create %s bucket: %s", bucket, exc)
        return

    if bucket_file_size_limit(existing) >= MAX_CLIP_BYTES:
        return
    try:
        supabase.storage.update_bucket(bucket, options)
    except Exception as exc:
        logger.warning("could not raise %s file size limit to %s: %s", bucket, MAX_CLIP_BYTES, exc)
