"""
TrainingHub Pro - Pre-Match Intelligence Service
Auto-populates pre-match intel from RFEF data (clasificacion, goleadores,
once probable, tarjetas, sanciones, resultados, head-to-head).
"""

import logging
import re
from collections import Counter
from datetime import datetime, date, timedelta

logger = logging.getLogger(__name__)

# Common Spanish club prefixes to strip for fuzzy acta matching
_CLUB_PREFIXES = re.compile(
    r"^(AA\.?\s*AA\.?|A\.?A\.?|C\.?D\.?|C\.?F\.?|U\.?D\.?|S\.?D\.?|R\.?C\.?D\.?|"
    r"A\.?D\.?|E\.?F\.?|C\.?P\.?|F\.?C\.?|R\.?C\.?|Atco\.?|Atletico|Club|Agrupacion)\s+",
    re.IGNORECASE,
)


def _extract_core_name(name: str) -> str:
    """Extract the distinctive 'core' of a team name by stripping common prefixes.

    'AA.AA. COLSPE' -> 'COLSPE'
    'C.D. Mirandés' -> 'Mirandés'
    'U.D. Almería'  -> 'Almería'
    """
    core = _CLUB_PREFIXES.sub("", name.strip())
    # If stripping removed everything or left < 3 chars, use original
    if len(core) < 3:
        return name.strip()
    return core.strip()


def _match_rival_name(rival_nombre: str, team_name: str) -> bool:
    """Case-insensitive match for rival names, with core-name fallback."""
    a = rival_nombre.lower().strip()
    b = team_name.lower().strip()
    if not a or not b:
        return False
    if a == b:
        return True
    # Substring match (both >= 6 chars)
    if len(a) >= 6 and len(b) >= 6:
        if a in b or b in a:
            return True
    # Core-name match (strip C.D., U.D., A.D. etc.)
    core_a = _extract_core_name(a).lower()
    core_b = _extract_core_name(b).lower()
    if core_a and core_b and len(core_a) >= 3 and len(core_b) >= 3:
        if core_a == core_b:
            return True
        if len(core_a) >= 5 and len(core_b) >= 5:
            if core_a in core_b or core_b in core_a:
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
    """Extract rival's top scorers from competition goleadores page data."""
    goleadores = comp.get("goleadores") or []
    rival_lower = rival_nombre.lower()
    result = []

    if not goleadores:
        logger.info("No goleadores page data in competition %s", comp.get("id", "?"))
        return []

    for g in goleadores:
        equipo = (g.get("equipo") or "").lower()
        if _match_rival_name(rival_lower, equipo):
            result.append({
                "jugador": g.get("jugador", ""),
                "goles": g.get("goles", 0),
                "pj": g.get("pj"),
            })

    if not result:
        logger.info(
            "No goleadores matched for '%s' in page data (%d entries). "
            "Sample: %s", rival_nombre, len(goleadores), goleadores[:2],
        )

    result.sort(key=lambda x: -(x.get("goles") or 0))
    return result[:10]


