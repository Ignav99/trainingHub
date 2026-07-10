"""
TrainingHub Pro — API Informes Rival Enriquecidos
Informes tácticos completos del rival con jugadores clave, sistema y tendencias.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
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


def _serialize_informe(informe: InformeRivalEnriquecidoCreate) -> dict:
    """Convierte el informe a dict JSON-safe para Supabase."""
    data = informe.model_dump(mode="json", exclude_none=True)
    if data.get("partido_id"):
        data["partido_id"] = str(data["partido_id"])
    return data


@router.post("/rivales/{rival_id}/informes-enriquecidos", response_model=InformeRivalEnriquecidoResponse, status_code=status.HTTP_201_CREATED)
async def create_informe_rival(
    rival_id: UUID,
    informe: InformeRivalEnriquecidoCreate,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_UPDATE)),
):
    """Crea un informe enriquecido del rival."""
    supabase = get_supabase()

    # Verificar que el rival existe
    rival = supabase.table("rivales").select("id, nombre").eq("id", str(rival_id)).single().execute()
    if not rival.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rival no encontrado")

    data = _serialize_informe(informe)
    data["rival_id"] = str(rival_id)
    data["created_by"] = auth.usuario_id

    response = supabase.table("informes_rival").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error al crear informe")

    return InformeRivalEnriquecidoResponse(**response.data[0])


@router.get("/rivales/{rival_id}/informes-enriquecidos")
async def list_informes_rival(
    rival_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """Lista todos los informes enriquecidos de un rival."""
    supabase = get_supabase()

    offset = (page - 1) * limit
    response = supabase.table("informes_rival").select("*", count="exact").eq(
        "rival_id", str(rival_id)
    ).order("created_at", desc=True).range(offset, offset + limit - 1).execute()

    return {
        "data": [InformeRivalEnriquecidoResponse(**i) for i in response.data],
        "total": response.count or 0,
        "page": page,
        "limit": limit,
    }


@router.get("/rivales/{rival_id}/informes-enriquecidos/latest", response_model=InformeRivalEnriquecidoResponse)
async def get_latest_informe_rival(
    rival_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """Obtiene el último informe enriquecido del rival."""
    supabase = get_supabase()

    response = supabase.table("informes_rival").select("*").eq(
        "rival_id", str(rival_id)
    ).order("created_at", desc=True).limit(1).single().execute()

    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay informes para este rival")

    return InformeRivalEnriquecidoResponse(**response.data)


@router.put("/rivales/{rival_id}/informes-enriquecidos/{informe_id}", response_model=InformeRivalEnriquecidoResponse)
async def update_informe_rival(
    rival_id: UUID,
    informe_id: UUID,
    informe: InformeRivalEnriquecidoCreate,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_UPDATE)),
):
    """Actualiza un informe enriquecido de rival."""
    supabase = get_supabase()

    existing = supabase.table("informes_rival").select("id, rival_id").eq("id", str(informe_id)).single().execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Informe no encontrado")
    if str(existing.data.get("rival_id")) != str(rival_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El informe no pertenece a este rival")

    data = _serialize_informe(informe)
    response = supabase.table("informes_rival").update(data).eq("id", str(informe_id)).execute()
    return InformeRivalEnriquecidoResponse(**response.data[0])


@router.delete("/rivales/{rival_id}/informes-enriquecidos/{informe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_informe_rival(
    rival_id: UUID,
    informe_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_DELETE)),
):
    """Elimina un informe enriquecido de rival."""
    supabase = get_supabase()

    existing = supabase.table("informes_rival").select("id, rival_id").eq("id", str(informe_id)).single().execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Informe no encontrado")
    if str(existing.data.get("rival_id")) != str(rival_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El informe no pertenece a este rival")

    supabase.table("informes_rival").delete().eq("id", str(informe_id)).execute()
    return None
