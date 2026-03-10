"""
TrainingHub Pro - Router de RPE
Registro de carga percibida y wellness de jugadores.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID
from datetime import date
from math import ceil

from app.models import (
    RPECreate,
    RPEResponse,
    RPEListResponse,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.services.notification_service import notify_rpe_alerta

router = APIRouter()


@router.get("", response_model=RPEListResponse)
async def list_rpe(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    jugador_id: Optional[UUID] = None,
    sesion_id: Optional[UUID] = None,
    equipo_id: Optional[UUID] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    auth: AuthContext = Depends(require_permission(Permission.RPE_READ)),
):
    """Lista registros RPE con filtros."""
    supabase = get_supabase()

    query = supabase.table("registros_rpe").select(
        "*, jugadores(nombre, apellidos, dorsal, posicion_principal)",
        count="exact"
    )

    if jugador_id:
        query = query.eq("jugador_id", str(jugador_id))

    if sesion_id:
        query = query.eq("sesion_id", str(sesion_id))

    # Filtrar por equipo (a través de jugadores)
    if equipo_id:
        jugadores = supabase.table("jugadores").select("id").eq(
            "equipo_id", str(equipo_id)
        ).execute()
        jugador_ids = [j["id"] for j in jugadores.data]
        if jugador_ids:
            query = query.in_("jugador_id", jugador_ids)

    if fecha_desde:
        query = query.gte("fecha", fecha_desde.isoformat())

    if fecha_hasta:
        query = query.lte("fecha", fecha_hasta.isoformat())

    query = query.order("fecha", desc=True).order("created_at", desc=True)

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    return RPEListResponse(
        data=[RPEResponse(**r) for r in response.data],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/resumen")
async def resumen_rpe(
    equipo_id: UUID = Query(...),
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    auth: AuthContext = Depends(require_permission(Permission.RPE_READ)),
):
    """
    Resumen de RPE por equipo: promedios por jugador, tendencias.
    """
    supabase = get_supabase()

    # Obtener jugadores del equipo
    jugadores = supabase.table("jugadores").select(
        "id, nombre, apellidos, dorsal, posicion_principal"
    ).eq("equipo_id", str(equipo_id)).order("apellidos").execute()

    jugador_ids = [j["id"] for j in jugadores.data]

    if not jugador_ids:
        return {"data": [], "promedios_equipo": {}}

    # Obtener registros RPE
    query = supabase.table("registros_rpe").select("*").in_(
        "jugador_id", jugador_ids
    )

    if fecha_desde:
        query = query.gte("fecha", fecha_desde.isoformat())
    if fecha_hasta:
        query = query.lte("fecha", fecha_hasta.isoformat())

    query = query.order("fecha", desc=True)
    registros = query.execute()

    # Agrupar por jugador
    por_jugador = {}
    for r in registros.data:
        jid = r["jugador_id"]
        if jid not in por_jugador:
            por_jugador[jid] = []
        por_jugador[jid].append(r)

    # Calcular promedios
    resumen = []
    todos_rpe = []
    todos_carga = []

    for j in jugadores.data:
        regs = por_jugador.get(j["id"], [])
        if regs:
            rpe_vals = [r["rpe"] for r in regs if r.get("rpe") is not None]
            carga_vals = [r["carga_sesion"] for r in regs if r.get("carga_sesion")]
            avg_rpe = round(sum(rpe_vals) / len(rpe_vals), 1) if rpe_vals else None
            avg_carga = round(sum(float(c) for c in carga_vals) / len(carga_vals), 1) if carga_vals else None
            todos_rpe.extend(rpe_vals)
            if carga_vals:
                todos_carga.extend([float(c) for c in carga_vals])
        else:
            avg_rpe = None
            avg_carga = None

        resumen.append({
            "jugador": j,
            "num_registros": len(regs),
            "rpe_promedio": avg_rpe,
            "carga_promedio": avg_carga,
            "ultimo_registro": regs[0] if regs else None,
        })

    promedios_equipo = {}
    if todos_rpe:
        promedios_equipo["rpe_promedio"] = round(sum(todos_rpe) / len(todos_rpe), 1)
    if todos_carga:
        promedios_equipo["carga_promedio"] = round(sum(todos_carga) / len(todos_carga), 1)
    promedios_equipo["total_registros"] = len(registros.data)

    return {"data": resumen, "promedios_equipo": promedios_equipo}


@router.get("/{rpe_id}", response_model=RPEResponse)
async def get_rpe(
    rpe_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RPE_READ)),
):
    """Obtiene un registro RPE por ID."""
    supabase = get_supabase()

    response = supabase.table("registros_rpe").select("*").eq(
        "id", str(rpe_id)
    ).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro RPE no encontrado"
        )

    return RPEResponse(**response.data)


@router.post("", response_model=RPEResponse, status_code=status.HTTP_201_CREATED)
async def create_rpe(
    rpe: RPECreate,
    auth: AuthContext = Depends(require_permission(Permission.RPE_CREATE)),
):
    """Crea un nuevo registro RPE."""
    supabase = get_supabase()

    data = rpe.model_dump(mode="json")
    data["jugador_id"] = str(data["jugador_id"])
    if data.get("sesion_id"):
        data["sesion_id"] = str(data["sesion_id"])

    tipo = data.get("tipo", "sesion")

    # Manual RPE requires titulo
    if tipo == "manual" and not data.get("titulo"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="RPE manual requiere un título descriptivo"
        )

    # RPE value required for sesion and manual types
    if tipo in ("sesion", "manual") and data.get("rpe") is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="RPE es obligatorio para registros de tipo sesión o manual"
        )

    # Check player is active before allowing RPE
    jugador_check = supabase.table("jugadores").select("estado").eq(
        "id", data["jugador_id"]
    ).single().execute()
    if jugador_check.data and jugador_check.data.get("estado") not in ("activo", None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede registrar RPE: jugador está {jugador_check.data['estado']}"
        )

    # Calcular carga de sesión (RPE * duración)
    if data.get("rpe") and data.get("duracion_percibida"):
        data["carga_sesion"] = round(data["rpe"] * data["duracion_percibida"], 1)

    response = supabase.table("registros_rpe").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear registro RPE"
        )

    # Alert staff if RPE is high (>= 8)
    created = response.data[0]
    if created.get("rpe") and created["rpe"] >= 8:
        jugador = supabase.table("jugadores").select(
            "nombre, apellidos, equipo_id"
        ).eq("id", data["jugador_id"]).single().execute()
        if jugador.data:
            # Get staff user IDs for the team
            staff = supabase.table("usuarios_equipos").select(
                "usuario_id"
            ).eq("equipo_id", jugador.data["equipo_id"]).execute()
            staff_ids = [s["usuario_id"] for s in staff.data if s["usuario_id"] != auth.user_id]
            notify_rpe_alerta(
                jugador_nombre=f"{jugador.data['nombre']} {jugador.data.get('apellidos', '')}".strip(),
                rpe_valor=created["rpe"],
                usuario_ids=staff_ids,
                jugador_id=data["jugador_id"],
            )

    return RPEResponse(**created)


@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def create_rpe_batch(
    registros: list[RPECreate],
    auth: AuthContext = Depends(require_permission(Permission.RPE_CREATE)),
):
    """Crea múltiples registros RPE (ej: post-sesión para todo el equipo)."""
    supabase = get_supabase()

    # Check all players are active before allowing RPE
    jugador_ids = list({str(r.jugador_id) for r in registros})
    jugadores_check = supabase.table("jugadores").select("id, estado").in_(
        "id", jugador_ids
    ).execute()
    no_activos = [
        j for j in (jugadores_check.data or [])
        if j.get("estado") not in ("activo", None)
    ]
    if no_activos:
        nombres = ", ".join(j["id"] for j in no_activos)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede registrar RPE para jugadores no activos: {nombres}"
        )

    items = []
    for rpe in registros:
        data = rpe.model_dump(mode="json")
        data["jugador_id"] = str(data["jugador_id"])
        if data.get("sesion_id"):
            data["sesion_id"] = str(data["sesion_id"])
        if data.get("rpe") and data.get("duracion_percibida"):
            data["carga_sesion"] = round(data["rpe"] * data["duracion_percibida"], 1)
        items.append(data)

    response = supabase.table("registros_rpe").insert(items).execute()

    return {"created": len(response.data), "data": response.data}


@router.delete("/{rpe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rpe(
    rpe_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RPE_CREATE)),
):
    """Elimina un registro RPE."""
    supabase = get_supabase()

    existing = supabase.table("registros_rpe").select("id").eq(
        "id", str(rpe_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro RPE no encontrado"
        )

    supabase.table("registros_rpe").delete().eq("id", str(rpe_id)).execute()
    return None
