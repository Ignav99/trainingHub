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
    CrearVarianteRequest,
    FaseJuego,
    NivelCognitivo,
    ModalidadTarea,
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
    # Filtros canónicos (alineados con el creador)
    categoria: Optional[str] = None,
    fase_juego: Optional[FaseJuego] = None,
    modalidad: Optional[ModalidadTarea] = None,
    principio_tactico: Optional[str] = None,  # subfase
    objetivo_tactico: Optional[str] = None,
    objetivo_tecnico: Optional[str] = None,
    orientacion_fisica: Optional[str] = None,
    jugadores_min: Optional[int] = Query(None, ge=1),
    jugadores_max: Optional[int] = Query(None, ge=1),
    duracion_min: Optional[int] = Query(None, ge=1),
    duracion_max: Optional[int] = Query(None, ge=1),
    # Legacy / derivados (aceptados; no se exponen en FE canónico)
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
    # Familia madre → variantes
    solo_madres: bool = False,
    solo_variantes: bool = False,
    tipo_variante: Optional[str] = None,
    tarea_origen_id: Optional[UUID] = None,
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
        # Usuario autenticado, modo normal (no biblioteca): solo tareas de sus
        # propios equipos (via usuarios_equipos) + tareas sin equipo (compartidas
        # a nivel club por diseño). Antes esto solo filtraba por organizacion_id,
        # mostrando las tareas de TODOS los equipos del club mezcladas.
        query = query.eq("organizacion_id", current_user.organizacion_id)
        membresias = supabase.table("usuarios_equipos").select("equipo_id").eq(
            "usuario_id", str(current_user.id)
        ).execute()
        equipo_ids = [m["equipo_id"] for m in (membresias.data or [])]
        if equipo_ids:
            ids_list = ",".join(equipo_ids)
            query = query.or_(f"equipo_id.is.null,equipo_id.in.({ids_list})")
        else:
            query = query.is_("equipo_id", "null")
    else:
        # Sin autenticación: solo tareas públicas
        query = query.eq("es_publica", True)
    
    # Aplicar filtros
    if categoria:
        # Obtener ID de categoría
        cat = supabase.table("categorias_tarea").select("id").eq("codigo", categoria).maybe_single().execute()
        if cat and cat.data:
            query = query.eq("categoria_id", cat.data["id"])
    
    if fase_juego:
        query = query.eq("fase_juego", fase_juego.value)

    if modalidad:
        query = query.eq("modalidad", modalidad.value)
    
    if principio_tactico:
        # Subfase tipada (codigo exacto del catálogo canónico)
        query = query.eq("principio_tactico", principio_tactico)
    
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

    # Arrays / tipo_variante: se aplican abajo; si PostgREST falla, filtramos en Python.
    applied_canon_filters = False
    if objetivo_tactico:
        query = query.contains("objetivos_tacticos", [objetivo_tactico])
        applied_canon_filters = True
    if objetivo_tecnico:
        query = query.contains("objetivos_tecnicos", [objetivo_tecnico])
        applied_canon_filters = True
    if orientacion_fisica:
        query = query.contains("orientaciones_fisicas", [orientacion_fisica])
        applied_canon_filters = True
    if tipo_variante:
        query = query.eq("tipo_variante", tipo_variante)
        applied_canon_filters = True

    # Madre/variante: filtrar en Python (nunca .is_ en PostgREST por mig 067).
    applied_origen_eq = False
    if tarea_origen_id:
        query = query.eq("tarea_origen_id", str(tarea_origen_id))
        applied_origen_eq = True

    if equipo_id:
        query = query.eq("equipo_id", str(equipo_id))

    if busqueda:
        query = query.or_(
            f"titulo.ilike.%{busqueda}%,descripcion.ilike.%{busqueda}%"
        )

    query = query.order(orden, desc=(direccion == "desc"))

    offset = (page - 1) * limit
    fetch_limit = limit
    needs_client_family = (solo_madres or solo_variantes) and not tarea_origen_id
    if needs_client_family or applied_canon_filters:
        fetch_limit = min(limit * 4, 100)
    query = query.range(offset, offset + fetch_limit - 1)

    def _rebuild_list_query(*, include_origen_eq: bool, include_canon: bool):
        q = supabase.table("tareas").select(
            "*, categorias_tarea(*), usuarios!creado_por(nombre, apellidos), equipos(nombre)",
            count="exact",
        )
        if biblioteca and current_user:
            q = q.eq("organizacion_id", current_user.organizacion_id)
        elif current_user:
            q = q.eq("organizacion_id", current_user.organizacion_id)
        else:
            q = q.eq("es_publica", True)
        if categoria:
            cat = (
                supabase.table("categorias_tarea")
                .select("id")
                .eq("codigo", categoria)
                .maybe_single()
                .execute()
            )
            if cat and cat.data:
                q = q.eq("categoria_id", cat.data["id"])
        if fase_juego:
            q = q.eq("fase_juego", fase_juego.value)
        if modalidad:
            q = q.eq("modalidad", modalidad.value)
        if principio_tactico:
            q = q.eq("principio_tactico", principio_tactico)
        if jugadores_min:
            q = q.gte("num_jugadores_min", jugadores_min)
        if jugadores_max:
            q = q.lte("num_jugadores_max", jugadores_max)
        if duracion_min:
            q = q.gte("duracion_total", duracion_min)
        if duracion_max:
            q = q.lte("duracion_total", duracion_max)
        if nivel_cognitivo:
            q = q.eq("nivel_cognitivo", nivel_cognitivo.value)
        if densidad:
            q = q.eq("densidad", densidad)
        if match_day:
            q = q.contains("match_days_recomendados", [match_day])
        if tipo_esfuerzo:
            q = q.ilike("tipo_esfuerzo", f"%{tipo_esfuerzo}%")
        if es_complementaria is not None:
            q = q.eq("es_complementaria", es_complementaria)
        if zona_cuerpo:
            q = q.eq("zona_cuerpo", zona_cuerpo.value)
        if objetivo_gym:
            q = q.eq("objetivo_gym", objetivo_gym.value)
        if solo_plantillas:
            q = q.eq("es_plantilla", True)
        if include_canon:
            if objetivo_tactico:
                q = q.contains("objetivos_tacticos", [objetivo_tactico])
            if objetivo_tecnico:
                q = q.contains("objetivos_tecnicos", [objetivo_tecnico])
            if orientacion_fisica:
                q = q.contains("orientaciones_fisicas", [orientacion_fisica])
            if tipo_variante:
                q = q.eq("tipo_variante", tipo_variante)
        if include_origen_eq and tarea_origen_id:
            q = q.eq("tarea_origen_id", str(tarea_origen_id))
        if equipo_id:
            q = q.eq("equipo_id", str(equipo_id))
        if busqueda:
            q = q.or_(f"titulo.ilike.%{busqueda}%,descripcion.ilike.%{busqueda}%")
        q = q.order(orden, desc=(direccion == "desc"))
        q = q.range(offset, offset + fetch_limit - 1)
        return q

    try:
        response = query.execute()
    except Exception as first_err:
        err_txt = str(first_err).lower()
        needs_retry = (
            applied_origen_eq
            or applied_canon_filters
            or "tarea_origen_id" in err_txt
            or "desarrollo" in err_txt
            or "reglas" in err_txt
            or "anotaciones" in err_txt
            or "tipo_variante" in err_txt
            or "objetivos_tacticos" in err_txt
            or "objetivos_tecnicos" in err_txt
            or "orientaciones_fisicas" in err_txt
            or "42703" in err_txt
            or "schema cache" in err_txt
        )
        if not needs_retry:
            logger.error(f"list_tareas failed: {first_err}")
            raise HTTPException(
                status_code=500, detail=f"Error listando tareas: {first_err}"
            ) from first_err

        logger.warning(
            "list_tareas: reintento sin filtros canónicos/mig. %s",
            first_err,
        )
        # Primero sin arrays/tipo; si sigue fallando por origen, sin origen
        try:
            response = _rebuild_list_query(
                include_origen_eq=applied_origen_eq, include_canon=False
            ).execute()
            applied_canon_filters = False
        except Exception as second_err:
            logger.warning("list_tareas: segundo reintento sin origen. %s", second_err)
            response = _rebuild_list_query(
                include_origen_eq=False, include_canon=False
            ).execute()
            applied_origen_eq = False
            applied_canon_filters = False

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    # Enriquecer con nombre del creador y equipo
    rows = []
    for t in response.data or []:
        usuario_data = t.pop("usuarios", None)
        equipo_data = t.pop("equipos", None)
        cat_data = t.pop("categorias_tarea", None)

        if usuario_data:
            nombre = usuario_data.get("nombre", "")
            apellidos = usuario_data.get("apellidos", "")
            t["creador_nombre"] = f"{nombre} {apellidos}".strip() if nombre else None
        if equipo_data:
            t["equipo_nombre"] = equipo_data.get("nombre")
        if cat_data and isinstance(cat_data, dict):
            t["categoria"] = cat_data

        origen = t.get("tarea_origen_id")
        if solo_madres and origen:
            continue
        if solo_variantes and not origen:
            continue
        if tipo_variante and not applied_canon_filters:
            if (t.get("tipo_variante") or "") != tipo_variante:
                continue
        if objetivo_tactico and not applied_canon_filters:
            if objetivo_tactico not in (t.get("objetivos_tacticos") or []):
                continue
        if objetivo_tecnico and not applied_canon_filters:
            if objetivo_tecnico not in (t.get("objetivos_tecnicos") or []):
                continue
        if orientacion_fisica and not applied_canon_filters:
            if orientacion_fisica not in (t.get("orientaciones_fisicas") or []):
                continue

        rows.append(t)
        if len(rows) >= limit:
            break

    # Contar variantes hijas para madres de esta página
    madre_ids = [str(r["id"]) for r in rows if not r.get("tarea_origen_id") and r.get("id")]
    variant_counts: dict = {}
    if madre_ids:
        try:
            kids = (
                supabase.table("tareas")
                .select("tarea_origen_id")
                .in_("tarea_origen_id", madre_ids)
                .execute()
            )
            for kid in kids.data or []:
                oid = kid.get("tarea_origen_id")
                if oid:
                    variant_counts[str(oid)] = variant_counts.get(str(oid), 0) + 1
        except Exception as count_err:
            logger.debug("list_tareas: no se pudo contar variantes: %s", count_err)

    tareas_data = []
    for t in rows:
        if not t.get("tarea_origen_id"):
            t["num_variantes"] = variant_counts.get(str(t.get("id")), 0)
        try:
            tareas_data.append(TareaResponse(**t))
        except Exception as row_err:
            logger.warning("list_tareas: skip row %s — %s", t.get("id"), row_err)
            continue

    if solo_madres or solo_variantes or (not applied_canon_filters and (
        objetivo_tactico or objetivo_tecnico or orientacion_fisica or tipo_variante
    )):
        total = max(len(tareas_data), total if not needs_client_family else len(tareas_data))
        pages = ceil(total / limit) if total > 0 else 1

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

    if not response or not response.data:
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

    data = response.data
    # Enriquecer familia
    try:
        if data.get("tarea_origen_id"):
            madre = (
                supabase.table("tareas")
                .select("id, titulo")
                .eq("id", data["tarea_origen_id"])
                .maybe_single()
                .execute()
            )
            if madre and madre.data:
                data["madre_titulo"] = madre.data.get("titulo")
        else:
            kids = (
                supabase.table("tareas")
                .select("id", count="exact")
                .eq("tarea_origen_id", str(data["id"]))
                .execute()
            )
            data["num_variantes"] = kids.count or 0
    except Exception:
        pass

    return TareaResponse(**data)


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

    # Sync narrativo desarrollo ↔ descripcion
    if tarea_data.get("desarrollo") and not tarea_data.get("descripcion"):
        tarea_data["descripcion"] = tarea_data["desarrollo"]
    elif tarea_data.get("descripcion") and not tarea_data.get("desarrollo"):
        tarea_data["desarrollo"] = tarea_data["descripcion"]
    if not tarea_data.get("tipo_variante") and not tarea_data.get("tarea_origen_id"):
        tarea_data["tipo_variante"] = "original"

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
        if not cat_response or not cat_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Categoría '{cat_id_raw}' no encontrada"
            )
        tarea_data["categoria_id"] = cat_response.data["id"]
    if tarea_data.get("equipo_id"):
        tarea_data["equipo_id"] = str(tarea_data["equipo_id"])

    # Densidad + nivel cognitivo: cálculo canónico único (mismos parámetros siempre)
    from app.services.task_load_metrics import apply_auto_load
    tarea_data = apply_auto_load(tarea_data)
    
    # Insertar (si mig 067 no está aplicada, quitar columnas nuevas y reintentar)
    mig_067_cols = ("desarrollo", "reglas", "anotaciones", "tarea_origen_id", "tipo_variante")
    try:
        response = supabase.table("tareas").insert(tarea_data).execute()
    except Exception as insert_err:
        err_txt = str(insert_err).lower()
        if any(c in err_txt for c in mig_067_cols) or "42703" in err_txt or "schema cache" in err_txt:
            logger.warning("create_tarea: mig 067 ausente, insertando sin columnas nuevas. %s", insert_err)
            for c in mig_067_cols:
                tarea_data.pop(c, None)
            response = supabase.table("tareas").insert(tarea_data).execute()
        else:
            raise
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear tarea"
        )
    
    # Obtener con relaciones
    tarea_completa = supabase.table("tareas").select(
        "*, categorias_tarea(*)"
    ).eq("id", response.data[0]["id"]).maybe_single().execute()

    if not tarea_completa or not tarea_completa.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tarea creada pero no se pudo recuperar"
        )

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

    if not existing or not existing.data:
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
            if not cat_response or not cat_response.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Categoría '{cat_id_raw}' no encontrada"
                )
            update_data["categoria_id"] = cat_response.data["id"]
    
    # Recalcular densidad + cognitivo con la misma fórmula canónica
    from app.services.task_load_metrics import apply_auto_load
    merged = {**existing.data, **update_data}
    loaded = apply_auto_load(merged)
    for key in (
        "m2_por_jugador",
        "densidad",
        "nivel_cognitivo",
        "tipo_esfuerzo",
        "fc_esperada_min",
        "fc_esperada_max",
    ):
        if key in loaded and loaded[key] is not None:
            update_data[key] = loaded[key]
    
    # Actualizar
    response = supabase.table("tareas").update(update_data).eq("id", str(tarea_id)).execute()

    # Obtener con relaciones
    tarea_completa = supabase.table("tareas").select(
        "*, categorias_tarea(*)"
    ).eq("id", str(tarea_id)).maybe_single().execute()

    if not tarea_completa or not tarea_completa.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tarea actualizada pero no se pudo recuperar"
        )

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

    if not existing or not existing.data:
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

    if not original or not original.data:
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

    if not tarea_completa or not tarea_completa.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tarea duplicada pero no se pudo recuperar"
        )

    return TareaResponse(**tarea_completa.data)


