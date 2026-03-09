"""
TrainingHub Pro - Router de Descansos
CRUD para días de descanso / festivos.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID
from datetime import date

from app.models.descanso import DescansoCreate, DescansoResponse
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

router = APIRouter()


@router.get("")
async def list_descansos(
    equipo_id: UUID = Query(...),
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Lista descansos de un equipo en un rango de fechas."""
    supabase = get_supabase()

    query = supabase.table("descansos").select("*").eq(
        "equipo_id", str(equipo_id)
    )

    if fecha_desde:
        query = query.gte("fecha", fecha_desde.isoformat())
    if fecha_hasta:
        query = query.lte("fecha", fecha_hasta.isoformat())

    query = query.order("fecha")
    response = query.execute()

    return {"data": response.data or []}


@router.post("")
async def toggle_descanso(
    data: DescansoCreate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_CREATE)),
):
    """Toggle descanso: if exists for equipo+fecha → delete, else create."""
    supabase = get_supabase()

    # Check if descanso already exists for this team+date
    existing = supabase.table("descansos").select("id").eq(
        "equipo_id", str(data.equipo_id)
    ).eq("fecha", data.fecha.isoformat()).execute()

    if existing.data:
        # Delete existing
        supabase.table("descansos").delete().eq(
            "id", existing.data[0]["id"]
        ).execute()
        return {"deleted": True, "id": existing.data[0]["id"]}

    # Create new
    row = {
        "equipo_id": str(data.equipo_id),
        "fecha": data.fecha.isoformat(),
        "tipo": data.tipo,
        "notas": data.notas,
        "created_by": str(auth.user_id) if auth.user_id else None,
    }

    response = supabase.table("descansos").insert(row).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear descanso"
        )

    return response.data[0]


@router.delete("/{descanso_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_descanso(
    descanso_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_CREATE)),
):
    """Elimina un descanso específico."""
    supabase = get_supabase()

    existing = supabase.table("descansos").select("id").eq(
        "id", str(descanso_id)
    ).execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Descanso no encontrado"
        )

    supabase.table("descansos").delete().eq("id", str(descanso_id)).execute()
    return None