def _get_goleadores_from_actas(supabase, comp_id: str, rival_nombre: str) -> list[dict]:
    """Extract rival's top scorers from match actas (reliable fallback).

    Queries all actas for the rival and aggregates goals per player
    from the 'goles' field (list of {minuto, jugador, parcial_local, parcial_visitante}).
    """
    actas = _query_actas(
        supabase, comp_id, rival_nombre,
        "local_nombre, visitante_nombre, goles, goles_local, goles_visitante",
    )

    if not actas:
        logger.info("No actas found for goleadores extraction: '%s'", rival_nombre)
        return []

    from collections import Counter
    goal_counts: Counter = Counter()
    actas_with_goals = 0

    for acta in actas:
        goles_list = acta.get("goles") or []
        if not goles_list:
            continue

        actas_with_goals += 1
        side = _is_rival_local(acta, rival_nombre)

        for gol in goles_list:
            jugador = (gol.get("jugador") or "").strip()
            if not jugador:
                continue

            # Determine if this goal belongs to the rival
            parcial_l = gol.get("parcial_local")
            parcial_v = gol.get("parcial_visitante")
            prev_l = gol.get("_prev_local")  # Not always available

            if side is True:
                # Rival is local — goal is rival's if parcial_local incremented
                # Heuristic: if parcial_local > parcial_visitante evolution
                # Simplification: assign to rival if parcial_local exists
                # Actually, we can just track by side — goals in acta are
                # typically listed in chronological order with running score.
                # A goal belongs to local if parcial_local increased.
                goal_counts[jugador] += 1
            elif side is False:
                # Rival is visitante — count all goals (we'll filter below)
                goal_counts[jugador] += 1
            else:
                # Unknown side — count anyway, better than nothing
                goal_counts[jugador] += 1

    if not goal_counts:
        logger.info("No goals found in %d actas for '%s'", len(actas), rival_nombre)
        return []

    # The goles list in actas includes ALL goals (both teams).
    # To filter only rival goals, we use the titulares/suplentes data.
    # But that requires another query. Simpler: re-query actas with lineup data
    # to build a set of rival player names, then filter.
    rival_players = set()
    lineup_actas = _query_actas(
        supabase, comp_id, rival_nombre,
        "local_nombre, visitante_nombre, titulares_local, titulares_visitante, "
        "suplentes_local, suplentes_visitante",
    )
    for acta in lineup_actas:
        titulares = _get_rival_data(acta, rival_nombre, "titulares_local", "titulares_visitante")
        suplentes = _get_rival_data(acta, rival_nombre, "suplentes_local", "suplentes_visitante")
        for j in titulares + suplentes:
            name = (j.get("nombre") or "").strip()
            if name:
                rival_players.add(name.lower())

    # Filter goals to only rival players
    result = []
    for jugador, goles in goal_counts.most_common():
        if rival_players and jugador.lower() not in rival_players:
            continue  # Not a rival player
        result.append({
            "jugador": jugador,
            "goles": goles,
        })

    # If we couldn't build a player set (no lineup data), return all
    if not rival_players and goal_counts:
        result = [{"jugador": j, "goles": g} for j, g in goal_counts.most_common()]

    logger.info(
        "Goleadores from actas for '%s': %d scorers from %d actas (%d with goals)",
        rival_nombre, len(result), len(actas), actas_with_goals,
    )
    return result[:10]


def _query_actas(supabase, comp_id: str, rival_nombre: str, columns: str, desc: bool = False, limit: int | None = None) -> list[dict]:
    """Query rfef_actas with multiple fallbacks:
    1. ilike on local_nombre/visitante_nombre with full rfef_nombre
    2. ilike with core name (stripped prefixes)
    3. Lookup cod_actas from rfef_jornadas (works even if acta names are empty)
    """
    search_names = [rival_nombre]
    core = _extract_core_name(rival_nombre)
    if core.lower() != rival_nombre.lower().strip():
        search_names.append(core)

    # Strategy 1 & 2: direct name search on actas
    for name in search_names:
        query = supabase.table("rfef_actas").select(columns).eq(
            "competicion_id", comp_id
        ).or_(
            f"local_nombre.ilike.%{name}%,visitante_nombre.ilike.%{name}%"
        ).order("jornada_numero", desc=desc)
        if limit:
            query = query.limit(limit)
        res = query.execute()
        actas = res.data or []
        if actas:
            logger.info("Actas for '%s': %d rows (name search='%s')", rival_nombre, len(actas), name)
            return actas

    # Strategy 3: find cod_actas via jornadas (jornadas always have correct team names)
    try:
        jornadas_res = supabase.table("rfef_jornadas").select(
            "numero, partidos"
        ).eq("competicion_id", comp_id).order("numero", desc=desc).execute()

        cod_actas = []
        cod_acta_names: dict[str, dict[str, str]] = {}  # cod_acta -> {local, visitante}
        for jornada in jornadas_res.data or []:
            for partido in jornada.get("partidos", []):
                local = (partido.get("local") or "").lower()
                visitante = (partido.get("visitante") or "").lower()
                rival_lower = rival_nombre.lower()
                core_lower = core.lower()

                is_match = (
                    _match_rival_name(rival_lower, local) or
                    _match_rival_name(rival_lower, visitante) or
                    _match_rival_name(core_lower, local) or
                    _match_rival_name(core_lower, visitante)
                )
                if is_match and partido.get("cod_acta"):
                    cod_acta = partido["cod_acta"]
                    cod_actas.append(cod_acta)
                    cod_acta_names[str(cod_acta)] = {
                        "local": partido.get("local", ""),
                        "visitante": partido.get("visitante", ""),
                    }

        if cod_actas:
            if limit:
                cod_actas = cod_actas[:limit]
            # Ensure cod_acta is in the select so we can match back
            query_cols = columns
            if "cod_acta" not in columns:
                query_cols = f"cod_acta, {columns}"
            actas_query = supabase.table("rfef_actas").select(query_cols).in_(
                "cod_acta", cod_actas
            ).order("jornada_numero", desc=desc)
            res = actas_query.execute()
            actas = res.data or []
            if actas:
                # Enrich actas with team names from jornadas when acta names are empty
                for acta in actas:
                    if not acta.get("local_nombre") and not acta.get("visitante_nombre"):
                        names = cod_acta_names.get(str(acta.get("cod_acta", "")), {})
                        if names:
                            acta["local_nombre"] = names.get("local", "")
                            acta["visitante_nombre"] = names.get("visitante", "")
                logger.info(
                    "Actas for '%s': %d rows (jornadas fallback, %d cod_actas matched)",
                    rival_nombre, len(actas), len(cod_actas),
                )
                return actas

        logger.warning("No actas found for '%s' (tried names + jornadas fallback)", rival_nombre)
    except Exception as e:
        logger.warning("Jornadas fallback failed for '%s': %s", rival_nombre, e)

    return []


