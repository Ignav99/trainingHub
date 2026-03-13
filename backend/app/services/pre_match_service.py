"""
TrainingHub Pro - Pre-Match Intelligence Service
Auto-populates pre-match intel from RFEF data (clasificacion, goleadores,
once probable, tarjetas, sanciones, resultados, head-to-head).
"""

import logging
from collections import Counter
from datetime import datetime, date, timedelta

logger = logging.getLogger(__name__)


def _match_rival_name(rival_nombre: str, team_name: str) -> bool:
    """Case-insensitive substring match for rival names."""
    a = rival_nombre.lower().strip()
    b = team_name.lower().strip()
    if not a or not b:
        return False
    if a == b:
        return True
    if len(a) >= 6 and len(b) >= 6:
        if a in b or b in a:
            return True
    return False


def _get_clasificacion(comp: dict, rival_nombre: str) -> dict | None:
    """Extract rival's standing from competition clasificacion."""
    clasificacion = comp.get("clasificacion") or []
    rival_lower = rival_nombre.lower()

    for equipo in clasificacion:
        equipo_nombre = (equipo.get("equipo") or "").lower()
        if _match_rival_name(rival_lower, equipo_nombre):
            return {
                "posicion": equipo.get("posicion"),
                "puntos": equipo.get("puntos"),
                "pj": equipo.get("pj"),
                "pg": equipo.get("pg"),
                "pe": equipo.get("pe"),
                "pp": equipo.get("pp"),
                "gf": equipo.get("gf"),
                "gc": equipo.get("gc"),
                "ultimos_5": equipo.get("ultimos_5", []),
            }
    return None


def _get_goleadores_rival(comp: dict, rival_nombre: str) -> list[dict]:
    """Extract rival's top scorers from competition goleadores."""
    goleadores = comp.get("goleadores") or []
    rival_lower = rival_nombre.lower()
    result = []

    for g in goleadores:
        equipo = (g.get("equipo") or "").lower()
        if _match_rival_name(rival_lower, equipo):
            result.append({
                "jugador": g.get("jugador", ""),
                "goles": g.get("goles", 0),
                "pj": g.get("pj"),
            })

    result.sort(key=lambda x: -(x.get("goles") or 0))
    return result[:10]


def _get_once_probable(supabase, comp_id: str, rival_nombre: str, tarjetas_data: dict | None = None) -> dict:
    """Calculate probable starting XI from last 5 actas, with sanction flags."""
    rival_lower = rival_nombre.lower()

    actas_res = supabase.table("rfef_actas").select(
        "local_nombre, visitante_nombre, titulares_local, titulares_visitante, jornada_numero"
    ).eq("competicion_id", comp_id).or_(
        f"local_nombre.ilike.%{rival_nombre}%,visitante_nombre.ilike.%{rival_nombre}%"
    ).order("jornada_numero", desc=True).limit(5).execute()

    actas = actas_res.data or []
    logger.info(
        "Once probable query for '%s' (comp=%s): %d actas returned",
        rival_nombre, comp_id, len(actas),
    )

    player_counts: Counter = Counter()
    player_dorsals: dict[str, int | None] = {}

    for acta in actas:
        local_name = acta.get("local_nombre") or ""
        visitante_name = acta.get("visitante_nombre") or ""
        local_lower = local_name.lower()
        is_local = _match_rival_name(rival_lower, local_lower)

        if is_local:
            titulares = acta.get("titulares_local") or []
        else:
            titulares = acta.get("titulares_visitante") or []

        logger.info(
            "  Acta J%s: %s vs %s | rival_is_local=%s | titulares=%s (type=%s)",
            acta.get("jornada_numero"),
            local_name,
            visitante_name,
            is_local,
            len(titulares) if isinstance(titulares, list) else titulares,
            type(titulares).__name__,
        )

        for jugador in titulares:
            nombre = jugador.get("nombre", "").strip()
            if nombre:
                player_counts[nombre] += 1
                if nombre not in player_dorsals:
                    player_dorsals[nombre] = jugador.get("dorsal")

    logger.info(
        "Once probable result for '%s': %d actas, %d unique players",
        rival_nombre, len(actas), len(player_counts),
    )

    # Build set of sanctioned player names from tarjetas data
    sancionados = set()
    if tarjetas_data:
        for j in tarjetas_data.get("jugadores", []):
            if j.get("estado") == "Sancionado":
                sancionados.add(j.get("nombre", ""))

    all_players = player_counts.most_common()
    return {
        "actas_analizadas": len(actas),
        "jugadores": [
            {
                "nombre": nombre,
                "dorsal": player_dorsals.get(nombre),
                "apariciones": count,
                "sancionado": nombre in sancionados,
            }
            for nombre, count in all_players
        ],
    }