@router.post("/{tarea_id}/variantes", response_model=TareaResponse, status_code=status.HTTP_201_CREATED)
async def crear_variante(
    tarea_id: UUID,
    body: CrearVarianteRequest,
    auth: AuthContext = Depends(require_permission(Permission.TASK_CREATE)),
):
    """
    Crea una variante a partir de una tarea madre.

    Copia pizarra, tipología, espacio y objetivos; permite override de
    desarrollo / reglas / anotaciones y objetivos. La hija apunta a la madre
    vía tarea_origen_id.
    """
    supabase = get_supabase()

    original = supabase.table("tareas").select("*").eq("id", str(tarea_id)).maybe_single().execute()
    if not original or not original.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")

    madre = original.data
    # Si se pide variante de una variante, enganchar a la madre raíz
    origen_id = madre.get("tarea_origen_id") or madre.get("id")
    if madre.get("tarea_origen_id"):
        root = supabase.table("tareas").select("id, titulo").eq(
            "id", madre["tarea_origen_id"]
        ).maybe_single().execute()
        if root and root.data:
            origen_id = root.data["id"]

    tipo_labels = {
        "progresion": "Progresión",
        "regresion": "Regresión",
        "adaptacion": "Adaptación",
        "contexto": "Contexto",
        "reglas": "Reglas",
    }
    label = tipo_labels.get(body.tipo_variante, "Variante")

    nueva = madre.copy()
    for k in ("id", "created_at", "updated_at", "embedding", "num_usos", "valoracion_media"):
        nueva.pop(k, None)

    nueva["creado_por"] = str(getattr(auth, "user_id", None) or auth.user.id)
    nueva["organizacion_id"] = str(
        getattr(auth, "organizacion_id", None) or auth.user.organizacion_id
    )
    nueva["tarea_origen_id"] = str(origen_id)
    nueva["tipo_variante"] = body.tipo_variante
    nueva["titulo"] = body.titulo or f"{madre.get('titulo', 'Tarea')} · {label}"
    nueva["es_plantilla"] = True
    nueva["es_publica"] = True if body.es_publica is None else body.es_publica
    nueva["num_usos"] = 0
    nueva["valoracion_media"] = None

    if body.desarrollo is not None:
        nueva["desarrollo"] = body.desarrollo
        nueva["descripcion"] = body.desarrollo
    if body.reglas is not None:
        nueva["reglas"] = body.reglas
    if body.anotaciones is not None:
        nueva["anotaciones"] = body.anotaciones
    if body.objetivos_tacticos is not None:
        nueva["objetivos_tacticos"] = body.objetivos_tacticos
    if body.objetivos_tecnicos is not None:
        nueva["objetivos_tecnicos"] = body.objetivos_tecnicos

    # Sync narrativo por defecto
    if not nueva.get("desarrollo") and nueva.get("descripcion"):
        nueva["desarrollo"] = nueva["descripcion"]
    if nueva.get("desarrollo") and not nueva.get("descripcion"):
        nueva["descripcion"] = nueva["desarrollo"]

    response = None
    try:
        response = supabase.table("tareas").insert(nueva).execute()
    except Exception as insert_err:
        err_txt = str(insert_err).lower()
        if (
            "tarea_origen_id" in err_txt
            or "tipo_variante" in err_txt
            or "desarrollo" in err_txt
            or "42703" in err_txt
            or "schema cache" in err_txt
        ):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "No se pueden crear variantes: falta aplicar la migración 067 "
                    "(columnas desarrollo/reglas/tarea_origen_id) en Supabase y "
                    "NOTIFY pgrst, 'reload schema'."
                ),
            ) from insert_err
        raise

    if not response.data:
        raise HTTPException(status_code=500, detail="No se pudo crear la variante")

    tarea_completa = supabase.table("tareas").select(
        "*, categorias_tarea(*)"
    ).eq("id", response.data[0]["id"]).maybe_single().execute()

    if not tarea_completa or not tarea_completa.data:
        raise HTTPException(status_code=500, detail="Variante creada pero no se pudo recuperar")

    return TareaResponse(**tarea_completa.data)


