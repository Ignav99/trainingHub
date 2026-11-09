"""Merge de plan_ct para que un guardado parcial no borre el resto."""

from __future__ import annotations

from typing import Any, Optional


def merge_plan_ct(current: Optional[dict], incoming: Optional[dict]) -> dict:
    """Combina el plan guardado con el que acaba de llegar.

    Las claves que el cliente envía sustituyen a las anteriores. Las que no
    envía se conservan: así un enlace de partido no borra el olfato ni los
    objetivos, y una respuesta vieja que aún no los tenía tampoco.
    Un valor null sí borra esa clave.
    """
    base = dict(current) if isinstance(current, dict) else {}
    if not isinstance(incoming, dict):
        return base
    merged: dict[str, Any] = {**base, **incoming}
    for key, value in incoming.items():
        if value is None:
            merged.pop(key, None)
    return merged
