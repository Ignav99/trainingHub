"""
TrainingHub Pro - Club Admin Panel
Endpoints for club-level management: teams, staff, invitations, cross-team views.
Accessible by presidente, director_deportivo, secretario, admin, superadmin_plataforma.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.database import get_supabase
from app.dependencies import get_current_user
from app.models import UsuarioResponse
from app.services.audit_service import log_action

router = APIRouter()


# ============ Dependency ============

CLUB_ADMIN_ROLES = {"presidente", "director_deportivo", "secretario", "admin", "superadmin_plataforma"}


async def require_club_admin(
    current_user: UsuarioResponse = Depends(get_current_user),
) -> UsuarioResponse:
    """Verifica que el usuario tiene rol de directiva del club."""
    if current_user.rol not in CLUB_ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a directiva del club.",
        )
    if not current_user.organizacion_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No perteneces a ninguna organizacion.",
        )
    return current_user


# ============ Schemas ============

class BatchInviteRequest(BaseModel):
    equipo_id: str
    nombres: list[str]


class CreateEquipoRequest(BaseModel):
    nombre: str
    categoria: Optional[str] = None
    temporada: Optional[str] = None


class UpdateEquipoRequest(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    temporada: Optional[str] = None


class ChangeRolRequest(BaseModel):
    rol: str


class InviteStaffRequest(BaseModel):
    equipo_id: Optional[str] = None
    email: str
    nombre: Optional[str] = None
    rol_en_equipo: str = "segundo_entrenador"
    rol_organizacion: Optional[str] = None


# ============ Dashboard ============

@router.get("/dashboard")
async def club_dashboard(user: UsuarioResponse = Depends(require_club_admin)):
    """KPIs agregados de toda la organizacion."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    # Get all team IDs for this org
    teams = (
        supabase.table("equipos")
        .select("id")
        .eq("organizacion_id", org_id)
        .eq("activo", True)
        .execute()
    )
    team_ids = [t["id"] for t in (teams.data or [])]

    # Total jugadores (excluding guest/invited players)
    total_jugadores = 0
    if team_ids:
        jug = (
            supabase.table("jugadores")
            .select("id", count="exact")
            .in_("equipo_id", team_ids)
            .eq("es_invitado", False)
            .execute()
        )
        total_jugadores = jug.count or 0

    # Total staff (excluding jugador and tutor roles — those aren't staff)
    staff = (
        supabase.table("usuarios")
        .select("id", count="exact")
        .eq("organizacion_id", org_id)
        .neq("rol", "jugador")
        .neq("rol", "tutor")
        .execute()
    )

    # Sessions & tareas last 30 days (use date string for DATE column comparison)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")

    sesiones_mes = 0
    if team_ids:
        ses = (
            supabase.table("sesiones")
            .select("id", count="exact")
            .in_("equipo_id", team_ids)
            .gte("fecha", thirty_days_ago)
            .execute()
        )
        sesiones_mes = ses.count or 0

    # Tareas last 30 days (query by org directly — more efficient)
    tar = (
        supabase.table("tareas")
        .select("id", count="exact")
        .eq("organizacion_id", org_id)
        .gte("created_at", thirty_days_ago)
        .execute()
    )
    tareas_mes = tar.count or 0

    # Matches this season
    partidos_temporada = 0
    if team_ids:
        par = (
            supabase.table("partidos")
            .select("id", count="exact")
            .in_("equipo_id", team_ids)
            .execute()
        )
        partidos_temporada = par.count or 0

    # Active injuries only (tipo=lesion, estado activo or en_recuperacion)
    lesiones_activas = 0
    if team_ids:
        les = (
            supabase.table("registros_medicos")
            .select("id", count="exact")
            .in_("equipo_id", team_ids)
            .eq("tipo", "lesion")
            .in_("estado", ["activo", "en_recuperacion"])
            .execute()
        )
        lesiones_activas = les.count or 0

    return {
        "total_jugadores": total_jugadores,
        "total_staff": staff.count or 0,
        "sesiones_mes": sesiones_mes,
        "tareas_mes": tareas_mes,
        "partidos_temporada": partidos_temporada,
        "lesiones_activas": lesiones_activas,
    }


# ============ Equipos ============

