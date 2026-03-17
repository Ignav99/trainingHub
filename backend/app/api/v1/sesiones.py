"""
TrainingHub Pro - Router de Sesiones
CRUD para sesiones de entrenamiento.
"""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Any, Optional, List, Union
from uuid import UUID
from datetime import date
from math import ceil
import io

logger = logging.getLogger(__name__)

# Valid fase_juego values (DB check constraint)
VALID_FASE_JUEGO = {
    "ataque_organizado", "defensa_organizada",
    "transicion_ataque_defensa", "transicion_defensa_ataque",
    "balon_parado_ofensivo", "balon_parado_defensivo",
}

# Mapping from AI short/variant codes → valid DB values for fase_juego
FASE_JUEGO_MAP = {
    "ATQ": "ataque_organizado",
    "DEF": "defensa_organizada",
    "TAD": "transicion_ataque_defensa",
    "TDA": "transicion_defensa_ataque",
    "BPO": "balon_parado_ofensivo",
    "BPD": "balon_parado_defensivo",
    "ataque_organizado": "ataque_organizado",
    "defensa_organizada": "defensa_organizada",
    "transicion_ataque_defensa": "transicion_ataque_defensa",
    "transicion_defensa_ataque": "transicion_defensa_ataque",
    "balon_parado_ofensivo": "balon_parado_ofensivo",
    "balon_parado_defensivo": "balon_parado_defensivo",
    "ataque organizado": "ataque_organizado",
    "defensa organizada": "defensa_organizada",
    "transicion ataque defensa": "transicion_ataque_defensa",
    "transicion defensa ataque": "transicion_defensa_ataque",
    "balon parado ofensivo": "balon_parado_ofensivo",
    "balon parado defensivo": "balon_parado_defensivo",
}

# Mapping from AI density variants → valid DB values (alta, media, baja)
DENSIDAD_MAP = {
    "muy alta": "alta",
    "alta": "alta",
    "media": "media",
    "baja": "baja",
    "muy baja": "baja",
}


def _sanitize_tarea_constraints(tarea_data: dict) -> dict:
    """Sanitize constraint-sensitive fields before DB insert.
    Removes or maps invalid fase_juego, densidad, and nivel_cognitivo values.
    Truncates varchar fields to avoid DB constraint violations.
    """
    # Truncate varchar fields to their DB limits
    VARCHAR_LIMITS = {
        "titulo": 100,
        "estructura_equipos": 100,
        "posicion_entrenador": 255,
        "principio_tactico": 255,
        "subprincipio_tactico": 255,
    }
    for field, limit in VARCHAR_LIMITS.items():
        if field in tarea_data and isinstance(tarea_data[field], str) and len(tarea_data[field]) > limit:
            tarea_data[field] = tarea_data[field][:limit]

    # fase_juego
    if "fase_juego" in tarea_data and tarea_data["fase_juego"] is not None:
        raw = str(tarea_data["fase_juego"]).strip().lower()
        mapped = FASE_JUEGO_MAP.get(raw)
        if mapped:
            tarea_data["fase_juego"] = mapped
        else:
            # Try partial match as last resort
            del tarea_data["fase_juego"]

    # densidad
    if "densidad" in tarea_data and tarea_data["densidad"] is not None:
        raw = str(tarea_data["densidad"]).strip().lower()
        mapped = DENSIDAD_MAP.get(raw)
        if mapped:
            tarea_data["densidad"] = mapped
        else:
            del tarea_data["densidad"]

    # nivel_cognitivo: must be 1-3
    if "nivel_cognitivo" in tarea_data and tarea_data["nivel_cognitivo"] is not None:
        try:
            val = int(tarea_data["nivel_cognitivo"])
            tarea_data["nivel_cognitivo"] = max(1, min(3, val))
        except (ValueError, TypeError):
            del tarea_data["nivel_cognitivo"]

    # JSONB array fields: ensure they are lists, not strings
    list_fields = [
        "reglas_tecnicas", "reglas_tacticas", "reglas_psicologicas",
        "consignas_ofensivas", "consignas_defensivas", "errores_comunes",
        "tags", "variantes", "progresiones", "regresiones", "material",
    ]
    for field in list_fields:
        val = tarea_data.get(field)
        if val is None or isinstance(val, list):
            continue
        if isinstance(val, str):
            stripped = val.strip()
            if not stripped:
                tarea_data[field] = []
            elif "\n" in stripped:
                tarea_data[field] = [line.strip() for line in stripped.split("\n") if line.strip()]
            else:
                tarea_data[field] = [stripped]
        else:
            tarea_data[field] = []

    return tarea_data


