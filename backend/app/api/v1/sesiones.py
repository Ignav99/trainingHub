"""
TrainingHub Pro - Router de Sesiones
CRUD para sesiones de entrenamiento.
"""

import logging

from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date
from math import ceil
import io

logger = logging.getLogger(__name__)

from app.models import (
    SesionCreate,
    SesionUpdate,
    SesionResponse,
    SesionListResponse,
    SesionTareaCreate,
    SesionTareaResponse,
    SesionTareaUpdate,
    SesionTareasBatchUpdate,
    FormacionEquipos,
    MatchDay,
    EstadoSesion,
    UsuarioResponse,
    AsistenciaBatchCreate,
    AsistenciaUpdate,
    AsistenciaResponse,
    AsistenciaListResponse,
    AsistenciaResumen,
    AsistenciaHistoricoJugador,
    AsistenciaHistoricoResponse,
    JugadorInvitadoCreate,
    JugadorResponse,
)
from app.database import get_supabase
from app.dependencies import require_permission, require_any_permission, AuthContext
from app.security.permissions import Permission
from app.services.pdf_service import generate_sesion_pdf, generate_sesion_pdf_v2
from app.services.storage_service import upload_file
from app.services.audit_service import log_create, log_update, log_delete
from app.services.notification_service import notify_sesion_created
from app.services.load_calculation_service import recalculate_player_load
from app.config import get_settings

router = APIRouter()


