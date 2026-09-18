"""
TrainingHub Pro - Pre-Match Intelligence Service
Auto-populates pre-match intel from RFEF data (clasificacion, goleadores,
once probable, tarjetas, sanciones, resultados, head-to-head).
"""

import logging
import re
import unicodedata
from collections import Counter
from datetime import datetime, date, timedelta

from app.services.rfef_acta_utils import goal_minuto

logger = logging.getLogger(__name__)

# Common Spanish club prefixes to strip for fuzzy acta matching
_CLUB_PREFIXES = re.compile(
    r"^(AA\.?\s*AA\.?|A\.?A\.?|C\.?D\.?|C\.?F\.?|U\.?D\.?|S\.?D\.?|R\.?C\.?D\.?|"
    r"A\.?D\.?|E\.?F\.?|C\.?P\.?|F\.?C\.?|R\.?C\.?|Atco\.?|Atletico|Atlético|"
    r"Club|Agrupacion|Agrupación)\s+",
    re.IGNORECASE,
)
# Filial / category suffixes: "San Vicente" is not "San Vicente B"
_TEAM_SUFFIXES = re.compile(
    r"\s+(b|c|d|a|fem(?:enino)?|femenina|juvenil|cadete|infantil|filial)$",
    re.IGNORECASE,
)
_NAME_STOPWORDS = {"de", "del", "la", "el", "los", "las", "y", "i", "da", "do"}


def _fold_name(name: str) -> str:
    nfd = unicodedata.normalize("NFD", (name or "").lower().strip())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def _extract_core_name(name: str) -> str:
    """Extract the distinctive 'core' of a team name by stripping common prefixes.

    'AA.AA. COLSPE' -> 'COLSPE'
    'C.D. Mirandés' -> 'Mirandés'
    'U.D. Almería'  -> 'Almería'
    """
    core = _CLUB_PREFIXES.sub("", (name or "").strip())
    # If stripping removed everything or left < 3 chars, use original
    if len(core) < 3:
        return (name or "").strip()
    return core.strip()


def _split_team_identity(name: str) -> tuple[str, str]:
    """Return (folded core without filial suffix, suffix like 'b' or '')."""
    folded = _fold_name(_extract_core_name(name))
    m = _TEAM_SUFFIXES.search(folded)
    if m:
        return folded[: m.start()].strip(), m.group(1).lower()
    return folded, ""


def _name_tokens(name: str) -> list[str]:
    base, _suffix = _split_team_identity(name)
    return [
        t for t in re.split(r"[\s.\-,/]+", base)
        if t and t not in _NAME_STOPWORDS and len(t) >= 2
    ]


def _match_rival_name(rival_nombre: str, team_name: str) -> bool:
    """Match club names without treating the user's club as the rival.

    Senior vs B/filial are different teams. Raw substring matching
    ('san vicente' in 'san vicente b', 'alcoy' in 'alcoyano') is not enough.
    """
    a = (rival_nombre or "").strip()
    b = (team_name or "").strip()
    if not a or not b:
        return False
    if _fold_name(a) == _fold_name(b):
        return True
    base_a, suf_a = _split_team_identity(a)
    base_b, suf_b = _split_team_identity(b)
    if suf_a != suf_b:
        return False
    if base_a and base_a == base_b:
        return True
    tokens_a = _name_tokens(a)
    tokens_b = _name_tokens(b)
    if not tokens_a or not tokens_b:
        return False
    if tokens_a == tokens_b:
        return True
    shorter, longer = (
        (tokens_a, tokens_b) if len(tokens_a) <= len(tokens_b) else (tokens_b, tokens_a)
    )
    if not all(t in longer for t in shorter):
        return False
    return any(len(t) >= 4 for t in shorter)


def _pct_victoria(pg: int | None, pe: int | None, pp: int | None) -> float | None:
    """Win percentage from W/D/L counts."""
    pg = pg or 0
    pe = pe or 0
    pp = pp or 0
    pj = pg + pe + pp
    if pj <= 0:
        return None
    return round(pg / pj * 100, 1)


