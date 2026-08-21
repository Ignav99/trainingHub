"""Ámbito estadístico: competición real vs amistosos.

Los amistosos se pueden consultar (minutos, lo ocurrido en el partido),
pero no entran en resultados ni en agregados de competición salvo que
el usuario pida explícitamente «amistosos» o «todos».
"""

from __future__ import annotations

from typing import Any, Iterable, Optional

AMBITO_COMPETICION = "competicion"
AMBITO_AMISTOSOS = "amistosos"
AMBITO_TODOS = "todos"

AMBITOS = (AMBITO_COMPETICION, AMBITO_AMISTOSOS, AMBITO_TODOS)

COMPETICIONES_OFICIALES = frozenset({"liga", "copa", "torneo"})
COMPETICION_AMISTOSO = "amistoso"

AMBITO_LABELS = {
    AMBITO_COMPETICION: "Solo competición",
    AMBITO_AMISTOSOS: "Solo amistosos",
    AMBITO_TODOS: "Competición y amistosos",
}


def normalize_ambito(raw: Optional[str]) -> str:
    value = (raw or AMBITO_COMPETICION).strip().lower()
    if value in ("oficial", "oficiales", "liga"):
        return AMBITO_COMPETICION
    if value in ("amistoso", "friendly", "friendlies"):
        return AMBITO_AMISTOSOS
    if value in ("conjunto", "conjunta", "all", "ambos"):
        return AMBITO_TODOS
    if value in AMBITOS:
        return value
    return AMBITO_COMPETICION


def competicion_de(row: Any) -> Optional[str]:
    if not isinstance(row, dict):
        return None
    raw = row.get("competicion")
    if raw:
        return str(raw)
    nested = row.get("partidos")
    if isinstance(nested, dict) and nested.get("competicion"):
        return str(nested["competicion"])
    return None


def es_oficial(competicion: Optional[str]) -> bool:
    return (competicion or "") in COMPETICIONES_OFICIALES


def es_amistoso(competicion: Optional[str]) -> bool:
    return (competicion or "") == COMPETICION_AMISTOSO


def en_ambito(competicion: Optional[str], ambito: str) -> bool:
    ambito = normalize_ambito(ambito)
    if ambito == AMBITO_TODOS:
        return True
    if ambito == AMBITO_AMISTOSOS:
        return es_amistoso(competicion)
    return es_oficial(competicion)


def filtrar_por_ambito(rows: Iterable[Any], ambito: str) -> list:
    return [r for r in rows if en_ambito(competicion_de(r), ambito)]