# Valid columns in the 'tareas' table — used to filter AI/user input before DB insert
VALID_TAREA_COLUMNS = {
    "titulo", "descripcion", "duracion_total", "num_jugadores_min", "num_jugadores_max",
    "espacio_largo", "espacio_ancho", "reglas_tecnicas", "reglas_tacticas",
    "consignas_ofensivas", "consignas_defensivas", "errores_comunes",
    "variantes", "progresiones", "estructura_equipos", "material",
    "fase_juego", "principio_tactico", "subprincipio_tactico", "densidad",
    "nivel_cognitivo", "num_series", "num_porteros", "espacio_forma",
    "tipo_esfuerzo", "ratio_trabajo_descanso", "tags", "grafico_data",
    "categoria_id", "equipo_id", "organizacion_id",
}

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

    # Filter by team: skip org-wide equipos query when equipo_id is provided
    if equipo_id:
        query = query.eq("equipo_id", str(equipo_id))
    else:
        equipos = supabase.table("equipos").select("id").eq(
            "organizacion_id", auth.organizacion_id
        ).execute()
        equipo_ids = [e["id"] for e in equipos.data]
        if equipo_ids:
            query = query.in_("equipo_id", equipo_ids)

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
        "responsable": tarea_data.responsable,
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
            "responsable": tarea.responsable,
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
        "*, jugadores(id, nombre, apellidos, apodo, dorsal, posicion_principal, foto_url, es_portero, es_invitado, estado, equipo_id)"
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

    # Get present players from asistencia (with tipo_participacion)
    asistencias = supabase.table("asistencias_sesion").select(
        "jugador_id, tipo_participacion, jugadores(*)"
    ).eq("sesion_id", str(sesion_id)).eq("presente", True).execute()

    if not asistencias.data:
        raise HTTPException(
            status_code=400,
            detail="No hay jugadores presentes. Guarda la asistencia primero."
        )

    # Only include players who participated in 'sesion' (or legacy empty tipo)
    jugadores_presentes = []
    for a in asistencias.data:
        jugador = a.get("jugadores")
        if not jugador:
            continue
        tipos = a.get("tipo_participacion") or []
        if not tipos or "sesion" in tipos:
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
    model_config = {"extra": "ignore"}
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    duracion_total: Optional[int] = None
    num_jugadores_min: Optional[int] = None
    num_jugadores_max: Optional[int] = None
    espacio_largo: Optional[Union[int, float]] = None
    espacio_ancho: Optional[Union[int, float]] = None
    reglas_tecnicas: Optional[Any] = None  # JSONB — accepts str or list
    reglas_tacticas: Optional[Any] = None
    consignas_ofensivas: Optional[Any] = None
    consignas_defensivas: Optional[Any] = None
    errores_comunes: Optional[Any] = None
    variantes: Optional[Any] = None
    progresiones: Optional[Any] = None
    estructura_equipos: Optional[str] = None
    material: Optional[list] = None
    num_series: Optional[int] = None
    densidad: Optional[str] = None
    nivel_cognitivo: Optional[int] = None
    fase_juego: Optional[str] = None
    principio_tactico: Optional[str] = None
    subprincipio_tactico: Optional[str] = None


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

    old_tarea_id = st_response.data.get("tarea_id")
    original_tarea = st_response.data.get("tareas", {})
    if not original_tarea:
        raise HTTPException(status_code=404, detail="Tarea original no encontrada")

    # 2. Build the duplicated tarea data
    campos_copiables = [
        "descripcion", "duracion_total", "num_jugadores_min", "num_jugadores_max",
        "espacio_largo", "espacio_ancho", "reglas_tecnicas", "reglas_tacticas",
        "consignas_ofensivas", "consignas_defensivas", "errores_comunes",
        "variantes", "progresiones", "estructura_equipos", "material",
        "fase_juego", "principio_tactico", "subprincipio_tactico", "densidad",
        "nivel_cognitivo", "num_series", "grafico_data",
        "categoria_id", "equipo_id", "organizacion_id",
    ]

    nueva_tarea = {}
    for campo in campos_copiables:
        if campo in original_tarea and original_tarea[campo] is not None:
            nueva_tarea[campo] = original_tarea[campo]

    # Strip accumulated "(Editada) " prefixes from title
    titulo_base = original_tarea.get("titulo", "Sin titulo")
    while titulo_base.startswith("(Editada) "):
        titulo_base = titulo_base[len("(Editada) "):]
    nueva_tarea["titulo"] = titulo_base
    nueva_tarea["es_plantilla"] = False
    nueva_tarea["creado_por"] = str(auth.user_id)

    # 3. Apply changes from request (filter to valid DB columns only)
    cambios_dict = cambios.model_dump(exclude_none=True)
    nueva_tarea.update(cambios_dict)
    nueva_tarea = {k: v for k, v in nueva_tarea.items() if k in VALID_TAREA_COLUMNS | {"titulo", "es_plantilla", "creado_por"}}
    _sanitize_tarea_constraints(nueva_tarea)

    # 4. Insert the new tarea
    try:
        insert_response = supabase.table("tareas").insert(nueva_tarea).execute()
    except Exception as e:
        logger.error(f"Error inserting duplicated tarea: {e}")
        raise HTTPException(status_code=400, detail=f"Error al duplicar tarea: {str(e)}")
    if not insert_response.data:
        raise HTTPException(status_code=500, detail="Error al duplicar tarea")

    new_tarea_id = insert_response.data[0]["id"]

    # 5. Update sesion_tareas to point to the new tarea
    supabase.table("sesion_tareas").update(
        {"tarea_id": new_tarea_id}
    ).eq("id", str(sesion_tarea_id)).execute()

    # 6. Delete orphan tarea if it's non-template and unreferenced
    if old_tarea_id:
        try:
            old = supabase.table("tareas").select("es_plantilla").eq("id", old_tarea_id).single().execute()
            if old.data and not old.data.get("es_plantilla", True):
                refs = supabase.table("sesion_tareas").select("id").eq("tarea_id", old_tarea_id).execute()
                if not refs.data:
                    supabase.table("tareas").delete().eq("id", old_tarea_id).execute()
        except Exception:
            pass

    # 7. Return the updated sesion_tarea with new tarea data
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

    old_tarea_id = st_response.data.get("tarea_id")
    tarea_actual = st_response.data.get("tareas", {})
    if not tarea_actual:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    # 2. Call Claude to get modifications
    try:
        from app.services.ai_factory import get_ai_service
        from app.services.ai_errors import AIError
        service = get_ai_service()
        cambios_ia = await service.edit_task_with_ai(
            tarea=tarea_actual,
            instruccion=request.instruccion,
        )
    except AIError as e:
        logger.error(f"AI edit AIError: {e}")
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
        "fase_juego", "principio_tactico", "subprincipio_tactico", "densidad",
        "nivel_cognitivo", "num_series", "grafico_data",
        "categoria_id", "equipo_id", "organizacion_id",
    ]

    nueva_tarea = {}
    for campo in campos_copiables:
        if campo in tarea_actual and tarea_actual[campo] is not None:
            nueva_tarea[campo] = tarea_actual[campo]

    # Strip accumulated "(Editada) " prefixes from title
    titulo_base = tarea_actual.get("titulo", "Sin titulo")
    while titulo_base.startswith("(Editada) "):
        titulo_base = titulo_base[len("(Editada) "):]
    nueva_tarea["titulo"] = titulo_base
    nueva_tarea["es_plantilla"] = False
    nueva_tarea["creado_por"] = str(auth.user_id)

    # Apply AI changes (only valid DB columns)
    for k, v in cambios_ia.items():
        if k in VALID_TAREA_COLUMNS | {"titulo"}:
            nueva_tarea[k] = v

    # 4. Insert duplicated tarea (ensure only valid columns + sanitize constraints)
    nueva_tarea = {k: v for k, v in nueva_tarea.items() if k in VALID_TAREA_COLUMNS | {"titulo", "es_plantilla", "creado_por"}}
    _sanitize_tarea_constraints(nueva_tarea)
    try:
        insert_response = supabase.table("tareas").insert(nueva_tarea).execute()
    except Exception as e:
        logger.error(f"Error inserting AI-edited tarea: {e}")
        raise HTTPException(status_code=400, detail=f"Error al crear tarea editada: {str(e)}")
    if not insert_response.data:
        raise HTTPException(status_code=500, detail="Error al crear tarea editada")

    new_tarea_id = insert_response.data[0]["id"]

    # 5. Update sesion_tareas
    supabase.table("sesion_tareas").update(
        {"tarea_id": new_tarea_id}
    ).eq("id", str(sesion_tarea_id)).execute()

    # 6. Delete orphan tarea if it's non-template and unreferenced
    if old_tarea_id:
        try:
            old = supabase.table("tareas").select("es_plantilla").eq("id", old_tarea_id).single().execute()
            if old.data and not old.data.get("es_plantilla", True):
                refs = supabase.table("sesion_tareas").select("id").eq("tarea_id", old_tarea_id).execute()
                if not refs.data:
                    supabase.table("tareas").delete().eq("id", old_tarea_id).execute()
        except Exception:
            pass

    # 7. Return updated data
    updated = supabase.table("sesion_tareas").select(
        "*, tareas(*)"
    ).eq("id", str(sesion_tarea_id)).single().execute()

    return updated.data


