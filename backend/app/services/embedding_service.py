"""
TrainingHub Pro - Embedding Service
Genera embeddings vectoriales para busqueda semantica en Knowledge Base.
Usa Google Gemini embedding model (dimension 768 -> padded to 1536 for pgvector).
"""

import logging
from typing import Optional

import google.generativeai as genai

from app.config import get_settings

logger = logging.getLogger(__name__)

# Gemini embedding model produces 768-dim vectors
# Our pgvector column is 1536-dim, so we pad with zeros
GEMINI_EMBEDDING_DIM = 768
TARGET_DIM = 1536


class EmbeddingError(Exception):
    """Error generating embeddings."""
    pass


def _get_client():
    """Initialize and return Gemini client."""
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise EmbeddingError("GEMINI_API_KEY no configurada")
    genai.configure(api_key=settings.GEMINI_API_KEY)


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
    _get_client()

    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="RETRIEVAL_DOCUMENT",
        )
        embedding = result["embedding"]
        return _pad_embedding(embedding)
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
    _get_client()

    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=query,
            task_type="RETRIEVAL_QUERY",
        )
        embedding = result["embedding"]
        return _pad_embedding(embedding)
    except Exception as e:
        logger.error(f"Error generating query embedding: {e}")
        raise EmbeddingError(f"Error generando embedding de busqueda: {str(e)}")


def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for multiple texts in batch.

    Args:
        texts: List of texts to embed

    Returns:
        List of embedding vectors (each 1536 dimensions)
    """
    _get_client()

    if not texts:
        return []

    try:
        # Gemini supports batch embedding
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=texts,
            task_type="RETRIEVAL_DOCUMENT",
        )
        embeddings = result["embedding"]

        # If single text, result is a single list, not list of lists
        if texts and isinstance(embeddings[0], float):
            embeddings = [embeddings]

        return [_pad_embedding(e) for e in embeddings]
    except Exception as e:
        logger.error(f"Error generating batch embeddings: {e}")
        raise EmbeddingError(f"Error generando embeddings en batch: {str(e)}")
