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

from app.services.keywords import synthesize_keywords
from app.services.sesion_carga import aggregate_sesion_carga, carga_from_sesion_tarea
from app.services.tarea_narrative import hydrate_tarea_narrative, sync_reglas_variantes
from app.services.tarea_write import retry_tarea_write
from app.services.sesion_taxonomy import (
    prepare_sesion_write_payload,
    normalize_sesion_row,
    new_share_token,
    retry_sesion_write,
)

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
        "objetivos_tacticos", "objetivos_tecnicos",
        "orientaciones_fisicas", "etiquetas_fisicas",
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

    # Densidad + cognitivo: siempre la misma fórmula canónica
    try:
        from app.services.task_load_metrics import apply_auto_load
        loaded = apply_auto_load(tarea_data)
        tarea_data.clear()
        tarea_data.update(loaded)
    except Exception:
        pass

    return tarea_data


# Valid columns in the 'tareas' table — used to filter AI/user input before DB insert
VALID_TAREA_COLUMNS = {
    "titulo", "descripcion", "desarrollo", "reglas", "anotaciones",
    "duracion_total", "num_jugadores_min", "num_jugadores_max",
    "espacio_largo", "espacio_ancho", "reglas_tecnicas", "reglas_tacticas",
    "consignas_ofensivas", "consignas_defensivas", "errores_comunes",
    "variantes", "progresiones", "estructura_equipos", "material",
    "fase_juego", "principio_tactico", "subprincipio_tactico", "densidad",
    "nivel_cognitivo", "num_series", "num_porteros", "espacio_forma",
    "tipo_esfuerzo", "ratio_trabajo_descanso", "tags", "grafico_data",
    "categoria_id", "equipo_id", "organizacion_id",
    "complejidad", "forma_puntuar", "dificultad", "exigencia",
    "duracion_serie", "tiempo_descanso", "m2_por_jugador",
    "fc_esperada_min", "fc_esperada_max", "grafico_svg",
    "modalidad", "objetivos_tacticos", "objetivos_tecnicos",
    "orientaciones_fisicas", "etiquetas_fisicas",
    "tarea_origen_id", "tipo_variante", "es_publica", "es_plantilla",
}


def _sync_tarea_narrative(tarea_data: dict) -> dict:
    """Alinea desarrollo/descripcion y reglas/variantes antes de escribir."""
    if tarea_data.get("desarrollo") and not tarea_data.get("descripcion"):
        tarea_data["descripcion"] = tarea_data["desarrollo"]
    elif tarea_data.get("descripcion") and not tarea_data.get("desarrollo"):
        tarea_data["desarrollo"] = tarea_data["descripcion"]
    tarea_data.update(sync_reglas_variantes(tarea_data))
    return tarea_data


def _hydrate_sesion_tarea_row(row: dict) -> dict:
    nested = row.get("tareas")
    if isinstance(nested, dict):
        row["tareas"] = hydrate_tarea_narrative(nested)
    return row


def _insert_tarea_with_schema_fallback(supabase, tarea_data: dict):
    return retry_tarea_write(
        lambda payload: supabase.table("tareas").insert(payload).execute(),
        tarea_data,
        op="insert",
    )


def _update_tarea_with_schema_fallback(supabase, tarea_id: str, cambios: dict):
    return retry_tarea_write(
        lambda payload: supabase.table("tareas").update(payload).eq("id", tarea_id).execute(),
        cambios,
        op="update",
    )


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


def _recalc_sesion_carga(supabase, sesion_id: str) -> dict:
    """Recalcula duración, carga por tarea y agregados de sesión.

    Nunca lanza: un fallo aquí no debe impedir guardar tareas.
    """
    try:
        try:
            tareas = supabase.table("sesion_tareas").select(
                "id, duracion_override, tareas(duracion_total, densidad, num_jugadores_min, num_jugadores_max, categorias_tarea(codigo, nombre_corto))"
            ).eq("sesion_id", sesion_id).execute()
        except Exception:
            # Fallback sin join de categoría (compat / schema parcial)
            tareas = supabase.table("sesion_tareas").select(
                "id, duracion_override, tareas(duracion_total, densidad, num_jugadores_min, num_jugadores_max)"
            ).eq("sesion_id", sesion_id).execute()

        rows = []
        for st in (tareas.data or []):
            tarea = st.get("tareas") or {}
            if not isinstance(tarea, dict):
                tarea = {}
            else:
                tarea = dict(tarea)
            cat = tarea.pop("categorias_tarea", None)
            if cat:
                tarea["categoria"] = cat
                tarea["categorias_tarea"] = cat
            row = {
                "id": st.get("id"),
                "duracion_override": st.get("duracion_override"),
                "tarea": tarea,
                "tareas": tarea,
            }
            carga = carga_from_sesion_tarea(row)
            row["carga_calculada"] = carga
            rows.append(row)
            if st.get("id"):
                try:
                    supabase.table("sesion_tareas").update({
                        "carga_calculada": carga
                    }).eq("id", st["id"]).execute()
                except Exception:
                    pass  # columna puede no existir aún

        estructura = []
        try:
            try:
                ses_row = (
                    supabase.table("sesiones")
                    .select("estructura_fases, fase_notas")
                    .eq("id", sesion_id)
                    .maybe_single()
                    .execute()
                )
            except Exception:
                ses_row = (
                    supabase.table("sesiones")
                    .select("fase_notas")
                    .eq("id", sesion_id)
                    .maybe_single()
                    .execute()
                )
            if ses_row and ses_row.data:
                estructura = normalize_sesion_row(ses_row.data).get("estructura_fases") or []
                if not isinstance(estructura, list):
                    estructura = []
        except Exception:
            estructura = []

        carga_sesion, intensidad, duracion_total = aggregate_sesion_carga(rows, estructura)

        # 1) siempre intentar duración
        try:
            supabase.table("sesiones").update({
                "duracion_total": duracion_total
            }).eq("id", sesion_id).execute()
        except Exception as e:
            logger.warning("No se pudo actualizar duracion_total: %s", e)

        # 2) columnas 063 (opcionales hasta migración)
        try:
            supabase.table("sesiones").update({
                "carga_sesion": carga_sesion,
                "intensidad_calculada": intensidad,
                "intensidad_objetivo": intensidad,
            }).eq("id", sesion_id).execute()
        except Exception:
            try:
                supabase.table("sesiones").update({
                    "intensidad_objetivo": intensidad,
                }).eq("id", sesion_id).execute()
            except Exception:
                pass

        return {
            "duracion_total": duracion_total,
            "carga_sesion": carga_sesion,
            "intensidad_calculada": intensidad,
        }
    except Exception as e:
        logger.warning("recalc carga sesión %s falló (no bloquea): %s", sesion_id, e)
        return {}




