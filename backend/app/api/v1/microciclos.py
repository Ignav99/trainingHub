"""
TrainingHub Pro - Router de Microciclos
CRUD para planificación semanal de entrenamiento.
"""

import logging

from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form, status
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
    ReordenarSesionesRequest,
)
from app.models.plan_partido import (
    PlanPartidoResponse,
    InformeRivalEnriquecidoResponse,
    AlertaResponse,
    VistaCompletaMicrociclo,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

logger = logging.getLogger(__name__)
router = APIRouter()

RIVAL_CLIPS_BUCKET = "rival-clips"
MAX_CLIP_SIZE = 50 * 1024 * 1024  # 50MB por archivo (límite del plan Supabase)
MAX_TOTAL_CLIPS_SIZE = 300 * 1024 * 1024  # 300MB por microciclo (agregado)
ALLOWED_VIDEO_TYPES = ("video/",)


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
        "*, equipos(nombre, categoria), partidos(*, rivales(nombre, nombre_corto)), rivales(nombre, nombre_corto, escudo_url)",
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
    WAR ROOM — Devuelve TODA la info de un microciclo:
    microciclo (partido+rival+game_model), sesiones, plantilla, RPE,
    plan de partido, informe rival y alertas.
    """
    import logging
    logger = logging.getLogger("traininghub.microciclos")
    supabase = get_supabase()

    try:
            # 1. Microciclo con todos los joins
        micro_resp = supabase.table("microciclos").select(
            "*, equipos(id, nombre, categoria), partidos(*, rivales(nombre, nombre_corto, escudo_url)), rivales(nombre, nombre_corto, escudo_url), game_models(id, nombre, sistema_juego, estilo)"
        ).eq("id", str(microciclo_id)).single().execute()

        if not micro_resp.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Microciclo no encontrado"
            )

        micro = micro_resp.data
        equipo_id = micro["equipo_id"]
        rival_id = micro.get("rival_id")
        fecha_inicio = micro["fecha_inicio"]
        fecha_fin = micro["fecha_fin"]

        # Auto-link partido si no tiene uno
        if not micro.get("partido_id"):
            partido_auto = supabase.table("partidos").select("id").eq(
                "equipo_id", equipo_id
            ).gte("fecha", fecha_inicio).lte("fecha", fecha_fin).limit(1).execute()
            if partido_auto.data:
                pid = partido_auto.data[0]["id"]
                supabase.table("microciclos").update({
                    "partido_id": str(pid)
                }).eq("id", str(microciclo_id)).execute()
                # Reload
                micro_resp = supabase.table("microciclos").select(
                    "*, equipos(id, nombre, categoria), partidos(*, rivales(nombre, nombre_corto, escudo_url)), rivales(nombre, nombre_corto, escudo_url), game_models(id, nombre, sistema_juego, estilo)"
                ).eq("id", str(microciclo_id)).single().execute()
                micro = micro_resp.data

        # 2. Sesiones con count de tareas + dia_numero + orden
        sesiones_resp = supabase.table("sesiones").select(
            "id, titulo, fecha, match_day, estado, duracion_total, objetivo_principal, "
            "intensidad_objetivo, fase_juego_principal, notas_pre, notas_post, "
            "dia_numero, orden, hora, microciclo_id, "
            "sesion_tareas(id)"
        ).eq("microciclo_id", str(microciclo_id)).execute()

        sesiones = []
        for s in sorted(sesiones_resp.data, key=lambda x: (x.get("dia_numero") or 0, x.get("orden") or 0)):
            tareas_rel = s.pop("sesion_tareas", []) or []
            s["num_tareas"] = len(tareas_rel)
            sesiones.append(s)

        # 3. Plantilla
        jugadores_resp = supabase.table("jugadores").select(
            "id, nombre, apellidos, dorsal, posicion_principal, estado, "
            "fecha_lesion, fecha_vuelta_estimada, motivo_baja"
        ).eq("equipo_id", equipo_id).eq(
            "es_invitado", False
        ).order("apellidos").execute()

        jugadores = jugadores_resp.data
        total = len(jugadores)
        lesionados = [j for j in jugadores if j.get("estado") == "lesionado"]
        en_recuperacion = [j for j in jugadores if j.get("estado") == "en_recuperacion"]
        sancionados = [j for j in jugadores if j.get("estado") == "sancionado"]
        disponibles = sum(1 for j in jugadores if j.get("estado") == "activo")

        plantilla = {
            "total": total,
            "disponibles": disponibles,
            "lesionados": len(lesionados),
            "en_recuperacion": len(en_recuperacion),
            "sancionados": len(sancionados),
            "jugadores_lesionados": lesionados,
            "jugadores_en_recuperacion": en_recuperacion,
            "jugadores_sancionados": sancionados,
        }

        # 4. RPE
        jugador_ids = [j["id"] for j in jugadores]
        rpe_data = {"registros_por_sesion": {}, "rpe_promedio_semana": None}

        if jugador_ids:
            rpe_resp = supabase.table("registros_rpe").select(
                "sesion_id, rpe, carga_sesion"
            ).in_("jugador_id", jugador_ids).gte(
                "fecha", fecha_inicio
            ).lte("fecha", fecha_fin).execute()

            por_sesion: dict = {}
            all_rpe = []
            for r in rpe_resp.data:
                sid = r.get("sesion_id")
                if sid:
                    if sid not in por_sesion:
                        por_sesion[sid] = {"rpe_vals": [], "count": 0}
                    if r["rpe"] is not None:
                        por_sesion[sid]["rpe_vals"].append(r["rpe"])
                    por_sesion[sid]["count"] += 1
                if r["rpe"] is not None:
                    all_rpe.append(r["rpe"])

            registros_por_sesion = {}
            for sid, data in por_sesion.items():
                vals = data["rpe_vals"]
                registros_por_sesion[sid] = {
                    "rpe_promedio": round(sum(vals) / len(vals), 1) if vals else None,
                    "num_registros": data["count"],
                }

            rpe_data = {
                "registros_por_sesion": registros_por_sesion,
                "rpe_promedio_semana": round(sum(all_rpe) / len(all_rpe), 1) if all_rpe else None,
            }

        # 5. Plan de Partido
        plan_partido = None
        plan_resp = supabase.table("planes_partido").select("*").eq(
            "microciclo_id", str(microciclo_id)
        ).limit(1).execute()
        if plan_resp.data:
            plan_partido = PlanPartidoResponse(**plan_resp.data[0])

        # 6. Informe del Rival
        informe_rival = None
        if rival_id:
            informe_resp = supabase.table("informes_rival").select("*").eq(
                "rival_id", str(rival_id)
            ).order("created_at", desc=True).limit(1).execute()
            if informe_resp.data:
                informe_rival = InformeRivalEnriquecidoResponse(**informe_resp.data[0])

        # 7. Alertas activas
        alertas_resp = supabase.table("alertas").select("*").eq(
            "microciclo_id", str(microciclo_id)
        ).eq("resuelta", False).order("created_at", desc=True).execute()
        alertas = [AlertaResponse(**a) for a in alertas_resp.data] if alertas_resp.data else []

        return {
            "microciclo": micro,
            "sesiones": sesiones,
            "plantilla": plantilla,
            "rpe": rpe_data,
            "plan_partido": plan_partido.model_dump(mode="json") if plan_partido else None,
            "informe_rival": informe_rival.model_dump(mode="json") if informe_rival else None,
            "alertas": [a.model_dump(mode="json") for a in alertas],
        }
    except Exception as e:
        logger.error(f"Error loading microciclo completo {microciclo_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cargar el microciclo: {str(e)}"
        )


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
    ).eq("microciclo_id", str(microciclo_id)).execute()

    sesiones = []
    for s in sorted(response.data, key=lambda x: (x.get("dia_numero") or 0, x.get("orden") or 0)):
        s["equipo"] = s.pop("equipos", None)
        sesiones.append(s)

    return {"data": sesiones, "total": len(sesiones)}


@router.post("", response_model=MicrocicloResponse, status_code=status.HTTP_201_CREATED)
async def create_microciclo(
    microciclo: MicrocicloCreate,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_CREATE)),
):
    """Crea un nuevo microciclo."""
    import logging
    logger = logging.getLogger("traininghub.microciclos")
    supabase = get_supabase()

    data = microciclo.model_dump(mode="json", exclude_none=True)
    data["equipo_id"] = str(data["equipo_id"])
    if data.get("partido_id"):
        data["partido_id"] = str(data["partido_id"])
    if data.get("rival_id"):
        data["rival_id"] = str(data["rival_id"])
    if data.get("game_model_id"):
        data["game_model_id"] = str(data["game_model_id"])

    logger.info(f"Creating microciclo: {data} for org={auth.organizacion_id} user={auth.user_id}")

    try:
        response = supabase.table("microciclos").insert(data).execute()
    except Exception as e:
        logger.error(f"Error creating microciclo: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al crear microciclo: {str(e)}"
        )

    if not response.data:
        logger.error("Supabase insert returned no data")
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
    if update_data.get("rival_id"):
        update_data["rival_id"] = str(update_data["rival_id"])
    if update_data.get("game_model_id"):
        update_data["game_model_id"] = str(update_data["game_model_id"])

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
    """Vincula todas las sesiones del equipo que caigan en el rango de fechas del microciclo."""
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

    # Find ALL sessions in date range for this team
    sesiones = supabase.table("sesiones").select("id").eq(
        "equipo_id", equipo_id
    ).gte(
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

    # Link partido
    partido_result = supabase.table("partidos").select("id").eq(
        "equipo_id", equipo_id
    ).gte(
        "fecha", fecha_inicio
    ).lte(
        "fecha", fecha_fin
    ).limit(1).execute()

    partido_id = None
    if partido_result.data:
        partido_id = partido_result.data[0]["id"]
        supabase.table("microciclos").update({
            "partido_id": str(partido_id)
        }).eq("id", str(microciclo_id)).execute()

    return {"linked": linked, "partido_linked": partido_id is not None, "microciclo_id": str(microciclo_id)}


@router.put("/{microciclo_id}/reordenar")
async def reordenar_sesiones(
    microciclo_id: UUID,
    request: ReordenarSesionesRequest,
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_UPDATE)),
):
    """
    DRAG & DROP — Reordena las sesiones del microciclo.
    Recibe una lista de {sesion_id, dia_numero, orden} y persiste los cambios.
    """
    supabase = get_supabase()

    # Verificar que el microciclo existe
    micro = supabase.table("microciclos").select("id").eq(
        "id", str(microciclo_id)
    ).single().execute()

    if not micro.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Microciclo no encontrado"
        )

    # Validar que todas las sesiones pertenecen al microciclo
    sesion_ids = [str(item.sesion_id) for item in request.sesiones]
    existing = supabase.table("sesiones").select("id").eq(
        "microciclo_id", str(microciclo_id)
    ).in_("id", sesion_ids).execute()

    existing_ids = {s["id"] for s in existing.data}

    for item in request.sesiones:
        if str(item.sesion_id) not in existing_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sesión {item.sesion_id} no pertenece al microciclo {microciclo_id}"
            )

    # Actualizar en lote — una query por sesión (Supabase no soporta CASE WHEN batch)
    updated = 0
    for item in request.sesiones:
        result = supabase.table("sesiones").update({
            "dia_numero": item.dia_numero,
            "orden": item.orden,
        }).eq("id", str(item.sesion_id)).eq("microciclo_id", str(microciclo_id)).execute()
        if result.data:
            updated += 1

    return {
        "success": True,
        "updated": updated,
        "total": len(request.sesiones),
        "microciclo_id": str(microciclo_id),
    }


def _current_clips_size(plan_ct: Optional[dict]) -> int:
    """Suma el tamaño (bytes) de todos los clips de vídeo ya guardados en rival_scout."""
    if not plan_ct:
        return 0
    rival_scout = plan_ct.get("rival_scout") or {}
    fases = rival_scout.get("fases") or []
    total = 0
    for fase in fases:
        for clip in fase.get("clips") or []:
            total += clip.get("size") or 0
    return total


@router.post("/{microciclo_id}/rival-clips")
async def upload_rival_clip(
    microciclo_id: UUID,
    fase: str = Form(...),
    file: UploadFile = File(...),
    auth: AuthContext = Depends(require_permission(Permission.MICROCICLO_UPDATE)),
):
    """
    Sube un clip de vídeo del análisis del rival (Sala de Lunes) usando el
    service role de Supabase, evitando así depender de políticas RLS sobre
    storage.objects para el bucket 'rival-clips'.

    Límites:
      - 50MB por archivo (máximo permitido por el plan de Supabase)
      - 300MB acumulados por microciclo (sumando todos los clips ya guardados)
    """
    if not file.content_type or not file.content_type.startswith(ALLOWED_VIDEO_TYPES):
        raise HTTPException(status_code=400, detail="El archivo debe ser un vídeo (mp4, mov, etc.)")

    content = await file.read()
    size = len(content)

    if size > MAX_CLIP_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"El vídeo supera el límite de 50MB por archivo (recibido: {size / (1024 * 1024):.1f}MB)",
        )

    supabase = get_supabase()

    micro = supabase.table("microciclos").select("id, plan_ct").eq(
        "id", str(microciclo_id)
    ).single().execute()

    if not micro.data:
        raise HTTPException(status_code=404, detail="Microciclo no encontrado")

    existing_size = _current_clips_size(micro.data.get("plan_ct"))
    if existing_size + size > MAX_TOTAL_CLIPS_SIZE:
        remaining = max(0, MAX_TOTAL_CLIPS_SIZE - existing_size)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Límite de 300MB por microciclo alcanzado. "
                f"Espacio disponible: {remaining / (1024 * 1024):.1f}MB"
            ),
        )

    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in (file.filename or "clip"))
    extension = safe_name.rsplit(".", 1)[-1] if "." in safe_name else "mp4"
    storage_path = f"{microciclo_id}/{fase}/{auth.organizacion_id}_{safe_name}"

    try:
        supabase.storage.from_(RIVAL_CLIPS_BUCKET).upload(
            storage_path,
            content,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )
        url = supabase.storage.from_(RIVAL_CLIPS_BUCKET).get_public_url(storage_path)
    except Exception as e:
        logger.error(f"Error uploading rival clip: {e}")
        raise HTTPException(status_code=500, detail="Error al subir el clip de vídeo")

    return {
        "url": url,
        "size": size,
        "mimeType": file.content_type,
        "titulo": safe_name.rsplit(".", 1)[0] if "." in safe_name else safe_name,
    }
