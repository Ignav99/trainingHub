"""
TrainingHub Pro - Embedding Service
Genera embeddings vectoriales para busqueda semantica en Knowledge Base.
Usa Google Gemini embedding model (dimension 768 -> padded to 1536 for pgvector).
"""

import logging
import time

from google import genai

from app.config import get_settings

logger = logging.getLogger(__name__)

# Retry config for rate limits (total max wait: 2+4+8 = 14s)
_MAX_RETRIES = 3
_BASE_DELAY = 2.0  # seconds

# Gemini embedding model: gemini-embedding-001 produces 3072-dim vectors
# Our pgvector column is 1536-dim, so we truncate to fit
GEMINI_EMBEDDING_DIM = 3072
TARGET_DIM = 1536
EMBEDDING_MODEL = "gemini-embedding-001"

# Singleton client
_client: genai.Client | None = None


class EmbeddingError(Exception):
    """Error generating embeddings."""
    pass


def _get_client() -> genai.Client:
    """Initialize and return Gemini client."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.GEMINI_API_KEY:
            raise EmbeddingError("GEMINI_API_KEY no configurada")
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _pad_embedding(embedding: list[float], target_dim: int = TARGET_DIM) -> list[float]:
    """Pad embedding to target dimension with zeros."""
    if len(embedding) >= target_dim:
        return embedding[:target_dim]
    return embedding + [0.0] * (target_dim - len(embedding))


def generate_embedding(text: str) -> list[float]:
    """
    Generate an embedding vector for a text string.

    Args:
        text: Text to embed (max ~2048 tokens)

    Returns:
        List of floats (1536 dimensions)
    """
    client = _get_client()

    try:
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
            config={"task_type": "RETRIEVAL_DOCUMENT"},
        )
        embedding = result.embeddings[0].values
        return _pad_embedding(list(embedding))
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise EmbeddingError(f"Error generando embedding: {str(e)}")


def generate_query_embedding(query: str) -> list[float]:
    """
    Generate an embedding for a search query.
    Uses RETRIEVAL_QUERY task type for better search results.

    Args:
        query: Search query text

    Returns:
        List of floats (1536 dimensions)
    """
    client = _get_client()

    try:
        results = _embed_with_retry([query], task_type="RETRIEVAL_QUERY")
        return results[0]
    except Exception as e:
        logger.error(f"Error generating query embedding: {e}")
        raise EmbeddingError(f"Error generando embedding de busqueda: {str(e)}")


def _embed_with_retry(texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
    """Call Gemini embed_content with retry on rate limit (429)."""
    client = _get_client()

    for attempt in range(_MAX_RETRIES):
        try:
            result = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=texts,
                config={"task_type": task_type},
            )
            embeddings = [list(e.values) for e in result.embeddings]
            return [_pad_embedding(e) for e in embeddings]
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "quota" in error_str.lower():
                delay = _BASE_DELAY * (2 ** attempt)
                logger.warning(f"Gemini rate limit hit, retrying in {delay:.1f}s (attempt {attempt + 1}/{_MAX_RETRIES})")
                time.sleep(delay)
                continue
            raise
    raise EmbeddingError("Gemini rate limit: max retries exceeded")


FASE_JUEGO_LABELS = {
    "ataque_organizado": "Ataque organizado",
    "defensa_organizada": "Defensa organizada",
    "transicion_ataque_defensa": "Transición ataque-defensa",
    "transicion_defensa_ataque": "Transición defensa-ataque",
    "balon_parado_ofensivo": "Balón parado ofensivo",
    "balon_parado_defensivo": "Balón parado defensivo",
}


def build_tarea_embedding_text(tarea: dict) -> str:
    """
    Build a single text string from a tarea dict for embedding generation.
    Concatenates key fields to capture the semantic meaning of the task.
    """
    parts = []

    if tarea.get("titulo"):
        parts.append(tarea["titulo"])

    if tarea.get("descripcion"):
        parts.append(tarea["descripcion"])

    fase = tarea.get("fase_juego")
    if fase:
        parts.append(FASE_JUEGO_LABELS.get(fase, fase.replace("_", " ")))

    for field in ["principio_tactico", "subprincipio_tactico"]:
        val = tarea.get(field)
        if val:
            parts.append(val)

    for field in [
        "reglas_tecnicas", "reglas_tacticas",
        "consignas_ofensivas", "consignas_defensivas", "variantes",
    ]:
        val = tarea.get(field)
        if val and isinstance(val, list):
            parts.append(". ".join(str(v) for v in val if v))

    return " | ".join(parts)


def generate_embeddings_batch(texts: list[str], batch_size: int = 10) -> list[list[float]]:
    """
    Generate embeddings for multiple texts in small batches with rate limit handling.

    Args:
        texts: List of texts to embed
        batch_size: Texts per API call (small to avoid rate limits)

    Returns:
        List of embedding vectors (each 1536 dimensions)
    """
    if not texts:
        return []

    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        try:
            batch_embeddings = _embed_with_retry(batch)
            all_embeddings.extend(batch_embeddings)
        except Exception as e:
            logger.error(f"Error generating batch embeddings (batch {i // batch_size + 1}): {e}")
            raise EmbeddingError(f"Error generando embeddings en batch: {str(e)}")

        # Small delay between batches to stay under rate limits
        if i + batch_size < len(texts):
            time.sleep(0.5)

    return all_embeddings
