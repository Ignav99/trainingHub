"""Corrección de escritura para notas de entrenador (ortografía / gramática)."""

from __future__ import annotations

import logging
import re
from difflib import SequenceMatcher

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.dependencies import get_current_user
from app.models import UsuarioResponse
from app.services.ai_errors import AIError
from app.services.ai_factory import call_ai_with_fallback

logger = logging.getLogger(__name__)

router = APIRouter()

_MAX_CHARS = 4000
_MIN_CHARS = 12
_MIN_RATIO = 0.78


class EscrituraRequest(BaseModel):
    texto: str = Field(..., min_length=1, max_length=_MAX_CHARS)


class EscrituraResponse(BaseModel):
    texto: str
    cambiado: bool = False


def _clean_ai_text(raw: str, original: str) -> str:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
        text = text.strip()
    if (text.startswith('"') and text.endswith('"')) or (
        text.startswith("'") and text.endswith("'")
    ):
        text = text[1:-1].strip()
    if not text:
        return original
    return text


def is_conservative_correction(original: str, candidate: str, min_ratio: float = _MIN_RATIO) -> bool:
    if candidate == original:
        return False
    if not candidate or not original:
        return False
    ratio = SequenceMatcher(None, original, candidate).ratio()
    return ratio >= min_ratio


@router.post("/corregir", response_model=EscrituraResponse)
async def corregir_escritura(
    body: EscrituraRequest,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Pule notas de entrenador: ortografía, gramática y léxico de fútbol. Conservador."""
    texto = body.texto.strip()
    if len(texto) < _MIN_CHARS:
        return EscrituraResponse(texto=body.texto, cambiado=False)

    try:
        result = await call_ai_with_fallback(
            "correct_writing",
            texto=texto,
            use_fast_model=True,
        )
    except AIError as e:
        logger.warning("escritura.corregir AIError: %s", e)
        raise HTTPException(status_code=e.status_code or 502, detail=str(e))
    except Exception as e:
        logger.warning("escritura.corregir failed: %s", e)
        return EscrituraResponse(texto=body.texto, cambiado=False)

    proposed = _clean_ai_text(
        result.get("texto") if isinstance(result, dict) else "",
        texto,
    )
    if is_conservative_correction(texto, proposed):
        return EscrituraResponse(texto=proposed, cambiado=True)
    return EscrituraResponse(texto=body.texto, cambiado=False)
