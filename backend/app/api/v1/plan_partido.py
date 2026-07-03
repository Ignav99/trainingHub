"""
TrainingHub Pro — API Plan de Partido
CRUD del plan de partido con fases, emparejamientos, momentos y escenarios.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID

from app.models.plan_partido import (
    PlanPartidoCreate,
    PlanPartidoUpdate,
    PlanPartidoResponse,
    FasePlan,
    FasePlanABP,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

router = APIRouter()


@router.post("/microciclos/{microciclo_id}/plan-partido", response_model=PlanPartidoResponse, status_code=status.HTTP_201_CREATED)
async def create_plan_partido(
    microciclo_id: UUID,
    plan: PlanPartidoCreate,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_CREATE)),
):
    """Crea un plan de partido para un microciclo."""
    supabase = get_supabase()

    # Verificar que el microciclo existe
    micro = supabase.table("microciclos").select("id, partido_id").eq("id", str(microciclo_id)).single().execute()
    if not micro.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Microciclo no encontrado")

    data = _serialize_plan(plan)
    data["microciclo_id"] = str(microciclo_id)
    data["created_by"] = auth.usuario_id

    response = supabase.table("planes_partido").insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Error al crear plan de partido")

    return PlanPartidoResponse(**response.data[0])


@router.get("/microciclos/{microciclo_id}/plan-partido", response_model=PlanPartidoResponse)
async def get_plan_partido(
    microciclo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_READ)),
):
    """Obtiene el plan de partido de un microciclo."""
    supabase = get_supabase()

    response = supabase.table("planes_partido").select("*").eq("microciclo_id", str(microciclo_id)).limit(1).single().execute()
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan de partido no encontrado")

    return PlanPartidoResponse(**response.data)


@router.put("/planes-partido/{plan_id}", response_model=PlanPartidoResponse)
async def update_plan_partido(
    plan_id: UUID,
    plan: PlanPartidoUpdate,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_UPDATE)),
):
    """Actualiza un plan de partido."""
    supabase = get_supabase()

    existing = supabase.table("planes_partido").select("id").eq("id", str(plan_id)).single().execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan de partido no encontrado")

    update_data = _serialize_update(plan)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay datos para actualizar")

    response = supabase.table("planes_partido").update(update_data).eq("id", str(plan_id)).execute()
    return PlanPartidoResponse(**response.data[0])


@router.post("/planes-partido/{plan_id}/fases/{fase}/video-clips")
async def vincular_video_clips(
    plan_id: UUID,
    fase: str,
    clips: list[UUID],
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_UPDATE)),
):
    """Vincula video clips a una fase del plan de partido."""
    supabase = get_supabase()

    existing = supabase.table("planes_partido").select("id").eq("id", str(plan_id)).single().execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan de partido no encontrado")

    plan_data = existing.data
    fase_key = f"fase_{fase}"
    if fase_key in plan_data and plan_data[fase_key]:
        fase_data = plan_data[fase_key]
        if isinstance(fase_data, dict):
            fase_data["video_clips"] = [str(c) for c in clips]
        plan_data[fase_key] = fase_data

    supabase.table("planes_partido").update({fase_key: plan_data[fase_key]}).eq("id", str(plan_id)).execute()
    return {"ok": True, "clips_vinculados": len(clips)}


@router.delete("/planes-partido/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan_partido(
    plan_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_DELETE)),
):
    """Elimina un plan de partido."""
    supabase = get_supabase()
    existing = supabase.table("planes_partido").select("id").eq("id", str(plan_id)).single().execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan de partido no encontrado")
    supabase.table("planes_partido").delete().eq("id", str(plan_id)).execute()
    return None


def _serialize_plan(plan: PlanPartidoCreate) -> dict:
    """Convierte el plan a dict JSON-safe para Supabase."""
    data = plan.model_dump(mode="json", exclude_none=True)
    data["partido_id"] = str(data["partido_id"])
    data["microciclo_id"] = str(data["microciclo_id"])
    if data.get("game_model_id"):
        data["game_model_id"] = str(data["game_model_id"])
    if data.get("capitan_id"):
        data["capitan_id"] = str(data["capitan_id"])
    data["suplentes"] = [str(s) for s in data.get("suplentes", [])]
    data["descartados"] = [str(d) for d in data.get("descartados", [])]
    return data


def _serialize_update(plan: PlanPartidoUpdate) -> dict:
    """Convierte la actualización a dict JSON-safe."""
    data = plan.model_dump(exclude_unset=True, mode="json")
    if "suplentes" in data and data["suplentes"]:
        data["suplentes"] = [str(s) for s in data["suplentes"]]
    if "descartados" in data and data["descartados"]:
        data["descartados"] = [str(d) for d in data["descartados"]]
    return data
