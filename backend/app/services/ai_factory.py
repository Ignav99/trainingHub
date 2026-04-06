"""
TrainingHub Pro - AI Factory
Returns the active AI service (Gemini or Claude) based on AI_PROVIDER setting.
Supports automatic fallback when primary provider is unavailable.
"""

import logging

from app.config import get_settings
from app.services.ai_errors import AIError

logger = logging.getLogger(__name__)

# Transient status codes that trigger automatic fallback
_FALLBACK_CODES = {429, 503}


def get_ai_service():
    """Return the active AI service instance based on AI_PROVIDER config.

    Returns ClaudeService or GeminiService with identical interfaces.
    """
    settings = get_settings()
    provider = settings.AI_PROVIDER

    if provider == "gemini":
        from app.services.gemini_service import GeminiService
        return GeminiService()

    # Default: Claude
    from app.services.claude_service import ClaudeService
    return ClaudeService()


def _get_fallback_service():
    """Return the opposite provider as fallback."""
    settings = get_settings()
    provider = settings.AI_PROVIDER

    if provider == "gemini":
        from app.services.claude_service import ClaudeService
        return ClaudeService()

    from app.services.gemini_service import GeminiService
    return GeminiService()


async def call_ai_with_fallback(method_name: str, **kwargs):
    """Call an AI service method with automatic fallback on transient errors.

    Tries the primary provider first. If it fails with 429/503, retries
    with the other provider automatically.

    Args:
        method_name: The method to call (e.g. 'pre_match_chat', 'ask')
        **kwargs: Arguments passed to the method

    Returns:
        The result from whichever provider succeeded.

    Raises:
        AIError: If both providers fail.
    """
    primary = get_ai_service()
    primary_name = primary.__class__.__name__

    try:
        method = getattr(primary, method_name)
        return await method(**kwargs)
    except AIError as e:
        if e.status_code not in _FALLBACK_CODES:
            raise  # Non-transient error, don't fallback

        logger.warning(
            "%s failed with %d, trying fallback: %s",
            primary_name, e.status_code, e.message[:100],
        )

    # Try fallback
    try:
        fallback = _get_fallback_service()
        fallback_name = fallback.__class__.__name__
        logger.info("Falling back to %s", fallback_name)
        method = getattr(fallback, method_name)
        return await method(**kwargs)
    except AIError:
        raise
    except Exception as e:
        raise AIError(
            f"Ambos proveedores fallaron. Último error: {str(e)[:200]}",
            status_code=503,
            provider="fallback",
        )


async def generate_diagram(
    titulo: str,
    descripcion: str,
    **kwargs,
) -> dict | None:
    """Generate a diagram using Claude (always — more reliable JSON output).

    Falls back to Gemini if Claude fails (e.g. API key missing).
    """
    import logging
    logger = logging.getLogger(__name__)

    # Always try Claude first for diagram generation (superior JSON reliability)
    try:
        from app.services.claude_service import generate_diagram_data
        result = await generate_diagram_data(titulo, descripcion, **kwargs)
        if result and result.get("elements"):
            return result
    except Exception as e:
        logger.warning("Claude diagram generation failed, trying Gemini: %s", e)

    # Fallback to Gemini
    try:
        from app.services.gemini_service import generate_diagram_data_gemini
        return await generate_diagram_data_gemini(titulo, descripcion, **kwargs)
    except Exception as e:
        logger.warning("Gemini diagram generation also failed: %s", e)
        return None
