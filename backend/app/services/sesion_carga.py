"""
Cálculo de carga de sesión a partir de tareas vinculadas y bloques de partido.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple


DENSIDAD_FACTOR = {
    "alta": 1.35,
    "media": 1.0,
    "baja": 0.7,
    None: 1.0,
}

CATEGORIA_FACTOR = {
    "SSG": 1.4,
    "AVD": 1.3,
    "PCO": 1.25,
    "JDP": 1.15,
    "POS": 1.1,
    "EVO": 1.2,
    "RND": 0.85,
    "ACO": 0.9,
    "ABP": 0.75,
    "POR": 0.8,
    "GYM": 1.1,
    "PRV": 0.7,
    "MOV": 0.55,
    "RCF": 0.45,
}


def _categoria_codigo(tarea: Optional[dict]) -> Optional[str]:
    if not tarea:
        return None
    cat = tarea.get("categoria") or tarea.get("categorias_tarea") or {}
    if isinstance(cat, dict):
        return cat.get("codigo") or cat.get("nombre_corto")
    return None


def carga_tarea(
    *,
    duracion_min: int,
    densidad: Optional[str] = None,
    categoria_codigo: Optional[str] = None,
    num_jugadores: Optional[int] = None,
) -> float:
    """Carga unitaria de una tarea (adimensional, ~minutos ponderados)."""
    dens = (densidad or "media").lower()
    factor = DENSIDAD_FACTOR.get(dens, 1.0) * CATEGORIA_FACTOR.get(
        (categoria_codigo or "").upper(), 1.0
    )
    # Más jugadores → un poco más de demanda colectiva (cap)
    if num_jugadores and num_jugadores > 0:
        factor *= min(1.25, 0.85 + (num_jugadores / 40.0))
    return round(max(0.0, duracion_min) * factor, 2)


def carga_from_sesion_tarea(st: Dict[str, Any]) -> float:
    tarea = st.get("tarea") or st.get("tareas") or {}
    if not isinstance(tarea, dict):
        tarea = {}
    dur = st.get("duracion_override") or tarea.get("duracion_total") or 0
    dens = tarea.get("densidad")
    cat = _categoria_codigo(tarea)
    njug = tarea.get("num_jugadores_min") or tarea.get("num_jugadores_max")
    return carga_tarea(
        duracion_min=int(dur or 0),
        densidad=dens,
        categoria_codigo=cat,
        num_jugadores=int(njug) if njug else None,
    )


def _count_alineados(equipo: Any) -> int:
    if not isinstance(equipo, dict):
        return 0
    return sum(1 for v in equipo.values() if v)


def carga_from_partido_bloque(bloque: Dict[str, Any]) -> Tuple[float, int]:
    """Carga y minutos de un bloque partido_condicionado (11 vs 11, PCO)."""
    if not isinstance(bloque, dict) or bloque.get("tipo") != "partido_condicionado":
        return 0.0, 0
    partido = bloque.get("partido") or {}
    if not isinstance(partido, dict):
        partido = {}
    dur = partido.get("duracion_min") or bloque.get("duracion_objetivo") or 0
    dur = int(dur or 0)
    n_peto = _count_alineados(partido.get("equipo_peto"))
    n_sin = _count_alineados(partido.get("equipo_sin_peto"))
    njug = n_peto + n_sin or 22
    carga = carga_tarea(
        duracion_min=dur,
        densidad="alta",
        categoria_codigo="PCO",
        num_jugadores=njug,
    )
    return carga, dur


def intensidad_from_carga(carga_total: float, duracion_total: int) -> str:
    """Mapea carga agregada a intensidad_calculada."""
    if duracion_total <= 0:
        return "media"
    ratio = carga_total / max(duracion_total, 1)
    if ratio >= 1.25:
        return "alta"
    if ratio >= 0.95:
        return "media"
    if ratio >= 0.7:
        return "baja"
    return "muy_baja"


def aggregate_sesion_carga(
    sesion_tareas: List[Dict[str, Any]],
    estructura_fases: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[float, str, int]:
    """
    Returns (carga_sesion, intensidad_calculada, duracion_total_min).

    Incluye bloques de partido condicionado (no son tareas).
    """
    total_carga = 0.0
    total_dur = 0
    for st in sesion_tareas or []:
        tarea = st.get("tarea") or st.get("tareas") or {}
        if not isinstance(tarea, dict):
            tarea = {}
        dur = int(st.get("duracion_override") or tarea.get("duracion_total") or 0)
        total_dur += dur
        total_carga += carga_from_sesion_tarea(st)

    for bloque in estructura_fases or []:
        if not isinstance(bloque, dict):
            continue
        carga_p, dur_p = carga_from_partido_bloque(bloque)
        if dur_p:
            total_dur += dur_p
            total_carga += carga_p

    intensidad = intensidad_from_carga(total_carga, total_dur)
    return round(total_carga, 2), intensidad, total_dur