def _clasificacion_match_rank(rival_nombre: str, equipo_nombre: str) -> int | None:
    """Lower is better. Exact name beats core name beats token overlap."""
    a = (rival_nombre or "").strip()
    b = (equipo_nombre or "").strip()
    if not a or not b or not _match_rival_name(a, b):
        return None
    if _fold_name(a) == _fold_name(b):
        return 0
    base_a, suf_a = _split_team_identity(a)
    base_b, suf_b = _split_team_identity(b)
    if base_a and base_a == base_b and suf_a == suf_b:
        return 1
    return 2 + abs(len(base_a) - len(base_b))


def _is_mi_equipo_row(equipo_nombre: str, mi_equipo: str | None, rival_nombre: str) -> bool:
    """True when this standing/acta side is the user's club, not the rival."""
    if not mi_equipo:
        return False
    # Looking up ourselves (plantilla cards, etc.) — do not exclude.
    if _match_rival_name(mi_equipo, rival_nombre):
        return False
    mi_rank = _clasificacion_match_rank(mi_equipo, equipo_nombre)
    if mi_rank is None:
        return False
    rival_rank = _clasificacion_match_rank(rival_nombre, equipo_nombre)
    if rival_rank is None:
        return True
    return mi_rank <= rival_rank


def _get_clasificacion(
    comp: dict, rival_nombre: str, mi_equipo: str | None = None,
) -> dict | None:
    """Extract rival's standing from competition clasificacion."""
    clasificacion = comp.get("clasificacion") or []

    ranked: list[tuple[int, dict]] = []
    for equipo in clasificacion:
        eq_name = equipo.get("equipo") or ""
        if _is_mi_equipo_row(eq_name, mi_equipo, rival_nombre):
            continue
        rank = _clasificacion_match_rank(rival_nombre, eq_name)
        if rank is not None:
            ranked.append((rank, equipo))
    if not ranked:
        return None
    ranked.sort(key=lambda item: item[0])
    equipo = ranked[0][1]
    pg_casa = equipo.get("pg_casa")
    pe_casa = equipo.get("pe_casa")
    pp_casa = equipo.get("pp_casa")
    pg_fuera = equipo.get("pg_fuera")
    pe_fuera = equipo.get("pe_fuera")
    pp_fuera = equipo.get("pp_fuera")
    pj_casa = (pg_casa or 0) + (pe_casa or 0) + (pp_casa or 0)
    pj_fuera = (pg_fuera or 0) + (pe_fuera or 0) + (pp_fuera or 0)
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
        "pg_casa": pg_casa,
        "pe_casa": pe_casa,
        "pp_casa": pp_casa,
        "pg_fuera": pg_fuera,
        "pe_fuera": pe_fuera,
        "pp_fuera": pp_fuera,
        "pj_casa": pj_casa or None,
        "pj_fuera": pj_fuera or None,
        "pct_victoria_casa": _pct_victoria(pg_casa, pe_casa, pp_casa),
        "pct_victoria_fuera": _pct_victoria(pg_fuera, pe_fuera, pp_fuera),
    }


MINUTE_BUCKETS: list[tuple[str, int, int]] = [
    ("0-15", 0, 15),
    ("16-30", 16, 30),
    ("31-45", 31, 45),
    ("46-60", 46, 60),
    ("61-75", 61, 75),
    ("76-90+", 76, 130),
]


def _minute_bucket(minuto: int) -> str:
    for label, lo, hi in MINUTE_BUCKETS:
        if lo <= minuto <= hi:
            return label
    return "76-90+"


def _fold_player(name: str) -> str:
    return _fold_name(name)


def _normalize_roster(players: list) -> set[str]:
    names: set[str] = set()
    for j in players:
        name = _fold_player((j.get("nombre") or "").strip())
        if name:
            names.add(name)
    return names


