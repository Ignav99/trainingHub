"""
TrainingHub Pro - Servicio de Formacion de Equipos
Genera equipos equilibrados a partir de la lista de jugadores presentes.
Algoritmo rule-based (sin coste IA): distribucion serpentine por nivel_global.
"""

import logging
from math import ceil
from typing import List, Optional

logger = logging.getLogger(__name__)


# Posiciones agrupadas por zona
POSITION_ZONES = {
    "POR": "portero",
    "DFC": "defensa", "LTD": "defensa", "LTI": "defensa", "CAD": "defensa", "CAI": "defensa",
    "MCD": "centrocampista", "MC": "centrocampista", "MCO": "centrocampista",
    "MID": "centrocampista", "MII": "centrocampista",
    "EXD": "delantero", "EXI": "delantero", "MP": "delantero", "DC": "delantero", "SD": "delantero",
}


def _calculate_nivel_global(jugador: dict) -> float:
    """Calcula nivel global del jugador si no viene precalculado."""
    if jugador.get("nivel_global"):
        return jugador["nivel_global"]
    tecnico = jugador.get("nivel_tecnico", 5)
    tactico = jugador.get("nivel_tactico", 5)
    fisico = jugador.get("nivel_fisico", 5)
    mental = jugador.get("nivel_mental", 5)
    return round((tecnico + tactico + fisico + mental) / 4, 1)


def _parse_estructura(estructura: str) -> dict:
    """
    Parse estructura string like '4v4', '4v4+2', '5v5+GK', '3v3+1'.
    Returns: {num_equipos, jugadores_por_equipo, comodines, con_porteros}
    """
    estructura = estructura.strip().upper()
    comodines = 0
    con_porteros = False

    # Handle +GK suffix
    if "+GK" in estructura:
        con_porteros = True
        estructura = estructura.replace("+GK", "")

    # Handle +N suffix (comodines)
    if "+" in estructura:
        parts = estructura.split("+")
        estructura = parts[0]
        try:
            comodines = int(parts[1])
        except ValueError:
            comodines = 0

    # Parse NvN or NvNvN
    equipos_sizes = estructura.split("V")
    num_equipos = len(equipos_sizes)
    try:
        jugadores_por_equipo = int(equipos_sizes[0])
    except ValueError:
        jugadores_por_equipo = 4

    return {
        "num_equipos": num_equipos,
        "jugadores_por_equipo": jugadores_por_equipo,
        "comodines": comodines,
        "con_porteros": con_porteros,
    }


def _serpentine_distribute(sorted_players: List[dict], num_teams: int) -> List[List[dict]]:
    """
    Distribute players using serpentine/snake draft.
    Players should be sorted by nivel_global descending.
    Round 1: Team 1, 2, ..., N
    Round 2: Team N, ..., 2, 1
    Round 3: Team 1, 2, ..., N
    etc.
    """
    teams = [[] for _ in range(num_teams)]
    forward = True

    for i, player in enumerate(sorted_players):
        if forward:
            team_idx = i % num_teams
        else:
            team_idx = num_teams - 1 - (i % num_teams)

        teams[team_idx].append(player)

        # Switch direction after each full round
        if (i + 1) % num_teams == 0:
            forward = not forward

    return teams


