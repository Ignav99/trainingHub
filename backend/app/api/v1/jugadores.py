"""
TrainingHub Pro - Router de Jugadores
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Optional, Union
from uuid import UUID
from datetime import date, datetime

from app.models import (
    JugadorCreate,
    JugadorUpdate,
    JugadorResponse,
    JugadorListResponse,
    PosicionListResponse,
    PosicionResponse,
)
from app.database import get_supabase
from app.dependencies import require_permission, require_any_permission, AuthContext
from app.security.permissions import Permission
from app.services.audit_service import log_create, log_update, log_delete
from app.services.notification_service import notify_jugador_lesion

router = APIRouter()


def calculate_age(birth_date: Union[date, str, None]) -> Optional[int]:
    """Calcula la edad a partir de la fecha de nacimiento."""
    if not birth_date:
        return None

    # Si es string, convertir a date
    if isinstance(birth_date, str):
        try:
            birth_date = datetime.strptime(birth_date, "%Y-%m-%d").date()
        except ValueError:
            return None

    today = date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


def calculate_nivel_global(jugador: dict) -> float:
    """Calcula el nivel global del jugador."""
    niveles = [
        jugador.get('nivel_tecnico', 5),
        jugador.get('nivel_tactico', 5),
        jugador.get('nivel_fisico', 5),
        jugador.get('nivel_mental', 5),
    ]
    return round(sum(niveles) / len(niveles), 1)


def enrich_jugador(jugador: dict) -> dict:
    """Enriquece los datos del jugador con campos calculados."""
    if jugador.get('fecha_nacimiento'):
        jugador['edad'] = calculate_age(jugador['fecha_nacimiento'])
    else:
        jugador['edad'] = None
    jugador['nivel_global'] = calculate_nivel_global(jugador)
    return jugador


@router.get("", response_model=JugadorListResponse)
async def list_jugadores(
    equipo_id: Optional[UUID] = Query(None, description="Filtrar por equipo"),
    organizacion_completa: bool = Query(False, description="Incluir jugadores de todos los equipos de la organizacion"),
    posicion: Optional[str] = Query(None, description="Filtrar por posición"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    es_convocable: Optional[bool] = Query(None, description="Solo convocables"),
    busqueda: Optional[str] = Query(None, description="Buscar por nombre"),
    auth: AuthContext = Depends(require_permission(Permission.PLANTILLA_READ)),
):
    """Lista jugadores con filtros opcionales.

    Si se pasa equipo_id, filtra por ese equipo.
    Si se pasa organizacion_completa=true sin equipo_id, devuelve jugadores
    de todos los equipos de la organizacion (acceso cross-team).
    """
    supabase = get_supabase()

    # Get org team IDs to scope the query
    if equipo_id:
        query = supabase.table("jugadores").select("*, equipos(nombre, categoria)").eq("equipo_id", str(equipo_id))
    elif organizacion_completa and auth.organizacion_id:
        # Get all team IDs for this organization
        equipos_res = supabase.table("equipos").select("id").eq("organizacion_id", auth.organizacion_id).execute()
        equipo_ids = [e["id"] for e in (equipos_res.data or [])]
        if not equipo_ids:
            return JugadorListResponse(data=[], total=0)
        query = supabase.table("jugadores").select("*, equipos(nombre, categoria)").in_("equipo_id", equipo_ids)
    else:
        # Default: scope to org teams for security
        equipos_res = supabase.table("equipos").select("id").eq("organizacion_id", auth.organizacion_id).execute()
        equipo_ids = [e["id"] for e in (equipos_res.data or [])]
        if not equipo_ids:
            return JugadorListResponse(data=[], total=0)
        query = supabase.table("jugadores").select("*, equipos(nombre, categoria)").in_("equipo_id", equipo_ids)

    if posicion:
        query = query.eq("posicion_principal", posicion)

    if estado:
        query = query.eq("estado", estado)

    if es_convocable is not None:
        query = query.eq("es_convocable", es_convocable)

    if busqueda:
        query = query.or_(f"nombre.ilike.%{busqueda}%,apellidos.ilike.%{busqueda}%")

    query = query.order("apellidos", desc=False)

    response = query.execute()

    jugadores = [enrich_jugador(j) for j in response.data]

    return JugadorListResponse(data=jugadores, total=len(jugadores))


@router.get("/posiciones", response_model=PosicionListResponse)
async def list_posiciones():
    """Lista todas las posiciones disponibles."""
    supabase = get_supabase()
    response = supabase.table("posiciones").select("*").order("orden").execute()
    return PosicionListResponse(data=response.data)


@router.get("/{jugador_id}", response_model=JugadorResponse)
async def get_jugador(jugador_id: UUID, auth: AuthContext = Depends(require_permission(Permission.PLANTILLA_READ))):
    """Obtiene un jugador por ID."""
    supabase = get_supabase()
    response = supabase.table("jugadores").select("*").eq("id", str(jugador_id)).single().execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")

    return JugadorResponse(**enrich_jugador(response.data))


@router.post("", response_model=JugadorResponse, status_code=status.HTTP_201_CREATED)
async def create_jugador(jugador: JugadorCreate, auth: AuthContext = Depends(require_permission(Permission.PLANTILLA_MANAGE))):
    """Crea un nuevo jugador."""
    supabase = get_supabase()

    data = jugador.model_dump(mode='json', exclude_none=True)
    data["equipo_id"] = str(data["equipo_id"])

    # Eliminar campos que no existen en la tabla
    data.pop("equipo_origen_id", None)

    # Determinar si es portero
    data["es_portero"] = data.get("posicion_principal") == "POR"

    response = supabase.table("jugadores").insert(data).execute()

    created = response.data[0]
    log_create(auth.user_id, "jugador", created["id"], {"nombre": created.get("nombre")})

    return JugadorResponse(**enrich_jugador(created))


@router.put("/{jugador_id}", response_model=JugadorResponse)
async def update_jugador(jugador_id: UUID, jugador: JugadorUpdate, auth: AuthContext = Depends(require_permission(Permission.JUGADOR_UPDATE))):
    """Actualiza un jugador."""
    supabase = get_supabase()

    data = jugador.model_dump(exclude_unset=True, mode='json')

    # Actualizar flag de portero si cambia la posición
    if data.get("posicion_principal"):
        data["es_portero"] = data["posicion_principal"] == "POR"

    response = supabase.table("jugadores").update(data).eq("id", str(jugador_id)).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")

    log_update(auth.user_id, "jugador", str(jugador_id), datos_nuevos=data)

    return JugadorResponse(**enrich_jugador(response.data[0]))


@router.delete("/{jugador_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_jugador(jugador_id: UUID, auth: AuthContext = Depends(require_permission(Permission.PLANTILLA_MANAGE))):
    """Elimina un jugador."""
    supabase = get_supabase()
    supabase.table("jugadores").delete().eq("id", str(jugador_id)).execute()
    log_delete(auth.user_id, "jugador", str(jugador_id))
    return None


@router.patch("/{jugador_id}/estado")
async def update_estado_jugador(
    jugador_id: UUID,
    estado: str = Query(..., description="Nuevo estado"),
    motivo: Optional[str] = Query(None, description="Motivo del cambio"),
    fecha_vuelta: Optional[date] = Query(None, description="Fecha estimada de vuelta"),
    auth: AuthContext = Depends(require_permission(Permission.JUGADOR_UPDATE)),
):
    """Actualiza el estado de un jugador (lesión, sanción, etc)."""
    supabase = get_supabase()

    data = {"estado": estado}

    if estado == "lesionado":
        data["fecha_lesion"] = date.today().isoformat()
        data["fecha_vuelta_estimada"] = fecha_vuelta.isoformat() if fecha_vuelta else None
        data["motivo_baja"] = motivo

    elif estado == "sancionado":
        data["motivo_baja"] = motivo
        data["fecha_vuelta_estimada"] = fecha_vuelta.isoformat() if fecha_vuelta else None

    elif estado == "activo":
        data["fecha_lesion"] = None
        data["fecha_vuelta_estimada"] = None
        data["motivo_baja"] = None

    response = supabase.table("jugadores").update(data).eq("id", str(jugador_id)).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")

    # Notify staff if player was marked as injured
    if estado == "lesionado":
        jugador_data = response.data[0]
        notify_jugador_lesion(
            jugador_nombre=f"{jugador_data.get('nombre', '')} {jugador_data.get('apellidos', '')}".strip(),
            equipo_id=jugador_data["equipo_id"],
            jugador_id=str(jugador_id),
        )

    return {"message": "Estado actualizado", "jugador": enrich_jugador(response.data[0])}


@router.get("/equipo/{equipo_id}/estadisticas")
async def get_estadisticas_equipo(equipo_id: UUID, auth: AuthContext = Depends(require_permission(Permission.PLANTILLA_READ, equipo_id_param="equipo_id"))):
    """Obtiene estadísticas del equipo."""
    supabase = get_supabase()

    response = supabase.table("jugadores").select("*").eq("equipo_id", str(equipo_id)).execute()

    jugadores = response.data
    total = len(jugadores)

    if total == 0:
        return {
            "total_jugadores": 0,
            "por_posicion": {},
            "por_estado": {},
            "niveles_promedio": {},
            "edad_promedio": None,
        }

    # Conteo por posición
    por_posicion = {}
    for j in jugadores:
        pos = j.get('posicion_principal', 'N/A')
        por_posicion[pos] = por_posicion.get(pos, 0) + 1

    # Conteo por estado
    por_estado = {}
    for j in jugadores:
        est = j.get('estado', 'activo')
        por_estado[est] = por_estado.get(est, 0) + 1

    # Niveles promedio
    niveles = {
        'tecnico': sum(j.get('nivel_tecnico', 5) for j in jugadores) / total,
        'tactico': sum(j.get('nivel_tactico', 5) for j in jugadores) / total,
        'fisico': sum(j.get('nivel_fisico', 5) for j in jugadores) / total,
        'mental': sum(j.get('nivel_mental', 5) for j in jugadores) / total,
    }

    # Edad promedio
    edades = [calculate_age(j['fecha_nacimiento']) for j in jugadores if j.get('fecha_nacimiento')]
    edad_promedio = sum(edades) / len(edades) if edades else None

    return {
        "total_jugadores": total,
        "por_posicion": por_posicion,
        "por_estado": por_estado,
        "niveles_promedio": {k: round(v, 1) for k, v in niveles.items()},
        "edad_promedio": round(edad_promedio, 1) if edad_promedio else None,
    }