def _get_tarjetas(supabase, comp_id: str, rival_nombre: str) -> dict:
    """Aggregate card statistics for the rival across all actas."""
    rival_lower = rival_nombre.lower()

    actas_res = supabase.table("rfef_actas").select(
        "local_nombre, visitante_nombre, tarjetas_local, tarjetas_visitante, jornada_numero"
    ).eq("competicion_id", comp_id).or_(
        f"local_nombre.ilike.%{rival_nombre}%,visitante_nombre.ilike.%{rival_nombre}%"
    ).order("jornada_numero").execute()

    actas = actas_res.data or []
    player_cards: dict[str, dict] = {}

    for acta in actas:
        local_lower = (acta.get("local_nombre") or "").lower()
        if _match_rival_name(rival_lower, local_lower):
            tarjetas = acta.get("tarjetas_local") or []
        else:
            tarjetas = acta.get("tarjetas_visitante") or []

        for tarjeta in tarjetas:
            nombre = tarjeta.get("jugador", "").strip()
            tipo = tarjeta.get("tipo", "")
            if not nombre:
                continue
            if nombre not in player_cards:
                player_cards[nombre] = {"amarillas": 0, "rojas": 0}
            if tipo == "amarilla":
                player_cards[nombre]["amarillas"] += 1
            elif tipo == "roja":
                player_cards[nombre]["rojas"] += 1

    jugadores = []
    for nombre, cards in player_cards.items():
        amarillas = cards["amarillas"]
        rojas = cards["rojas"]
        ciclos_cumplidos = amarillas // 5

        if amarillas > 0 and amarillas % 5 == 0:
            estado = "Sancionado"
        elif amarillas % 5 == 4:
            estado = "Ciclo"
        else:
            estado = "OK"

        jugadores.append({
            "nombre": nombre,
            "amarillas": amarillas,
            "rojas": rojas,
            "ciclos_cumplidos": ciclos_cumplidos,
            "estado": estado,
        })

    jugadores.sort(key=lambda j: (-j["amarillas"], -j["rojas"]))

    return {
        "total_actas": len(actas),
        "jugadores": jugadores,
    }


def _get_sanciones_oficiales(supabase, comp_id: str, rival_nombre: str) -> list[dict]:
    """Get official sanctions for the rival from rfef_sanciones."""
    try:
        res = supabase.table("rfef_sanciones").select("*").eq(
            "competicion_id", comp_id
        ).execute()

        sanciones = []
        for s in res.data or []:
            equipo = s.get("equipo_nombre", "")
            if _match_rival_name(rival_nombre, equipo):
                sanciones.append({
                    "persona_nombre": s.get("persona_nombre", ""),
                    "categoria": s.get("categoria", ""),
                    "descripcion": s.get("descripcion", ""),
                    "jornada_numero": s.get("jornada_numero"),
                    "articulo": s.get("articulo", ""),
                })

        # Sort by jornada desc, keep most recent
        sanciones.sort(key=lambda x: -(x.get("jornada_numero") or 0))
        return sanciones[:15]
    except Exception as e:
        logger.debug("Error fetching sanciones: %s", e)
        return []


