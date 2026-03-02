"""
TrainingHub Pro - Competition Linker Service
Auto-creates rivales and partidos from RFEF jornadas data.

When mi_equipo_nombre is set:
1. Creates rivales for all teams mi_equipo plays against
2. Creates/updates partidos for each match involving mi_equipo
3. Cleans up old auto-created partidos if mi_equipo changed
"""

import logging
from datetime import datetime, date

logger = logging.getLogger(__name__)


def _parse_fecha(fecha_str: str) -> date | None:
    """Parse DD-MM-YYYY to date object."""
    if not fecha_str:
        return None
    try:
        return datetime.strptime(fecha_str.strip(), "%d-%m-%Y").date()
    except ValueError:
        return None


def _parse_hora(hora_str: str) -> str | None:
    """Validate HH:MM format."""
    if not hora_str or len(hora_str) < 4:
        return None
    hora_str = hora_str.strip()[:5]
    if len(hora_str) == 5 and hora_str[2] == ":":
        return hora_str
    return None


def _is_same_team(mi_equipo: str, team_name: str) -> bool:
    """Check if team_name matches mi_equipo. Uses exact match first, then substring."""
    a = mi_equipo.lower().strip()
    b = team_name.lower().strip()
    if a == b:
        return True
    # Substring match (handles "CLUB ATLÉTICO CENTRAL" vs "C. ATLETICO CENTRAL")
    # Only if the shorter name is at least 6 chars to avoid false positives
    if len(a) >= 6 and len(b) >= 6:
        if a in b or b in a:
            return True
    return False


