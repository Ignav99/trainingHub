"""
TrainingHub Pro - Router ABP (Acciones a Balón Parado)
CRUD para biblioteca de jugadas, integración partido/rival/sesión, PDF export.
"""

import asyncio

from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import Response
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from app.models.abp import (
    ABPJugadaCreate, ABPJugadaUpdate, ABPJugadaResponse,
    ABPRivalJugadaCreate, ABPRivalJugadaUpdate,
    ABPPartidoJugadaCreate, ABPSesionJugadaCreate,
    ABPPartidoPlanFullSave,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

router = APIRouter()


# ============ Biblioteca CRUD ============

@router.get("")
async def list_jugadas(
    equipo_id: UUID = Query(...),
    tipo: Optional[str] = None,
    lado: Optional[str] = None,
    subtipo: Optional[str] = None,
    busqueda: Optional[str] = None,
    auth: AuthContext = Depends(require_permission(Permission.ABP_READ)),
):
    supabase = get_supabase()
    query = supabase.table("abp_jugadas").select("*").eq(
        "equipo_id", str(equipo_id)
    )

    if tipo:
        query = query.eq("tipo", tipo)
    if lado:
        query = query.eq("lado", lado)
    if subtipo:
        query = query.eq("subtipo", subtipo)
    if busqueda:
        query = query.ilike("nombre", f"%{busqueda}%")

    query = query.order("tipo").order("orden").order("created_at", desc=True)
    response = query.execute()
    return {"data": response.data or []}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_jugada(
    data: ABPJugadaCreate,
    auth: AuthContext = Depends(require_permission(Permission.ABP_CREATE)),
):
    supabase = get_supabase()
    row = data.model_dump(exclude_none=True)
    row["organizacion_id"] = str(auth.organizacion_id)
    row["creado_por"] = str(auth.user_id) if auth.user_id else None
    if row.get("equipo_id"):
        row["equipo_id"] = str(row["equipo_id"])
    # Serialize nested models
    if "fases" in row:
        row["fases"] = [f if isinstance(f, dict) else f.model_dump() for f in row["fases"]]
    if "asignaciones" in row:
        row["asignaciones"] = [a if isinstance(a, dict) else a.model_dump() for a in row["asignaciones"]]

    response = supabase.table("abp_jugadas").insert(row).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Error al crear jugada ABP")
    return response.data[0]


@router.get("/{jugada_id}")
async def get_jugada(
    jugada_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.ABP_READ)),
):
    supabase = get_supabase()
    response = supabase.table("abp_jugadas").select("*").eq(
        "id", str(jugada_id)
    ).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Jugada ABP no encontrada")
    return response.data[0]


@router.put("/{jugada_id}")
async def update_jugada(
    jugada_id: UUID,
    data: ABPJugadaUpdate,
    auth: AuthContext = Depends(require_permission(Permission.ABP_UPDATE)),
):
    supabase = get_supabase()

    existing = supabase.table("abp_jugadas").select("id").eq(
        "id", str(jugada_id)
    ).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Jugada ABP no encontrada")

    updates = data.model_dump(exclude_none=True)
    if "fases" in updates:
        updates["fases"] = [f if isinstance(f, dict) else f.model_dump() for f in updates["fases"]]
    if "asignaciones" in updates:
        updates["asignaciones"] = [a if isinstance(a, dict) else a.model_dump() for a in updates["asignaciones"]]
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    response = supabase.table("abp_jugadas").update(updates).eq(
        "id", str(jugada_id)
    ).execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Error al actualizar jugada ABP")
    return response.data[0]


@router.delete("/{jugada_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_jugada(
    jugada_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.ABP_DELETE)),
):
    supabase = get_supabase()
    existing = supabase.table("abp_jugadas").select("id").eq(
        "id", str(jugada_id)
    ).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Jugada ABP no encontrada")

    supabase.table("abp_jugadas").delete().eq("id", str(jugada_id)).execute()
    return None


@router.post("/{jugada_id}/duplicate", status_code=status.HTTP_201_CREATED)
async def duplicate_jugada(
    jugada_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.ABP_CREATE)),
):
    supabase = get_supabase()
    original = supabase.table("abp_jugadas").select("*").eq(
        "id", str(jugada_id)
    ).execute()
    if not original.data:
        raise HTTPException(status_code=404, detail="Jugada ABP no encontrada")

    row = original.data[0].copy()
    for key in ("id", "created_at", "updated_at"):
        row.pop(key, None)
    row["nombre"] = f"{row['nombre']} (copia)"
    row["creado_por"] = str(auth.user_id) if auth.user_id else None

    response = supabase.table("abp_jugadas").insert(row).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Error al duplicar jugada ABP")
    return response.data[0]


