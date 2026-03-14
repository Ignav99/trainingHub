"""
TrainingHub Pro - Router de Partidos
CRUD para partidos y calendario competitivo.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import StreamingResponse
from typing import Optional
from uuid import UUID
from datetime import date
from math import ceil
import asyncio
import io

from app.models import (
    PartidoCreate,
    PartidoUpdate,
    PartidoResponse,
    PartidoListResponse,
    TipoCompeticion,
    RivalResponse,
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.services.audit_service import log_create, log_update, log_delete
from app.services.notification_service import notify_partido_resultado
from app.services.pdf_service import generate_informe_partido_pdf, generate_informe_rival_pdf, generate_plan_partido_pdf, generate_plan_partido_jugadores_pdf
from app.services.pre_match_service import populate_partido_intel
from app.services.claude_service import ClaudeService, ClaudeError

import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=PartidoListResponse)
async def list_partidos(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    equipo_id: Optional[UUID] = None,
    rival_id: Optional[UUID] = None,
    competicion: Optional[TipoCompeticion] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    solo_jugados: bool = False,
    solo_pendientes: bool = False,
    orden: str = Query("fecha", pattern="^(fecha|jornada|created_at)$"),
    direccion: str = Query("desc", pattern="^(asc|desc)$"),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """
    Lista partidos con filtros.
    """
    supabase = get_supabase()

    # Query con relación a rivales
    query = supabase.table("partidos").select(
        "*, rivales(*)",
        count="exact"
    )

    # Filtrar por equipos de la organización del usuario
    if equipo_id:
        query = query.eq("equipo_id", str(equipo_id))
    else:
        # Obtener todos los equipos de la organización
        equipos = supabase.table("equipos").select("id").eq(
            "organizacion_id", auth.organizacion_id
        ).execute()
        equipo_ids = [e["id"] for e in equipos.data]
        if equipo_ids:
            query = query.in_("equipo_id", equipo_ids)

    if rival_id:
        query = query.eq("rival_id", str(rival_id))

    if competicion:
        query = query.eq("competicion", competicion.value)

    if fecha_desde:
        query = query.gte("fecha", fecha_desde.isoformat())

    if fecha_hasta:
        query = query.lte("fecha", fecha_hasta.isoformat())

    if solo_jugados:
        query = query.not_.is_("goles_favor", "null")

    if solo_pendientes:
        query = query.is_("goles_favor", "null")

    # Ordenación
    query = query.order(orden, desc=(direccion == "desc"))

    # Paginación
    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    # Mapear respuesta con rival
    partidos = []
    for p in response.data:
        rival_data = p.pop("rivales", None)
        partido = PartidoResponse(**p)
        if rival_data:
            partido.rival = RivalResponse(**rival_data)
        partidos.append(partido)

    return PartidoListResponse(
        data=partidos,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/{partido_id}", response_model=PartidoResponse)
async def get_partido(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """
    Obtiene un partido por ID.
    """
    supabase = get_supabase()

    response = supabase.table("partidos").select(
        "*, rivales(*)"
    ).eq("id", str(partido_id)).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partido no encontrado"
        )

    rival_data = response.data.pop("rivales", None)
    partido = PartidoResponse(**response.data)
    if rival_data:
        partido.rival = RivalResponse(**rival_data)

    return partido


@router.post("", response_model=PartidoResponse, status_code=status.HTTP_201_CREATED)
async def create_partido(
    partido: PartidoCreate,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_CREATE)),
):
    """
    Crea un nuevo partido.
    """
    supabase = get_supabase()

    partido_data = partido.model_dump(mode='json')

    # Use default equipo if not provided
    if not partido.equipo_id:
        equipos = supabase.table("equipos").select("id").eq(
            "organizacion_id", auth.organizacion_id
        ).limit(1).execute()

        if equipos.data:
            partido_data["equipo_id"] = equipos.data[0]["id"]
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No tienes equipos. Crea uno primero."
            )
    else:
        partido_data["equipo_id"] = str(partido.equipo_id)

    partido_data["rival_id"] = str(partido_data["rival_id"])

    response = supabase.table("partidos").insert(partido_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear partido"
        )

    # Obtener con relación
    partido_completo = supabase.table("partidos").select(
        "*, rivales(*)"
    ).eq("id", response.data[0]["id"]).single().execute()

    rival_data = partido_completo.data.pop("rivales", None)
    result = PartidoResponse(**partido_completo.data)
    if rival_data:
        result.rival = RivalResponse(**rival_data)

    log_create(auth.user_id, "partido", str(result.id))

    return result


@router.put("/{partido_id}", response_model=PartidoResponse)
async def update_partido(
    partido_id: UUID,
    partido: PartidoUpdate,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """
    Actualiza un partido existente.
    """
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("partidos").select("*, rivales(*)").eq(
        "id", str(partido_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partido no encontrado"
        )

    update_data = partido.model_dump(exclude_unset=True, mode='json')

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    # Convertir UUIDs
    if update_data.get("rival_id"):
        update_data["rival_id"] = str(update_data["rival_id"])

    response = supabase.table("partidos").update(update_data).eq(
        "id", str(partido_id)
    ).execute()

    # Obtener con relación
    partido_completo = supabase.table("partidos").select(
        "*, rivales(*)"
    ).eq("id", str(partido_id)).single().execute()

    rival_data = partido_completo.data.pop("rivales", None)
    result = PartidoResponse(**partido_completo.data)
    if rival_data:
        result.rival = RivalResponse(**rival_data)

    log_update(auth.user_id, "partido", str(partido_id), datos_nuevos=update_data)

    return result


@router.delete("/{partido_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_partido(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_DELETE)),
):
    """
    Elimina un partido.
    """
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("partidos").select("*").eq(
        "id", str(partido_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partido no encontrado"
        )

    supabase.table("partidos").delete().eq("id", str(partido_id)).execute()

    log_delete(auth.user_id, "partido", str(partido_id))

    return None


@router.post("/{partido_id}/resultado", response_model=PartidoResponse)
async def registrar_resultado(
    partido_id: UUID,
    goles_favor: int = Query(..., ge=0),
    goles_contra: int = Query(..., ge=0),
    notas_post: Optional[str] = None,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """
    Registra el resultado de un partido.
    El campo 'resultado' se calcula automáticamente.
    """
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("partidos").select("*").eq(
        "id", str(partido_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partido no encontrado"
        )

    update_data = {
        "goles_favor": goles_favor,
        "goles_contra": goles_contra,
    }
    if notas_post:
        update_data["notas_post"] = notas_post

    response = supabase.table("partidos").update(update_data).eq(
        "id", str(partido_id)
    ).execute()

    # Obtener con relación
    partido_completo = supabase.table("partidos").select(
        "*, rivales(*)"
    ).eq("id", str(partido_id)).single().execute()

    rival_data = partido_completo.data.pop("rivales", None)
    result = PartidoResponse(**partido_completo.data)
    if rival_data:
        result.rival = RivalResponse(**rival_data)

    # Notify team staff about match result
    notify_partido_resultado(
        partido_id=str(partido_id),
        rival_nombre=rival_data.get("nombre", "Rival") if rival_data else "Rival",
        goles_favor=goles_favor,
        goles_contra=goles_contra,
        equipo_id=existing.data["equipo_id"],
    )

    return result


@router.post("/{partido_id}/informe")
async def generar_informe_partido(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """
    Genera un informe PDF del partido y lo sube a Supabase Storage.
    Retorna la URL del informe.
    """
    supabase = get_supabase()

    # 1. Obtener partido con rival
    partido_resp = supabase.table("partidos").select(
        "*, rivales(*)"
    ).eq("id", str(partido_id)).single().execute()

    if not partido_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partido no encontrado"
        )

    partido_data = partido_resp.data
    rival_data = partido_data.pop("rivales", {}) or {}

    # 2. Obtener convocatoria con datos de jugadores
    convocatoria_resp = supabase.table("convocatorias").select(
        "*, jugadores(nombre, apellidos, dorsal, posicion_principal)"
    ).eq("partido_id", str(partido_id)).order("titular", desc=True).execute()

    convocatoria = convocatoria_resp.data or []

    # 3. Obtener organización
    org_resp = supabase.table("organizaciones").select(
        "nombre, color_primario, color_secundario, logo_url"
    ).eq("id", auth.organizacion_id).single().execute()

    organizacion = org_resp.data or {}

    # 4. Obtener nombre del equipo
    equipo_resp = supabase.table("equipos").select(
        "nombre"
    ).eq("id", partido_data["equipo_id"]).single().execute()

    equipo_nombre = equipo_resp.data.get("nombre", "") if equipo_resp.data else ""

    # 5. Generar PDF
    pdf_bytes = generate_informe_partido_pdf(
        partido=partido_data,
        rival=rival_data,
        convocatoria=convocatoria,
        organizacion=organizacion,
        equipo_nombre=equipo_nombre,
    )

    # 6. Subir a Supabase Storage
    file_name = f"informes/partido_{partido_id}.pdf"
    try:
        # Try to remove old file first (ignore errors)
        try:
            supabase.storage.from_("documentos").remove([file_name])
        except Exception:
            pass

        supabase.storage.from_("documentos").upload(
            file_name,
            pdf_bytes,
            {"content-type": "application/pdf"},
        )

        informe_url = supabase.storage.from_("documentos").get_public_url(file_name)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al subir el PDF: {str(e)}"
        )

    # 7. Actualizar partido con la URL del informe
    supabase.table("partidos").update(
        {"informe_url": informe_url}
    ).eq("id", str(partido_id)).execute()

    return {"informe_url": informe_url}


@router.get("/{partido_id}/pre-match-intel")
async def get_pre_match_intel(
    partido_id: UUID,
    force_refresh: bool = Query(False),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """
    Returns cached pre-match intel or generates fresh if force_refresh=true.
    """
    supabase = get_supabase()

    partido_res = supabase.table("partidos").select(
        "id, pre_match_intel, rfef_competicion_id"
    ).eq("id", str(partido_id)).single().execute()

    if not partido_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partido no encontrado"
        )

    # Return cached if available and not forcing refresh
    if not force_refresh and partido_res.data.get("pre_match_intel"):
        return partido_res.data["pre_match_intel"]

    # Generate fresh intel
    if not partido_res.data.get("rfef_competicion_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este partido no tiene competicion RFEF vinculada"
        )

    intel = populate_partido_intel(supabase, str(partido_id))
    if not intel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se pudo generar intel para este partido"
        )

    return intel


@router.post("/{partido_id}/populate-pre-match")
async def populate_pre_match(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """
    Manually trigger pre-match intel generation for a partido.
    """
    supabase = get_supabase()

    partido_res = supabase.table("partidos").select(
        "id, rfef_competicion_id"
    ).eq("id", str(partido_id)).single().execute()

    if not partido_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partido no encontrado"
        )

    if not partido_res.data.get("rfef_competicion_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este partido no tiene competicion RFEF vinculada"
        )

    intel = populate_partido_intel(supabase, str(partido_id))
    if not intel:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al generar intel pre-partido"
        )

    return {"status": "ok", "pre_match_intel": intel}


@router.post("/{partido_id}/pre-match-chat")
async def pre_match_chat(
    partido_id: UUID,
    body: dict,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_UPDATE)),
):
    """
    AI chat for generating rival report or match plan.
    Body: { mensajes: [{rol, contenido}], tipo: "informe" | "plan" }
    """
    supabase = get_supabase()

    mensajes = body.get("mensajes", [])
    tipo = body.get("tipo", "informe")

    if tipo not in ("informe", "plan"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="tipo debe ser 'informe' o 'plan'"
        )

    if not mensajes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere al menos un mensaje"
        )

    # Fetch partido with rival
    partido_res = supabase.table("partidos").select(
        "*, rivales(nombre)"
    ).eq("id", str(partido_id)).single().execute()

    if not partido_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partido no encontrado"
        )

    partido_data = partido_res.data
    rival_data = partido_data.get("rivales") or {}
    rival_nombre = rival_data.get("nombre", "Rival desconocido")
    intel_data = partido_data.get("pre_match_intel") or {}

    try:
        claude = ClaudeService()
        result = await claude.pre_match_chat(
            mensajes=mensajes,
            intel_data=intel_data,
            rival_nombre=rival_nombre,
            localia=partido_data.get("localia", "local"),
            fecha=partido_data.get("fecha", ""),
            tipo=tipo,
        )
    except ClaudeError as e:
        error_msg = str(e)
        if "conexion" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=error_msg)
        elif "saturado" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=error_msg)
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_msg)

    # Save AI result to notas_pre JSON
    ai_data = {}
    if result.get("informe_rival"):
        ai_data["ai_informe_rival"] = result["informe_rival"]
    if result.get("plan_partido"):
        ai_data["ai_plan_partido"] = result["plan_partido"]

    if ai_data:
        existing_notas = {}
        if partido_data.get("notas_pre"):
            try:
                existing_notas = json.loads(partido_data["notas_pre"]) if isinstance(partido_data["notas_pre"], str) else partido_data["notas_pre"]
            except (json.JSONDecodeError, TypeError):
                existing_notas = {}

        merged = {**existing_notas, **ai_data}
        supabase.table("partidos").update(
            {"notas_pre": json.dumps(merged, ensure_ascii=False)}
        ).eq("id", str(partido_id)).execute()

    return {
        "respuesta": result.get("respuesta", ""),
        "informe_rival": result.get("informe_rival"),
        "plan_partido": result.get("plan_partido"),
    }


@router.get("/{partido_id}/informe-rival-pdf")
async def download_informe_rival_pdf(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Download AI rival report as professional PDF."""
    supabase = get_supabase()

    # Fetch partido with rival
    partido_res = supabase.table("partidos").select(
        "*, rivales(nombre, escudo_url)"
    ).eq("id", str(partido_id)).single().execute()

    if not partido_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partido no encontrado")

    partido_data = partido_res.data
    rival_data = partido_data.pop("rivales", {}) or {}

    # Parse AI informe from notas_pre
    informe = None
    if partido_data.get("notas_pre"):
        try:
            notas = json.loads(partido_data["notas_pre"]) if isinstance(partido_data["notas_pre"], str) else partido_data["notas_pre"]
            informe = notas.get("ai_informe_rival")
        except (json.JSONDecodeError, TypeError):
            pass

    if not informe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay informe del rival generado")

    # Fetch org data
    org_res = supabase.table("organizaciones").select(
        "nombre, color_primario, color_secundario, logo_url"
    ).eq("id", auth.organizacion_id).single().execute()
    organizacion = org_res.data or {}

    # Fetch equipo name
    equipo_nombre = ""
    if partido_data.get("equipo_id"):
        eq_res = supabase.table("equipos").select("nombre").eq("id", partido_data["equipo_id"]).single().execute()
        equipo_nombre = eq_res.data.get("nombre", "") if eq_res.data else ""

    # Fetch pre_match_intel for stats
    intel = partido_data.get("pre_match_intel") or {}

    pdf_bytes = await asyncio.to_thread(
        generate_informe_rival_pdf,
        informe=informe,
        partido=partido_data,
        rival=rival_data,
        organizacion=organizacion,
        equipo_nombre=equipo_nombre,
        intel=intel,
    )

    rival_nombre = rival_data.get("nombre", "rival").replace(" ", "_")
    filename = f"informe_rival_{rival_nombre}_{partido_data.get('fecha', '')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{partido_id}/plan-partido-pdf")
