"""Helpers de tipología de jugador (plantilla / filial / prueba / invitado)."""

from __future__ import annotations

from typing import Mapping

TRACKING_TIPOS = frozenset({"plantilla", "juvenil", "prueba"})


def resolve_tipo_jugador(jugador: Mapping) -> str:
    tipo = jugador.get("tipo_jugador")
    if tipo:
        return str(tipo)
    return "invitado" if jugador.get("es_invitado") else "plantilla"


def is_filial(jugador: Mapping) -> bool:
    return resolve_tipo_jugador(jugador) == "juvenil"


def auto_include_in_sesion_asistencia(jugador: Mapping) -> bool:
    """Solo la plantilla entra sola en la convocatoria de sesión."""
    return resolve_tipo_jugador(jugador) == "plantilla"


def incluye_tracking_carga(jugador: Mapping) -> bool:
    """Plantilla, filial (juvenil) y prueba: mismas cargas/RPE. Invitado no."""
    return resolve_tipo_jugador(jugador) in TRACKING_TIPOS


def _dorsal_int(raw) -> int:
    try:
        n = int(raw)
    except (TypeError, ValueError):
        return 999
    return n if n >= 0 else 999


def rpe_roster_sort_key(jugador: Mapping) -> tuple:
    """Plantilla por dorsal; filial, prueba e invitados al final (también por dorsal)."""
    trailing = 0 if resolve_tipo_jugador(jugador) == "plantilla" else 1
    apellidos = str(jugador.get("apellidos") or "").casefold()
    nombre = str(jugador.get("nombre") or "").casefold()
    return (trailing, _dorsal_int(jugador.get("dorsal")), apellidos, nombre)
