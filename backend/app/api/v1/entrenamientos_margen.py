"""
TrainingHub Pro - Router de Entrenamientos al Margen
CRUD para entrenamientos personalizados de jugadores al margen.
"""

import logging

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from uuid import UUID

logger = logging.getLogger(__name__)

from app.models.entrenamiento_margen import (
    EntrenamientoMargenCreate,
    EntrenamientoMargenUpdate,
    EntrenamientoMargenResponse,
    EntrenamientoMargenTareaCreate,
    EntrenamientoMargenTareaResponse,
)
from app.database import get_supabase
from app.services.duracion_efectiva import split_margen_efectivo, stamp_margen_notas
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

router = APIRouter()


def _present_margen_tarea(row: dict) -> dict:
    row = dict(row or {})
    clean, efectivos = split_margen_efectivo(row.get("notas"), row.get("minutos_efectivos"))
    row["notas"] = clean
    if efectivos is not None:
        row["minutos_efectivos"] = efectivos
    return row


def _prepare_margen_tarea(tarea_data: dict) -> dict:
    data = dict(tarea_data)
    data["notas"] = stamp_margen_notas(data.get("notas"), data.get("minutos_efectivos"))
    return data


def _insert_margen_tarea(supabase, tarea_data: dict):
    try:
        return supabase.table("entrenamientos_margen_tareas").insert(tarea_data).execute()
    except Exception as e:
        if "minutos_efectivos" in str(e).lower() and "minutos_efectivos" in tarea_data:
            slim = {k: v for k, v in tarea_data.items() if k != "minutos_efectivos"}
            return supabase.table("entrenamientos_margen_tareas").insert(slim).execute()
        raise


def _touch_sesion_carga(supabase, sesion_id) -> None:
    """El tiempo al margen entra en la carga del jugador."""
    if not sesion_id:
        return
    try:
        from app.api.v1.sesiones import _recalc_sesion_carga
        _recalc_sesion_carga(supabase, str(sesion_id))
    except Exception as e:
        logger.warning("recálculo tras margen %s: %s", sesion_id, e)


def _enrich_entrenamiento(ent: dict, tareas: list = None, jugador: dict = None) -> dict:
    """Attach nested tareas and jugador data."""
    ent["tareas"] = tareas or []
    if jugador:
        ent["jugador"] = {
            "id": jugador.get("id"),
            "nombre": jugador.get("nombre"),
            "apellidos": jugador.get("apellidos"),
            "dorsal": jugador.get("dorsal"),
            "posicion_principal": jugador.get("posicion_principal"),
            "foto_url": jugador.get("foto_url"),
        }
    return ent


def _fetch_tareas(supabase, entrenamiento_id: str) -> list:
    """Fetch tareas for an entrenamiento, with optional library tarea nested."""
    res = supabase.table("entrenamientos_margen_tareas").select(
        "*, tareas(id, titulo, codigo, duracion_total)"
    ).eq("entrenamiento_margen_id", entrenamiento_id).order("orden").execute()

    tareas = []
    for t in (res.data or []):
        tarea_lib = t.pop("tareas", None)
        if tarea_lib:
            t["tarea"] = tarea_lib
        tareas.append(_present_margen_tarea(t))
    return tareas


# ─── LIST BY SESSION ───────────────────────────────────────

@router.get("/sesion/{sesion_id}", response_model=List[EntrenamientoMargenResponse])
async def list_by_sesion(
    sesion_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Lista todos los entrenamientos al margen de una sesion."""
    supabase = get_supabase()

    response = supabase.table("entrenamientos_margen").select(
        "*, jugadores(id, nombre, apellidos, dorsal, posicion_principal, foto_url)"
    ).eq("sesion_id", str(sesion_id)).execute()

    results = []
    for ent in (response.data or []):
        jugador = ent.pop("jugadores", None)
        tareas = _fetch_tareas(supabase, ent["id"])

        # Optionally fetch registro_medico title
        registro = None
        if ent.get("registro_medico_id"):
            try:
                rm_res = supabase.table("registros_medicos").select(
                    "id, titulo, tipo, estado"
                ).eq("id", ent["registro_medico_id"]).single().execute()
                registro = rm_res.data
            except Exception:
                pass

        enriched = _enrich_entrenamiento(ent, tareas, jugador)
        enriched["registro_medico"] = registro
        results.append(enriched)

    return results


# ─── CREATE ────────────────────────────────────────────────

@router.post("", response_model=EntrenamientoMargenResponse, status_code=status.HTTP_201_CREATED)
async def create_entrenamiento_margen(
    data: EntrenamientoMargenCreate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Crea un entrenamiento al margen con sus tareas."""
    supabase = get_supabase()

    # Insert parent
    parent_data = data.model_dump(mode="json", exclude={"tareas"}, exclude_none=True)
    parent_data["sesion_id"] = str(parent_data["sesion_id"])
    parent_data["jugador_id"] = str(parent_data["jugador_id"])
    if parent_data.get("registro_medico_id"):
        parent_data["registro_medico_id"] = str(parent_data["registro_medico_id"])

    try:
        parent_res = supabase.table("entrenamientos_margen").insert(parent_data).execute()
    except Exception as e:
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un entrenamiento al margen para este jugador en esta sesion"
            )
        raise

    created = parent_res.data[0]

    # Insert tareas
    tareas_created = []
    for idx, tarea in enumerate(data.tareas):
        tarea_data = tarea.model_dump(mode="json", exclude_none=True)
        tarea_data["entrenamiento_margen_id"] = created["id"]
        tarea_data["orden"] = tarea_data.get("orden", idx + 1)
        if tarea_data.get("tarea_id"):
            tarea_data["tarea_id"] = str(tarea_data["tarea_id"])

        t_res = _insert_margen_tarea(supabase, _prepare_margen_tarea(tarea_data))
        tareas_created.append(_present_margen_tarea(t_res.data[0]))

    # Fetch jugador
    jug_res = supabase.table("jugadores").select(
        "id, nombre, apellidos, dorsal, posicion_principal, foto_url"
    ).eq("id", str(data.jugador_id)).single().execute()

    _touch_sesion_carga(supabase, data.sesion_id)
    return _enrich_entrenamiento(created, tareas_created, jug_res.data)