def _is_rival_local(acta: dict, rival_nombre: str) -> bool | None:
    """Determine if the rival is the local team in an acta.

    Tries full name and core name matching against both local_nombre
    and visitante_nombre. Returns None if names are empty/unknown
    (caller should try both sides).
    """
    local = (acta.get("local_nombre") or "").lower()
    visitante = (acta.get("visitante_nombre") or "").lower()
    rival_lower = rival_nombre.lower()
    core_lower = _extract_core_name(rival_nombre).lower()

    # Check if rival is local
    if local and (_match_rival_name(rival_lower, local) or _match_rival_name(core_lower, local)):
        return True
    # Check if rival is visitante
    if visitante and (_match_rival_name(rival_lower, visitante) or _match_rival_name(core_lower, visitante)):
        return False
    # Names are empty — unknown
    return None


def _get_rival_data(acta: dict, rival_nombre: str, local_key: str, visitante_key: str) -> list:
    """Get the rival's data from acta, handling empty names gracefully.

    When names are empty (can't determine side), takes the side with MORE data
    as a heuristic (the rival team is more likely to be fully populated).
    """
    side = _is_rival_local(acta, rival_nombre)
    if side is True:
        return acta.get(local_key) or []
    elif side is False:
        return acta.get(visitante_key) or []
    else:
        # Unknown side — pick the one with more data
        local_data = acta.get(local_key) or []
        visitante_data = acta.get(visitante_key) or []
        # Heuristic: we can't tell, so we try both sides — but for most use cases
        # (once probable, tarjetas), we need to pick one. Use visitante as default
        # since most queries are for away opponents.
        return visitante_data if visitante_data else local_data


