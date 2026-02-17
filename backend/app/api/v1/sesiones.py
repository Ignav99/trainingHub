"""
TrainingHub Pro - Router de Sesiones
CRUD para sesiones de entrenamiento.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import StreamingResponse
from typing import Optional
from uuid import UUID
from datetime import date
from math import ceil
import io

from app.models import (
    SesionCreate,
    SesionUpdate,
    SesionResponse,
    SesionListResponse,
    SesionTareaCreate,
    SesionTareaResponse,
    MatchDay,
    EstadoSesion,
    UsuarioResponse,
)
from app.database import get_supabase
from app.dependencies import get_current_user
from app.services.pdf_service import generate_sesion_pdf
from app.services.storage_service import upload_file
from app.config import get_settings

router = APIRouter()


@router.get("", response_model=SesionListResponse)
async def list_sesiones(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    equipo_id: Optional[UUID] = None,
    match_day: Optional[MatchDay] = None,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    estado: Optional[EstadoSesion] = None,
    busqueda: Optional[str] = None,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Lista sesiones con filtros."""
    supabase = get_supabase()

    # Query base
    query = supabase.table("sesiones").select(
        "*, equipos(nombre, categoria)",
        count="exact"
    )

    # Filtrar por equipos de la organización del usuario
    equipos = supabase.table("equipos").select("id").eq(
        "organizacion_id", str(current_user.organizacion_id)
    ).execute()

    equipo_ids = [e["id"] for e in equipos.data]
    if equipo_ids:
        query = query.in_("equipo_id", equipo_ids)

    # Aplicar filtros
    if equipo_id:
        query = query.eq("equipo_id", str(equipo_id))

    if match_day:
        query = query.eq("match_day", match_day.value)

    if fecha_desde:
        query = query.gte("fecha", fecha_desde.isoformat())

    if fecha_hasta:
        query = query.lte("fecha", fecha_hasta.isoformat())

    if estado:
        query = query.eq("estado", estado.value)

    if busqueda:
        query = query.or_(f"titulo.ilike.%{busqueda}%,objetivo_principal.ilike.%{busqueda}%")

    # Ordenar por fecha descendente
    query = query.order("fecha", desc=True)

    # Paginación
    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    response = query.execute()

    total = response.count or 0
    pages = ceil(total / limit) if total > 0 else 1

    # Mapear respuesta
    sesiones = []
    for s in response.data:
        s["equipo"] = s.pop("equipos", None)
        sesiones.append(SesionResponse(**s))

    return SesionListResponse(
        data=sesiones,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/{sesion_id}", response_model=SesionResponse)
async def get_sesion(
    sesion_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Obtiene una sesión con todas sus tareas."""
    supabase = get_supabase()

    # Obtener sesión
    response = supabase.table("sesiones").select(
        "*, equipos(nombre, categoria)"
    ).eq("id", str(sesion_id)).single().execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )

    sesion_data = response.data
    sesion_data["equipo"] = sesion_data.pop("equipos", None)

    # Obtener tareas de la sesión
    tareas_response = supabase.table("sesion_tareas").select(
        "*, tareas(*, categorias_tarea(*))"
    ).eq("sesion_id", str(sesion_id)).order("orden").execute()

    sesion_data["tareas"] = []
    for st in tareas_response.data:
        tarea_data = st.pop("tareas", {})
        if tarea_data:
            tarea_data["categoria"] = tarea_data.pop("categorias_tarea", None)
        st["tarea"] = tarea_data
        sesion_data["tareas"].append(SesionTareaResponse(**st))

    return SesionResponse(**sesion_data)


@router.post("", response_model=SesionResponse, status_code=status.HTTP_201_CREATED)
async def create_sesion(
    sesion: SesionCreate,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Crea una nueva sesión."""
    supabase = get_supabase()

    # Preparar datos
    sesion_data = sesion.model_dump(exclude_unset=True)
    sesion_data["creado_por"] = str(current_user.id)

    # Usar equipo por defecto si no se proporciona
    if not sesion_data.get("equipo_id"):
        # Obtener primer equipo de la organización
        equipos = supabase.table("equipos").select("id").eq(
            "organizacion_id", str(current_user.organizacion_id)
        ).limit(1).execute()

        if equipos.data:
            sesion_data["equipo_id"] = equipos.data[0]["id"]
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se encontró ningún equipo en la organización"
            )
    else:
        sesion_data["equipo_id"] = str(sesion_data["equipo_id"])

    # Convertir fecha a string
    if sesion_data.get("fecha"):
        sesion_data["fecha"] = sesion_data["fecha"].isoformat()

    # Insertar
    response = supabase.table("sesiones").insert(sesion_data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error al crear sesión"
        )

    return SesionResponse(**response.data[0])


@router.put("/{sesion_id}", response_model=SesionResponse)
async def update_sesion(
    sesion_id: UUID,
    sesion: SesionUpdate,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Actualiza una sesión."""
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("sesiones").select("*").eq(
        "id", str(sesion_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )

    # Preparar datos
    update_data = sesion.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay datos para actualizar"
        )

    # Convertir fecha si existe
    if update_data.get("fecha"):
        update_data["fecha"] = update_data["fecha"].isoformat()

    # Actualizar
    response = supabase.table("sesiones").update(update_data).eq(
        "id", str(sesion_id)
    ).execute()

    return SesionResponse(**response.data[0])


@router.delete("/{sesion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sesion(
    sesion_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Elimina una sesión."""
    supabase = get_supabase()

    # Verificar que existe
    existing = supabase.table("sesiones").select("id").eq(
        "id", str(sesion_id)
    ).single().execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )

    # Las tareas se eliminan en cascada por la FK
    supabase.table("sesiones").delete().eq("id", str(sesion_id)).execute()

    return None


@router.post("/{sesion_id}/tareas", response_model=SesionResponse)
async def add_tarea_to_sesion(
    sesion_id: UUID,
    tarea_data: SesionTareaCreate,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Añade una tarea a la sesión."""
    supabase = get_supabase()

    # Verificar que la sesión existe
    sesion = supabase.table("sesiones").select("id").eq(
        "id", str(sesion_id)
    ).single().execute()

    if not sesion.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )

    # Añadir tarea
    data = {
        "sesion_id": str(sesion_id),
        "tarea_id": str(tarea_data.tarea_id),
        "orden": tarea_data.orden,
        "fase_sesion": tarea_data.fase_sesion.value,
        "duracion_override": tarea_data.duracion_override,
        "notas": tarea_data.notas,
    }

    supabase.table("sesion_tareas").insert(data).execute()

    # Recalcular duración total
    tareas = supabase.table("sesion_tareas").select(
        "duracion_override, tareas(duracion_total)"
    ).eq("sesion_id", str(sesion_id)).execute()

    duracion_total = sum(
        t.get("duracion_override") or t.get("tareas", {}).get("duracion_total", 0)
        for t in tareas.data
    )

    supabase.table("sesiones").update({
        "duracion_total": duracion_total
    }).eq("id", str(sesion_id)).execute()

    # Devolver sesión actualizada
    return await get_sesion(sesion_id, current_user)


@router.delete("/{sesion_id}/tareas/{tarea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tarea_from_sesion(
    sesion_id: UUID,
    tarea_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Elimina una tarea de la sesión."""
    supabase = get_supabase()

    supabase.table("sesion_tareas").delete().match({
        "sesion_id": str(sesion_id),
        "tarea_id": str(tarea_id)
    }).execute()

    return None


@router.get("/{sesion_id}/pdf")
async def generate_pdf(
    sesion_id: UUID,
    current_user: UsuarioResponse = Depends(get_current_user),
):
    """Genera el PDF de la sesión, lo sube a Storage y lo devuelve."""
    supabase = get_supabase()

    # Obtener sesión completa
    sesion_response = supabase.table("sesiones").select(
        "*, equipos(*, organizaciones(*))"
    ).eq("id", str(sesion_id)).single().execute()

    if not sesion_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada"
        )

    sesion = sesion_response.data
    equipo = sesion.get("equipos", {})
    organizacion = equipo.get("organizaciones", {})

    # Obtener tareas
    tareas_response = supabase.table("sesion_tareas").select(
        "*, tareas(*, categorias_tarea(*))"
    ).eq("sesion_id", str(sesion_id)).order("orden").execute()

    tareas = tareas_response.data

    # Generar PDF con el servicio
    pdf_bytes = generate_sesion_pdf(sesion, tareas, organizacion)

    # Subir a Storage
    settings = get_settings()
    storage_path = f"sesiones/{current_user.organizacion_id}/{sesion_id}.pdf"

    try:
        pdf_url = upload_file(
            bucket=settings.STORAGE_BUCKET_PDFS,
            path=storage_path,
            data=pdf_bytes,
            content_type="application/pdf",
        )

        # Guardar URL en la sesión
        supabase.table("sesiones").update({
            "pdf_url": pdf_url
        }).eq("id", str(sesion_id)).execute()
    except Exception:
        # Si falla el upload, devolvemos el PDF de todas formas
        pass

    # Devolver PDF como streaming response
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="sesion_{sesion_id}.pdf"'
        }
    )
