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


# Whitelist: only these fields exist in the Supabase jugadores table.
# Any field NOT in this set will be silently dropped before insert/update.
_DB_COLUMNS = {
    "nombre", "apellidos", "apodo", "dorsal", "fecha_nacimiento",
    "posicion_principal", "posiciones_secundarias", "pierna_dominante",
    "altura", "peso",
    "nivel_tecnico", "nivel_tactico", "nivel_fisico", "nivel_mental",
    "estado", "fecha_lesion", "fecha_vuelta_estimada", "motivo_baja",
    "es_capitan", "es_convocable", "es_portero", "es_invitado",
    "tipo_jugador", "ficha_estado", "fecha_fin_prueba",
    "notas", "foto_url",
    "equipo_id", "equipo_origen_id",
}

_FICHA_DEFAULTS = {
    "plantilla": "completa",
    "juvenil": "pre_ficha",
    "prueba": "pre_ficha",
    "invitado": "minima",
}


def _sanitize_jugador_data(data: dict) -> dict:
    """Keep only fields that exist in the Supabase jugadores table."""
    return {k: v for k, v in data.items() if k in _DB_COLUMNS}


def _apply_tipo_defaults(data: dict) -> dict:
    """Sync tipo_jugador ↔ es_invitado ↔ ficha_estado."""
    tipo = data.get("tipo_jugador")
    if not tipo and data.get("es_invitado"):
        tipo = "invitado"
        data["tipo_jugador"] = tipo
    if not tipo:
        tipo = "plantilla"
        data["tipo_jugador"] = tipo

    data["es_invitado"] = tipo != "plantilla"
    if not data.get("ficha_estado"):
        data["ficha_estado"] = _FICHA_DEFAULTS.get(tipo, "completa")
    if tipo == "plantilla":
        data["ficha_estado"] = data.get("ficha_estado") or "completa"
        data["es_invitado"] = False
    return data


def enrich_jugador(jugador: dict) -> dict:
    """Enriquece los datos del jugador con campos calculados."""
    if jugador.get('fecha_nacimiento'):
        jugador['edad'] = calculate_age(jugador['fecha_nacimiento'])
    else:
        jugador['edad'] = None
    jugador['nivel_global'] = calculate_nivel_global(jugador)
    # Compatibilidad si aún no se ha aplicado la migración 059
    if not jugador.get("tipo_jugador"):
        jugador["tipo_jugador"] = "invitado" if jugador.get("es_invitado") else "plantilla"
    if not jugador.get("ficha_estado"):
        jugador["ficha_estado"] = _FICHA_DEFAULTS.get(jugador["tipo_jugador"], "completa")
    return jugador


