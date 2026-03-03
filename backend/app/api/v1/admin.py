"""
TrainingHub Pro - Panel de Super Admin
Endpoints para control de plataforma: organizaciones, usuarios, licencias, invitaciones.
Solo accesible por superadmins (SUPERADMIN_EMAILS o rol superadmin_plataforma).
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.database import get_supabase
from app.config import get_settings
from app.dependencies import get_current_user
from app.models import UsuarioResponse

router = APIRouter()


# ============ Superadmin dependency ============

async def require_superadmin(
    current_user: UsuarioResponse = Depends(get_current_user),
) -> UsuarioResponse:
    """Verifica que el usuario es superadmin de la plataforma."""
    settings = get_settings()
    superadmin_emails = [
        e.strip().lower()
        for e in settings.SUPERADMIN_EMAILS.split(",")
        if e.strip()
    ]

    is_superadmin = (
        current_user.rol == "superadmin_plataforma"
        or (current_user.email and current_user.email.lower() in superadmin_emails)
    )

    if not is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a super administradores.",
        )

    return current_user


# ============ Schemas ============

class AdminOverview(BaseModel):
    total_organizaciones: int
    total_usuarios: int
    total_equipos: int
    suscripciones_activas: int
    suscripciones_trial: int


class UpdateSuscripcionAdmin(BaseModel):
    plan_codigo: Optional[str] = None
    estado: Optional[str] = None
    dias_extra_trial: Optional[int] = None


class AdminInviteCreate(BaseModel):
    organizacion_id: str
    equipo_id: Optional[str] = None
    email: str
    nombre: Optional[str] = None
    rol_en_equipo: str = "segundo_entrenador"
    rol_organizacion: Optional[str] = None


class AdminOrgCreate(BaseModel):
    nombre: str
    plan_codigo: str = "free_trial"
    dias_trial: int = 14


class AdminTeamCreate(BaseModel):
    nombre: str
    categoria: Optional[str] = None
    temporada: Optional[str] = None


# ============ Endpoints ============

@router.get("/overview", response_model=AdminOverview)
async def admin_overview(admin: UsuarioResponse = Depends(require_superadmin)):
    """Resumen general de la plataforma."""
    supabase = get_supabase()

    orgs = supabase.table("organizaciones").select("id", count="exact").execute()
    users = supabase.table("usuarios").select("id", count="exact").execute()
    teams = supabase.table("equipos").select("id", count="exact").eq("activo", True).execute()

    subs_active = (
        supabase.table("suscripciones")
        .select("id", count="exact")
        .eq("estado", "active")
        .execute()
    )
    subs_trial = (
        supabase.table("suscripciones")
        .select("id", count="exact")
        .eq("estado", "trial")
        .execute()
    )

    return AdminOverview(
        total_organizaciones=orgs.count or 0,
        total_usuarios=users.count or 0,
        total_equipos=teams.count or 0,
        suscripciones_activas=subs_active.count or 0,
        suscripciones_trial=subs_trial.count or 0,
    )


@router.get("/organizaciones")
async def admin_list_organizaciones(admin: UsuarioResponse = Depends(require_superadmin)):
    """Lista todas las organizaciones con su suscripcion y equipos."""
    supabase = get_supabase()

    orgs = (
        supabase.table("organizaciones")
        .select("*, suscripciones(*, planes(*))")
        .order("created_at", desc=True)
        .execute()
    )

    result = []
    for org in orgs.data or []:
        # Count members
        members = (
            supabase.table("usuarios")
            .select("id", count="exact")
            .eq("organizacion_id", org["id"])
            .execute()
        )
        # Count teams
        teams = (
            supabase.table("equipos")
            .select("id", count="exact")
            .eq("organizacion_id", org["id"])
            .eq("activo", True)
            .execute()
        )

        subs = org.pop("suscripciones", [])
        sub = subs[0] if subs else None

        result.append({
            **org,
            "suscripcion": sub,
            "num_miembros": members.count or 0,
            "num_equipos": teams.count or 0,
        })

    return result


@router.post("/organizaciones")
async def admin_create_organizacion(
    data: AdminOrgCreate,
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Crea una nueva organizacion con suscripcion inicial."""
    supabase = get_supabase()

    # Lookup plan
    plan = (
        supabase.table("planes")
        .select("*")
        .eq("codigo", data.plan_codigo)
        .single()
        .execute()
    )
    if not plan.data:
        raise HTTPException(status_code=400, detail=f"Plan '{data.plan_codigo}' no encontrado")

    # Create org
    org_result = (
        supabase.table("organizaciones")
        .insert({"nombre": data.nombre})
        .execute()
    )
    if not org_result.data:
        raise HTTPException(status_code=500, detail="Error al crear organizacion")

    org = org_result.data[0]

    # Create subscription
    is_trial = data.plan_codigo == "free_trial" or data.dias_trial > 0
    sub_data = {
        "organizacion_id": org["id"],
        "plan_id": plan.data["id"],
        "estado": "trial" if is_trial else "active",
    }
    if is_trial:
        sub_data["trial_fin"] = (
            datetime.now(timezone.utc) + timedelta(days=data.dias_trial)
        ).isoformat()

    sub_result = supabase.table("suscripciones").insert(sub_data).execute()

    return {
        "organizacion": org,
        "suscripcion": sub_result.data[0] if sub_result.data else None,
    }


