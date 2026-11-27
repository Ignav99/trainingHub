"""Sugerencia determinista de material para una tarea.

Se usa para rellenar `tareas.material` de golpe (script de backfill) y como ayuda
en el formulario. Nunca inventa: solo lee los campos de la propia tarea.

Material "normal" de entrenamiento: balones, petos, conos, picas, vallas, escaleras,
gomas y porterías reducidas. Maniquíes, GPS y pulsómetros son equipamiento opcional:
NUNCA se sugieren (siguen en el catálogo para marcarlos a mano).

Solo los petos llevan cantidad (estimada), codificada en la propia lista como
`"petos:12"`. Un equipo juega sin peto: petos = jugadores - equipo más grande
(+ comodines con otro color). Se deduce de `estructura_equipos` / título
("6v6+2", "5v2"), luego de la pizarra (rival/comodín) y, en último caso, de
ceil(jugadores / 2). Con 3 equipos: jugadores - equipo más grande.

Señales, de más a menos fiables:
1. Elementos de la pizarra (`grafico_data.elements[].type`).
2. Campos estructurados: `espacio_largo/ancho`, `estructura_equipos`, `num_jugadores_*`.
3. Texto (título, descripción, desarrollo, reglas, anotaciones).
"""
from __future__ import annotations

import math
import re
import unicodedata
from typing import Any

from app.services.material import _ORDEN, _lista, entrada_material

# Categorías de juego: llevan balón por defecto. En el resto (circuitos, activación,
# movilidad, fuerza…) solo si el texto o la pizarra lo dicen.
_CON_BALON = {"RND", "POS", "JDP", "SSG", "PCO", "AVD", "ACO", "EVO", "FIN", "ABP", "LUD", "RDP", "PRT", "POR"}
# Categorías de trabajo físico donde una mención suelta de "balón" no basta.
_SIN_BALON = {"MOV", "PRV", "GYM", "RCF"}
# Categorías de trabajo individual: ni la pizarra ni el texto implican petos.
_SIN_PETOS = {"MOV", "PRV", "GYM", "RCF", "POR"}
# Movilidad / activación / recuperación / fuerza: sin material salvo evidencia explícita
# (pizarra o equipamiento nombrado); las palabras de espacio ("zona", "circuito") no cuentan.
_SIN_ESPACIO_POR_TEXTO = {"MOV", "ACT", "RCF", "PRV", "GYM"}
# Juegos de posición/oposición: picas, vallas, escaleras y gomas solo si la pizarra los dibuja.
_SOLO_PIZARRA_EQUIPO = {"POS", "RND", "JDP", "SSG", "PCO", "AVD", "PRT", "ABP", "POR"}