# ─── GET SINGLE ────────────────────────────────────────────

@router.get("/{entrenamiento_id}", response_model=EntrenamientoMargenResponse)
async def get_entrenamiento_margen(
    entrenamiento_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Obtiene un entrenamiento al margen con sus tareas."""
    supabase = get_supabase()

    response = supabase.table("entrenamientos_margen").select(
        "*, jugadores(id, nombre, apellidos, dorsal, posicion_principal, foto_url)"
    ).eq("id", str(entrenamiento_id)).single().execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Entrenamiento al margen no encontrado")

    ent = response.data
    jugador = ent.pop("jugadores", None)
    tareas = _fetch_tareas(supabase, ent["id"])

    return _enrich_entrenamiento(ent, tareas, jugador)


# ─── UPDATE ────────────────────────────────────────────────

@router.put("/{entrenamiento_id}", response_model=EntrenamientoMargenResponse)
async def update_entrenamiento_margen(
    entrenamiento_id: UUID,
    data: EntrenamientoMargenUpdate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Actualiza campos de un entrenamiento al margen."""
    supabase = get_supabase()

    update_data = data.model_dump(exclude_unset=True, mode="json")
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    if update_data.get("registro_medico_id"):
        update_data["registro_medico_id"] = str(update_data["registro_medico_id"])

    supabase.table("entrenamientos_margen").update(
        update_data
    ).eq("id", str(entrenamiento_id)).execute()

    # Re-fetch full
    response = supabase.table("entrenamientos_margen").select(
        "*, jugadores(id, nombre, apellidos, dorsal, posicion_principal, foto_url)"
    ).eq("id", str(entrenamiento_id)).single().execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Entrenamiento al margen no encontrado")

    ent = response.data
    jugador = ent.pop("jugadores", None)
    tareas = _fetch_tareas(supabase, ent["id"])

    _touch_sesion_carga(supabase, ent.get("sesion_id"))
    return _enrich_entrenamiento(ent, tareas, jugador)


# ─── DELETE ────────────────────────────────────────────────

@router.delete("/{entrenamiento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entrenamiento_margen(
    entrenamiento_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Elimina un entrenamiento al margen (CASCADE elimina tareas)."""
    supabase = get_supabase()
    parent = supabase.table("entrenamientos_margen").select("sesion_id").eq(
        "id", str(entrenamiento_id)
    ).maybe_single().execute()
    sesion_id = (parent.data or {}).get("sesion_id") if parent else None
    supabase.table("entrenamientos_margen").delete().eq(
        "id", str(entrenamiento_id)
    ).execute()
    _touch_sesion_carga(supabase, sesion_id)


# ─── REPLACE TAREAS (BATCH) ───────────────────────────────

@router.put("/{entrenamiento_id}/tareas", response_model=List[EntrenamientoMargenTareaResponse])
async def replace_tareas(
    entrenamiento_id: UUID,
    tareas: List[EntrenamientoMargenTareaCreate],
    auth: AuthContext = Depends(require_permission(Permission.SESSION_UPDATE)),
):
    """Reemplaza todas las tareas de un entrenamiento al margen."""
    supabase = get_supabase()

    # Verify parent exists
    parent_res = supabase.table("entrenamientos_margen").select("id, sesion_id").eq(
        "id", str(entrenamiento_id)
    ).single().execute()
    if not parent_res.data:
        raise HTTPException(status_code=404, detail="Entrenamiento al margen no encontrado")

    # Delete existing
    supabase.table("entrenamientos_margen_tareas").delete().eq(
        "entrenamiento_margen_id", str(entrenamiento_id)
    ).execute()

    # Insert new
    created = []
    for idx, tarea in enumerate(tareas):
        tarea_data = tarea.model_dump(mode="json", exclude_none=True)
        tarea_data["entrenamiento_margen_id"] = str(entrenamiento_id)
        tarea_data["orden"] = tarea_data.get("orden", idx + 1)
        if tarea_data.get("tarea_id"):
            tarea_data["tarea_id"] = str(tarea_data["tarea_id"])

        t_res = _insert_margen_tarea(supabase, _prepare_margen_tarea(tarea_data))
        created.append(_present_margen_tarea(t_res.data[0]))

    _touch_sesion_carga(supabase, parent_res.data.get("sesion_id"))
    return created