@router.get("", response_model=SesionListResponse)
async def list_sesiones(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=1000),
    equipo_id: Optional[UUID] = None,
    match_day: Optional[MatchDay] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    estado: Optional[EstadoSesion] = None,
    busqueda: Optional[str] = None,
    keyword: Optional[str] = None,
    fase_juego: Optional[str] = None,
    abp: Optional[bool] = None,
    material: Optional[str] = None,
    objetivo_fisico: Optional[str] = None,
    objetivo_psicologico: Optional[str] = None,
    rival: Optional[str] = None,
    contexto_periodo: Optional[str] = None,
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
        # Verify the requesting user actually belongs to the requested team
        # (not just that it exists in the same org) before filtering by it.
        membership = supabase.table("usuarios_equipos").select("id").eq(
            "usuario_id", auth.user_id
        ).eq("equipo_id", str(equipo_id)).execute()
        if not membership.data:
            raise HTTPException(status_code=404, detail="Equipo no encontrado")
        query = query.eq("equipo_id", str(equipo_id))
    else:
        # Default to the teams the user actually belongs to -- NOT every team
        # in the organization, which would leak other teams' sessions to any
        # staff member (a coach/delegate/physio only sees their own team(s)).
        membresias = supabase.table("usuarios_equipos").select("equipo_id").eq(
            "usuario_id", auth.user_id
        ).execute()
        equipo_ids = [m["equipo_id"] for m in (membresias.data or [])]
        if equipo_ids:
            query = query.in_("equipo_id", equipo_ids)
        else:
            return SesionListResponse(data=[], total=0, page=page, limit=limit, pages=0)

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

    if keyword:
        query = query.contains("keywords", [keyword])

    if fase_juego:
        query = query.contains("fases_juego", [fase_juego])

    if material:
        query = query.contains("materiales", [material])

    if objetivo_fisico:
        query = query.ilike("objetivo_fisico", f"%{objetivo_fisico}%")

    if objetivo_psicologico:
        query = query.ilike("objetivo_psicologico", f"%{objetivo_psicologico}%")

    if rival:
        query = query.ilike("rival", f"%{rival}%")

    if contexto_periodo:
        query = query.eq("contexto_periodo", contexto_periodo)

    if abp is True:
        query = query.not_.is_("abp_config", "null")

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
        sesiones.append(SesionResponse(**normalize_sesion_row(s)))

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



# Rutas estáticas ANTES de /{sesion_id} para no capturar "share"/"completar-vencidas"

