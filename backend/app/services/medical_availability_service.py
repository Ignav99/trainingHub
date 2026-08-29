"""
Sincronización de disponibilidad operativa y estado del jugador
a partir de registros médicos abiertos.

Disponibilidad (más restrictiva gana):
  fuera > individual > grupo_adaptado > pleno

Estados administrativos (sancionado, viaje, permiso, seleccion, baja)
no se sobrescriben desde el módulo médico.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Optional

DISP_RANK = {
    "fuera": 0,
    "individual": 1,
    "grupo_adaptado": 2,
    "pleno": 3,
}

ADMIN_ESTADOS = {"sancionado", "viaje", "permiso", "seleccion", "baja"}

OPEN_ESTADOS = {"activo", "en_recuperacion", "cronico"}

FASES_INDIVIDUAL = {
    "fase_1_control_dolor",
    "fase_2_movilidad",
    "fase_3_fuerza_base",
    "fase_4_fuerza_funcional",
    "fase_5_carrera_lineal",
    "fase_6_cambios_direccion",
}

FASES_GRUPO = {
    "fase_7_entrenamiento_equipo",
    "fase_8_competicion",
}

# Crescendo clínico (ficha / enfermería) → disponibilidad operativa (resto de la app)
FASE_TRATAMIENTO_DISP = {
    "reposo": "fuera",
    "margen": "individual",
    "inicio_grupo": "grupo_adaptado",
    "disponible": "pleno",
}


def disponibilidad_from_fase_tratamiento(fase: Optional[str]) -> Optional[str]:
    if not fase:
        return None
    return FASE_TRATAMIENTO_DISP.get(fase)


def disponibilidad_from_fase(fase_rtp: Optional[str]) -> Optional[str]:
    if not fase_rtp:
        return None
    if fase_rtp in FASES_INDIVIDUAL:
        return "individual"
    if fase_rtp in FASES_GRUPO:
        return "grupo_adaptado"
    return None


LESION_CREATE_FASES = {"reposo", "margen"}


def is_molestia(record: dict | str | None) -> bool:
    if isinstance(record, str):
        return record == "molestias"
    return bool(record) and record.get("tipo") == "molestias"


def normalize_create_fase(
    tipo: str,
    fase_tratamiento: Optional[str] = None,
    *,
    is_historical: bool = False,
) -> tuple[Optional[str], str]:
    """Fase + disponibilidad al crear. Lesión nueva: solo reposo/margen. Molestias: pleno."""
    if is_historical:
        return None, "pleno"
    if tipo == "molestias":
        return None, "pleno"
    if tipo == "lesion":
        fase = fase_tratamiento if fase_tratamiento in LESION_CREATE_FASES else "reposo"
        return fase, FASE_TRATAMIENTO_DISP[fase]
    if fase_tratamiento in FASE_TRATAMIENTO_DISP:
        return fase_tratamiento, FASE_TRATAMIENTO_DISP[fase_tratamiento]
    return fase_tratamiento, ""


def default_disponibilidad(
    tipo: str,
    estado: str,
    fase_rtp: Optional[str] = None,
    severidad: Optional[str] = None,
    fase_tratamiento: Optional[str] = None,
) -> str:
    """Disponibilidad por defecto según tipo/estado/fase del caso."""
    if estado == "alta":
        return "pleno"

    # Molestias: el jugador sigue disponible en programa / plantilla / microciclo.
    if tipo == "molestias":
        return "pleno"

    from_trat = disponibilidad_from_fase_tratamiento(fase_tratamiento)
    if from_trat:
        return from_trat

    from_fase = disponibilidad_from_fase(fase_rtp)
    if from_fase:
        return from_fase

    if tipo == "enfermedad":
        return "fuera"

    if tipo in ("rehabilitacion",) or estado == "en_recuperacion":
        return "individual"

    if tipo == "lesion":
        if severidad == "leve":
            return "individual"
        return "fuera"

    return "fuera"


def resolve_record_disponibilidad(record: dict) -> str:
    if is_molestia(record):
        return "pleno"
    from_trat = disponibilidad_from_fase_tratamiento(record.get("fase_tratamiento"))
    if from_trat:
        return from_trat
    explicit = record.get("disponibilidad")
    if explicit in DISP_RANK:
        return explicit
    return default_disponibilidad(
        tipo=record.get("tipo") or "otro",
        estado=record.get("estado") or "activo",
        fase_rtp=record.get("fase_rtp"),
        severidad=record.get("severidad"),
        fase_tratamiento=record.get("fase_tratamiento"),
    )


def records_que_afectan_disponibilidad(records: list[dict]) -> list[dict]:
    """Molestias no bajan al jugador: cuentan como disponibles en el programa."""
    return [r for r in records if not is_molestia(r)]


def estado_from_record(record: dict) -> str:
    tipo = record.get("tipo") or "otro"
    disp = resolve_record_disponibilidad(record)

    # Fase «disponible» / pleno: en el programa el jugador cuenta como disponible
    # aunque el caso médico siga abierto hasta el alta.
    if disp == "pleno":
        return "activo"
    if tipo == "enfermedad":
        return "enfermo"
    if disp == "fuera":
        return "lesionado" if tipo != "enfermedad" else "enfermo"
    return "en_recuperacion"


def pick_primary_record(records: list[dict]) -> Optional[dict]:
    if not records:
        return None

    ranked = sorted(records, key=lambda r: (
        DISP_RANK.get(resolve_record_disponibilidad(r), 99),
        -(date.fromisoformat(str(r["fecha_inicio"])[:10]).toordinal() if r.get("fecha_inicio") else 0),
    ))
    return ranked[0]


def worst_disponibilidad(records: list[dict]) -> str:
    if not records:
        return "pleno"
    return min(
        (resolve_record_disponibilidad(r) for r in records),
        key=lambda d: DISP_RANK.get(d, 99),
    )


def can_convocar(jugador: dict, *, permitir_grupo_adaptado: bool = True) -> bool:
    estado = jugador.get("estado") or "activo"
    if estado in ADMIN_ESTADOS:
        return False
    disp = jugador.get("disponibilidad") or "pleno"
    if disp == "pleno":
        return True
    if disp == "grupo_adaptado":
        return permitir_grupo_adaptado
    return False


def participation_suggestion(jugador: dict) -> dict[str, Any]:
    """Sugerencia de asistencia según disponibilidad."""
    estado = jugador.get("estado") or "activo"
    disp = jugador.get("disponibilidad") or "pleno"

    if estado in ADMIN_ESTADOS or disp == "fuera":
        motivo = {
            "lesionado": "lesion",
            "en_recuperacion": "lesion",
            "enfermo": "enfermedad",
            "sancionado": "sancion",
            "viaje": "viaje",
            "permiso": "permiso",
            "seleccion": "seleccion",
            "baja": "otro",
        }.get(estado, "lesion" if disp == "fuera" else "otro")
        return {
            "presente": False,
            "motivo_ausencia": motivo,
            "tipo_participacion": [],
            "disponibilidad": disp,
        }

    if disp == "individual":
        return {
            "presente": True,
            "motivo_ausencia": None,
            "tipo_participacion": ["margen"],
            "disponibilidad": disp,
        }

    if disp == "grupo_adaptado":
        return {
            "presente": True,
            "motivo_ausencia": None,
            "tipo_participacion": ["sesion"],
            "disponibilidad": disp,
            "adaptado": True,
        }

    return {
        "presente": True,
        "motivo_ausencia": None,
        "tipo_participacion": ["sesion"],
        "disponibilidad": "pleno",
    }


def sync_jugador_disponibilidad(supabase, jugador_id: str) -> dict:
    """
    Recalcula estado + disponibilidad del jugador a partir de casos médicos abiertos.
    No pisa estados administrativos.
    """
    jug = (
        supabase.table("jugadores")
        .select("id, estado, disponibilidad, fecha_lesion, fecha_vuelta_estimada, motivo_baja")
        .eq("id", str(jugador_id))
        .single()
        .execute()
    )
    if not jug.data:
        return {}

    current_estado = jug.data.get("estado") or "activo"
    if current_estado in ADMIN_ESTADOS:
        # Mantener fuera a efectos operativos si está sancionado/viaje/etc.
        update = {"disponibilidad": "fuera"}
        try:
            supabase.table("jugadores").update(update).eq("id", str(jugador_id)).execute()
        except Exception:
            pass
        return {**jug.data, **update}

    open_q = (
        supabase.table("registros_medicos")
        .select(
            "id, tipo, estado, titulo, fecha_inicio, dias_baja_estimados, "
            "disponibilidad, fase_rtp, severidad, fase_tratamiento, es_historico"
        )
        .eq("jugador_id", str(jugador_id))
        .in_("estado", list(OPEN_ESTADOS))
        .execute()
    )
    records = [r for r in (open_q.data or []) if not r.get("es_historico")]
    operativos = records_que_afectan_disponibilidad(records)

    if not operativos:
        update = {
            "estado": "activo",
            "disponibilidad": "pleno",
            "fecha_lesion": None,
            "fecha_vuelta_estimada": None,
            "motivo_baja": None,
        }
        supabase.table("jugadores").update(update).eq("id", str(jugador_id)).execute()
        return update

    primary = pick_primary_record(operativos)
    assert primary is not None
    disp = worst_disponibilidad(operativos)
    new_estado = estado_from_record(primary)

    update: dict[str, Any] = {
        "estado": new_estado,
        "disponibilidad": disp,
        "motivo_baja": primary.get("titulo"),
    }

    fecha_inicio = primary.get("fecha_inicio")
    if fecha_inicio:
        update["fecha_lesion"] = str(fecha_inicio)[:10]
        dias = primary.get("dias_baja_estimados")
        if dias:
            try:
                start = date.fromisoformat(str(fecha_inicio)[:10])
                update["fecha_vuelta_estimada"] = (start + timedelta(days=int(dias))).isoformat()
            except Exception:
                pass

    if new_estado == "activo" and disp == "pleno":
        update["fecha_lesion"] = None
        update["fecha_vuelta_estimada"] = None
        update["motivo_baja"] = None

    supabase.table("jugadores").update(update).eq("id", str(jugador_id)).execute()
    return update