def _get_once_probable(supabase, comp_id: str, rival_nombre: str, tarjetas_data: dict | None = None) -> dict:
    """Calculate probable starting XI from last 5 actas, with sanction flags."""
    actas = _query_actas(
        supabase, comp_id, rival_nombre,
        "local_nombre, visitante_nombre, titulares_local, titulares_visitante, jornada_numero",
        desc=True, limit=5,
    )

    player_counts: Counter = Counter()
    player_dorsals: dict[str, int | None] = {}
    actas_with_data = 0

    for acta in actas:
        titulares = _get_rival_data(acta, rival_nombre, "titulares_local", "titulares_visitante")

        if titulares:
            actas_with_data += 1
        for jugador in titulares:
            nombre = jugador.get("nombre", "").strip()
            if nombre:
                player_counts[nombre] += 1
                if nombre not in player_dorsals:
                    player_dorsals[nombre] = jugador.get("dorsal")

    logger.info("Once probable for '%s': %d actas fetched, %d with data, %d players", rival_nombre, len(actas), actas_with_data, len(player_counts))

    # Build set of sanctioned player names from tarjetas data
    sancionados = set()
    if tarjetas_data:
        for j in tarjetas_data.get("jugadores", []):
            if j.get("estado") == "Sancionado":
                sancionados.add(j.get("nombre", ""))

    all_players = player_counts.most_common()
    return {
        "actas_analizadas": actas_with_data,
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


def _get_expected_jornadas(supabase, comp_id: str, team_nombre: str) -> set[int]:
    """Get jornada numbers where the team was expected to play (from rfef_jornadas)."""
    jornadas_res = supabase.table("rfef_jornadas").select(
        "numero, partidos"
    ).eq("competicion_id", comp_id).order("numero").execute()

    expected = set()
    team_lower = team_nombre.lower()
    core_lower = _extract_core_name(team_nombre).lower()

    for jornada in jornadas_res.data or []:
        for partido in jornada.get("partidos", []):
            local = (partido.get("local") or "").lower()
            visitante = (partido.get("visitante") or "").lower()
            if (
                _match_rival_name(team_lower, local) or
                _match_rival_name(team_lower, visitante) or
                _match_rival_name(core_lower, local) or
                _match_rival_name(core_lower, visitante)
            ):
                expected.add(jornada["numero"])
                break

    return expected


def _get_played_jornadas(supabase, comp_id: str, team_nombre: str) -> set[int]:
    """Get jornada numbers where the team actually PLAYED (match has results)."""
    jornadas_res = supabase.table("rfef_jornadas").select(
        "numero, partidos"
    ).eq("competicion_id", comp_id).order("numero").execute()

    played = set()
    team_lower = team_nombre.lower()
    core_lower = _extract_core_name(team_nombre).lower()

    for jornada in jornadas_res.data or []:
        for partido in jornada.get("partidos", []):
            local = (partido.get("local") or "").lower()
            visitante = (partido.get("visitante") or "").lower()
            has_result = partido.get("goles_local") is not None
            if has_result and (
                _match_rival_name(team_lower, local) or
                _match_rival_name(team_lower, visitante) or
                _match_rival_name(core_lower, local) or
                _match_rival_name(core_lower, visitante)
            ):
                played.add(jornada["numero"])
                break

    return played


def _acta_has_lineup_data(acta: dict, team_nombre: str) -> bool:
    """Check if the acta has lineup data (titulares) for the given team."""
    titulares = _get_rival_data(acta, team_nombre, "titulares_local", "titulares_visitante")
    return bool(titulares)


def _group_cards_by_player(tarjetas: list[dict]) -> dict[str, list[str]]:
    """Group card types by player name. Returns {name: [tipo, tipo, ...]}."""
    grouped: dict[str, list[str]] = {}
    for t in tarjetas:
        nombre = t.get("jugador", "").strip()
        tipo = t.get("tipo", "")
        if not nombre or not tipo:
            continue
        grouped.setdefault(nombre, []).append(tipo)
    return grouped


def _parse_sancion_match_count(descripcion: str) -> int | None:
    """Extract number of match suspension from official sanction description.

    Examples:
        "1 Partido de suspensión y multa accesoria..." → 1
        "2 Partidos de suspensión..." → 2
        "SUSPENSION POR UN PARTIDO" → 1
    """
    if not descripcion:
        return None

    desc = descripcion.upper()

    # Try numeric: "2 PARTIDOS", "1 PARTIDO"
    m = re.search(r"(\d+)\s*PARTIDO", desc)
    if m:
        return int(m.group(1))

    # Try word-based
    word_map = {
        "UN PARTIDO": 1, "UN (1) PARTIDO": 1,
        "DOS PARTIDO": 2, "DOS (2) PARTIDO": 2,
        "TRES PARTIDO": 3, "TRES (3) PARTIDO": 3,
        "CUATRO PARTIDO": 4,
        "CINCO PARTIDO": 5,
    }
    for pattern, count in word_map.items():
        if pattern in desc:
            return count

    return None


def _parse_amonestacion_number(descripcion: str) -> int | None:
    """Extract yellow card cycle number from official sanction description.

    The RFEF sanctions page tracks cumulative yellows within a cycle:
    - "Primera amonestación" → 1
    - "Segunda amonestación" → 2
    - "Tercera amonestación" → 3
    - "Cuarta amonestación" → 4 (apercibido — one more = ban)
    After 5th yellow + suspension, cycle resets and count starts over.
    """
    if not descripcion:
        return None

    desc = descripcion.upper()

    # Must contain "AMONESTA" to be an amonestación entry
    if "AMONESTA" not in desc:
        return None

    word_map = {
        "PRIMERA": 1, "SEGUNDA": 2, "TERCERA": 3,
        "CUARTA": 4, "QUINTA": 5,
    }
    for word, num in word_map.items():
        if word in desc:
            return num

    return None


def _compute_card_states(
    supabase,
    comp_id: str,
    team_nombre: str,
    target_jornada: int | None = None,
    sanciones_oficiales: list[dict] | None = None,
) -> dict:
    """Build card state from official sanctions (source of truth).

    Official sanctions track card accumulation accurately:
    - "Primera/Segunda/Tercera/Cuarta amonestación" = Nth yellow in current cycle
    - "1 Partido de suspensión por acumulación" = 5th yellow → ban → cycle resets
    - "X Partidos de suspensión por [grave]" = direct suspension
    - "doble amonestación" = double yellow → 1 match ban

    Actas are used only for metadata (jornadas_sin_datos, total_actas).
    """
    # --- Metadata from actas ---
    actas = _query_actas(
        supabase, comp_id, team_nombre,
        "local_nombre, visitante_nombre, tarjetas_local, tarjetas_visitante, "
        "titulares_local, titulares_visitante, jornada_numero",
    )

    actas_by_jornada: dict[int, dict] = {}
    for acta in actas:
        j_num = acta.get("jornada_numero")
        if j_num is not None:
            actas_by_jornada[j_num] = acta

    expected = _get_expected_jornadas(supabase, comp_id, team_nombre)
    played = _get_played_jornadas(supabase, comp_id, team_nombre)
    max_played = max(played) if played else 0
    if target_jornada is None:
        target_jornada = max_played + 1

    jornadas_sin_datos = [
        j for j in sorted(expected)
        if j <= max_played and j not in actas_by_jornada
    ]

    actas_with_cards = 0
    for acta in actas:
        tarjetas = _get_rival_data(acta, team_nombre, "tarjetas_local", "tarjetas_visitante")
        if tarjetas:
            actas_with_cards += 1

    # --- Build state from official sanctions (source of truth) ---
    if not sanciones_oficiales:
        sanciones_oficiales = []

    # Filter to jugador category and sort chronologically
    player_sanciones = [
        s for s in sanciones_oficiales if s.get("categoria") == "jugador"
    ]
    player_sanciones.sort(key=lambda s: s.get("jornada_numero") or 0)

    players: dict[str, dict] = {}

    def ensure_player(name: str):
        if name not in players:
            players[name] = {
                "ciclo": 0,
                "total_amarillas": 0,
                "rojas": 0,
                "suspension_remaining": 0,
                "motivo": None,
                "last_card_jornada": None,
                "ciclos_cumplidos": 0,
            }

    for san in player_sanciones:
        nombre = (san.get("persona_nombre") or "").strip()
        if not nombre:
            continue
        jornada = san.get("jornada_numero") or 0
        desc = san.get("descripcion") or ""
        ensure_player(nombre)
        p = players[nombre]

        # Parse amonestación (yellow card count in cycle)
        amon = _parse_amonestacion_number(desc)
        if amon is not None:
            p["ciclo"] = amon
            p["total_amarillas"] += 1
            p["last_card_jornada"] = jornada

        # Parse suspension
        match_count = _parse_sancion_match_count(desc)
        if match_count and match_count > 0:
            # Count jornadas the team ACTUALLY PLAYED after the sancion jornada
            jornadas_after = sum(1 for j in played if j > jornada)
            remaining = max(0, match_count - jornadas_after)
            p["last_card_jornada"] = jornada

            desc_lower = desc.lower()
            is_accumulation = "acumulaci" in desc_lower
            is_doble = "doble amonestaci" in desc_lower or "doble-amonestaci" in desc_lower

            if is_accumulation:
                p["ciclos_cumplidos"] += 1
                p["total_amarillas"] += 1  # The 5th yellow
                # Cycle resets after accumulation suspension is served
                if remaining <= 0:
                    p["ciclo"] = 0
                    p["motivo"] = None
                else:
                    p["ciclo"] = 0
                    p["suspension_remaining"] = remaining
                    p["motivo"] = "ciclo_amarillas"
            elif is_doble:
                # Double yellow = red card, does NOT count towards yellow accumulation
                p["rojas"] += 1
                if remaining > 0:
                    p["suspension_remaining"] = remaining
                    p["motivo"] = "doble_amarilla"
                else:
                    p["motivo"] = None
            else:
                # Direct suspension (grave offense: aggression, insults, etc.)
                if remaining > p["suspension_remaining"]:
                    p["suspension_remaining"] = remaining
                    p["motivo"] = "sancion_oficial" if remaining > 0 else None

            # Check for roja mentions
            if "roja" in desc_lower or "expuls" in desc_lower:
                p["rojas"] += 1

    # --- Build output ---
    jugadores = []
    for nombre, state in players.items():
        if state["suspension_remaining"] > 0:
            estado = "Sancionado"
        elif state["ciclo"] >= 4:
            estado = "Apercibido"
        else:
            estado = "OK"

        jugadores.append({
            "nombre": nombre,
            "amarillas": state["total_amarillas"],
            "rojas": state["rojas"],
            "ciclos_cumplidos": state["ciclos_cumplidos"],
            "estado": estado,
            "amarillas_ciclo": state["ciclo"],
            "sancionado_restantes": state["suspension_remaining"],
            "sancionado_motivo": state["motivo"],
            "ultima_tarjeta_jornada": state["last_card_jornada"],
        })

    # Sort: sancionados first, then apercibidos, then by amarillas desc
    estado_order = {"Sancionado": 0, "Apercibido": 1, "OK": 2}
    jugadores.sort(key=lambda j: (estado_order.get(j["estado"], 9), -j["amarillas"], -j["rojas"]))

    return {
        "total_actas": len(actas),
        "actas_con_tarjetas": actas_with_cards,
        "jornadas_sin_datos": jornadas_sin_datos,
        "jornada_objetivo": target_jornada,
        "jugadores": jugadores,
    }


def _get_tarjetas(
    supabase,
    comp_id: str,
    rival_nombre: str,
    sanciones_oficiales: list[dict] | None = None,
) -> dict:
    """Aggregate card statistics using chronological state machine.

    Backwards-compatible wrapper around _compute_card_states().
    """
    return _compute_card_states(
        supabase, comp_id, rival_nombre,
        sanciones_oficiales=sanciones_oficiales,
    )


def _get_sanciones_oficiales(supabase, comp_id: str, rival_nombre: str) -> list[dict]:
    """Get ALL official sanctions for the team from rfef_sanciones.

    Returns all sanctions (not limited) since we need the full history
    to accurately track yellow card cycles and suspensions.
    """
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

        # Sort chronologically (needed for state machine processing)
        sanciones.sort(key=lambda x: x.get("jornada_numero") or 0)
        return sanciones
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

    # Goleadores (try competition page data first, fallback to actas)
    goleadores = _get_goleadores_rival(comp, rival_nombre)
    if not goleadores:
        goleadores = _get_goleadores_from_actas(supabase, comp_id, rival_nombre)
    if goleadores:
        intel["goleadores_rival"] = goleadores

    # Sanciones oficiales (fetch first, needed by tarjetas engine)
    sanciones = _get_sanciones_oficiales(supabase, comp_id, rival_nombre)
    if sanciones:
        intel["sanciones_oficiales"] = sanciones

    # Tarjetas (fetch before once probable for sanction cross-reference)
    tarjetas = None
    try:
        tarjetas = _get_tarjetas(supabase, comp_id, rival_nombre, sanciones_oficiales=sanciones or None)
        if tarjetas.get("jugadores"):
            intel["tarjetas"] = tarjetas
    except Exception as e:
        logger.debug("Error getting tarjetas: %s", e)

    # Once probable (with sanction cross-reference)
    try:
        once = _get_once_probable(supabase, comp_id, rival_nombre, tarjetas_data=tarjetas)
        if once.get("actas_analizadas", 0) > 0:
            intel["once_probable"] = once
    except Exception as e:
        logger.warning("Error getting once probable for '%s': %s", rival_nombre, e, exc_info=True)

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
