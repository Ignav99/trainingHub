"""
TrainingHub Pro - Router de Tareas
CRUD completo para tareas de entrenamiento.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import StreamingResponse
from typing import Optional, List
from uuid import UUID
from math import ceil
import io

from app.models import (
    TareaCreate,
    TareaUpdate,
    TareaResponse,
    TareaListResponse,
    TareaFiltros,
    FaseJuego,
    NivelCognitivo,
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
        cat = supabase.table("categorias_tarea").select("id").eq("codigo", categoria).single().execute()
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
    ).eq("id", str(tarea_id)).single().execute()

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

    # Convertir UUIDs a strings
    tarea_data["categoria_id"] = str(tarea_data["categoria_id"])
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
    ).eq("id", response.data[0]["id"]).single().execute()
    
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
    existing = supabase.table("tareas").select("*").eq("id", str(tarea_id)).single().execute()
    
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
    
    # Convertir UUIDs
    if update_data.get("categoria_id"):
        update_data["categoria_id"] = str(update_data["categoria_id"])
    
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
    ).eq("id", str(tarea_id)).single().execute()
    
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
    existing = supabase.table("tareas").select("*").eq("id", str(tarea_id)).single().execute()
    
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
    original = supabase.table("tareas").select("*").eq("id", str(tarea_id)).single().execute()

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
    ).eq("id", response.data[0]["id"]).single().execute()

    return TareaResponse(**tarea_completa.data)


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
    ).single().execute()

    if not cat_response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Categoría '{tarea_ai.categoria_codigo}' no encontrada"
        )

    categoria_id = cat_response.data["id"]

    # Mapear fase_juego de código corto a valor de BD
    fase_juego_valor = None
    if tarea_ai.fase_juego:
        fase_juego_valor = FASE_JUEGO_MAP.get(tarea_ai.fase_juego)
        # Si no está en el mapa, dejarlo como None para evitar error de constraint

    # Mapear densidad a valores válidos de BD
    densidad_valor = None
    if tarea_ai.densidad:
        densidad_valor = DENSIDAD_MAP.get(tarea_ai.densidad.lower())

    # Append posicion_entrenador to description if provided
    descripcion = tarea_ai.descripcion
    if tarea_ai.posicion_entrenador:
        descripcion += f"\n\nPOSICIÓN ENTRENADOR: {tarea_ai.posicion_entrenador}"

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
    }

    # Calcular m² por jugador si hay dimensiones
    if tarea_data.get("espacio_largo") and tarea_data.get("espacio_ancho"):
        area = tarea_data["espacio_largo"] * tarea_data["espacio_ancho"]
        tarea_data["m2_por_jugador"] = round(area / tarea_data["num_jugadores_min"], 1)

    # Insertar
    response = supabase.table("tareas").insert(tarea_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear tarea desde IA"
        )

    # Obtener con relaciones
    tarea_completa = supabase.table("tareas").select(
        "*, categorias_tarea(*)"
    ).eq("id", response.data[0]["id"]).single().execute()

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
    ).eq("id", str(tarea_id)).single().execute()

    if not tarea_resp.data:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    org_resp = supabase.table("organizaciones").select("*").eq(
        "id", tarea_resp.data["organizacion_id"]
    ).single().execute()

    pdf_bytes = gen_pdf(
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