# ============ Integración Partido ============

@router.get("/partido/{partido_id}")
async def list_partido_jugadas(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.ABP_READ)),
):
    supabase = get_supabase()
    response = supabase.table("abp_partido_jugadas").select(
        "*, abp_jugadas(*)"
    ).eq("partido_id", str(partido_id)).order("orden").execute()

    results = []
    for row in (response.data or []):
        jugada = row.pop("abp_jugadas", None)
        row["jugada"] = jugada
        results.append(row)
    return {"data": results}


@router.post("/partido/{partido_id}", status_code=status.HTTP_201_CREATED)
async def assign_jugada_to_partido(
    partido_id: UUID,
    data: ABPPartidoJugadaCreate,
    auth: AuthContext = Depends(require_permission(Permission.ABP_CREATE)),
):
    supabase = get_supabase()
    row = {
        "partido_id": str(partido_id),
        "jugada_id": data.jugada_id,
        "notas": data.notas,
        "orden": data.orden,
    }
    if data.asignaciones_override:
        row["asignaciones_override"] = [
            a if isinstance(a, dict) else a.model_dump()
            for a in data.asignaciones_override
        ]

    response = supabase.table("abp_partido_jugadas").insert(row).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Error al asignar jugada al partido")
    return response.data[0]


@router.delete("/partido/{partido_id}/{jugada_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_jugada_from_partido(
    partido_id: UUID,
    jugada_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.ABP_DELETE)),
):
    supabase = get_supabase()
    supabase.table("abp_partido_jugadas").delete().eq(
        "partido_id", str(partido_id)
    ).eq("jugada_id", str(jugada_id)).execute()
    return None


# ============ Scouting Rival ============

@router.get("/rival/{rival_id}")
async def list_rival_jugadas(
    rival_id: UUID,
    tipo: Optional[str] = None,
    lado: Optional[str] = None,
    auth: AuthContext = Depends(require_permission(Permission.ABP_READ)),
):
    supabase = get_supabase()
    query = supabase.table("abp_rival_jugadas").select("*").eq(
        "rival_id", str(rival_id)
    )
    if tipo:
        query = query.eq("tipo", tipo)
    if lado:
        query = query.eq("lado", lado)

    query = query.order("tipo").order("created_at", desc=True)
    response = query.execute()
    return {"data": response.data or []}


@router.post("/rival/{rival_id}", status_code=status.HTTP_201_CREATED)
async def create_rival_jugada(
    rival_id: UUID,
    data: ABPRivalJugadaCreate,
    auth: AuthContext = Depends(require_permission(Permission.ABP_CREATE)),
):
    supabase = get_supabase()
    row = data.model_dump(exclude_none=True)
    row["rival_id"] = str(rival_id)
    row["organizacion_id"] = str(auth.organizacion_id)
    if "fases" in row:
        row["fases"] = [f if isinstance(f, dict) else f.model_dump() for f in row["fases"]]

    response = supabase.table("abp_rival_jugadas").insert(row).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Error al crear jugada rival ABP")
    return response.data[0]


@router.put("/rival/{rival_id}/{jugada_id}")
async def update_rival_jugada(
    rival_id: UUID,
    jugada_id: UUID,
    data: ABPRivalJugadaUpdate,
    auth: AuthContext = Depends(require_permission(Permission.ABP_UPDATE)),
):
    supabase = get_supabase()
    updates = data.model_dump(exclude_none=True)
    if "fases" in updates:
        updates["fases"] = [f if isinstance(f, dict) else f.model_dump() for f in updates["fases"]]
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    response = supabase.table("abp_rival_jugadas").update(updates).eq(
        "id", str(jugada_id)
    ).eq("rival_id", str(rival_id)).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Jugada rival ABP no encontrada")
    return response.data[0]


@router.delete("/rival/{rival_id}/{jugada_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rival_jugada(
    rival_id: UUID,
    jugada_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.ABP_DELETE)),
):
    supabase = get_supabase()
    supabase.table("abp_rival_jugadas").delete().eq(
        "id", str(jugada_id)
    ).eq("rival_id", str(rival_id)).execute()
    return None