def link_competition(supabase, comp: dict) -> dict:
    """
    Auto-link a competition: create rivales and partidos from RFEF jornadas.

    1. Read all rfef_jornadas for this competition
    2. Extract unique rival team names (all except mi_equipo_nombre)
    3. Match with existing rivales by rfef_nombre or nombre (case-insensitive)
    4. Create missing rivales
    5. For each match where mi_equipo plays:
       - Upsert partido (create if missing, update result if auto_creado)
    6. Clean up stale auto-created partidos from old mi_equipo
    """
    comp_id = comp["id"]
    equipo_id = comp["equipo_id"]
    mi_equipo = (comp.get("mi_equipo_nombre") or "").strip()
    organizacion_id = comp.get("organizacion_id")

    if not mi_equipo:
        return {"error": "mi_equipo_nombre not set", "rivales_created": 0, "partidos_created": 0, "partidos_updated": 0}

    # Get organizacion_id from equipo if not in comp
    if not organizacion_id:
        eq_res = supabase.table("equipos").select("organizacion_id").eq("id", equipo_id).single().execute()
        if eq_res.data:
            organizacion_id = eq_res.data["organizacion_id"]
        else:
            return {"error": "equipo not found", "rivales_created": 0, "partidos_created": 0, "partidos_updated": 0}

    # Fetch all jornadas
    jornadas_res = supabase.table("rfef_jornadas").select("*").eq(
        "competicion_id", comp_id
    ).order("numero").execute()
    jornadas = jornadas_res.data or []

    if not jornadas:
        return {"rivales_created": 0, "partidos_created": 0, "partidos_updated": 0, "message": "No jornadas found"}

    SKIP_NAMES = {"descansa", "descanso", "bye", "libre", ""}

    # Collect all unique rival names from matches involving mi_equipo
    rival_names = set()
    my_matches = []

    for jornada in jornadas:
        for partido in jornada.get("partidos", []):
            local = (partido.get("local") or "").strip()
            visitante = (partido.get("visitante") or "").strip()

            is_local = _is_same_team(mi_equipo, local)
            is_visitante = _is_same_team(mi_equipo, visitante)

            if is_local and visitante.lower() not in SKIP_NAMES:
                rival_names.add(visitante)
                my_matches.append({
                    "jornada_num": jornada["numero"],
                    "rival_nombre": visitante,
                    "localia": "local",
                    **partido,
                })
            elif is_visitante and local.lower() not in SKIP_NAMES:
                rival_names.add(local)
                my_matches.append({
                    "jornada_num": jornada["numero"],
                    "rival_nombre": local,
                    "localia": "visitante",
                    **partido,
                })

    # Load existing rivales for this organization
    existing_rivales_res = supabase.table("rivales").select("*").eq(
        "organizacion_id", organizacion_id
    ).execute()
    existing_rivales = existing_rivales_res.data or []

    # Build lookup: lowercase name/rfef_nombre -> rival record
    rival_lookup = {}
    for r in existing_rivales:
        rival_lookup[r["nombre"].lower()] = r
        if r.get("rfef_nombre"):
            rival_lookup[r["rfef_nombre"].lower()] = r

    # Build escudo lookup from rfef_actas if available
    escudo_lookup = {}
    try:
        actas_res = supabase.table("rfef_actas").select(
            "local_nombre, visitante_nombre, local_escudo_url, visitante_escudo_url"
        ).eq("competicion_id", comp_id).execute()
        for acta in actas_res.data or []:
            if acta.get("local_escudo_url"):
                escudo_lookup[acta["local_nombre"].lower()] = acta["local_escudo_url"]
            if acta.get("visitante_escudo_url"):
                escudo_lookup[acta["visitante_nombre"].lower()] = acta["visitante_escudo_url"]
    except Exception:
        pass  # Actas table might not exist yet

    # Create missing rivales
    rivales_created = 0
    for name in rival_names:
        name_lower = name.lower()
        if name_lower not in rival_lookup:
            rival_data = {
                "organizacion_id": organizacion_id,
                "nombre": name,
                "rfef_nombre": name,
            }
            escudo = escudo_lookup.get(name_lower)
            if escudo:
                rival_data["escudo_url"] = escudo

            new_rival = supabase.table("rivales").insert(rival_data).execute()
            if new_rival.data:
                rival_lookup[name_lower] = new_rival.data[0]
                rivales_created += 1
                logger.info("Created rival: %s", name)
        else:
            # Update escudo if missing
            existing = rival_lookup[name_lower]
            escudo = escudo_lookup.get(name_lower)
            if escudo and not existing.get("escudo_url"):
                try:
                    supabase.table("rivales").update({"escudo_url": escudo}).eq(
                        "id", existing["id"]
                    ).execute()
                except Exception:
                    pass

    # Load existing partidos for this competition
    existing_partidos_res = supabase.table("partidos").select("*").eq(
        "equipo_id", equipo_id
    ).eq("rfef_competicion_id", comp_id).execute()
    existing_partidos = existing_partidos_res.data or []

    # Build lookup: jornada_num -> partido
    partido_by_jornada = {}
    for p in existing_partidos:
        if p.get("jornada"):
            partido_by_jornada[p["jornada"]] = p

    # Clean up: delete auto-created partidos for jornadas where mi_equipo
    # is NOT in the match anymore (e.g., mi_equipo changed)
    my_jornadas = {m["jornada_num"] for m in my_matches}
    partidos_deleted = 0
    for p in existing_partidos:
        if p.get("auto_creado") and p.get("jornada") and p["jornada"] not in my_jornadas:
            try:
                supabase.table("partidos").delete().eq("id", p["id"]).execute()
                partidos_deleted += 1
            except Exception:
                pass
    if partidos_deleted > 0:
        logger.info("Cleaned up %d stale auto-created partidos", partidos_deleted)

    # Create/update partidos
    partidos_created = 0
    partidos_updated = 0

    for match in my_matches:
        jornada_num = match["jornada_num"]
        rival_nombre = match["rival_nombre"]
        rival_record = rival_lookup.get(rival_nombre.lower())

        if not rival_record:
            logger.warning("Rival not found for: %s", rival_nombre)
            continue

        # Parse fecha and hora
        fecha = _parse_fecha(match.get("fecha", ""))
        hora = _parse_hora(match.get("hora", ""))

        # Determine goals
        is_local = match["localia"] == "local"
        goles_local = match.get("goles_local")
        goles_visitante = match.get("goles_visitante")

        goles_favor = goles_local if is_local else goles_visitante
        goles_contra = goles_visitante if is_local else goles_local

        campo = match.get("campo", "")

        existing = partido_by_jornada.get(jornada_num)

        if existing and existing.get("auto_creado"):
            # Update existing auto-created partido
            update_data = {}
            if goles_favor is not None and goles_contra is not None:
                if existing.get("goles_favor") != goles_favor or existing.get("goles_contra") != goles_contra:
                    update_data["goles_favor"] = goles_favor
                    update_data["goles_contra"] = goles_contra
            # Update rival if it changed
            if existing.get("rival_id") != rival_record["id"]:
                update_data["rival_id"] = rival_record["id"]
            if campo and not existing.get("ubicacion"):
                update_data["ubicacion"] = campo
            if hora and not existing.get("hora"):
                update_data["hora"] = hora
            if fecha and not existing.get("fecha"):
                update_data["fecha"] = fecha.isoformat()

            if update_data:
                supabase.table("partidos").update(update_data).eq(
                    "id", existing["id"]
                ).execute()
                partidos_updated += 1

        elif not existing:
            # Create new auto-created partido
            partido_data = {
                "equipo_id": equipo_id,
                "rival_id": rival_record["id"],
                "localia": match["localia"],
                "competicion": "liga",
                "jornada": jornada_num,
                "rfef_competicion_id": comp_id,
                "auto_creado": True,
                "ubicacion": campo or None,
            }

            # Only set fecha if available (don't skip the match)
            if fecha:
                partido_data["fecha"] = fecha.isoformat()
            if hora:
                partido_data["hora"] = hora

            if goles_favor is not None and goles_contra is not None:
                partido_data["goles_favor"] = goles_favor
                partido_data["goles_contra"] = goles_contra

            result = supabase.table("partidos").insert(partido_data).execute()
            if result.data:
                partido_by_jornada[jornada_num] = result.data[0]
                partidos_created += 1

    logger.info(
        "Link competition %s: %d rivales created, %d partidos created, %d updated, %d deleted",
        comp_id, rivales_created, partidos_created, partidos_updated, partidos_deleted,
    )

    return {
        "rivales_created": rivales_created,
        "partidos_created": partidos_created,
        "partidos_updated": partidos_updated,
    }
