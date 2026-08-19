"""Persistencia SIATE (GO / PES) en grafico_data.siate + columnas opcionales."""

from __future__ import annotations

from typing import Any, Dict, Optional


def clamp_siate_factor(value: Any) -> Optional[int]:
    if value is None or value is False or value == "":
        return None
    try:
        n = int(round(float(value)))
    except (TypeError, ValueError):
        return None
    return max(1, min(5, n))


def merge_siate_into_grafico(data: Dict[str, Any]) -> Dict[str, Any]:
    """Copia complejidad_go/pes a grafico_data.siate para sobrevivir sin esas columnas."""
    out = dict(data)
    has_go = "complejidad_go" in out
    has_pes = "complejidad_pes" in out
    if not has_go and not has_pes:
        return out

    grafico_in = out.get("grafico_data")
    if grafico_in is None:
        grafico: Dict[str, Any] = {}
    elif isinstance(grafico_in, dict):
        grafico = dict(grafico_in)
    else:
        return out

    raw_siate = grafico.get("siate")
    siate: Dict[str, Any] = dict(raw_siate) if isinstance(raw_siate, dict) else {}

    if has_go:
        go = clamp_siate_factor(out.get("complejidad_go"))
        out["complejidad_go"] = go
        if go is None:
            siate.pop("go", None)
        else:
            siate["go"] = go

    if has_pes:
        pes = clamp_siate_factor(out.get("complejidad_pes"))
        out["complejidad_pes"] = pes
        if pes is None:
            siate.pop("pes", None)
        else:
            siate["pes"] = pes

    if siate:
        grafico["siate"] = siate
        out["grafico_data"] = grafico
    else:
        grafico.pop("siate", None)
        if grafico or grafico_in is not None:
            out["grafico_data"] = grafico if grafico else grafico_in
        elif "grafico_data" in out and not grafico:
            # No pizarra ni SIATE: no inventar un JSON vacío
            pass

    return out


def hydrate_siate(tarea: Dict[str, Any]) -> Dict[str, Any]:
    """Rellena complejidad_go/pes desde columnas o, si faltan, desde grafico_data.siate."""
    out = dict(tarea)
    grafico = out.get("grafico_data")
    stash = grafico.get("siate") if isinstance(grafico, dict) else None
    stash = stash if isinstance(stash, dict) else {}

    go = clamp_siate_factor(out.get("complejidad_go"))
    if go is None:
        go = clamp_siate_factor(stash.get("go"))
    if go is not None:
        out["complejidad_go"] = go

    pes = clamp_siate_factor(out.get("complejidad_pes"))
    if pes is None:
        pes = clamp_siate_factor(stash.get("pes"))
    if pes is not None:
        out["complejidad_pes"] = pes

    return out


def preserve_siate_on_grafico_patch(
    existing: Dict[str, Any], update_data: Dict[str, Any]
) -> Dict[str, Any]:
    """Si el PATCH sustituye grafico_data sin siate, conserva el stash anterior."""
    if "grafico_data" not in update_data:
        return update_data
    incoming = update_data.get("grafico_data")
    if not isinstance(incoming, dict):
        return update_data
    if isinstance(incoming.get("siate"), dict) and incoming.get("siate"):
        return update_data
    old = existing.get("grafico_data") if isinstance(existing.get("grafico_data"), dict) else {}
    old_siate = old.get("siate") if isinstance(old, dict) else None
    if not isinstance(old_siate, dict) or not old_siate:
        return update_data
    out = dict(update_data)
    grafico = dict(incoming)
    grafico["siate"] = dict(old_siate)
    out["grafico_data"] = grafico
    return out
