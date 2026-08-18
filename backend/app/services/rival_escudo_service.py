"""
Download and persist RFAF team escudos for rivals.
Manual uploads share the same processing pipeline (white-bg removal + 256px PNG).
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

import httpx

from app.services.escudo_image_service import process_escudo_bytes, process_escudo_bytes_safe

logger = logging.getLogger(__name__)

LOGOS_BUCKET = "logos"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

# Legacy extensions that may exist from older uploads
_ESCUDO_EXTENSIONS = ("png", "jpg", "jpeg", "webp", "svg")


def _is_same_team(mi_equipo: str, team_name: str) -> bool:
    a = mi_equipo.lower().strip()
    b = team_name.lower().strip()
    if a == b:
        return True
    if len(a) >= 6 and len(b) >= 6 and (a in b or b in a):
        return True
    return False


def normalize_rfaf_escudo_url(src: str | None, rfaf_base: str = "https://www.rfaf.es") -> str | None:
    if not src or not str(src).strip():
        return None
    src = str(src).strip()
    if src.startswith("http://") or src.startswith("https://"):
        return src
    if src.startswith("/"):
        return rfaf_base + src
    return f"{rfaf_base}/{src.lstrip('/')}"


def build_escudo_lookup(comp: dict, actas: list[dict] | None = None) -> dict[str, str]:
    """Map lowercase team name → escudo URL from clasificación and actas."""
    lookup: dict[str, str] = {}

    for row in comp.get("clasificacion") or []:
        name = (row.get("equipo") or "").strip()
        url = normalize_rfaf_escudo_url(row.get("escudo_url"))
        if name and url:
            lookup[name.lower()] = url

    for acta in actas or []:
        local = (acta.get("local_nombre") or "").strip()
        visitante = (acta.get("visitante_nombre") or "").strip()
        local_url = normalize_rfaf_escudo_url(acta.get("local_escudo_url"))
        visitante_url = normalize_rfaf_escudo_url(acta.get("visitante_escudo_url"))
        if local and local_url:
            lookup[local.lower()] = local_url
        if visitante and visitante_url:
            lookup[visitante.lower()] = visitante_url

    return lookup


def _cache_bust(url: str) -> str:
    ts = int(datetime.now(timezone.utc).timestamp())
    base = re.sub(r"[?&]v=\d+", "", url).rstrip("?&")
    sep = "&" if "?" in base else "?"
    return f"{base}{sep}v={ts}"


def _remove_legacy_escudo_paths(supabase, storage_path: str) -> None:
    """Remove previous escudo.* variants for the same entity folder."""
    parts = storage_path.rsplit("/", 1)
    if len(parts) != 2:
        return
    folder, _ = parts
    paths = [f"{folder}/escudo.{ext}" for ext in _ESCUDO_EXTENSIONS]
    try:
        supabase.storage.from_(LOGOS_BUCKET).remove(paths)
    except Exception:
        pass


def upload_processed_escudo(
    supabase,
    storage_path: str,
    content: bytes,
    content_type: str | None,
    *,
    strict: bool = True,
) -> str:
    """
    Process image, upload PNG to logos bucket, return cache-busted public URL.
    storage_path should end with escudo.png (e.g. rivales/{org}/{id}/escudo.png).
    """
    if strict:
        processed = process_escudo_bytes(content, content_type)
        out_type = "image/png"
    else:
        processed, out_type = process_escudo_bytes_safe(content, content_type)

    if not storage_path.endswith(".png"):
        storage_path = storage_path.rsplit(".", 1)[0] + ".png"

    _remove_legacy_escudo_paths(supabase, storage_path)

    supabase.storage.from_(LOGOS_BUCKET).upload(
        storage_path,
        processed,
        file_options={"content-type": out_type, "upsert": "true"},
    )
    public_url = supabase.storage.from_(LOGOS_BUCKET).get_public_url(storage_path)
    return _cache_bust(public_url)


def upload_rival_escudo(
    supabase,
    organizacion_id: str,
    rival_id: str,
    content: bytes,
    content_type: str | None,
) -> str:
    """Process and store a rival escudo; updates nothing in DB."""
    path = f"rivales/{organizacion_id}/{rival_id}/escudo.png"
    return upload_processed_escudo(supabase, path, content, content_type, strict=True)


def upload_org_logo(
    supabase,
    organizacion_id: str,
    content: bytes,
    content_type: str | None,
) -> str:
    """Process and store organization logo/escudo."""
    path = f"organizaciones/{organizacion_id}/logo.png"
    return upload_processed_escudo(supabase, path, content, content_type, strict=True)


def _guess_content_type(url: str, headers_ct: str | None) -> str:
    if headers_ct:
        return headers_ct.split(";")[0].strip()
    lower = url.lower()
    if lower.endswith(".jpg") or lower.endswith(".jpeg"):
        return "image/jpeg"
    if lower.endswith(".webp"):
        return "image/webp"
    return "image/png"


def _download_escudo_bytes(url: str) -> tuple[bytes, str] | None:
    """Download escudo image bytes from RFAF, Supabase, or any public URL."""
    normalized = normalize_rfaf_escudo_url(url) or url
    if not normalized:
        return None

    try:
        if "rfaf.es" in normalized:
            from app.services.rfaf_http_transport import fetch_rfaf_bytes

            content = fetch_rfaf_bytes(normalized)
            if len(content) < 50:
                return None
            return content, _guess_content_type(normalized, None)

        with httpx.Client(timeout=20.0, http2=False, follow_redirects=True) as client:
            response = client.get(normalized, headers={"User-Agent": USER_AGENT})
            response.raise_for_status()
            content = response.content
            if len(content) < 50:
                return None
            ct = _guess_content_type(normalized, response.headers.get("content-type"))
            return content, ct
    except Exception as exc:
        logger.warning("Could not download escudo %s: %s", normalized, exc)
        return None


def _rival_matches_name(rival: dict, team_name: str) -> bool:
    team_lower = team_name.lower().strip()
    for key in ("nombre", "rfef_nombre"):
        val = (rival.get(key) or "").strip()
        if not val:
            continue
        val_lower = val.lower()
        if val_lower == team_lower or _is_same_team(val, team_name):
            return True
    return False


def _find_rival_for_team(rivals: list[dict], team_name: str) -> dict | None:
    for rival in rivals:
        if _rival_matches_name(rival, team_name):
            return rival
    return None


def persist_escudo_from_rfaf(
    supabase,
    organizacion_id: str,
    rival_id: str,
    rfaf_url: str,
    *,
    force_reprocess: bool = False,
) -> str | None:
    """Download escudo, process, and store in Supabase `logos` bucket."""
    url = normalize_rfaf_escudo_url(rfaf_url) or rfaf_url
    if not url:
        return None

    if not force_reprocess and (
        "supabase.co/storage" in url or url.startswith("data:")
    ):
        return url

    downloaded = _download_escudo_bytes(url)
    if not downloaded:
        return url if url.startswith("http") else None

    content, content_type = downloaded

    if "svg" in content_type.lower() or url.lower().endswith(".svg"):
        storage_path = f"rivales/{organizacion_id}/{rival_id}/escudo.svg"
        try:
            _remove_legacy_escudo_paths(supabase, storage_path)
            supabase.storage.from_(LOGOS_BUCKET).upload(
                storage_path,
                content,
                file_options={"content-type": "image/svg+xml", "upsert": "true"},
            )
            return _cache_bust(
                supabase.storage.from_(LOGOS_BUCKET).get_public_url(storage_path)
            )
        except Exception as exc:
            logger.warning("Could not store SVG escudo for rival %s: %s", rival_id, exc)
            return url

    try:
        return upload_rival_escudo(
            supabase, organizacion_id, rival_id, content, content_type
        )
    except Exception as exc:
        logger.warning("Could not store escudo for rival %s: %s", rival_id, exc)
        return url


def apply_escudo_to_rival(
    supabase,
    organizacion_id: str,
    rival: dict,
    escudo_url: str,
    *,
    download: bool = True,
    force_reprocess: bool = False,
) -> bool:
    """Set rival escudo (download from RFAF when possible). Returns True if updated."""
    if not escudo_url:
        return False

    final_url = escudo_url
    if download:
        stored = persist_escudo_from_rfaf(
            supabase,
            organizacion_id,
            rival["id"],
            escudo_url,
            force_reprocess=force_reprocess,
        )
        if stored:
            final_url = stored

    if rival.get("escudo_url") == final_url:
        return False

    try:
        supabase.table("rivales").update({"escudo_url": final_url}).eq(
            "id", rival["id"]
        ).execute()
        rival["escudo_url"] = final_url
        return True
    except Exception as exc:
        logger.warning("Could not update escudo for rival %s: %s", rival.get("nombre"), exc)
        return False


def _needs_escudo_refresh(rival: dict, force: bool) -> bool:
    if force:
        return True
    url = rival.get("escudo_url") or ""
    if not url:
        return True
    if "rfaf.es" in url:
        return True
    if "supabase.co/storage" in url and "/escudo.png" not in url:
        return True
    return False


def backfill_rival_escudos(
    supabase,
    comp: dict,
    *,
    force: bool = False,
    create_missing: bool = True,
) -> dict:
    """
    Import/reprocess escudos from clasificación + actas for all league teams.
    Returns stats dict with updated, created, skipped, failed counts.
    """
    comp_id = comp["id"]
    equipo_id = comp.get("equipo_id")
    organizacion_id = comp.get("organizacion_id")
    mi_equipo = (comp.get("mi_equipo_nombre") or "").strip()

    if not organizacion_id and equipo_id:
        eq = (
            supabase.table("equipos")
            .select("organizacion_id")
            .eq("id", equipo_id)
            .single()
            .execute()
        )
        organizacion_id = (eq.data or {}).get("organizacion_id")
    if not organizacion_id:
        return {"updated": 0, "created": 0, "skipped": 0, "failed": 0, "error": "no org"}

    fresh = (
        supabase.table("rfef_competiciones")
        .select("clasificacion, mi_equipo_nombre, equipo_id")
        .eq("id", comp_id)
        .single()
        .execute()
    )
    if fresh.data:
        comp = {**comp, **fresh.data}
        if not mi_equipo:
            mi_equipo = (comp.get("mi_equipo_nombre") or "").strip()
        if not equipo_id:
            equipo_id = comp.get("equipo_id")

    actas_res = (
        supabase.table("rfef_actas")
        .select("local_nombre, visitante_nombre, local_escudo_url, visitante_escudo_url")
        .eq("competicion_id", comp_id)
        .execute()
    )
    escudo_lookup = build_escudo_lookup(comp, actas_res.data or [])

    rivales_res = (
        supabase.table("rivales")
        .select("id, nombre, rfef_nombre, escudo_url")
        .eq("organizacion_id", organizacion_id)
        .execute()
    )
    rivals: list[dict] = list(rivales_res.data or [])

    stats = {"updated": 0, "created": 0, "skipped": 0, "failed": 0, "total_teams": 0}
    processed_rival_ids: set[str] = set()

    clasificacion = comp.get("clasificacion") or []
    teams_processed: set[str] = set()

    for row in clasificacion:
        team_name = (row.get("equipo") or "").strip()
        if not team_name or team_name.lower() in teams_processed:
            continue
        if mi_equipo and _is_same_team(mi_equipo, team_name):
            continue

        teams_processed.add(team_name.lower())
        stats["total_teams"] += 1

        escudo = (
            escudo_lookup.get(team_name.lower())
            or normalize_rfaf_escudo_url(row.get("escudo_url"))
        )
        if not escudo:
            stats["skipped"] += 1
            continue

        rival = _find_rival_for_team(rivals, team_name)
        if not rival and create_missing:
            inserted = supabase.table("rivales").insert({
                "organizacion_id": organizacion_id,
                "nombre": team_name,
                "rfef_nombre": team_name,
            }).execute()
            if inserted.data:
                rival = inserted.data[0]
                rivals.append(rival)
                stats["created"] += 1
            else:
                stats["failed"] += 1
                continue
        elif not rival:
            stats["skipped"] += 1
            continue

        if not _needs_escudo_refresh(rival, force) and rival.get("escudo_url"):
            stats["skipped"] += 1
            continue

        source = escudo or rival.get("escudo_url")
        if not source:
            stats["skipped"] += 1
            continue

        if apply_escudo_to_rival(
            supabase,
            organizacion_id,
            rival,
            source,
            download=True,
            force_reprocess=force,
        ):
            stats["updated"] += 1
            processed_rival_ids.add(rival["id"])
        elif not rival.get("escudo_url"):
            stats["failed"] += 1
        else:
            stats["skipped"] += 1

    # Also refresh existing rivals with fuzzy lookup (e.g. name variants)
    for rival in rivals:
        if rival["id"] in processed_rival_ids:
            continue
        if mi_equipo and _is_same_team(mi_equipo, rival.get("nombre") or ""):
            continue
        if not _needs_escudo_refresh(rival, force):
            continue

        name_lower = (rival.get("nombre") or "").lower()
        rfef_lower = (rival.get("rfef_nombre") or "").lower()
        escudo = escudo_lookup.get(name_lower) or escudo_lookup.get(rfef_lower)
        source = escudo or rival.get("escudo_url")
        if not source:
            continue

        if apply_escudo_to_rival(
            supabase,
            organizacion_id,
            rival,
            source,
            download=True,
            force_reprocess=force,
        ):
            stats["updated"] += 1

    if stats["updated"] or stats["created"]:
        logger.info(
            "Escudo backfill comp=%s: %d updated, %d created, %d skipped, %d failed",
            comp_id,
            stats["updated"],
            stats["created"],
            stats["skipped"],
            stats["failed"],
        )
    return stats


def backfill_escudos_for_equipo(
    supabase,
    organizacion_id: str,
    equipo_id: str,
    *,
    force: bool = True,
) -> dict:
    """Run escudo backfill for the active RFEF competition of an equipo."""
    comps_res = (
        supabase.table("rfef_competiciones")
        .select("*")
        .eq("equipo_id", equipo_id)
        .order("ultima_sincronizacion", desc=True)
        .limit(1)
        .execute()
    )
    if not comps_res.data:
        return {
            "updated": 0,
            "created": 0,
            "skipped": 0,
            "failed": 0,
            "error": "No hay competición RFAF vinculada a este equipo",
        }

    comp = {**comps_res.data[0], "organizacion_id": organizacion_id}
    return backfill_rival_escudos(supabase, comp, force=force, create_missing=True)
