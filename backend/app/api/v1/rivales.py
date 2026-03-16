"""
TrainingHub Pro - Router de Rivales
CRUD para equipos rivales + inteligencia (once probable, tarjetas, scouting hub).
"""

import json
import logging
from collections import Counter

from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, status
from typing import Optional
from uuid import UUID
from math import ceil

from app.models import (
    RivalCreate,
    RivalUpdate,
    RivalResponse,
    RivalListResponse,
    RivalInformeResponse,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.services.pre_match_service import populate_rival_intel, _match_rival_name, _query_actas, _get_rival_data
from app.services.ai_factory import get_ai_service
from app.services.ai_errors import AIError

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=RivalListResponse)
async def list_rivales(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    busqueda: Optional[str] = None,
    orden: str = Query("nombre", pattern="^(nombre|created_at)$"),
    direccion: str = Query("asc", pattern="^(asc|desc)$"),
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """
    Lista todos los rivales de la organización.
    """
    supabase = get_supabase()

    query = supabase.table("rivales").select("*", count="exact")

    # Filtrar por organización del usuario
    query = query.eq("organizacion_id", auth.organizacion_id)

    # Búsqueda
    if busqueda:
        query = query.or_(f"nombre.ilike.%{busqueda}%,ciudad.ilike.%{busqueda}%")

    # Ordenación
    query = query.order(orden, desc=(direccion == "desc"))

    # Paginación
    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    return RivalListResponse(
        data=[RivalResponse(**r) for r in response.data],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.post("/{rival_id}/escudo")
async def upload_escudo(
    rival_id: UUID,
    file: UploadFile = File(...),
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_UPDATE)),
):
    """Upload or update rival badge/escudo. Accepts PNG, JPG, SVG, WebP. Max 2MB."""
    if not file.content_type or not file.content_type.startswith(("image/", "application/svg")):
        raise HTTPException(status_code=400, detail="Solo se permiten imagenes (PNG, JPG, SVG, WebP)")

    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no puede superar 2MB")

    supabase = get_supabase()

    # Verify rival exists and belongs to org
    existing = supabase.table("rivales").select("id").eq(
        "id", str(rival_id)
    ).eq("organizacion_id", auth.organizacion_id).single().execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Rival no encontrado")

    extension = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "png"
    storage_path = f"rivales/{auth.organizacion_id}/{rival_id}/escudo.{extension}"

    try:
        try:
            supabase.storage.from_("logos").remove([storage_path])
        except Exception:
            pass

        supabase.storage.from_("logos").upload(
            storage_path,
            content,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )

        escudo_url = supabase.storage.from_("logos").get_public_url(storage_path)
    except Exception as e:
        logger.error(f"Error uploading escudo: {e}")
        raise HTTPException(status_code=500, detail="Error al subir el escudo")

    supabase.table("rivales").update({
        "escudo_url": escudo_url,
    }).eq("id", str(rival_id)).execute()

    return {"escudo_url": escudo_url}


