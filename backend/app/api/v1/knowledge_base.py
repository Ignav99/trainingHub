"""
TrainingHub Pro - Router de Knowledge Base
Gestión de documentos y búsqueda semántica.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status, UploadFile, File
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
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """
    Crea un documento en la base de conocimiento.
    El procesamiento/indexación se realiza de forma asíncrona.
    """
    supabase = get_supabase()

    data = documento.model_dump(mode="json")
    data["organizacion_id"] = str(current_user.organizacion_id)

    # Si tiene contenido_texto, marcarlo como pendiente de indexación
    if data.get("contenido_texto"):
        data["estado"] = "pendiente"

    response = supabase.table("documentos_kb").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear documento"
        )

    return DocumentoKBResponse(**response.data[0])


@router.post("/documentos/{documento_id}/indexar")
async def indexar_documento(
    documento_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """
    Indexa un documento: divide en chunks y genera embeddings.
    Requiere contenido_texto en el documento.
    """
    supabase = get_supabase()

    # Obtener documento
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

    # Marcar como procesando
    supabase.table("documentos_kb").update({
        "estado": "procesando"
    }).eq("id", str(documento_id)).execute()

    try:
        texto = doc.data["contenido_texto"]

        # Dividir en chunks (por párrafos, ~500 chars)
        chunks = _split_into_chunks(texto, max_chars=500)

        # Insertar chunks (sin embeddings por ahora)
        chunk_records = []
        for i, chunk_text in enumerate(chunks):
            chunk_records.append({
                "documento_id": str(documento_id),
                "contenido": chunk_text,
                "posicion": i,
                "metadata": {"chars": len(chunk_text)},
            })

        if chunk_records:
            supabase.table("chunks_kb").insert(chunk_records).execute()

        # Actualizar documento
        supabase.table("documentos_kb").update({
            "estado": "indexado",
            "num_chunks": len(chunk_records),
        }).eq("id", str(documento_id)).execute()

        return {
            "message": "Documento indexado",
            "num_chunks": len(chunk_records),
        }

    except Exception as e:
        supabase.table("documentos_kb").update({
            "estado": "error",
            "metadata": {"error": str(e)},
        }).eq("id", str(documento_id)).execute()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al indexar documento: {str(e)}"
        )


@router.post("/buscar", response_model=KBSearchResponse)
async def search_kb(
    request: KBSearchRequest,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """
    Búsqueda en la base de conocimiento.
    Por ahora búsqueda por texto; cuando se integren embeddings
    se usará búsqueda vectorial con pgvector.
    """
    supabase = get_supabase()

    # Obtener documentos de la organización
    docs = supabase.table("documentos_kb").select("id, titulo").eq(
        "organizacion_id", str(current_user.organizacion_id)
    ).eq("estado", "indexado").execute()

    doc_ids = [d["id"] for d in docs.data]
    doc_map = {d["id"]: d["titulo"] for d in docs.data}

    if not doc_ids:
        return KBSearchResponse(resultados=[], query=request.query, total=0)

    # Búsqueda por texto en chunks
    query = supabase.table("chunks_kb").select("*").in_(
        "documento_id", doc_ids
    ).ilike("contenido", f"%{request.query}%").limit(request.limite).execute()

    resultados = []
    for chunk in query.data:
        resultados.append(KBSearchResult(
            chunk=ChunkKBResponse(**chunk),
            similitud=0.5,  # Placeholder hasta tener embeddings
            documento_titulo=doc_map.get(chunk["documento_id"]),
        ))

    return KBSearchResponse(
        resultados=resultados,
        query=request.query,
        total=len(resultados),
    )


@router.delete("/documentos/{documento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_documento(
    documento_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Elimina un documento y sus chunks."""
    supabase = get_supabase()

    # Chunks se eliminan en cascada por FK
    supabase.table("documentos_kb").delete().eq(
        "id", str(documento_id)
    ).eq("organizacion_id", str(current_user.organizacion_id)).execute()

    return None


def _split_into_chunks(text: str, max_chars: int = 500) -> list[str]:
    """Divide texto en chunks por párrafos."""
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

    # Si no hay párrafos, dividir por caracteres
    if not chunks and text.strip():
        for i in range(0, len(text), max_chars):
            chunks.append(text[i:i + max_chars].strip())

    return chunks
