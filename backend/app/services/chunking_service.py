"""
TrainingHub Pro - Chunking Service
Divide textos en chunks optimizados para RAG con overlap y metadata.
"""

import re
from typing import Optional


def split_into_chunks(
    text: str,
    max_chars: int = 800,
    overlap: int = 100,
    doc_title: Optional[str] = None,
) -> list[dict]:
    """
    Divide texto en chunks con overlap para mejor contexto en RAG.

    Strategy:
    1. Split by paragraphs (\\n\\n)
    2. If paragraph > max_chars, split by sentences (. ? !)
    3. Overlap: last N chars of previous chunk repeat at start of next
    4. Each chunk includes positional metadata

    Args:
        text: Full document text
        max_chars: Maximum characters per chunk (default 800)
        overlap: Characters of overlap between consecutive chunks (default 100)
        doc_title: Optional document title for metadata

    Returns:
        List of dicts with 'contenido' and 'metadata' keys
    """
    if not text or not text.strip():
        return []

    # Step 1: Split into paragraphs
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    # Step 2: Build segments — break large paragraphs into sentences
    segments: list[str] = []
    for para in paragraphs:
        if len(para) <= max_chars:
            segments.append(para)
        else:
            # Split by sentence boundaries
            sentences = _split_sentences(para)
            for sentence in sentences:
                if len(sentence) <= max_chars:
                    segments.append(sentence)
                else:
                    # Last resort: hard split
                    for i in range(0, len(sentence), max_chars - overlap):
                        segments.append(sentence[i:i + max_chars])

    # Step 3: Merge segments into chunks respecting max_chars
    chunks: list[str] = []
    current = ""

    for seg in segments:
        if not current:
            current = seg
        elif len(current) + len(seg) + 2 <= max_chars:
            current = f"{current}\n\n{seg}"
        else:
            chunks.append(current.strip())
            current = seg

    if current.strip():
        chunks.append(current.strip())

    if not chunks:
        return []

    # Step 4: Apply overlap between consecutive chunks
    overlapped_chunks = _apply_overlap(chunks, overlap)

    # Step 5: Build result with metadata
    total_chunks = len(overlapped_chunks)
    results = []
    char_offset = 0

    for i, chunk_text in enumerate(overlapped_chunks):
        metadata = {
            "position": i,
            "total_chunks": total_chunks,
            "chars": len(chunk_text),
            "char_offset": char_offset,
        }

        if doc_title:
            metadata["doc_title"] = doc_title

        # Estimate section from first line
        first_line = chunk_text.split("\n")[0][:80]
        if first_line:
            metadata["section_hint"] = first_line

        results.append({
            "contenido": chunk_text,
            "metadata": metadata,
        })

        # Track approximate offset (not exact due to overlap)
        char_offset += len(chunk_text) - overlap if i < total_chunks - 1 else len(chunk_text)

    return results


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences preserving boundaries."""
    # Split on sentence endings followed by space or end of string
    parts = re.split(r'(?<=[.!?])\s+', text)
    return [p.strip() for p in parts if p.strip()]


def _apply_overlap(chunks: list[str], overlap: int) -> list[str]:
    """Apply overlap between consecutive chunks."""
    if overlap <= 0 or len(chunks) <= 1:
        return chunks

    result = [chunks[0]]

    for i in range(1, len(chunks)):
        prev = chunks[i - 1]
        # Take last `overlap` chars from previous chunk as prefix
        overlap_text = prev[-overlap:] if len(prev) >= overlap else prev

        # Find a clean break point (word boundary) in the overlap
        space_idx = overlap_text.find(" ")
        if space_idx > 0:
            overlap_text = overlap_text[space_idx + 1:]

        result.append(f"{overlap_text}... {chunks[i]}")

    return result
