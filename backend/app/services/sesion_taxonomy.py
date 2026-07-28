"""Helpers de serialización / taxonomía para sesiones."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.services.keywords import synthesize_keywords


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
    return data


def new_share_token() -> str:
    return uuid4().hex