async def download_plan_partido_pdf(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Download AI match plan as professional PDF."""
    supabase = get_supabase()

    # Fetch partido with rival
    partido_res = supabase.table("partidos").select(
        "*, rivales(nombre, escudo_url)"
    ).eq("id", str(partido_id)).single().execute()

    if not partido_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partido no encontrado")

    partido_data = partido_res.data
    rival_data = partido_data.pop("rivales", {}) or {}

    # Parse AI plan from notas_pre
    plan = None
    if partido_data.get("notas_pre"):
        try:
            notas = json.loads(partido_data["notas_pre"]) if isinstance(partido_data["notas_pre"], str) else partido_data["notas_pre"]
            plan = notas.get("ai_plan_partido")
        except (json.JSONDecodeError, TypeError):
            pass

    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay plan de partido generado")

    # Fetch org data
    org_res = supabase.table("organizaciones").select(
        "nombre, color_primario, color_secundario, logo_url"
    ).eq("id", auth.organizacion_id).single().execute()
    organizacion = org_res.data or {}

    # Fetch equipo name
    equipo_nombre = ""
    if partido_data.get("equipo_id"):
        eq_res = supabase.table("equipos").select("nombre").eq("id", partido_data["equipo_id"]).single().execute()
        equipo_nombre = eq_res.data.get("nombre", "") if eq_res.data else ""

    pdf_bytes = await asyncio.to_thread(
        generate_plan_partido_pdf,
        plan=plan,
        partido=partido_data,
        rival=rival_data,
        organizacion=organizacion,
        equipo_nombre=equipo_nombre,
    )

    rival_nombre = rival_data.get("nombre", "rival").replace(" ", "_")
    filename = f"plan_partido_vs_{rival_nombre}_{partido_data.get('fecha', '')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{partido_id}/plan-partido-jugadores-pdf")
async def download_plan_partido_jugadores_pdf(
    partido_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Download simplified match plan PDF for players."""
    supabase = get_supabase()

    partido_res = supabase.table("partidos").select(
        "*, rivales(nombre, escudo_url)"
    ).eq("id", str(partido_id)).single().execute()

    if not partido_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partido no encontrado")

    partido_data = partido_res.data
    rival_data = partido_data.pop("rivales", {}) or {}

    plan = None
    if partido_data.get("notas_pre"):
        try:
            notas = json.loads(partido_data["notas_pre"]) if isinstance(partido_data["notas_pre"], str) else partido_data["notas_pre"]
            plan = notas.get("ai_plan_partido")
        except (json.JSONDecodeError, TypeError):
            pass

    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay plan de partido generado")

    org_res = supabase.table("organizaciones").select(
        "nombre, color_primario, color_secundario, logo_url"
    ).eq("id", auth.organizacion_id).single().execute()
    organizacion = org_res.data or {}

    equipo_nombre = ""
    if partido_data.get("equipo_id"):
        eq_res = supabase.table("equipos").select("nombre").eq("id", partido_data["equipo_id"]).single().execute()
        equipo_nombre = eq_res.data.get("nombre", "") if eq_res.data else ""

    pdf_bytes = await asyncio.to_thread(
        generate_plan_partido_jugadores_pdf,
        plan=plan,
        partido=partido_data,
        rival=rival_data,
        organizacion=organizacion,
        equipo_nombre=equipo_nombre,
    )

    rival_nombre = rival_data.get("nombre", "rival").replace(" ", "_")
    filename = f"plan_jugadores_vs_{rival_nombre}_{partido_data.get('fecha', '')}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
