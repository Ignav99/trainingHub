"""Formato de descanso entre series (segundos, con legado en minutos)."""

from __future__ import annotations

_LEGACY_MINUTES_MAX = 10


def normalize_descanso_seconds(raw) -> int:
    try:
        n = int(raw or 0)
    except (TypeError, ValueError):
        return 0
    if n <= 0:
        return 0
    if n <= _LEGACY_MINUTES_MAX:
        return n * 60
    return n


def format_descanso(raw) -> str:
    total = normalize_descanso_seconds(raw)
    if total <= 0:
        return ""
    minutes, seconds = divmod(total, 60)
    if minutes and seconds:
        return f"{minutes} min {seconds} s"
    if minutes:
        return f"{minutes} min"
    return f"{seconds} s"
