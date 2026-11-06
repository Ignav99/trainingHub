"""Reglas puras del plan individualizado (sin base de datos, para poder testearlas)."""

from __future__ import annotations

from typing import Any

AREAS = ("fisico", "tecnico_tactico", "emocional")
ESTADOS = ("abierta", "en_trabajo", "resuelta")
RESULTADOS = ("mejora", "se_mantiene", "empeora")

MAX_MARCAS = 12
MAX_EJERCICIOS = 30
_TEXT_LIMIT = 2000


def _text(value: Any, limit: int) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text[:limit] if text else None


def _int(value: Any, low: int, high: int) -> int | None:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if low <= number <= high else None


def clean_marcas(values: list[str] | None) -> list[str]:
    """Marcas sin repetir (sin distinguir mayúsculas), recortadas y con tope."""
    out: list[str] = []
    seen: set[str] = set()
    for raw in values or []:
        text = " ".join(str(raw or "").split())[:40]
        key = text.casefold()
        if not text or key in seen:
            continue
        seen.add(key)
        out.append(text)
        if len(out) >= MAX_MARCAS:
            break
    return out


def clean_plan(plan: dict[str, Any] | None) -> dict[str, Any]:
    """Plan de trabajo: objetivo, frecuencia, duración y ejercicios. Lo desconocido se descarta."""
    plan = plan or {}
    ejercicios = []
    for item in (plan.get("ejercicios") or [])[:MAX_EJERCICIOS]:
        if not isinstance(item, dict):
            continue
        nombre = _text(item.get("nombre"), 120)
        if not nombre:
            continue
        ejercicios.append({
            "nombre": nombre,
            "series": _text(item.get("series"), 20),
            "repeticiones": _text(item.get("repeticiones"), 40),
            "carga": _text(item.get("carga"), 60),
            "descanso": _text(item.get("descanso"), 40),
            "notas": _text(item.get("notas"), 300),
        })
    out = {
        "objetivo": _text(plan.get("objetivo"), 400),
        "sesiones_semana": _int(plan.get("sesiones_semana"), 1, 14),
        "semanas": _int(plan.get("semanas"), 1, 52),
        "inicio": _text(plan.get("inicio"), 10),
        "ejercicios": ejercicios,
        "notas": _text(plan.get("notas"), _TEXT_LIMIT),
    }
    return {key: value for key, value in out.items() if value not in (None, [], "")}


def estado_tras_cambio(actual: str | None, pedido: str | None, resolucion_fecha: Any) -> str:
    """Con fecha de resolución la entrada queda resuelta; si se borra, vuelve a trabajo."""
    if resolucion_fecha:
        return "resuelta"
    if pedido in ("abierta", "en_trabajo"):
        return pedido
    if pedido == "resuelta" or actual == "resuelta":
        return "en_trabajo"
    return actual if actual in ESTADOS else "abierta"
