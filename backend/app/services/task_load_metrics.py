"""
Cálculo único de densidad y nivel cognitivo de una tarea.

Misma fórmula siempre: área (m²) / jugadores de campo → bandas fijas.
Espejo de frontend/src/lib/tacticalMetrics.ts (BANDAS / CAPACIDADES).
"""

from __future__ import annotations

from typing import Any, Optional, TypedDict


class TaskLoadResult(TypedDict):
    m2_por_jugador: float
    densidad: str
    nivel_cognitivo: int
    tipo_esfuerzo: str
    fc_esperada_min: int
    fc_esperada_max: int


# max m²/jugador → (densidad, nivel_cognitivo, fc_min, fc_max)
_BANDAS = [
    (30, "alta", 3, 160, 185),
    (60, "alta", 3, 155, 180),
    (110, "media", 2, 150, 175),
    (200, "media", 2, 145, 170),
    (float("inf"), "baja", 1, 140, 170),
]

# max m²/jugador → tipo_esfuerzo
_CAPACIDADES = [
    (50, "fuerza"),
    (120, "intermitente_alto"),
    (200, "intermitente_medio"),
    (300, "mixto"),
    (float("inf"), "velocidad"),
]


def _area_m2(largo: float, ancho: float, forma: Optional[str]) -> float:
    import math

    if forma == "circular":
        return round((math.pi * largo * ancho) / 4)
    return round(largo * ancho)


def compute_task_load_metrics(
    *,
    espacio_largo: Optional[float],
    espacio_ancho: Optional[float],
    num_jugadores: Optional[int],
    num_porteros: Optional[int] = 0,
    espacio_forma: Optional[str] = None,
) -> Optional[TaskLoadResult]:
    try:
        largo = float(espacio_largo or 0)
        ancho = float(espacio_ancho or 0)
        jug = int(num_jugadores or 0)
        por = int(num_porteros or 0)
    except (TypeError, ValueError):
        return None

    campo = max(0, jug - por) or jug
    if largo <= 0 or ancho <= 0 or campo <= 0:
        return None

    area = _area_m2(largo, ancho, espacio_forma)
    m2j = round((area / campo) * 10) / 10

    densidad, nivel, fc_min, fc_max = "media", 2, 150, 175
    for max_m2, dens, cog, fmin, fmax in _BANDAS:
        if m2j < max_m2:
            densidad, nivel, fc_min, fc_max = dens, cog, fmin, fmax
            break

    tipo = "intermitente_medio"
    for max_m2, t in _CAPACIDADES:
        if m2j < max_m2:
            tipo = t
            break

    return {
        "m2_por_jugador": m2j,
        "densidad": densidad,
        "nivel_cognitivo": nivel,
        "tipo_esfuerzo": tipo,
        "fc_esperada_min": fc_min,
        "fc_esperada_max": fc_max,
    }


def apply_auto_load(tarea_data: dict[str, Any]) -> dict[str, Any]:
    """Sobrescribe densididad/cognitivo/esfuerzo con el cálculo canónico.

    Siempre devuelve una copia. Si no hay espacio/jugadores para calcular,
    no se tocan el resto de campos (titulo incluido).
    """
    out = dict(tarea_data)
    metrics = compute_task_load_metrics(
        espacio_largo=out.get("espacio_largo"),
        espacio_ancho=out.get("espacio_ancho"),
        num_jugadores=out.get("num_jugadores_min") or out.get("num_jugadores"),
        num_porteros=out.get("num_porteros"),
        espacio_forma=out.get("espacio_forma"),
    )
    if metrics:
        out.update(metrics)
    return out