def _player_in_set(jugador: str, players: set[str]) -> bool:
    """Match a scorer to a roster allowing last-name uniqueness and accents."""
    j = _fold_player(jugador)
    if not j or not players:
        return False
    folded = {_fold_player(p) for p in players}
    if j in folded:
        return True
    last = j.split()[-1]
    if len(last) < 4:
        return False
    hits = 0
    for p in folded:
        parts = p.split()
        pl = parts[-1] if parts else ""
        if p == last or pl == last or last in parts:
            hits += 1
            if hits > 1:
                return False
    return hits == 1


def _roster_names(
    acta: dict, rival_nombre: str, mi_equipo: str | None = None,
) -> tuple[set[str], set[str] | None]:
    """Return (rival_players, opponent_players) name sets for an acta."""
    titulares_rival = _get_rival_data(
        acta, rival_nombre, "titulares_local", "titulares_visitante", mi_equipo,
    )
    suplentes_rival = _get_rival_data(
        acta, rival_nombre, "suplentes_local", "suplentes_visitante", mi_equipo,
    )
    rival_players = _normalize_roster(titulares_rival + suplentes_rival)

    side = _is_rival_local(acta, rival_nombre, mi_equipo)
    opponent_players: set[str] | None = None
    if side is True:
        opponent_list = (acta.get("titulares_visitante") or []) + (acta.get("suplentes_visitante") or [])
        opponent_players = _normalize_roster(opponent_list)
    elif side is False:
        opponent_list = (acta.get("titulares_local") or []) + (acta.get("suplentes_local") or [])
        opponent_players = _normalize_roster(opponent_list)

    return rival_players, opponent_players


def _parcial_scored_by_rival(
    gol: dict,
    is_local: bool | None,
    prev_parcial: tuple[int, int] | None,
) -> bool | None:
    """Attribute a goal from the scoreboard delta. Marcador is source of truth."""
    if is_local is None or prev_parcial is None:
        return None
    pl = gol.get("parcial_local")
    pv = gol.get("parcial_visitante")
    if pl is None or pv is None:
        return None
    prev_l, prev_v = prev_parcial
    local_scored = int(pl) > prev_l
    visitante_scored = int(pv) > prev_v
    if local_scored and not visitante_scored:
        return is_local
    if visitante_scored and not local_scored:
        return not is_local
    return None


def _goal_scored_by_rival(
    gol: dict,
    rival_players: set[str],
    opponent_players: set[str] | None,
    is_local: bool | None,
    prev_parcial: tuple[int, int] | None,
) -> bool | None:
    """Return True if rival scored, False if conceded, None if unknown.

    Scoreboard parcials win over player-name matching so own-goals and
    shared surnames cannot invert GF/GC against the acta marcador.
    """
    from_parcial = _parcial_scored_by_rival(gol, is_local, prev_parcial)
    if from_parcial is not None:
        return from_parcial

    jugador = (gol.get("jugador") or "").strip()
    if not jugador:
        return None
    in_rival = _player_in_set(jugador, rival_players)
    in_opp = bool(opponent_players) and _player_in_set(jugador, opponent_players)
    if in_rival and not in_opp:
        return True
    if in_opp and not in_rival:
        return False
    return None


def _iter_goal_attributions(
    goles_list: list,
    is_local: bool,
    rival_players: set[str],
    opponent_players: set[str] | None,
) -> list[tuple[int, bool]]:
    """(minuto, scored_by_rival) from an acta, walking parcials in order."""
    events: list[tuple[int, bool]] = []
    prev_parcial: tuple[int, int] | None = (0, 0)
    for gol in sorted(
        goles_list,
        key=lambda g: (goal_minuto(g) is None, goal_minuto(g) or 0),
    ):
        scored = _goal_scored_by_rival(
            gol, rival_players, opponent_players, is_local, prev_parcial,
        )
        pl = gol.get("parcial_local")
        pv = gol.get("parcial_visitante")
        if pl is not None and pv is not None:
            prev_parcial = (int(pl), int(pv))
        minuto = goal_minuto(gol)
        if minuto is None or scored is None:
            continue
        events.append((int(minuto), scored))
    return events


