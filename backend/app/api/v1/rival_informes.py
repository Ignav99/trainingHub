"""
TrainingHub Pro — API Informes Rival Enriquecidos
Informes tácticos completos del rival con jugadores clave, sistema y tendencias.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional
from uuid import UUID

from app.models.plan_partido import (
    InformeRivalEnriquecidoCreate,
    InformeRivalEnriquecidoResponse,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

router = APIRouter()


@router.post("/rivales/{rival_id}/informes", response_model=InformeRivalEnriquecidoResponse, status_code=status.HTTP_201_CREATED)
async def create_informe_rival(
    rival_id: UUID,
    informe: InformeRivalEnriquecidoCreate,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_UPDATE)),
):
    """Crea un informe enriquecido del rival."""
    supabase = get_supabase()

    data = informe.model_dump(mode="json", exclude_none=True)
    data["rival_id"] = str(rival_id)
    if data.get("partido_id"):
        data["partido_id"] = str(data["partido_id"])
    data["created_by"] = auth.usuario_id

    response = supabase.table("informes_rival").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error al crear informe")

    return InformeRivalEnriquecidoResponse(**response.data[0])


@router.get("/rivales/{rival_id}/informes")
async def list_informes_rival(
    rival_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """Lista todos los informes de un rival."""
    supabase = get_supabase()

    response = supabase.table("informes_rival").select("*").eq(
        "rival_id", str(rival_id)
    ).order("created_at", desc=True).execute()

    return {"data": [InformeRivalEnriquecidoResponse(**i) for i in response.data], "total": len(response.data)}


@router.get("/rivales/{rival_id}/informes/latest", response_model=InformeRivalEnriquecidoResponse)
async def get_latest_informe_rival(
    rival_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """Obtiene el último informe del rival."""
    supabase = get_supabase()

    response = supabase.table("informes_rival").select("*").eq(
        "rival_id", str(rival_id)
    ).order("created_at", desc=True).limit(1).single().execute()

    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay informes para este rival")

    return InformeRivalEnriquecidoResponse(**response.data)