# Tipos de elemento de la pizarra → código de material (maniquíes, GPS y pulsómetros
# no se sugieren nunca: son equipamiento opcional).
_PIZARRA: dict[str, str] = {
    "ball": "balones",
    "ball_cart": "balones",
    "cone": "conos",
    "marker_disc": "conos",
    "hurdle": "vallas",
    "pole": "picas",
    "ladder": "escaleras",
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
_CONOS_EXPLICITO = re.compile(r"\b(conos?|platillos?)\b")
_CONOS_ESPACIO = re.compile(
    r"\b(delimitad\w*|pasillos?|carriles?|cuadrados?|rectangulos?|areas?|"
    r"espacio reducido|campo reducido|estaciones|circuito|zonas?(?! ?\d))\b"
)
_FUERZA = re.compile(r"\b(fuerza|sentadilla|hip thrust|pliometria|gimnasio|isometric\w*|excentric\w*)\b")
_MINI_PORTERIAS = re.compile(
    r"(mini ?porter\w*|porterias? (pequenas?|reducidas?|de paso|moviles)|porterias pequenas)"
)
_PORTERIAS = re.compile(r"\bporterias\b")
_PICAS = re.compile(r"\b(picas?|estacas?)\b")
_VALLAS = re.compile(r"\b(vallas?|vallitas?)\b")
_ESCALERAS = re.compile(r"\b(escaleras?( de (coordinacion|agilidad))?|ladder)\b")
_GOMAS = re.compile(r"\b(minibandas?|bandas? (elasticas?|de resistencia)|gomas?)\b")

_VERSUS = re.compile(r"(\d+)\s*(?:vs|v|contra)\s*(\d+)")
_COMODINES = re.compile(r"\+\s*(\d+)(?!\s*v)(?!\d)")
_TRES_EQUIPOS = re.compile(r"\b(3|tres) equipos\b")


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


def _elementos(tarea: dict) -> list[dict]:
    grafico = tarea.get("grafico_data")
    if not isinstance(grafico, dict):
        return []
    elementos = grafico.get("elements")
    if not isinstance(elementos, list):
        return []
    return [e for e in elementos if isinstance(e, dict) and e.get("type")]


def _texto(tarea: dict) -> str:
    partes = [
        tarea.get(k)
        for k in ("titulo", "descripcion", "desarrollo", "reglas", "anotaciones", "estructura_equipos")
    ]
    return _norm(" ".join(str(p) for p in partes if p))


def _entero(valor: Any) -> int:
    try:
        return int(valor or 0)
    except (TypeError, ValueError):
        return 0


def _petos_desde_texto(fuente: str, jugadores: int = 0) -> int | None:
    """'6vs6+2' -> 8; '5vs2' -> 2; '4 v 4 + 1C' -> 5. Toma el enfrentamiento mayor.

    Comodines = los "+N" que siguen al enfrentamiento (no los de otro "NvM").
    Duelos pequeños (1v1, 2v1: a+b <= 3) se juegan en paralelo: un peto por grupo.
    """
    mejor: tuple[int, int, int] | None = None  # (a+b, min(a,b), fin del match)
    for m in _VERSUS.finditer(fuente):
        a, b = int(m.group(1)), int(m.group(2))
        if a <= 0 or b <= 0:
            continue
        if mejor is None or a + b > mejor[0]:
            mejor = (a + b, min(a, b), m.end())
    if mejor is None:
        return None
    comodines = sum(int(x) for x in _COMODINES.findall(fuente[mejor[2]:]))
    if mejor[0] <= 3 and not comodines and jugadores >= mejor[0]:
        return max(1, (jugadores // mejor[0]) * mejor[1])
    return mejor[1] + comodines


def estimar_petos(tarea: dict) -> int | None:
    """Estimación de petos (>= 1) de una tarea, o None si no hay base para estimarla."""
    estructura = _norm(str(tarea.get("estructura_equipos") or ""))
    texto = _texto(tarea)
    jugadores = _entero(tarea.get("num_jugadores_max")) or _entero(tarea.get("num_jugadores_min"))

    # 1. Estructura declarada, luego título ("6v6+2", "5v2").
    for fuente in (estructura, _norm(str(tarea.get("titulo") or ""))):
        n = _petos_desde_texto(fuente, jugadores)
        if n:
            return max(1, n)
    # 3 equipos (o más): todos menos el equipo más grande.
    if jugadores and _TRES_EQUIPOS.search(estructura + " " + texto):
        return max(1, jugadores - math.ceil(jugadores / 3))

    # 2. Pizarra: el equipo menor (rival) + comodines; solo comodines si no hay rival.
    elementos = _elementos(tarea)
    propios = sum(1 for e in elementos if e["type"] == "player")
    rivales = sum(1 for e in elementos if e["type"] == "opponent")
    comodines = sum(1 for e in elementos if e["type"] == "player_joker")
    if rivales:
        return max(1, (min(propios, rivales) if propios else rivales) + comodines)
    if comodines:
        return max(1, comodines)

    # 4. Dos bandos sin más datos: la mitad.
    if jugadores:
        return max(1, math.ceil(jugadores / 2))
    return None


def sugerir_material(tarea: dict) -> list[str]:
    """Entradas de material (catálogo primero, ordenadas) que la tarea necesita.

    Los petos llevan cantidad estimada: "petos:12". No sobrescribe: si la tarea ya
    declara material, lo devuelve tal cual.
    """
    existente = _lista(tarea.get("material"))
    if existente:
        return list(existente)

    texto = _texto(tarea)
    cat = _categoria(tarea)
    elementos = _elementos(tarea)
    tipos = {str(e["type"]) for e in elementos}
    jugadores = _entero(tarea.get("num_jugadores_min"))
    codigos: set[str] = {_PIZARRA[t] for t in tipos if t in _PIZARRA}
    hay_balon_pizarra = bool(tipos & {"ball", "ball_cart"})

    # Balones: salvo trabajo claramente sin balón.
    if _BALON.search(texto) or cat in _CON_BALON:
        codigos.add("balones")
    if cat in _SIN_BALON and not hay_balon_pizarra and not re.search(r"\bbalon(es)?\b", texto):
        codigos.discard("balones")

    # Petos: dos bandos en la pizarra (rival/comodín) o lenguaje de equipos con >= 6 jugadores.
    petos = False
    if cat not in _SIN_PETOS:
        if tipos & {"opponent", "player_joker"}:
            petos = True
        elif jugadores >= 6 and _EQUIPOS.search(texto):
            petos = True

    # Conos: pizarra, espacio definido, o texto que lo pide. Sin evidencia no hay conos
    # en movilidad/activación/recuperación/fuerza.
    if _CONOS_EXPLICITO.search(texto):
        codigos.add("conos")
    if cat not in _SIN_ESPACIO_POR_TEXTO:
        fuerza_pura = cat == "CIR" and _FUERZA.search(_norm(str(tarea.get("titulo") or "")))
        if not fuerza_pura:
            if tarea.get("espacio_largo") and tarea.get("espacio_ancho"):
                codigos.add("conos")
            if _CONOS_ESPACIO.search(texto):
                codigos.add("conos")
    if cat in _SIN_ESPACIO_POR_TEXTO and not (tipos & {"cone", "marker_disc"}) and not _CONOS_EXPLICITO.search(texto):
        codigos.discard("conos")

    # Porterías reducidas: explícitas, o "porterías" en plural sin portería grande dibujada.
    if _MINI_PORTERIAS.search(texto) or (_PORTERIAS.search(texto) and "goal_large" not in tipos):
        codigos.add("porterias_reducidas")

    # Picas, vallas, escaleras, gomas: pizarra o texto explícito (en juegos de posición, solo pizarra).
    if cat not in _SOLO_PIZARRA_EQUIPO:
        for patron, codigo in (
            (_PICAS, "picas"),
            (_VALLAS, "vallas"),
            (_ESCALERAS, "escaleras"),
            (_GOMAS, "gomas"),
        ):
            if patron.search(texto):
                codigos.add(codigo)

    salida = sorted(codigos, key=lambda c: _ORDEN.get(c, len(_ORDEN)))
    if petos:
        cantidad = estimar_petos(tarea) or 1
        salida.insert(
            sum(1 for c in salida if _ORDEN.get(c, 99) < _ORDEN["petos"]),
            entrada_material("petos", cantidad),
        )
    return salida