@router.post("/completar-vencidas")
async def completar_sesiones_vencidas(
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """
    Marca como completadas las sesiones planificadas con fecha < hoy
    y aplica recálculo de carga a jugadores presentes.
    Pensado para cron / scheduler.
    """
    from datetime import date as date_cls

    supabase = get_supabase()
    hoy = date_cls.today().isoformat()

    equipos = supabase.table("equipos").select("id").eq(
        "organizacion_id", auth.organizacion_id
    ).execute()
    equipo_ids = [e["id"] for e in (equipos.data or [])]
    if not equipo_ids:
        return {"completadas": 0, "sesiones": []}

    response = supabase.table("sesiones").select(
        "id, equipo_id, fecha, estado"
    ).eq("estado", EstadoSesion.PLANIFICADA.value).lt(
        "fecha", hoy
    ).in_("equipo_id", equipo_ids).execute()

    completadas = []
    for s in (response.data or []):
        sid = s["id"]
        supabase.table("sesiones").update({
            "estado": EstadoSesion.COMPLETADA.value
        }).eq("id", sid).execute()
        try:
            asist = supabase.table("asistencias_sesion").select(
                "jugador_id, presente"
            ).eq("sesion_id", sid).eq("presente", True).execute()
            for a in (asist.data or []):
                try:
                    recalculate_player_load(a["jugador_id"], UUID(s["equipo_id"]))
                except Exception:
                    pass
        except Exception as e:
            logger.warning("Error aplicando cargas al completar %s: %s", sid, e)
        completadas.append(sid)

    return {"completadas": len(completadas), "sesiones": completadas}


@router.get("/share/{token}")
async def get_sesion_by_share_token(token: str):
    """Vista pública de solo lectura por share_token (contexto + tareas + RPE)."""
    supabase = get_supabase()
    response = supabase.table("sesiones").select(
        "id, titulo, fecha, match_day, rival, competicion, hora, lugar, "
        "objetivo_principal, keywords, fases_juego, subfases, abp_config, "
        "contenidos_tecnicos_of, contenidos_tecnicos_def, "
        "objetivo_fisico, objetivo_psicologico, carga_sesion, intensidad_calculada, "
        "duracion_total, estado, materiales, share_token, equipo_id, "
        "equipos(nombre, categoria)"
    ).eq("share_token", token).maybe_single().execute()

    if not response or not response.data:
        raise HTTPException(status_code=404, detail="Enlace no válido")

    sesion = normalize_sesion_row(response.data)
    equipo = sesion.pop("equipos", None) or {}
    sesion["equipo_nombre"] = equipo.get("nombre") if isinstance(equipo, dict) else None

    # Normalizar ABP ofensivo/defensivo (+ legacy)
    abp = sesion.get("abp_config")
    if isinstance(abp, dict):
        ofensivo = [t for t in (abp.get("ofensivo") or []) if isinstance(t, str)]
        defensivo = [t for t in (abp.get("defensivo") or []) if isinstance(t, str)]
        if not ofensivo and not defensivo:
            tipos = [t for t in (abp.get("tipos") or []) if isinstance(t, str)]
            lados = [x for x in (abp.get("lados") or []) if x in ("ofensivo", "defensivo")]
            if not lados and abp.get("lado") in ("ofensivo", "defensivo"):
                lados = [abp["lado"]]
            if tipos and lados:
                if "ofensivo" in lados:
                    ofensivo = list(tipos)
                if "defensivo" in lados:
                    defensivo = list(tipos)
        lados_u = ([] if not ofensivo else ["ofensivo"]) + ([] if not defensivo else ["defensivo"])
        abp["ofensivo"] = ofensivo
        abp["defensivo"] = defensivo
        abp["lados"] = lados_u
        abp["lado"] = lados_u[0] if lados_u else None
        abp["tipos"] = list(dict.fromkeys([*ofensivo, *defensivo]))
        abp["activo"] = bool(ofensivo or defensivo)
        sesion["abp_config"] = abp

    tareas_response = supabase.table("sesion_tareas").select(
        "orden, fase_sesion, duracion_override, carga_calculada, notas, "
        "tareas(id, titulo, duracion_total, densidad, desarrollo, descripcion, "
        "reglas, objetivos_tacticos, objetivos_tecnicos, fase_juego, "
        "principio_tactico, modalidad, grafico_data, "
        "categorias_tarea(codigo, nombre))"
    ).eq("sesion_id", sesion["id"]).order("orden").execute()

    tareas = []
    for st in (tareas_response.data or []):
        t = st.pop("tareas", {}) or {}
        cat = t.pop("categorias_tarea", None) if isinstance(t, dict) else None
        desc = (t.get("desarrollo") or t.get("descripcion") or "") if t else ""
        if isinstance(desc, str) and len(desc) > 220:
            desc = desc[:217].rsplit(" ", 1)[0] + "…"
        # No enviamos grafico_data completo (pesado): solo flag
        has_board = bool(t.get("grafico_data")) if t else False
        tareas.append({
            "orden": st.get("orden"),
            "fase_sesion": st.get("fase_sesion"),
            "duracion": st.get("duracion_override") or (t.get("duracion_total") if t else 0),
            "carga_calculada": st.get("carga_calculada"),
            "titulo": t.get("titulo") if t else None,
            "descripcion": desc,
            "categoria": cat,
            "notas": st.get("notas"),
            "fase_juego": t.get("fase_juego") if t else None,
            "modalidad": t.get("modalidad") if t else None,
            "objetivos_tacticos": t.get("objetivos_tacticos") if t else [],
            "objetivos_tecnicos": t.get("objetivos_tecnicos") if t else [],
            "has_board": has_board,
            "tarea_id": t.get("id") if t else None,
        })

    # Convocatoria pública (nombres + tipos, sin datos médicos)
    asistencia = []
    try:
        roster = supabase.table("asistencias_sesion").select(
            "presente, tipo_participacion, motivo_ausencia, jugadores(nombre, apellidos, dorsal)"
        ).eq("sesion_id", sesion["id"]).execute()
        for a in roster.data or []:
            j = a.get("jugadores") or {}
            tipos = a.get("tipo_participacion") or (["sesion"] if a.get("presente") else [])
            asistencia.append({
                "nombre": j.get("nombre"),
                "apellidos": j.get("apellidos"),
                "dorsal": j.get("dorsal"),
                "presente": bool(a.get("presente")),
                "tipos": tipos if a.get("presente") else [],
                "motivo_ausencia": a.get("motivo_ausencia") if not a.get("presente") else None,
            })
    except Exception:
        pass

    rpe_por_tarea = []
    try:
        rpe_resp = supabase.table("rpe").select(
            "tarea_id, valor, jugador_id"
        ).eq("sesion_id", sesion["id"]).execute()
        buckets: dict = {}
        for r in (rpe_resp.data or []):
            tid = r.get("tarea_id") or "_sesion"
            buckets.setdefault(tid, []).append(r.get("valor") or 0)
        for tid, vals in buckets.items():
            if vals:
                rpe_por_tarea.append({
                    "tarea_id": tid if tid != "_sesion" else None,
                    "rpe_medio": round(sum(vals) / len(vals), 1),
                    "n": len(vals),
                })
    except Exception:
        pass

    return {
        "sesion": sesion,
        "tareas": tareas,
        "asistencia": asistencia,
        "rpe_por_tarea": rpe_por_tarea,
    }


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
    ).eq("id", str(sesion_id)).maybe_single().execute()

    if not response or not response.data:
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
            tarea_data = hydrate_tarea_narrative(tarea_data) or tarea_data
            tarea_data["categoria"] = tarea_data.pop("categorias_tarea", None)
        st["tarea"] = tarea_data
        if not st.get("fase_sesion"):
            st["fase_sesion"] = "desarrollo_1"
        if st.get("carga_calculada") is not None:
            try:
                st["carga_calculada"] = float(st["carga_calculada"])
            except (TypeError, ValueError):
                st["carga_calculada"] = None
        try:
            sesion_data["tareas"].append(SesionTareaResponse(**st))
        except Exception as e:
            logger.warning("SesionTareaResponse skip %s: %s", st.get("id"), e)

    return SesionResponse(**normalize_sesion_row(sesion_data))