def _get_ultimos_resultados(supabase, comp_id: str, rival_nombre: str) -> list[dict]:
    """Get last 5 results for the rival from rfef_jornadas."""
    rival_lower = rival_nombre.lower()

    jornadas_res = supabase.table("rfef_jornadas").select("numero, partidos").eq(
        "competicion_id", comp_id
    ).order("numero", desc=True).execute()

    results = []
    for jornada in jornadas_res.data or []:
        for partido in jornada.get("partidos", []):
            local = (partido.get("local") or "").lower()
            visitante = (partido.get("visitante") or "").lower()
            is_involved = _match_rival_name(rival_lower, local) or _match_rival_name(rival_lower, visitante)

            if is_involved and partido.get("goles_local") is not None:
                results.append({
                    "jornada": jornada["numero"],
                    "local": partido.get("local"),
                    "visitante": partido.get("visitante"),
                    "goles_local": partido.get("goles_local"),
                    "goles_visitante": partido.get("goles_visitante"),
                    "fecha": partido.get("fecha", ""),
                })
                if len(results) >= 5:
                    break
        if len(results) >= 5:
            break

    return results


def _get_head_to_head(supabase, rival_id: str) -> list[dict]:
    """Get head-to-head history from our partidos table."""
    h2h_res = supabase.table("partidos").select(
        "id, fecha, localia, goles_favor, goles_contra, resultado, jornada, competicion"
    ).eq("rival_id", rival_id).not_.is_("goles_favor", "null").order(
        "fecha", desc=True
    ).limit(10).execute()

    results = []
    for p in h2h_res.data or []:
        results.append({
            "fecha": p.get("fecha"),
            "goles_favor": p.get("goles_favor"),
            "goles_contra": p.get("goles_contra"),
            "resultado": p.get("resultado"),
            "localia": p.get("localia"),
            "jornada": p.get("jornada"),
        })

    return results


def gather_rival_intel_standalone(
    supabase, rival: dict, comp: dict, rival_id: str = ""
) -> dict:
    """
    Aggregate all pre-match intelligence for a rival, independent of any partido.

    Args:
        supabase: Supabase client
        rival: Rival record dict (must have nombre/rfef_nombre)
        comp: rfef_competiciones record
        rival_id: UUID string for head-to-head lookup

    Returns:
        dict with all intel sections
    """
    rival_nombre = rival.get("rfef_nombre") or rival.get("nombre", "")
    comp_id = comp["id"]

    if not rival_nombre:
        return {"error": "No rival name available"}

    intel = {
        "generated_at": datetime.utcnow().isoformat(),
        "rival_nombre": rival.get("nombre", rival_nombre),
        "rival_escudo_url": rival.get("escudo_url"),
    }

    # Clasificacion
    clasificacion = _get_clasificacion(comp, rival_nombre)
    if clasificacion:
        intel["clasificacion"] = clasificacion

    # Goleadores
    goleadores = _get_goleadores_rival(comp, rival_nombre)
    if goleadores:
        intel["goleadores_rival"] = goleadores

    # Tarjetas (fetch first so we can pass to once probable)
    tarjetas = None
    try:
        tarjetas = _get_tarjetas(supabase, comp_id, rival_nombre)
        if tarjetas.get("jugadores"):
            intel["tarjetas"] = tarjetas
    except Exception as e:
        logger.debug("Error getting tarjetas: %s", e)

    # Once probable (with sanction cross-reference)
    try:
        once = _get_once_probable(supabase, comp_id, rival_nombre, tarjetas_data=tarjetas)
        logger.info(
            "Once probable for '%s': actas=%d, jugadores=%d",
            rival_nombre, once.get("actas_analizadas", 0), len(once.get("jugadores", [])),
        )
        if once.get("actas_analizadas", 0) > 0:
            intel["once_probable"] = once
    except Exception as e:
        logger.warning("Error getting once probable for '%s': %s", rival_nombre, e, exc_info=True)

    # Sanciones oficiales
    sanciones = _get_sanciones_oficiales(supabase, comp_id, rival_nombre)
    if sanciones:
        intel["sanciones_oficiales"] = sanciones

    # Ultimos resultados
    try:
        resultados = _get_ultimos_resultados(supabase, comp_id, rival_nombre)
        if resultados:
            intel["ultimos_resultados"] = resultados
    except Exception as e:
        logger.debug("Error getting ultimos resultados: %s", e)

    # Head to head
    if rival_id:
        try:
            h2h = _get_head_to_head(supabase, str(rival_id))
            if h2h:
                intel["head_to_head"] = h2h
        except Exception as e:
            logger.debug("Error getting head to head: %s", e)

    logger.info("Final intel sections for '%s': %s", rival_nombre, list(intel.keys()))
    return intel


