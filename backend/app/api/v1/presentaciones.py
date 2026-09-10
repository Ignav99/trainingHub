"""Export a player-facing PowerPoint / Google Slides deck from informe or plan."""

from __future__ import annotations

import logging
import re
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.dependencies import AuthContext, require_permission
from app.security.permissions import Permission
from app.services.ai_errors import AIError
from app.services.ai_factory import call_ai_with_fallback
from app.services.presentacion_briefing import briefing_from_informe, briefing_from_plan
from app.services.presentacion_deck import fallback_deck
from app.services.presentacion_pptx import build_pptx_bytes

logger = logging.getLogger(__name__)

router = APIRouter()


class PresentacionMeta(BaseModel):
    rival_nombre: Optional[str] = None
    club_nombre: Optional[str] = None
    fecha: Optional[str] = None
    hora: Optional[str] = None
    campo: Optional[str] = None
    localia: Optional[str] = None
    tramo: Optional[str] = None
    color_primario: Optional[str] = None
    club_logo_url: Optional[str] = None
    rival_escudo_url: Optional[str] = None


class PresentacionExportRequest(BaseModel):
    tipo: Literal["informe", "plan"]
    data: dict[str, Any] = Field(default_factory=dict)
    meta: PresentacionMeta = Field(default_factory=PresentacionMeta)


def _filename(tipo: str, rival: str | None) -> str:
    slug = re.sub(
        r"[^a-z0-9]+",
        "-",
        (rival or "rival").lower().encode("ascii", "ignore").decode(),
    ).strip("-")[:40]
    kind = "informe-rival" if tipo == "informe" else "plan-partido"
    return f"{kind}-{slug or 'rival'}.pptx"


@router.post("/export")
async def export_presentacion(
    body: PresentacionExportRequest,
    auth: AuthContext = Depends(require_permission(Permission.RIVAL_READ)),
):
    """Sintetiza el dossier y devuelve un .pptx para la charla con jugadores."""
    meta = body.meta.model_dump()
    briefing = (
        briefing_from_informe(body.data, meta)
        if body.tipo == "informe"
        else briefing_from_plan(body.data, meta)
    )

    try:
        deck = await call_ai_with_fallback(
            "synthesize_presentacion",
            briefing=briefing,
            tipo=body.tipo,
            meta=meta,
        )
        if not isinstance(deck, dict) or not deck.get("slides"):
            deck = fallback_deck(briefing)
    except AIError as exc:
        logger.warning("presentacion AI fallback: %s", exc)
        deck = fallback_deck(briefing)
    except Exception:
        logger.exception("presentacion AI unexpected error")
        deck = fallback_deck(briefing)

    pptx = build_pptx_bytes(deck, meta)
    filename = _filename(body.tipo, body.meta.rival_nombre)
    return Response(
        content=pptx,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
