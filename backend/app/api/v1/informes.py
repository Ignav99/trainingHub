"""Gabinete de informes personalizados (PDF dossier)."""

from __future__ import annotations

import asyncio
import io
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.services.informe_service import (
    TIPOS_INFORME,
    generate_informe_pdf,
    listar_pizarras_microciclo,
)
from app.services.informe_spec import (
    InformeSpec,
    catalogo,
    interpretar_prompt_ai,
    parse_informe_prompt,
)
from app.services.informes_datos import (
    cabecera,
    datos_entrenamiento,
    datos_jugadores,
    datos_partido,
    datos_temporada,
)
from app.services.partido_ambito import AMBITO_LABELS, AMBITOS
from app.database import get_supabase

router = APIRouter()


class InterpretarBody(BaseModel):
    texto: str = Field(..., min_length=3, max_length=800)
    equipo_id: UUID


class InformePdfBody(InformeSpec):
    equipo_id: UUID
    preview: bool = False


def _pdf_response(pdf_bytes: bytes, filename: str, preview: bool) -> StreamingResponse:
    disposition = "inline" if preview else f'attachment; filename="{filename}"'
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": disposition,
            "X-PDF-Filename": filename,
        },
    )


@router.get("/plantillas")
async def listar_plantillas(
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    data = catalogo()
    data["plantillas"] = [{"id": k, "nombre": v} for k, v in TIPOS_INFORME.items()]
    data["ambitos"] = [{"id": k, "nombre": AMBITO_LABELS[k]} for k in AMBITOS]
    return data


@router.post("/interpretar")
async def interpretar_informe(
    body: InterpretarBody,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    supabase = get_supabase()
    jug_data: list = []
    micros_data: list = []
    try:
        jug = (
            supabase.table("jugadores")
            .select("id, nombre, apellidos, apodo")
            .eq("equipo_id", str(body.equipo_id))
            .eq("es_invitado", False)
            .limit(80)
            .execute()
        )
        jug_data = jug.data or []
    except Exception:
        jug_data = []
    try:
        micros = (
            supabase.table("microciclos")
            .select("id, fecha_inicio, fecha_fin, objetivo_principal")
            .eq("equipo_id", str(body.equipo_id))
            .order("fecha_inicio", desc=True)
            .limit(12)
            .execute()
        )
        micros_data = micros.data or []
    except Exception:
        micros_data = []
    spec = parse_informe_prompt(
        body.texto,
        jugadores=jug_data,
        microciclos=micros_data,
    )
    try:
        spec = await asyncio.wait_for(
            interpretar_prompt_ai(body.texto, spec, jugadores=jug_data),
            timeout=8,
        )
    except Exception:
        pass
    return {"spec": spec.model_dump(mode="json"), "fuente": "pedido"}


@router.get("/microciclo/{microciclo_id}/pizarras")
async def pizarras_microciclo(
    microciclo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """Elementos de cada pizarra (sin JPEG) para recapturar la foto del editor."""
    del auth
    data = listar_pizarras_microciclo(get_supabase(), str(microciclo_id))
    return {"data": data}


@router.post("/pdf")
async def generar_informe_post(
    body: InformePdfBody,
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    spec = InformeSpec(**body.model_dump(exclude={"equipo_id", "preview"})).normalized()
    if spec.asunto == "jugador" and not spec.jugador_id:
        raise HTTPException(status_code=400, detail="Indica el jugador")
    if spec.asunto == "microciclo" and not spec.microciclo_id:
        raise HTTPException(status_code=400, detail="Indica el microciclo")
    try:
        pdf_bytes, filename = await generate_informe_pdf(
            equipo_id=str(body.equipo_id),
            organizacion_id=str(auth.organizacion_id),
            spec=spec,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando informe: {e}") from e
    return _pdf_response(pdf_bytes, filename, body.preview)


def _org_del_equipo(supabase, equipo_id: UUID, auth: AuthContext) -> str:
    rows = (
        supabase.table("equipos").select("organizacion_id").eq("id", str(equipo_id)).limit(1).execute().data
        or []
    )
    org = str(rows[0].get("organizacion_id")) if rows else ""
    superadmin = getattr(auth.user, "rol", None) == "superadmin_plataforma"
    if not org or (org != str(auth.organizacion_id) and not superadmin):
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return org


@router.get("/datos/partido")
async def datos_informe_partido(
    equipo_id: UUID = Query(...),
    partido_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    supabase = get_supabase()
    org = _org_del_equipo(supabase, equipo_id, auth)
    try:
        data = await asyncio.to_thread(datos_partido, supabase, str(equipo_id), str(partido_id))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return {**cabecera(supabase, org, str(equipo_id)), **data}


@router.get("/datos/entrenamiento")
async def datos_informe_entrenamiento(
    equipo_id: UUID = Query(...),
    microciclo_id: Optional[UUID] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    supabase = get_supabase()
    org = _org_del_equipo(supabase, equipo_id, auth)
    try:
        data = await asyncio.to_thread(
            datos_entrenamiento,
            supabase,
            str(equipo_id),
            str(microciclo_id) if microciclo_id else None,
            fecha_desde,
            fecha_hasta,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return {**cabecera(supabase, org, str(equipo_id)), **data}


@router.get("/datos/jugadores")
async def datos_informe_jugadores(
    equipo_id: UUID = Query(...),
    jugador_ids: Optional[str] = Query(None, description="ids separados por coma; vacío = toda la plantilla"),
    ambito: str = Query("competicion"),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    supabase = get_supabase()
    org = _org_del_equipo(supabase, equipo_id, auth)
    ids = [i.strip() for i in (jugador_ids or "").split(",") if i.strip()] or None
    perms = auth.permissions or set()
    data = await asyncio.to_thread(
        datos_jugadores,
        supabase,
        str(equipo_id),
        ids,
        ambito,
        fecha_desde,
        fecha_hasta,
        con_rpe=Permission.RPE_READ in perms,
        con_medico=bool({Permission.MEDICAL_READ, Permission.MEDICAL_READ_SUMMARY} & perms),
    )
    return {**cabecera(supabase, org, str(equipo_id)), **data}


@router.get("/datos/temporada")
async def datos_informe_temporada(
    equipo_id: UUID = Query(...),
    ambito: str = Query("competicion"),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    supabase = get_supabase()
    org = _org_del_equipo(supabase, equipo_id, auth)
    data = await asyncio.to_thread(
        datos_temporada, supabase, str(equipo_id), ambito, fecha_desde, fecha_hasta
    )
    return {**cabecera(supabase, org, str(equipo_id)), **data}


@router.get("/pdf")
async def descargar_informe(
    tipo: str = Query("temporada"),
    equipo_id: UUID = Query(...),
    ambito: str = Query("competicion"),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    jugador_id: Optional[UUID] = Query(None),
    microciclo_id: Optional[UUID] = Query(None),
    profundidad: str = Query("estandar"),
    preview: bool = Query(False),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    if tipo not in TIPOS_INFORME:
        raise HTTPException(status_code=400, detail="Plantilla de informe no válida")
    if tipo == "jugador" and not jugador_id:
        raise HTTPException(status_code=400, detail="Indica el jugador")
    if tipo == "microciclo" and not microciclo_id:
        raise HTTPException(status_code=400, detail="Indica el microciclo")
    try:
        pdf_bytes, filename = await generate_informe_pdf(
            tipo=tipo,
            equipo_id=str(equipo_id),
            organizacion_id=str(auth.organizacion_id),
            ambito=ambito,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            jugador_id=str(jugador_id) if jugador_id else None,
            microciclo_id=str(microciclo_id) if microciclo_id else None,
            profundidad=profundidad,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando informe: {e}") from e
    return _pdf_response(pdf_bytes, filename, preview)