@router.post("", response_model=SesionResponse, status_code=status.HTTP_201_CREATED)
async def create_sesion(
    sesion: SesionCreate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_CREATE)),
):
    """Crea una nueva sesión."""
    supabase = get_supabase()

    # Preparar datos — nunca insertar tareas anidadas en la fila de sesión
    sesion_data = prepare_sesion_write_payload(
        sesion.model_dump(exclude_unset=True, exclude={"tareas"}),
        synthesize=True,
    )
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

    # Insertar — si una columna aún no existe en PostgREST (PGRST204), se omite y se reintenta
    response = retry_sesion_write(
        lambda data: supabase.table("sesiones").insert(data).execute(),
        sesion_data,
        op="insert",
    )

    if not response or not response.data:
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

    return SesionResponse(**normalize_sesion_row(created))


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
    ).maybe_single().execute()

    if not existing or not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )

    update_data = prepare_sesion_write_payload(
        sesion.model_dump(exclude_unset=True),
        synthesize=True,
    )

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    response = retry_sesion_write(
        lambda data: supabase.table("sesiones").update(data).eq(
            "id", str(sesion_id)
        ).execute(),
        update_data,
        op="update",
    )

    if not response or not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al actualizar sesión"
        )

    log_update(auth.user_id, "sesion", str(sesion_id), datos_nuevos=update_data)

    if "estructura_fases" in update_data:
        _recalc_sesion_carga(supabase, str(sesion_id))
        refreshed = (
            supabase.table("sesiones")
            .select("*")
            .eq("id", str(sesion_id))
            .maybe_single()
            .execute()
        )
        if refreshed and refreshed.data:
            return SesionResponse(**normalize_sesion_row(refreshed.data))

    return SesionResponse(**normalize_sesion_row(response.data[0]))


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
    ).maybe_single().execute()

    if not existing or not existing.data:
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
    ).maybe_single().execute()

    if not sesion or not sesion.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )

    fase = tarea_data.fase_sesion.value if tarea_data.fase_sesion else "desarrollo_1"
    data = {
        "sesion_id": str(sesion_id),
        "tarea_id": str(tarea_data.tarea_id),
        "orden": tarea_data.orden,
        "fase_sesion": fase,
        "duracion_override": tarea_data.duracion_override,
        "notas": tarea_data.notas,
        "responsable": tarea_data.responsable,
    }

    supabase.table("sesion_tareas").insert(data).execute()
    _recalc_sesion_carga(supabase, str(sesion_id))
    return await get_sesion(sesion_id, auth)


@router.delete("/{sesion_id}/tareas/{tarea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tarea_from_sesion(
    sesion_id: UUID,
    tarea_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Elimina una tarea de la sesión y recalcula duracion_total."""
    supabase = get_supabase()

    supabase.table("sesion_tareas").delete().match({
        "sesion_id": str(sesion_id),
        "tarea_id": str(tarea_id)
    }).execute()

    _recalc_sesion_carga(supabase, str(sesion_id))
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

    _recalc_sesion_carga(supabase, str(sesion_id))
    return await get_sesion(sesion_id, auth)


@router.put("/{sesion_id}/tareas-batch", response_model=SesionResponse)
async def batch_update_tareas(
    sesion_id: UUID,
    batch: SesionTareasBatchUpdate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Reemplaza todas las tareas de una sesion (preserving formations). Recalcula duracion_total."""
    supabase = get_supabase()

    # Verificar sesion
    existing = supabase.table("sesiones").select("id").eq(
        "id", str(sesion_id)
    ).maybe_single().execute()
    if not existing or not existing.data:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    # Save existing formations before delete (keyed by tarea_id)
    old_tareas = supabase.table("sesion_tareas").select(
        "tarea_id, formacion_equipos"
    ).eq("sesion_id", str(sesion_id)).execute()
    formaciones_map = {}
    for ot in (old_tareas.data or []):
        if ot.get("formacion_equipos"):
            formaciones_map[ot["tarea_id"]] = ot["formacion_equipos"]

    # Delete all existing tareas
    supabase.table("sesion_tareas").delete().eq("sesion_id", str(sesion_id)).execute()

    # Insert new tareas (restoring saved formations)
    for tarea in batch.tareas:
        data = {
            "sesion_id": str(sesion_id),
            "tarea_id": str(tarea.tarea_id),
            "orden": tarea.orden,
            "fase_sesion": (tarea.fase_sesion.value if tarea.fase_sesion else "desarrollo_1"),
            "duracion_override": tarea.duracion_override,
            "notas": tarea.notas,
            "responsable": tarea.responsable,
        }
        # Restore formation if it existed for this tarea
        saved_formacion = formaciones_map.get(str(tarea.tarea_id))
        if saved_formacion:
            data["formacion_equipos"] = saved_formacion
        supabase.table("sesion_tareas").insert(data).execute()

    _recalc_sesion_carga(supabase, str(sesion_id))

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
        "*, jugadores(id, nombre, apellidos, apodo, dorsal, posicion_principal, foto_url, es_portero, es_invitado, estado, disponibilidad, equipo_id)"
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
    ).maybe_single().execute()
    if not existing or not existing.data:
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
        sesion_data = supabase.table("sesiones").select("estado, equipo_id").eq("id", str(sesion_id)).maybe_single().execute()
        if sesion_data and sesion_data.data and sesion_data.data.get("estado") == "completada":
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

    if not response or not response.data:
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


_SKIP_TAREA_COPY = {"es_plantilla", "es_publica", "creado_por"}
_PROTECTED_FORK_FIELDS = {"es_plantilla", "es_publica", "creado_por", "tarea_origen_id"}


def _copy_tarea_columns(original: dict) -> dict:
    """Copia la ficha completa del creador al duplicar en sesión."""
    return {
        k: original[k]
        for k in VALID_TAREA_COLUMNS
        if k not in _SKIP_TAREA_COPY and original.get(k) is not None
    }


def _is_madre(tarea: dict) -> bool:
    return not tarea.get("tarea_origen_id")


def _should_fork_tarea(tarea: dict) -> bool:
    """Never mutate a mother or a shared library variant from a session."""
    if _is_madre(tarea):
        return True
    return bool(tarea.get("es_plantilla", True))


def _strip_editada_prefix(titulo: str | None) -> str:
    base = titulo or "Sin titulo"
    while base.startswith("(Editada) "):
        base = base[len("(Editada) "):]
    return base


def _build_session_variant_row(original: dict, cambios: dict, user_id: str) -> dict:
    """New library variant linked to the mother, owned by this session copy."""
    nueva = _copy_tarea_columns(original)
    nueva["titulo"] = _strip_editada_prefix(original.get("titulo"))
    nueva["creado_por"] = user_id
    nueva.update(cambios)
    nueva["es_plantilla"] = False
    nueva["tarea_origen_id"] = original.get("tarea_origen_id") or original["id"]
    tipo = original.get("tipo_variante") or "original"
    nueva["tipo_variante"] = "adaptacion" if tipo == "original" else tipo
    return {
        k: v
        for k, v in nueva.items()
        if k in VALID_TAREA_COLUMNS | {"titulo", "es_plantilla", "creado_por"}
    }


