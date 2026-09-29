"""Evita que un guardado vacío borre texto del cuerpo técnico.

El cliente manda el documento entero. Si la última pulsación no llegó, o un
efecto desmontó el editor a medias, el cuerpo nuevo puede traer cadenas vacías
o listas vacías. Esas no sustituyen texto que ya estaba guardado.

`_historial` queda solo en base de datos: las respuestas al cliente lo ocultan.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

HISTORIAL_KEY = "_historial"
_MAX_REVISIONES = 30
_SKIP_KEYS = {
    HISTORIAL_KEY,
    "clips",
    "pizarra_diagrama",
    "pizarra_tactica",
    "escudo_url",
    "video_url",
}
_LIST_KEYS = ("fase", "id", "nombre")


def public_staff_document(doc: Any) -> Any:
    if not isinstance(doc, dict):
        return doc if doc is not None else {}
    return {k: v for k, v in doc.items() if k != HISTORIAL_KEY}


def merge_staff_document(previous: Any, incoming: Any) -> dict:
    """Fusiona el documento nuevo sobre el anterior sin borrar texto con vacío."""
    prev = previous if isinstance(previous, dict) else {}
    inc = incoming if isinstance(incoming, dict) else {}
    historial = [item for item in (prev.get(HISTORIAL_KEY) or []) if isinstance(item, dict)]
    before = _text_snapshot(prev)
    merged = _merge_value(prev, inc)
    if not isinstance(merged, dict):
        merged = {}
    after = _text_snapshot(merged)
    if before and before != after:
        historial.append({
            "at": datetime.now(timezone.utc).isoformat(),
            "texto": before,
        })
        historial = historial[-_MAX_REVISIONES:]
    if historial:
        merged[HISTORIAL_KEY] = historial
    return merged


def _merge_value(old: Any, new: Any) -> Any:
    if isinstance(old, dict) and isinstance(new, dict):
        out: dict[str, Any] = {}
        for key in set(old) | set(new):
            if key == HISTORIAL_KEY:
                continue
            if key not in new:
                out[key] = old[key]
            elif key not in old:
                out[key] = new[key]
            else:
                out[key] = _merge_value(old[key], new[key])
        return out
    if isinstance(old, list) and isinstance(new, list):
        return _merge_list(old, new)
    if isinstance(old, str) and isinstance(new, str):
        if not new.strip() and old.strip():
            return old
        return new
    if new is None and old not in (None, "", [], {}):
        return old
    return new


def _merge_list(old: list, new: list) -> list:
    if not new and old:
        return old
    key = _list_key(old, new)
    if not key:
        return new
    old_map = {
        item[key]: item
        for item in old
        if isinstance(item, dict) and item.get(key)
    }
    merged = []
    for item in new:
        if isinstance(item, dict) and item.get(key) in old_map:
            merged.append(_merge_value(old_map[item[key]], item))
        else:
            merged.append(item)
    return merged


def _list_key(old: list, new: list) -> str | None:
    items = [x for x in (*old, *new) if isinstance(x, dict)]
    if not items:
        return None
    for candidate in _LIST_KEYS:
        if all(candidate in item and item.get(candidate) not in (None, "") for item in items):
            return candidate
    return None


def _text_snapshot(value: Any, depth: int = 0) -> Any:
    if depth > 8:
        return None
    if isinstance(value, str):
        text = value.strip()
        return text or None
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if key in _SKIP_KEYS:
                continue
            snap = _text_snapshot(item, depth + 1)
            if snap not in (None, {}, []):
                out[key] = snap
        return out or None
    if isinstance(value, list):
        items = []
        for item in value:
            snap = _text_snapshot(item, depth + 1)
            if snap not in (None, {}, []):
                items.append(snap)
        return items or None
    return None
