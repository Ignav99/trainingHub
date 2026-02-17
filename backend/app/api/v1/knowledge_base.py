"""
TrainingHub Pro - Router de Knowledge Base
Gestion de documentos y busqueda semantica con embeddings.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, Query, status, BackgroundTasks
from typing import Optional
from uuid import UUID
from math import ceil

from app.models import (
    DocumentoKBCreate,
    DocumentoKBResponse,
    KBSearchRequest,
    KBSearchResponse,
    KBSearchResult,
    ChunkKBResponse,
    UsuarioResponse,
)
from app.database import get_supabase
from app.dependencies import get_current_user
from app.config import get_settings
from app.services import task_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/documentos")
async def list_documentos(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    busqueda: Optional[str] = None,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Lista documentos de la base de conocimiento."""
    supabase = get_supabase()

    query = supabase.table("documentos_kb").select(
        "*", count="exact"
    ).eq("organizacion_id", str(current_user.organizacion_id))

    if tipo:
        query = query.eq("tipo", tipo)

    if estado:
        query = query.eq("estado", estado)

    if busqueda:
        query = query.ilike("titulo", f"%{busqueda}%")

    query = query.order("created_at", desc=True)

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    return {
        "data": [DocumentoKBResponse(**d) for d in response.data],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }


@router.get("/documentos/{documento_id}", response_model=DocumentoKBResponse)
async def get_documento(
    documento_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Obtiene un documento por ID."""
    supabase = get_supabase()

    response = supabase.table("documentos_kb").select("*").eq(
        "id", str(documento_id)
    ).eq("organizacion_id", str(current_user.organizacion_id)).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )

    return DocumentoKBResponse(**response.data)


@router.post("/documentos", response_model=DocumentoKBResponse, status_code=status.HTTP_201_CREATED)
async def create_documento(
    documento: DocumentoKBCreate,
    background_tasks: BackgroundTasks,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """
    Crea un documento en la base de conocimiento.
    Si tiene contenido_texto, la indexacion se ejecuta en background.
    """
    supabase = get_supabase()

    data = documento.model_dump(mode="json")
    data["organizacion_id"] = str(current_user.organizacion_id)

    if data.get("contenido_texto"):
        data["estado"] = "pendiente"

    response = supabase.table("documentos_kb").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear documento"
        )

    doc = response.data[0]

    # Auto-index if it has text content
    if data.get("contenido_texto"):
        task = task_service.create_task(
            tipo="indexar_documento",
            usuario_id=str(current_user.id),
            organizacion_id=str(current_user.organizacion_id),
            entidad_tipo="documento_kb",
            entidad_id=doc["id"],
        )
        background_tasks.add_task(
            _indexar_documento_background,
            doc["id"],
            data["contenido_texto"],
            task["id"],
        )

    return DocumentoKBResponse(**doc)


@router.post("/documentos/{documento_id}/indexar")
async def indexar_documento(
    documento_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """
    Indexa un documento: divide en chunks y genera embeddings vectoriales.
    La indexacion se ejecuta en background.
    """
    supabase = get_supabase()

    doc = supabase.table("documentos_kb").select("*").eq(
        "id", str(documento_id)
    ).eq("organizacion_id", str(current_user.organizacion_id)).single().execute()

    if not doc.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado"
        )

    if not doc.data.get("contenido_texto"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El documento no tiene contenido de texto"
        )

    # Mark as processing
    supabase.table("documentos_kb").update({
        "estado": "procesando"
    }).eq("id", str(documento_id)).execute()

    # Run indexation in background
    task = task_service.create_task(
        tipo="indexar_documento",
        usuario_id=str(current_user.id),
        organizacion_id=str(current_user.organizacion_id),
        entidad_tipo="documento_kb",
        entidad_id=str(documento_id),
    )
    background_tasks.add_task(
        _indexar_documento_background,
        str(documento_id),
        doc.data["contenido_texto"],
        task["id"],
    )

    return {
        "message": "Indexacion iniciada en background",
        "documento_id": str(documento_id),
        "task_id": task["id"],
    }


@router.post("/buscar", response_model=KBSearchResponse)
async def search_kb(
    request: KBSearchRequest,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """
    Busqueda semantica en la base de conocimiento.
    Usa embeddings vectoriales (pgvector) si estan disponibles,
    con fallback a busqueda por texto.
    """
    supabase = get_supabase()
    settings = get_settings()
    org_id = str(current_user.organizacion_id)

    # Get indexed documents for org
    docs = supabase.table("documentos_kb").select("id, titulo").eq(
        "organizacion_id", org_id
    ).eq("estado", "indexado").execute()

    doc_ids = [d["id"] for d in docs.data]
    doc_map = {d["id"]: d["titulo"] for d in docs.data}

    if not doc_ids:
        return KBSearchResponse(resultados=[], query=request.query, total=0)

    # Try vector search if Gemini API is available
    if settings.GEMINI_API_KEY:
        try:
            return await _vector_search(
                request.query, doc_ids, doc_map, request.limite, org_id
            )
        except Exception as e:
            logger.warning(f"Vector search failed, falling back to text: {e}")

    # Fallback: text search
    return _text_search(request.query, doc_ids, doc_map, request.limite)


@router.delete("/documentos/{documento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_documento(
    documento_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Elimina un documento y sus chunks."""
    supabase = get_supabase()

    supabase.table("documentos_kb").delete().eq(
        "id", str(documento_id)
    ).eq("organizacion_id", str(current_user.organizacion_id)).execute()

    return None


# ============ Helper Functions ============

def _split_into_chunks(text: str, max_chars: int = 500) -> list[str]:
    """Divide texto en chunks por parrafos."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) + 2 > max_chars and current:
            chunks.append(current.strip())
            current = para
        else:
            current = f"{current}\n\n{para}" if current else para

    if current.strip():
        chunks.append(current.strip())

    if not chunks and text.strip():
        for i in range(0, len(text), max_chars):
            chunks.append(text[i:i + max_chars].strip())

    return chunks


def _indexar_documento_background(documento_id: str, texto: str, bg_task_id: str = None):
    """
    Background task: split document into chunks and generate embeddings.
    Tracks progress via task_service if bg_task_id is provided.
    """
    supabase = get_supabase()
    settings = get_settings()

    if bg_task_id:
        task_service.mark_started(bg_task_id, "Dividiendo documento en chunks...")

    try:
        # Split into chunks
        chunks = _split_into_chunks(texto, max_chars=500)

        if not chunks:
            supabase.table("documentos_kb").update({
                "estado": "error",
                "metadata": {"error": "No se generaron chunks"},
            }).eq("id", documento_id).execute()
            if bg_task_id:
                task_service.mark_failed(bg_task_id, "No se generaron chunks")
            return

        if bg_task_id:
            task_service.mark_progress(bg_task_id, 20, f"{len(chunks)} chunks generados")

        # Delete existing chunks (re-indexing)
        supabase.table("chunks_kb").delete().eq(
            "documento_id", documento_id
        ).execute()

        # Generate embeddings if API available
        embeddings = None
        if settings.GEMINI_API_KEY:
            if bg_task_id:
                task_service.mark_progress(bg_task_id, 30, "Generando embeddings...")
            try:
                from app.services.embedding_service import generate_embeddings_batch
                embeddings = generate_embeddings_batch(chunks)
            except Exception as e:
                logger.warning(f"Embedding generation failed, indexing without vectors: {e}")

        if bg_task_id:
            task_service.mark_progress(bg_task_id, 60, "Insertando chunks en BD...")

        # Insert chunks
        chunk_records = []
        for i, chunk_text in enumerate(chunks):
            record = {
                "documento_id": documento_id,
                "contenido": chunk_text,
                "posicion": i,
                "metadata": {"chars": len(chunk_text)},
            }
            if embeddings and i < len(embeddings):
                record["embedding"] = embeddings[i]

            chunk_records.append(record)

        # Insert in batches of 20 to avoid payload limits
        total_batches = max(1, len(chunk_records) // 20 + 1)
        for batch_idx, batch_start in enumerate(range(0, len(chunk_records), 20)):
            batch = chunk_records[batch_start:batch_start + 20]
            supabase.table("chunks_kb").insert(batch).execute()
            if bg_task_id:
                progress = 60 + int(30 * (batch_idx + 1) / total_batches)
                task_service.mark_progress(bg_task_id, progress, f"Batch {batch_idx + 1}/{total_batches}")

        # Update document status
        has_embeddings = embeddings is not None
        supabase.table("documentos_kb").update({
            "estado": "indexado",
            "num_chunks": len(chunk_records),
            "metadata": {
                "has_embeddings": has_embeddings,
                "embedding_model": "text-embedding-004" if has_embeddings else None,
            },
        }).eq("id", documento_id).execute()

        logger.info(
            f"Document {documento_id} indexed: {len(chunk_records)} chunks, "
            f"embeddings={'yes' if has_embeddings else 'no'}"
        )

        if bg_task_id:
            task_service.mark_completed(bg_task_id, resultado={
                "documento_id": documento_id,
                "num_chunks": len(chunk_records),
                "has_embeddings": has_embeddings,
            })

    except Exception as e:
        logger.error(f"Error indexing document {documento_id}: {e}")
        supabase.table("documentos_kb").update({
            "estado": "error",
            "metadata": {"error": str(e)},
        }).eq("id", documento_id).execute()
        if bg_task_id:
            task_service.mark_failed(bg_task_id, str(e))


async def _vector_search(
    query: str,
    doc_ids: list[str],
    doc_map: dict[str, str],
    limite: int,
    org_id: str,
) -> KBSearchResponse:
    """Search using vector similarity (pgvector cosine distance)."""
    from app.services.embedding_service import generate_query_embedding

    query_embedding = generate_query_embedding(query)
    supabase = get_supabase()

    # Use Supabase RPC for vector similarity search
    # This requires a SQL function in the database
    result = supabase.rpc("search_kb_chunks", {
        "query_embedding": query_embedding,
        "match_count": limite,
        "filter_doc_ids": doc_ids,
    }).execute()

    resultados = []
    for row in result.data:
        resultados.append(KBSearchResult(
            chunk=ChunkKBResponse(
                id=row["id"],
                documento_id=row["documento_id"],
                contenido=row["contenido"],
                posicion=row["posicion"],
                metadata=row.get("metadata", {}),
                created_at=row["created_at"],
            ),
            similitud=round(1 - row.get("distance", 0.5), 3),
            documento_titulo=doc_map.get(row["documento_id"]),
        ))

    return KBSearchResponse(
        resultados=resultados,
        query=query,
        total=len(resultados),
    )


def _text_search(
    query: str,
    doc_ids: list[str],
    doc_map: dict[str, str],
    limite: int,
) -> KBSearchResponse:
    """Fallback text search using ILIKE."""
    supabase = get_supabase()

    response = supabase.table("chunks_kb").select("*").in_(
        "documento_id", doc_ids
    ).ilike("contenido", f"%{query}%").limit(limite).execute()

    resultados = []
    for chunk in response.data:
        resultados.append(KBSearchResult(
            chunk=ChunkKBResponse(**chunk),
            similitud=0.5,
            documento_titulo=doc_map.get(chunk["documento_id"]),
        ))

    return KBSearchResponse(
        resultados=resultados,
        query=query,
        total=len(resultados),
    )
