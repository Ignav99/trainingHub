"""
TrainingHub Pro - Router de Suscripciones
Endpoints para planes, suscripcion actual, uso, y facturacion.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.models import (
    PlanResponse,
    PlanListResponse,
    SuscripcionResponse,
    SuscripcionUpgrade,
    HistorialSuscripcionResponse,
    HistorialListResponse,
    UsageResponse,
)
from app.security.permissions import Permission
from app.security.license_checker import LicenseChecker

router = APIRouter()


# ============ Planes (public) ============

@router.get("/planes", response_model=PlanListResponse)
async def list_planes():
    """Lista todos los planes disponibles (public)."""
    supabase = get_supabase()
    result = supabase.table("planes").select("*").eq("activo", True).order("orden").execute()
    return PlanListResponse(data=[PlanResponse(**p) for p in result.data])


@router.get("/planes/{plan_codigo}", response_model=PlanResponse)
async def get_plan(plan_codigo: str):
    """Obtiene un plan por su codigo (public)."""
    supabase = get_supabase()
    result = supabase.table("planes").select("*").eq("codigo", plan_codigo).single().execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan no encontrado.")
    return PlanResponse(**result.data)


# ============ Suscripcion actual ============

@router.get("/actual", response_model=SuscripcionResponse)
async def get_suscripcion_actual(
    auth: AuthContext = Depends(require_permission()),
):
    """Obtiene la suscripcion actual de la organizacion del usuario."""
    if not auth.organizacion_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario sin organizacion.")

    supabase = get_supabase()
    result = (
        supabase.table("suscripciones")
        .select("*, planes(*)")
        .eq("organizacion_id", auth.organizacion_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suscripcion no encontrada.")

    sub_data = result.data
    sub_data["plan"] = sub_data.pop("planes", None)
    return SuscripcionResponse(**sub_data)


# ============ Usage ============

@router.get("/uso", response_model=UsageResponse)
async def get_usage(
    auth: AuthContext = Depends(require_permission()),
):
    """Obtiene el uso actual vs limites del plan."""
    if not auth.organizacion_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario sin organizacion.")

    org_id = auth.organizacion_id
    sub = LicenseChecker.get_subscription(org_id)

    if not sub:
        return UsageResponse()

    plan = sub.get("planes", {})
    supabase = get_supabase()

    # Count KB documents
    kb_count = 0
    try:
        kb_result = (
            supabase.table("documentos_kb")
            .select("id", count="exact")
            .eq("organizacion_id", org_id)
            .execute()
        )
        kb_count = kb_result.count or 0
    except Exception:
        pass

    return UsageResponse(
        equipos=sub.get("uso_equipos", 0),
        max_equipos=plan.get("max_equipos", 1),
        storage_mb=sub.get("uso_storage_mb", 0),
        max_storage_mb=plan.get("max_storage_mb", 500),
        ai_calls_month=sub.get("uso_ai_calls_month", 0),
        max_ai_calls_month=plan.get("max_ai_calls_month", 50),
        kb_documents=kb_count,
        max_kb_documents=plan.get("max_kb_documents", 10),
        max_staff_per_team=plan.get("max_usuarios_por_equipo", 5),
        max_players_per_team=plan.get("max_jugadores_por_equipo", 25),
    )


# ============ Upgrade/Downgrade ============

@router.post("/upgrade", response_model=SuscripcionResponse)
async def upgrade_plan(
    data: SuscripcionUpgrade,
    auth: AuthContext = Depends(require_permission(Permission.CLUB_MANAGE_BILLING)),
):
    """Upgrade o cambio de plan."""
    supabase = get_supabase()

    # Get new plan
    new_plan = (
        supabase.table("planes")
        .select("*")
        .eq("codigo", data.nuevo_plan_codigo)
        .eq("activo", True)
        .single()
        .execute()
    )
    if not new_plan.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan no encontrado.")

    # Get current subscription
    current_sub = (
        supabase.table("suscripciones")
        .select("*")
        .eq("organizacion_id", auth.organizacion_id)
        .single()
        .execute()
    )
    if not current_sub.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suscripcion no encontrada.")

    old_plan_id = current_sub.data["plan_id"]
    new_plan_id = new_plan.data["id"]

    # Determine if upgrade or downgrade
    old_plan_data = supabase.table("planes").select("orden").eq("id", old_plan_id).single().execute()
    is_upgrade = new_plan.data["orden"] > (old_plan_data.data["orden"] if old_plan_data.data else 0)

    # Update subscription
    supabase.table("suscripciones").update({
        "plan_id": new_plan_id,
        "ciclo": data.ciclo.value,
        "estado": "active",
    }).eq("organizacion_id", auth.organizacion_id).execute()

    # If plan changes to club, update org
    if new_plan.data["tipo_licencia"] == "club":
        supabase.table("organizaciones").update({
            "tipo_licencia": "club",
        }).eq("id", auth.organizacion_id).execute()

    # Record history
    supabase.table("historial_suscripciones").insert({
        "organizacion_id": auth.organizacion_id,
        "plan_anterior_id": old_plan_id,
        "plan_nuevo_id": new_plan_id,
        "accion": "upgraded" if is_upgrade else "downgraded",
    }).execute()

    # Return updated subscription
    result = (
        supabase.table("suscripciones")
        .select("*, planes(*)")
        .eq("organizacion_id", auth.organizacion_id)
        .single()
        .execute()
    )
    sub_data = result.data
    sub_data["plan"] = sub_data.pop("planes", None)
    return SuscripcionResponse(**sub_data)


# ============ Cancel ============

@router.post("/cancel", response_model=SuscripcionResponse)
async def cancel_suscripcion(
    auth: AuthContext = Depends(require_permission(Permission.CLUB_MANAGE_BILLING)),
):
    """Cancelar suscripcion (se mantiene hasta fin del periodo)."""
    supabase = get_supabase()

    current_sub = (
        supabase.table("suscripciones")
        .select("*")
        .eq("organizacion_id", auth.organizacion_id)
        .single()
        .execute()
    )
    if not current_sub.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Suscripcion no encontrada.")

    from datetime import datetime, timezone
    supabase.table("suscripciones").update({
        "estado": "cancelled",
        "fecha_cancelacion": datetime.now(timezone.utc).isoformat(),
    }).eq("organizacion_id", auth.organizacion_id).execute()

    supabase.table("historial_suscripciones").insert({
        "organizacion_id": auth.organizacion_id,
        "plan_anterior_id": current_sub.data["plan_id"],
        "accion": "cancelled",
    }).execute()

    result = (
        supabase.table("suscripciones")
        .select("*, planes(*)")
        .eq("organizacion_id", auth.organizacion_id)
        .single()
        .execute()
    )
    sub_data = result.data
    sub_data["plan"] = sub_data.pop("planes", None)
    return SuscripcionResponse(**sub_data)


# ============ Historial ============

@router.get("/historial", response_model=HistorialListResponse)
async def get_historial(
    auth: AuthContext = Depends(require_permission()),
):
    """Obtiene historial de cambios de suscripcion."""
    if not auth.organizacion_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario sin organizacion.")

    supabase = get_supabase()
    result = (
        supabase.table("historial_suscripciones")
        .select("*")
        .eq("organizacion_id", auth.organizacion_id)
        .order("created_at", desc=True)
        .execute()
    )
    return HistorialListResponse(data=[HistorialSuscripcionResponse(**h) for h in result.data])


# ============ Trial check ============

@router.get("/trial-status")
async def get_trial_status(
    auth: AuthContext = Depends(require_permission()),
):
    """Verifica el estado del trial."""
    if not auth.organizacion_id:
        return {"is_trial": False}

    is_valid, days_remaining = LicenseChecker.check_trial_expiry(auth.organizacion_id)
    return {
        "is_trial": days_remaining is not None,
        "is_valid": is_valid,
        "days_remaining": days_remaining,
    }
