"""
TrainingHub Pro - Tablero del cuerpo técnico
Comentarios, preguntas, tareas y avisos del staff con respuestas y menciones.
"""

from datetime import date
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.database import get_supabase
from app.dependencies import AuthContext, require_permission
from app.security.permissions import Permission
from app.services import staff_board_service as tablero

router = APIRouter()

ROLES_RESPONSABLES = {"entrenador_principal"}


class PostCreate(BaseModel):
    equipo_id: UUID
    tipo: Literal["comentario", "pregunta", "tarea", "aviso"] = "comentario"
    contenido: str = Field(..., min_length=1, max_length=5000)
    parent_id: Optional[UUID] = None
    asignado_a: Optional[UUID] = None
    fecha_limite: Optional[date] = None
    entidad_tipo: Optional[Literal["sesion", "partido", "jugador"]] = None
    entidad_id: Optional[UUID] = None


class PostUpdate(BaseModel):
    contenido: Optional[str] = Field(None, max_length=5000)
    estado: Optional[Literal["abierta", "resuelta"]] = None
    asignado_a: Optional[UUID] = None
    fecha_limite: Optional[date] = None
    fijado: Optional[bool] = None


def _require_staff(auth: AuthContext) -> None:
    if auth.user.rol in ("admin", "superadmin_plataforma"):
        return
    if not auth.rol_en_equipo or auth.rol_en_equipo in tablero.ROLES_NO_STAFF:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El tablero es solo para el cuerpo técnico")


def _es_responsable(auth: AuthContext) -> bool:
    return auth.rol_en_equipo in ROLES_RESPONSABLES or auth.user.rol in ("admin", "superadmin_plataforma")


def _actor(auth: AuthContext) -> dict:
    u = auth.user
    return {"id": auth.user_id, "nombre": u.nombre, "apellidos": getattr(u, "apellidos", None), "email": u.email}


def _run(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except tablero.TableroError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.detalle) from exc


@router.get("/miembros")
async def list_miembros(
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Staff del equipo para mencionar o asignar tareas."""
    _require_staff(auth)
    return {"data": tablero.miembros_staff(get_supabase(), str(equipo_id))}


@router.get("/resumen")
async def get_resumen(
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    _require_staff(auth)
    return tablero.resumen(get_supabase(), str(equipo_id), auth.user_id)


@router.get("/actividad")
async def get_actividad(
    equipo_id: UUID,
    dias: int = Query(14, ge=1, le=60),
    limit: int = Query(40, ge=1, le=100),
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """Lo último que ha hecho el staff: sesiones, partidos, fichas y tablero."""
    _require_staff(auth)
    return {"data": tablero.actividad_equipo(get_supabase(), str(equipo_id), dias=dias, limite=limit)}


@router.get("")
async def list_posts(
    equipo_id: UUID,
    filtro: str = Query("todo"),
    entidad_tipo: Optional[Literal["sesion", "partido", "jugador"]] = None,
    entidad_id: Optional[UUID] = None,
    antes: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    _require_staff(auth)
    return _run(
        tablero.listar_hilos,
        get_supabase(),
        str(equipo_id),
        auth.user_id,
        filtro=filtro,
        entidad_tipo=entidad_tipo,
        entidad_id=str(entidad_id) if entidad_id else None,
        antes=antes,
        limite=limit,
    )


@router.get("/{post_id}")
async def get_post(
    post_id: UUID,
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    _require_staff(auth)
    return _run(tablero.obtener_hilo, get_supabase(), str(equipo_id), str(post_id))


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_post(
    body: PostCreate,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    _require_staff(auth)
    if auth.is_read_only:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta en modo solo lectura")
    datos = body.model_dump(mode="json")
    return _run(tablero.crear_post, get_supabase(), str(body.equipo_id), _actor(auth), datos)


@router.patch("/{post_id}")
async def update_post(
    post_id: UUID,
    body: PostUpdate,
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    _require_staff(auth)
    cambios = body.model_dump(mode="json", exclude_unset=True)
    return _run(
        tablero.actualizar_post,
        get_supabase(),
        str(equipo_id),
        str(post_id),
        _actor(auth),
        cambios,
        es_responsable=_es_responsable(auth),
    )


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: UUID,
    equipo_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    _require_staff(auth)
    _run(
        tablero.borrar_post,
        get_supabase(),
        str(equipo_id),
        str(post_id),
        auth.user_id,
        es_responsable=_es_responsable(auth),
    )
    return None