def _iter_parcial_attributions(goles_list: list, is_local: bool) -> list[tuple[int, bool]]:
    """Attribute only from scoreboard deltas, ignoring player names."""
    events: list[tuple[int, bool]] = []
    prev_l, prev_v = 0, 0
    for gol in sorted(
        goles_list,
        key=lambda g: (goal_minuto(g) is None, goal_minuto(g) or 0),
    ):
        pl = gol.get("parcial_local")
        pv = gol.get("parcial_visitante")
        if pl is None or pv is None:
            continue
        pl_i, pv_i = int(pl), int(pv)
        minuto = goal_minuto(gol)
        d_l = pl_i - prev_l
        d_v = pv_i - prev_v
        prev_l, prev_v = pl_i, pv_i
        if minuto is None:
            continue
        if d_l > 0:
            events.append((int(minuto), is_local))
        if d_v > 0:
            events.append((int(minuto), not is_local))
    return events


def _events_fit_score(events: list[tuple[int, bool]], gf: int, gc: int) -> bool:
    attr_gf = sum(1 for _, scored in events if scored)
    attr_gc = sum(1 for _, scored in events if not scored)
    return attr_gf == gf and attr_gc == gc


def _events_within_score(events: list[tuple[int, bool]], gf: int, gc: int) -> bool:
    attr_gf = sum(1 for _, scored in events if scored)
    attr_gc = sum(1 for _, scored in events if not scored)
    return bool(events) and attr_gf <= gf and attr_gc <= gc


def _goals_matching_marcador(
    goles_list: list,
    is_local: bool,
    rival_players: set[str],
    opponent_players: set[str] | None,
    gf: int,
    gc: int,
) -> list[tuple[int, bool]]:
    """Keep minute attributions when they don't contradict the acta score.

    Competition actas often have minutes + player names but missing
    obfuscated parcials. We still dump those minutes if the roster
    (or remaining scoreboard) can tell who scored.
    """
    named = _iter_goal_attributions(goles_list, is_local, rival_players, opponent_players)
    if _events_fit_score(named, gf, gc):
        return named
    parcials = _iter_parcial_attributions(goles_list, is_local)
    if _events_fit_score(parcials, gf, gc):
        return parcials
    if _events_within_score(named, gf, gc):
        return named
    if _events_within_score(parcials, gf, gc):
        return parcials
    return []


def _compute_racha_estado(ultimos_5: list[str]) -> dict:
    """Summarise recent form as caliente/fria/irregular/estable."""
    if not ultimos_5:
        return {
            "estado": "desconocido",
            "etiqueta": "Sin datos de racha",
            "victorias": 0,
            "empates": 0,
            "derrotas": 0,
            "puntos": 0,
            "ultimos_5": [],
        }

    victorias = sum(1 for r in ultimos_5 if r == "V")
    empates = sum(1 for r in ultimos_5 if r == "E")
    derrotas = sum(1 for r in ultimos_5 if r == "D")
    puntos = victorias * 3 + empates
    last3 = ultimos_5[-3:]
    v3 = sum(1 for r in last3 if r == "V")
    d3 = sum(1 for r in last3 if r == "D")

    if victorias >= 4 or v3 == 3:
        estado, etiqueta = "caliente", "Racha caliente — llegan con confianza y resultados"
    elif derrotas >= 4 or d3 == 3:
        estado, etiqueta = "fria", "Racha fría — baja confianza, momento vulnerable"
    elif victorias >= 2 and derrotas >= 2:
        estado, etiqueta = "irregular", "Forma irregular — alternan buenos y malos partidos"
    elif empates >= 3:
        estado, etiqueta = "estable", "Equipo sólido — muchos empates, difícil de batir"
    else:
        estado, etiqueta = "estable", "Forma moderada — sin rachas extremas"

    return {
        "estado": estado,
        "etiqueta": etiqueta,
        "victorias": victorias,
        "empates": empates,
        "derrotas": derrotas,
        "puntos": puntos,
        "ultimos_5": ultimos_5,
    }


