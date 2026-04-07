"""
Kabin-e AI Factory
Primary: Claude Sonnet. Fallback: Claude Haiku (cheaper, faster).
On 429/503 from Sonnet, automatically retries with Haiku.
"""

import logging

from app.config import get_settings
from app.services.ai_errors import AIError

logger = logging.getLogger(__name__)

_FALLBACK_CODES = {429, 503}


def get_ai_service():
    """Return ClaudeService with the configured primary model (Sonnet)."""
    from app.services.claude_service import ClaudeService
    return ClaudeService()


def _get_fallback_service():
    """Return ClaudeService with the fast/cheap model (Haiku)."""
    from app.services.claude_service import ClaudeService
    settings = get_settings()
    return ClaudeService(model=settings.CLAUDE_MODEL_FAST)


async def call_ai_with_fallback(method_name: str, *, use_fast_model: bool = False, **kwargs):
    """Call AI with automatic Sonnet → Haiku fallback on 429/503.

    Args:
        method_name: The method to call (e.g. 'pre_match_chat', 'ask')
        use_fast_model: If True, use Haiku directly (faster, cheaper)
        **kwargs: Arguments passed to the method

    Returns:
        The result from whichever model succeeded.

    Raises:
        AIError: If both models fail.
    """
    if use_fast_model:
        primary = _get_fallback_service()  # Haiku
    else:
        primary = get_ai_service()  # Sonnet

    try:
        method = getattr(primary, method_name)
        return await method(**kwargs)
    except AIError as e:
        if e.status_code not in _FALLBACK_CODES:
            raise

        logger.warning(
            "Claude %s failed with %d, trying Haiku fallback: %s",
            primary.model, e.status_code, e.message[:100],
        )

    # Retry with Haiku
    try:
        fallback = _get_fallback_service()
        logger.info("Falling back to %s", fallback.model)
        method = getattr(fallback, method_name)
        return await method(**kwargs)
    except AIError:
        raise
    except Exception as e:
        raise AIError(
            f"Ambos modelos Claude fallaron. Último error: {str(e)[:200]}",
            status_code=503,
            provider="claude",
        )


async def generate_diagram(
    titulo: str,
    descripcion: str,
    **kwargs,
) -> dict | None:
    """Generate a diagram using Claude."""
    try:
        from app.services.claude_service import generate_diagram_data
        result = await generate_diagram_data(titulo, descripcion, **kwargs)
        if result and result.get("elements"):
            return result
    except Exception as e:
        logger.warning("Claude diagram generation failed: %s", e)
        return None