def _persist_cambios_en_sesion_tarea(
    supabase,
    sesion_tarea_id: str,
    original_tarea: dict,
    old_tarea_id: str,
    cambios: dict,
    user_id: str,
) -> bool:
    """Update in place or fork a variant. Returns True if a new variant was created."""
    cambios_safe = {k: v for k, v in cambios.items() if k not in _PROTECTED_FORK_FIELDS}
    _resolve_categoria_codigo(supabase, cambios_safe)
    if not _should_fork_tarea(original_tarea):
        if cambios_safe:
            _update_tarea_with_schema_fallback(supabase, old_tarea_id, cambios_safe)
        return False

    nueva = _build_session_variant_row(original_tarea, cambios_safe, user_id)
    _resolve_categoria_codigo(supabase, nueva)
    _sanitize_tarea_constraints(nueva)
    _sync_tarea_narrative(nueva)
    insert_response = _insert_tarea_with_schema_fallback(supabase, nueva)
    if not insert_response.data:
        raise HTTPException(status_code=500, detail="Error al duplicar tarea")
    new_tarea_id = insert_response.data[0]["id"]
    supabase.table("sesion_tareas").update(
        {"tarea_id": new_tarea_id}
    ).eq("id", str(sesion_tarea_id)).execute()
    return True


def _resolve_categoria_codigo(supabase, tarea_data: dict) -> dict:
    """El formulario manda el código de categoría (ej. RND); la BD espera UUID."""
    cat_raw = tarea_data.get("categoria_id")
    if not cat_raw:
        return tarea_data
    try:
        UUID(str(cat_raw))
    except (ValueError, AttributeError, TypeError):
        cat_resp = supabase.table("categorias_tarea").select("id").eq(
            "codigo", str(cat_raw)
        ).maybe_single().execute()
        if cat_resp and cat_resp.data:
            tarea_data["categoria_id"] = cat_resp.data["id"]
        else:
            tarea_data.pop("categoria_id", None)
    return tarea_data


class DuplicarYEditarTareaRequest(BaseModel):
    model_config = {"extra": "ignore"}
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    desarrollo: Optional[str] = None
    reglas: Optional[str] = None
    anotaciones: Optional[str] = None
    duracion_total: Optional[int] = None
    duracion_serie: Optional[int] = None
    tiempo_descanso: Optional[int] = None
    num_jugadores_min: Optional[int] = None
    num_jugadores_max: Optional[int] = None
    num_porteros: Optional[int] = None
    espacio_largo: Optional[Union[int, float]] = None
    espacio_ancho: Optional[Union[int, float]] = None
    espacio_forma: Optional[str] = None
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
    grafico_data: Optional[dict] = None
    grafico_svg: Optional[str] = None
    objetivos_tacticos: Optional[Any] = None
    objetivos_tecnicos: Optional[Any] = None
    orientaciones_fisicas: Optional[Any] = None
    etiquetas_fisicas: Optional[Any] = None
    modalidad: Optional[str] = None
    categoria_id: Optional[str] = None
    tipo_variante: Optional[str] = None
    tarea_origen_id: Optional[str] = None
    complejidad: Optional[str] = None
    forma_puntuar: Optional[str] = None
    dificultad: Optional[int] = Field(default=None, ge=1, le=5)
    exigencia: Optional[int] = Field(default=None, ge=1, le=5)
    tags: Optional[Any] = None
    m2_por_jugador: Optional[Union[int, float]] = None
    tipo_esfuerzo: Optional[str] = None
    fc_esperada_min: Optional[int] = None
    fc_esperada_max: Optional[int] = None


