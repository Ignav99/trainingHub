"""Texto narrativo de tarea: desarrollo / reglas (variantes) con fallbacks legacy."""

from __future__ import annotations

from typing import Any, Dict, List, Optional


def _list_to_text(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, list):
        return "\n".join(str(x).strip() for x in val if str(x).strip())
    if isinstance(val, str):
        return val.strip()
    return str(val).strip()


def reglas_as_text(tarea: Optional[Dict[str, Any]]) -> str:
    """Lo que el creador llama «Variantes / reglas», con fallbacks."""
    if not tarea:
        return ""
    for key in ("reglas", "variantes", "reglas_tacticas", "reglas_tecnicas"):
        text = _list_to_text(tarea.get(key))
        if text:
            return text
    return ""


def desarrollo_as_text(tarea: Optional[Dict[str, Any]]) -> str:
    if not tarea:
        return ""
    for key in ("desarrollo", "descripcion"):
        text = _list_to_text(tarea.get(key))
        if text:
            return text
    return ""


def sync_reglas_variantes(tarea_data: Dict[str, Any]) -> Dict[str, Any]:
    """Mantiene `reglas` (texto) y `variantes` (lista) alineados."""
    out = dict(tarea_data)
    reglas = out.get("reglas")
    variantes = out.get("variantes")

    reglas_txt = reglas.strip() if isinstance(reglas, str) else ""
    variantes_list: List[str] = []
    if isinstance(variantes, list):
        variantes_list = [str(x).strip() for x in variantes if str(x).strip()]
    elif isinstance(variantes, str) and variantes.strip():
        variantes_list = [ln.strip() for ln in variantes.splitlines() if ln.strip()]

    if reglas_txt and not variantes_list:
        out["variantes"] = [ln.strip() for ln in reglas_txt.splitlines() if ln.strip()]
    elif variantes_list and not reglas_txt:
        out["reglas"] = "\n".join(variantes_list)

    return out


def hydrate_tarea_narrative(tarea: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Rellena reglas/desarrollo vacíos desde columnas legacy al leer."""
    if not tarea or not isinstance(tarea, dict):
        return tarea
    out = dict(tarea)
    if not (isinstance(out.get("reglas"), str) and out["reglas"].strip()):
        filled = reglas_as_text(out)
        if filled:
            out["reglas"] = filled
    if not (isinstance(out.get("desarrollo"), str) and out["desarrollo"].strip()):
        filled = desarrollo_as_text(out)
        if filled:
            out["desarrollo"] = filled
    return out
