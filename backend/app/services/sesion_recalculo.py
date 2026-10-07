"""Reglas de recálculo al editar una sesión o apuntar el RPE después.

El tiempo efectivo de los ejercicios manda. Si el martes la sesión quedó en
25 minutos porque no se metieron las tareas, y el miércoles se añaden, el RPE
ya guardado y la carga Foster pasan a los minutos nuevos. Lo mismo si el RPE
se apunta más tarde: usa el tiempo efectivo que haya en ese momento.
"""

from __future__ import annotations

from typing import Any, Optional


def foster_carga(rpe: Any, minutos: Any) -> Optional[float]:
    try:
        r = float(rpe)
        m = float(minutos)
    except (TypeError, ValueError):
        return None
    if r <= 0 or m < 0:
        return None
    return round(r * m, 1)


def resolve_player_rpe_minutes(live_minutes: Any, requested: Any, *, parcial: bool = False) -> int:
    """Parcial: 0 minutos es real (no hizo tareas nombradas ni margen).

    Sesión completa sin ejercicios conserva el minutaje provisional.
    """
    if parcial:
        try:
            return max(0, int(live_minutes or 0))
        except (TypeError, ValueError):
            return 0
    return resolve_rpe_minutes(live_minutes, requested)


def resolve_rpe_minutes(live_minutes: Any, requested: Any) -> int:
    """Minutos que entran en Foster al guardar un RPE de sesión.

    Si la sesión ya tiene ejercicios, manda el tiempo efectivo actual.
    Si todavía no hay tareas, se conserva lo apuntado (el valor provisional)
    hasta que una edición de ejercicios lo sustituya.
    """
    try:
        live = int(live_minutes or 0)
    except (TypeError, ValueError):
        live = 0
    if live > 0:
        return live
    try:
        asked = int(requested or 0)
    except (TypeError, ValueError):
        return 0
    return max(0, asked)


def rpe_fields_for_minutes(rpe: Any, minutes: Any) -> dict:
    """duracion_percibida y carga Foster tras un cambio de tiempo efectivo."""
    try:
        mins = max(0, int(minutes or 0))
    except (TypeError, ValueError):
        mins = 0
    payload: dict = {"duracion_percibida": mins}
    carga = foster_carga(rpe, mins)
    if carga is not None:
        payload["carga_sesion"] = carga
    elif mins == 0:
        payload["carga_sesion"] = 0
    return payload


def should_rewrite_session_rpe(estado: Any) -> bool:
    """Una edición reescribe el RPE guardado aunque la sesión ya haya pasado.

    Cancelada queda fuera: esa sesión no alimenta la carga.
    """
    return str(estado or "") != "cancelada"


def apply_minutes_to_rpe_rows(
    rows: list[dict],
    minutes_by_player: dict[str, int],
    estado: Any,
) -> list[dict]:
    """Registros de sesión con minutos y carga recalculados.

    No toca wellness ni partido. Si el estado es cancelada, no cambia nada.
    """
    if not should_rewrite_session_rpe(estado):
        return [dict(row) for row in rows or []]
    out: list[dict] = []
    for row in rows or []:
        tipo = row.get("tipo") or "sesion"
        if tipo != "sesion":
            out.append(dict(row))
            continue
        jid = str(row.get("jugador_id") or "")
        updated = dict(row)
        try:
            mins = int(minutes_by_player.get(jid, 0) or 0)
        except (TypeError, ValueError):
            mins = 0
        # Sin ejercicios todavía no se pisa el minutaje provisional (p. ej. 25′).
        if mins > 0:
            updated.update(rpe_fields_for_minutes(row.get("rpe"), mins))
        out.append(updated)
    return out
