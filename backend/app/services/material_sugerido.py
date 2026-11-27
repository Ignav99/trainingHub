"""Sugerencia determinista de material para una tarea.

Se usa para rellenar `tareas.material` de golpe (script de backfill) y como ayuda
en el formulario. Nunca inventa: solo lee los campos de la propia tarea.

Señales, de más a menos fiables:
1. Elementos de la pizarra (`grafico_data.elements[].type`): cono, disco, valla,
   pica, escalera, maniquí, miniportería, balón, rival/comodín (petos).
2. Campos estructurados: `espacio_largo/ancho`, `estructura_equipos`,
   `num_jugadores_min`, `equipamiento`.
3. Texto (título, descripción, desarrollo, reglas, anotaciones).

Los códigos son los de `app.services.material.CATALOGO`.
"""
from __future__ import annotations

import re
import unicodedata
from typing import Any

from app.services.material import _lista, codigos_de_tareas

# Categorías de juego: llevan balón por defecto. En el resto (circuitos, activación,
# movilidad, fuerza…) solo si el texto o la pizarra lo dicen.
_CON_BALON = {"RND", "POS", "JDP", "SSG", "PCO", "AVD", "ACO", "EVO", "FIN", "ABP", "LUD", "RDP", "PRT", "POR"}
# Categorías de trabajo físico donde una mención suelta de "balón" no basta.
_SIN_BALON = {"MOV", "PRV", "GYM", "RCF"}
# Categorías de trabajo individual: ni la pizarra ni el texto implican petos.
_SIN_PETOS_POR_TEXTO = {"MOV", "PRV", "GYM", "RCF", "POR"}

# Tipos de elemento de la pizarra → código de material.
_PIZARRA: dict[str, str] = {
    "ball": "balones",
    "ball_cart": "balones",
    "cone": "conos",
    "marker_disc": "conos",
    "hurdle": "vallas",
    "pole": "picas",
    "ladder": "escaleras",
    "mannequin": "maniquies",
    "mini_goal": "porterias_reducidas",
}

_BALON = re.compile(
    r"\b(balon|balones|rondo|posesion|pase|pases|conduc\w*|finaliz\w*|remate\w*|centros?|"
    r"gol|goles|juego de posicion|partido|penaltis?|saque|corner|corners|\d+ ?v ?\d+)\b"
)
_EQUIPOS = re.compile(
    r"(\b\d+ ?(v|vs|contra) ?\d+\b|\bdos equipos\b|\bpor equipos\b|\bequipos? (rival|contrario)\b|"
    r"\bpetos?\b|\bcomodines?\b|\boposicion\b|\bbandos?\b)"
)
_CONOS = re.compile(
    r"\b(conos?|platillos?|delimitad\w*|pasillos?|carriles?|cuadrados?|rectangulos?|"
    r"espacio reducido|campo reducido|estaciones|circuito|zonas?(?! ?\d))\b"
)
_MINI_PORTERIAS = re.compile(
    r"(mini ?porter\w*|porterias? (pequenas?|reducidas?|de paso|moviles)|porterias pequenas)"
)
_PORTERIAS = re.compile(r"\bporterias\b")
_PICAS = re.compile(r"\b(picas?|estacas?|slalom)\b")
_VALLAS = re.compile(r"\b(vallas?|vallitas?)\b")
_ESCALERAS = re.compile(r"\b(escaleras?( de coordinacion)?|ladder)\b")
_GOMAS = re.compile(r"\b(minibandas?|bandas? (elasticas?|de resistencia)|gomas?)\b")
_MANIQUIES = re.compile(r"\b(maniqui(es)?|barrera)\b")
_GPS = re.compile(r"\bgps\b")
_PULSOMETROS = re.compile(r"\b(pulsometros?|pulsimetros?|banda de (fc|frecuencia)|monitor(es)? de (fc|frecuencia))\b")


def _norm(texto: str) -> str:
    sin = unicodedata.normalize("NFKD", texto.lower())
    return "".join(c for c in sin if not unicodedata.combining(c))


def _categoria(tarea: dict) -> str:
    for clave in ("categoria", "categorias_tarea"):
        cat = tarea.get(clave)
        if isinstance(cat, list):
            cat = cat[0] if cat else None
        if isinstance(cat, dict) and cat.get("codigo"):
            return str(cat["codigo"]).upper()
    cod = tarea.get("categoria_codigo")
    return str(cod).upper() if cod else ""


def _tipos_pizarra(tarea: dict) -> set[str]:
    grafico = tarea.get("grafico_data")
    if not isinstance(grafico, dict):
        return set()
    elementos = grafico.get("elements")
    if not isinstance(elementos, list):
        return set()
    return {str(e.get("type")) for e in elementos if isinstance(e, dict) and e.get("type")}


def _texto(tarea: dict) -> str:
    partes = [
        tarea.get(k)
        for k in ("titulo", "descripcion", "desarrollo", "reglas", "anotaciones", "estructura_equipos")
    ]
    return _norm(" ".join(str(p) for p in partes if p))


def sugerir_material(tarea: dict) -> list[str]:
    """Códigos de material (catálogo primero, ordenados) que la tarea necesita.

    No sobrescribe: si la tarea ya declara material, lo devuelve tal cual.
    """
    existente = _lista(tarea.get("material"))
    if existente:
        return codigos_de_tareas([existente])

    texto = _texto(tarea)
    cat = _categoria(tarea)
    tipos = _tipos_pizarra(tarea)
    jugadores = tarea.get("num_jugadores_min") or 0
    try:
        jugadores = int(jugadores)
    except (TypeError, ValueError):
        jugadores = 0
    codigos: list[str] = [_PIZARRA[t] for t in tipos if t in _PIZARRA]
    codigos += _lista(tarea.get("equipamiento"))

    # Balones: salvo trabajo claramente sin balón.
    if _BALON.search(texto) or cat in _CON_BALON:
        codigos.append("balones")

    # Petos: dos bandos en la pizarra (rival/comodín) o lenguaje de equipos con >= 6 jugadores.
    if cat not in _SIN_PETOS_POR_TEXTO:
        if "opponent" in tipos or "player_joker" in tipos:
            codigos.append("petos")
        elif jugadores >= 6 and _EQUIPOS.search(texto):
            codigos.append("petos")

    # Conos: espacio delimitado.
    if tarea.get("espacio_largo") and tarea.get("espacio_ancho"):
        codigos.append("conos")
    if _CONOS.search(texto):
        codigos.append("conos")

    # Porterías reducidas: explícitas, o "porterías" en plural sin portería grande dibujada.
    if _MINI_PORTERIAS.search(texto) or (_PORTERIAS.search(texto) and "goal_large" not in tipos):
        codigos.append("porterias_reducidas")

    for patron, codigo in (
        (_PICAS, "picas"),
        (_VALLAS, "vallas"),
        (_ESCALERAS, "escaleras"),
        (_GOMAS, "gomas"),
        (_MANIQUIES, "maniquies"),
        (_GPS, "gps"),
        (_PULSOMETROS, "pulsometros"),
    ):
        if patron.search(texto):
            codigos.append(codigo)

    # Sin balón no hay "balones" aunque el texto de un circuito físico lo mencione de pasada.
    if cat in _SIN_BALON and "ball" not in tipos and "ball_cart" not in tipos and not re.search(
        r"\bbalon(es)?\b", texto
    ):
        codigos = [c for c in codigos if c != "balones"]

    return codigos_de_tareas([codigos])