# ============ Sesiones ============

@router.get("/sesion/{sesion_id}")
async def list_sesion_jugadas(
    sesion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.ABP_READ)),
):
    supabase = get_supabase()
    response = supabase.table("abp_sesion_jugadas").select(
        "*, abp_jugadas(*)"
    ).eq("sesion_id", str(sesion_id)).order("orden").execute()

    results = []
    for row in (response.data or []):
        jugada = row.pop("abp_jugadas", None)
        row["jugada"] = jugada
        results.append(row)
    return {"data": results}


@router.post("/sesion/{sesion_id}", status_code=status.HTTP_201_CREATED)
async def link_jugada_to_sesion(
    sesion_id: UUID,
    data: ABPSesionJugadaCreate,
    auth: AuthContext = Depends(require_permission(Permission.ABP_CREATE)),
):
    supabase = get_supabase()
    row = {
        "sesion_id": str(sesion_id),
        "jugada_id": data.jugada_id,
        "notas": data.notas,
        "orden": data.orden,
    }
    response = supabase.table("abp_sesion_jugadas").insert(row).execute()
    if not response.data:
        raise HTTPException(status_code=400, detail="Error al vincular jugada a sesión")
    return response.data[0]


@router.delete("/sesion/{sesion_id}/{jugada_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_jugada_from_sesion(
    sesion_id: UUID,
    jugada_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.ABP_DELETE)),
):
    supabase = get_supabase()
    supabase.table("abp_sesion_jugadas").delete().eq(
        "sesion_id", str(sesion_id)
    ).eq("jugada_id", str(jugada_id)).execute()
    return None


# ============ Partido Plan (Comments + Bulk Jugadas) ============

@router.get("/partido/{partido_id}/plan")
async def get_partido_plan(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.ABP_READ)),
):
    """Get ABP match plan: comments + assigned plays with jugada data."""
    supabase = get_supabase()

    # Get plan (comments)
    plan_resp = supabase.table("abp_partido_plan").select("*").eq(
        "partido_id", str(partido_id)
    ).execute()
    plan = plan_resp.data[0] if plan_resp.data else None

    # Get assigned jugadas with full jugada data
    jugadas_resp = supabase.table("abp_partido_jugadas").select(
        "*, abp_jugadas(*)"
    ).eq("partido_id", str(partido_id)).order("orden").execute()

    jugadas = []
    for row in (jugadas_resp.data or []):
        jugada = row.pop("abp_jugadas", None)
        row["jugada"] = jugada
        jugadas.append(row)

    return {"plan": plan, "jugadas": jugadas}


@router.put("/partido/{partido_id}/plan")
async def save_partido_plan(
    partido_id: UUID,
    data: ABPPartidoPlanFullSave,
    auth: AuthContext = Depends(require_permission(Permission.ABP_CREATE)),
):
    """Atomic save: upsert plan comments + replace all jugadas."""
    supabase = get_supabase()
    org_id = str(auth.organizacion_id)
    pid = str(partido_id)

    # 1. Upsert plan (comments)
    plan_row = {
        "partido_id": pid,
        "organizacion_id": org_id,
        "comentario_ofensivo": data.comentario_ofensivo,
        "comentario_defensivo": data.comentario_defensivo,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    plan_resp = supabase.table("abp_partido_plan").upsert(
        plan_row, on_conflict="partido_id"
    ).execute()
    plan = plan_resp.data[0] if plan_resp.data else None

    # 2. Delete ALL existing jugadas for this partido
    supabase.table("abp_partido_jugadas").delete().eq(
        "partido_id", pid
    ).execute()

    # 3. Insert new jugadas
    new_jugadas = []
    for item in data.jugadas:
        row = {
            "partido_id": pid,
            "jugada_id": item.jugada_id,
            "notas": item.notas,
            "orden": item.orden,
        }
        if item.asignaciones_override:
            row["asignaciones_override"] = [
                a if isinstance(a, dict) else a.model_dump()
                for a in item.asignaciones_override
            ]
        new_jugadas.append(row)

    if new_jugadas:
        supabase.table("abp_partido_jugadas").insert(new_jugadas).execute()

    # 4. Re-fetch jugadas with full data
    jugadas_resp = supabase.table("abp_partido_jugadas").select(
        "*, abp_jugadas(*)"
    ).eq("partido_id", pid).order("orden").execute()

    jugadas = []
    for row in (jugadas_resp.data or []):
        jugada = row.pop("abp_jugadas", None)
        row["jugada"] = jugada
        jugadas.append(row)

    return {"plan": plan, "jugadas": jugadas}


# ============ PDF Export ============

@router.get("/playbook-pdf")
async def get_playbook_pdf(
    equipo_id: UUID = Query(...),
    tipo: Optional[str] = None,
    lado: Optional[str] = None,
    auth: AuthContext = Depends(require_permission(Permission.EXPORT_DATA)),
):
    from app.services.pdf_service import generate_abp_playbook_pdf

    supabase = get_supabase()
    query = supabase.table("abp_jugadas").select("*").eq(
        "equipo_id", str(equipo_id)
    )
    if tipo:
        query = query.eq("tipo", tipo)
    if lado:
        query = query.eq("lado", lado)

    query = query.order("tipo").order("orden")
    response = query.execute()
    jugadas = response.data or []

    if not jugadas:
        raise HTTPException(status_code=404, detail="No hay jugadas ABP para exportar")

    # Get team name
    team_resp = supabase.table("equipos").select("nombre").eq(
        "id", str(equipo_id)
    ).execute()
    equipo_nombre = team_resp.data[0]["nombre"] if team_resp.data else "Equipo"

    pdf_bytes = await asyncio.to_thread(generate_abp_playbook_pdf, jugadas, equipo_nombre)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="playbook_abp_{equipo_nombre}.pdf"'},
    )


