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
from app.services.audit_service import log_action

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

        subs = org.pop("suscripciones", None)
        if isinstance(subs, dict):
            sub = subs
        elif isinstance(subs, list):
            sub = subs[0] if subs else None
        else:
            sub = None

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

    log_action(
        usuario_id=str(admin.id),
        accion="crear",
        entidad_tipo="organizacion",
        entidad_id=org["id"],
        datos_nuevos={"nombre": data.nombre, "plan": data.plan_codigo, "dias_trial": data.dias_trial},
        severidad="warning",
    )

    return {
        "organizacion": org,
        "suscripcion": sub_result.data[0] if sub_result.data else None,
    }


@router.patch("/organizaciones/{org_id}")
async def admin_update_organizacion(
    org_id: str,
    data: dict,
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Actualiza datos de una organizacion (nombre, etc.)."""
    supabase = get_supabase()

    org = supabase.table("organizaciones").select("*").eq("id", org_id).maybe_single().execute()
    if not org.data:
        raise HTTPException(status_code=404, detail="Organizacion no encontrada")

    update_fields = {}
    if "nombre" in data and data["nombre"]:
        update_fields["nombre"] = data["nombre"].strip()

    if not update_fields:
        raise HTTPException(status_code=400, detail="No hay cambios para aplicar")

    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = supabase.table("organizaciones").update(update_fields).eq("id", org_id).execute()

    log_action(
        usuario_id=str(admin.id),
        accion="actualizar",
        entidad_tipo="organizacion",
        entidad_id=org_id,
        datos_anteriores={"nombre": org.data.get("nombre")},
        datos_nuevos=update_fields,
        severidad="warning",
    )

    return result.data[0] if result.data else {"ok": True}


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

    log_action(
        usuario_id=str(admin.id),
        accion="crear",
        entidad_tipo="equipo",
        entidad_id=result.data[0]["id"],
        datos_nuevos=team_data,
        organizacion_id=org_id,
        severidad="info",
    )

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

    log_action(
        usuario_id=str(admin.id),
        accion="actualizar",
        entidad_tipo="suscripcion",
        entidad_id=sub.data.get("id", org_id),
        datos_anteriores={"plan_id": sub.data.get("plan_id"), "estado": sub.data.get("estado"), "trial_fin": sub.data.get("trial_fin")},
        datos_nuevos=update_data,
        organizacion_id=org_id,
        severidad="warning",
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
        .maybe_single()
        .execute()
    )
    if not org.data:
        raise HTTPException(status_code=404, detail="Organizacion no encontrada")

    # Check for duplicate pending invitation
    existing = (
        supabase.table("invitaciones")
        .select("id")
        .eq("email", data.email)
        .eq("organizacion_id", data.organizacion_id)
        .eq("estado", "pendiente")
        .maybe_single()
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail=f"Ya existe una invitacion pendiente para {data.email} en esta organizacion")

    # Check if user is already a member
    existing_user = (
        supabase.table("usuarios")
        .select("id")
        .eq("email", data.email)
        .eq("organizacion_id", data.organizacion_id)
        .maybe_single()
        .execute()
    )
    if existing_user.data:
        raise HTTPException(status_code=409, detail=f"{data.email} ya es miembro de esta organizacion")

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
        "invitado_por": str(admin.id),
    }
    if data.rol_organizacion:
        invite_data["rol_organizacion"] = data.rol_organizacion

    result = supabase.table("invitaciones").insert(invite_data).execute()

    log_action(
        usuario_id=str(admin.id),
        accion="invitar",
        entidad_tipo="invitacion",
        entidad_id=result.data[0]["id"] if result.data else None,
        datos_nuevos={"email": data.email, "rol": data.rol_en_equipo, "organizacion_id": data.organizacion_id},
        organizacion_id=data.organizacion_id,
        severidad="info",
    )

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
    if user_id == str(admin.id):
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")

    # Get user info before deactivating
    user = supabase.table("usuarios").select("email, nombre, rol, organizacion_id").eq("id", user_id).maybe_single().execute()

    supabase.table("usuarios").update({
        "activo": False,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", user_id).execute()

    log_action(
        usuario_id=str(admin.id),
        accion="eliminar",
        entidad_tipo="usuario",
        entidad_id=user_id,
        datos_anteriores=user.data if user.data else {"id": user_id},
        severidad="critical",
    )

    return {"ok": True}


@router.patch("/usuarios/{user_id}/rol")
async def admin_change_user_role(
    user_id: str,
    data: dict,
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Cambia el rol de un usuario."""
    supabase = get_supabase()

    new_rol = data.get("rol")
    if not new_rol:
        raise HTTPException(status_code=400, detail="Se requiere el campo 'rol'")

    valid_roles = {
        "admin", "tecnico_principal", "segundo_entrenador",
        "preparador_fisico", "fisioterapeuta", "delegado",
        "analista", "entrenador_porteros", "nutricionista",
        "psicologo", "ojeador", "coordinador",
    }
    if new_rol not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Rol no valido. Opciones: {', '.join(sorted(valid_roles))}")

    user = supabase.table("usuarios").select("rol, email").eq("id", user_id).maybe_single().execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    old_rol = user.data.get("rol")

    supabase.table("usuarios").update({
        "rol": new_rol,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", user_id).execute()

    log_action(
        usuario_id=str(admin.id),
        accion="cambiar_rol",
        entidad_tipo="usuario",
        entidad_id=user_id,
        datos_anteriores={"rol": old_rol},
        datos_nuevos={"rol": new_rol},
        severidad="warning",
    )

    return {"ok": True, "old_rol": old_rol, "new_rol": new_rol}


@router.delete("/invitaciones/{invite_id}")
async def admin_revoke_invite(
    invite_id: str,
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Revoca una invitacion pendiente."""
    supabase = get_supabase()

    invite = supabase.table("invitaciones").select("email, organizacion_id, estado").eq("id", invite_id).maybe_single().execute()
    if not invite.data:
        raise HTTPException(status_code=404, detail="Invitacion no encontrada")

    if invite.data["estado"] != "pendiente":
        raise HTTPException(status_code=400, detail="Solo se pueden revocar invitaciones pendientes")

    supabase.table("invitaciones").update({
        "estado": "revocada",
    }).eq("id", invite_id).execute()

    log_action(
        usuario_id=str(admin.id),
        accion="revocar_acceso",
        entidad_tipo="invitacion",
        entidad_id=invite_id,
        datos_anteriores={"email": invite.data["email"], "estado": "pendiente"},
        datos_nuevos={"estado": "revocada"},
        organizacion_id=invite.data.get("organizacion_id"),
        severidad="info",
    )

    return {"ok": True}


@router.post("/invitaciones/{invite_id}/resend")
async def admin_resend_invite(
    invite_id: str,
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Renueva la expiracion de una invitacion pendiente (reenvio)."""
    supabase = get_supabase()

    invite = supabase.table("invitaciones").select("*").eq("id", invite_id).maybe_single().execute()
    if not invite.data:
        raise HTTPException(status_code=404, detail="Invitacion no encontrada")

    if invite.data["estado"] != "pendiente":
        raise HTTPException(status_code=400, detail="Solo se pueden reenviar invitaciones pendientes")

    new_expiry = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    supabase.table("invitaciones").update({
        "expira_en": new_expiry,
    }).eq("id", invite_id).execute()

    return {"ok": True, "new_expiry": new_expiry, "token": invite.data.get("token")}


@router.get("/planes")
async def admin_list_planes(admin: UsuarioResponse = Depends(require_superadmin)):
    """Lista todos los planes disponibles."""
    supabase = get_supabase()
    result = supabase.table("planes").select("*").eq("activo", True).order("precio_mensual_cents").execute()
    return result.data or []


# ============ Platform Analytics ============

@router.get("/organizaciones/{org_id}/stats")
async def admin_org_stats(
    org_id: str,
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Deep per-org stats: sessions, tasks, players, matches, AI, storage, logins."""
    supabase = get_supabase()

    org = supabase.table("organizaciones").select("id, nombre").eq("id", org_id).maybe_single().execute()
    if not org.data:
        raise HTTPException(status_code=404, detail="Organizacion no encontrada")

    teams = (
        supabase.table("equipos")
        .select("id, nombre, categoria")
        .eq("organizacion_id", org_id)
        .eq("activo", True)
        .execute()
    )

    # Subscription info
    sub = (
        supabase.table("suscripciones")
        .select("*, planes(*)")
        .eq("organizacion_id", org_id)
        .maybe_single()
        .execute()
    )

    # 30-day login count
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    logins = (
        supabase.table("audit_log")
        .select("id", count="exact")
        .eq("organizacion_id", org_id)
        .eq("accion", "login")
        .gte("created_at", thirty_days_ago)
        .execute()
    )

    # Per-team breakdown
    per_team = []
    totals = {"sesiones": 0, "tareas": 0, "jugadores": 0, "partidos": 0}

    for team in (teams.data or []):
        tid = team["id"]
        ses = supabase.table("sesiones").select("id", count="exact").eq("equipo_id", tid).execute()
        tar = supabase.table("tareas").select("id", count="exact").eq("equipo_id", tid).execute()
        jug = supabase.table("jugadores").select("id", count="exact").eq("equipo_id", tid).eq("activo", True).execute()
        par = supabase.table("partidos").select("id", count="exact").eq("equipo_id", tid).execute()

        s, t, j, p = ses.count or 0, tar.count or 0, jug.count or 0, par.count or 0
        totals["sesiones"] += s
        totals["tareas"] += t
        totals["jugadores"] += j
        totals["partidos"] += p

        per_team.append({
            "equipo_id": tid,
            "nombre": team["nombre"],
            "categoria": team.get("categoria"),
            "sesiones": s,
            "tareas": t,
            "jugadores": j,
            "partidos": p,
        })

    ai_calls = sub.data.get("uso_ai_calls_month", 0) if sub.data else 0
    storage_mb = sub.data.get("uso_storage_mb", 0) if sub.data else 0

    return {
        "organizacion": org.data,
        "totals": totals,
        "ai_calls": ai_calls,
        "storage_mb": storage_mb,
        "logins_30d": logins.count or 0,
        "per_team": per_team,
        "suscripcion": sub.data if sub.data else None,
    }


@router.get("/platform-analytics")
async def admin_platform_analytics(
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Global platform analytics: growth, active users, MRR, AI costs."""
    supabase = get_supabase()

    now = datetime.now(timezone.utc)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()

    # Total orgs
    total_orgs = supabase.table("organizaciones").select("id", count="exact").execute()
    # New orgs last 30 days
    new_orgs = (
        supabase.table("organizaciones")
        .select("id", count="exact")
        .gte("created_at", thirty_days_ago)
        .execute()
    )
    # Total users
    total_users = supabase.table("usuarios").select("id", count="exact").execute()
    # Active users (logged in last 30 days)
    active_users = (
        supabase.table("usuarios")
        .select("id", count="exact")
        .gte("last_login", thirty_days_ago)
        .execute()
    )

    # MRR estimate from active subscriptions
    active_subs = (
        supabase.table("suscripciones")
        .select("plan_id, planes(precio_mensual_cents)")
        .eq("estado", "active")
        .execute()
    )
    mrr_cents = 0
    for s in (active_subs.data or []):
        plan = s.get("planes")
        if plan:
            mrr_cents += plan.get("precio_mensual_cents", 0)

    # Subscription distribution
    all_subs = (
        supabase.table("suscripciones")
        .select("estado, planes(codigo, nombre)")
        .execute()
    )
    plan_dist = {}
    status_dist = {}
    for s in (all_subs.data or []):
        estado = s.get("estado", "unknown")
        status_dist[estado] = status_dist.get(estado, 0) + 1
        plan = s.get("planes")
        if plan:
            code = plan.get("codigo", "unknown")
            plan_dist[code] = plan_dist.get(code, 0) + 1

    return {
        "total_orgs": total_orgs.count or 0,
        "new_orgs_30d": new_orgs.count or 0,
        "total_users": total_users.count or 0,
        "active_users_30d": active_users.count or 0,
        "mrr_cents": mrr_cents,
        "mrr_eur": round(mrr_cents / 100, 2),
        "plan_distribution": plan_dist,
        "status_distribution": status_dist,
    }


@router.get("/comparisons")
async def admin_org_comparisons(
    admin: UsuarioResponse = Depends(require_superadmin),
):
    """Top 10 orgs by AI calls, sessions, active users, storage."""
    supabase = get_supabase()

    orgs = (
        supabase.table("organizaciones")
        .select("id, nombre")
        .execute()
    )

    org_stats = []
    for org in (orgs.data or []):
        oid = org["id"]

        # Count users
        users = supabase.table("usuarios").select("id", count="exact").eq("organizacion_id", oid).execute()
        # Count sessions across all teams
        teams = supabase.table("equipos").select("id").eq("organizacion_id", oid).eq("activo", True).execute()
        total_sesiones = 0
        for t in (teams.data or []):
            ses = supabase.table("sesiones").select("id", count="exact").eq("equipo_id", t["id"]).execute()
            total_sesiones += ses.count or 0

        sub = (
            supabase.table("suscripciones")
            .select("uso_ai_calls_month, uso_storage_mb")
            .eq("organizacion_id", oid)
            .maybe_single()
            .execute()
        )

        org_stats.append({
            "org_id": oid,
            "nombre": org["nombre"],
            "users": users.count or 0,
            "sesiones": total_sesiones,
            "ai_calls": sub.data.get("uso_ai_calls_month", 0) if sub.data else 0,
            "storage_mb": sub.data.get("uso_storage_mb", 0) if sub.data else 0,
        })

    return {
        "by_ai_calls": sorted(org_stats, key=lambda x: x["ai_calls"], reverse=True)[:10],
        "by_sessions": sorted(org_stats, key=lambda x: x["sesiones"], reverse=True)[:10],
        "by_users": sorted(org_stats, key=lambda x: x["users"], reverse=True)[:10],
        "by_storage": sorted(org_stats, key=lambda x: x["storage_mb"], reverse=True)[:10],
    }