@router.get("/{rival_id}/once-probable")
async def get_once_probable(
    rival_id: UUID,
    competicion_id: Optional[UUID] = None,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """
    Calculates the probable starting XI for a rival based on the last 5 match reports.
    Analyzes starters from the rival's side and returns top 11 by frequency.
    """
    supabase = get_supabase()

    # Get rival name
    rival_res = supabase.table("rivales").select("nombre, rfef_nombre").eq(
        "id", str(rival_id)
    ).single().execute()

    if not rival_res.data:
        raise HTTPException(status_code=404, detail="Rival no encontrado")

    rival_nombre = rival_res.data.get("rfef_nombre") or rival_res.data.get("nombre", "")

    # Use shared _query_actas (handles empty acta names via jornadas fallback)
    comp_filter = str(competicion_id) if competicion_id else None
    if not comp_filter:
        raise HTTPException(status_code=400, detail="competicion_id is required")

    actas = _query_actas(
        supabase, comp_filter, rival_nombre,
        "local_nombre, visitante_nombre, titulares_local, titulares_visitante, jornada_numero",
        desc=True, limit=5,
    )

    # Count appearances of each starter for the rival's side
    player_counts: Counter = Counter()
    player_dorsals: dict[str, int | None] = {}
    actas_with_data = 0

    for acta in actas:
        titulares = _get_rival_data(acta, rival_nombre, "titulares_local", "titulares_visitante")
        if titulares:
            actas_with_data += 1
        for jugador in titulares:
            nombre = jugador.get("nombre", "").strip()
            if nombre:
                player_counts[nombre] += 1
                if nombre not in player_dorsals:
                    player_dorsals[nombre] = jugador.get("dorsal")

    # Fetch tarjetas to cross-reference sanctions
    tarjetas_actas = _query_actas(
        supabase, comp_filter, rival_nombre,
        "local_nombre, visitante_nombre, tarjetas_local, tarjetas_visitante, jornada_numero",
    )

    sancionados = set()
    tarjeta_cards: dict[str, dict] = {}
    for acta in tarjetas_actas:
        tarjetas = _get_rival_data(acta, rival_nombre, "tarjetas_local", "tarjetas_visitante")
        for tarjeta in tarjetas:
            nombre_t = tarjeta.get("jugador", "").strip()
            tipo = tarjeta.get("tipo", "")
            if not nombre_t:
                continue
            if nombre_t not in tarjeta_cards:
                tarjeta_cards[nombre_t] = {"amarillas": 0}
            if tipo == "amarilla":
                tarjeta_cards[nombre_t]["amarillas"] += 1

    for nombre_t, cards in tarjeta_cards.items():
        amarillas = cards["amarillas"]
        if amarillas > 0 and amarillas % 5 == 0:
            sancionados.add(nombre_t)

    # All players by frequency (not just top 11)
    all_players = player_counts.most_common()
    once_probable = [
        {
            "nombre": nombre,
            "dorsal": player_dorsals.get(nombre),
            "apariciones": count,
            "sancionado": nombre in sancionados,
        }
        for nombre, count in all_players
    ]

    return {
        "actas_analizadas": actas_with_data,
        "once_probable": once_probable,
    }


@router.get("/{rival_id}/tarjetas")
async def get_tarjetas_resumen(
    rival_id: UUID,
    competicion_id: Optional[UUID] = None,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """
    Aggregates card statistics for a rival across all match reports in a competition.
    Includes yellow/red cards, accumulated cycles (every 5 yellows = suspension).
    """
    supabase = get_supabase()

    # Get rival name
    rival_res = supabase.table("rivales").select("nombre, rfef_nombre").eq(
        "id", str(rival_id)
    ).single().execute()

    if not rival_res.data:
        raise HTTPException(status_code=404, detail="Rival no encontrado")

    rival_nombre = rival_res.data.get("rfef_nombre") or rival_res.data.get("nombre", "")
    rival_lower = rival_nombre.lower()

    # Build query — get ALL actas for the competition where rival plays
    query = supabase.table("rfef_actas").select(
        "local_nombre, visitante_nombre, tarjetas_local, tarjetas_visitante, jornada_numero"
    )

    if competicion_id:
        query = query.eq("competicion_id", str(competicion_id))

    query = query.or_(
        f"local_nombre.ilike.%{rival_nombre}%,visitante_nombre.ilike.%{rival_nombre}%"
    ).order("jornada_numero")

    actas_res = query.execute()
    actas = actas_res.data or []

    # Aggregate cards per player
    player_cards: dict[str, dict] = {}

    for acta in actas:
        local_lower = (acta.get("local_nombre") or "").lower()
        if rival_lower in local_lower or local_lower in rival_lower:
            tarjetas = acta.get("tarjetas_local", [])
        else:
            tarjetas = acta.get("tarjetas_visitante", [])

        for tarjeta in tarjetas:
            nombre = tarjeta.get("jugador", "").strip()
            tipo = tarjeta.get("tipo", "")
            if not nombre:
                continue

            if nombre not in player_cards:
                player_cards[nombre] = {"amarillas": 0, "rojas": 0}

            if tipo == "amarilla":
                player_cards[nombre]["amarillas"] += 1
            elif tipo == "roja":
                player_cards[nombre]["rojas"] += 1

    # Build result with cycle calculation
    jugadores = []
    for nombre, cards in player_cards.items():
        amarillas = cards["amarillas"]
        rojas = cards["rojas"]
        ciclos_cumplidos = amarillas // 5

        # Estado: if just completed a cycle (amarillas is multiple of 5) and > 0
        if amarillas > 0 and amarillas % 5 == 0:
            estado = "Sancionado"
        elif amarillas % 5 == 4:
            estado = "Ciclo"  # 1 away from sanction
        else:
            estado = "OK"

        jugadores.append({
            "nombre": nombre,
            "amarillas": amarillas,
            "rojas": rojas,
            "ciclos_cumplidos": ciclos_cumplidos,
            "estado": estado,
        })

    # Sort by yellows desc
    jugadores.sort(key=lambda j: (-j["amarillas"], -j["rojas"]))

    return {
        "total_actas": len(actas),
        "jugadores": jugadores,
    }


@router.get("/{rival_id}/intel")
async def get_rival_intel(
    rival_id: UUID,
    competicion_id: UUID = Query(..., description="RFEF competition ID"),
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """Returns cached rival_intel or generates if null."""
    supabase = get_supabase()

    rival_res = supabase.table("rivales").select("rival_intel").eq(
        "id", str(rival_id)
    ).eq("organizacion_id", auth.organizacion_id).single().execute()

    if not rival_res.data:
        raise HTTPException(status_code=404, detail="Rival no encontrado")

    intel = rival_res.data.get("rival_intel")
    if intel:
        return intel

    # Generate on first request
    intel = populate_rival_intel(supabase, str(rival_id), str(competicion_id))
    if not intel:
        return {}
    return intel


@router.post("/{rival_id}/populate-intel")
async def populate_intel(
    rival_id: UUID,
    competicion_id: UUID = Query(..., description="RFEF competition ID"),
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_UPDATE)),
):
    """Force refresh RFEF data for a rival."""
    supabase = get_supabase()

    existing = supabase.table("rivales").select("id").eq(
        "id", str(rival_id)
    ).eq("organizacion_id", auth.organizacion_id).single().execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Rival no encontrado")

    intel = populate_rival_intel(supabase, str(rival_id), str(competicion_id))
    if not intel:
        raise HTTPException(status_code=400, detail="No se pudo generar intel (competicion no encontrada)")

    return intel


@router.post("/{rival_id}/scouting-chat")
async def scouting_chat(
    rival_id: UUID,
    body: dict,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_UPDATE)),
):
    """
    AI chat for generating rival reports or match plans from rival context.
    Body: { mensajes: [{rol, contenido}], tipo: "informe"|"plan", partido_id?: str }
    """
    supabase = get_supabase()

    mensajes = body.get("mensajes", [])
    tipo = body.get("tipo", "informe")
    partido_id = body.get("partido_id")

    if tipo not in ("informe", "plan"):
        raise HTTPException(status_code=400, detail="tipo debe ser 'informe' o 'plan'")

    if not mensajes:
        raise HTTPException(status_code=400, detail="Se requiere al menos un mensaje")

    # Fetch rival
    rival_res = supabase.table("rivales").select("*").eq(
        "id", str(rival_id)
    ).eq("organizacion_id", auth.organizacion_id).single().execute()

    if not rival_res.data:
        raise HTTPException(status_code=404, detail="Rival no encontrado")

    rival = rival_res.data
    rival_nombre = rival.get("nombre", "Rival desconocido")
    intel_data = rival.get("rival_intel") or {}

    try:
        service = get_ai_service()
        result = await service.pre_match_chat(
            mensajes=mensajes,
            intel_data=intel_data,
            rival_nombre=rival_nombre,
            localia="local",
            fecha="",
            tipo=tipo,
        )
    except AIError as e:
        error_msg = str(e)
        if "conexion" in error_msg.lower():
            raise HTTPException(status_code=503, detail=error_msg)
        elif "saturado" in error_msg.lower():
            raise HTTPException(status_code=429, detail=error_msg)
        else:
            raise HTTPException(status_code=500, detail=error_msg)

    # Save to rival_informes table
    ai_data = {}
    if result.get("informe_rival"):
        ai_data = result["informe_rival"]
    elif result.get("plan_partido"):
        ai_data = result["plan_partido"]

    if ai_data:
        informe_row = {
            "rival_id": str(rival_id),
            "organizacion_id": auth.organizacion_id,
            "tipo": tipo,
            "contenido": ai_data,
            "conversacion": mensajes,
            "intel_snapshot": intel_data if intel_data else None,
            "created_by": str(auth.user_id),
        }
        if partido_id:
            informe_row["partido_id"] = partido_id

        supabase.table("rival_informes").insert(informe_row).execute()

        # If linked to a match, copy to partidos.notas_pre
        if partido_id:
            partido_res = supabase.table("partidos").select("notas_pre").eq(
                "id", partido_id
            ).single().execute()

            if partido_res.data:
                existing_notas = {}
                if partido_res.data.get("notas_pre"):
                    try:
                        raw = partido_res.data["notas_pre"]
                        existing_notas = json.loads(raw) if isinstance(raw, str) else raw
                    except (json.JSONDecodeError, TypeError):
                        existing_notas = {}

                key = "ai_informe_rival" if tipo == "informe" else "ai_plan_partido"
                merged = {**existing_notas, key: ai_data}
                supabase.table("partidos").update(
                    {"notas_pre": json.dumps(merged, ensure_ascii=False)}
                ).eq("id", partido_id).execute()

    return {
        "respuesta": result.get("respuesta", ""),
        "informe_rival": result.get("informe_rival"),
        "plan_partido": result.get("plan_partido"),
    }


