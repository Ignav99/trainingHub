"""
TrainingHub Pro - Router de Rivales
CRUD para equipos rivales + inteligencia (once probable, tarjetas).
"""

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
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

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
    rival_lower = rival_nombre.lower()

    # Build query for actas
    query = supabase.table("rfef_actas").select(
        "local_nombre, visitante_nombre, titulares_local, titulares_visitante, jornada_numero"
    )

    if competicion_id:
        query = query.eq("competicion_id", str(competicion_id))

    # Get actas where rival plays (either side)
    query = query.or_(
        f"local_nombre.ilike.%{rival_nombre}%,visitante_nombre.ilike.%{rival_nombre}%"
    ).order("jornada_numero", desc=True).limit(5)

    actas_res = query.execute()
    actas = actas_res.data or []

    # Count appearances of each starter for the rival's side
    player_counts: Counter = Counter()
    player_dorsals: dict[str, int | None] = {}

    for acta in actas:
        local_lower = (acta.get("local_nombre") or "").lower()
        if rival_lower in local_lower or local_lower in rival_lower:
            titulares = acta.get("titulares_local", [])
        else:
            titulares = acta.get("titulares_visitante", [])

        for jugador in titulares:
            nombre = jugador.get("nombre", "").strip()
            if nombre:
                player_counts[nombre] += 1
                if nombre not in player_dorsals:
                    player_dorsals[nombre] = jugador.get("dorsal")

    # Top 11 by frequency
    top_11 = player_counts.most_common(11)
    once_probable = [
        {
            "nombre": nombre,
            "dorsal": player_dorsals.get(nombre),
            "apariciones": count,
        }
        for nombre, count in top_11
    ]

    return {
        "actas_analizadas": len(actas),
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