def generar_equipos(
    jugadores_presentes: List[dict],
    estructura: str = "4v4",
    criterio: str = "equilibrado",
) -> dict:
    """
    Genera equipos equilibrados a partir de jugadores presentes.

    Args:
        jugadores_presentes: Lista de jugadores con sus datos
        estructura: Formato "NvN", "NvN+comodines", "NvN+GK"
        criterio: "equilibrado" | "por_nivel" | "mixto"

    Returns:
        dict con equipos, comodines, porteros, estadisticas
    """
    config = _parse_estructura(estructura)
    num_equipos = config["num_equipos"]
    jugadores_por_equipo = config["jugadores_por_equipo"]
    num_comodines = config["comodines"]
    con_porteros = config["con_porteros"]

    # Always separate goalkeepers from field players
    porteros = []
    jugadores_campo = []

    for j in jugadores_presentes:
        j["_nivel_global"] = _calculate_nivel_global(j)
        if j.get("es_portero"):
            porteros.append(j)
        else:
            jugadores_campo.append(j)

    # Sort by level descending
    jugadores_campo.sort(key=lambda x: x["_nivel_global"], reverse=True)

    # Extract comodines (highest-rated players)
    comodines = []
    if num_comodines > 0 and len(jugadores_campo) > num_equipos * jugadores_por_equipo:
        comodines = jugadores_campo[:num_comodines]
        jugadores_campo = jugadores_campo[num_comodines:]

    # Distribute players based on criteria
    if criterio == "equilibrado":
        # Group by position zone, then serpentine within each zone
        zones: dict[str, list] = {}
        for j in jugadores_campo:
            zone = POSITION_ZONES.get(j.get("posicion_principal", ""), "otro")
            zones.setdefault(zone, []).append(j)

        teams: List[List[dict]] = [[] for _ in range(num_equipos)]

        for zone_name, zone_players in zones.items():
            zone_players.sort(key=lambda x: x["_nivel_global"], reverse=True)
            distributed = _serpentine_distribute(zone_players, num_equipos)
            for i, team_players in enumerate(distributed):
                teams[i].extend(team_players)

    elif criterio == "por_nivel":
        # Pure serpentine by level
        teams = _serpentine_distribute(jugadores_campo, num_equipos)

    else:  # mixto
        # Alternate: defensas/medios serpentine, delanteros random
        teams = _serpentine_distribute(jugadores_campo, num_equipos)

    # Calculate team stats
    equipos_resultado = []
    for i, team in enumerate(teams):
        nivel_promedio = (
            sum(j["_nivel_global"] for j in team) / len(team) if team else 0
        )
        equipos_resultado.append({
            "nombre": f"Equipo {i + 1}",
            "jugadores": [
                {
                    "id": j.get("id"),
                    "nombre": j.get("nombre", ""),
                    "apellidos": j.get("apellidos", ""),
                    "dorsal": j.get("dorsal"),
                    "posicion_principal": j.get("posicion_principal"),
                    "nivel_global": j["_nivel_global"],
                    "foto_url": j.get("foto_url"),
                }
                for j in team
            ],
            "nivel_promedio": round(nivel_promedio, 1),
            "num_jugadores": len(team),
        })

    # Assign goalkeepers: round-robin if con_porteros, otherwise separate group
    porteros_asignados = []
    if porteros:
        if con_porteros:
            for i, p in enumerate(porteros[:num_equipos]):
                porteros_asignados.append({
                    "equipo": f"Equipo {i + 1}",
                    "jugador": {
                        "id": p.get("id"),
                        "nombre": p.get("nombre", ""),
                        "apellidos": p.get("apellidos", ""),
                        "dorsal": p.get("dorsal"),
                        "posicion_principal": "POR",
                        "nivel_global": p["_nivel_global"],
                        "foto_url": p.get("foto_url"),
                    },
                })
        else:
            # Goalkeepers as separate unassigned group
            for p in porteros:
                porteros_asignados.append({
                    "equipo": "Porteros",
                    "jugador": {
                        "id": p.get("id"),
                        "nombre": p.get("nombre", ""),
                        "apellidos": p.get("apellidos", ""),
                        "dorsal": p.get("dorsal"),
                        "posicion_principal": "POR",
                        "nivel_global": p["_nivel_global"],
                        "foto_url": p.get("foto_url"),
                    },
                })

    # Format comodines
    comodines_resultado = [
        {
            "id": j.get("id"),
            "nombre": j.get("nombre", ""),
            "apellidos": j.get("apellidos", ""),
            "dorsal": j.get("dorsal"),
            "posicion_principal": j.get("posicion_principal"),
            "nivel_global": j["_nivel_global"],
            "foto_url": j.get("foto_url"),
        }
        for j in comodines
    ]

    # Global balance stats
    niveles = [e["nivel_promedio"] for e in equipos_resultado if e["num_jugadores"] > 0]
    diff_max = max(niveles) - min(niveles) if len(niveles) > 1 else 0

    return {
        "estructura": estructura,
        "criterio": criterio,
        "equipos": equipos_resultado,
        "comodines": comodines_resultado,
        "porteros": porteros_asignados,
        "estadisticas": {
            "total_jugadores": len(jugadores_presentes),
            "jugadores_asignados": sum(e["num_jugadores"] for e in equipos_resultado),
            "diferencia_nivel_max": round(diff_max, 2),
            "equilibrado": diff_max < 0.5,
        },
    }


# ============ Per-Task Multi-Instance Formation ============

COLORES_EQUIPO = [
    ("#EF4444", "Equipo Rojo"),
    ("#3B82F6", "Equipo Azul"),
    ("#22C55E", "Equipo Verde"),
    ("#F97316", "Equipo Naranja"),
    ("#8B5CF6", "Equipo Morado"),
    ("#EC4899", "Equipo Rosa"),
]
COLOR_COMODIN = ("#EAB308", "Comodines")
COLOR_PORTERO = ("#6B7280", "Porteros")


def _build_estructura_str(jpe: int, num_equipos: int, comodines: int) -> str:
    """Build estructura string like '4v4+2' from components."""
    base = "v".join([str(jpe)] * num_equipos)
    if comodines > 0:
        base += f"+{comodines}"
    return base