class CrearTareaEnSesionRequest(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=255)
    descripcion: Optional[str] = None
    duracion_total: int = Field(default=10, ge=1)
    fase_sesion: str = Field(default="desarrollo_1")
    num_jugadores_min: Optional[int] = None
    num_jugadores_max: Optional[int] = None
    estructura_equipos: Optional[str] = None
    espacio_largo: Optional[Union[int, float]] = None
    espacio_ancho: Optional[Union[int, float]] = None
    fase_juego: Optional[str] = None
    principio_tactico: Optional[str] = None
    densidad: Optional[str] = None
    nivel_cognitivo: Optional[int] = None
    num_series: Optional[int] = None
    material: Optional[list] = None
    errores_comunes: Optional[Any] = None
    progresiones: Optional[Any] = None
    reglas_tecnicas: Optional[Any] = None
    reglas_tacticas: Optional[Any] = None
    consignas_ofensivas: Optional[Any] = None
    consignas_defensivas: Optional[Any] = None
    variantes: Optional[Any] = None


class AICrearTareaRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=2000)
    fase_sesion: str = Field(default="desarrollo_1")


@router.post("/{sesion_id}/tareas/crear")
async def crear_tarea_en_sesion(
    sesion_id: UUID,
    request: CrearTareaEnSesionRequest,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Crea una tarea nueva desde cero y la anade a la sesion."""
    supabase = get_supabase()

    # Verify sesion exists
    sesion = supabase.table("sesiones").select("id, equipo_id").eq(
        "id", str(sesion_id)
    ).single().execute()
    if not sesion.data:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    # Build tarea data (filter to valid DB columns only)
    tarea_data = request.model_dump(exclude_none=True, exclude={"fase_sesion"})
    tarea_data = {k: v for k, v in tarea_data.items() if k in VALID_TAREA_COLUMNS}
    _sanitize_tarea_constraints(tarea_data)
    tarea_data["es_plantilla"] = False
    tarea_data["creado_por"] = str(auth.user_id)
    tarea_data["equipo_id"] = sesion.data.get("equipo_id")
    tarea_data["organizacion_id"] = str(auth.organizacion_id)

    # Insert tarea
    try:
        insert_resp = supabase.table("tareas").insert(tarea_data).execute()
    except Exception as e:
        logger.error(f"Error inserting tarea in session: {e}")
        raise HTTPException(status_code=400, detail=f"Error al crear tarea: {str(e)}")
    if not insert_resp.data:
        raise HTTPException(status_code=500, detail="Error al crear tarea")

    new_tarea_id = insert_resp.data[0]["id"]

    # Get current max orden across entire session (unique constraint is session-wide)
    existing = supabase.table("sesion_tareas").select("orden").eq(
        "sesion_id", str(sesion_id)
    ).execute()
    max_orden = max((t.get("orden", 0) for t in (existing.data or [])), default=0)

    # Add to sesion_tareas
    supabase.table("sesion_tareas").insert({
        "sesion_id": str(sesion_id),
        "tarea_id": new_tarea_id,
        "orden": max_orden + 1,
        "fase_sesion": request.fase_sesion,
    }).execute()

    # Return full updated session
    return await get_sesion(sesion_id, auth)


@router.post("/{sesion_id}/tareas/ai-crear")
async def ai_crear_tarea_en_sesion(
    sesion_id: UUID,
    request: AICrearTareaRequest,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Genera una tarea con IA a partir de un prompt y la anade a la sesion."""
    supabase = get_supabase()

    # Verify sesion exists and get context
    sesion = supabase.table("sesiones").select(
        "id, equipo_id, match_day, objetivo_principal, fase_juego_principal"
    ).eq("id", str(sesion_id)).single().execute()
    if not sesion.data:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    # Call Claude to generate the task
    try:
        from app.services.ai_factory import get_ai_service
        from app.services.ai_errors import AIError
        service = get_ai_service()
        tarea_data = await service.create_task_from_prompt(
            prompt=request.prompt,
            session_context={
                "match_day": sesion.data.get("match_day"),
                "objetivo": sesion.data.get("objetivo_principal"),
                "fase_juego": sesion.data.get("fase_juego_principal"),
            },
        )
    except AIError as e:
        logger.error(f"AI create task AIError: {e}")
        error_msg = str(e)
        if "conexion" in error_msg.lower():
            raise HTTPException(status_code=503, detail=error_msg)
        elif "saturado" in error_msg.lower():
            raise HTTPException(status_code=429, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        logger.error(f"AI create task unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error inesperado al generar tarea con IA.")

    if not tarea_data:
        raise HTTPException(status_code=400, detail="La IA no genero una tarea valida")

    # Filter to only valid DB columns (AI may return fields that don't exist in DB)
    tarea_data = {k: v for k, v in tarea_data.items() if k in VALID_TAREA_COLUMNS}
    _sanitize_tarea_constraints(tarea_data)

    # Insert tarea
    tarea_data["es_plantilla"] = False
    tarea_data["creado_por"] = str(auth.user_id)
    tarea_data["equipo_id"] = sesion.data.get("equipo_id")
    tarea_data["organizacion_id"] = str(auth.organizacion_id)

    try:
        insert_resp = supabase.table("tareas").insert(tarea_data).execute()
    except Exception as e:
        logger.error(f"Error inserting AI tarea in session: {e}")
        raise HTTPException(status_code=400, detail=f"Error al crear tarea: {str(e)}")
    if not insert_resp.data:
        raise HTTPException(status_code=500, detail="Error al crear tarea generada por IA")

    new_tarea_id = insert_resp.data[0]["id"]

    # Get current max orden across entire session (unique constraint is session-wide)
    existing = supabase.table("sesion_tareas").select("orden").eq(
        "sesion_id", str(sesion_id)
    ).execute()
    max_orden = max((t.get("orden", 0) for t in (existing.data or [])), default=0)

    # Add to sesion_tareas
    supabase.table("sesion_tareas").insert({
        "sesion_id": str(sesion_id),
        "tarea_id": new_tarea_id,
        "orden": max_orden + 1,
        "fase_sesion": request.fase_sesion,
    }).execute()

    # Return full updated session
    return await get_sesion(sesion_id, auth)


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

    # Get present players from asistencia (with tipo_participacion)
    asistencias = supabase.table("asistencias_sesion").select(
        "jugador_id, tipo_participacion, jugadores(*)"
    ).eq("sesion_id", str(sesion_id)).eq("presente", True).execute()

    if not asistencias.data:
        raise HTTPException(
            status_code=400,
            detail="No hay jugadores presentes. Guarda la asistencia primero."
        )

    # Only include players who participated in 'sesion' (or legacy empty tipo)
    jugadores_presentes = []
    for a in asistencias.data:
        jugador = a.get("jugadores")
        if not jugador:
            continue
        tipos = a.get("tipo_participacion") or []
        if not tipos or "sesion" in tipos:
            jugadores_presentes.append(jugador)

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
    preview: bool = Query(False, description="If true, return inline for browser preview"),
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Genera el PDF de la sesión, lo sube a Storage y lo devuelve."""
    supabase = get_supabase()
    sid = str(sesion_id)

    # Parallel fetch: sesion + tareas + asistencia + portero_tareas
    sesion_response, tareas_response, roster_response, portero_response = await asyncio.gather(
        asyncio.to_thread(
            lambda: supabase.table("sesiones").select(
                "*, equipos(*, organizaciones(*))"
            ).eq("id", sid).single().execute()
        ),
        asyncio.to_thread(
            lambda: supabase.table("sesion_tareas").select(
                "*, tareas(*, categorias_tarea(*))"
            ).eq("sesion_id", sid).order("orden").execute()
        ),
        asyncio.to_thread(
            lambda: supabase.table("asistencias_sesion").select(
                "presente, tipo_participacion, motivo_ausencia, jugadores(nombre, apellidos, dorsal)"
            ).eq("sesion_id", sid).execute()
        ),
        asyncio.to_thread(
            lambda: supabase.table("portero_tareas").select("*").eq(
                "sesion_id", sid
            ).order("orden").execute()
        ),
    )

    if not sesion_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )

    sesion = sesion_response.data
    equipo = sesion.get("equipos", {})
    organizacion = equipo.get("organizaciones", {})

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

    # Fetch microciclo name + partido_id if linked
    microciclo_nombre = None
    partido_id = None
    if sesion.get("microciclo_id"):
        try:
            mc_resp = supabase.table("microciclos").select(
                "objetivo_principal, fecha_inicio, fecha_fin, partido_id"
            ).eq("id", sesion["microciclo_id"]).single().execute()
            if mc_resp.data:
                mc = mc_resp.data
                microciclo_nombre = mc.get("objetivo_principal") or f"Microciclo {mc.get('fecha_inicio', '')}"
                partido_id = mc.get("partido_id")
        except Exception:
            pass

    # Fetch ABP jugadas if session is linked to a partido
    abp_jugadas = []
    if partido_id:
        try:
            abp_resp = supabase.table("abp_partido_jugadas").select(
                "*, abp_jugadas(*)"
            ).eq("partido_id", str(partido_id)).order("orden").execute()
            for row in (abp_resp.data or []):
                jugada = row.pop("abp_jugadas", None)
                if jugada:
                    row["jugada"] = jugada
                    abp_jugadas.append(row)
        except Exception:
            pass  # Non-critical

    # Extract lugar from equipo config or organizacion
    lugar = None
    if equipo.get("config") and isinstance(equipo["config"], dict):
        lugar = equipo["config"].get("lugar_entrenamiento")
    if not lugar and organizacion.get("config") and isinstance(organizacion["config"], dict):
        lugar = organizacion["config"].get("lugar_entrenamiento")
    if not lugar:
        lugar = sesion.get("lugar")

    # Build asistencia roster from pre-fetched roster_response
    asistencia_roster = []
    TIPO_ORDER = {"sesion": 0, "fisio": 1, "margen": 2, "presente": 3, "ausente": 4}
    TIPO_DISPLAY = {"sesion": "Sesion", "fisio": "Fisio", "margen": "Margen", "presente": "Presente"}
    try:
        for a in roster_response.data or []:
            jugador = a.get("jugadores", {}) or {}
            dorsal = jugador.get("dorsal")
            nombre = jugador.get("nombre", "")
            apellidos = jugador.get("apellidos", "")

            if a.get("presente"):
                tipos = a.get("tipo_participacion") or []
                if not tipos:
                    tipos = ["sesion"]  # Legacy records
                tipo_display = " + ".join(TIPO_DISPLAY.get(t, t.title()) for t in tipos)
                # Sort key: use highest-priority type present
                tipo_key = min((TIPO_ORDER.get(t, 99) for t in tipos), default=0)
                asistencia_roster.append({
                    "dorsal": dorsal,
                    "nombre": nombre,
                    "apellidos": apellidos,
                    "tipos": tipos,  # Individual types for per-word coloring
                    "tipo_display": tipo_display,
                    "tipo_key": tipo_key,
                    "sort_key": "sesion" if tipo_key == 0 else ("fisio" if tipo_key == 1 else "margen"),
                })
            else:
                motivo = a.get("motivo_ausencia", "otro") or "otro"
                asistencia_roster.append({
                    "dorsal": dorsal,
                    "nombre": nombre,
                    "apellidos": apellidos,
                    "tipos": [],  # Absent players have no participation types
                    "tipo_display": f"Ausente — {motivo.replace('_', ' ').title()}",
                    "tipo_key": TIPO_ORDER["ausente"],
                    "sort_key": "ausente",
                })

        # Sort: sesion → fisio → margen → ausente, then by dorsal within group
        asistencia_roster.sort(key=lambda x: (x["tipo_key"], x.get("dorsal") or 999))
    except Exception:
        pass  # Non-critical — PDF still generates without roster

    # AI diagram generation for tasks missing grafico_data
    tasks_needing_diagrams = []
    for ts in tareas:
        tarea = ts.get("tareas", {}) or {}
        if not tarea.get("grafico_data"):
            tasks_needing_diagrams.append((ts, tarea))

    if tasks_needing_diagrams:
        from app.services.ai_factory import generate_diagram

        async def _gen_diagram(ts_pair):
            ts, tarea = ts_pair
            categoria = tarea.get("categorias_tarea", {}) or {}
            return await generate_diagram(
                titulo=tarea.get("titulo", ""),
                descripcion=tarea.get("descripcion", ""),
                categoria_codigo=categoria.get("codigo", ""),
                estructura_equipos=tarea.get("estructura_equipos", ""),
                espacio_largo=tarea.get("espacio_largo"),
                espacio_ancho=tarea.get("espacio_ancho"),
                num_jugadores_min=tarea.get("num_jugadores_min", 0),
                fase_juego=tarea.get("fase_juego", ""),
            )

        results = await asyncio.gather(
            *[_gen_diagram(pair) for pair in tasks_needing_diagrams],
            return_exceptions=True,
        )

        for (ts, tarea), result in zip(tasks_needing_diagrams, results):
            if isinstance(result, Exception) or result is None:
                if isinstance(result, Exception):
                    logger.warning("Diagram generation failed for task %s: %s", tarea.get("id"), result)
                continue
            # Inject into in-memory task data for PDF
            tarea["grafico_data"] = result
            # Cache in DB for future requests
            tarea_id = tarea.get("id")
            if tarea_id:
                try:
                    supabase.table("tareas").update(
                        {"grafico_data": result}
                    ).eq("id", str(tarea_id)).execute()
                except Exception as db_err:
                    logger.warning("Failed to cache diagram for task %s: %s", tarea_id, db_err)

    # AI diagram generation for portero tasks missing diagrams
    portero_tareas_data = portero_response.data or []
    portero_needing_diagrams = [
        pt for pt in portero_tareas_data
        if not pt.get("diagram") or not (pt["diagram"] or {}).get("elements")
    ]
    if portero_needing_diagrams:
        from app.services.ai_factory import generate_diagram as gen_diag

        async def _gen_portero_diagram(pt):
            return await gen_diag(
                titulo=pt.get("nombre", ""),
                descripcion=pt.get("descripcion", ""),
                categoria_codigo="POR",
                num_jugadores_min=2,
            )

        pt_results = await asyncio.gather(
            *[_gen_portero_diagram(pt) for pt in portero_needing_diagrams],
            return_exceptions=True,
        )
        for pt, result in zip(portero_needing_diagrams, pt_results):
            if isinstance(result, Exception) or result is None:
                continue
            pt["diagram"] = result
            pt_id = pt.get("id")
            if pt_id:
                try:
                    supabase.table("portero_tareas").update(
                        {"diagram": result}
                    ).eq("id", str(pt_id)).execute()
                except Exception:
                    pass

    # Generar PDF con el servicio v2
    try:
        pdf_bytes = await asyncio.to_thread(
            generate_sesion_pdf_v2,
            sesion, tareas, organizacion, jugadores_map,
            microciclo_nombre=microciclo_nombre,
            lugar=lugar,
            asistencia_roster=asistencia_roster,
            portero_tareas=portero_tareas_data,
            abp_jugadas=abp_jugadas,
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
    disposition = "inline" if preview else f'attachment; filename="sesion_{sesion_id}.pdf"'
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": disposition}
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
    # Resolve equipo_id
    equipo_id = str(request.equipo_id) if request.equipo_id else auth.equipo_id
    if not equipo_id:
        raise HTTPException(status_code=400, detail="Se requiere equipo_id")

    try:
        from app.services.ai_factory import get_ai_service
        from app.services.ai_errors import AIError

        service = get_ai_service()
        result = await service.session_design_chat(
            mensajes=[{"rol": m.rol, "contenido": m.contenido} for m in request.mensajes],
            equipo_id=equipo_id,
            organizacion_id=auth.organizacion_id,
        )

        return SessionDesignResponse(
            respuesta=result["respuesta"],
            sesion_propuesta=result.get("sesion_propuesta"),
            herramientas_usadas=result.get("herramientas_usadas", []),
        )

    except AIError as e:
        logger.error(f"AIError in session design chat: {e}")
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
