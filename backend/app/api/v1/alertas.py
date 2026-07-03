"""
TrainingHub Pro — API Alertas
Sistema de alertas automáticas: plan de partido, cargas, sanciones, etc.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional, List
from uuid import UUID
from datetime import date, timedelta

from app.models.plan_partido import (
    AlertaCreate,
    AlertaUpdate,
    AlertaResponse,
    TipoAlerta,
    PrioridadAlerta,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

router = APIRouter()


@router.get("/alertas")
async def list_alertas(
    equipo_id: Optional[UUID] = None,
    microciclo_id: Optional[UUID] = None,
    resuelta: Optional[bool] = False,
    tipo: Optional[TipoAlerta] = None,
    prioridad: Optional[PrioridadAlerta] = None,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_READ)),
):
    """Lista alertas con filtros."""
    supabase = get_supabase()

    query = supabase.table("alertas").select("*", count="exact")

    if equipo_id:
        query = query.eq("equipo_id", str(equipo_id))
    else:
        equipos = supabase.table("equipos").select("id").eq("organizacion_id", auth.organizacion_id).execute()
        equipo_ids = [e["id"] for e in equipos.data]
        if equipo_ids:
            query = query.in_("equipo_id", equipo_ids)

    if microciclo_id:
        query = query.eq("microciclo_id", str(microciclo_id))

    if resuelta is not None:
        query = query.eq("resuelta", resuelta)

    if tipo:
        query = query.eq("tipo", tipo.value)

    if prioridad:
        query = query.eq("prioridad", prioridad.value)

    query = query.order("created_at", desc=True)
    response = query.execute()

    return {
        "data": [AlertaResponse(**a) for a in response.data],
        "total": response.count or 0,
    }


@router.post("/alertas/detectar")
async def detectar_alertas(
    equipo_id: UUID,
    microciclo_id: Optional[UUID] = None,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_CREATE)),
):
    """Detecta y crea automáticamente alertas para un equipo/microciclo."""
    supabase = get_supabase()
    generadas: list[dict] = []

    hoy = date.today()

    if microciclo_id:
        micro = supabase.table("microciclos").select(
            "*, partidos(*)"
        ).eq("id", str(microciclo_id)).single().execute()

        if micro.data:
            m = micro.data
            fecha_partido = m.get("partidos", {}).get("fecha") if m.get("partidos") else None
            fecha_inicio = m["fecha_inicio"]

            # 1. Plan de partido faltante
            plan = supabase.table("planes_partido").select("id").eq("microciclo_id", str(microciclo_id)).execute()
            if not plan.data and fecha_partido:
                dias_hasta_partido = (date.fromisoformat(fecha_partido) - hoy).days
                if dias_hasta_partido <= 5:
                    alerta_data = {
                        "equipo_id": str(equipo_id),
                        "microciclo_id": str(microciclo_id),
                        "tipo": TipoAlerta.PLAN_PARTIDO_FALTANTE.value,
                        "prioridad": PrioridadAlerta.ALTA.value if dias_hasta_partido <= 2 else PrioridadAlerta.NORMAL.value,
                        "titulo": "No hay plan de partido",
                        "mensaje": f"Faltan {dias_hasta_partido} días para el partido y no hay plan de partido creado.",
                        "accion_url": f"/microciclos/{microciclo_id}",
                        "metadata": {"dias_restantes": dias_hasta_partido},
                    }
                    resp = supabase.table("alertas").upsert(alerta_data, on_conflict="equipo_id,microciclo_id,tipo").execute()
                    if resp.data:
                        generadas.append(resp.data[0])

            # 2. Sesiones faltantes en días clave
            sesiones = supabase.table("sesiones").select("fecha, match_day").eq("microciclo_id", str(microciclo_id)).execute()
            dias_con_sesion = {s["fecha"] for s in sesiones.data}

            # MD-4 (martes) y MD-3 (miércoles) son críticos
            # Recorremos los días del microciclo buscando huecos
            from datetime import timedelta
            d = date.fromisoformat(fecha_inicio)
            fin = date.fromisoformat(m["fecha_fin"])
            dias_semana = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"]
            while d <= fin:
                dia_str = d.isoformat()
                dia_nombre = dias_semana[d.weekday()]
                if dia_str not in dias_con_sesion and d >= hoy:
                    if d.weekday() in (1, 2):  # Martes o Miércoles = MD-4 o MD-3
                        alerta_data = {
                            "equipo_id": str(equipo_id),
                            "microciclo_id": str(microciclo_id),
                            "tipo": TipoAlerta.MICROCICLO_SIN_SESION.value,
                            "prioridad": PrioridadAlerta.ALTA.value,
                            "titulo": f"Falta sesión {dia_nombre} {dia_str}",
                            "mensaje": f"No hay sesión planificada para el {dia_nombre} ({dia_str}). Es un día clave del microciclo.",
                            "accion_url": f"/microciclos/{microciclo_id}",
                            "metadata": {"fecha": dia_str, "dia_semana": dia_nombre},
                        }
                        resp = supabase.table("alertas").upsert(alerta_data, on_conflict="equipo_id,microciclo_id,tipo").execute()
                        if resp.data:
                            generadas.append(resp.data[0])
                d += timedelta(days=1)

    # 3. Cargas críticas a nivel equipo
    cargas = supabase.table("carga_jugador").select("jugador_id, acwr").eq("equipo_id", str(equipo_id)).execute()
    jugadores_riesgo = [c for c in cargas.data if c.get("acwr") and c["acwr"] > 1.5]
    if jugadores_riesgo:
        jugadores = supabase.table("jugadores").select("id, nombre, apellidos").in_(
            "id", [j["jugador_id"] for j in jugadores_riesgo]
        ).execute()
        nombres = {j["id"]: f"{j['nombre']} {j.get('apellidos', '')}" for j in jugadores.data}

        for jr in jugadores_riesgo[:3]:  # Top 3
            nombre = nombres.get(jr["jugador_id"], jr["jugador_id"])
            alerta_data = {
                "equipo_id": str(equipo_id),
                "tipo": TipoAlerta.CARGA_CRITICA.value,
                "prioridad": PrioridadAlerta.URGENTE.value if jr["acwr"] > 1.8 else PrioridadAlerta.ALTA.value,
                "titulo": f"Carga crítica: {nombre}",
                "mensaje": f"ACWR de {jr['acwr']:.2f} — riesgo de lesión elevado.",
                "entidad_tipo": "jugador",
                "entidad_id": jr["jugador_id"],
                "accion_url": f"/carga?jugador={jr['jugador_id']}",
                "metadata": {"acwr": jr["acwr"], "jugador_id": jr["jugador_id"]},
            }
            resp = supabase.table("alertas").upsert(alerta_data, on_conflict="equipo_id,entidad_id,tipo").execute()
            if resp.data:
                generadas.append(resp.data[0])

    return {"generadas": len(generadas), "alertas": generadas}


@router.put("/alertas/{alerta_id}", response_model=AlertaResponse)
async def update_alerta(
    alerta_id: UUID,
    alerta: AlertaUpdate,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_UPDATE)),
):
    """Resuelve o actualiza una alerta."""
    supabase = get_supabase()

    existing = supabase.table("alertas").select("id").eq("id", str(alerta_id)).single().execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta no encontrada")

    update_data = alerta.model_dump(exclude_unset=True, mode="json")
    if alerta.resuelta:
        update_data["resuelta_por"] = auth.usuario_id
        update_data["resuelta_en"] = "now()"

    response = supabase.table("alertas").update(update_data).eq("id", str(alerta_id)).execute()
    return AlertaResponse(**response.data[0])


@router.delete("/alertas/{alerta_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alerta(
    alerta_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_DELETE)),
):
    """Elimina una alerta."""
    supabase = get_supabase()
    existing = supabase.table("alertas").select("id").eq("id", str(alerta_id)).single().execute()
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta no encontrada")
    supabase.table("alertas").delete().eq("id", str(alerta_id)).execute()
    return None