def _empty_side_stats() -> dict:
    return {"pj": 0, "pg": 0, "pe": 0, "pp": 0, "gf": 0, "gc": 0}


def _compute_contexto_stats(
    supabase,
    comp_id: str,
    rival_nombre: str,
    clasificacion: dict | None = None,
    mi_equipo: str | None = None,
) -> dict | None:
    """Aggregate contextual stats from actas: goals by minute, halves, home/away."""
    actas = _query_actas(
        supabase,
        comp_id,
        rival_nombre,
        "local_nombre, visitante_nombre, goles, goles_local, goles_visitante, "
        "titulares_local, titulares_visitante, suplentes_local, suplentes_visitante, jornada_numero",
        mi_equipo=mi_equipo,
    )
    if not actas:
        return None

    buckets_marcados: Counter = Counter()
    buckets_encajados: Counter = Counter()
    mitad_marcados = {"1t": 0, "2t": 0}
    mitad_encajados = {"1t": 0, "2t": 0}
    casa = _empty_side_stats()
    fuera = _empty_side_stats()
    actas_con_goles_minuto = 0
    actas_rival = [
        a for a in actas if _is_rival_local(a, rival_nombre, mi_equipo) is not None
    ]
    actas_resultado = 0
    actas_detalle = 0

    for acta in actas_rival:
        is_local = _is_rival_local(acta, rival_nombre, mi_equipo)
        gl = acta.get("goles_local")
        gv = acta.get("goles_visitante")
        if is_local is None or gl is None or gv is None:
            continue

        side_stats = casa if is_local else fuera
        gf, gc = (gl, gv) if is_local else (gv, gl)
        actas_resultado += 1
        side_stats["pj"] += 1
        side_stats["gf"] += gf
        side_stats["gc"] += gc
        if gf > gc:
            side_stats["pg"] += 1
        elif gf == gc:
            side_stats["pe"] += 1
        else:
            side_stats["pp"] += 1

        goles_list = acta.get("goles") or []
        if not goles_list:
            continue
        actas_detalle += 1

        rival_players, opponent_players = _roster_names(acta, rival_nombre, mi_equipo)
        events = _goals_matching_marcador(
            goles_list, is_local, rival_players, opponent_players, gf, gc,
        )
        if not events:
            continue

        actas_con_goles_minuto += 1
        for minuto, scored in events:
            bucket = _minute_bucket(minuto)
            half = "1t" if minuto <= 45 else "2t"
            if scored:
                buckets_marcados[bucket] += 1
                mitad_marcados[half] += 1
            else:
                buckets_encajados[bucket] += 1
                mitad_encajados[half] += 1

    ultimos_5 = (clasificacion or {}).get("ultimos_5") or []
    racha = _compute_racha_estado(ultimos_5)

    total_pj = casa["pj"] + fuera["pj"]
    total_gf = casa["gf"] + fuera["gf"]
    total_gc = casa["gc"] + fuera["gc"]

    def _side_payload(stats: dict) -> dict:
        pj = stats["pj"]
        return {
            **stats,
            "pct_victoria": _pct_victoria(stats["pg"], stats["pe"], stats["pp"]),
            "media_gf": round(stats["gf"] / pj, 2) if pj else None,
            "media_gc": round(stats["gc"] / pj, 2) if pj else None,
        }

    liga_gf = total_gf if total_pj else ((clasificacion or {}).get("gf"))
    liga_gc = total_gc if total_pj else ((clasificacion or {}).get("gc"))

    return {
        "actas_analizadas": len(actas_rival),
        "actas_con_resultado": actas_resultado,
        "actas_con_goles_detalle": actas_detalle,
        "actas_con_goles_minuto": actas_con_goles_minuto,
        "datos_minuto_disponibles": actas_con_goles_minuto > 0,
        "racha": racha,
        "liga": {
            "gf": liga_gf,
            "gc": liga_gc,
            "media_gf": round(total_gf / total_pj, 2) if total_pj else None,
            "media_gc": round(total_gc / total_pj, 2) if total_pj else None,
        },
        "casa": _side_payload(casa),
        "fuera": _side_payload(fuera),
        "mitades": {
            "marcados_1t": mitad_marcados["1t"],
            "marcados_2t": mitad_marcados["2t"],
            "encajados_1t": mitad_encajados["1t"],
            "encajados_2t": mitad_encajados["2t"],
        },
        "goles_por_minuto": {
            "buckets": [label for label, _, _ in MINUTE_BUCKETS],
            "marcados": [buckets_marcados[label] for label, _, _ in MINUTE_BUCKETS],
            "encajados": [buckets_encajados[label] for label, _, _ in MINUTE_BUCKETS],
        },
    }