def gather_rival_intel(supabase, partido: dict, comp: dict) -> dict:
    """
    Aggregate all pre-match intelligence for a rival (partido-based wrapper).
    Delegates to gather_rival_intel_standalone.
    """
    rival = partido.get("rivales") or {}
    rival_id = partido.get("rival_id", "")
    return gather_rival_intel_standalone(supabase, rival, comp, rival_id)


def populate_partido_intel(supabase, partido_id: str) -> dict | None:
    """
    Populate pre-match intel for a single partido.
    Returns the intel dict or None if not applicable.
    """
    # Get partido with rival
    partido_res = supabase.table("partidos").select(
        "*, rivales(*)"
    ).eq("id", partido_id).single().execute()

    if not partido_res.data:
        return None

    partido = partido_res.data
    comp_id = partido.get("rfef_competicion_id")

    if not comp_id:
        return None

    # Get competition data
    comp_res = supabase.table("rfef_competiciones").select("*").eq(
        "id", comp_id
    ).single().execute()

    if not comp_res.data:
        return None

    intel = gather_rival_intel(supabase, partido, comp_res.data)

    # Save to DB
    supabase.table("partidos").update({
        "pre_match_intel": intel,
    }).eq("id", partido_id).execute()

    logger.info("Populated pre-match intel for partido %s", partido_id)
    return intel


def auto_populate_upcoming_matches(supabase) -> dict:
    """
    Auto-populate pre-match intel for matches in the next 7 days.
    Called by scheduler on Monday and Friday mornings.

    Returns summary of what was populated.
    """
    today = date.today()
    end_date = today + timedelta(days=7)

    # Get upcoming matches with RFEF competition link
    partidos_res = supabase.table("partidos").select(
        "id, fecha, rival_id, rfef_competicion_id, pre_match_intel"
    ).gte("fecha", today.isoformat()).lte(
        "fecha", end_date.isoformat()
    ).not_.is_("rfef_competicion_id", "null").is_(
        "goles_favor", "null"  # Only pending matches
    ).execute()

    partidos = partidos_res.data or []
    populated = 0
    errors = 0

    for partido in partidos:
        try:
            result = populate_partido_intel(supabase, partido["id"])
            if result:
                populated += 1
        except Exception as e:
            logger.warning("Error populating intel for partido %s: %s", partido["id"], e)
            errors += 1

    logger.info(
        "Auto-populate complete: %d matches found, %d populated, %d errors",
        len(partidos), populated, errors,
    )

    return {
        "matches_found": len(partidos),
        "populated": populated,
        "errors": errors,
    }


def populate_rival_intel(supabase, rival_id: str, competicion_id: str) -> dict | None:
    """
    Populate rivales.rival_intel JSONB for a rival.
    Returns the intel dict or None if not applicable.
    """
    rival_res = supabase.table("rivales").select("*").eq(
        "id", rival_id
    ).single().execute()

    if not rival_res.data:
        return None

    rival = rival_res.data

    comp_res = supabase.table("rfef_competiciones").select("*").eq(
        "id", competicion_id
    ).single().execute()

    if not comp_res.data:
        return None

    intel = gather_rival_intel_standalone(supabase, rival, comp_res.data, rival_id)

    # Save to rivales.rival_intel
    supabase.table("rivales").update({
        "rival_intel": intel,
    }).eq("id", rival_id).execute()

    logger.info("Populated rival intel for rival %s", rival_id)
    return intel
