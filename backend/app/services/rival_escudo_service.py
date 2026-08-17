"""
Download and persist RFAF team escudos for rivals.
Falls back to hotlinked RFAF URL if download fails.
"""

from __future__ import annotations

import logging

import httpx
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


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


def persist_escudo_from_rfaf(
    supabase,
    organizacion_id: str,
    rival_id: str,
    rfaf_url: str,
) -> str | None:
    """Download RFAF escudo to Supabase `logos` bucket. Returns stored URL."""
    url = normalize_rfaf_escudo_url(rfaf_url)
    if not url:
        return None

    # Already on our storage
    if "supabase.co/storage" in url or url.startswith("data:"):
        return url

    try:
        with httpx.Client(timeout=12.0, http2=False, follow_redirects=True) as client:
            response = client.get(url, headers={"User-Agent": USER_AGENT})
            response.raise_for_status()
            content = response.content
            if len(content) < 50:
                logger.warning("Escudo too small (%d bytes) for rival %s", len(content), rival_id)
                return url

            content_type = (response.headers.get("content-type") or "image/png").split(";")[0]
    except Exception as exc:
        logger.warning("Could not download escudo %s: %s", url, exc)
        return url

    ext = "png"
    if "jpeg" in content_type or "jpg" in content_type:
        ext = "jpg"
    elif "webp" in content_type:
        ext = "webp"
    elif "svg" in content_type:
        ext = "svg"

    storage_path = f"rivales/{organizacion_id}/{rival_id}/escudo.{ext}"
    try:
        try:
            supabase.storage.from_("logos").remove([storage_path])
        except Exception:
            pass

        supabase.storage.from_("logos").upload(
            storage_path,
            content,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        return supabase.storage.from_("logos").get_public_url(storage_path)
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
) -> bool:
    """Set rival escudo (download from RFAF when possible). Returns True if updated."""
    if not escudo_url:
        return False

    final_url = escudo_url
    if download:
        stored = persist_escudo_from_rfaf(
            supabase, organizacion_id, rival["id"], escudo_url
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


def backfill_rival_escudos(supabase, comp: dict) -> int:
    """Refresh escudos for rivals in this competition from clasificación + actas."""
    comp_id = comp["id"]
    organizacion_id = comp.get("organizacion_id")
    mi_equipo = (comp.get("mi_equipo_nombre") or "").strip()

    if not organizacion_id:
        eq = (
            supabase.table("equipos")
            .select("organizacion_id")
            .eq("id", comp["equipo_id"])
            .single()
            .execute()
        )
        organizacion_id = (eq.data or {}).get("organizacion_id")
    if not organizacion_id:
        return 0

    # Fresh clasificación from DB
    fresh = (
        supabase.table("rfef_competiciones")
        .select("clasificacion, mi_equipo_nombre")
        .eq("id", comp_id)
        .single()
        .execute()
    )
    if fresh.data:
        comp = {**comp, **fresh.data}
        if not mi_equipo:
            mi_equipo = (comp.get("mi_equipo_nombre") or "").strip()

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

    updated = 0
    for rival in rivales_res.data or []:
        if mi_equipo and _is_same_team(mi_equipo, rival.get("nombre") or ""):
            continue

        name_lower = (rival.get("nombre") or "").lower()
        rfef_lower = (rival.get("rfef_nombre") or "").lower()
        escudo = escudo_lookup.get(name_lower) or escudo_lookup.get(rfef_lower)
        if not escudo:
            continue

        # Always try to upgrade hotlinked RFAF URLs to stored copies
        needs_update = not rival.get("escudo_url") or "rfaf.es" in (rival.get("escudo_url") or "")
        if not needs_update:
            continue

        if apply_escudo_to_rival(supabase, organizacion_id, rival, escudo, download=True):
            updated += 1

    if updated:
        logger.info("Backfilled escudos for %d rivals (comp=%s)", updated, comp_id)
    return updated
