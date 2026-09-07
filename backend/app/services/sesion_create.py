"""Idempotencia al crear sesiones (doble clic / retry de insert)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional
from uuid import uuid4

DUPLICATE_WINDOW_SECONDS = 30


def is_unique_violation(err: BaseException) -> bool:
    text = str(err).lower()
    return "23505" in text or "duplicate key" in text or "unique constraint" in text


def ensure_sesion_write_id(payload: Dict[str, Any]) -> str:
    """Fija un UUID estable para que un retry de insert no cree otra fila."""
    raw = payload.get("id")
    if raw:
        sid = str(raw)
        payload["id"] = sid
        return sid
    sid = str(uuid4())
    payload["id"] = sid
    return sid


def unique_by_id(rows: Iterable[Any]) -> List[Any]:
    seen: set[str] = set()
    out: List[Any] = []
    for row in rows:
        sid = row.get("id") if isinstance(row, dict) else getattr(row, "id", None)
        key = str(sid) if sid is not None else ""
        if key:
            if key in seen:
                continue
            seen.add(key)
        out.append(row)
    return out


def find_recent_duplicate_sesion(
    supabase: Any,
    *,
    equipo_id: str,
    titulo: str,
    fecha: str,
    creado_por: str,
    window_seconds: int = DUPLICATE_WINDOW_SECONDS,
) -> Optional[Dict[str, Any]]:
    """Reutiliza una sesión recién creada con el mismo título/fecha/equipo/autor."""
    if not (equipo_id and titulo and fecha and creado_por):
        return None
    fecha_key = fecha[:10] if isinstance(fecha, str) else str(fecha)
    since = (datetime.now(timezone.utc) - timedelta(seconds=window_seconds)).isoformat()
    try:
        resp = (
            supabase.table("sesiones")
            .select("*")
            .eq("equipo_id", str(equipo_id))
            .eq("titulo", str(titulo).strip())
            .eq("fecha", fecha_key)
            .eq("creado_por", str(creado_por))
            .gte("created_at", since)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
    except Exception:
        return None
    data = getattr(resp, "data", None)
    if data is None and isinstance(resp, dict):
        data = resp.get("data")
    if data:
        return data[0]
    return None
