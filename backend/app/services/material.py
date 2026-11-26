"""Material de entrenamiento.

Cada tarea declara su material (`tareas.material`, lista de códigos del catálogo
o texto libre). El material de una sesión NO se marca a mano: se calcula solo,
como la duración, a partir de sus tareas — es el "material mínimo necesario".

Catálogo espejo de `frontend/src/lib/catalogos/canonico.ts::MATERIALES`.
"""
from __future__ import annotations

from typing import Any, Iterable

CATALOGO: dict[str, str] = {
    "balones": "Balones",
    "petos": "Petos",
    "conos": "Conos",
    "picas": "Picas",
    "vallas": "Vallas",
    "escaleras": "Escaleras",
    "gomas": "Gomas",
    "porterias_reducidas": "Porterías reducidas",
    "maniquies": "Maniquíes",
    "gps": "GPS",
    "pulsometros": "Pulsómetros",
}
_ORDEN = {c: i for i, c in enumerate(CATALOGO)}
_POR_NOMBRE = {n.lower(): c for c, n in CATALOGO.items()}


def _codigo(m: str) -> str:
    t = m.strip()
    low = t.lower()
    if low in CATALOGO:
        return low
    return _POR_NOMBRE.get(low, t)


def nombre_material(m: str) -> str:
    c = _codigo(m)
    return CATALOGO.get(c, c[:1].upper() + c[1:] if c else c)


def _lista(valor: Any) -> list[str]:
    if not valor:
        return []
    if isinstance(valor, str):
        return [p for p in (x.strip() for x in valor.split(",")) if p]
    if isinstance(valor, (list, tuple)):
        return [str(x).strip() for x in valor if str(x).strip()]
    return []


def material_de_tareas(materiales_por_tarea: Iterable[Any]) -> list[str]:
    """Unión ordenada (catálogo primero, luego libres) en nombres legibles."""
    vistos: dict[str, None] = {}
    for mats in materiales_por_tarea:
        for m in _lista(mats):
            vistos.setdefault(_codigo(m), None)
    codigos = sorted(vistos, key=lambda c: (_ORDEN.get(c, len(_ORDEN)), c.lower()))
    return [nombre_material(c) for c in codigos]