@router.get("", response_model=JugadorListResponse)
async def list_jugadores(
    equipo_id: Optional[UUID] = Query(None, description="Filtrar por equipo"),
    organizacion_completa: bool = Query(False, description="Incluir jugadores de todos los equipos de la organizacion"),
    posicion: Optional[str] = Query(None, description="Filtrar por posición"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    es_convocable: Optional[bool] = Query(None, description="Solo convocables"),
    tipo_jugador: Optional[str] = Query(None, description="plantilla|juvenil|prueba|invitado"),
    ficha_estado: Optional[str] = Query(None, description="completa|pre_ficha|minima"),
    solo_plantilla: Optional[bool] = Query(None, description="Solo jugadores de plantilla oficial"),
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

    if solo_plantilla is True:
        # Compat: es_invitado=false ≡ plantilla (tras sync de tipología)
        query = query.eq("es_invitado", False)

    if busqueda:
        query = query.or_(f"nombre.ilike.%{busqueda}%,apellidos.ilike.%{busqueda}%")

    query = query.order("apellidos", desc=False)

    # tipo_jugador / ficha_estado pueden no existir aún (migración 059)
    try:
        if tipo_jugador:
            response = query.eq("tipo_jugador", tipo_jugador).execute()
        elif ficha_estado:
            response = query.eq("ficha_estado", ficha_estado).execute()
        else:
            response = query.execute()
    except Exception:
        response = query.execute()

    jugadores = [enrich_jugador(j) for j in response.data]
    if tipo_jugador:
        jugadores = [j for j in jugadores if j.get("tipo_jugador") == tipo_jugador]
    if ficha_estado:
        jugadores = [j for j in jugadores if j.get("ficha_estado") == ficha_estado]
    if solo_plantilla is True:
        jugadores = [j for j in jugadores if j.get("tipo_jugador") == "plantilla"]

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
    if data.get("equipo_origen_id"):
        data["equipo_origen_id"] = str(data["equipo_origen_id"])
    data = _apply_tipo_defaults(data)
    data = _sanitize_jugador_data(data)

    # Determinar si es portero
    data["es_portero"] = data.get("posicion_principal") == "POR"

    try:
        response = supabase.table("jugadores").insert(data).execute()
    except Exception:
        # Compat si aún no se aplicó migración 059
        legacy = {k: v for k, v in data.items() if k not in ("tipo_jugador", "ficha_estado", "fecha_fin_prueba")}
        response = supabase.table("jugadores").insert(legacy).execute()

    created = response.data[0]
    log_create(auth.user_id, "jugador", created["id"], {"nombre": created.get("nombre")})

    return JugadorResponse(**enrich_jugador(created))


@router.put("/{jugador_id}", response_model=JugadorResponse)
async def update_jugador(jugador_id: UUID, jugador: JugadorUpdate, auth: AuthContext = Depends(require_permission(Permission.JUGADOR_UPDATE))):
    """Actualiza un jugador."""
    supabase = get_supabase()

    data = jugador.model_dump(exclude_unset=True, mode='json')
    if "equipo_origen_id" in data and data["equipo_origen_id"] is not None:
        data["equipo_origen_id"] = str(data["equipo_origen_id"])
    if "tipo_jugador" in data or "es_invitado" in data or "ficha_estado" in data:
        data = _apply_tipo_defaults(data)
    data = _sanitize_jugador_data(data)

    # Actualizar flag de portero si cambia la posición
    if data.get("posicion_principal"):
        data["es_portero"] = data["posicion_principal"] == "POR"

    if not data:
        raise HTTPException(status_code=400, detail="No hay campos válidos para actualizar")

    supabase.table("jugadores").update(data).eq("id", str(jugador_id)).execute()
    response = supabase.table("jugadores").select("*").eq("id", str(jugador_id)).single().execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")

    log_update(auth.user_id, "jugador", str(jugador_id), datos_nuevos=data)

    return JugadorResponse(**enrich_jugador(response.data))


@router.post("/{jugador_id}/promover-plantilla", response_model=JugadorResponse)
async def promover_a_plantilla(
    jugador_id: UUID,
    body: Optional[dict] = None,
    auth: AuthContext = Depends(require_permission(Permission.PLANTILLA_MANAGE)),
):
    """Convierte juvenil/prueba/invitado en jugador de plantilla con ficha completa."""
    from app.models.jugador import JugadorPromoverPlantilla

    supabase = get_supabase()
    existing = supabase.table("jugadores").select("*").eq("id", str(jugador_id)).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")

    payload = JugadorPromoverPlantilla(**(body or {}))
    data = {
        "tipo_jugador": "plantilla",
        "ficha_estado": "completa",
        "es_invitado": False,
        "es_convocable": payload.es_convocable,
        "fecha_fin_prueba": None,
    }
    if payload.dorsal is not None:
        data["dorsal"] = payload.dorsal
    if payload.notas is not None:
        data["notas"] = payload.notas

    data = _sanitize_jugador_data(data)
    try:
        supabase.table("jugadores").update(data).eq("id", str(jugador_id)).execute()
    except Exception:
        legacy = {k: v for k, v in data.items() if k not in ("tipo_jugador", "ficha_estado", "fecha_fin_prueba")}
        supabase.table("jugadores").update(legacy).eq("id", str(jugador_id)).execute()
    response = supabase.table("jugadores").select("*").eq("id", str(jugador_id)).single().execute()
    log_update(auth.user_id, "jugador", str(jugador_id), datos_nuevos=data)
    return JugadorResponse(**enrich_jugador(response.data))


@router.delete("/{jugador_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_jugador(jugador_id: UUID, auth: AuthContext = Depends(require_permission(Permission.PLANTILLA_MANAGE))):
    """Elimina un jugador y sus referencias en otras tablas."""
    supabase = get_supabase()
    jid = str(jugador_id)

    # Delete from referencing tables first (cascade)
    for table in ("convocatorias", "asistencias_sesion", "registros_rpe", "carga_acumulada_jugador"):
        try:
            supabase.table(table).delete().eq("jugador_id", jid).execute()
        except Exception:
            pass  # Table might not exist or have no rows

    # Medical records cascade: accesos_medicos_log -> registros_medicos -> jugador
    try:
        med_res = supabase.table("registros_medicos").select("id").eq("jugador_id", jid).execute()
        registro_ids = [r["id"] for r in (med_res.data or [])]
        if registro_ids:
            supabase.table("accesos_medicos_log").delete().in_("registro_medico_id", registro_ids).execute()
        supabase.table("registros_medicos").delete().eq("jugador_id", jid).execute()
    except Exception:
        pass

    supabase.table("jugadores").delete().eq("id", jid).execute()
    log_delete(auth.user_id, "jugador", jid)
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

    # Mapear disponibilidad operativa coherente con el estado manual
    if estado == "activo":
        data["disponibilidad"] = "pleno"
        data["fecha_lesion"] = None
        data["fecha_vuelta_estimada"] = None
        data["motivo_baja"] = None
    elif estado == "lesionado":
        data["disponibilidad"] = "fuera"
        data["fecha_lesion"] = date.today().isoformat()
        data["fecha_vuelta_estimada"] = fecha_vuelta.isoformat() if fecha_vuelta else None
        data["motivo_baja"] = motivo
    elif estado == "en_recuperacion":
        data["disponibilidad"] = "individual"
        data["fecha_vuelta_estimada"] = fecha_vuelta.isoformat() if fecha_vuelta else None
        data["motivo_baja"] = motivo
    elif estado == "enfermo":
        data["disponibilidad"] = "fuera"
        data["motivo_baja"] = motivo
        data["fecha_vuelta_estimada"] = fecha_vuelta.isoformat() if fecha_vuelta else None
    elif estado in ("sancionado", "viaje", "permiso", "seleccion", "baja"):
        data["disponibilidad"] = "fuera"
        data["motivo_baja"] = motivo
        data["fecha_vuelta_estimada"] = fecha_vuelta.isoformat() if fecha_vuelta else None

    supabase.table("jugadores").update(data).eq("id", str(jugador_id)).execute()
    response = supabase.table("jugadores").select("*").eq("id", str(jugador_id)).single().execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")

    # Notify staff if player was marked as injured
    if estado == "lesionado":
        jugador_data = response.data
        notify_jugador_lesion(
            jugador_nombre=f"{jugador_data.get('nombre', '')} {jugador_data.get('apellidos', '')}".strip(),
            equipo_id=jugador_data["equipo_id"],
            jugador_id=str(jugador_id),
        )

    return {"message": "Estado actualizado", "jugador": enrich_jugador(response.data)}


@router.get("/equipo/{equipo_id}/estadisticas")
async def get_estadisticas_equipo(equipo_id: UUID, auth: AuthContext = Depends(require_permission(Permission.PLANTILLA_READ, equipo_id_param="equipo_id"))):
    """Obtiene estadísticas del equipo."""
    supabase = get_supabase()

    response = supabase.table("jugadores").select("*").eq("equipo_id", str(equipo_id)).eq("es_invitado", False).execute()

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


# ─── PLAYER MARGIN WORKOUT HISTORY ─────────────────────────

@router.get("/{jugador_id}/entrenamientos-margen")
async def get_entrenamientos_margen_jugador(
    jugador_id: UUID,
    auth: AuthContext = Depends(require_permission(Permission.PLANTILLA_READ)),
):
    """Historial de entrenamientos al margen de un jugador."""
    supabase = get_supabase()

    response = supabase.table("entrenamientos_margen").select(
        "*, sesiones(id, titulo, fecha, match_day)"
    ).eq("jugador_id", str(jugador_id)).order("created_at", desc=True).execute()

    results = []
    for ent in (response.data or []):
        sesion = ent.pop("sesiones", None)
        if sesion:
            ent["sesion"] = sesion

        # Fetch tareas count
        tareas_res = supabase.table("entrenamientos_margen_tareas").select(
            "id", count="exact"
        ).eq("entrenamiento_margen_id", ent["id"]).execute()
        ent["num_tareas"] = tareas_res.count if tareas_res.count is not None else len(tareas_res.data or [])

        # Fetch registro_medico title if linked
        if ent.get("registro_medico_id"):
            try:
                rm_res = supabase.table("registros_medicos").select(
                    "id, titulo, tipo"
                ).eq("id", ent["registro_medico_id"]).single().execute()
                ent["registro_medico"] = rm_res.data
            except Exception:
                ent["registro_medico"] = None

        results.append(ent)

    return {"data": results, "total": len(results)}