@router.get("", response_model=SesionListResponse)
async def list_sesiones(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    equipo_id: Optional[UUID] = None,
    match_day: Optional[MatchDay] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    estado: Optional[EstadoSesion] = None,
    busqueda: Optional[str] = None,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Lista sesiones con filtros."""
    supabase = get_supabase()

    # Query base
    query = supabase.table("sesiones").select(
        "*, equipos(nombre, categoria)",
        count="exact"
    )

    # Filtrar por equipos de la organización del usuario
    equipos = supabase.table("equipos").select("id").eq(
        "organizacion_id", auth.organizacion_id
    ).execute()

    equipo_ids = [e["id"] for e in equipos.data]
    if equipo_ids:
        query = query.in_("equipo_id", equipo_ids)

    # Aplicar filtros
    if equipo_id:
        query = query.eq("equipo_id", str(equipo_id))

    if match_day:
        query = query.eq("match_day", match_day.value)

    if fecha_desde:
        query = query.gte("fecha", fecha_desde.isoformat())

    if fecha_hasta:
        query = query.lte("fecha", fecha_hasta.isoformat())

    if estado:
        query = query.eq("estado", estado.value)

    if busqueda:
        query = query.or_(f"titulo.ilike.%{busqueda}%,objetivo_principal.ilike.%{busqueda}%")

    # Ordenar por fecha descendente
    query = query.order("fecha", desc=True)

    # Paginación
    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    # Mapear respuesta
    sesiones = []
    for s in response.data:
        s["equipo"] = s.pop("equipos", None)
        sesiones.append(SesionResponse(**s))

    return SesionListResponse(
        data=sesiones,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/asistencia-historico", response_model=AsistenciaHistoricoResponse)
async def get_asistencia_historico(
    equipo_id: UUID = Query(...),
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Estadísticas históricas de asistencia por jugador."""
    supabase = get_supabase()

    # Get all sessions for the team in the date range
    sesiones_query = supabase.table("sesiones").select("id, fecha").eq(
        "equipo_id", str(equipo_id)
    )
    if fecha_desde:
        sesiones_query = sesiones_query.gte("fecha", fecha_desde.isoformat())
    if fecha_hasta:
        sesiones_query = sesiones_query.lte("fecha", fecha_hasta.isoformat())

    sesiones_response = sesiones_query.order("fecha", desc=True).execute()
    sesion_ids = [s["id"] for s in sesiones_response.data]

    if not sesion_ids:
        return AsistenciaHistoricoResponse(
            data=[],
            periodo={"desde": fecha_desde, "hasta": fecha_hasta},
            media_equipo=0.0,
        )

    # Get all attendance records for these sessions
    asistencias_response = supabase.table("asistencias_sesion").select(
        "jugador_id, presente, motivo_ausencia, sesion_id, sesiones(fecha)"
    ).in_("sesion_id", sesion_ids).execute()

    # Get player info
    jugadores_response = supabase.table("jugadores").select(
        "id, nombre, apellidos, dorsal, posicion_principal"
    ).eq("equipo_id", str(equipo_id)).eq("estado", "activo").execute()

    jugadores_map = {j["id"]: j for j in jugadores_response.data}

    # Aggregate per player
    stats: dict = {}
    for a in asistencias_response.data:
        jid = a["jugador_id"]
        if jid not in stats:
            stats[jid] = {
                "total": 0, "presencias": 0, "ausencias": 0,
                "motivos": {}, "ultima_ausencia": None,
            }
        s = stats[jid]
        s["total"] += 1
        if a["presente"]:
            s["presencias"] += 1
        else:
            s["ausencias"] += 1
            motivo = a.get("motivo_ausencia") or "otro"
            s["motivos"][motivo] = s["motivos"].get(motivo, 0) + 1
            # Track most recent absence date
            sesion_data = a.get("sesiones", {}) or {}
            fecha_str = sesion_data.get("fecha")
            if fecha_str:
                if s["ultima_ausencia"] is None or fecha_str > s["ultima_ausencia"]:
                    s["ultima_ausencia"] = fecha_str

    # Build response
    resultado = []
    total_porcentajes = []

    for jid, s in stats.items():
        jugador = jugadores_map.get(jid, {})
        if not jugador:
            continue
        pct = (s["presencias"] / s["total"] * 100) if s["total"] > 0 else 100.0
        total_porcentajes.append(pct)
        resultado.append(AsistenciaHistoricoJugador(
            jugador_id=jid,
            nombre=jugador.get("nombre", ""),
            apellidos=jugador.get("apellidos", ""),
            dorsal=jugador.get("dorsal"),
            posicion_principal=jugador.get("posicion_principal", ""),
            total_sesiones=s["total"],
            presencias=s["presencias"],
            ausencias=s["ausencias"],
            porcentaje=round(pct, 1),
            motivos=s["motivos"],
            ultima_ausencia=s["ultima_ausencia"],
        ))

    # Sort by % ascending (worst attendance first)
    resultado.sort(key=lambda x: x.porcentaje)

    media = round(sum(total_porcentajes) / len(total_porcentajes), 1) if total_porcentajes else 0.0

    return AsistenciaHistoricoResponse(
        data=resultado,
        periodo={"desde": str(fecha_desde) if fecha_desde else None, "hasta": str(fecha_hasta) if fecha_hasta else None},
        media_equipo=media,
    )


@router.get("/{sesion_id}", response_model=SesionResponse)
async def get_sesion(
    sesion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Obtiene una sesión con todas sus tareas."""
    supabase = get_supabase()

    # Obtener sesión
    response = supabase.table("sesiones").select(
        "*, equipos(nombre, categoria)"
    ).eq("id", str(sesion_id)).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )

    sesion_data = response.data
    sesion_data["equipo"] = sesion_data.pop("equipos", None)

    # Obtener tareas de la sesión
    tareas_response = supabase.table("sesion_tareas").select(
        "*, tareas(*, categorias_tarea(*))"
    ).eq("sesion_id", str(sesion_id)).order("orden").execute()

    sesion_data["tareas"] = []
    for st in tareas_response.data:
        tarea_data = st.pop("tareas", {})
        if tarea_data:
            tarea_data["categoria"] = tarea_data.pop("categorias_tarea", None)
        st["tarea"] = tarea_data
        sesion_data["tareas"].append(SesionTareaResponse(**st))

    return SesionResponse(**sesion_data)


@router.post("", response_model=SesionResponse, status_code=status.HTTP_201_CREATED)
async def create_sesion(
    sesion: SesionCreate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_CREATE)),
):
    """Crea una nueva sesión."""
    supabase = get_supabase()

    # Preparar datos
    sesion_data = sesion.model_dump(exclude_unset=True)
    sesion_data["creado_por"] = auth.user_id

    # Usar equipo por defecto si no se proporciona
    if not sesion_data.get("equipo_id"):
        # Obtener primer equipo de la organización
        equipos = supabase.table("equipos").select("id").eq(
            "organizacion_id", auth.organizacion_id
        ).limit(1).execute()

        if equipos.data:
            sesion_data["equipo_id"] = equipos.data[0]["id"]
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se encontró ningún equipo en la organización"
            )
    else:
        sesion_data["equipo_id"] = str(sesion_data["equipo_id"])

    # Convertir fecha a string
    if sesion_data.get("fecha"):
        sesion_data["fecha"] = sesion_data["fecha"].isoformat()

    # Insertar
    response = supabase.table("sesiones").insert(sesion_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear sesión"
        )

    created = response.data[0]
    log_create(auth.user_id, "sesion", created["id"], {"titulo": created.get("titulo")})

    # Notify team staff about new session
    notify_sesion_created(
        sesion_id=created["id"],
        sesion_titulo=created.get("titulo", ""),
        equipo_id=created["equipo_id"],
        creado_por=auth.user_id,
    )

    return SesionResponse(**created)


@router.put("/{sesion_id}", response_model=SesionResponse)
async def update_sesion(
    sesion_id: UUID,
    sesion: SesionUpdate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Actualiza una sesión."""
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("sesiones").select("*").eq(
        "id", str(sesion_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )

    # Preparar datos
    update_data = sesion.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    # Convertir fecha si existe
    if update_data.get("fecha"):
        update_data["fecha"] = update_data["fecha"].isoformat()

    # Actualizar
    response = supabase.table("sesiones").update(update_data).eq(
        "id", str(sesion_id)
    ).execute()

    log_update(auth.user_id, "sesion", str(sesion_id), datos_nuevos=update_data)

    return SesionResponse(**response.data[0])


@router.delete("/{sesion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sesion(
    sesion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_DELETE)),
):
    """Elimina una sesión."""
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("sesiones").select("id").eq(
        "id", str(sesion_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )

    # Las tareas se eliminan en cascada por la FK
    supabase.table("sesiones").delete().eq("id", str(sesion_id)).execute()

    log_delete(auth.user_id, "sesion", str(sesion_id))

    return None


@router.post("/{sesion_id}/tareas", response_model=SesionResponse)
async def add_tarea_to_sesion(
    sesion_id: UUID,
    tarea_data: SesionTareaCreate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Añade una tarea a la sesión."""
    supabase = get_supabase()

    # Verificar que la sesión existe
    sesion = supabase.table("sesiones").select("id").eq(
        "id", str(sesion_id)
    ).single().execute()

    if not sesion.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )

    # Añadir tarea
    data = {
        "sesion_id": str(sesion_id),
        "tarea_id": str(tarea_data.tarea_id),
        "orden": tarea_data.orden,
        "fase_sesion": tarea_data.fase_sesion.value,
        "duracion_override": tarea_data.duracion_override,
        "notas": tarea_data.notas,
    }

    supabase.table("sesion_tareas").insert(data).execute()

    # Recalcular duración total
    tareas = supabase.table("sesion_tareas").select(
        "duracion_override, tareas(duracion_total)"
    ).eq("sesion_id", str(sesion_id)).execute()

    duracion_total = sum(
        t.get("duracion_override") or t.get("tareas", {}).get("duracion_total", 0)
        for t in tareas.data
    )

    supabase.table("sesiones").update({
        "duracion_total": duracion_total
    }).eq("id", str(sesion_id)).execute()

    # Devolver sesión actualizada
    return await get_sesion(sesion_id, auth)


@router.delete("/{sesion_id}/tareas/{tarea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tarea_from_sesion(
    sesion_id: UUID,
    tarea_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Elimina una tarea de la sesión."""
    supabase = get_supabase()

    supabase.table("sesion_tareas").delete().match({
        "sesion_id": str(sesion_id),
        "tarea_id": str(tarea_id)
    }).execute()

    return None


@router.put("/{sesion_id}/tareas/{sesion_tarea_id}", response_model=SesionResponse)
async def update_sesion_tarea(
    sesion_id: UUID,
    sesion_tarea_id: UUID,
    tarea_data: SesionTareaUpdate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Actualiza una tarea individual dentro de la sesion (notas, duracion, fase, orden)."""
    supabase = get_supabase()

    update_data = tarea_data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")

    if "fase_sesion" in update_data and update_data["fase_sesion"]:
        update_data["fase_sesion"] = update_data["fase_sesion"].value

    supabase.table("sesion_tareas").update(update_data).eq(
        "id", str(sesion_tarea_id)
    ).eq("sesion_id", str(sesion_id)).execute()

    return await get_sesion(sesion_id, auth)


@router.put("/{sesion_id}/tareas-batch", response_model=SesionResponse)
async def batch_update_tareas(
    sesion_id: UUID,
    batch: SesionTareasBatchUpdate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Reemplaza todas las tareas de una sesion (delete all + re-insert). Recalcula duracion_total."""
    supabase = get_supabase()

    # Verificar sesion
    existing = supabase.table("sesiones").select("id").eq(
        "id", str(sesion_id)
    ).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    # Delete all existing tareas
    supabase.table("sesion_tareas").delete().eq("sesion_id", str(sesion_id)).execute()

    # Insert new tareas
    for tarea in batch.tareas:
        data = {
            "sesion_id": str(sesion_id),
            "tarea_id": str(tarea.tarea_id),
            "orden": tarea.orden,
            "fase_sesion": tarea.fase_sesion.value,
            "duracion_override": tarea.duracion_override,
            "notas": tarea.notas,
        }
        supabase.table("sesion_tareas").insert(data).execute()

    # Recalculate duration
    tareas = supabase.table("sesion_tareas").select(
        "duracion_override, tareas(duracion_total)"
    ).eq("sesion_id", str(sesion_id)).execute()

    duracion_total = sum(
        t.get("duracion_override") or t.get("tareas", {}).get("duracion_total", 0)
        for t in tareas.data
    )

    supabase.table("sesiones").update({
        "duracion_total": duracion_total
    }).eq("id", str(sesion_id)).execute()

    log_update(auth.user_id, "sesion", str(sesion_id), datos_nuevos={"tareas_batch": len(batch.tareas)})

    return await get_sesion(sesion_id, auth)


# ============ Asistencia Endpoints ============


@router.get("/{sesion_id}/asistencias", response_model=AsistenciaListResponse)
async def get_asistencias(
    sesion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Lista asistencias de una sesion con datos de jugadores."""
    supabase = get_supabase()

    response = supabase.table("asistencias_sesion").select(
        "*, jugadores(id, nombre, apellidos, dorsal, posicion_principal, foto_url, es_portero)"
    ).eq("sesion_id", str(sesion_id)).order("created_at").execute()

    asistencias = []
    presentes = 0
    ausentes = 0

    for a in response.data:
        a["jugador"] = a.pop("jugadores", None)
        asistencias.append(AsistenciaResponse(**a))
        if a.get("presente"):
            presentes += 1
        else:
            ausentes += 1

    return AsistenciaListResponse(
        data=asistencias,
        total=len(asistencias),
        presentes=presentes,
        ausentes=ausentes,
    )


@router.post("/{sesion_id}/asistencias/batch", response_model=AsistenciaListResponse)
async def batch_save_asistencias(
    sesion_id: UUID,
    batch: AsistenciaBatchCreate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Guarda asistencias en batch (upsert: delete existing + insert new)."""
    supabase = get_supabase()

    # Verify session exists
    existing = supabase.table("sesiones").select("id").eq(
        "id", str(sesion_id)
    ).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    # Delete existing
    supabase.table("asistencias_sesion").delete().eq("sesion_id", str(sesion_id)).execute()

    # Insert new
    for a in batch.asistencias:
        data = {
            "sesion_id": str(sesion_id),
            "jugador_id": str(a.jugador_id),
            "presente": a.presente,
            "motivo_ausencia": a.motivo_ausencia.value if a.motivo_ausencia else None,
            "notas": a.notas,
            "hora_llegada": a.hora_llegada.isoformat() if a.hora_llegada else None,
            "tipo_participacion": [tp.value for tp in a.tipo_participacion] if a.tipo_participacion else [],
        }
        supabase.table("asistencias_sesion").insert(data).execute()

    log_update(auth.user_id, "sesion", str(sesion_id), datos_nuevos={"asistencias_batch": len(batch.asistencias)})

    # Trigger load recalculation for present players if session is completed
    try:
        sesion_data = supabase.table("sesiones").select("estado, equipo_id").eq("id", str(sesion_id)).single().execute()
        if sesion_data.data and sesion_data.data.get("estado") == "completada":
            equipo_id = sesion_data.data["equipo_id"]
            for a in batch.asistencias:
                if a.presente:
                    recalculate_player_load(a.jugador_id, UUID(equipo_id))
    except Exception as e:
        logger.warning(f"Error recalculating load after attendance: {e}")

    return await get_asistencias(sesion_id, auth)


@router.put("/{sesion_id}/asistencias/{asistencia_id}", response_model=AsistenciaResponse)
async def update_asistencia(
    sesion_id: UUID,
    asistencia_id: UUID,
    data: AsistenciaUpdate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Actualiza una asistencia individual."""
    supabase = get_supabase()

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")

    if "motivo_ausencia" in update_data and update_data["motivo_ausencia"]:
        update_data["motivo_ausencia"] = update_data["motivo_ausencia"].value

    if "hora_llegada" in update_data and update_data["hora_llegada"]:
        update_data["hora_llegada"] = update_data["hora_llegada"].isoformat()

    if "tipo_participacion" in update_data and update_data["tipo_participacion"]:
        update_data["tipo_participacion"] = [tp.value for tp in update_data["tipo_participacion"]]

    response = supabase.table("asistencias_sesion").update(update_data).eq(
        "id", str(asistencia_id)
    ).eq("sesion_id", str(sesion_id)).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")

    return AsistenciaResponse(**response.data[0])


@router.get("/{sesion_id}/asistencias/resumen", response_model=AsistenciaResumen)
async def get_asistencia_resumen(
    sesion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Resumen de asistencia: total, presentes, ausentes, por posicion."""
    supabase = get_supabase()

    response = supabase.table("asistencias_sesion").select(
        "presente, motivo_ausencia, jugadores(posicion_principal)"
    ).eq("sesion_id", str(sesion_id)).execute()

    total = len(response.data)
    presentes = sum(1 for a in response.data if a.get("presente"))
    ausentes = total - presentes

    por_posicion: dict = {}
    motivos: dict = {}

    for a in response.data:
        pos = a.get("jugadores", {}).get("posicion_principal", "otro") if a.get("jugadores") else "otro"
        if pos not in por_posicion:
            por_posicion[pos] = {"presentes": 0, "ausentes": 0}
        if a.get("presente"):
            por_posicion[pos]["presentes"] += 1
        else:
            por_posicion[pos]["ausentes"] += 1
            motivo = a.get("motivo_ausencia", "otro") or "otro"
            motivos[motivo] = motivos.get(motivo, 0) + 1

    return AsistenciaResumen(
        total=total,
        presentes=presentes,
        ausentes=ausentes,
        por_posicion=por_posicion,
        motivos_ausencia=motivos,
    )


# ============ Equipos IA (Rule-based) ============


class SugerirEquiposRequest(BaseModel):
    estructura: str = Field(default="4v4", description="Ej: 4v4, 4v4+2, 5v5+GK")
    criterio: str = Field(default="equilibrado", pattern="^(equilibrado|por_nivel|mixto)$")


@router.post("/{sesion_id}/sugerir-equipos")
async def sugerir_equipos(
    sesion_id: UUID,
    request: SugerirEquiposRequest,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Sugiere equipos equilibrados basandose en la lista de presentes."""
    supabase = get_supabase()

    # Get present players from asistencia
    asistencias = supabase.table("asistencias_sesion").select(
        "jugador_id, jugadores(*)"
    ).eq("sesion_id", str(sesion_id)).eq("presente", True).execute()

    if not asistencias.data:
        raise HTTPException(
            status_code=400,
            detail="No hay jugadores presentes. Guarda la asistencia primero."
        )

    jugadores_presentes = []
    for a in asistencias.data:
        jugador = a.get("jugadores")
        if jugador:
            jugadores_presentes.append(jugador)

    if len(jugadores_presentes) < 4:
        raise HTTPException(
            status_code=400,
            detail="Se necesitan al menos 4 jugadores presentes para formar equipos."
        )

    from app.services.team_formation_service import generar_equipos

    resultado = generar_equipos(
        jugadores_presentes=jugadores_presentes,
        estructura=request.estructura,
        criterio=request.criterio,
    )

    return resultado


# ============ Per-Task Formation Endpoints ============


class DuplicarYEditarTareaRequest(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    duracion_total: Optional[int] = None
    num_jugadores_min: Optional[int] = None
    num_jugadores_max: Optional[int] = None
    espacio_largo: Optional[int] = None
    espacio_ancho: Optional[int] = None
    reglas_tecnicas: Optional[str] = None
    reglas_tacticas: Optional[str] = None
    consignas_ofensivas: Optional[str] = None
    consignas_defensivas: Optional[str] = None
    errores_comunes: Optional[str] = None
    variantes: Optional[str] = None
    progresiones: Optional[str] = None
    estructura_equipos: Optional[str] = None
    material: Optional[list] = None
    posicion_entrenador: Optional[str] = None
    situacion_tactica: Optional[str] = None


@router.post("/{sesion_id}/tareas/{sesion_tarea_id}/duplicar-y-editar")
async def duplicar_y_editar_tarea(
    sesion_id: UUID,
    sesion_tarea_id: UUID,
    cambios: DuplicarYEditarTareaRequest,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Duplica una tarea de la biblioteca, aplica cambios, y la reemplaza en la sesion."""
    supabase = get_supabase()

    # 1. Fetch the sesion_tarea to get the current tarea_id
    st_response = supabase.table("sesion_tareas").select(
        "*, tareas(*)"
    ).eq("id", str(sesion_tarea_id)).eq("sesion_id", str(sesion_id)).single().execute()

    if not st_response.data:
        raise HTTPException(status_code=404, detail="Tarea de sesion no encontrada")

    original_tarea = st_response.data.get("tareas", {})
    if not original_tarea:
        raise HTTPException(status_code=404, detail="Tarea original no encontrada")

    # 2. Build the duplicated tarea data
    campos_copiables = [
        "descripcion", "duracion_total", "num_jugadores_min", "num_jugadores_max",
        "espacio_largo", "espacio_ancho", "reglas_tecnicas", "reglas_tacticas",
        "consignas_ofensivas", "consignas_defensivas", "errores_comunes",
        "variantes", "progresiones", "estructura_equipos", "material",
        "posicion_entrenador", "situacion_tactica", "fase_juego",
        "principio_tactico", "subprincipio_tactico", "densidad",
        "nivel_cognitivo", "num_series", "grafico_data",
        "categoria_id", "equipo_id", "organizacion_id",
    ]

    nueva_tarea = {}
    for campo in campos_copiables:
        if campo in original_tarea and original_tarea[campo] is not None:
            nueva_tarea[campo] = original_tarea[campo]

    # Default title with prefix
    nueva_tarea["titulo"] = f"(Editada) {original_tarea.get('titulo', 'Sin titulo')}"
    nueva_tarea["es_plantilla"] = False
    nueva_tarea["creado_por"] = str(auth.user_id)

    # 3. Apply changes from request
    cambios_dict = cambios.model_dump(exclude_none=True)
    nueva_tarea.update(cambios_dict)

    # 4. Insert the new tarea
    insert_response = supabase.table("tareas").insert(nueva_tarea).execute()
    if not insert_response.data:
        raise HTTPException(status_code=500, detail="Error al duplicar tarea")

    new_tarea_id = insert_response.data[0]["id"]

    # 5. Update sesion_tareas to point to the new tarea
    supabase.table("sesion_tareas").update(
        {"tarea_id": new_tarea_id}
    ).eq("id", str(sesion_tarea_id)).execute()

    # 6. Return the updated sesion_tarea with new tarea data
    updated = supabase.table("sesion_tareas").select(
        "*, tareas(*)"
    ).eq("id", str(sesion_tarea_id)).single().execute()

    return updated.data


class AIEditTareaRequest(BaseModel):
    instruccion: str = Field(..., min_length=3, max_length=2000)


@router.post("/{sesion_id}/tareas/{sesion_tarea_id}/ai-edit")
async def ai_edit_tarea(
    sesion_id: UUID,
    sesion_tarea_id: UUID,
    request: AIEditTareaRequest,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Usa IA para editar una tarea en la sesion segun instrucciones del usuario."""
    supabase = get_supabase()

    # 1. Fetch the sesion_tarea and current tarea
    st_response = supabase.table("sesion_tareas").select(
        "*, tareas(*)"
    ).eq("id", str(sesion_tarea_id)).eq("sesion_id", str(sesion_id)).single().execute()

    if not st_response.data:
        raise HTTPException(status_code=404, detail="Tarea de sesion no encontrada")

    tarea_actual = st_response.data.get("tareas", {})
    if not tarea_actual:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    # 2. Call Claude to get modifications
    try:
        from app.services.claude_service import ClaudeService, ClaudeError
        claude = ClaudeService()
        cambios_ia = await claude.edit_task_with_ai(
            tarea=tarea_actual,
            instruccion=request.instruccion,
        )
    except ClaudeError as e:
        logger.error(f"AI edit ClaudeError: {e}")
        error_msg = str(e)
        if "conexion" in error_msg.lower():
            raise HTTPException(status_code=503, detail=error_msg)
        elif "saturado" in error_msg.lower():
            raise HTTPException(status_code=429, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        logger.error(f"AI edit unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error inesperado al procesar con IA.")

    if not cambios_ia:
        raise HTTPException(status_code=400, detail="La IA no genero cambios")

    # 3. Duplicate the tarea and apply AI changes (same logic as duplicar-y-editar)
    campos_copiables = [
        "descripcion", "duracion_total", "num_jugadores_min", "num_jugadores_max",
        "espacio_largo", "espacio_ancho", "reglas_tecnicas", "reglas_tacticas",
        "consignas_ofensivas", "consignas_defensivas", "errores_comunes",
        "variantes", "progresiones", "estructura_equipos", "material",
        "posicion_entrenador", "situacion_tactica", "fase_juego",
        "principio_tactico", "subprincipio_tactico", "densidad",
        "nivel_cognitivo", "num_series", "grafico_data",
        "categoria_id", "equipo_id", "organizacion_id",
    ]

    nueva_tarea = {}
    for campo in campos_copiables:
        if campo in tarea_actual and tarea_actual[campo] is not None:
            nueva_tarea[campo] = tarea_actual[campo]

    nueva_tarea["titulo"] = f"(Editada) {tarea_actual.get('titulo', 'Sin titulo')}"
    nueva_tarea["es_plantilla"] = False
    nueva_tarea["creado_por"] = str(auth.user_id)

    # Apply AI changes (only known fields)
    allowed_fields = set(campos_copiables) | {"titulo"}
    for k, v in cambios_ia.items():
        if k in allowed_fields:
            nueva_tarea[k] = v

    # 4. Insert duplicated tarea
    insert_response = supabase.table("tareas").insert(nueva_tarea).execute()
    if not insert_response.data:
        raise HTTPException(status_code=500, detail="Error al crear tarea editada")

    new_tarea_id = insert_response.data[0]["id"]

    # 5. Update sesion_tareas
    supabase.table("sesion_tareas").update(
        {"tarea_id": new_tarea_id}
    ).eq("id", str(sesion_tarea_id)).execute()

    # 6. Return updated data
    updated = supabase.table("sesion_tareas").select(
        "*, tareas(*)"
    ).eq("id", str(sesion_tarea_id)).single().execute()

    return updated.data


class GenerarEquiposTareaRequest(BaseModel):
    criterio: str = Field(default="equilibrado", pattern="^(equilibrado|por_nivel)$")


@router.post("/{sesion_id}/tareas/{sesion_tarea_id}/generar-equipos")
async def generar_equipos_tarea(
    sesion_id: UUID,
    sesion_tarea_id: UUID,
    request: GenerarEquiposTareaRequest,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Genera formacion de equipos para una tarea especifica de la sesion."""
    supabase = get_supabase()

    # Get sesion_tarea with its linked tarea
    st_response = supabase.table("sesion_tareas").select(
        "*, tareas(estructura_equipos)"
    ).eq("id", str(sesion_tarea_id)).eq("sesion_id", str(sesion_id)).single().execute()

    if not st_response.data:
        raise HTTPException(status_code=404, detail="Tarea de sesion no encontrada")

    tarea_data = st_response.data.get("tareas", {}) or {}
    estructura = tarea_data.get("estructura_equipos") or "4v4"

    # Get present players from asistencia
    asistencias = supabase.table("asistencias_sesion").select(
        "jugador_id, jugadores(*)"
    ).eq("sesion_id", str(sesion_id)).eq("presente", True).execute()

    if not asistencias.data:
        raise HTTPException(
            status_code=400,
            detail="No hay jugadores presentes. Guarda la asistencia primero."
        )

    jugadores_presentes = [
        a["jugadores"] for a in asistencias.data if a.get("jugadores")
    ]

    if len(jugadores_presentes) < 4:
        raise HTTPException(
            status_code=400,
            detail="Se necesitan al menos 4 jugadores presentes."
        )

    from app.services.team_formation_service import generar_formacion_tarea

    formacion = generar_formacion_tarea(
        jugadores_presentes=jugadores_presentes,
        estructura=estructura,
        criterio=request.criterio,
    )

    # Save to DB
    supabase.table("sesion_tareas").update({
        "formacion_equipos": formacion
    }).eq("id", str(sesion_tarea_id)).execute()

    return formacion


@router.put("/{sesion_id}/tareas/{sesion_tarea_id}/formacion")
async def update_formacion_tarea(
    sesion_id: UUID,
    sesion_tarea_id: UUID,
    formacion: FormacionEquipos,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Guarda/actualiza la formacion de equipos editada manualmente (drag & drop)."""
    supabase = get_supabase()

    # Verify sesion_tarea exists
    st_response = supabase.table("sesion_tareas").select("id").eq(
        "id", str(sesion_tarea_id)
    ).eq("sesion_id", str(sesion_id)).single().execute()

    if not st_response.data:
        raise HTTPException(status_code=404, detail="Tarea de sesion no encontrada")

    formacion_dict = formacion.model_dump()
    formacion_dict["auto_generado"] = False  # Manual edit

    supabase.table("sesion_tareas").update({
        "formacion_equipos": formacion_dict
    }).eq("id", str(sesion_tarea_id)).execute()

    return formacion_dict


@router.delete("/{sesion_id}/tareas/{sesion_tarea_id}/formacion", status_code=status.HTTP_204_NO_CONTENT)
async def delete_formacion_tarea(
    sesion_id: UUID,
    sesion_tarea_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Limpia la formacion de equipos de una tarea."""
    supabase = get_supabase()

    supabase.table("sesion_tareas").update({
        "formacion_equipos": None
    }).eq("id", str(sesion_tarea_id)).eq("sesion_id", str(sesion_id)).execute()

    return None


@router.get("/{sesion_id}/pdf")
async def generate_pdf(
    sesion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Genera el PDF de la sesión, lo sube a Storage y lo devuelve."""
    supabase = get_supabase()

    # Obtener sesión completa
    sesion_response = supabase.table("sesiones").select(
        "*, equipos(*, organizaciones(*))"
    ).eq("id", str(sesion_id)).single().execute()

    if not sesion_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )

    sesion = sesion_response.data
    equipo = sesion.get("equipos", {})
    organizacion = equipo.get("organizaciones", {})

    # Obtener tareas
    tareas_response = supabase.table("sesion_tareas").select(
        "*, tareas(*, categorias_tarea(*))"
    ).eq("sesion_id", str(sesion_id)).order("orden").execute()

    tareas = tareas_response.data

    # Fetch jugadores for formations (collect all jugador_ids from formacion_equipos)
    jugador_ids = set()
    for tarea_sesion in tareas:
        formacion = tarea_sesion.get("formacion_equipos")
        if formacion and isinstance(formacion, dict):
            for espacio in formacion.get("espacios", []):
                for grupo in espacio.get("grupos", []):
                    for jid in grupo.get("jugador_ids", []):
                        jugador_ids.add(str(jid))

    jugadores_map = {}
    if jugador_ids:
        jug_response = supabase.table("jugadores").select(
            "id, nombre, apellidos, dorsal, posicion_principal"
        ).in_("id", list(jugador_ids)).execute()
        jugadores_map = {str(j["id"]): j for j in jug_response.data}

    # Fetch microciclo name if linked
    microciclo_nombre = None
    if sesion.get("microciclo_id"):
        try:
            mc_resp = supabase.table("microciclos").select(
                "objetivo_principal, fecha_inicio, fecha_fin"
            ).eq("id", sesion["microciclo_id"]).single().execute()
            if mc_resp.data:
                mc = mc_resp.data
                microciclo_nombre = mc.get("objetivo_principal") or f"Microciclo {mc.get('fecha_inicio', '')}"
        except Exception:
            pass

    # Extract lugar from equipo config or organizacion
    lugar = None
    if equipo.get("config") and isinstance(equipo["config"], dict):
        lugar = equipo["config"].get("lugar_entrenamiento")
    if not lugar and organizacion.get("config") and isinstance(organizacion["config"], dict):
        lugar = organizacion["config"].get("lugar_entrenamiento")

    # Fetch ausencias (jugadores no presentes)
    ausencias = []
    try:
        ausencias_response = supabase.table("asistencias_sesion").select(
            "motivo_ausencia, jugadores(nombre, apellidos, dorsal)"
        ).eq("sesion_id", str(sesion_id)).eq("presente", False).execute()

        for a in ausencias_response.data:
            jugador = a.get("jugadores", {}) or {}
            ausencias.append({
                "dorsal": jugador.get("dorsal"),
                "nombre": jugador.get("nombre", ""),
                "apellidos": jugador.get("apellidos", ""),
                "motivo": a.get("motivo_ausencia", "otro") or "otro",
            })
    except Exception:
        pass  # Non-critical — PDF still generates without ausencias

    # Generar PDF con el servicio v2
    try:
        pdf_bytes = generate_sesion_pdf_v2(
            sesion, tareas, organizacion, jugadores_map,
            microciclo_nombre=microciclo_nombre,
            lugar=lugar,
            ausencias=ausencias,
        )
    except Exception as e:
        import logging
        logging.getLogger("traininghub.pdf").error("Error generando PDF: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando PDF: {str(e)}"
        )

    # Subir a Storage
    settings = get_settings()
    storage_path = f"sesiones/{auth.organizacion_id}/{sesion_id}.pdf"

    try:
        pdf_url = upload_file(
            bucket=settings.STORAGE_BUCKET_PDFS,
            path=storage_path,
            data=pdf_bytes,
            content_type="application/pdf",
        )

        # Guardar URL en la sesión
        supabase.table("sesiones").update({
            "pdf_url": pdf_url
        }).eq("id", str(sesion_id)).execute()
    except Exception:
        # Si falla el upload, devolvemos el PDF de todas formas
        pass

    # Devolver PDF como streaming response
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="sesion_{sesion_id}.pdf"'
        }
    )


# ============ Jugadores Invitados ============


class InvitadoFromOrgRequest(BaseModel):
    jugador_id: UUID


@router.post("/{sesion_id}/invitados/from-org", response_model=AsistenciaResponse)
async def add_invitado_from_org(
    sesion_id: UUID,
    request: InvitadoFromOrgRequest,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Anade un jugador de otro equipo de la misma organizacion a la sesion."""
    supabase = get_supabase()

    # Get session to know the equipo_id
    sesion = supabase.table("sesiones").select("id, equipo_id").eq(
        "id", str(sesion_id)
    ).single().execute()

    if not sesion.data:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    # Verify jugador belongs to same organization
    jugador = supabase.table("jugadores").select(
        "id, nombre, apellidos, dorsal, posicion_principal, equipos(organizacion_id)"
    ).eq("id", str(request.jugador_id)).single().execute()

    if not jugador.data:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")

    jugador_org_id = jugador.data.get("equipos", {}).get("organizacion_id") if jugador.data.get("equipos") else None

    if jugador_org_id != auth.organizacion_id:
        raise HTTPException(status_code=403, detail="El jugador no pertenece a tu organizacion")

    # Check not already in asistencias
    existing = supabase.table("asistencias_sesion").select("id").match({
        "sesion_id": str(sesion_id),
        "jugador_id": str(request.jugador_id),
    }).execute()

    if existing.data:
        raise HTTPException(status_code=400, detail="Este jugador ya esta en la sesion")

    # Create asistencia
    data = {
        "sesion_id": str(sesion_id),
        "jugador_id": str(request.jugador_id),
        "presente": True,
    }
    response = supabase.table("asistencias_sesion").insert(data).execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Error al anadir jugador")

    result = response.data[0]
    result["jugador"] = {
        "id": jugador.data["id"],
        "nombre": jugador.data.get("nombre"),
        "apellidos": jugador.data.get("apellidos"),
        "dorsal": jugador.data.get("dorsal"),
        "posicion_principal": jugador.data.get("posicion_principal"),
    }

    log_create(auth.user_id, "invitado_sesion", result["id"], {
        "sesion_id": str(sesion_id),
        "jugador_id": str(request.jugador_id),
        "tipo": "from_org",
    })

    return AsistenciaResponse(**result)


@router.post("/{sesion_id}/invitados/quick-add")
async def quick_add_invitado(
    sesion_id: UUID,
    data: JugadorInvitadoCreate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Crea un jugador temporal invitado y lo anade a la sesion."""
    supabase = get_supabase()

    # Get session
    sesion = supabase.table("sesiones").select("id, equipo_id").eq(
        "id", str(sesion_id)
    ).single().execute()

    if not sesion.data:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    equipo_id = sesion.data["equipo_id"]

    # Create the guest jugador
    jugador_data = {
        "nombre": data.nombre,
        "apellidos": data.apellidos,
        "posicion_principal": data.posicion_principal.value,
        "nivel_tecnico": data.nivel_tecnico,
        "nivel_tactico": data.nivel_tactico,
        "nivel_fisico": data.nivel_fisico,
        "nivel_mental": data.nivel_mental,
        "notas": data.notas,
        "equipo_id": equipo_id,
        "es_invitado": True,
        "es_convocable": True,
        "estado": "activo",
        "pierna_dominante": "derecha",
        "posiciones_secundarias": [],
    }

    jug_response = supabase.table("jugadores").insert(jugador_data).execute()

    if not jug_response.data:
        raise HTTPException(status_code=400, detail="Error al crear jugador invitado")

    jugador = jug_response.data[0]

    # Create asistencia
    asist_data = {
        "sesion_id": str(sesion_id),
        "jugador_id": jugador["id"],
        "presente": True,
    }
    asist_response = supabase.table("asistencias_sesion").insert(asist_data).execute()

    if not asist_response.data:
        raise HTTPException(status_code=400, detail="Error al registrar asistencia")

    asistencia = asist_response.data[0]
    asistencia["jugador"] = {
        "id": jugador["id"],
        "nombre": jugador.get("nombre"),
        "apellidos": jugador.get("apellidos"),
        "dorsal": jugador.get("dorsal"),
        "posicion_principal": jugador.get("posicion_principal"),
    }

    log_create(auth.user_id, "invitado_sesion", asistencia["id"], {
        "sesion_id": str(sesion_id),
        "jugador_id": jugador["id"],
        "tipo": "quick_add",
    })

    return {
        "jugador": jugador,
        "asistencia": asistencia,
    }


# ============ AI Session Design Chat ============


class SessionDesignMessage(BaseModel):
    rol: str  # "user" or "assistant"
    contenido: str


class SessionDesignRequest(BaseModel):
    mensajes: List[SessionDesignMessage]
    equipo_id: Optional[UUID] = None


class SessionDesignResponse(BaseModel):
    respuesta: str
    sesion_propuesta: Optional[dict] = None
    herramientas_usadas: list = []


@router.post("/design-chat", response_model=SessionDesignResponse)
async def design_session_chat(
    request: SessionDesignRequest,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_CREATE)),
):
    """
    Chat conversacional con IA para diseñar sesiones paso a paso.
    Envía mensajes y recibe respuesta del asistente + propuesta de sesión cuando esté lista.
    """
    settings = get_settings()

    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Servicio de IA no disponible. Configure ANTHROPIC_API_KEY."
        )

    # Resolve equipo_id
    equipo_id = str(request.equipo_id) if request.equipo_id else auth.equipo_id
    if not equipo_id:
        raise HTTPException(status_code=400, detail="Se requiere equipo_id")

    try:
        from app.services.claude_service import ClaudeService, ClaudeError

        claude = ClaudeService()
        result = await claude.session_design_chat(
            mensajes=[{"rol": m.rol, "contenido": m.contenido} for m in request.mensajes],
            equipo_id=equipo_id,
            organizacion_id=auth.organizacion_id,
        )

        return SessionDesignResponse(
            respuesta=result["respuesta"],
            sesion_propuesta=result.get("sesion_propuesta"),
            herramientas_usadas=result.get("herramientas_usadas", []),
        )

    except ClaudeError as e:
        logger.error(f"ClaudeError in session design chat: {e}")
        error_msg = str(e)
        if "conexion" in error_msg.lower():
            raise HTTPException(status_code=503, detail=error_msg)
        elif "saturado" in error_msg.lower():
            raise HTTPException(status_code=429, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        logger.error(f"Unexpected error in session design chat: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al comunicarse con la IA. Inténtalo de nuevo."
        )
