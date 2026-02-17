"""
TrainingHub Pro - Router de Dashboard
Endpoints de datos agregados para el panel principal.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from uuid import UUID
from datetime import date, timedelta

from app.models import UsuarioResponse
from app.database import get_supabase
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/resumen")
async def dashboard_resumen(
    equipo_id: Optional[UUID] = None,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """
    Resumen general del dashboard:
    - Contadores principales
    - Próximo partido
    - Última sesión
    - Estado de plantilla
    """
    supabase = get_supabase()
    org_id = str(current_user.organizacion_id)

    # Obtener equipos de la organización
    equipos_resp = supabase.table("equipos").select("id, nombre, categoria").eq(
        "organizacion_id", org_id
    ).eq("activo", True).execute()

    equipo_ids = [e["id"] for e in equipos_resp.data]

    if equipo_id:
        equipo_ids = [str(equipo_id)]

    if not equipo_ids:
        return {
            "equipos": 0,
            "jugadores": 0,
            "sesiones_mes": 0,
            "partidos_pendientes": 0,
            "proximo_partido": None,
            "ultima_sesion": None,
        }

    # Contadores en paralelo conceptual (secuencial por API sync)
    jugadores = supabase.table("jugadores").select(
        "id", count="exact"
    ).in_("equipo_id", equipo_ids).limit(0).execute()

    hoy = date.today()
    inicio_mes = hoy.replace(day=1)

    sesiones_mes = supabase.table("sesiones").select(
        "id", count="exact"
    ).in_("equipo_id", equipo_ids).gte(
        "fecha", inicio_mes.isoformat()
    ).limit(0).execute()

    partidos_pendientes = supabase.table("partidos").select(
        "id", count="exact"
    ).in_("equipo_id", equipo_ids).gte(
        "fecha", hoy.isoformat()
    ).is_("goles_favor", "null").limit(0).execute()

    # Próximo partido
    proximo = supabase.table("partidos").select(
        "*, rivales(nombre, nombre_corto, escudo_url)"
    ).in_("equipo_id", equipo_ids).gte(
        "fecha", hoy.isoformat()
    ).is_("goles_favor", "null").order("fecha").limit(1).execute()

    proximo_partido = None
    if proximo.data:
        p = proximo.data[0]
        p["rival"] = p.pop("rivales", None)
        proximo_partido = p

    # Última sesión
    ultima = supabase.table("sesiones").select(
        "id, titulo, fecha, match_day, estado"
    ).in_("equipo_id", equipo_ids).order(
        "fecha", desc=True
    ).limit(1).execute()

    ultima_sesion = ultima.data[0] if ultima.data else None

    return {
        "equipos": len(equipos_resp.data),
        "jugadores": jugadores.count or 0,
        "sesiones_mes": sesiones_mes.count or 0,
        "partidos_pendientes": partidos_pendientes.count or 0,
        "proximo_partido": proximo_partido,
        "ultima_sesion": ultima_sesion,
    }


@router.get("/semana")
async def dashboard_semana(
    equipo_id: Optional[UUID] = None,
    fecha_referencia: Optional[date] = None,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """
    Vista semanal: sesiones y partidos de la semana actual.
    Ideal para el calendario del dashboard.
    """
    supabase = get_supabase()
    org_id = str(current_user.organizacion_id)

    if not fecha_referencia:
        fecha_referencia = date.today()

    # Calcular lunes y domingo de la semana
    lunes = fecha_referencia - timedelta(days=fecha_referencia.weekday())
    domingo = lunes + timedelta(days=6)

    # Obtener equipos
    if equipo_id:
        equipo_ids = [str(equipo_id)]
    else:
        equipos_resp = supabase.table("equipos").select("id").eq(
            "organizacion_id", org_id
        ).eq("activo", True).execute()
        equipo_ids = [e["id"] for e in equipos_resp.data]

    if not equipo_ids:
        return {"sesiones": [], "partidos": [], "semana": {"inicio": lunes.isoformat(), "fin": domingo.isoformat()}}

    # Sesiones de la semana
    sesiones = supabase.table("sesiones").select(
        "id, titulo, fecha, match_day, estado, duracion_total"
    ).in_("equipo_id", equipo_ids).gte(
        "fecha", lunes.isoformat()
    ).lte("fecha", domingo.isoformat()).order("fecha").execute()

    # Partidos de la semana
    partidos = supabase.table("partidos").select(
        "id, fecha, hora, localia, competicion, goles_favor, goles_contra, resultado, rivales(nombre, nombre_corto)"
    ).in_("equipo_id", equipo_ids).gte(
        "fecha", lunes.isoformat()
    ).lte("fecha", domingo.isoformat()).order("fecha").execute()

    for p in partidos.data:
        p["rival"] = p.pop("rivales", None)

    return {
        "sesiones": sesiones.data,
        "partidos": partidos.data,
        "semana": {
            "inicio": lunes.isoformat(),
            "fin": domingo.isoformat(),
        }
    }


@router.get("/plantilla")
async def dashboard_plantilla(
    equipo_id: UUID = Query(...),
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """
    Estado de la plantilla: disponibilidad, lesionados, etc.
    """
    supabase = get_supabase()

    response = supabase.table("jugadores").select(
        "id, nombre, apellidos, dorsal, posicion_principal, estado, "
        "fecha_lesion, fecha_vuelta_estimada, es_convocable, foto_url, "
        "nivel_tecnico, nivel_tactico, nivel_fisico, nivel_mental"
    ).eq("equipo_id", str(equipo_id)).order("apellidos").execute()

    jugadores = response.data
    total = len(jugadores)

    # Agrupar por estado
    por_estado = {}
    for j in jugadores:
        est = j.get("estado", "activo")
        if est not in por_estado:
            por_estado[est] = []
        por_estado[est].append(j)

    disponibles = len(por_estado.get("activo", []))
    lesionados = por_estado.get("lesionado", [])
    sancionados = por_estado.get("sancionado", [])

    return {
        "total": total,
        "disponibles": disponibles,
        "lesionados": len(lesionados),
        "sancionados": len(sancionados),
        "no_disponibles": total - disponibles,
        "por_estado": {k: len(v) for k, v in por_estado.items()},
        "jugadores_lesionados": lesionados,
        "jugadores_sancionados": sancionados,
    }


@router.get("/carga-semanal")
async def dashboard_carga_semanal(
    equipo_id: UUID = Query(...),
    semanas: int = Query(4, ge=1, le=12),
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """
    Evolución de carga semanal del equipo (RPE promedio por semana).
    """
    supabase = get_supabase()

    hoy = date.today()
    fecha_inicio = hoy - timedelta(weeks=semanas)

    # Obtener jugadores del equipo
    jugadores = supabase.table("jugadores").select("id").eq(
        "equipo_id", str(equipo_id)
    ).execute()

    jugador_ids = [j["id"] for j in jugadores.data]

    if not jugador_ids:
        return {"semanas": [], "promedio_global": None}

    # Obtener registros RPE
    registros = supabase.table("registros_rpe").select(
        "fecha, rpe, carga_sesion"
    ).in_("jugador_id", jugador_ids).gte(
        "fecha", fecha_inicio.isoformat()
    ).order("fecha").execute()

    # Agrupar por semana
    semanas_data = {}
    for r in registros.data:
        fecha_r = date.fromisoformat(r["fecha"])
        lunes = fecha_r - timedelta(days=fecha_r.weekday())
        semana_key = lunes.isoformat()

        if semana_key not in semanas_data:
            semanas_data[semana_key] = {"rpe_vals": [], "carga_vals": []}

        semanas_data[semana_key]["rpe_vals"].append(r["rpe"])
        if r.get("carga_sesion"):
            semanas_data[semana_key]["carga_vals"].append(float(r["carga_sesion"]))

    resultado = []
    for semana_key in sorted(semanas_data.keys()):
        data = semanas_data[semana_key]
        resultado.append({
            "semana_inicio": semana_key,
            "rpe_promedio": round(sum(data["rpe_vals"]) / len(data["rpe_vals"]), 1),
            "carga_promedio": round(sum(data["carga_vals"]) / len(data["carga_vals"]), 1) if data["carga_vals"] else None,
            "num_registros": len(data["rpe_vals"]),
        })

    global_rpe = [r["rpe_promedio"] for r in resultado]
    promedio_global = round(sum(global_rpe) / len(global_rpe), 1) if global_rpe else None

    return {"semanas": resultado, "promedio_global": promedio_global}


@router.get("/actividad-reciente")
async def dashboard_actividad_reciente(
    limit: int = Query(10, ge=1, le=50),
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """
    Actividad reciente: últimas acciones relevantes.
    """
    supabase = get_supabase()
    org_id = str(current_user.organizacion_id)

    equipos_resp = supabase.table("equipos").select("id").eq(
        "organizacion_id", org_id
    ).execute()
    equipo_ids = [e["id"] for e in equipos_resp.data]

    actividad = []

    if equipo_ids:
        # Últimas sesiones creadas
        sesiones = supabase.table("sesiones").select(
            "id, titulo, fecha, estado, created_at"
        ).in_("equipo_id", equipo_ids).order(
            "created_at", desc=True
        ).limit(5).execute()

        for s in sesiones.data:
            actividad.append({
                "tipo": "sesion",
                "titulo": s["titulo"],
                "detalle": f"Sesión {s.get('estado', '')} - {s.get('fecha', '')}",
                "fecha": s["created_at"],
                "entidad_id": s["id"],
            })

        # Últimos partidos con resultado
        partidos = supabase.table("partidos").select(
            "id, fecha, goles_favor, goles_contra, resultado, updated_at, rivales(nombre)"
        ).in_("equipo_id", equipo_ids).not_.is_(
            "goles_favor", "null"
        ).order("updated_at", desc=True).limit(5).execute()

        for p in partidos.data:
            rival = p.get("rivales", {})
            actividad.append({
                "tipo": "partido",
                "titulo": f"vs {rival.get('nombre', '?')}",
                "detalle": f"{p.get('goles_favor', 0)}-{p.get('goles_contra', 0)} ({p.get('resultado', '')})",
                "fecha": p["updated_at"],
                "entidad_id": p["id"],
            })

    # Ordenar por fecha
    actividad.sort(key=lambda x: x["fecha"], reverse=True)

    return {"data": actividad[:limit]}