def generar_formacion_tarea(
    jugadores_presentes: List[dict],
    estructura: str,
    criterio: str = "equilibrado",
) -> dict:
    """
    Genera formacion de equipos por tarea con soporte multi-instancia.

    Si hay mas jugadores de los que caben en una instancia de la estructura,
    se crean multiples espacios. El ultimo espacio se adapta si no caben
    exactamente.

    Args:
        jugadores_presentes: Lista de dicts con datos de jugador (id, nombre, etc.)
        estructura: Formato "NvN", "NvN+comodines", "NvN+GK"
        criterio: "equilibrado" | "por_nivel"

    Returns:
        dict compatible con FormacionEquipos
    """
    config = _parse_estructura(estructura)
    num_equipos = config["num_equipos"]
    jpe = config["jugadores_por_equipo"]  # jugadores por equipo
    num_comodines = config["comodines"]
    con_porteros = config["con_porteros"]

    # Calculate per-instance capacity
    total_por_instancia = (num_equipos * jpe) + num_comodines

    # Always separate goalkeepers from field players
    porteros = []
    jugadores_campo = []
    for j in jugadores_presentes:
        j["_nivel_global"] = _calculate_nivel_global(j)
        if j.get("es_portero"):
            porteros.append(j)
        else:
            jugadores_campo.append(j)

    # Sort by level descending for distribution
    jugadores_campo.sort(key=lambda x: x["_nivel_global"], reverse=True)

    total_campo = len(jugadores_campo)

    if total_campo == 0:
        return {
            "estructura_original": estructura,
            "auto_generado": True,
            "espacios": [],
        }

    # Calculate number of instances
    if total_por_instancia <= 0:
        total_por_instancia = max(total_campo, 1)

    num_instancias = max(1, ceil(total_campo / total_por_instancia))

    # Fill instances sequentially: first instance gets full capacity, last gets remainder
    jugadores_por_instancia: List[List[dict]] = []
    remaining = list(jugadores_campo)
    for inst in range(num_instancias):
        if inst < num_instancias - 1:
            # Full instance
            jugadores_por_instancia.append(remaining[:total_por_instancia])
            remaining = remaining[total_por_instancia:]
        else:
            # Last instance gets whatever is left
            jugadores_por_instancia.append(remaining)

    # Build each espacio
    espacios = []
    color_idx = 0

    for inst_idx in range(num_instancias):
        inst_jugadores = jugadores_por_instancia[inst_idx]
        inst_total = len(inst_jugadores)

        # Adapt structure for this instance
        if inst_total >= total_por_instancia:
            # Full instance
            inst_jpe = jpe
            inst_comodines = num_comodines
        else:
            # Fewer players - adapt proportionally, keeping comodines if possible
            if num_comodines > 0 and inst_total > num_equipos + num_comodines:
                inst_comodines = num_comodines
                inst_jpe = (inst_total - inst_comodines) // num_equipos
            elif inst_total >= num_equipos * 2:
                inst_comodines = max(0, inst_total - (num_equipos * ((inst_total) // num_equipos)))
                inst_jpe = (inst_total - inst_comodines) // num_equipos
            else:
                inst_comodines = 0
                inst_jpe = inst_total // num_equipos

        if inst_jpe < 1:
            inst_jpe = 1

        inst_estructura = _build_estructura_str(inst_jpe, num_equipos, inst_comodines)

        # Separate comodines (top-rated) from team players
        comodin_players = []
        team_players = []
        if inst_comodines > 0:
            comodin_players = inst_jugadores[:inst_comodines]
            team_players = inst_jugadores[inst_comodines:]
        else:
            team_players = inst_jugadores

        # Distribute team players using serpentine
        if criterio == "equilibrado":
            zones: dict[str, list] = {}
            for j in team_players:
                zone = POSITION_ZONES.get(j.get("posicion_principal", ""), "otro")
                zones.setdefault(zone, []).append(j)
            teams: List[List[dict]] = [[] for _ in range(num_equipos)]
            for zone_players in zones.values():
                zone_players.sort(key=lambda x: x["_nivel_global"], reverse=True)
                distributed = _serpentine_distribute(zone_players, num_equipos)
                for i, tp in enumerate(distributed):
                    teams[i].extend(tp)
        else:
            teams = _serpentine_distribute(team_players, num_equipos)

        # Build grupos
        grupos = []
        for team_idx, team in enumerate(teams):
            ci = (color_idx + team_idx) % len(COLORES_EQUIPO)
            color, nombre = COLORES_EQUIPO[ci]
            grupos.append({
                "nombre": nombre,
                "color": color,
                "tipo": "equipo",
                "jugador_ids": [str(j.get("id", "")) for j in team],
            })

        if comodin_players:
            grupos.append({
                "nombre": COLOR_COMODIN[1],
                "color": COLOR_COMODIN[0],
                "tipo": "comodin",
                "jugador_ids": [str(j.get("id", "")) for j in comodin_players],
            })

        # Assign porteros to this instance (round-robin across instances)
        inst_porteros = [p for pi, p in enumerate(porteros) if pi % num_instancias == inst_idx]
        if inst_porteros:
            grupos.append({
                "nombre": COLOR_PORTERO[1],
                "color": COLOR_PORTERO[0],
                "tipo": "portero",
                "jugador_ids": [str(p.get("id", "")) for p in inst_porteros],
            })

        # Filter empty equipo groups (can happen when few players)
        grupos = [g for g in grupos if g["tipo"] != "equipo" or len(g["jugador_ids"]) > 0]

        espacios.append({
            "nombre": f"Espacio {inst_idx + 1}",
            "estructura": inst_estructura,
            "grupos": grupos,
        })

        color_idx += num_equipos

    return {
        "estructura_original": estructura,
        "auto_generado": True,
        "espacios": espacios,
    }
