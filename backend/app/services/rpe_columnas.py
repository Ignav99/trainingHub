"""Columnas de RPE de la tabla de cargas.

Carga en UA = RPE × minutos efectivos de esa sesión o de ese partido.
La media por día usa el día de la fecha de la sesión (martes, jueves, viernes).
"""

from __future__ import annotations

from datetime import date, datetime
from statistics import mean
from typing import Optional


def carga_ua(rpe: Optional[float], minutos: Optional[float]) -> Optional[float]:
    if rpe is None or minutos is None:
        return None
    try:
        r = float(rpe)
        m = float(minutos)
    except (TypeError, ValueError):
        return None
    if r <= 0 or m <= 0:
        return None
    return round(r * m, 1)


def _as_date(value) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value)[:10]
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def summarize_rpe_columns(events: list[dict]) -> dict:
    """events: fecha, rpe, minutos, kind in {'sesion','partido'}."""
    parsed = []
    for event in events:
        fecha = _as_date(event.get("fecha"))
        rpe = event.get("rpe")
        if fecha is None or rpe is None:
            continue
        try:
            rpe_n = float(rpe)
        except (TypeError, ValueError):
            continue
        if rpe_n <= 0:
            continue
        minutos = event.get("minutos")
        try:
            minutos_n = float(minutos) if minutos is not None else 0.0
        except (TypeError, ValueError):
            minutos_n = 0.0
        parsed.append({
            "fecha": fecha,
            "rpe": rpe_n,
            "minutos": minutos_n,
            "kind": event.get("kind") or "sesion",
        })

    empty = {
        "rpe_ultimo": None,
        "rpe_ultimo_tipo": None,
        "rpe_ultimo_fecha": None,
        "minutos_ultimo": None,
        "carga_ua_ultimo": None,
        "rpe_media_martes": None,
        "rpe_media_jueves": None,
        "rpe_media_viernes": None,
        "rpe_media_partido": None,
    }
    if not parsed:
        return empty

    parsed.sort(key=lambda e: (e["fecha"], 1 if e["kind"] == "partido" else 0))
    last = parsed[-1]
    buckets = {"martes": [], "jueves": [], "viernes": [], "partido": []}
    day_name = {1: "martes", 3: "jueves", 4: "viernes"}
    for event in parsed:
        if event["kind"] == "partido":
            buckets["partido"].append(event["rpe"])
            continue
        name = day_name.get(event["fecha"].weekday())
        if name:
            buckets[name].append(event["rpe"])

    def avg(values: list[float]) -> Optional[float]:
        return round(mean(values), 1) if values else None

    return {
        "rpe_ultimo": round(last["rpe"], 1),
        "rpe_ultimo_tipo": last["kind"],
        "rpe_ultimo_fecha": last["fecha"],
        "minutos_ultimo": last["minutos"] if last["minutos"] > 0 else None,
        "carga_ua_ultimo": carga_ua(last["rpe"], last["minutos"]),
        "rpe_media_martes": avg(buckets["martes"]),
        "rpe_media_jueves": avg(buckets["jueves"]),
        "rpe_media_viernes": avg(buckets["viernes"]),
        "rpe_media_partido": avg(buckets["partido"]),
    }
