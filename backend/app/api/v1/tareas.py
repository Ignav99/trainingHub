"""
TrainingHub Pro - Router de Tareas
CRUD completo para tareas de entrenamiento.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional, List
from uuid import UUID
from math import ceil

from app.models import (
    TareaCreate,
    TareaUpdate,
    TareaResponse,
    TareaListResponse,
    TareaFiltros,
    FaseJuego,
    NivelCognitivo,
)
from app.database import get_supabase
from app.dependencies import get_current_user

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
    solo_plantillas: bool = False,
    equipo_id: Optional[UUID] = None,
    busqueda: Optional[str] = None,
    # Ordenación
    orden: str = Query("created_at", pattern="^(created_at|titulo|duracion_total|num_usos)$"),
    direccion: str = Query("desc", pattern="^(asc|desc)$"),
    # Auth
    current_user = Depends(get_current_user),
):
    """
    Lista tareas con filtros y paginación.
    
    - **categoria**: Código de categoría (RND, JDP, etc.)
    - **fase_juego**: Fase táctica
    - **jugadores_min/max**: Rango de jugadores
    - **duracion_min/max**: Rango de duración en minutos
    - **solo_plantillas**: Filtrar solo plantillas
    - **busqueda**: Búsqueda en título y descripción
    """
    supabase = get_supabase()
    
    # Construir query base
    query = supabase.table("tareas").select(
        "*, categorias_tarea(*)",
        count="exact"
    )
    
    # Filtrar por organización del usuario
    query = query.eq("organizacion_id", current_user.organizacion_id)
    
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
    
    return TareaListResponse(
        data=[TareaResponse(**t) for t in response.data],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/{tarea_id}", response_model=TareaResponse)
async def get_tarea(
    tarea_id: UUID,
    current_user = Depends(get_current_user),
):
    """Obtiene una tarea por ID."""
    supabase = get_supabase()
    
    response = supabase.table("tareas").select(
        "*, categorias_tarea(*)"
    ).eq("id", str(tarea_id)).single().execute()
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tarea no encontrada"
        )
    
    # Verificar que pertenece a la organización del usuario
    if response.data["organizacion_id"] != str(current_user.organizacion_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta tarea"
        )
    
    return TareaResponse(**response.data)


@router.post("", response_model=TareaResponse, status_code=status.HTTP_201_CREATED)
async def create_tarea(
    tarea: TareaCreate,
    current_user = Depends(get_current_user),
):
    """
    Crea una nueva tarea.
    
    El usuario actual será asignado como creador.
    La organización se asigna automáticamente.
    """
    supabase = get_supabase()
    
    # Preparar datos
    tarea_data = tarea.model_dump(exclude_unset=True)
    tarea_data["organizacion_id"] = str(current_user.organizacion_id)
    tarea_data["creado_por"] = str(current_user.id)
    
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
    current_user = Depends(get_current_user),
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
    
    # Verificar permisos
    if (existing.data["creado_por"] != str(current_user.id) and 
        current_user.rol not in ["admin", "tecnico_principal"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para editar esta tarea"
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
    current_user = Depends(get_current_user),
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
    
    # Verificar permisos
    if (existing.data["creado_por"] != str(current_user.id) and 
        current_user.rol != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar esta tarea"
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
    current_user = Depends(get_current_user),
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
    nueva_tarea["creado_por"] = str(current_user.id)
    nueva_tarea["organizacion_id"] = str(current_user.organizacion_id)
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