@router.get("/{tarea_id}/variantes", response_model=TareaListResponse)
async def list_variantes(
    tarea_id: UUID,
    current_user=Depends(get_optional_user),
):
    """Lista las variantes hijas de una tarea madre."""
    supabase = get_supabase()
    try:
        response = (
            supabase.table("tareas")
            .select(
                "*, categorias_tarea(*), usuarios!creado_por(nombre, apellidos), equipos(nombre)",
                count="exact",
            )
            .eq("tarea_origen_id", str(tarea_id))
            .order("created_at", desc=False)
            .execute()
        )
    except Exception as list_err:
        err_txt = str(list_err).lower()
        if "tarea_origen_id" in err_txt or "42703" in err_txt or "schema cache" in err_txt:
            return TareaListResponse(data=[], total=0, page=1, limit=1, pages=1)
        raise
    tareas_data = []
    for t in (response.data or []):
        t.pop("usuarios", None)
        t.pop("equipos", None)
        cat = t.pop("categorias_tarea", None)
        if cat:
            t["categoria"] = cat
        try:
            tareas_data.append(TareaResponse(**t))
        except Exception:
            continue
    total = response.count or len(tareas_data)
    return TareaListResponse(data=tareas_data, total=total, page=1, limit=max(total, 1), pages=1)


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
        from app.services.ai_factory import call_ai_with_fallback
        from app.services.ai_errors import AIError

        result = await call_ai_with_fallback(
            "task_design_chat",
            use_fast_model=True,
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

    if not cat_response or not cat_response.data:
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

    if not tarea_completa or not tarea_completa.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tarea creada desde IA pero no se pudo recuperar"
        )

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

    if not tarea_resp or not tarea_resp.data:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    org_resp = supabase.table("organizaciones").select("*").eq(
        "id", tarea_resp.data["organizacion_id"]
    ).maybe_single().execute()

    equipo_nombre = ""
    if tarea_resp.data.get("equipo_id"):
        eq_resp = supabase.table("equipos").select("nombre").eq(
            "id", tarea_resp.data["equipo_id"]
        ).maybe_single().execute()
        if eq_resp and eq_resp.data:
            equipo_nombre = eq_resp.data.get("nombre", "")

    pdf_bytes = await gen_pdf(
        tarea=tarea_resp.data,
        organizacion=(org_resp.data if org_resp else None) or {},
        equipo_nombre=equipo_nombre,
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="tarea_{tarea_id}.pdf"'
        },
    )


