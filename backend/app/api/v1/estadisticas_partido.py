"""
TrainingHub Pro - Router de Estadísticas de Partido
GET y PUT (upsert) de estadísticas de equipo por partido.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from uuid import UUID

from app.models import (
    EstadisticaPartidoUpdate,
    EstadisticaPartidoResponse,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

router = APIRouter()


@router.get("/{partido_id}", response_model=EstadisticaPartidoResponse)
async def get_estadisticas_partido(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Obtiene las estadísticas de un partido. Devuelve objeto vacío si no existe."""
    supabase = get_supabase()

    response = supabase.table("estadisticas_partido").select("*").eq(
        "partido_id", str(partido_id)
    ).execute()

    if response.data and len(response.data) > 0:
        return EstadisticaPartidoResponse(**response.data[0])

    # Return empty default stats
    return EstadisticaPartidoResponse(
        id="00000000-0000-0000-0000-000000000000",
        partido_id=partido_id,
        tiros_a_puerta=0, ocasiones_gol=0, saques_esquina=0, penaltis=0,
        fueras_juego=0, faltas_cometidas=0, tarjetas_amarillas=0, tarjetas_rojas=0,
        balones_perdidos=0, balones_recuperados=0,
        rival_tiros_a_puerta=0, rival_ocasiones_gol=0, rival_saques_esquina=0, rival_penaltis=0,
        rival_fueras_juego=0, rival_faltas_cometidas=0, rival_tarjetas_amarillas=0, rival_tarjetas_rojas=0,
        rival_balones_perdidos=0, rival_balones_recuperados=0,
        goles_por_periodo={}, tipos_gol_favor={}, tipos_gol_contra={},
        comentario_tactico="",
        created_at="2000-01-01T00:00:00Z",
        updated_at="2000-01-01T00:00:00Z",
    )


@router.put("/{partido_id}", response_model=EstadisticaPartidoResponse)
async def upsert_estadisticas_partido(
    partido_id: UUID,
    data: EstadisticaPartidoUpdate,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """Crea o actualiza las estadísticas de un partido (upsert)."""
    supabase = get_supabase()

    update_data = data.model_dump(exclude_unset=True, mode="json")

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    # Check if exists
    existing = supabase.table("estadisticas_partido").select("id").eq(
        "partido_id", str(partido_id)
    ).execute()

    if existing.data and len(existing.data) > 0:
        # Update
        response = supabase.table("estadisticas_partido").update(update_data).eq(
            "partido_id", str(partido_id)
        ).execute()
    else:
        # Insert
        update_data["partido_id"] = str(partido_id)
        response = supabase.table("estadisticas_partido").insert(update_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al guardar estadísticas"
        )

    return EstadisticaPartidoResponse(**response.data[0])