@router.post("/{sesion_id}/tareas/{sesion_tarea_id}/duplicar-y-editar")
async def duplicar_y_editar_tarea(
    sesion_id: UUID,
    sesion_tarea_id: UUID,
    cambios: DuplicarYEditarTareaRequest,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Edita la tarea en sesión: si es madre, crea una variante y deja la madre intacta."""
    supabase = get_supabase()

    st_response = supabase.table("sesion_tareas").select(
        "*, tareas(*)"
    ).eq("id", str(sesion_tarea_id)).eq("sesion_id", str(sesion_id)).maybe_single().execute()

    if not st_response or not st_response.data:
        logger.warning(f"sesion_tarea not found: id={sesion_tarea_id}, sesion={sesion_id}")
        raise HTTPException(status_code=404, detail="Tarea de sesion no encontrada. Recarga la pagina e intentalo de nuevo.")

    old_tarea_id = st_response.data.get("tarea_id")
    original_tarea = st_response.data.get("tareas", {})
    if not original_tarea:
        raise HTTPException(status_code=404, detail="Tarea original no encontrada")

    cambios_dict = cambios.model_dump(exclude_none=True)
    cambios_filtered = {k: v for k, v in cambios_dict.items() if k in VALID_TAREA_COLUMNS | {"titulo"}}
    _resolve_categoria_codigo(supabase, cambios_filtered)
    _sanitize_tarea_constraints(cambios_filtered)
    _sync_tarea_narrative(cambios_filtered)

    try:
        _persist_cambios_en_sesion_tarea(
            supabase,
            str(sesion_tarea_id),
            original_tarea,
            old_tarea_id,
            cambios_filtered,
            str(auth.user_id),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving tarea from session: {e}")
        raise HTTPException(status_code=400, detail=f"Error al guardar cambios: {str(e)}")

    updated = supabase.table("sesion_tareas").select(
        "*, tareas(*)"
    ).eq("id", str(sesion_tarea_id)).maybe_single().execute()

    if not updated or not updated.data:
        raise HTTPException(status_code=500, detail="Error al obtener tarea actualizada")

    return _hydrate_sesion_tarea_row(updated.data)


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
    ).eq("id", str(sesion_tarea_id)).eq("sesion_id", str(sesion_id)).maybe_single().execute()

    if not st_response or not st_response.data:
        raise HTTPException(status_code=404, detail="Tarea de sesion no encontrada")

    old_tarea_id = st_response.data.get("tarea_id")
    tarea_actual = st_response.data.get("tareas", {})
    if not tarea_actual:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    # 2. Call Claude to get modifications
    try:
        from app.services.ai_factory import call_ai_with_fallback
        from app.services.ai_errors import AIError
        cambios_ia = await call_ai_with_fallback(
            "edit_task_with_ai",
            use_fast_model=True,
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

    cambios_filtered = {k: v for k, v in cambios_ia.items() if k in VALID_TAREA_COLUMNS | {"titulo"}}
    _sanitize_tarea_constraints(cambios_filtered)
    _sync_tarea_narrative(cambios_filtered)

    try:
        _persist_cambios_en_sesion_tarea(
            supabase,
            str(sesion_tarea_id),
            tarea_actual,
            old_tarea_id,
            cambios_filtered,
            str(auth.user_id),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inserting AI-edited tarea: {e}")
        raise HTTPException(status_code=400, detail=f"Error al crear tarea editada: {str(e)}")

    updated = supabase.table("sesion_tareas").select(
        "*, tareas(*)"
    ).eq("id", str(sesion_tarea_id)).maybe_single().execute()

    if not updated or not updated.data:
        raise HTTPException(status_code=500, detail="Error al obtener tarea actualizada")

    return _hydrate_sesion_tarea_row(updated.data)


class CrearTareaEnSesionRequest(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=255)
    descripcion: Optional[str] = None
    desarrollo: Optional[str] = None
    reglas: Optional[str] = None
    anotaciones: Optional[str] = None
    duracion_total: int = Field(default=10, ge=1)
    fase_sesion: str = Field(default="desarrollo_1")
    num_jugadores_min: int = Field(default=1, ge=0)
    num_jugadores_max: Optional[int] = None
    estructura_equipos: Optional[str] = None
    espacio_largo: Optional[Union[int, float]] = None
    espacio_ancho: Optional[Union[int, float]] = None
    fase_juego: Optional[str] = None
    principio_tactico: Optional[str] = None
    subprincipio_tactico: Optional[str] = None
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
    # Formulario "Crea tu ejercicio"
    categoria_id: Optional[str] = None
    modalidad: Optional[str] = None
    objetivos_tacticos: Optional[Any] = None
    objetivos_tecnicos: Optional[Any] = None
    orientaciones_fisicas: Optional[Any] = None
    etiquetas_fisicas: Optional[Any] = None
    num_porteros: Optional[int] = None
    espacio_forma: Optional[str] = None
    duracion_serie: Optional[int] = None
    tiempo_descanso: Optional[int] = None
    complejidad: Optional[str] = None
    forma_puntuar: Optional[str] = None
    dificultad: Optional[int] = Field(default=None, ge=1, le=5)
    exigencia: Optional[int] = Field(default=None, ge=1, le=5)
    tags: Optional[Any] = None
    grafico_data: Optional[Any] = None
    grafico_svg: Optional[str] = None
    m2_por_jugador: Optional[Union[int, float]] = None
    tipo_esfuerzo: Optional[str] = None
    fc_esperada_min: Optional[int] = None
    fc_esperada_max: Optional[int] = None
    tarea_origen_id: Optional[str] = None
    tipo_variante: Optional[str] = None
    es_publica: Optional[bool] = True


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
    ).maybe_single().execute()
    if not sesion or not sesion.data:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    # Build tarea data (filter to valid DB columns only)
    tarea_data = request.model_dump(exclude_none=True, exclude={"fase_sesion"})
    tarea_data = {k: v for k, v in tarea_data.items() if k in VALID_TAREA_COLUMNS}
    _sanitize_tarea_constraints(tarea_data)
    _sync_tarea_narrative(tarea_data)
    if not tarea_data.get("tipo_variante") and not tarea_data.get("tarea_origen_id"):
        tarea_data["tipo_variante"] = "original"
    tarea_data["es_plantilla"] = True
    if "es_publica" not in tarea_data:
        tarea_data["es_publica"] = True
    tarea_data["creado_por"] = str(auth.user_id)
    tarea_data["equipo_id"] = sesion.data.get("equipo_id")
    tarea_data["organizacion_id"] = str(auth.organizacion_id)

    _resolve_categoria_codigo(supabase, tarea_data)

    # m2/jugador se deriva del espacio, igual que en el CRUD de tareas
    if tarea_data.get("espacio_largo") and tarea_data.get("espacio_ancho"):
        jugadores = tarea_data.get("num_jugadores_min") or 0
        if jugadores > 0:
            area = tarea_data["espacio_largo"] * tarea_data["espacio_ancho"]
            tarea_data["m2_por_jugador"] = round(area / jugadores, 1)

    try:
        insert_resp = _insert_tarea_with_schema_fallback(supabase, tarea_data)
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
    ).eq("id", str(sesion_id)).maybe_single().execute()
    if not sesion or not sesion.data:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    # Call Claude to generate the task
    try:
        from app.services.ai_factory import call_ai_with_fallback
        from app.services.ai_errors import AIError
        tarea_data = await call_ai_with_fallback(
            "create_task_from_prompt",
            use_fast_model=True,
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
    _sync_tarea_narrative(tarea_data)

    # Insert as a new mother in the library; later session edits fork a variant.
    tarea_data["es_plantilla"] = True
    if not tarea_data.get("tarea_origen_id"):
        tarea_data["tipo_variante"] = tarea_data.get("tipo_variante") or "original"
    tarea_data["creado_por"] = str(auth.user_id)
    tarea_data["equipo_id"] = sesion.data.get("equipo_id")
    tarea_data["organizacion_id"] = str(auth.organizacion_id)

    try:
        insert_resp = _insert_tarea_with_schema_fallback(supabase, tarea_data)
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
    ).eq("id", str(sesion_tarea_id)).eq("sesion_id", str(sesion_id)).maybe_single().execute()

    if not st_response or not st_response.data:
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
    ).eq("sesion_id", str(sesion_id)).maybe_single().execute()

    if not st_response or not st_response.data:
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
    variant: str = Query("reducido", description="reducido | extendido"),
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Genera el PDF de la sesión (reducido 1 pág o extendido), lo sube a Storage y lo devuelve."""
    supabase = get_supabase()
    sid = str(sesion_id)

    # Parallel fetch: sesion + tareas + asistencia + portero_tareas
    sesion_response, tareas_response, roster_response, portero_response = await asyncio.gather(
        asyncio.to_thread(
            lambda: supabase.table("sesiones").select(
                "*, equipos(*, organizaciones(*))"
            ).eq("id", sid).maybe_single().execute()
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

    if not sesion_response or not sesion_response.data:
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

    # Fetch microciclo name if linked
    microciclo_nombre = None
    if sesion.get("microciclo_id"):
        try:
            mc_resp = supabase.table("microciclos").select(
                "objetivo_principal, fecha_inicio, fecha_fin"
            ).eq("id", sesion["microciclo_id"]).maybe_single().execute()
            if mc_resp.data:
                mc = mc_resp.data
                microciclo_nombre = mc.get("objetivo_principal") or f"Microciclo {mc.get('fecha_inicio', '')}"
        except Exception:
            pass

    # Fetch ABP jugadas linked directly to this session (abp_sesion_jugadas)
    abp_jugadas = []
    try:
        abp_resp = supabase.table("abp_sesion_jugadas").select(
            "*, abp_jugadas(*)"
        ).eq("sesion_id", sid).order("orden").execute()
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

    # Fetch entrenamientos al margen for this session
    margen_enriched = []
    try:
        margen_res = supabase.table("entrenamientos_margen").select(
            "*, jugadores(nombre, apellidos, dorsal, posicion_principal)"
        ).eq("sesion_id", str(sesion_id)).execute()

        tipo_colors = {
            "movilidad": "#06B6D4", "activacion": "#22C55E", "fuerza": "#EF4444",
            "propioceptivo": "#8B5CF6", "cardio": "#F59E0B", "campo": "#3B82F6",
            "pliometria": "#EC4899", "flexibilidad": "#14B8A6", "otro": "#6B7280",
        }

        for ent in (margen_res.data or []):
            jugador = ent.pop("jugadores", {}) or {}
            # Fetch tareas
            t_res = supabase.table("entrenamientos_margen_tareas").select(
                "*, tareas(titulo)"
            ).eq("entrenamiento_margen_id", ent["id"]).order("orden").execute()

            tareas_list = []
            for t in (t_res.data or []):
                tarea_lib = t.pop("tareas", None)
                titulo = t.get("titulo_custom") or (tarea_lib or {}).get("titulo", "")
                tareas_list.append({
                    "titulo": titulo,
                    "descripcion": t.get("descripcion_custom", ""),
                    "tipo_ejercicio": t.get("tipo_ejercicio", ""),
                    "tipo_color": tipo_colors.get(t.get("tipo_ejercicio", ""), "#6B7280"),
                    "duracion": t.get("duracion"),
                    "series": t.get("series"),
                    "repeticiones": t.get("repeticiones"),
                    "descanso": t.get("descanso"),
                    "carga": t.get("carga"),
                    "notas": t.get("notas"),
                })

            # Fetch linked registro_medico title
            rm_titulo = ""
            if ent.get("registro_medico_id"):
                try:
                    rm_r = supabase.table("registros_medicos").select("titulo").eq(
                        "id", ent["registro_medico_id"]
                    ).single().execute()
                    rm_titulo = (rm_r.data or {}).get("titulo", "")
                except Exception:
                    pass

            margen_enriched.append({
                "nombre": jugador.get("nombre", ""),
                "apellidos": jugador.get("apellidos", ""),
                "dorsal": jugador.get("dorsal"),
                "objetivo": ent.get("objetivo", ""),
                "notas": ent.get("notas", ""),
                "responsable": ent.get("responsable", ""),
                "estado": ent.get("estado", "planificado"),
                "fase_recuperacion": ent.get("fase_recuperacion", ""),
                "duracion_estimada": ent.get("duracion_estimada"),
                "rpe_post": ent.get("rpe_post"),
                "registro_medico_titulo": rm_titulo,
                "tareas": tareas_list,
            })
    except Exception:
        pass  # Non-critical: PDF generates without margen section

    # Generar PDF (reducido vestuario / extendido detalle)
    try:
        from app.services.pdf_service import generate_sesion_pdf_reducido
        if (variant or "reducido").lower() == "reducido":
            pdf_bytes = await generate_sesion_pdf_reducido(
                sesion, tareas, organizacion,
                lugar=lugar,
                microciclo_nombre=microciclo_nombre,
                asistencia_roster=asistencia_roster,
                jugadores_map=jugadores_map,
            )
        else:
            pdf_bytes = await generate_sesion_pdf_v2(
                sesion, tareas, organizacion, jugadores_map,
                microciclo_nombre=microciclo_nombre,
                lugar=lugar,
                asistencia_roster=asistencia_roster,
                portero_tareas=portero_tareas_data,
                abp_jugadas=abp_jugadas,
                margen_entrenamientos=margen_enriched,
            )
    except Exception as e:
        import logging
        logging.getLogger("traininghub.pdf").error("Error generando PDF: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando PDF: {str(e)}"
        )

    # Subir a Storage (ruta distinta por variante para no pisar el otro PDF)
    settings = get_settings()
    variant_key = (variant or "reducido").lower()
    if variant_key not in ("reducido", "extendido"):
        variant_key = "reducido"
    storage_path = f"sesiones/{auth.organizacion_id}/{sesion_id}_{variant_key}.pdf"

    try:
        pdf_url = upload_file(
            bucket=settings.STORAGE_BUCKET_PDFS,
            path=storage_path,
            data=pdf_bytes,
            content_type="application/pdf",
        )

        # Guardar URL del extendido como pdf_url principal; reducido en campo aparte si existe
        update_payload = {}
        if variant_key == "extendido":
            update_payload["pdf_url"] = pdf_url
        if update_payload:
            supabase.table("sesiones").update(update_payload).eq("id", str(sesion_id)).execute()
    except Exception:
        # Si falla el upload, devolvemos el PDF de todas formas
        pass

    # Devolver PDF como streaming response
    # Nombre: sesion_YYYY-MM-DD_reducido.pdf / sesion_YYYY-MM-DD_extendido.pdf
    fecha_raw = sesion.get("fecha")
    if hasattr(fecha_raw, "isoformat"):
        fecha_str = fecha_raw.isoformat()[:10]
    else:
        fecha_str = str(fecha_raw or "")[:10]
    if not fecha_str or fecha_str.lower() in ("none", "null"):
        fecha_str = str(sesion_id)[:8]
    filename = f"sesion_{fecha_str}_{variant_key}.pdf"
    disposition = "inline" if preview else f'attachment; filename="{filename}"'
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": disposition,
            "X-PDF-Filename": filename,
        }
    )



# ============ Cierre planificación / auto-completar / share ============


@router.post("/{sesion_id}/cerrar-planificacion", response_model=SesionResponse)
async def cerrar_planificacion(
    sesion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Cierra la planificación: estado → planificada (+ share_token si falta)."""
    supabase = get_supabase()
    existing = supabase.table("sesiones").select("*").eq(
        "id", str(sesion_id)
    ).maybe_single().execute()
    if not existing or not existing.data:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    sesion = existing.data
    if sesion.get("estado") == EstadoSesion.COMPLETADA.value:
        raise HTTPException(status_code=400, detail="La sesión ya está completada")

    _recalc_sesion_carga(supabase, str(sesion_id))

    update = {"estado": EstadoSesion.PLANIFICADA.value}
    if not sesion.get("share_token"):
        update["share_token"] = new_share_token()

    try:
        supabase.table("sesiones").update(update).eq("id", str(sesion_id)).execute()
    except Exception as e:
        if "share_token" in str(e):
            update.pop("share_token", None)
            supabase.table("sesiones").update(update).eq("id", str(sesion_id)).execute()
        else:
            raise

    log_update(auth.user_id, "sesion", str(sesion_id), datos_nuevos={"estado": "planificada"})
    return await get_sesion(sesion_id, auth)



@router.post("/{sesion_id}/share", response_model=SesionResponse)
async def enable_share(
    sesion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Genera o regenera share_token para vista compartible."""
    supabase = get_supabase()
    existing = supabase.table("sesiones").select("id").eq(
        "id", str(sesion_id)
    ).maybe_single().execute()
    if not existing or not existing.data:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    token = new_share_token()
    try:
        supabase.table("sesiones").update({"share_token": token}).eq(
            "id", str(sesion_id)
        ).execute()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo crear share_token (¿migración 063 aplicada?): {e}",
        )
    return await get_sesion(sesion_id, auth)



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
    ).maybe_single().execute()

    if not sesion or not sesion.data:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    # Verify jugador belongs to same organization
    jugador = supabase.table("jugadores").select(
        "id, nombre, apellidos, dorsal, posicion_principal, equipos(organizacion_id)"
    ).eq("id", str(request.jugador_id)).maybe_single().execute()

    if not jugador or not jugador.data:
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

    if not response or not response.data:
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
    ).maybe_single().execute()

    if not sesion or not sesion.data:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")

    equipo_id = sesion.data["equipo_id"]

    # Create the guest jugador (tipología: invitado / prueba / juvenil)
    tipo = getattr(data.tipo_jugador, "value", None) or str(data.tipo_jugador or "invitado")
    ficha_defaults = {"plantilla": "completa", "juvenil": "pre_ficha", "prueba": "pre_ficha", "invitado": "minima"}
    ficha = getattr(getattr(data, "ficha_estado", None), "value", None) or ficha_defaults.get(tipo, "minima")

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
        "es_invitado": tipo != "plantilla",
        "tipo_jugador": tipo,
        "ficha_estado": ficha,
        "es_convocable": tipo != "invitado",
        "estado": "activo",
        "pierna_dominante": "derecha",
        "posiciones_secundarias": [],
    }
    if getattr(data, "equipo_origen_id", None):
        jugador_data["equipo_origen_id"] = str(data.equipo_origen_id)

    try:
        jug_response = supabase.table("jugadores").insert(jugador_data).execute()
    except Exception:
        # Compat si aún no se aplicó migración 059
        legacy = {k: v for k, v in jugador_data.items() if k not in ("tipo_jugador", "ficha_estado", "fecha_fin_prueba")}
        jug_response = supabase.table("jugadores").insert(legacy).execute()

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
        from app.services.ai_factory import call_ai_with_fallback
        from app.services.ai_errors import AIError

        result = await asyncio.wait_for(
            call_ai_with_fallback(
                "session_design_chat",
                use_fast_model=True,
                mensajes=[{"rol": m.rol, "contenido": m.contenido} for m in request.mensajes],
                equipo_id=equipo_id,
                organizacion_id=auth.organizacion_id,
            ),
            timeout=75.0,
        )

        return SessionDesignResponse(
            respuesta=result["respuesta"],
            sesion_propuesta=result.get("sesion_propuesta"),
            herramientas_usadas=result.get("herramientas_usadas", []),
        )

    except asyncio.TimeoutError:
        logger.error("session design chat timed out after 75s")
        raise HTTPException(
            status_code=504,
            detail="La IA tardó demasiado en responder. Inténtalo de nuevo.",
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


@router.post("/design-chat/stream")
async def stream_session_design_chat(
    request: SessionDesignRequest,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_CREATE)),
):
    """
    SSE streaming version of design-chat.
    Returns text/event-stream — no asyncio.wait_for guard.
    Events: progress(thinking) → progress(session_ready) → progress(diagrams_start) → done
    """
    import json as _json
    from app.config import get_settings
    from app.services.claude_service import ClaudeService

    equipo_id = str(request.equipo_id) if request.equipo_id else auth.equipo_id
    if not equipo_id:
        raise HTTPException(status_code=400, detail="Se requiere equipo_id")

    settings = get_settings()
    service = ClaudeService(model=settings.CLAUDE_MODEL_FAST)

    async def event_generator():
        try:
            async for event in service.session_design_chat_stream(
                mensajes=[{"rol": m.rol, "contenido": m.contenido} for m in request.mensajes],
                equipo_id=equipo_id,
                organizacion_id=auth.organizacion_id,
            ):
                yield f"data: {_json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"Error in session design SSE stream: {e}", exc_info=True)
            yield f"data: {_json.dumps({'type': 'error', 'message': 'Error inesperado. Inténtalo de nuevo.'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