@router.get("/equipos")
async def club_list_equipos(user: UsuarioResponse = Depends(require_club_admin)):
    """Lista todos los equipos de la org con stats por equipo."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    teams = (
        supabase.table("equipos")
        .select("*")
        .eq("organizacion_id", org_id)
        .eq("activo", True)
        .order("created_at")
        .execute()
    )

    result = []
    for team in (teams.data or []):
        tid = team["id"]

        jugadores = (
            supabase.table("jugadores")
            .select("id", count="exact")
            .eq("equipo_id", tid)
            .eq("es_invitado", False)
            .execute()
        )

        staff = (
            supabase.table("usuarios_equipos")
            .select("id", count="exact")
            .eq("equipo_id", tid)
            .neq("rol_en_equipo", "jugador")
            .execute()
        )

        sesiones = (
            supabase.table("sesiones")
            .select("id", count="exact")
            .eq("equipo_id", tid)
            .execute()
        )

        tareas = (
            supabase.table("tareas")
            .select("id", count="exact")
            .eq("equipo_id", tid)
            .execute()
        )

        partidos = (
            supabase.table("partidos")
            .select("id", count="exact")
            .eq("equipo_id", tid)
            .execute()
        )

        result.append({
            **team,
            "num_jugadores": jugadores.count or 0,
            "num_staff": staff.count or 0,
            "total_sesiones": sesiones.count or 0,
            "total_tareas": tareas.count or 0,
            "num_partidos": partidos.count or 0,
        })

    return result


@router.post("/equipos")
async def club_create_equipo(
    data: CreateEquipoRequest,
    user: UsuarioResponse = Depends(require_club_admin),
):
    """Crea un equipo en la org, verificando limites del plan."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    # Check plan limits
    sub = (
        supabase.table("suscripciones")
        .select("*, planes(*)")
        .eq("organizacion_id", org_id)
        .maybe_single()
        .execute()
    )
    if sub and sub.data:
        plan = sub.data.get("planes", {})
        max_equipos = plan.get("max_equipos", 1) if plan else 1

        current = (
            supabase.table("equipos")
            .select("id", count="exact")
            .eq("organizacion_id", org_id)
            .eq("activo", True)
            .execute()
        )
        if (current.count or 0) >= max_equipos:
            raise HTTPException(
                status_code=400,
                detail=f"Limite de equipos alcanzado ({max_equipos}). Mejora tu plan.",
            )

    team_data = {
        "organizacion_id": org_id,
        "nombre": data.nombre.strip(),
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
        usuario_id=str(user.id),
        accion="crear",
        entidad_tipo="equipo",
        entidad_id=result.data[0]["id"],
        datos_nuevos=team_data,
        organizacion_id=org_id,
        severidad="info",
    )

    return result.data[0]


@router.patch("/equipos/{equipo_id}")
async def club_update_equipo(
    equipo_id: str,
    data: UpdateEquipoRequest,
    user: UsuarioResponse = Depends(require_club_admin),
):
    """Edita un equipo de la org."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    # Verify team belongs to org
    team = (
        supabase.table("equipos")
        .select("*")
        .eq("id", equipo_id)
        .eq("organizacion_id", org_id)
        .maybe_single()
        .execute()
    )
    if not team or not team.data:
        raise HTTPException(status_code=404, detail="Equipo no encontrado en tu organizacion")

    update_fields = {}
    if data.nombre is not None:
        update_fields["nombre"] = data.nombre.strip()
    if data.categoria is not None:
        update_fields["categoria"] = data.categoria
    if data.temporada is not None:
        update_fields["temporada"] = data.temporada

    if not update_fields:
        raise HTTPException(status_code=400, detail="No hay cambios")

    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = supabase.table("equipos").update(update_fields).eq("id", equipo_id).execute()

    log_action(
        usuario_id=str(user.id),
        accion="actualizar",
        entidad_tipo="equipo",
        entidad_id=equipo_id,
        datos_anteriores={"nombre": team.data.get("nombre")},
        datos_nuevos=update_fields,
        organizacion_id=org_id,
        severidad="info",
    )

    return result.data[0] if result.data else {"ok": True}


# ============ Miembros ============

@router.get("/miembros")
async def club_list_miembros(user: UsuarioResponse = Depends(require_club_admin)):
    """Lista todos los miembros de la org con equipos y roles."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    members = (
        supabase.table("usuarios")
        .select("id, email, nombre, apellidos, rol, activo, created_at, ultimo_acceso, usuarios_equipos(equipo_id, rol_en_equipo, equipos(id, nombre))")
        .eq("organizacion_id", org_id)
        .order("created_at", desc=True)
        .execute()
    )

    return members.data or []