# ============ Diagram Generation ============

@router.post("/{tarea_id}/generate-diagram")
async def generate_diagram_for_tarea(
    tarea_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.TASK_UPDATE)),
):
    """Generate a tactical diagram for an existing tarea using AI."""
    from app.services.diagram_generator import generate_diagram

    supabase = get_supabase()

    # Fetch the tarea
    resp = supabase.table("tareas").select(
        "id, titulo, descripcion, estructura_equipos, espacio_largo, espacio_ancho, "
        "categorias_tarea(codigo, nombre)"
    ).eq("id", str(tarea_id)).maybe_single().execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="Tarea not found")

    tarea = resp.data
    cat = tarea.pop("categorias_tarea", None)
    categoria_codigo = cat.get("codigo") if cat else None

    espacio = None
    if tarea.get("espacio_largo") and tarea.get("espacio_ancho"):
        espacio = f"{tarea['espacio_largo']}x{tarea['espacio_ancho']}m"

    diagram_data = await generate_diagram(
        descripcion=tarea.get("descripcion") or tarea.get("titulo", ""),
        categoria_codigo=categoria_codigo,
        estructura_equipos=tarea.get("estructura_equipos"),
        espacio=espacio,
        titulo=tarea.get("titulo"),
    )

    # Save to DB
    supabase.table("tareas").update(
        {"grafico_data": diagram_data}
    ).eq("id", str(tarea_id)).execute()

    return {"grafico_data": diagram_data}


