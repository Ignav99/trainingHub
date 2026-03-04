"""
TrainingHub Pro - Router de Exportaciones
Endpoints para exportar datos en CSV.
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import Optional
from uuid import UUID
from datetime import date
import io

from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.services.export_service import (
    export_jugadores_csv,
    export_sesiones_csv,
    export_rpe_csv,
    export_partidos_csv,
    export_convocatoria_csv,
)

router = APIRouter()


def _csv_response(content: str, filename: str) -> StreamingResponse:
    """Helper to create a CSV StreamingResponse with BOM for Excel compatibility."""
    # Add UTF-8 BOM for proper Excel encoding
    bom = "\ufeff"
    return StreamingResponse(
        io.StringIO(bom + content),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/jugadores")
async def export_jugadores(
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(Permission.EXPORT_DATA)),
):
    """Exporta la plantilla de jugadores en CSV."""
    supabase = get_supabase()

    response = supabase.table("jugadores").select(
        "dorsal, nombre, apellidos, posicion_principal, "
        "estado, fecha_nacimiento, "
        "nivel_tecnico, nivel_tactico, nivel_fisico, nivel_mental, es_convocable"
    ).eq("equipo_id", str(equipo_id)).order("dorsal").execute()

    csv_content = export_jugadores_csv(response.data)
    return _csv_response(csv_content, "plantilla.csv")


@router.get("/sesiones")
async def export_sesiones(
    equipo_id: UUID = Query(...),
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    auth: AuthContext = Depends(require_permission(Permission.EXPORT_DATA)),
):
    """Exporta sesiones de entrenamiento en CSV."""
    supabase = get_supabase()

    query = supabase.table("sesiones").select(
        "fecha, titulo, match_day, estado, duracion_total, "
        "objetivo_principal, fase_juego_principal, principio_tactico_principal, "
        "intensidad_objetivo, notas_pre, notas_post"
    ).eq("equipo_id", str(equipo_id))

    if fecha_desde:
        query = query.gte("fecha", fecha_desde.isoformat())
    if fecha_hasta:
        query = query.lte("fecha", fecha_hasta.isoformat())

    response = query.order("fecha", desc=True).execute()

    csv_content = export_sesiones_csv(response.data)
    return _csv_response(csv_content, "sesiones.csv")


@router.get("/rpe")
async def export_rpe(
    equipo_id: UUID = Query(...),
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    auth: AuthContext = Depends(require_permission(Permission.EXPORT_DATA)),
):
    """Exporta registros RPE del equipo en CSV."""
    supabase = get_supabase()

    # Get players for mapping
    jugadores = supabase.table("jugadores").select(
        "id, nombre, apellidos"
    ).eq("equipo_id", str(equipo_id)).execute()

    jugador_ids = [j["id"] for j in jugadores.data]
    jugador_map = {j["id"]: f"{j['nombre']} {j['apellidos']}" for j in jugadores.data}

    if not jugador_ids:
        csv_content = export_rpe_csv([], jugador_map)
        return _csv_response(csv_content, "rpe.csv")

    query = supabase.table("registros_rpe").select(
        "jugador_id, fecha, rpe, carga_sesion, sueno, fatiga, dolor, estres, humor, notas"
    ).in_("jugador_id", jugador_ids)

    if fecha_desde:
        query = query.gte("fecha", fecha_desde.isoformat())
    if fecha_hasta:
        query = query.lte("fecha", fecha_hasta.isoformat())

    response = query.order("fecha", desc=True).execute()

    csv_content = export_rpe_csv(response.data, jugador_map)
    return _csv_response(csv_content, "rpe.csv")


@router.get("/partidos")
async def export_partidos(
    equipo_id: UUID = Query(...),
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    auth: AuthContext = Depends(require_permission(Permission.EXPORT_DATA)),
):
    """Exporta partidos del equipo en CSV."""
    supabase = get_supabase()

    query = supabase.table("partidos").select(
        "fecha, hora, localia, competicion, "
        "goles_favor, goles_contra, resultado, "
        "sistema_rival, notas_tacticas, "
        "rivales(nombre)"
    ).eq("equipo_id", str(equipo_id))

    if fecha_desde:
        query = query.gte("fecha", fecha_desde.isoformat())
    if fecha_hasta:
        query = query.lte("fecha", fecha_hasta.isoformat())

    response = query.order("fecha", desc=True).execute()

    for p in response.data:
        p["rival"] = p.pop("rivales", None)

    csv_content = export_partidos_csv(response.data)
    return _csv_response(csv_content, "partidos.csv")


@router.get("/convocatoria/{partido_id}")
async def export_convocatoria(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.EXPORT_DATA)),
):
    """Exporta la convocatoria de un partido en CSV."""
    supabase = get_supabase()

    response = supabase.table("convocatorias").select(
        "dorsal, titular, posicion_asignada, minutos_jugados, "
        "goles, asistencias, tarjeta_amarilla, tarjeta_roja, notas, "
        "jugadores(nombre, apellidos, dorsal)"
    ).eq("partido_id", str(partido_id)).order("titular", desc=True).execute()

    for c in response.data:
        c["jugador"] = c.pop("jugadores", None)

    csv_content = export_convocatoria_csv(response.data)
    return _csv_response(csv_content, f"convocatoria_{partido_id}.csv")