@router.patch("/miembros/{user_id}/rol")
async def club_change_member_role(
    user_id: str,
    data: ChangeRolRequest,
    user: UsuarioResponse = Depends(require_club_admin),
):
    """Cambia el rol de un miembro de la org."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    # Verify user belongs to org
    target = (
        supabase.table("usuarios")
        .select("id, rol, organizacion_id")
        .eq("id", user_id)
        .eq("organizacion_id", org_id)
        .maybe_single()
        .execute()
    )
    if not target or not target.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en tu organizacion")

    # Can't change your own role
    if user_id == str(user.id):
        raise HTTPException(status_code=400, detail="No puedes cambiar tu propio rol")

    valid_roles = {
        "presidente", "director_deportivo", "secretario",
        "admin", "tecnico_principal", "segundo_entrenador",
        "preparador_fisico", "fisioterapeuta", "delegado",
        "analista", "entrenador_porteros", "nutricionista",
        "psicologo", "ojeador", "coordinador",
    }
    if data.rol not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Rol no valido: {data.rol}")

    old_rol = target.data.get("rol")
    supabase.table("usuarios").update({
        "rol": data.rol,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", user_id).execute()

    log_action(
        usuario_id=str(user.id),
        accion="cambiar_rol",
        entidad_tipo="usuario",
        entidad_id=user_id,
        datos_anteriores={"rol": old_rol},
        datos_nuevos={"rol": data.rol},
        organizacion_id=org_id,
        severidad="warning",
    )

    return {"ok": True, "old_rol": old_rol, "new_rol": data.rol}


@router.delete("/miembros/{user_id}")
async def club_deactivate_member(
    user_id: str,
    user: UsuarioResponse = Depends(require_club_admin),
):
    """Desactiva un miembro de la org (soft delete)."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    if user_id == str(user.id):
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta")

    target = (
        supabase.table("usuarios")
        .select("id, email, nombre, rol, organizacion_id")
        .eq("id", user_id)
        .eq("organizacion_id", org_id)
        .maybe_single()
        .execute()
    )
    if not target or not target.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en tu organizacion")

    supabase.table("usuarios").update({
        "activo": False,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", user_id).execute()

    log_action(
        usuario_id=str(user.id),
        accion="eliminar",
        entidad_tipo="usuario",
        entidad_id=user_id,
        datos_anteriores=target.data,
        organizacion_id=org_id,
        severidad="critical",
    )

    return {"ok": True}


# ============ Invitaciones ============

@router.post("/invitaciones")
async def club_invite_staff(
    data: InviteStaffRequest,
    user: UsuarioResponse = Depends(require_club_admin),
):
    """Crea una invitacion para staff CT."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    # Check duplicate
    existing = (
        supabase.table("invitaciones")
        .select("id")
        .eq("email", data.email)
        .eq("organizacion_id", org_id)
        .eq("estado", "pendiente")
        .maybe_single()
        .execute()
    )
    if existing and existing.data:
        raise HTTPException(status_code=409, detail=f"Ya existe una invitacion pendiente para {data.email}")

    # Check if already member
    existing_user = (
        supabase.table("usuarios")
        .select("id")
        .eq("email", data.email)
        .eq("organizacion_id", org_id)
        .maybe_single()
        .execute()
    )
    if existing_user and existing_user.data:
        raise HTTPException(status_code=409, detail=f"{data.email} ya es miembro de tu organizacion")

    # Get equipo_id
    equipo_id = data.equipo_id
    if not equipo_id:
        first_team = (
            supabase.table("equipos")
            .select("id")
            .eq("organizacion_id", org_id)
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
        "organizacion_id": org_id,
        "equipo_id": equipo_id,
        "rol_en_equipo": data.rol_en_equipo,
        "token": token,
        "token_hash": token_hash,
        "estado": "pendiente",
        "expira_en": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "invitado_por": str(user.id),
    }
    if data.rol_organizacion:
        invite_data["rol_organizacion"] = data.rol_organizacion

    result = supabase.table("invitaciones").insert(invite_data).execute()

    log_action(
        usuario_id=str(user.id),
        accion="invitar",
        entidad_tipo="invitacion",
        entidad_id=result.data[0]["id"] if result.data else None,
        datos_nuevos={"email": data.email, "rol": data.rol_en_equipo},
        organizacion_id=org_id,
        severidad="info",
    )

    return {
        "invitacion": result.data[0] if result.data else None,
        "token": token,
        "link": f"/join?token={token}",
    }


@router.post("/invitaciones/batch")
async def club_batch_invite_players(
    data: BatchInviteRequest,
    user: UsuarioResponse = Depends(require_club_admin),
):
    """Invitacion masiva de jugadores. Recibe lista de nombres y crea una invitacion por cada uno."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    # Verify team belongs to org
    team = (
        supabase.table("equipos")
        .select("id")
        .eq("id", data.equipo_id)
        .eq("organizacion_id", org_id)
        .maybe_single()
        .execute()
    )
    if not team or not team.data:
        raise HTTPException(status_code=404, detail="Equipo no encontrado en tu organizacion")

    if not data.nombres or len(data.nombres) == 0:
        raise HTTPException(status_code=400, detail="Debes proporcionar al menos un nombre")

    if len(data.nombres) > 50:
        raise HTTPException(status_code=400, detail="Maximo 50 invitaciones por lote")

    invitaciones = []
    for nombre in data.nombres:
        nombre = nombre.strip()
        if not nombre:
            continue

        token = secrets.token_urlsafe(96)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        invite_data = {
            "nombre": nombre,
            "organizacion_id": org_id,
            "equipo_id": data.equipo_id,
            "rol_en_equipo": "jugador",
            "token": token,
            "token_hash": token_hash,
            "estado": "pendiente",
            "expira_en": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "invitado_por": str(user.id),
        }

        result = supabase.table("invitaciones").insert(invite_data).execute()

        if result.data:
            invitaciones.append({
                "nombre": nombre,
                "token": token,
                "link": f"/join?token={token}",
                "id": result.data[0]["id"],
            })

    log_action(
        usuario_id=str(user.id),
        accion="invitar",
        entidad_tipo="invitacion_batch",
        datos_nuevos={"equipo_id": data.equipo_id, "count": len(invitaciones)},
        organizacion_id=org_id,
        severidad="info",
    )

    return {
        "created": len(invitaciones),
        "invitaciones": invitaciones,
    }


@router.delete("/invitaciones/{invite_id}")
async def club_revoke_invite(
    invite_id: str,
    user: UsuarioResponse = Depends(require_club_admin),
):
    """Revoca una invitacion pendiente."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    invite = (
        supabase.table("invitaciones")
        .select("id, email, nombre, estado, organizacion_id")
        .eq("id", invite_id)
        .eq("organizacion_id", org_id)
        .maybe_single()
        .execute()
    )
    if not invite or not invite.data:
        raise HTTPException(status_code=404, detail="Invitacion no encontrada")

    if invite.data["estado"] != "pendiente":
        raise HTTPException(status_code=400, detail="Solo se pueden revocar invitaciones pendientes")

    supabase.table("invitaciones").update({"estado": "revocada"}).eq("id", invite_id).execute()

    log_action(
        usuario_id=str(user.id),
        accion="revocar_acceso",
        entidad_tipo="invitacion",
        entidad_id=invite_id,
        datos_anteriores={"estado": "pendiente"},
        datos_nuevos={"estado": "revocada"},
        organizacion_id=org_id,
        severidad="info",
    )

    return {"ok": True}


# ============ Cross-team views ============

@router.get("/tareas")
async def club_list_tareas(
    equipo_id: Optional[str] = None,
    categoria: Optional[str] = None,
    fase_juego: Optional[str] = None,
    creado_por: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user: UsuarioResponse = Depends(require_club_admin),
):
    """Biblioteca completa de tareas del club con filtros."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    query = (
        supabase.table("tareas")
        .select(
            "id, titulo, descripcion, fase_juego, principio_tactico, "
            "duracion_total, num_jugadores_min, num_jugadores_max, "
            "objetivo_fisico, nivel_cognitivo, match_days_recomendados, "
            "created_at, equipo_id, creado_por, grafico_url, "
            "categorias_tarea(codigo, nombre, color)",
            count="exact",
        )
        .eq("organizacion_id", org_id)
        .order("created_at", desc=True)
    )

    if equipo_id:
        query = query.eq("equipo_id", equipo_id)
    if categoria:
        cat = supabase.table("categorias_tarea").select("id").eq("codigo", categoria).maybe_single().execute()
        if cat and cat.data:
            query = query.eq("categoria_id", cat.data["id"])
    if fase_juego:
        query = query.eq("fase_juego", fase_juego)
    if creado_por:
        query = query.eq("creado_por", creado_por)
    if search:
        query = query.ilike("titulo", f"%{search}%")

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    result = query.execute()

    return {"data": result.data or [], "total": result.count or 0}


@router.get("/categorias")
async def club_list_categorias(user: UsuarioResponse = Depends(require_club_admin)):
    """Lista todas las categorias de tarea disponibles."""
    supabase = get_supabase()
    result = (
        supabase.table("categorias_tarea")
        .select("id, codigo, nombre, nombre_corto, color, naturaleza, orden")
        .eq("activo", True)
        .order("orden")
        .execute()
    )
    return result.data or []


@router.get("/sesiones")
async def club_list_sesiones(
    equipo_id: Optional[str] = None,
    match_day: Optional[str] = None,
    estado: Optional[str] = None,
    fase_juego: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user: UsuarioResponse = Depends(require_club_admin),
):
    """Todas las sesiones del club con filtros completos."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    teams = (
        supabase.table("equipos")
        .select("id")
        .eq("organizacion_id", org_id)
        .eq("activo", True)
        .execute()
    )
    team_ids = [t["id"] for t in (teams.data or [])]

    if not team_ids:
        return {"data": [], "total": 0}

    query = (
        supabase.table("sesiones")
        .select(
            "id, titulo, fecha, match_day, duracion_total, equipo_id, "
            "creado_por, estado, objetivo_principal, fase_juego_principal, "
            "principio_tactico_principal, rival, competicion",
            count="exact",
        )
        .in_("equipo_id", team_ids)
        .order("fecha", desc=True)
    )

    if equipo_id:
        if equipo_id not in team_ids:
            raise HTTPException(status_code=403, detail="Equipo no pertenece a tu organizacion")
        query = query.eq("equipo_id", equipo_id)
    if match_day:
        query = query.eq("match_day", match_day)
    if estado:
        query = query.eq("estado", estado)
    if fase_juego:
        query = query.eq("fase_juego_principal", fase_juego)
    if search:
        query = query.ilike("titulo", f"%{search}%")

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    result = query.execute()

    return {"data": result.data or [], "total": result.count or 0}


# ============ Analytics ============

@router.get("/analytics")
async def club_analytics(
    meses: int = Query(6, ge=1, le=12),
    user: UsuarioResponse = Depends(require_club_admin),
):
    """Analiticas de uso: sesiones/tareas/AI por equipo por mes, actividad por coach."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    teams = (
        supabase.table("equipos")
        .select("id, nombre")
        .eq("organizacion_id", org_id)
        .eq("activo", True)
        .execute()
    )

    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=30 * meses)).isoformat()

    per_team = []
    for team in (teams.data or []):
        tid = team["id"]

        sesiones = (
            supabase.table("sesiones")
            .select("id, fecha, creado_por", count="exact")
            .eq("equipo_id", tid)
            .gte("fecha", start_date)
            .execute()
        )

        tareas = (
            supabase.table("tareas")
            .select("id", count="exact")
            .eq("equipo_id", tid)
            .gte("created_at", start_date)
            .execute()
        )

        per_team.append({
            "equipo_id": tid,
            "equipo_nombre": team["nombre"],
            "sesiones": sesiones.count or 0,
            "tareas": tareas.count or 0,
        })

    # Per-coach activity
    staff = (
        supabase.table("usuarios")
        .select("id, nombre, apellidos, rol, ultimo_acceso")
        .eq("organizacion_id", org_id)
        .neq("rol", "jugador")
        .execute()
    )

    coach_activity = []
    for s in (staff.data or []):
        # Count sessions created by this user
        ses_count = 0
        for team in (teams.data or []):
            ses = (
                supabase.table("sesiones")
                .select("id", count="exact")
                .eq("equipo_id", team["id"])
                .eq("creado_por", s["id"])
                .gte("fecha", start_date)
                .execute()
            )
            ses_count += ses.count or 0

        coach_activity.append({
            "id": s["id"],
            "nombre": f"{s.get('nombre', '')} {s.get('apellidos', '')}".strip(),
            "rol": s["rol"],
            "sesiones_creadas": ses_count,
            "last_login": s.get("ultimo_acceso"),
        })

    return {
        "per_team": per_team,
        "coach_activity": coach_activity,
        "periodo_meses": meses,
    }


@router.get("/actividad")
async def club_recent_activity(
    limit: int = Query(20, ge=1, le=100),
    user: UsuarioResponse = Depends(require_club_admin),
):
    """Actividad reciente de toda la org (audit_log)."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    result = (
        supabase.table("audit_log")
        .select("id, usuario_id, accion, entidad_tipo, entidad_id, severidad, created_at, datos_nuevos")
        .eq("organizacion_id", org_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    return result.data or []


@router.get("/audit")
async def club_audit_log(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    accion: Optional[str] = None,
    severidad: Optional[str] = None,
    user: UsuarioResponse = Depends(require_club_admin),
):
    """Audit log completo de la org (paginado, filtrable)."""
    supabase = get_supabase()
    org_id = str(user.organizacion_id)

    query = (
        supabase.table("audit_log")
        .select("*", count="exact")
        .eq("organizacion_id", org_id)
        .order("created_at", desc=True)
    )

    if accion:
        query = query.eq("accion", accion)
    if severidad:
        query = query.eq("severidad", severidad)

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    result = query.execute()

    return {
        "data": result.data or [],
        "total": result.count or 0,
    }