class BatchGenerateResponse(BaseModel):
    generated: int
    failed: int
    total: int


@router.post("/batch-generate-diagrams", response_model=BatchGenerateResponse)
async def batch_generate_diagrams(
    auth: AuthContext = Depends(require_permission(Permission.TASK_UPDATE)),
):
    """Generate diagrams for all tareas that don't have one yet (org-wide)."""
    from app.services.diagram_generator import generate_diagram

    supabase = get_supabase()

    # Get tareas without grafico_data
    resp = supabase.table("tareas").select(
        "id, titulo, descripcion, estructura_equipos, espacio_largo, espacio_ancho, "
        "categorias_tarea(codigo, nombre)"
    ).eq("organizacion_id", auth.organizacion_id).is_("grafico_data", "null").limit(50).execute()

    generated = 0
    failed = 0
    total = len(resp.data)

    for tarea in resp.data:
        try:
            cat = tarea.pop("categorias_tarea", None)
            categoria_codigo = cat.get("codigo") if cat else None

            espacio = None
            if tarea.get("espacio_largo") and tarea.get("espacio_ancho"):
                espacio = f"{tarea['espacio_largo']}x{tarea['espacio_ancho']}m"

            diagram_data = await generate_diagram(
                descripcion=tarea.get("descripcion") or tarea.get("titulo", ""),
                categoria_codigo=categoria_codigo,
                estructura_equipos=tarea.get("estructura_equipos"),
                espacio=espacio,
                titulo=tarea.get("titulo"),
            )

            supabase.table("tareas").update(
                {"grafico_data": diagram_data}
            ).eq("id", tarea["id"]).execute()

            generated += 1
        except Exception as e:
            logger.warning(f"Failed to generate diagram for tarea {tarea['id']}: {e}")
            failed += 1

    return BatchGenerateResponse(generated=generated, failed=failed, total=total)