@router.post("/organizaciones/{org_id}/equipos")
async def admin_create_equipo(
    org_id: str,
    data: AdminTeamCreate,
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Crea un equipo dentro de una organizacion, verificando limites del plan."""
    supabase = get_supabase()

    # Verify org exists
    org = (
        supabase.table("organizaciones")
        .select("id")
        .eq("id", org_id)
        .single()
        .execute()
    )
    if not org.data:
        raise HTTPException(status_code=404, detail="Organizacion no encontrada")

    # Check plan limits
    sub = (
        supabase.table("suscripciones")
        .select("*, planes(*)")
        .eq("organizacion_id", org_id)
        .execute()
    )
    if sub.data:
        plan_data = sub.data[0].get("planes", {})
        max_equipos = plan_data.get("max_equipos", 1)

        current_teams = (
            supabase.table("equipos")
            .select("id", count="exact")
            .eq("organizacion_id", org_id)
            .eq("activo", True)
            .execute()
        )
        if (current_teams.count or 0) >= max_equipos:
            raise HTTPException(
                status_code=400,
                detail=f"Limite de equipos alcanzado ({max_equipos}). Cambia el plan para crear mas.",
            )

    # Create team
    team_data = {
        "organizacion_id": org_id,
        "nombre": data.nombre,
        "activo": True,
    }
    if data.categoria:
        team_data["categoria"] = data.categoria
    if data.temporada:
        team_data["temporada"] = data.temporada

    result = supabase.table("equipos").insert(team_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Error al crear equipo")

    return result.data[0]


@router.get("/organizaciones/{org_id}/detalle")
async def admin_org_detail(
    org_id: str,
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Detalle de una organizacion: miembros, equipos, suscripcion."""
    supabase = get_supabase()

    org = (
        supabase.table("organizaciones")
        .select("*")
        .eq("id", org_id)
        .single()
        .execute()
    )
    if not org.data:
        raise HTTPException(status_code=404, detail="Organizacion no encontrada")

    members = (
        supabase.table("usuarios")
        .select("id, email, nombre, apellidos, rol, created_at, usuarios_equipos(equipo_id, rol_en_equipo, equipos(nombre))")
        .eq("organizacion_id", org_id)
        .execute()
    )

    teams = (
        supabase.table("equipos")
        .select("id, nombre, categoria, activo, created_at")
        .eq("organizacion_id", org_id)
        .execute()
    )

    sub = (
        supabase.table("suscripciones")
        .select("*, planes(*)")
        .eq("organizacion_id", org_id)
        .execute()
    )

    invites = (
        supabase.table("invitaciones")
        .select("id, email, nombre, rol_en_equipo, rol_organizacion, estado, token, expira_en, created_at")
        .eq("organizacion_id", org_id)
        .eq("estado", "pendiente")
        .execute()
    )

    # Build plan limits and usage info
    suscripcion = sub.data[0] if sub.data else None
    limites = None
    if suscripcion and suscripcion.get("planes"):
        p = suscripcion["planes"]
        active_teams = [t for t in (teams.data or []) if t.get("activo", True)]
        limites = {
            "max_equipos": p.get("max_equipos", 1),
            "max_usuarios_por_equipo": p.get("max_usuarios_por_equipo", 5),
            "max_jugadores_por_equipo": p.get("max_jugadores_por_equipo", 25),
            "max_storage_mb": p.get("max_storage_mb", 500),
            "max_ai_calls_month": p.get("max_ai_calls_month", 50),
            "equipos_usados": len(active_teams),
            "uso_storage_mb": suscripcion.get("uso_storage_mb", 0),
            "uso_ai_calls_month": suscripcion.get("uso_ai_calls_month", 0),
        }

    # Count members per team
    teams_with_members = []
    for team in (teams.data or []):
        team_members = (
            supabase.table("usuarios_equipos")
            .select("id", count="exact")
            .eq("equipo_id", team["id"])
            .execute()
        )
        teams_with_members.append({
            **team,
            "num_miembros": team_members.count or 0,
        })

    return {
        "organizacion": org.data,
        "miembros": members.data or [],
        "equipos": teams_with_members,
        "suscripcion": suscripcion,
        "invitaciones_pendientes": invites.data or [],
        "limites": limites,
    }


@router.patch("/organizaciones/{org_id}/suscripcion")
async def admin_update_suscripcion(
    org_id: str,
    data: UpdateSuscripcionAdmin,
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Actualiza la suscripcion de una organizacion (cambiar plan, estado, extender trial)."""
    supabase = get_supabase()

    sub = (
        supabase.table("suscripciones")
        .select("*")
        .eq("organizacion_id", org_id)
        .single()
        .execute()
    )

    if not sub.data:
        raise HTTPException(status_code=404, detail="Suscripcion no encontrada")

    update_data = {}

    if data.plan_codigo:
        plan = (
            supabase.table("planes")
            .select("id")
            .eq("codigo", data.plan_codigo)
            .single()
            .execute()
        )
        if not plan.data:
            raise HTTPException(status_code=400, detail=f"Plan '{data.plan_codigo}' no encontrado")
        update_data["plan_id"] = plan.data["id"]

    if data.estado:
        update_data["estado"] = data.estado

    if data.dias_extra_trial and data.dias_extra_trial > 0:
        current_trial_fin = sub.data.get("trial_fin")
        if current_trial_fin:
            base = datetime.fromisoformat(current_trial_fin.replace("Z", "+00:00"))
        else:
            base = datetime.now(timezone.utc)
        update_data["trial_fin"] = (base + timedelta(days=data.dias_extra_trial)).isoformat()
        if not data.estado:
            update_data["estado"] = "trial"

    if not update_data:
        raise HTTPException(status_code=400, detail="No hay cambios para aplicar")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("suscripciones")
        .update(update_data)
        .eq("organizacion_id", org_id)
        .execute()
    )

    return result.data[0] if result.data else {"ok": True}


@router.post("/invitaciones")
async def admin_create_invite(
    data: AdminInviteCreate,
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Crea una invitacion para cualquier organizacion. Devuelve el token para generar el enlace."""
    supabase = get_supabase()

    # Verify org exists
    org = (
        supabase.table("organizaciones")
        .select("id")
        .eq("id", data.organizacion_id)
        .single()
        .execute()
    )
    if not org.data:
        raise HTTPException(status_code=404, detail="Organizacion no encontrada")

    # If no equipo_id, get the first active team
    equipo_id = data.equipo_id
    if not equipo_id:
        first_team = (
            supabase.table("equipos")
            .select("id")
            .eq("organizacion_id", data.organizacion_id)
            .eq("activo", True)
            .limit(1)
            .execute()
        )
        if first_team.data:
            equipo_id = first_team.data[0]["id"]

    token = secrets.token_urlsafe(96)
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    invite_data = {
        "email": data.email,
        "nombre": data.nombre,
        "organizacion_id": data.organizacion_id,
        "equipo_id": equipo_id,
        "rol_en_equipo": data.rol_en_equipo,
        "token": token,
        "token_hash": token_hash,
        "estado": "pendiente",
        "expira_en": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "invitado_por": admin.id,
    }
    if data.rol_organizacion:
        invite_data["rol_organizacion"] = data.rol_organizacion

    result = supabase.table("invitaciones").insert(invite_data).execute()

    return {
        "invitacion": result.data[0] if result.data else None,
        "token": token,
        "link": f"/join?token={token}",
    }


@router.get("/usuarios")
async def admin_list_usuarios(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Lista todos los usuarios de la plataforma."""
    supabase = get_supabase()

    query = (
        supabase.table("usuarios")
        .select("*, organizaciones(nombre)", count="exact")
        .order("created_at", desc=True)
    )

    if search:
        query = query.or_(f"email.ilike.%{search}%,nombre.ilike.%{search}%")

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    result = query.execute()

    return {
        "data": result.data or [],
        "total": result.count or 0,
    }


@router.delete("/usuarios/{user_id}")
async def admin_delete_user(
    user_id: str,
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Desactiva un usuario (soft delete)."""
    supabase = get_supabase()

    # Don't allow deleting yourself
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")

    supabase.table("usuarios").update({
        "activo": False,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", user_id).execute()

    return {"ok": True}


@router.get("/planes")
async def admin_list_planes(admin: UsuarioResponse = Depends(require_superadmin)):
    """Lista todos los planes disponibles."""
    supabase = get_supabase()
    result = supabase.table("planes").select("*").eq("activo", True).order("precio_mensual").execute()
    return result.data or []
