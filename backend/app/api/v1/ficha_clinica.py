"""CRUD del cuaderno clínico: valoraciones y tests datados."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_supabase
from app.dependencies import require_any_permission, AuthContext
from app.models.ficha_clinica import (
    BloqueEvaluacion,
    EvaluacionCreate,
    EvaluacionListResponse,
    EvaluacionResponse,
    EvaluacionUpdate,
    HabitosResponse,
    HabitosUpdate,
)
from app.security.permissions import Permission

router = APIRouter()


def _row_to_response(row: dict) -> EvaluacionResponse:
    return EvaluacionResponse(
        id=row["id"],
        jugador_id=row["jugador_id"],
        equipo_id=row["equipo_id"],
        bloque=row["bloque"],
        fecha=row["fecha"],
        momento=row.get("momento") or "control",
        titulo=row.get("titulo"),
        datos=row.get("datos") or {},
        notas=row.get("notas"),
        creado_por=row.get("creado_por"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("", response_model=EvaluacionListResponse)
async def list_evaluaciones(
    jugador_id: UUID,
    bloque: Optional[BloqueEvaluacion] = None,
    auth: AuthContext = Depends(
        require_any_permission(Permission.MEDICAL_READ, Permission.PLANTILLA_READ)
    ),
):
    supabase = get_supabase()
    query = (
        supabase.table("jugador_evaluaciones")
        .select("*")
        .eq("jugador_id", str(jugador_id))
        .order("fecha", desc=True)
        .order("created_at", desc=True)
    )
    if bloque:
        query = query.eq("bloque", bloque.value)
    try:
        response = query.execute()
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"Error listando evaluaciones (¿migración 076 aplicada?): {err}",
        ) from err
    rows = response.data or []
    return EvaluacionListResponse(data=[_row_to_response(r) for r in rows], total=len(rows))


@router.post("", response_model=EvaluacionResponse, status_code=status.HTTP_201_CREATED)
async def create_evaluacion(
    data: EvaluacionCreate,
    auth: AuthContext = Depends(
        require_any_permission(Permission.MEDICAL_CREATE, Permission.JUGADOR_UPDATE)
    ),
):
    supabase = get_supabase()
    payload = {
        "jugador_id": str(data.jugador_id),
        "equipo_id": str(data.equipo_id),
        "bloque": data.bloque.value,
        "fecha": data.fecha.isoformat(),
        "momento": data.momento.value,
        "titulo": data.titulo,
        "datos": data.datos or {},
        "notas": data.notas,
        "creado_por": str(auth.user_id) if getattr(auth, "user_id", None) else None,
    }
    try:
        response = supabase.table("jugador_evaluaciones").insert(payload).execute()
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo guardar la evaluación. Aplica la migración 076. {err}",
        ) from err
    if not response.data:
        raise HTTPException(status_code=400, detail="Error al crear la evaluación")
    return _row_to_response(response.data[0])


def _habitos_row(jugador_id: str, row: Optional[dict] = None) -> HabitosResponse:
    row = row or {}
    return HabitosResponse(
        id=row.get("id"),
        jugador_id=row.get("jugador_id") or jugador_id,
        comidas=row.get("comidas"),
        sueno=row.get("sueno"),
        actividades_nocivas=row.get("actividades_nocivas"),
        deportes_externos=row.get("deportes_externos"),
        notas=row.get("notas"),
        datos=row.get("datos") or {},
        actualizado_por=row.get("actualizado_por"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


@router.get("/habitos/{jugador_id}", response_model=HabitosResponse)
async def get_habitos(
    jugador_id: UUID,
    auth: AuthContext = Depends(
        require_any_permission(Permission.MEDICAL_READ, Permission.PLANTILLA_READ)
    ),
):
    supabase = get_supabase()
    try:
        res = (
            supabase.table("jugador_habitos")
            .select("*")
            .eq("jugador_id", str(jugador_id))
            .limit(1)
            .execute()
        )
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"Hábitos no disponibles (¿migración 077?): {err}",
        ) from err
    row = (res.data or [None])[0]
    return _habitos_row(str(jugador_id), row)


@router.put("/habitos/{jugador_id}", response_model=HabitosResponse)
async def upsert_habitos(
    jugador_id: UUID,
    data: HabitosUpdate,
    auth: AuthContext = Depends(
        require_any_permission(Permission.MEDICAL_UPDATE, Permission.JUGADOR_UPDATE)
    ),
):
    supabase = get_supabase()
    payload = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    payload["jugador_id"] = str(jugador_id)
    payload["actualizado_por"] = str(auth.user_id)
    try:
        existing = (
            supabase.table("jugador_habitos")
            .select("id")
            .eq("jugador_id", str(jugador_id))
            .limit(1)
            .execute()
        )
        if existing.data:
            res = (
                supabase.table("jugador_habitos")
                .update(payload)
                .eq("id", existing.data[0]["id"])
                .execute()
            )
        else:
            res = supabase.table("jugador_habitos").insert(payload).execute()
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudieron guardar los hábitos. Aplica la migración 077. {err}",
        ) from err
    if not res.data:
        raise HTTPException(status_code=400, detail="Error al guardar hábitos")
    return _habitos_row(str(jugador_id), res.data[0])


@router.get("/{evaluacion_id}", response_model=EvaluacionResponse)
async def get_evaluacion(
    evaluacion_id: UUID,
    auth: AuthContext = Depends(
        require_any_permission(Permission.MEDICAL_READ, Permission.PLANTILLA_READ)
    ),
):
    supabase = get_supabase()
    response = (
        supabase.table("jugador_evaluaciones")
        .select("*")
        .eq("id", str(evaluacion_id))
        .maybe_single()
        .execute()
    )
    if not response or not response.data:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return _row_to_response(response.data)


@router.put("/{evaluacion_id}", response_model=EvaluacionResponse)
async def update_evaluacion(
    evaluacion_id: UUID,
    data: EvaluacionUpdate,
    auth: AuthContext = Depends(
        require_any_permission(Permission.MEDICAL_UPDATE, Permission.JUGADOR_UPDATE)
    ),
):
    supabase = get_supabase()
    patch = data.model_dump(exclude_unset=True)
    if "fecha" in patch and patch["fecha"] is not None:
        patch["fecha"] = patch["fecha"].isoformat()
    if "momento" in patch and patch["momento"] is not None:
        patch["momento"] = patch["momento"].value if hasattr(patch["momento"], "value") else patch["momento"]
    if not patch:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    response = (
        supabase.table("jugador_evaluaciones")
        .update(patch)
        .eq("id", str(evaluacion_id))
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return _row_to_response(response.data[0])


@router.delete("/{evaluacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_evaluacion(
    evaluacion_id: UUID,
    auth: AuthContext = Depends(
        require_any_permission(Permission.MEDICAL_UPDATE, Permission.JUGADOR_UPDATE)
    ),
):
    supabase = get_supabase()
    supabase.table("jugador_evaluaciones").delete().eq("id", str(evaluacion_id)).execute()
    return None
