"""Helpers de tipología de jugador (plantilla / filial / prueba / invitado)."""

from __future__ import annotations

from typing import Mapping

TRACKING_TIPOS = frozenset({"plantilla", "juvenil", "prueba"})


def resolve_tipo_jugador(jugador: Mapping) -> str:
    tipo = jugador.get("tipo_jugador")
    if tipo:
        return str(tipo)
    return "invitado" if jugador.get("es_invitado") else "plantilla"


def incluye_tracking_carga(jugador: Mapping) -> bool:
    """Plantilla, filial (juvenil) y prueba: mismas cargas/RPE. Invitado no."""
    return resolve_tipo_jugador(jugador) in TRACKING_TIPOS
