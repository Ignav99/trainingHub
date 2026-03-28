"""
TrainingHub Pro - Router de Tareas
CRUD completo para tareas de entrenamiento.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from math import ceil
import asyncio
import io
import logging

logger = logging.getLogger(__name__)

from app.models import (
    TareaCreate,
    TareaUpdate,
    TareaResponse,
    TareaListResponse,
    TareaFiltros,
    FaseJuego,
    NivelCognitivo,
    ZonaCuerpo,
    ObjetivoGym,
    AITareaNueva,
    UsuarioResponse,
)
from app.database import get_supabase
from app.dependencies import get_optional_user, require_permission, AuthContext
from app.security.permissions import Permission

# Mapeo de códigos cortos de IA a valores de BD para fase_juego
FASE_JUEGO_MAP = {
    "ATQ": "ataque_organizado",
    "DEF": "defensa_organizada",
    "TAD": "transicion_ataque_defensa",
    "TDA": "transicion_defensa_ataque",
    "BPO": "balon_parado_ofensivo",
    "BPD": "balon_parado_defensivo",
    # También aceptar valores completos
    "ataque_organizado": "ataque_organizado",
    "defensa_organizada": "defensa_organizada",
    "transicion_ataque_defensa": "transicion_ataque_defensa",
    "transicion_defensa_ataque": "transicion_defensa_ataque",
    "balon_parado_ofensivo": "balon_parado_ofensivo",
    "balon_parado_defensivo": "balon_parado_defensivo",
}

# Mapeo de densidad de IA a valores válidos de BD (alta, media, baja)
DENSIDAD_MAP = {
    "muy alta": "alta",
    "alta": "alta",
    "media": "media",
    "baja": "baja",
    "muy baja": "baja",
}

router = APIRouter()


def _generate_tarea_embedding(tarea_data: dict, tarea_id: str):
    """Generate and store embedding for a tarea. Non-fatal on failure."""
    try:
        from app.services.embedding_service import build_tarea_embedding_text, generate_embedding
        text = build_tarea_embedding_text(tarea_data)
        if text.strip():
            emb = generate_embedding(text)
            supabase = get_supabase()
            supabase.table("tareas").update({"embedding": emb}).eq("id", tarea_id).execute()
    except Exception as e:
        logger.warning(f"Failed to generate tarea embedding: {e}")


# ============ Semantic Search (registered BEFORE /{tarea_id}) ============

class SemanticSearchRequest(BaseModel):
    query: str
    limite: int = 15
    categoria: Optional[str] = None
    fase_juego: Optional[str] = None


class SemanticSearchResult(BaseModel):
    id: str
    titulo: str
    descripcion: Optional[str] = None
    categoria_codigo: Optional[str] = None
    categoria_nombre: Optional[str] = None
    duracion_total: Optional[int] = None
    num_jugadores_min: Optional[int] = None
    num_jugadores_max: Optional[int] = None
    num_porteros: Optional[int] = None
    densidad: Optional[str] = None
    nivel_cognitivo: Optional[int] = None
    fase_juego: Optional[str] = None
    principio_tactico: Optional[str] = None
    estructura_equipos: Optional[str] = None
    num_usos: Optional[int] = None
    relevance_pct: int = 0


class SemanticSearchResponse(BaseModel):
    data: List[SemanticSearchResult]
    total: int
    metodo: str


@router.post("/semantic-search", response_model=SemanticSearchResponse)
async def semantic_search_tareas(
    request: SemanticSearchRequest,
    auth: AuthContext = Depends(require_permission(Permission.TASK_READ)),
):
    """
    Semantic search over tarea library using embeddings + trigram hybrid search.
    Falls back to ILIKE keyword search if embedding generation fails.
    """
    if len(request.query.strip()) < 3:
        raise HTTPException(status_code=400, detail="La consulta debe tener al menos 3 caracteres")

    supabase = get_supabase()

    # Try hybrid search with embeddings
    try:
        from app.services.embedding_service import generate_query_embedding
        query_embedding = generate_query_embedding(request.query)

        rpc_params = {
            "p_query_text": request.query,
            "p_query_embedding": query_embedding,
            "p_organizacion_id": auth.organizacion_id,
            "p_match_count": min(request.limite, 50),
        }
        if request.categoria:
            rpc_params["p_categoria_codigo"] = request.categoria
        if request.fase_juego:
            rpc_params["p_fase_juego"] = request.fase_juego

        result = supabase.rpc("hybrid_search_tareas", rpc_params).execute()

        if result.data:
            return SemanticSearchResponse(
                data=[SemanticSearchResult(**r) for r in result.data],
                total=len(result.data),
                metodo="hybrid",
            )
    except Exception as e:
        logger.warning(f"Hybrid search failed, falling back to ILIKE: {e}")

    # Fallback: keyword ILIKE search
    query = supabase.table("tareas").select(
        "id, titulo, descripcion, duracion_total, num_jugadores_min, num_jugadores_max, "
        "num_porteros, densidad, nivel_cognitivo, fase_juego, principio_tactico, "
        "estructura_equipos, num_usos, categorias_tarea(codigo, nombre)"
    ).eq("organizacion_id", auth.organizacion_id)

    if request.categoria:
        query = query.eq("categorias_tarea.codigo", request.categoria)
    if request.fase_juego:
        query = query.eq("fase_juego", request.fase_juego)

    query = query.or_(
        f"titulo.ilike.%{request.query}%,descripcion.ilike.%{request.query}%"
    ).order("num_usos", desc=True).limit(request.limite)

    response = query.execute()
    results = []
    for t in response.data:
        cat = t.pop("categorias_tarea", None)
        results.append(SemanticSearchResult(
            **t,
            categoria_codigo=cat.get("codigo") if cat else None,
            categoria_nombre=cat.get("nombre") if cat else None,
            relevance_pct=50,  # Fixed score for keyword fallback
        ))

    return SemanticSearchResponse(
        data=results,
        total=len(results),
        metodo="keyword",
    )


@router.post("/backfill-embeddings")
async def backfill_tarea_embeddings(
    auth: AuthContext = Depends(require_permission(Permission.TASK_CREATE)),
):
    """
    Generate embeddings for all tareas that don't have one yet.
    Processes in batches of 10 to avoid rate limits.
    """
    supabase = get_supabase()

    # Get tareas without embeddings for this org
    response = supabase.table("tareas").select(
        "id, titulo, descripcion, fase_juego, principio_tactico, subprincipio_tactico, "
        "reglas_tecnicas, reglas_tacticas, consignas_ofensivas, consignas_defensivas, variantes"
    ).eq("organizacion_id", auth.organizacion_id).is_("embedding", "null").execute()

    if not response.data:
        return {"message": "No hay tareas sin embedding", "processed": 0}

    from app.services.embedding_service import build_tarea_embedding_text, generate_embeddings_batch

    texts = []
    ids = []
    for tarea in response.data:
        text = build_tarea_embedding_text(tarea)
        if text.strip():
            texts.append(text)
            ids.append(tarea["id"])

    if not texts:
        return {"message": "No hay tareas con contenido para generar embeddings", "processed": 0}

    try:
        embeddings = generate_embeddings_batch(texts, batch_size=10)
        updated = 0
        for tarea_id, emb in zip(ids, embeddings):
            try:
                supabase.table("tareas").update({"embedding": emb}).eq("id", tarea_id).execute()
                updated += 1
            except Exception as e:
                logger.warning(f"Failed to store embedding for tarea {tarea_id}: {e}")

        return {"message": f"Embeddings generados para {updated}/{len(ids)} tareas", "processed": updated, "total": len(ids)}
    except Exception as e:
        logger.error(f"Backfill embeddings failed: {e}")
        raise HTTPException(status_code=500, detail=f"Error generando embeddings: {str(e)}")


@router.get("", response_model=TareaListResponse)
async def list_tareas(
    # Paginación
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    # Filtros
    categoria: Optional[str] = None,
    fase_juego: Optional[FaseJuego] = None,
    principio_tactico: Optional[str] = None,
    jugadores_min: Optional[int] = Query(None, ge=1),
    jugadores_max: Optional[int] = Query(None, ge=1),
    duracion_min: Optional[int] = Query(None, ge=1),
    duracion_max: Optional[int] = Query(None, ge=1),
    nivel_cognitivo: Optional[NivelCognitivo] = None,
    densidad: Optional[str] = Query(None, pattern="^(alta|media|baja)$"),
    match_day: Optional[str] = Query(None, pattern="^MD[-+]?[0-4]?$"),
    tipo_esfuerzo: Optional[str] = None,
    solo_plantillas: bool = False,
    equipo_id: Optional[UUID] = None,
    busqueda: Optional[str] = None,
    # Filtros de preparación física
    es_complementaria: Optional[bool] = None,
    zona_cuerpo: Optional[ZonaCuerpo] = None,
    objetivo_gym: Optional[ObjetivoGym] = None,
    # Modo biblioteca: muestra TODAS las tareas públicas de TODOS los usuarios
    biblioteca: bool = False,
    # Ordenación
    orden: str = Query("created_at", pattern="^(created_at|titulo|duracion_total|num_usos|valoracion_media)$"),
    direccion: str = Query("desc", pattern="^(asc|desc)$"),
    # Auth (opcional - si no hay auth, devuelve solo tareas públicas)
    current_user = Depends(get_optional_user),
):
    """
    Lista tareas con filtros y paginación.

    - Sin autenticación: devuelve solo tareas públicas
    - Con autenticación: devuelve tareas de la organización del usuario
    - Con biblioteca=true: devuelve TODAS las tareas públicas (biblioteca compartida)

    - **categoria**: Código de categoría (RND, JDP, etc.)
    - **fase_juego**: Fase táctica
    - **jugadores_min/max**: Rango de jugadores
    - **duracion_min/max**: Rango de duración en minutos
    - **solo_plantillas**: Filtrar solo plantillas
    - **busqueda**: Búsqueda en título y descripción
    - **biblioteca**: Modo biblioteca compartida (todas las tareas públicas)
    """
    supabase = get_supabase()

    # Construir query base con joins para creador y equipo
    query = supabase.table("tareas").select(
        "*, categorias_tarea(*), usuarios!creado_por(nombre, apellidos), equipos(nombre)",
        count="exact"
    )

    # Filtrar según modo
    if biblioteca and current_user:
        # Modo biblioteca del club: TODAS las tareas de la organización (cross-team)
        query = query.eq("organizacion_id", current_user.organizacion_id)
    elif current_user:
        # Usuario autenticado: tareas de su organización
        query = query.eq("organizacion_id", current_user.organizacion_id)
    else:
        # Sin autenticación: solo tareas públicas
        query = query.eq("es_publica", True)
    
    # Aplicar filtros
    if categoria:
        # Obtener ID de categoría
        cat = supabase.table("categorias_tarea").select("id").eq("codigo", categoria).maybe_single().execute()
        if cat.data:
            query = query.eq("categoria_id", cat.data["id"])
    
    if fase_juego:
        query = query.eq("fase_juego", fase_juego.value)
    
    if principio_tactico:
        query = query.ilike("principio_tactico", f"%{principio_tactico}%")
    
    if jugadores_min:
        query = query.gte("num_jugadores_min", jugadores_min)
    
    if jugadores_max:
        query = query.lte("num_jugadores_max", jugadores_max)
    
    if duracion_min:
        query = query.gte("duracion_total", duracion_min)
    
    if duracion_max:
        query = query.lte("duracion_total", duracion_max)
    
    if nivel_cognitivo:
        query = query.eq("nivel_cognitivo", nivel_cognitivo.value)

    if densidad:
        query = query.eq("densidad", densidad)

    if match_day:
        # match_days_recomendados es un array JSONB, buscamos si contiene el valor
        query = query.contains("match_days_recomendados", [match_day])

    if tipo_esfuerzo:
        query = query.ilike("tipo_esfuerzo", f"%{tipo_esfuerzo}%")

    if es_complementaria is not None:
        query = query.eq("es_complementaria", es_complementaria)

    if zona_cuerpo:
        query = query.eq("zona_cuerpo", zona_cuerpo.value)

    if objetivo_gym:
        query = query.eq("objetivo_gym", objetivo_gym.value)

    if solo_plantillas:
        query = query.eq("es_plantilla", True)
    
    if equipo_id:
        query = query.eq("equipo_id", str(equipo_id))
    
    if busqueda:
        query = query.or_(f"titulo.ilike.%{busqueda}%,descripcion.ilike.%{busqueda}%")
    
    # Ordenación
    query = query.order(orden, desc=(direccion == "desc"))
    
    # Paginación
    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    
    # Ejecutar
    response = query.execute()
    
    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1
    
    # Enriquecer con nombre del creador y equipo
    tareas_data = []
    for t in response.data:
        # Extraer y flatten datos del JOIN
        usuario_data = t.pop("usuarios", None)
        equipo_data = t.pop("equipos", None)

        if usuario_data:
            nombre = usuario_data.get("nombre", "")
            apellidos = usuario_data.get("apellidos", "")
            t["creador_nombre"] = f"{nombre} {apellidos}".strip() if nombre else None
        if equipo_data:
            t["equipo_nombre"] = equipo_data.get("nombre")

        tareas_data.append(TareaResponse(**t))

    return TareaListResponse(
        data=tareas_data,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/{tarea_id}", response_model=TareaResponse)
async def get_tarea(
    tarea_id: UUID,
    current_user = Depends(get_optional_user),
):
    """
    Obtiene una tarea por ID.

    - Sin autenticación: solo permite acceso a tareas públicas
    - Con autenticación: permite acceso a tareas de la organización
    """
    supabase = get_supabase()

    response = supabase.table("tareas").select(
        "*, categorias_tarea(*)"
    ).eq("id", str(tarea_id)).maybe_single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada"
        )

    # Verificar acceso
    if current_user:
        # Usuario autenticado: verificar que pertenece a su organización
        if response.data["organizacion_id"] != str(current_user.organizacion_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes acceso a esta tarea"
            )
    else:
        # Sin autenticación: solo tareas públicas
        if not response.data.get("es_publica", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Esta tarea no es pública"
            )

    return TareaResponse(**response.data)


@router.post("", response_model=TareaResponse, status_code=status.HTTP_201_CREATED)
async def create_tarea(
    tarea: TareaCreate,
    auth: AuthContext = Depends(require_permission(Permission.TASK_CREATE)),
):
    """
    Crea una nueva tarea.
    
    El usuario actual será asignado como creador.
    La organización se asigna automáticamente.
    """
    supabase = get_supabase()
    
    # Preparar datos
    tarea_data = tarea.model_dump(exclude_unset=True)
    tarea_data["organizacion_id"] = str(auth.user.organizacion_id)
    tarea_data["creado_por"] = str(auth.user.id)

    # Por defecto, las tareas son públicas para aparecer en la biblioteca compartida
    if "es_publica" not in tarea_data:
        tarea_data["es_publica"] = True

    # Resolve categoria_id: accept UUID or codigo string
    cat_id_raw = tarea_data["categoria_id"]
    try:
        from uuid import UUID as _UUID
        _UUID(cat_id_raw)
        # Already a valid UUID
        tarea_data["categoria_id"] = cat_id_raw
    except (ValueError, AttributeError):
        # It's a codigo — look up the real UUID
        cat_response = supabase.table("categorias_tarea").select("id").eq(
            "codigo", cat_id_raw
        ).maybe_single().execute()
        if not cat_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Categoría '{cat_id_raw}' no encontrada"
            )
        tarea_data["categoria_id"] = cat_response.data["id"]
    if tarea_data.get("equipo_id"):
        tarea_data["equipo_id"] = str(tarea_data["equipo_id"])
    
    # Calcular m² por jugador
    if tarea_data.get("espacio_largo") and tarea_data.get("espacio_ancho"):
        area = tarea_data["espacio_largo"] * tarea_data["espacio_ancho"]
        tarea_data["m2_por_jugador"] = round(area / tarea_data["num_jugadores_min"], 1)
    
    # Insertar
    response = supabase.table("tareas").insert(tarea_data).execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear tarea"
        )
    
    # Obtener con relaciones
    tarea_completa = supabase.table("tareas").select(
        "*, categorias_tarea(*)"
    ).eq("id", response.data[0]["id"]).maybe_single().execute()

    # Generate embedding asynchronously (non-fatal)
    _generate_tarea_embedding(tarea_data, response.data[0]["id"])

    return TareaResponse(**tarea_completa.data)


@router.put("/{tarea_id}", response_model=TareaResponse)
async def update_tarea(
    tarea_id: UUID,
    tarea: TareaUpdate,
    auth: AuthContext = Depends(require_permission(Permission.TASK_UPDATE)),
):
    """
    Actualiza una tarea existente.
    
    Solo el creador o un admin puede modificar la tarea.
    """
    supabase = get_supabase()
    
    # Verificar que existe y pertenece al usuario
    existing = supabase.table("tareas").select("*").eq("id", str(tarea_id)).maybe_single().execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada"
        )
    
    # Preparar datos (solo campos con valor)
    update_data = tarea.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )
    
    # Resolve categoria_id: accept UUID or codigo string
    if update_data.get("categoria_id"):
        cat_id_raw = str(update_data["categoria_id"])
        try:
            from uuid import UUID as _UUID
            _UUID(cat_id_raw)
            update_data["categoria_id"] = cat_id_raw
        except (ValueError, AttributeError):
            cat_response = supabase.table("categorias_tarea").select("id").eq(
                "codigo", cat_id_raw
            ).maybe_single().execute()
            if not cat_response.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Categoría '{cat_id_raw}' no encontrada"
                )
            update_data["categoria_id"] = cat_response.data["id"]
    
    # Recalcular m² si cambian las dimensiones
    espacio_largo = update_data.get("espacio_largo", existing.data.get("espacio_largo"))
    espacio_ancho = update_data.get("espacio_ancho", existing.data.get("espacio_ancho"))
    jugadores = update_data.get("num_jugadores_min", existing.data.get("num_jugadores_min"))
    
    if espacio_largo and espacio_ancho and jugadores:
        update_data["m2_por_jugador"] = round((espacio_largo * espacio_ancho) / jugadores, 1)
    
    # Actualizar
    response = supabase.table("tareas").update(update_data).eq("id", str(tarea_id)).execute()

    # Obtener con relaciones
    tarea_completa = supabase.table("tareas").select(
        "*, categorias_tarea(*)"
    ).eq("id", str(tarea_id)).maybe_single().execute()

    # Re-generate embedding with updated data
    _generate_tarea_embedding(tarea_completa.data, str(tarea_id))

    return TareaResponse(**tarea_completa.data)


@router.delete("/{tarea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tarea(
    tarea_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.TASK_DELETE)),
):
    """
    Elimina una tarea.
    
    Solo el creador o un admin puede eliminar la tarea.
    Las tareas usadas en sesiones no se eliminan físicamente.
    """
    supabase = get_supabase()
    
    # Verificar que existe
    existing = supabase.table("tareas").select("*").eq("id", str(tarea_id)).maybe_single().execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada"
        )
    
    # Verificar si está en uso
    en_uso = supabase.table("sesion_tareas").select("id").eq("tarea_id", str(tarea_id)).execute()
    
    if en_uso.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Esta tarea está siendo usada en {len(en_uso.data)} sesiones. No se puede eliminar."
        )
    
    # Eliminar
    supabase.table("tareas").delete().eq("id", str(tarea_id)).execute()
    
    return None


@router.post("/{tarea_id}/duplicar", response_model=TareaResponse, status_code=status.HTTP_201_CREATED)
async def duplicar_tarea(
    tarea_id: UUID,
    nuevo_titulo: Optional[str] = None,
    auth: AuthContext = Depends(require_permission(Permission.TASK_CREATE)),
):
    """
    Duplica una tarea existente.

    Crea una copia con el usuario actual como creador.
    """
    supabase = get_supabase()

    # Obtener tarea original
    original = supabase.table("tareas").select("*").eq("id", str(tarea_id)).maybe_single().execute()

    if not original.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada"
        )

    # Preparar copia
    nueva_tarea = original.data.copy()

    # Limpiar campos que se regeneran
    del nueva_tarea["id"]
    del nueva_tarea["created_at"]
    del nueva_tarea["updated_at"]

    # Asignar nuevo propietario
    nueva_tarea["creado_por"] = str(auth.user.id)
    nueva_tarea["organizacion_id"] = str(auth.user.organizacion_id)
    nueva_tarea["num_usos"] = 0
    nueva_tarea["valoracion_media"] = None

    # Título
    nueva_tarea["titulo"] = nuevo_titulo or f"{original.data['titulo']} (copia)"

    # Insertar
    response = supabase.table("tareas").insert(nueva_tarea).execute()

    # Obtener con relaciones
    tarea_completa = supabase.table("tareas").select(
        "*, categorias_tarea(*)"
    ).eq("id", response.data[0]["id"]).maybe_single().execute()

    return TareaResponse(**tarea_completa.data)


# ============ Task Design Chat ============

class TaskDesignMessage(BaseModel):
    rol: str
    contenido: str


class TaskDesignRequest(BaseModel):
    mensajes: List[TaskDesignMessage]
    equipo_id: Optional[UUID] = None


class TaskDesignResponse(BaseModel):
    respuesta: str
    tarea_propuesta: Optional[dict] = None
    herramientas_usadas: list = []


@router.post("/design-chat", response_model=TaskDesignResponse)
async def task_design_chat(
    request: TaskDesignRequest,
    auth: AuthContext = Depends(require_permission(Permission.TASK_CREATE)),
):
    """
    Chat conversacional con IA para diseñar una tarea individual paso a paso.
    Envía mensajes y recibe respuesta del asistente + propuesta de tarea cuando esté lista.
    """
    equipo_id = str(request.equipo_id) if request.equipo_id else auth.equipo_id
    if not equipo_id:
        raise HTTPException(status_code=400, detail="Se requiere equipo_id")

    try:
        from app.services.ai_factory import get_ai_service
        from app.services.ai_errors import AIError

        service = get_ai_service()
        result = await service.task_design_chat(
            mensajes=[{"rol": m.rol, "contenido": m.contenido} for m in request.mensajes],
            equipo_id=equipo_id,
            organizacion_id=auth.organizacion_id,
        )

        return TaskDesignResponse(
            respuesta=result["respuesta"],
            tarea_propuesta=result.get("tarea_propuesta"),
            herramientas_usadas=result.get("herramientas_usadas", []),
        )

    except AIError as e:
        logger.error(f"AIError in task design chat: {e}")
        error_msg = str(e)
        if "conexion" in error_msg.lower():
            raise HTTPException(status_code=503, detail=error_msg)
        elif "saturado" in error_msg.lower():
            raise HTTPException(status_code=429, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        logger.error(f"Unexpected error in task design chat: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error inesperado al comunicarse con la IA. Inténtalo de nuevo."
        )


@router.post("/from-ai", response_model=TareaResponse, status_code=status.HTTP_201_CREATED)
async def create_tarea_from_ai(
    tarea_ai: AITareaNueva,
    auth: AuthContext = Depends(require_permission(Permission.TASK_CREATE, Permission.AI_USE)),
):
    """
    Crea una tarea a partir de una sugerencia de la IA.

    Convierte los datos del modelo AITareaNueva al formato de tarea normal.
    """
    supabase = get_supabase()

    # Buscar el ID de la categoría por código
    cat_response = supabase.table("categorias_tarea").select("id").eq(
        "codigo", tarea_ai.categoria_codigo
    ).maybe_single().execute()

    if not cat_response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Categoría '{tarea_ai.categoria_codigo}' no encontrada"
        )

    categoria_id = cat_response.data["id"]

    # Mapear fase_juego de código corto a valor de BD
    fase_juego_valor = None
    if tarea_ai.fase_juego:
        raw_fj = tarea_ai.fase_juego.strip().lower()
        fase_juego_valor = FASE_JUEGO_MAP.get(raw_fj) or FASE_JUEGO_MAP.get(tarea_ai.fase_juego)
        # Si no está en el mapa, dejarlo como None para evitar error de constraint

    # Mapear densidad a valores válidos de BD
    densidad_valor = None
    if tarea_ai.densidad:
        densidad_valor = DENSIDAD_MAP.get(tarea_ai.densidad.strip().lower())

    # Append posicion_entrenador to description if provided
    descripcion = tarea_ai.descripcion
    if tarea_ai.posicion_entrenador:
        descripcion += f"\n\nPOSICIÓN ENTRENADOR: {tarea_ai.posicion_entrenador}"

    # Detectar si es categoría complementaria (gym)
    GYM_CATEGORIES = {"GYM", "PRV", "MOV", "RCF"}
    is_gym = tarea_ai.categoria_codigo in GYM_CATEGORIES

    # Preparar datos de la tarea (mapear campos de IA a campos de BD)
    tarea_data = {
        "titulo": tarea_ai.titulo,
        "descripcion": descripcion,
        "categoria_id": categoria_id,
        "duracion_total": tarea_ai.duracion_total,
        "num_series": tarea_ai.num_series,
        "espacio_largo": tarea_ai.espacio_largo,
        "espacio_ancho": tarea_ai.espacio_ancho,
        "num_jugadores_min": tarea_ai.num_jugadores_min,
        "num_jugadores_max": tarea_ai.num_jugadores_max,
        "num_porteros": tarea_ai.num_porteros,
        "estructura_equipos": tarea_ai.estructura_equipos,
        "fase_juego": fase_juego_valor,
        "principio_tactico": tarea_ai.principio_tactico,
        # Mapear reglas_principales a reglas_tecnicas
        "reglas_tecnicas": tarea_ai.reglas_principales,
        "reglas_tacticas": [],
        "reglas_psicologicas": [],
        # Mapear consignas a consignas_ofensivas
        "consignas_ofensivas": tarea_ai.consignas,
        "consignas_defensivas": tarea_ai.consignas_defensivas,
        "errores_comunes": tarea_ai.errores_comunes,
        # Diagrama táctico
        "grafico_data": tarea_ai.grafico_data,
        # Variantes y material
        "variantes": tarea_ai.variantes,
        "material": tarea_ai.material,
        "nivel_cognitivo": tarea_ai.nivel_cognitivo,
        "densidad": densidad_valor,
        # Campos de autoría
        "organizacion_id": str(auth.user.organizacion_id),
        "creado_por": str(auth.user.id),
        "es_publica": True,
        "es_plantilla": True,
        # Auto-set complementaria flag for gym categories
        "es_complementaria": is_gym,
    }

    # Mapear campos de gym si la IA los proporcionó
    if is_gym:
        for gym_field in ["grupo_muscular", "equipamiento", "tipo_contraccion",
                          "zona_cuerpo", "objetivo_gym", "series_repeticiones",
                          "protocolo_progresion"]:
            val = getattr(tarea_ai, gym_field, None)
            if val is not None:
                tarea_data[gym_field] = val

    # Calcular m² por jugador si hay dimensiones
    if tarea_data.get("espacio_largo") and tarea_data.get("espacio_ancho"):
        area = tarea_data["espacio_largo"] * tarea_data["espacio_ancho"]
        tarea_data["m2_por_jugador"] = round(area / tarea_data["num_jugadores_min"], 1)

    # Clamp nivel_cognitivo to valid range 1-3
    if tarea_data.get("nivel_cognitivo") is not None:
        try:
            tarea_data["nivel_cognitivo"] = max(1, min(3, int(tarea_data["nivel_cognitivo"])))
        except (ValueError, TypeError):
            tarea_data["nivel_cognitivo"] = 2

    # Ensure JSONB array fields are lists, not strings
    for field in [
        "reglas_tecnicas", "reglas_tacticas", "reglas_psicologicas",
        "consignas_ofensivas", "consignas_defensivas", "errores_comunes",
        "tags", "variantes", "progresiones", "regresiones", "material",
    ]:
        val = tarea_data.get(field)
        if val is None or isinstance(val, list):
            continue
        if isinstance(val, str):
            stripped = val.strip()
            if not stripped:
                tarea_data[field] = []
            elif "\n" in stripped:
                tarea_data[field] = [line.strip() for line in stripped.split("\n") if line.strip()]
            else:
                tarea_data[field] = [stripped]
        else:
            tarea_data[field] = []

    # Insertar
    try:
        response = supabase.table("tareas").insert(tarea_data).execute()
    except Exception as e:
        logger.error(f"Error inserting AI tarea: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al crear tarea desde IA: {str(e)}"
        )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear tarea desde IA"
        )

    # Obtener con relaciones
    tarea_completa = supabase.table("tareas").select(
        "*, categorias_tarea(*)"
    ).eq("id", response.data[0]["id"]).maybe_single().execute()

    # Generate embedding asynchronously (non-fatal)
    _generate_tarea_embedding(tarea_data, response.data[0]["id"])

    return TareaResponse(**tarea_completa.data)


@router.get("/{tarea_id}/pdf")
async def generate_tarea_pdf_endpoint(
    tarea_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.EXPORT_DATA)),
):
    """Genera un PDF de ficha de tarea con diseño corporativo."""
    from app.services.pdf_service import generate_tarea_pdf as gen_pdf

    supabase = get_supabase()

    tarea_resp = supabase.table("tareas").select(
        "*, categorias_tarea(*)"
    ).eq("id", str(tarea_id)).maybe_single().execute()

    if not tarea_resp.data:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    org_resp = supabase.table("organizaciones").select("*").eq(
        "id", tarea_resp.data["organizacion_id"]
    ).maybe_single().execute()

    pdf_bytes = await asyncio.to_thread(
        gen_pdf,
        tarea=tarea_resp.data,
        organizacion=org_resp.data or {},
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="tarea_{tarea_id}.pdf"'
        },
    )