@router.get("/partido/{partido_id}/pdf")
async def get_partido_abp_pdf(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.EXPORT_DATA)),
):
    from app.services.pdf_service import generate_abp_partido_pdf

    supabase = get_supabase()
    pid = str(partido_id)

    # Get assigned plays with full jugada data
    response = supabase.table("abp_partido_jugadas").select(
        "*, abp_jugadas(*)"
    ).eq("partido_id", pid).order("orden").execute()

    jugadas_partido = []
    for row in (response.data or []):
        jugada = row.pop("abp_jugadas", None)
        row["jugada"] = jugada
        jugadas_partido.append(row)

    # Get match info
    partido_resp = supabase.table("partidos").select(
        "*, rivales(nombre)"
    ).eq("id", pid).execute()
    partido = partido_resp.data[0] if partido_resp.data else {}

    # Get rival plays if rival exists
    rival_jugadas = []
    rival_id = partido.get("rival_id")
    if rival_id:
        rival_resp = supabase.table("abp_rival_jugadas").select("*").eq(
            "rival_id", str(rival_id)
        ).order("tipo").execute()
        rival_jugadas = rival_resp.data or []

    # Get plan (comments)
    plan_resp = supabase.table("abp_partido_plan").select("*").eq(
        "partido_id", pid
    ).execute()
    plan = plan_resp.data[0] if plan_resp.data else None

    # Get team players for assignment resolution
    equipo_id = partido.get("equipo_id")
    jugadores_map = {}
    equipo_nombre = ""
    if equipo_id:
        jugadores_resp = supabase.table("jugadores").select(
            "id, nombre, apellidos, dorsal"
        ).eq("equipo_id", str(equipo_id)).eq("estado", "activo").execute()
        for j in (jugadores_resp.data or []):
            jugadores_map[j["id"]] = j
        equipo_resp = supabase.table("equipos").select("nombre, temporada, categoria").eq(
            "id", str(equipo_id)
        ).execute()
        equipo_data = equipo_resp.data[0] if equipo_resp.data else {}
        equipo_nombre = equipo_data.get("nombre", "")
        equipo_temporada = equipo_data.get("temporada", "")
        equipo_categoria = equipo_data.get("categoria", "")

    # Get organization info
    org_resp = supabase.table("organizaciones").select(
        "nombre, logo_url, color_primario"
    ).eq("id", str(auth.organizacion_id)).execute()
    organizacion = org_resp.data[0] if org_resp.data else {}

    pdf_bytes = await asyncio.to_thread(
        generate_abp_partido_pdf,
        jugadas_partido, rival_jugadas, partido,
        plan=plan, jugadores_map=jugadores_map,
        equipo_nombre=equipo_nombre, organizacion=organizacion,
        equipo_temporada=equipo_temporada, equipo_categoria=equipo_categoria,
    )
    rival_nombre = partido.get("rivales", {}).get("nombre", "rival") if partido.get("rivales") else "rival"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="abp_partido_{rival_nombre}.pdf"'},
    )
