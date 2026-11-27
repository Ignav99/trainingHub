"""Empareja un nombre del acta RFEF con la ficha de la plantilla."""

from __future__ import annotations

import re
import unicodedata


def _normalizar(texto: str | None) -> str:
    base = unicodedata.normalize("NFD", texto or "")
    sin_tildes = "".join(c for c in base if unicodedata.category(c) != "Mn")
    limpio = re.sub(r"[^A-Za-z\s]", " ", sin_tildes.upper())
    return re.sub(r"\s+", " ", limpio).strip()


def emparejar_jugador_rfef(rfef_nombre: str, plantilla: list[dict]) -> dict | None:
    """El acta escribe «APELLIDOS, NOMBRE». La ficha suele llevar un apellido y el nombre corto.

    Hace falta que coincidan el apellido y el nombre de pila. Así «FRANCO GUERRA,
    FRANCISCO MANUEL» cae en Francisco Franco, y «VICEDO SANCHEZ, PABLO AURELIO»
    no se confunde con Manuel Vicedo.
    """
    crudo = (rfef_nombre or "").strip()
    if not crudo or not plantilla:
        return None

    if "," in crudo:
        apellidos_acta, nombre_acta = crudo.split(",", 1)
    else:
        apellidos_acta, nombre_acta = crudo, ""

    apellidos_rfef = _normalizar(apellidos_acta).split()
    nombres_rfef = _normalizar(nombre_acta).split()
    clave_acta = _normalizar(crudo.replace(",", " "))

    mejor: dict | None = None
    mejor_puntos = 0
    for jugador in plantilla:
        apellidos = _normalizar(jugador.get("apellidos"))
        nombre = _normalizar(jugador.get("nombre"))
        if not apellidos:
            continue
        if _normalizar(f"{jugador.get('apellidos') or ''} {jugador.get('nombre') or ''}") == clave_acta:
            return jugador

        tokens_apellido = apellidos.split()
        tokens_nombre = nombre.split()
        if not all(token in apellidos_rfef for token in tokens_apellido):
            continue
        if not tokens_nombre or not nombres_rfef or tokens_nombre[0] != nombres_rfef[0]:
            continue

        puntos = len(tokens_apellido) * 10 + len(tokens_nombre)
        if puntos > mejor_puntos:
            mejor = jugador
            mejor_puntos = puntos

    return mejor
