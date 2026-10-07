"""Tiempo efectivo de una tarea: reloj menos descanso.

El reloj (`duracion_total` / `duracion_override`) es lo que dura el bloque.
El trabajo (`minutos_efectivos`) es lo que entra en carga interna/externa.
"""

from __future__ import annotations

import re
from typing import Any, Optional

_MARGEN_EFE_RE = re.compile(r"\n?\[\[efe:(\d+)\]\]\s*$")

COMPENSATORIO_MIN_LANES = 2
COMPENSATORIO_MAX_LANES = 8
COMPENSATORIO_DEFAULT_LANES = 2
COMPENSATORIO_FASES = tuple(f"compensatorio_{i}" for i in range(1, COMPENSATORIO_MAX_LANES + 1))
LEGACY_MINUTES_MAX = 10


def normalize_descanso_seconds(raw: Any) -> int:
    """`tiempo_descanso` se guarda en segundos; 1–10 se leen como minutos legacy."""
    try:
        n = float(raw)
    except (TypeError, ValueError):
        return 0
    if n <= 0:
        return 0
    rounded = int(round(n))
    if rounded <= LEGACY_MINUTES_MAX:
        return rounded * 60
    return rounded


def minutos_efectivos_catalogo(
    duracion_total: Any,
    tiempo_descanso: Any = None,
    num_series: Any = None,
) -> int:
    """Minutos de trabajo de la ficha: duración − descanso entre series."""
    try:
        clock = int(duracion_total or 0)
    except (TypeError, ValueError):
        clock = 0
    if clock <= 0:
        return 0
    rest_min = normalize_descanso_seconds(tiempo_descanso) / 60.0
    try:
        series = int(num_series or 1)
    except (TypeError, ValueError):
        series = 1
    total_rest = rest_min * max(series - 1, 0) if series > 1 else rest_min
    return max(0, int(round(clock - total_rest)))


def clock_minutos_sesion_tarea(st: dict) -> int:
    tarea = _tarea_dict(st)
    try:
        return int(st.get("duracion_override") or tarea.get("duracion_total") or 0)
    except (TypeError, ValueError):
        return 0


def minutos_carga_sesion_tarea(st: dict) -> int:
    """Override de sesión o, si no hay, default de la ficha sobre el reloj actual."""
    raw = st.get("minutos_efectivos")
    if raw is not None and raw != "":
        try:
            return max(0, int(raw))
        except (TypeError, ValueError):
            pass
    tarea = _tarea_dict(st)
    clock = clock_minutos_sesion_tarea(st)
    return minutos_efectivos_catalogo(
        clock,
        tarea.get("tiempo_descanso"),
        tarea.get("num_series"),
    )


def is_compensatorio_fase(fase: Optional[str]) -> bool:
    return compensatorio_lane_index(fase) is not None


def compensatorio_lane_index(fase: Optional[str]) -> Optional[int]:
    fase_s = str(fase or "")
    if not fase_s.startswith("compensatorio_"):
        return None
    try:
        n = int(fase_s.split("_", 1)[1])
    except (IndexError, ValueError):
        return None
    if 1 <= n <= COMPENSATORIO_MAX_LANES:
        return n - 1
    return None


def fase_for_lane(index: int) -> str:
    n = max(1, min(COMPENSATORIO_MAX_LANES, int(index) + 1))
    return f"compensatorio_{n}"


def clamp_lane_count(n: Any) -> int:
    try:
        count = int(n)
    except (TypeError, ValueError):
        count = COMPENSATORIO_DEFAULT_LANES
    return max(COMPENSATORIO_MIN_LANES, min(COMPENSATORIO_MAX_LANES, count))


def empty_compensatorio_lane(index: int) -> dict:
    return {
        "id": f"lane-{index + 1}",
        "label": f"Grupo {chr(65 + index)}",
        "jugador_ids": [],
    }


def empty_compensatorio_lanes(count: int = COMPENSATORIO_DEFAULT_LANES) -> list[dict]:
    n = clamp_lane_count(count)
    return [empty_compensatorio_lane(i) for i in range(n)]


def _normalize_lane(lane: Any, index: int) -> dict:
    fallback = empty_compensatorio_lane(index)
    if not isinstance(lane, dict):
        return fallback
    ids = lane.get("jugador_ids") or []
    if not isinstance(ids, list):
        ids = []
    return {
        "id": lane.get("id") or fallback["id"],
        "label": lane.get("label") or fallback["label"],
        "jugador_ids": [str(x) for x in ids if x],
    }


def lanes_from_bloque(bloque: dict | None) -> list[dict]:
    if not isinstance(bloque, dict):
        return empty_compensatorio_lanes()
    data = bloque.get("compensatorio") or {}
    lanes = data.get("lanes") if isinstance(data, dict) else None
    if not isinstance(lanes, list) or not lanes:
        return empty_compensatorio_lanes()
    n = clamp_lane_count(len(lanes))
    return [_normalize_lane(lanes[i] if i < len(lanes) else None, i) for i in range(n)]


def player_compensatorio_fases(estructura: list | None, jugador_id: str) -> set[str]:
    """Fases compensatorio_* en las que está asignado el jugador."""
    fases: set[str] = set()
    jid = str(jugador_id)
    for bloque in estructura or []:
        if not isinstance(bloque, dict) or bloque.get("tipo") != "compensatorio":
            continue
        for i, lane in enumerate(lanes_from_bloque(bloque)):
            if jid in {str(x) for x in lane.get("jugador_ids") or []}:
                fases.add(fase_for_lane(i))
    return fases


