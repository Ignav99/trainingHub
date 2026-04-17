"""
TrainingHub Pro - Video Tag Categories
Endpoints para gestionar categorías de tags y descriptores de video.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_supabase
from app.models.video_tag import (
    VideoTagCategoryCreate,
    VideoTagCategoryUpdate,
    VideoTagDescriptorCreate,
    VideoTagDescriptorUpdate,
)
from app.security.dependencies import AuthContext, require_permission
from app.security.permissions import Permission

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Default seed categories for football ============

DEFAULT_CATEGORIES = [
    {
        "nombre": "Pase",
        "color": "#3B82F6",
        "shortcut_key": "1",
        "default_duration_secs": 8,
        "orden": 0,
        "descriptors": [
            {"nombre": "Corto", "orden": 0},
            {"nombre": "Largo", "orden": 1},
            {"nombre": "Filtrado", "orden": 2},
            {"nombre": "En profundidad", "orden": 3},
        ],
    },
    {
        "nombre": "Tiro",
        "color": "#EF4444",
        "shortcut_key": "2",
        "default_duration_secs": 10,
        "orden": 1,
        "descriptors": [
            {"nombre": "A puerta", "orden": 0},
            {"nombre": "Fuera", "orden": 1},
            {"nombre": "Bloqueado", "orden": 2},
        ],
    },
    {
        "nombre": "Entrada",
        "color": "#F59E0B",
        "shortcut_key": "3",
        "default_duration_secs": 8,
        "orden": 2,
        "descriptors": [
            {"nombre": "Ganada", "orden": 0},
            {"nombre": "Perdida", "orden": 1},
        ],
    },
    {
        "nombre": "Falta",
        "color": "#8B5CF6",
        "shortcut_key": "4",
        "default_duration_secs": 10,
        "orden": 3,
        "descriptors": [
            {"nombre": "A favor", "orden": 0},
            {"nombre": "En contra", "orden": 1},
            {"nombre": "Tarjeta", "orden": 2},
        ],
    },
    {
        "nombre": "Corner",
        "color": "#06B6D4",
        "shortcut_key": "5",
        "default_duration_secs": 15,
        "orden": 4,
        "descriptors": [
            {"nombre": "A favor", "orden": 0},
            {"nombre": "En contra", "orden": 1},
        ],
    },
    {
        "nombre": "Gol",
        "color": "#22C55E",
        "shortcut_key": "6",
        "default_duration_secs": 15,
        "orden": 5,
        "descriptors": [
            {"nombre": "A favor", "orden": 0},
            {"nombre": "En contra", "orden": 1},
            {"nombre": "Anulado", "orden": 2},
        ],
    },
    {
        "nombre": "Transición",
        "color": "#EC4899",
        "shortcut_key": "7",
        "default_duration_secs": 10,
        "orden": 6,
        "descriptors": [
            {"nombre": "Ataque→Defensa", "orden": 0},
            {"nombre": "Defensa→Ataque", "orden": 1},
        ],
    },
    {
        "nombre": "Pérdida",
        "color": "#F97316",
        "shortcut_key": "8",
        "default_duration_secs": 8,
        "orden": 7,
        "descriptors": [
            {"nombre": "Zona propia", "orden": 0},
            {"nombre": "Zona rival", "orden": 1},
        ],
    },
    {
        "nombre": "Otro",
        "color": "#6B7280",
        "shortcut_key": "9",
        "default_duration_secs": 10,
        "orden": 8,
        "descriptors": [
            {"nombre": "Positivo", "orden": 0},
            {"nombre": "Negativo", "orden": 1},
        ],
    },
]


# ============ LIST categories with descriptors ============

@router.get("/equipos/{equipo_id}/video-tag-categories")
async def list_categories(
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_TAG_READ)),
):
    """Lista categorías de tag con sus descriptores."""
    supabase = get_supabase()

    cats = (
        supabase.table("video_tag_categories")
        .select("*")
        .eq("equipo_id", str(equipo_id))
        .order("orden", desc=False)
        .execute()
    )

    # Fetch all descriptors for these categories in one query
    cat_ids = [c["id"] for c in (cats.data or [])]
    descriptors_map: dict[str, list] = {}

    if cat_ids:
        descs = (
            supabase.table("video_tag_descriptors")
            .select("*")
            .in_("category_id", cat_ids)
            .order("orden", desc=False)
            .execute()
        )
        for d in (descs.data or []):
            descriptors_map.setdefault(d["category_id"], []).append(d)

    # Attach descriptors to each category
    result = []
    for cat in (cats.data or []):
        cat["descriptors"] = descriptors_map.get(cat["id"], [])
        result.append(cat)

    return {"data": result}


# ============ CREATE category ============

@router.post("/equipos/{equipo_id}/video-tag-categories", status_code=201)
async def create_category(
    equipo_id: UUID,
    data: VideoTagCategoryCreate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_TAG_CREATE)),
):
    """Crea una nueva categoría de tag."""
    supabase = get_supabase()

    row = {
        "equipo_id": str(equipo_id),
        "nombre": data.nombre,
        "color": data.color,
        "shortcut_key": data.shortcut_key,
        "fase": data.fase,
        "default_duration_secs": data.default_duration_secs,
        "orden": data.orden,
    }

    result = supabase.table("video_tag_categories").insert(row).execute()
    return result.data[0]


# ============ UPDATE category ============

@router.put("/video-tag-categories/{category_id}")
async def update_category(
    category_id: UUID,
    data: VideoTagCategoryUpdate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_TAG_CREATE)),
):
    """Actualiza una categoría de tag."""
    supabase = get_supabase()

    existing = (
        supabase.table("video_tag_categories")
        .select("id")
        .eq("id", str(category_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")

    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar.")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("video_tag_categories")
        .update(updates)
        .eq("id", str(category_id))
        .execute()
    )
    return result.data[0]


# ============ DELETE category ============

@router.delete("/video-tag-categories/{category_id}")
async def delete_category(
    category_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_TAG_CREATE)),
):
    """Elimina una categoría de tag (cascadea descriptores y tags)."""
    supabase = get_supabase()

    existing = (
        supabase.table("video_tag_categories")
        .select("id")
        .eq("id", str(category_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")

    supabase.table("video_tag_categories").delete().eq("id", str(category_id)).execute()
    return {"status": "deleted"}


# ============ CREATE descriptor ============

@router.post("/video-tag-categories/{category_id}/descriptors", status_code=201)
async def create_descriptor(
    category_id: UUID,
    data: VideoTagDescriptorCreate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_TAG_CREATE)),
):
    """Crea un descriptor bajo una categoría."""
    supabase = get_supabase()

    existing = (
        supabase.table("video_tag_categories")
        .select("id")
        .eq("id", str(category_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")

    row = {
        "category_id": str(category_id),
        "nombre": data.nombre,
        "color": data.color,
        "shortcut_key": data.shortcut_key,
        "orden": data.orden,
    }

    result = supabase.table("video_tag_descriptors").insert(row).execute()
    return result.data[0]


# ============ UPDATE descriptor ============

@router.put("/video-tag-descriptors/{descriptor_id}")
async def update_descriptor(
    descriptor_id: UUID,
    data: VideoTagDescriptorUpdate,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_TAG_CREATE)),
):
    """Actualiza un descriptor."""
    supabase = get_supabase()

    existing = (
        supabase.table("video_tag_descriptors")
        .select("id")
        .eq("id", str(descriptor_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Descriptor no encontrado.")

    updates = data.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar.")

    result = (
        supabase.table("video_tag_descriptors")
        .update(updates)
        .eq("id", str(descriptor_id))
        .execute()
    )
    return result.data[0]


# ============ DELETE descriptor ============

@router.delete("/video-tag-descriptors/{descriptor_id}")
async def delete_descriptor(
    descriptor_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_TAG_CREATE)),
):
    """Elimina un descriptor."""
    supabase = get_supabase()

    existing = (
        supabase.table("video_tag_descriptors")
        .select("id")
        .eq("id", str(descriptor_id))
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Descriptor no encontrado.")

    supabase.table("video_tag_descriptors").delete().eq("id", str(descriptor_id)).execute()
    return {"status": "deleted"}


# ============ SEED default categories ============

@router.post("/equipos/{equipo_id}/video-tag-categories/seed", status_code=201)
async def seed_default_categories(
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.VIDEO_TAG_CREATE)),
):
    """Crea categorías y descriptores por defecto para fútbol."""
    supabase = get_supabase()

    # Check if team already has categories
    existing = (
        supabase.table("video_tag_categories")
        .select("id")
        .eq("equipo_id", str(equipo_id))
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=409,
            detail="El equipo ya tiene categorías. Elimínalas primero si quieres regenerar.",
        )

    created = []
    for cat_def in DEFAULT_CATEGORIES:
        descriptors = cat_def.pop("descriptors", [])
        cat_def["equipo_id"] = str(equipo_id)

        cat_result = supabase.table("video_tag_categories").insert(cat_def).execute()
        cat = cat_result.data[0]

        # Insert descriptors for this category
        if descriptors:
            for desc in descriptors:
                desc["category_id"] = cat["id"]
            supabase.table("video_tag_descriptors").insert(descriptors).execute()

        created.append(cat)

    return {"data": created, "count": len(created)}
