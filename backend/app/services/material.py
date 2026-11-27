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


def codigos_de_tareas(materiales_por_tarea: Iterable[Any]) -> list[str]:
    """Unión ordenada (catálogo primero, luego libres) en códigos canónicos.

    Es lo que se guarda en `sesiones.materiales` (filtrable en la biblioteca).
    """
    vistos: dict[str, None] = {}
    for mats in materiales_por_tarea:
        for m in _lista(mats):
            vistos.setdefault(_codigo(m), None)
    return sorted(vistos, key=lambda c: (_ORDEN.get(c, len(_ORDEN)), c.lower()))


def sincronizar_materiales_sesion(supabase: Any, sesion_id: str) -> list[str] | None:
    """Recalcula y guarda `sesiones.materiales` = unión del material de sus tareas.

    No bloqueante: ante cualquier fallo devuelve None y no propaga la excepción.
    """
    try:
        res = (
            supabase.table("sesion_tareas")
            .select("tareas(material)")
            .eq("sesion_id", sesion_id)
            .execute()
        )
        por_tarea = []
        for st in res.data or []:
            tarea = st.get("tareas")
            if isinstance(tarea, list):  # join devuelto como lista
                tarea = tarea[0] if tarea else None
            por_tarea.append((tarea or {}).get("material") if isinstance(tarea, dict) else None)
        codigos = codigos_de_tareas(por_tarea)
        supabase.table("sesiones").update({"materiales": codigos}).eq("id", sesion_id).execute()
        return codigos
    except Exception:
        return None


def sincronizar_materiales_sesiones_de_tarea(supabase: Any, tarea_id: str) -> None:
    """Tras cambiar el material de una tarea, refresca las sesiones que la usan."""
    try:
        res = (
            supabase.table("sesion_tareas")
            .select("sesion_id")
            .eq("tarea_id", tarea_id)
            .execute()
        )
        for sid in {r.get("sesion_id") for r in (res.data or []) if r.get("sesion_id")}:
            sincronizar_materiales_sesion(supabase, str(sid))
    except Exception:
        return None
