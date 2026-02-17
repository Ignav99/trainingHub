"""
TrainingHub Pro - Export Service
Genera archivos CSV para exportar datos de sesiones, jugadores, RPE, etc.
"""

import csv
import io
from typing import Any


def export_jugadores_csv(jugadores: list[dict]) -> str:
    """Genera CSV con datos de plantilla."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Dorsal", "Nombre", "Apellidos", "Posicion", "Posicion Secundaria",
        "Estado", "Pie Dominante", "Fecha Nacimiento",
        "Nivel Tecnico", "Nivel Tactico", "Nivel Fisico", "Nivel Mental",
        "Convocable",
    ])

    for j in jugadores:
        writer.writerow([
            j.get("dorsal", ""),
            j.get("nombre", ""),
            j.get("apellidos", ""),
            j.get("posicion_principal", ""),
            j.get("posicion_secundaria", ""),
            j.get("estado", "activo"),
            j.get("pie_dominante", ""),
            j.get("fecha_nacimiento", ""),
            j.get("nivel_tecnico", ""),
            j.get("nivel_tactico", ""),
            j.get("nivel_fisico", ""),
            j.get("nivel_mental", ""),
            "Si" if j.get("es_convocable", True) else "No",
        ])

    return output.getvalue()


def export_sesiones_csv(sesiones: list[dict]) -> str:
    """Genera CSV con datos de sesiones."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Fecha", "Titulo", "Match Day", "Estado",
        "Duracion (min)", "Objetivo Principal",
        "Fase de Juego", "Principio Tactico",
        "Intensidad", "Notas Pre", "Notas Post",
    ])

    for s in sesiones:
        writer.writerow([
            s.get("fecha", ""),
            s.get("titulo", ""),
            s.get("match_day", ""),
            s.get("estado", ""),
            s.get("duracion_total", ""),
            s.get("objetivo_principal", ""),
            s.get("fase_juego_principal", ""),
            s.get("principio_tactico_principal", ""),
            s.get("intensidad_objetivo", ""),
            s.get("notas_pre", ""),
            s.get("notas_post", ""),
        ])

    return output.getvalue()


def export_rpe_csv(registros: list[dict], jugador_map: dict[str, str] | None = None) -> str:
    """Genera CSV con registros RPE."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Fecha", "Jugador", "RPE (1-10)", "Carga Sesion",
        "Sueno", "Fatiga", "Dolor", "Estres", "Humor",
        "Notas",
    ])

    for r in registros:
        jugador_nombre = ""
        if jugador_map:
            jugador_nombre = jugador_map.get(r.get("jugador_id", ""), "")

        writer.writerow([
            r.get("fecha", ""),
            jugador_nombre,
            r.get("rpe", ""),
            r.get("carga_sesion", ""),
            r.get("sueno", ""),
            r.get("fatiga", ""),
            r.get("dolor", ""),
            r.get("estres", ""),
            r.get("humor", ""),
            r.get("notas", ""),
        ])

    return output.getvalue()


def export_partidos_csv(partidos: list[dict]) -> str:
    """Genera CSV con datos de partidos."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Fecha", "Hora", "Rival", "Localia", "Competicion",
        "Goles Favor", "Goles Contra", "Resultado",
        "Sistema Rival", "Notas Tacticas",
    ])

    for p in partidos:
        rival = p.get("rival") or p.get("rivales") or {}
        rival_nombre = rival.get("nombre", "") if isinstance(rival, dict) else str(rival)

        writer.writerow([
            p.get("fecha", ""),
            p.get("hora", ""),
            rival_nombre,
            p.get("localia", ""),
            p.get("competicion", ""),
            p.get("goles_favor", ""),
            p.get("goles_contra", ""),
            p.get("resultado", ""),
            p.get("sistema_rival", ""),
            p.get("notas_tacticas", ""),
        ])

    return output.getvalue()


def export_convocatoria_csv(convocatorias: list[dict]) -> str:
    """Genera CSV con datos de convocatoria de un partido."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Dorsal", "Jugador", "Titular", "Posicion Asignada",
        "Minutos", "Goles", "Asistencias",
        "Amarilla", "Roja", "Notas",
    ])

    for c in convocatorias:
        jugador = c.get("jugador") or c.get("jugadores") or {}

        writer.writerow([
            c.get("dorsal", jugador.get("dorsal", "")),
            f"{jugador.get('nombre', '')} {jugador.get('apellidos', '')}".strip(),
            "Si" if c.get("titular") else "No",
            c.get("posicion_asignada", ""),
            c.get("minutos_jugados", 0),
            c.get("goles", 0),
            c.get("asistencias", 0),
            "Si" if c.get("tarjeta_amarilla") else "No",
            "Si" if c.get("tarjeta_roja") else "No",
            c.get("notas", ""),
        ])

    return output.getvalue()