@router.get("/{rival_id}/informes")
async def list_rival_informes(
    rival_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """List versioned AI informes for a rival."""
    supabase = get_supabase()

    res = supabase.table("rival_informes").select("*").eq(
        "rival_id", str(rival_id)
    ).eq("organizacion_id", auth.organizacion_id).order(
        "created_at", desc=True
    ).limit(50).execute()

    return {"data": res.data or []}


@router.get("/{rival_id}/perfil-competicion")
async def get_rival_perfil_competicion(
    rival_id: UUID,
    competicion_id: Optional[UUID] = None,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """
    Perfil completo de un rival dentro de una competición.
    Incluye stats de clasificación, últimos 5 resultados, y head-to-head.
    """
    supabase = get_supabase()

    # Get rival
    rival_res = supabase.table("rivales").select("*").eq(
        "id", str(rival_id)
    ).single().execute()

    if not rival_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rival no encontrado"
        )

    rival = rival_res.data
    rival_nombre = rival.get("rfef_nombre") or rival.get("nombre", "")
    rival_nombre_lower = rival_nombre.lower()

    competition_stats = None
    last_5_results = []

    # If competicion_id provided, get stats from clasificacion
    if competicion_id:
        comp_res = supabase.table("rfef_competiciones").select(
            "clasificacion"
        ).eq("id", str(competicion_id)).single().execute()

        if comp_res.data:
            clasificacion = comp_res.data.get("clasificacion", [])
            for equipo in clasificacion:
                equipo_nombre = equipo.get("equipo", "").lower()
                if equipo_nombre == rival_nombre_lower or rival_nombre_lower in equipo_nombre or equipo_nombre in rival_nombre_lower:
                    competition_stats = {
                        "posicion": equipo.get("posicion"),
                        "puntos": equipo.get("puntos"),
                        "pj": equipo.get("pj"),
                        "pg": equipo.get("pg"),
                        "pe": equipo.get("pe"),
                        "pp": equipo.get("pp"),
                        "gf": equipo.get("gf"),
                        "gc": equipo.get("gc"),
                        "ultimos_5": equipo.get("ultimos_5", []),
                    }
                    break

        # Get last 5 results from jornadas
        jornadas_res = supabase.table("rfef_jornadas").select("*").eq(
            "competicion_id", str(competicion_id)
        ).order("numero", desc=True).execute()

        for jornada in jornadas_res.data or []:
            for partido in jornada.get("partidos", []):
                local = (partido.get("local") or "").lower()
                visitante = (partido.get("visitante") or "").lower()
                is_involved = rival_nombre_lower in local or local in rival_nombre_lower or rival_nombre_lower in visitante or visitante in rival_nombre_lower

                if is_involved and partido.get("goles_local") is not None:
                    last_5_results.append({
                        "jornada": jornada["numero"],
                        "local": partido.get("local"),
                        "visitante": partido.get("visitante"),
                        "goles_local": partido.get("goles_local"),
                        "goles_visitante": partido.get("goles_visitante"),
                        "fecha": partido.get("fecha", ""),
                    })
                    if len(last_5_results) >= 5:
                        break
            if len(last_5_results) >= 5:
                break

    # Head-to-head: partidos from our DB against this rival
    h2h_res = supabase.table("partidos").select(
        "id, fecha, localia, goles_favor, goles_contra, resultado, jornada, competicion"
    ).eq("rival_id", str(rival_id)).order("fecha", desc=True).limit(10).execute()

    head_to_head = h2h_res.data or []

    return {
        "rival": rival,
        "competition_stats": competition_stats,
        "last_5_results": last_5_results,
        "head_to_head": head_to_head,
    }


@router.get("/{rival_id}", response_model=RivalResponse)
async def get_rival(
    rival_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """
    Obtiene un rival por ID.
    """
    supabase = get_supabase()

    response = supabase.table("rivales").select("*").eq(
        "id", str(rival_id)
    ).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rival no encontrado"
        )

    return RivalResponse(**response.data)


@router.post("", response_model=RivalResponse, status_code=status.HTTP_201_CREATED)
async def create_rival(
    rival: RivalCreate,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_CREATE)),
):
    """
    Crea un nuevo rival.
    """
    supabase = get_supabase()

    rival_data = rival.model_dump(exclude_unset=True)
    rival_data["organizacion_id"] = auth.organizacion_id

    response = supabase.table("rivales").insert(rival_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear rival"
        )

    return RivalResponse(**response.data[0])


@router.put("/{rival_id}", response_model=RivalResponse)
async def update_rival(
    rival_id: UUID,
    rival: RivalUpdate,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_UPDATE)),
):
    """
    Actualiza un rival existente.
    """
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("rivales").select("*").eq(
        "id", str(rival_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rival no encontrado"
        )

    update_data = rival.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    response = supabase.table("rivales").update(update_data).eq(
        "id", str(rival_id)
    ).execute()

    return RivalResponse(**response.data[0])


@router.delete("/{rival_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rival(
    rival_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_DELETE)),
):
    """
    Elimina un rival.
    No se puede eliminar si tiene partidos asociados.
    """
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("rivales").select("*").eq(
        "id", str(rival_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rival no encontrado"
        )

    # Verificar si tiene partidos asociados
    partidos = supabase.table("partidos").select("id").eq(
        "rival_id", str(rival_id)
    ).execute()

    if partidos.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar: el rival tiene {len(partidos.data)} partidos asociados"
        )

    supabase.table("rivales").delete().eq("id", str(rival_id)).execute()

    return None
