"""
TrainingHub Pro - AI Factory
Returns the active AI service (Gemini or Claude) based on AI_PROVIDER setting.
"""

from app.config import get_settings


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
