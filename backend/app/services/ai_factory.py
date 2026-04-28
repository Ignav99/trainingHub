"""
TrainingHub Pro - AI Factory
Multi-provider chain: tries each provider in order, falls through on 429/503.
Default chain: deepseek → cerebras → groq → claude
Backward compatible: if only ANTHROPIC_API_KEY is set, works exactly as before.
"""

import logging
from typing import Any

from app.config import get_settings
from app.services.ai_errors import AIError

logger = logging.getLogger(__name__)

_FALLBACK_CODES = {429, 503}

# Provider config: maps provider name → (key_attr, service_factory_args)
_PROVIDER_REGISTRY = {
    "deepseek": {
        "key_attr": "DEEPSEEK_API_KEY",
        "base_url_attr": "DEEPSEEK_BASE_URL",
        "model_attr": "DEEPSEEK_MODEL",
    },
    "cerebras": {
        "key_attr": "CEREBRAS_API_KEY",
        "base_url_attr": "CEREBRAS_BASE_URL",
        "model_attr": "CEREBRAS_MODEL",
    },
    "groq": {
        "key_attr": "GROQ_API_KEY",
        "base_url_attr": "GROQ_BASE_URL",
        "model_attr": "GROQ_MODEL",
    },
}


def _build_provider_chain() -> list[tuple[str, Any]]:
    """Build ordered list of (provider_name, service_instance) from AI_PROVIDER_CHAIN.

    Only includes providers that have valid API keys configured.
    """
    settings = get_settings()
    chain_str = settings.AI_PROVIDER_CHAIN
    provider_names = [p.strip().lower() for p in chain_str.split(",") if p.strip()]

    chain = []
    for name in provider_names:
        if name in ("claude", "anthropic"):
            if settings.ANTHROPIC_API_KEY:
                chain.append(("claude", None))  # Lazily created
        elif name in _PROVIDER_REGISTRY:
            reg = _PROVIDER_REGISTRY[name]
            api_key = getattr(settings, reg["key_attr"], None)
            if api_key:
                chain.append((name, {
                    "api_key": api_key,
                    "base_url": getattr(settings, reg["base_url_attr"]),
                    "model": getattr(settings, reg["model_attr"]),
                }))
        else:
            logger.warning(f"Unknown AI provider in chain: {name}")

    if not chain:
        # Fallback: if nothing configured, try Claude
        if settings.ANTHROPIC_API_KEY:
            chain.append(("claude", None))
        else:
            logger.error("No AI providers configured! Set at least one API key.")

    return chain


def _get_service(provider_name: str, config: dict | None, model_override: str | None = None):
    """Create a service instance for the given provider."""
    if provider_name == "claude":
        from app.services.claude_service import ClaudeService
        if model_override:
            return ClaudeService(model=model_override)
        return ClaudeService()
    else:
        from app.services.openai_compatible_service import OpenAICompatibleService
        return OpenAICompatibleService(
            api_key=config["api_key"],
            base_url=config["base_url"],
            model=model_override or config["model"],
            provider_name=provider_name,
        )


def get_ai_service():
    """Return the primary AI service (first in chain)."""
    chain = _build_provider_chain()
    if not chain:
        raise AIError("No AI providers configured", status_code=500, provider="none")
    name, config = chain[0]
    return _get_service(name, config)


async def call_ai_with_fallback(method_name: str, *, use_fast_model: bool = False, **kwargs):
    """Call AI with automatic provider chain fallback on 429/503.

    Args:
        method_name: The method to call (e.g. 'chat', 'session_design_chat')
        use_fast_model: If True and provider is Claude, use Haiku
        **kwargs: Arguments passed to the method

    Returns:
        The result from whichever provider succeeded, with 'provider' field added.

    Raises:
        AIError: If all providers fail.
    """
    chain = _build_provider_chain()
    if not chain:
        raise AIError("No AI providers configured", status_code=500, provider="none")

    last_error = None

    for i, (provider_name, config) in enumerate(chain):
        try:
            # For Claude, support fast model (Haiku)
            model_override = None
            if use_fast_model and provider_name == "claude":
                settings = get_settings()
                model_override = settings.CLAUDE_MODEL_FAST

            service = _get_service(provider_name, config, model_override)
            method = getattr(service, method_name, None)
            if method is None:
                logger.warning(f"Provider {provider_name} does not support method {method_name}")
                continue

            result = await method(**kwargs)

            # Add provider info to result if it's a dict
            if isinstance(result, dict):
                result["provider"] = provider_name

            return result

        except AIError as e:
            last_error = e
            if e.status_code in _FALLBACK_CODES and i < len(chain) - 1:
                logger.warning(
                    "Provider %s failed with %d, trying next: %s",
                    provider_name, e.status_code, e.message[:100],
                )
                continue
            else:
                raise

        except Exception as e:
            last_error = AIError(
                f"Provider {provider_name} error: {str(e)[:200]}",
                status_code=500,
                provider=provider_name,
            )
            if i < len(chain) - 1:
                logger.warning(f"Provider {provider_name} failed unexpectedly, trying next: {e}")
                continue
            raise last_error

    # Should not reach here, but just in case
    raise last_error or AIError("All AI providers failed", status_code=503, provider="chain")


async def generate_diagram(titulo: str, descripcion: str, **kwargs) -> dict | None:
    """Generate a diagram using the provider chain."""
    chain = _build_provider_chain()

    for i, (provider_name, config) in enumerate(chain):
        try:
            if provider_name == "claude":
                from app.services.claude_service import generate_diagram_data
                result = await generate_diagram_data(titulo, descripcion, **kwargs)
            else:
                from app.services.openai_compatible_service import OpenAICompatibleService
                service = OpenAICompatibleService(
                    api_key=config["api_key"],
                    base_url=config["base_url"],
                    model=config["model"],
                    provider_name=provider_name,
                )
                result = await service.generate_diagram(titulo, descripcion, **kwargs)

            if result and result.get("elements"):
                return result
        except Exception as e:
            logger.warning(f"{provider_name} diagram generation failed: {e}")
            if i < len(chain) - 1:
                continue
            return None

    return None
