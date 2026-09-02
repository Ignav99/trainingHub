"""Escrituras de wellness tolerantes a columnas ausentes (PGRST204)."""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

OPTIONAL_WELLNESS_COLS = ("horas_sueno", "molestia", "molestia_texto")

_PGRST_MISSING_COL_RE = re.compile(
    r"Could not find the '([^']+)' column",
    re.IGNORECASE,
)

_extra_columns_ok = True


def extra_columns_available() -> bool:
    return _extra_columns_ok


def mark_extra_columns_missing() -> None:
    global _extra_columns_ok
    _extra_columns_ok = False


def note_extra_column_error(err: Exception) -> bool:
    msg = str(err)
    lower = msg.lower()
    if not any(col in lower for col in OPTIONAL_WELLNESS_COLS):
        if "pgrst204" not in lower and "schema cache" not in lower and "42703" not in lower:
            return False
        if not any(col in lower for col in OPTIONAL_WELLNESS_COLS):
            return False
    mark_extra_columns_missing()
    return True


def wellness_select(include_id: bool = True) -> str:
    base = [
        "jugador_id",
        "fecha",
        "sueno",
        "fatiga",
        "dolor",
        "estres",
        "humor",
        "notas",
        "created_at",
    ]
    if include_id:
        base.insert(0, "id")
    if extra_columns_available():
        base.extend(list(OPTIONAL_WELLNESS_COLS))
    return ", ".join(base)


def drop_optional_wellness_cols(
    payload: Dict[str, Any],
    error_msg: str,
) -> Tuple[Dict[str, Any], List[str]]:
    """Si falta cualquiera de las columnas nuevas, se omiten todas (misma migración)."""
    out = dict(payload)
    dropped: List[str] = []
    mentioned = set(_PGRST_MISSING_COL_RE.findall(error_msg or ""))
    hit = any(
        col in mentioned or col in (error_msg or "")
        for col in OPTIONAL_WELLNESS_COLS
    )
    if not hit and any(code in (error_msg or "").lower() for code in ("pgrst204", "schema cache", "42703")):
        hit = any(col in out for col in OPTIONAL_WELLNESS_COLS)
    if hit:
        for col in OPTIONAL_WELLNESS_COLS:
            if col in out:
                out.pop(col)
                dropped.append(col)
    return out, dropped


def stash_wellness_extras_in_notas(row: Dict[str, Any]) -> Dict[str, Any]:
    """Si hay que omitir columnas nuevas, deja un resumen en notas (ya existe)."""
    bits: List[str] = []
    horas = row.get("horas_sueno")
    if horas is not None and horas != "":
        bits.append(f"Horas sueño: {horas}")
    molestia = row.get("molestia")
    if molestia is True:
        texto = (row.get("molestia_texto") or "").strip()
        bits.append(f"Molestia: {texto}" if texto else "Molestia: sí")
    elif molestia is False:
        bits.append("Molestia: no")
    elif (row.get("molestia_texto") or "").strip():
        bits.append(f"Molestia: {str(row.get('molestia_texto')).strip()}")
    if not bits:
        return row
    extra = " · ".join(bits)
    prev = str(row.get("notas") or "").strip()
    if extra in prev:
        return row
    out = dict(row)
    out["notas"] = f"{prev} | {extra}".strip(" |") if prev else extra
    return out


def build_wellness_row(
    *,
    jugador_id: str,
    fecha: str,
    sueno: int,
    fatiga: int,
    dolor: int,
    estres: int,
    humor: int,
    horas_sueno: Optional[float] = None,
    molestia: Optional[bool] = None,
    molestia_texto: Optional[str] = None,
    notas: Optional[str] = None,
) -> Dict[str, Any]:
    row: Dict[str, Any] = {
        "jugador_id": jugador_id,
        "fecha": fecha,
        "tipo": "wellness",
        "rpe": None,
        "sueno": sueno,
        "fatiga": fatiga,
        "dolor": dolor,
        "estres": estres,
        "humor": humor,
    }
    if notas:
        row["notas"] = notas
    if extra_columns_available():
        if horas_sueno is not None:
            row["horas_sueno"] = horas_sueno
        if molestia is not None:
            row["molestia"] = molestia
        texto = (molestia_texto or "").strip()
        if texto:
            row["molestia_texto"] = texto
        elif molestia is False:
            row["molestia_texto"] = None
    else:
        row = stash_wellness_extras_in_notas({
            **row,
            "horas_sueno": horas_sueno,
            "molestia": molestia,
            "molestia_texto": molestia_texto,
        })
        row.pop("horas_sueno", None)
        row.pop("molestia", None)
        row.pop("molestia_texto", None)
    return row


def retry_wellness_write(execute_fn, payload: Any, op: str = "insert"):
    pending = payload
    last_err: Optional[Exception] = None
    for _ in range(4):
        try:
            return execute_fn(pending)
        except Exception as e:
            last_err = e
            msg = str(e)
            if isinstance(pending, list):
                if not pending:
                    raise
                _, dropped = drop_optional_wellness_cols(pending[0], msg)
                if not dropped:
                    raise
                mark_extra_columns_missing()
                logger.warning("Wellness %s omitiendo columnas %s (%s)", op, dropped, e)
                next_rows = []
                for row in pending:
                    enriched = stash_wellness_extras_in_notas(row)
                    cleaned, _ = drop_optional_wellness_cols(enriched, msg)
                    next_rows.append(cleaned)
                pending = next_rows
                continue
            enriched = stash_wellness_extras_in_notas(pending)
            cleaned, dropped = drop_optional_wellness_cols(enriched, msg)
            if not dropped:
                raise
            mark_extra_columns_missing()
            logger.warning("Wellness %s omitiendo columnas %s (%s)", op, dropped, e)
            pending = cleaned
    if last_err:
        raise last_err
    raise RuntimeError("retry_wellness_write exhausted")
