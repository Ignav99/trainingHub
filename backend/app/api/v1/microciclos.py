"""
TrainingHub Pro - Router de Microciclos
CRUD para planificación semanal de entrenamiento.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional
from uuid import UUID
from datetime import date, timedelta
from math import ceil

from app.models import (
    MicrocicloCreate,
    MicrocicloUpdate,
    MicrocicloResponse,
    MicrocicloListResponse,
    EstadoMicrociclo,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

router = APIRouter()


@router.get("", response_model=MicrocicloListResponse)
async def list_microciclos(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    equipo_id: Optional[UUID] = None,
    estado: Optional[EstadoMicrociclo] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_READ)),
):
    """Lista microciclos con filtros."""
    supabase = get_supabase()

    query = supabase.table("microciclos").select(
        "*, equipos(nombre, categoria), partidos(*, rivales(nombre, nombre_corto))",
        count="exact"
    )

    # Filtrar por equipos de la organización
    if equipo_id:
        query = query.eq("equipo_id", str(equipo_id))
    else:
        equipos = supabase.table("equipos").select("id").eq(
            "organizacion_id", auth.organizacion_id
        ).execute()
        equipo_ids = [e["id"] for e in equipos.data]
        if equipo_ids:
            query = query.in_("equipo_id", equipo_ids)

    if estado:
        query = query.eq("estado", estado.value)

    if fecha_desde:
        query = query.gte("fecha_inicio", fecha_desde.isoformat())

    if fecha_hasta:
        query = query.lte("fecha_fin", fecha_hasta.isoformat())

    query = query.order("fecha_inicio", desc=True)

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    return MicrocicloListResponse(
        data=[MicrocicloResponse(**m) for m in response.data],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/{microciclo_id}/completo")
async def get_microciclo_completo(
    microciclo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_READ)),
):
    """
    Devuelve toda la info de un microciclo en una sola llamada:
    microciclo (con partido+rival), sesiones, plantilla y RPE.
    """
    supabase = get_supabase()

    # 1. Microciclo con joins a partido, rival y equipo
    micro_resp = supabase.table("microciclos").select(
        "*, equipos(id, nombre, categoria), partidos(*, rivales(nombre, nombre_corto, escudo_url))"
    ).eq("id", str(microciclo_id)).single().execute()

    if not micro_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Microciclo no encontrado"
        )

    micro = micro_resp.data
    equipo_id = micro["equipo_id"]
    fecha_inicio = micro["fecha_inicio"]
    fecha_fin = micro["fecha_fin"]

    # 2. Sesiones del microciclo con count de tareas
    sesiones_resp = supabase.table("sesiones").select(
        "id, titulo, fecha, match_day, estado, duracion_total, objetivo_principal, "
        "intensidad_objetivo, fase_juego_principal, notas_pre, notas_post, "
        "sesion_tareas(id)"
    ).eq("microciclo_id", str(microciclo_id)).order("fecha").execute()

    sesiones = []
    for s in sesiones_resp.data:
        tareas_rel = s.pop("sesion_tareas", []) or []
        s["num_tareas"] = len(tareas_rel)
        sesiones.append(s)

    # 3. Plantilla — disponibilidad del equipo
    jugadores_resp = supabase.table("jugadores").select(
        "id, nombre, apellidos, dorsal, posicion_principal, estado, "
        "fecha_lesion, fecha_vuelta_estimada, motivo_baja"
    ).eq("equipo_id", equipo_id).order("apellidos").execute()

    jugadores = jugadores_resp.data
    total = len(jugadores)
    lesionados = [j for j in jugadores if j.get("estado") == "lesionado"]
    sancionados = [j for j in jugadores if j.get("estado") == "sancionado"]
    disponibles = sum(1 for j in jugadores if j.get("estado") == "activo")

    plantilla = {
        "total": total,
        "disponibles": disponibles,
        "lesionados": len(lesionados),
        "sancionados": len(sancionados),
        "jugadores_lesionados": lesionados,
        "jugadores_sancionados": sancionados,
    }

    # 4. RPE del rango de fechas del microciclo
    jugador_ids = [j["id"] for j in jugadores]
    rpe_data = {"registros_por_sesion": {}, "rpe_promedio_semana": None}

    if jugador_ids:
        rpe_resp = supabase.table("registros_rpe").select(
            "sesion_id, rpe, carga_sesion"
        ).in_("jugador_id", jugador_ids).gte(
            "fecha", fecha_inicio
        ).lte("fecha", fecha_fin).execute()

        # Agrupar por sesion
        por_sesion: dict = {}
        all_rpe = []
        for r in rpe_resp.data:
            sid = r.get("sesion_id")
            if sid:
                if sid not in por_sesion:
                    por_sesion[sid] = {"rpe_vals": [], "count": 0}
                por_sesion[sid]["rpe_vals"].append(r["rpe"])
                por_sesion[sid]["count"] += 1
            all_rpe.append(r["rpe"])

        registros_por_sesion = {}
        for sid, data in por_sesion.items():
            registros_por_sesion[sid] = {
                "rpe_promedio": round(sum(data["rpe_vals"]) / len(data["rpe_vals"]), 1),
                "num_registros": data["count"],
            }

        rpe_data = {
            "registros_por_sesion": registros_por_sesion,
            "rpe_promedio_semana": round(sum(all_rpe) / len(all_rpe), 1) if all_rpe else None,
        }

    return {
        "microciclo": micro,
        "sesiones": sesiones,
        "plantilla": plantilla,
        "rpe": rpe_data,
    }


@router.get("/{microciclo_id}", response_model=MicrocicloResponse)
async def get_microciclo(
    microciclo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_READ)),
):
    """Obtiene un microciclo por ID."""
    supabase = get_supabase()

    response = supabase.table("microciclos").select(
        "*, equipos(nombre, categoria), partidos(*, rivales(nombre, nombre_corto))"
    ).eq("id", str(microciclo_id)).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Microciclo no encontrado"
        )

    return MicrocicloResponse(**response.data)


@router.get("/{microciclo_id}/sesiones")
async def get_microciclo_sesiones(
    microciclo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_READ)),
):
    """Obtiene las sesiones de un microciclo."""
    supabase = get_supabase()

    # Verificar que existe
    micro = supabase.table("microciclos").select("id").eq(
        "id", str(microciclo_id)
    ).single().execute()

    if not micro.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Microciclo no encontrado"
        )

    response = supabase.table("sesiones").select(
        "*, equipos(nombre, categoria)"
    ).eq("microciclo_id", str(microciclo_id)).order("fecha").execute()

    sesiones = []
    for s in response.data:
        s["equipo"] = s.pop("equipos", None)
        sesiones.append(s)

    return {"data": sesiones, "total": len(sesiones)}


@router.post("", response_model=MicrocicloResponse, status_code=status.HTTP_201_CREATED)
async def create_microciclo(
    microciclo: MicrocicloCreate,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_CREATE)),
):
    """Crea un nuevo microciclo."""
    supabase = get_supabase()

    data = microciclo.model_dump(mode="json")
    data["equipo_id"] = str(data["equipo_id"])
    if data.get("partido_id"):
        data["partido_id"] = str(data["partido_id"])

    response = supabase.table("microciclos").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear microciclo"
        )

    return MicrocicloResponse(**response.data[0])


@router.put("/{microciclo_id}", response_model=MicrocicloResponse)
async def update_microciclo(
    microciclo_id: UUID,
    microciclo: MicrocicloUpdate,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_UPDATE)),
):
    """Actualiza un microciclo."""
    supabase = get_supabase()

    existing = supabase.table("microciclos").select("id").eq(
        "id", str(microciclo_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Microciclo no encontrado"
        )

    update_data = microciclo.model_dump(exclude_unset=True, mode="json")

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    if update_data.get("partido_id"):
        update_data["partido_id"] = str(update_data["partido_id"])

    response = supabase.table("microciclos").update(update_data).eq(
        "id", str(microciclo_id)
    ).execute()

    return MicrocicloResponse(**response.data[0])


@router.delete("/{microciclo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_microciclo(
    microciclo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_DELETE)),
):
    """Elimina un microciclo."""
    supabase = get_supabase()

    existing = supabase.table("microciclos").select("id").eq(
        "id", str(microciclo_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Microciclo no encontrado"
        )

    supabase.table("microciclos").delete().eq("id", str(microciclo_id)).execute()
    return None


@router.post("/{microciclo_id}/link-sesiones")
async def link_sesiones_to_microciclo(
    microciclo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_UPDATE)),
):
    """Vincula sesiones sin microciclo que caigan en el rango de fechas del microciclo."""
    supabase = get_supabase()

    # Get microciclo
    micro = supabase.table("microciclos").select(
        "id, equipo_id, fecha_inicio, fecha_fin"
    ).eq("id", str(microciclo_id)).single().execute()

    if not micro.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Microciclo no encontrado"
        )

    equipo_id = micro.data["equipo_id"]
    fecha_inicio = micro.data["fecha_inicio"]
    fecha_fin = micro.data["fecha_fin"]

    # Find unlinked sessions in date range
    sesiones = supabase.table("sesiones").select("id").eq(
        "equipo_id", equipo_id
    ).is_("microciclo_id", "null").gte(
        "fecha", fecha_inicio
    ).lte(
        "fecha", fecha_fin
    ).execute()

    linked = 0
    for s in sesiones.data:
        supabase.table("sesiones").update({
            "microciclo_id": str(microciclo_id)
        }).eq("id", s["id"]).execute()
        linked += 1

    return {"linked": linked, "microciclo_id": str(microciclo_id)}
