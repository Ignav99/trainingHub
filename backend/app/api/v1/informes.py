"""Gabinete de informes personalizados (PDF dossier)."""

from __future__ import annotations

import io
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.services.informe_service import TIPOS_INFORME, generate_informe_pdf
from app.services.partido_ambito import AMBITO_LABELS, AMBITOS

router = APIRouter()


@router.get("/plantillas")
async def listar_plantillas(
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    return {
        "plantillas": [
            {"id": k, "nombre": v}
            for k, v in TIPOS_INFORME.items()
        ],
        "ambitos": [
            {"id": k, "nombre": AMBITO_LABELS[k]}
            for k in AMBITOS
        ],
    }


@router.get("/pdf")
async def descargar_informe(
    tipo: str = Query("temporada"),
    equipo_id: UUID = Query(...),
    ambito: str = Query("competicion"),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    jugador_id: Optional[UUID] = Query(None),
    microciclo_id: Optional[UUID] = Query(None),
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
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando informe: {e}") from e

    disposition = "inline" if preview else f'attachment; filename="{filename}"'
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": disposition,
            "X-PDF-Filename": filename,
        },
    )