def _get_goleadores_rival(
    comp: dict, rival_nombre: str, mi_equipo: str | None = None,
) -> list[dict]:
    """Top 5 goleadores del rival filtrando la tabla de goleadores de la competición."""
    goleadores = comp.get("goleadores") or []
    if not goleadores:
        logger.warning("comp.goleadores is EMPTY for comp %s", comp.get("id", "?"))
        return []

    result = []
    for g in goleadores:
        equipo = g.get("equipo") or ""
        if not equipo:
            continue
        if _is_mi_equipo_row(equipo, mi_equipo, rival_nombre):
            continue
        if _match_rival_name(rival_nombre, equipo):
            result.append({
                "jugador": g.get("jugador", ""),
                "goles": g.get("goles", 0),
                "pj": g.get("pj"),
            })

    result.sort(key=lambda x: -(x.get("goles") or 0))
    logger.info("Goleadores for '%s': found %d (from %d total)", rival_nombre, len(result), len(goleadores))
    return result[:5]


def _get_goleadores_from_actas(
    supabase, comp_id: str, rival_nombre: str, mi_equipo: str | None = None,
) -> list[dict]:
    """Fallback: extract rival scorers from actas using lineup roster to filter."""
    actas = _query_actas(
        supabase, comp_id, rival_nombre,
        "local_nombre, visitante_nombre, goles, "
        "titulares_local, titulares_visitante, suplentes_local, suplentes_visitante",
        mi_equipo=mi_equipo,
    )
    if not actas:
        return []

    from collections import Counter
    goal_counts: Counter = Counter()

    for acta in actas:
        goles_list = acta.get("goles") or []
        if not goles_list:
            continue
        if _is_rival_local(acta, rival_nombre, mi_equipo) is None:
            continue

        rival_players, _opp = _roster_names(acta, rival_nombre, mi_equipo)
        if not rival_players:
            continue

        for gol in goles_list:
            jugador = (gol.get("jugador") or "").strip()
            if jugador and _player_in_set(jugador, rival_players):
                goal_counts[jugador] += 1

    if not goal_counts:
        return []

    result = [{"jugador": j, "goles": g} for j, g in goal_counts.most_common()]
    logger.info("Goleadores from actas for '%s': %d scorers", rival_nombre, len(result))
    return result[:10]


