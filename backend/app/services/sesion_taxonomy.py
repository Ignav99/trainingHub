"""Helpers de serialización / taxonomía para sesiones."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable, Dict, List, Optional, Tuple
from uuid import uuid4

from app.services.keywords import synthesize_keywords

logger = logging.getLogger(__name__)


TAXONOMY_COLUMNS = (
    "fases_juego",
    "subfases",
    "abp_config",
    "contenidos_tecnicos_of",
    "contenidos_tecnicos_def",
    "keywords",
    "objetivo_fisico",
    "objetivo_psicologico",
    "contexto_periodo",
    "dia_carga",
    "partido_id",
    "es_pretemporada",
    "carga_sesion",
    "intensidad_calculada",
    "share_token",
)

# Columnas de migraciones posteriores. Si PostgREST no las tiene en cache,
# se omiten y se reintenta el insert/update (nunca 500 por PGRST204).
OPTIONAL_WRITE_COLUMNS = (
    "espacio_disponible",
    "jugadores_campo",
    "numero_sesion",
    "objetivos",
    "contenidos_ofensivos",
    "contenidos_defensivos",
    "estructura_fases",
    "materiales",
    "staff_asistentes",
    "fase_notas",
    "duracion_total",
    "hora",
    "lugar",
    "notas_pre",
    "notas_post",
    "pdf_url",
    "microciclo_id",
    "dia_numero",
    "orden",
    "plan_partido_id",
    "fase_plan",
    "rival",
    "competicion",
    "objetivo_principal",
    "fase_juego_principal",
    "principio_tactico_principal",
    "carga_fisica_objetivo",
    "intensidad_objetivo",
) + TAXONOMY_COLUMNS

REQUIRED_WRITE_COLUMNS = frozenset({
    "titulo",
    "fecha",
    "equipo_id",
    "creado_por",
    "id",
    "match_day",
})

# Si `estructura_fases` no existe aún, se guarda aquí (fase_notas JSONB sí existe).
ESTRUCTURA_FALLBACK_KEY = "_estructura_fases"

_PGRST_MISSING_COL_RE = re.compile(
    r"Could not find the '([^']+)' column",
    re.IGNORECASE,
)


def _dump_item(obj: Any) -> Any:
    if obj is None:
        return None
    if hasattr(obj, "model_dump"):
        return obj.model_dump(mode="json")
    if isinstance(obj, list):
        return [_dump_item(x) for x in obj]
    if hasattr(obj, "value"):
        return obj.value
    return obj


def drop_unsupported_columns(
    payload: Dict[str, Any], error_msg: str
) -> Tuple[Dict[str, Any], List[str]]:
    """Quita del payload columnas que PostgREST no reconoce (PGRST204)."""
    out = dict(payload)
    dropped: List[str] = []

    for col in _PGRST_MISSING_COL_RE.findall(error_msg or ""):
        if col in REQUIRED_WRITE_COLUMNS:
            continue
        if col in out:
            out.pop(col)
            dropped.append(col)

    if not dropped:
        for col in OPTIONAL_WRITE_COLUMNS:
            if col in REQUIRED_WRITE_COLUMNS:
                continue
            if col in out and col in (error_msg or ""):
                out.pop(col)
                dropped.append(col)

    return out, dropped


def stash_estructura_fases(payload: Dict[str, Any], estructura: Any) -> Dict[str, Any]:
    """Persiste bloques en fase_notas si la columna estructura_fases no existe."""
    if not estructura:
        return payload
    out = dict(payload)
    fn = out.get("fase_notas")
    fn = dict(fn) if isinstance(fn, dict) else {}
    dumped = _dump_item(estructura)
    try:
        fn[ESTRUCTURA_FALLBACK_KEY] = json.dumps(dumped, ensure_ascii=False)
    except TypeError:
        fn[ESTRUCTURA_FALLBACK_KEY] = json.dumps(dumped, default=str, ensure_ascii=False)
    out["fase_notas"] = fn
    return out


def retry_sesion_write(
    execute_fn: Callable[[Dict[str, Any]], Any],
    payload: Dict[str, Any],
    *,
    op: str = "write",
) -> Any:
    """Ejecuta insert/update omitiendo columnas desconocidas hasta que PostgREST acepte."""
    pending = dict(payload)
    original_estructura = pending.get("estructura_fases")
    last_error: Optional[Exception] = None

    for attempt in range(1, 16):
        try:
            return execute_fn(pending)
        except Exception as e:
            last_error = e
            new_pending, dropped = drop_unsupported_columns(pending, str(e))
            if not dropped:
                raise
            logger.warning(
                "Sesion %s attempt %s: omitting unknown columns %s",
                op,
                attempt,
                dropped,
            )
            if "estructura_fases" in dropped:
                new_pending = stash_estructura_fases(new_pending, original_estructura)
            pending = new_pending

    raise last_error  # pragma: no cover


def _read_estructura_fases(data: Dict[str, Any]) -> List[Any]:
    estructura = data.get("estructura_fases")
    if isinstance(estructura, list) and estructura:
        return estructura
    fn = data.get("fase_notas")
    raw = fn.get(ESTRUCTURA_FALLBACK_KEY) if isinstance(fn, dict) else None
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return parsed
        except (TypeError, ValueError, json.JSONDecodeError):
            return []
    return list(estructura) if isinstance(estructura, list) else []


def prepare_sesion_write_payload(data: Dict[str, Any], *, synthesize: bool = True) -> Dict[str, Any]:
    """Normaliza payload para insert/update en Supabase."""
    out = dict(data)

    for key in ("fecha",):
        if out.get(key) is not None and hasattr(out[key], "isoformat"):
            out[key] = out[key].isoformat()

    for key in ("equipo_id", "microciclo_id", "plan_partido_id", "partido_id"):
        if out.get(key) is not None:
            out[key] = str(out[key])

    for key in ("match_day", "intensidad_objetivo", "estado", "contexto_periodo"):
        if out.get(key) is not None and hasattr(out[key], "value"):
            out[key] = out[key].value

    if "subfases" in out and out["subfases"] is not None:
        out["subfases"] = _dump_item(out["subfases"])

    if "abp_config" in out and out["abp_config"] is not None:
        out["abp_config"] = _dump_item(out["abp_config"])

    if "estructura_fases" in out and out["estructura_fases"] is not None:
        out["estructura_fases"] = _dump_item(out["estructura_fases"])

    if synthesize:
        from app.services.keywords import normalize_keyword_list

        keywords = out.get("keywords")
        objetivo = out.get("objetivo_principal")
        # Si el cliente envía keywords, solo normalizar (no re-tokenizar).
        # Sintetizar solo cuando no hay lista explícita.
        if keywords is not None:
            out["keywords"] = normalize_keyword_list(keywords)
        elif objetivo:
            out["keywords"] = synthesize_keywords(objetivo)

    # ABP → ofensivo/defensivo con tipos independientes (+ legacy sync)
    abp = out.get("abp_config")
    if isinstance(abp, dict):
        ofensivo = [t for t in (abp.get("ofensivo") or []) if isinstance(t, str)]
        defensivo = [t for t in (abp.get("defensivo") or []) if isinstance(t, str)]
        if not ofensivo and not defensivo:
            tipos = [t for t in (abp.get("tipos") or []) if isinstance(t, str)]
            lados = [x for x in (abp.get("lados") or []) if x in ("ofensivo", "defensivo")]
            if not lados and abp.get("lado") in ("ofensivo", "defensivo"):
                lados = [abp["lado"]]
            if tipos and lados:
                if "ofensivo" in lados:
                    ofensivo = list(tipos)
                if "defensivo" in lados:
                    defensivo = list(tipos)
        lados_u = []
        if ofensivo:
            lados_u.append("ofensivo")
        if defensivo:
            lados_u.append("defensivo")
        seen = set()
        tipos_flat = []
        for t in ofensivo + defensivo:
            if t not in seen:
                seen.add(t)
                tipos_flat.append(t)
        abp["ofensivo"] = ofensivo
        abp["defensivo"] = defensivo
        abp["lados"] = lados_u
        abp["lado"] = lados_u[0] if lados_u else None
        abp["tipos"] = tipos_flat
        abp["activo"] = bool(ofensivo or defensivo)
        out["abp_config"] = abp

    return out


def normalize_sesion_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Asegura tipos legibles por Pydantic SesionResponse."""
    data = dict(row)
    if data.get("subfases") is None:
        data["subfases"] = []
    if data.get("fases_juego") is None:
        data["fases_juego"] = []
    if data.get("keywords") is None:
        data["keywords"] = []
    if data.get("contenidos_tecnicos_of") is None:
        data["contenidos_tecnicos_of"] = []
    if data.get("contenidos_tecnicos_def") is None:
        data["contenidos_tecnicos_def"] = []
    # Numeric/Decimal → float para Pydantic
    for key in ("carga_sesion",):
        if data.get(key) is not None:
            try:
                data[key] = float(data[key])
            except (TypeError, ValueError):
                data[key] = None
    data["estructura_fases"] = _read_estructura_fases(data)
    return data


def new_share_token() -> str:
    return uuid4().hex
