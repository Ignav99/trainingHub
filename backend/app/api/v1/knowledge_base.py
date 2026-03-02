"""
TrainingHub Pro - Router de Knowledge Base
Gestion de documentos y busqueda semantica con embeddings.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, Query, status, BackgroundTasks, UploadFile, File, Form
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
)
from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission
from app.security.license_checker import LicenseChecker
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
    auth: AuthContext = Depends(require_permission(Permission.KB_READ)),
):
    """Lista documentos de la base de conocimiento."""
    supabase = get_supabase()

    query = supabase.table("documentos_kb").select(
        "*", count="exact"
    ).eq("organizacion_id", auth.organizacion_id)

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
    auth: AuthContext = Depends(require_permission(Permission.KB_READ)),
):
    """Obtiene un documento por ID."""
    supabase = get_supabase()

    response = supabase.table("documentos_kb").select("*").eq(
        "id", str(documento_id)
    ).eq("organizacion_id", auth.organizacion_id).single().execute()

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
    auth: AuthContext = Depends(require_permission(Permission.KB_CREATE)),
):
    """
    Crea un documento en la base de conocimiento.
    Si tiene contenido_texto, la indexacion se ejecuta en background.
    """
    # Check KB documents quota
    allowed, msg = LicenseChecker.check_kb_documents_limit(auth.organizacion_id)
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)

    supabase = get_supabase()

    data = documento.model_dump(mode="json")
    data["organizacion_id"] = auth.organizacion_id

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
        bg_task_id = None
        try:
            task = task_service.create_task(
                tipo="indexar_documento",
                usuario_id=auth.user_id,
                organizacion_id=auth.organizacion_id,
                entidad_tipo="documento_kb",
                entidad_id=doc["id"],
            )
            bg_task_id = task["id"]
        except Exception as e:
            logger.warning(f"Could not create background task record: {e}")

        background_tasks.add_task(
            _indexar_documento_background,
            doc["id"],
            data["contenido_texto"],
            bg_task_id,
        )

    return DocumentoKBResponse(**doc)


@router.post("/documentos/upload", response_model=DocumentoKBResponse, status_code=status.HTTP_201_CREATED)
async def upload_documento_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    titulo: str = Form(...),
    auth: AuthContext = Depends(require_permission(Permission.KB_CREATE)),
):
    """
    Sube un archivo PDF y lo indexa en la base de conocimiento.
    Extrae el texto del PDF, lo guarda como documento y lanza indexacion en background.
    Acepta PDF. Max 1GB.
    """
    # Check KB documents quota
    allowed, msg = LicenseChecker.check_kb_documents_limit(auth.organizacion_id)
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)

    # Validate file type
    if not file.content_type or file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")

    content = await file.read()
    if len(content) > 1024 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no puede superar 1GB")

    # Extract text from PDF
    try:
        import io
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            text_parts = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text.strip())
            extracted_text = "\n\n".join(text_parts)
        except ImportError:
            # Fallback: try pdfplumber
            try:
                import pdfplumber
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    text_parts = []
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text_parts.append(page_text.strip())
                    extracted_text = "\n\n".join(text_parts)
            except ImportError:
                raise HTTPException(
                    status_code=500,
                    detail="No hay libreria de PDF instalada. Instala pypdf o pdfplumber."
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting PDF text: {e}")
        raise HTTPException(status_code=400, detail=f"Error al leer el PDF: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="No se pudo extraer texto del PDF. El archivo puede estar escaneado o protegido.")

    supabase = get_supabase()

    # Store the PDF in Supabase Storage
    storage_path = f"kb/{auth.organizacion_id}/{file.filename or 'documento.pdf'}"
    try:
        try:
            supabase.storage.from_("documentos").remove([storage_path])
        except Exception:
            pass
        supabase.storage.from_("documentos").upload(
            storage_path, content,
            file_options={"content-type": "application/pdf", "upsert": "true"},
        )
        archivo_url = supabase.storage.from_("documentos").get_public_url(storage_path)
    except Exception as e:
        logger.warning(f"Could not store PDF file: {e}")
        archivo_url = None

    # Create document record
    data = {
        "titulo": titulo,
        "tipo": "pdf",
        "contenido_texto": extracted_text,
        "estado": "pendiente",
        "organizacion_id": auth.organizacion_id,
        "fuente": file.filename,
        "archivo_url": archivo_url,
        "metadata": {"pages": len(text_parts), "size_bytes": len(content)},
    }

    response = supabase.table("documentos_kb").insert(data).execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Error al crear documento")

    doc = response.data[0]

    # Launch background indexing
    bg_task_id = None
    try:
        task = task_service.create_task(
            tipo="indexar_documento",
            usuario_id=auth.user_id,
            organizacion_id=auth.organizacion_id,
            entidad_tipo="documento_kb",
            entidad_id=doc["id"],
        )
        bg_task_id = task["id"]
    except Exception as e:
        logger.warning(f"Could not create background task record: {e}")

    background_tasks.add_task(
        _indexar_documento_background,
        doc["id"],
        extracted_text,
        bg_task_id,
    )

    return DocumentoKBResponse(**doc)


@router.post("/documentos/{documento_id}/indexar")
async def indexar_documento(
    documento_id: UUID,
    background_tasks: BackgroundTasks,
    auth: AuthContext = Depends(require_permission(Permission.KB_UPDATE)),
):
    """
    Indexa un documento: divide en chunks y genera embeddings vectoriales.
    La indexacion se ejecuta en background.
    """
    supabase = get_supabase()

    doc = supabase.table("documentos_kb").select("*").eq(
        "id", str(documento_id)
    ).eq("organizacion_id", auth.organizacion_id).single().execute()

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
    bg_task_id = None
    try:
        task = task_service.create_task(
            tipo="indexar_documento",
            usuario_id=auth.user_id,
            organizacion_id=auth.organizacion_id,
            entidad_tipo="documento_kb",
            entidad_id=str(documento_id),
        )
        bg_task_id = task["id"]
    except Exception as e:
        logger.warning(f"Could not create background task record: {e}")

    background_tasks.add_task(
        _indexar_documento_background,
        str(documento_id),
        doc.data["contenido_texto"],
        bg_task_id,
    )

    return {
        "message": "Indexacion iniciada en background",
        "documento_id": str(documento_id),
        "task_id": bg_task_id,
    }


@router.post("/reindexar-todo")
async def reindexar_todo(
    background_tasks: BackgroundTasks,
    auth: AuthContext = Depends(require_permission(Permission.KB_UPDATE)),
):
    """
    Re-indexa todos los documentos de la organizacion con el chunking y embeddings actuales.
    Util tras activar GEMINI_API_KEY o cambiar la estrategia de chunking.
    """
    supabase = get_supabase()

    # Get all indexed/error docs with text content
    docs = supabase.table("documentos_kb").select(
        "id, titulo, contenido_texto"
    ).eq(
        "organizacion_id", auth.organizacion_id
    ).in_("estado", ["indexado", "error", "pendiente"]).execute()

    if not docs.data:
        return {"message": "No hay documentos para re-indexar", "total": 0}

    docs_queued = 0
    for doc in docs.data:
        if not doc.get("contenido_texto"):
            continue

        # Mark as processing
        supabase.table("documentos_kb").update({
            "estado": "procesando"
        }).eq("id", doc["id"]).execute()

        bg_task_id = None
        try:
            task = task_service.create_task(
                tipo="reindexar_documento",
                usuario_id=auth.user_id,
                organizacion_id=auth.organizacion_id,
                entidad_tipo="documento_kb",
                entidad_id=doc["id"],
            )
            bg_task_id = task["id"]
        except Exception as e:
            logger.warning(f"Could not create background task record: {e}")

        background_tasks.add_task(
            _indexar_documento_background,
            doc["id"],
            doc["contenido_texto"],
            bg_task_id,
            doc.get("titulo"),
        )
        docs_queued += 1

    return {
        "message": f"Re-indexacion iniciada para {docs_queued} documentos",
        "total": docs_queued,
    }


@router.post("/buscar", response_model=KBSearchResponse)
async def search_kb(
    request: KBSearchRequest,
    auth: AuthContext = Depends(require_permission(Permission.KB_READ)),
):
    """
    Busqueda semantica en la base de conocimiento.
    Usa embeddings vectoriales (pgvector) si estan disponibles,
    con fallback a busqueda por texto.
    """
    supabase = get_supabase()
    settings = get_settings()
    org_id = auth.organizacion_id

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
    auth: AuthContext = Depends(require_permission(Permission.KB_DELETE)),
):
    """Elimina un documento y sus chunks."""
    supabase = get_supabase()

    supabase.table("documentos_kb").delete().eq(
        "id", str(documento_id)
    ).eq("organizacion_id", auth.organizacion_id).execute()

    return None


# ============ Helper Functions ============

def _indexar_documento_background(
    documento_id: str,
    texto: str,
    bg_task_id: str = None,
    doc_title: str = None,
):
    """
    Background task: split document into chunks with overlap and generate embeddings.
    Uses chunking_service for intelligent splitting with overlap.
    Tracks progress via task_service if bg_task_id is provided.
    """
    from app.services.chunking_service import split_into_chunks

    supabase = get_supabase()
    settings = get_settings()

    if bg_task_id:
        task_service.mark_started(bg_task_id, "Dividiendo documento en chunks...")

    try:
        # Split into chunks with overlap (800 chars, 100 overlap)
        chunk_dicts = split_into_chunks(
            texto, max_chars=800, overlap=100, doc_title=doc_title
        )

        if not chunk_dicts:
            supabase.table("documentos_kb").update({
                "estado": "error",
                "metadata": {"error": "No se generaron chunks"},
            }).eq("id", documento_id).execute()
            if bg_task_id:
                task_service.mark_failed(bg_task_id, "No se generaron chunks")
            return

        if bg_task_id:
            task_service.mark_progress(bg_task_id, 20, f"{len(chunk_dicts)} chunks generados")

        # Delete existing chunks (re-indexing)
        supabase.table("chunks_kb").delete().eq(
            "documento_id", documento_id
        ).execute()

        # Extract text contents for embedding
        chunk_texts = [c["contenido"] for c in chunk_dicts]

        # Generate embeddings if API available
        embeddings = None
        if settings.GEMINI_API_KEY:
            if bg_task_id:
                task_service.mark_progress(bg_task_id, 30, "Generando embeddings...")
            try:
                from app.services.embedding_service import generate_embeddings_batch
                embeddings = generate_embeddings_batch(chunk_texts)
            except Exception as e:
                logger.warning(f"Embedding generation failed, indexing without vectors: {e}")

        if bg_task_id:
            task_service.mark_progress(bg_task_id, 60, "Insertando chunks en BD...")

        # Insert chunks
        chunk_records = []
        for i, chunk_dict in enumerate(chunk_dicts):
            record = {
                "documento_id": documento_id,
                "contenido": chunk_dict["contenido"],
                "posicion": i,
                "metadata": chunk_dict["metadata"],
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
                "chunking": "overlap_800_100",
            },
        }).eq("id", documento_id).execute()

        logger.info(
            f"Document {documento_id} indexed: {len(chunk_records)} chunks "
            f"(800/100 overlap), embeddings={'yes' if has_embeddings else 'no'}"
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
    """Search using hybrid search (vector + text + RRF) with vector-only fallback."""
    from app.services.embedding_service import generate_query_embedding

    query_embedding = generate_query_embedding(query)
    supabase = get_supabase()

    # Try hybrid search first (vector + trigram + RRF)
    try:
        result = supabase.rpc("hybrid_search_kb", {
            "p_query_text": query,
            "p_query_embedding": query_embedding,
            "p_match_count": limite,
            "p_filter_doc_ids": doc_ids,
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
                similitud=round(row.get("rrf_score", 0) * 100, 1),  # Normalize for display
                documento_titulo=doc_map.get(row["documento_id"]),
            ))

        return KBSearchResponse(
            resultados=resultados,
            query=query,
            total=len(resultados),
        )
    except Exception as e:
        logger.warning(f"Hybrid search failed, falling back to vector-only: {e}")

    # Fallback: vector-only search
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