def _query_actas(
    supabase,
    comp_id: str,
    rival_nombre: str,
    columns: str,
    desc: bool = False,
    limit: int | None = None,
    mi_equipo: str | None = None,
) -> list[dict]:
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
        matched = [
            a for a in actas if _is_rival_local(a, rival_nombre, mi_equipo) is not None
        ]
        if matched:
            logger.info("Actas for '%s': %d rows (name search='%s')", rival_nombre, len(matched), name)
            return matched

    # Strategy 3: find cod_actas via jornadas (jornadas always have correct team names)
    try:
        jornadas_res = supabase.table("rfef_jornadas").select(
            "numero, partidos"
        ).eq("competicion_id", comp_id).order("numero", desc=desc).execute()

        cod_actas = []
        cod_acta_names: dict[str, dict[str, str]] = {}  # cod_acta -> {local, visitante}
        for jornada in jornadas_res.data or []:
            for partido in jornada.get("partidos", []):
                local = partido.get("local") or ""
                visitante = partido.get("visitante") or ""
                is_match = (
                    _match_rival_name(rival_nombre, local)
                    or _match_rival_name(rival_nombre, visitante)
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
                matched = [
                    a for a in actas if _is_rival_local(a, rival_nombre, mi_equipo) is not None
                ]
                if matched:
                    actas = matched
                logger.info(
                    "Actas for '%s': %d rows (jornadas fallback, %d cod_actas matched)",
                    rival_nombre, len(actas), len(cod_actas),
                )
                return actas

        logger.warning("No actas found for '%s' (tried names + jornadas fallback)", rival_nombre)
    except Exception as e:
        logger.warning("Jornadas fallback failed for '%s': %s", rival_nombre, e)

    return []


def _is_rival_local(
    acta: dict, rival_nombre: str, mi_equipo: str | None = None,
) -> bool | None:
    """Determine if the rival is the local team in an acta.

    Never attributes the user's club side to the rival. Senior vs B
    filiales are different teams. Returns None if names are empty/unknown
    or if both sides still match equally.
    """
    local = acta.get("local_nombre") or ""
    visitante = acta.get("visitante_nombre") or ""

    if _is_mi_equipo_row(local, mi_equipo, rival_nombre):
        local_rank = None
    else:
        local_rank = _clasificacion_match_rank(rival_nombre, local)

    if _is_mi_equipo_row(visitante, mi_equipo, rival_nombre):
        vis_rank = None
    else:
        vis_rank = _clasificacion_match_rank(rival_nombre, visitante)

    if local_rank is not None and vis_rank is not None:
        if local_rank < vis_rank:
            return True
        if vis_rank < local_rank:
            return False
        return None
    if local_rank is not None:
        return True
    if vis_rank is not None:
        return False
    return None


def _get_rival_data(
    acta: dict,
    rival_nombre: str,
    local_key: str,
    visitante_key: str,
    mi_equipo: str | None = None,
) -> list:
    """Get the rival's data from acta. Never guess the side (that dumped the user's club)."""
    side = _is_rival_local(acta, rival_nombre, mi_equipo)
    if side is True:
        return acta.get(local_key) or []
    if side is False:
        return acta.get(visitante_key) or []
    return []


def _get_once_probable(
    supabase, comp_id: str, rival_nombre: str, tarjetas_data: dict | None = None,
    mi_equipo: str | None = None,
) -> dict:
    """Calculate probable starting XI from last 5 actas, with sanction flags."""
    actas = _query_actas(
        supabase, comp_id, rival_nombre,
        "local_nombre, visitante_nombre, titulares_local, titulares_visitante, jornada_numero",
        desc=True, limit=5, mi_equipo=mi_equipo,
    )

    player_counts: Counter = Counter()
    player_dorsals: dict[str, int | None] = {}
    actas_with_data = 0

    for acta in actas:
        titulares = _get_rival_data(
            acta, rival_nombre, "titulares_local", "titulares_visitante", mi_equipo,
        )

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

    for jornada in jornadas_res.data or []:
        for partido in jornada.get("partidos", []):
            local = partido.get("local") or ""
            visitante = partido.get("visitante") or ""
            if (
                _match_rival_name(team_nombre, local) or
                _match_rival_name(team_nombre, visitante)
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

    for jornada in jornadas_res.data or []:
        for partido in jornada.get("partidos", []):
            local = partido.get("local") or ""
            visitante = partido.get("visitante") or ""
            has_result = partido.get("goles_local") is not None
            if has_result and (
                _match_rival_name(team_nombre, local) or
                _match_rival_name(team_nombre, visitante)
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
    mi_equipo: str | None = None,
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
        mi_equipo=mi_equipo,
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
        tarjetas = _get_rival_data(
            acta, team_nombre, "tarjetas_local", "tarjetas_visitante", mi_equipo,
        )
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
    mi_equipo: str | None = None,
) -> dict:
    """Aggregate card statistics using chronological state machine.

    Backwards-compatible wrapper around _compute_card_states().
    """
    return _compute_card_states(
        supabase, comp_id, rival_nombre,
        sanciones_oficiales=sanciones_oficiales,
        mi_equipo=mi_equipo,
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
    jornadas_res = supabase.table("rfef_jornadas").select("numero, partidos").eq(
        "competicion_id", comp_id
    ).order("numero", desc=True).execute()

    results = []
    for jornada in jornadas_res.data or []:
        for partido in jornada.get("partidos", []):
            local = partido.get("local") or ""
            visitante = partido.get("visitante") or ""
            is_involved = _match_rival_name(rival_nombre, local) or _match_rival_name(rival_nombre, visitante)

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
    mi_equipo = (comp.get("mi_equipo_nombre") or "").strip() or None

    if not rival_nombre:
        return {"error": "No rival name available"}

    intel = {
        "generated_at": datetime.utcnow().isoformat(),
        "rival_nombre": rival.get("nombre", rival_nombre),
        "rival_escudo_url": rival.get("escudo_url"),
    }

    # Clasificacion
    clasificacion = _get_clasificacion(comp, rival_nombre, mi_equipo=mi_equipo)
    if clasificacion:
        intel["clasificacion"] = clasificacion

    # Goleadores: competition table first, actas fallback
    goleadores = _get_goleadores_rival(comp, rival_nombre, mi_equipo=mi_equipo)
    if not goleadores:
        goleadores = _get_goleadores_from_actas(
            supabase, comp_id, rival_nombre, mi_equipo=mi_equipo,
        )
    if goleadores:
        intel["goleadores_rival"] = goleadores

    # Sanciones oficiales (fetch first, needed by tarjetas engine)
    sanciones = _get_sanciones_oficiales(supabase, comp_id, rival_nombre)
    if sanciones:
        intel["sanciones_oficiales"] = sanciones

    # Tarjetas (fetch before once probable for sanction cross-reference)
    tarjetas = None
    try:
        tarjetas = _get_tarjetas(
            supabase, comp_id, rival_nombre,
            sanciones_oficiales=sanciones or None, mi_equipo=mi_equipo,
        )
        if tarjetas.get("jugadores"):
            intel["tarjetas"] = tarjetas
    except Exception as e:
        logger.debug("Error getting tarjetas: %s", e)

    # Once probable (with sanction cross-reference)
    try:
        once = _get_once_probable(
            supabase, comp_id, rival_nombre, tarjetas_data=tarjetas, mi_equipo=mi_equipo,
        )
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

    # Contextual stats (goals by minute, home/away splits, form narrative)
    try:
        contexto = _compute_contexto_stats(
            supabase, comp_id, rival_nombre, clasificacion=clasificacion, mi_equipo=mi_equipo,
        )
        if contexto:
            intel["contexto_stats"] = contexto
    except Exception as e:
        logger.warning("Error computing contexto stats for '%s': %s", rival_nombre, e)

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


def refresh_rival_intel_contexto(
    supabase, rival: dict, competicion_id: str, intel: dict
) -> dict:
    """Recompute contexto_stats from live actas (cheap refresh for cached intel)."""
    rival_nombre = rival.get("rfef_nombre") or rival.get("nombre", "")
    if not rival_nombre:
        return intel

    comp_res = supabase.table("rfef_competiciones").select("*").eq(
        "id", competicion_id
    ).single().execute()
    if not comp_res.data:
        return intel

    mi_equipo = (comp_res.data.get("mi_equipo_nombre") or "").strip() or None
    clasificacion = _get_clasificacion(
        comp_res.data, rival_nombre, mi_equipo=mi_equipo,
    ) or intel.get("clasificacion")
    if clasificacion:
        intel["clasificacion"] = clasificacion

    contexto = _compute_contexto_stats(
        supabase, competicion_id, rival_nombre, clasificacion=clasificacion, mi_equipo=mi_equipo,
    )
    if contexto:
        intel["contexto_stats"] = contexto

    return intel