def is_partial_participation(tipos: Any) -> bool:
    """Margen o fisio sin hacer la sesión entera.

    Vacío, «sesion» o «presente» cuentan el bloque completo. Sesión + margen
    sigue siendo sesión entera (los minutos de margen se suman aparte).
    """
    cleaned = [str(t) for t in (tipos or []) if t]
    if not cleaned or "sesion" in cleaned or "presente" in cleaned:
        return False
    return "margen" in cleaned or "fisio" in cleaned


def margin_minutes_for_tipos(tipos: Any, plan_minutes: Any) -> int:
    """Minutos del plan al margen que entran en la carga de ese jugador."""
    try:
        plan = max(0, int(plan_minutes or 0))
    except (TypeError, ValueError):
        plan = 0
    cleaned = [str(t) for t in (tipos or []) if t]
    if "margen" in cleaned or is_partial_participation(cleaned):
        return plan
    return 0


def minutos_plan_margen(tareas: list | None, duracion_estimada: Any = None) -> int:
    """Tiempo efectivo del trabajo al margen.

    Si hay ejercicios, suma su tiempo efectivo (o la duración si no se asignó).
    Sin ejercicios, vale la duración estimada del plan. No se suman las dos.
    """
    rows = [t for t in (tareas or []) if isinstance(t, dict)]
    if rows:
        total = 0
        for tarea in rows:
            raw = tarea.get("minutos_efectivos")
            if raw is not None and raw != "":
                try:
                    total += max(0, int(raw))
                    continue
                except (TypeError, ValueError):
                    pass
            try:
                total += max(0, int(tarea.get("duracion") or 0))
            except (TypeError, ValueError):
                pass
        return total
    try:
        return max(0, int(duracion_estimada or 0))
    except (TypeError, ValueError):
        return 0


def named_players_on_task(st: dict) -> list:
    """Ids marcados en la columna o, si aún no existe, dentro de la formación."""
    raw = st.get("jugadores_margen") or []
    if not isinstance(raw, list) or not raw:
        form = st.get("formacion_equipos")
        if isinstance(form, dict):
            raw = form.get("jugadores_margen") or []
    if not isinstance(raw, list):
        return []
    return [x for x in raw if x]


def player_named_on_task(st: dict, jugador_id: str) -> bool:
    jid = str(jugador_id)
    return any(str(x) == jid for x in named_players_on_task(st))


def split_margen_efectivo(notas: Any, minutos_efectivos: Any = None) -> tuple[Optional[str], Optional[int]]:
    """Separa el marcador [[efe:N]] de las notas del ejercicio al margen.

    Sirve mientras la columna minutos_efectivos no está en la base.
    """
    text = "" if notas is None else str(notas)
    match = _MARGEN_EFE_RE.search(text)
    parsed = int(match.group(1)) if match else None
    clean = _MARGEN_EFE_RE.sub("", text).strip()
    efectivos = minutos_efectivos
    if efectivos is None or efectivos == "":
        efectivos = parsed
    try:
        efectivos_n = None if efectivos is None or efectivos == "" else max(0, int(efectivos))
    except (TypeError, ValueError):
        efectivos_n = parsed
    return (clean or None), efectivos_n


def stamp_margen_notas(notas: Any, minutos_efectivos: Any) -> Optional[str]:
    clean, _ = split_margen_efectivo(notas, None)
    if minutos_efectivos is None or minutos_efectivos == "":
        return clean
    try:
        n = max(0, int(minutos_efectivos))
    except (TypeError, ValueError):
        return clean
    base = clean or ""
    return f"{base}\n[[efe:{n}]]".strip()


def _partido_minutes(estructura: list | None, jugador_id: str) -> int:
    total = 0
    jid = str(jugador_id)
    for bloque in estructura or []:
        if not isinstance(bloque, dict) or bloque.get("tipo") != "partido_condicionado":
            continue
        partido = bloque.get("partido") or {}
        if not isinstance(partido, dict):
            continue
        peto = list((partido.get("equipo_peto") or {}).values())
        sin = list((partido.get("equipo_sin_peto") or {}).values())
        ids = {str(x) for x in peto + sin if x}
        if jid not in ids:
            continue
        try:
            total += int(partido.get("duracion_min") or bloque.get("duracion_objetivo") or 0)
        except (TypeError, ValueError):
            pass
    return total


def player_session_minutes(
    sesion_tareas: list[dict],
    estructura: list | None,
    jugador_id: str,
    *,
    parcial: bool = False,
    minutos_margen: int = 0,
) -> int:
    """Minutos efectivos que ese jugador trabajó (lanes paralelos no se suman al resto).

    Un jugador parcial (margen o fisio, sin sesión completa) solo suma las tareas
    en las que está nombrado, más el tiempo de su trabajo al margen.
    """
    jid = str(jugador_id)
    total = 0
    if parcial:
        for st in sesion_tareas or []:
            if player_named_on_task(st, jid):
                total += minutos_carga_sesion_tarea(st)
    else:
        fases = player_compensatorio_fases(estructura, jid)
        for st in sesion_tareas or []:
            fase = st.get("fase_sesion")
            if is_compensatorio_fase(fase) and fase not in fases:
                continue
            total += minutos_carga_sesion_tarea(st)
    total += _partido_minutes(estructura, jid)
    try:
        total += max(0, int(minutos_margen or 0))
    except (TypeError, ValueError):
        pass
    return total


def _tarea_dict(st: dict) -> dict:
    tarea = st.get("tarea") or st.get("tareas") or {}
    return tarea if isinstance(tarea, dict) else {}
