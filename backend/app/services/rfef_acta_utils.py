"""Helpers to decide if an RFEF acta row needs re-scraping."""

import re
from datetime import datetime
from typing import Optional

_MINUTE_ADDED = re.compile(r"(\d{1,3})\s*\+\s*(\d{1,2})")
_MINUTE_PARENS = re.compile(r"\((\d{1,3})(?:\s*\+\s*(\d{1,2}))?'?\)")
_MINUTE_QUOTE = re.compile(r"(\d{1,3})\s*'")
_MINUTE_BARE = re.compile(r"(\d{1,3})")

# Códigos RFAF: 22 = 2026-2027. año_inicio = 2004 + int(código). Nueva temporada desde julio.
_RFAF_TEMPORADA_EPOCH_YEAR = 2004


def default_rfaf_temporada(now: Optional[datetime] = None) -> str:
    """Código RFAF de la temporada en curso (julio → junio)."""
    now = now or datetime.now()
    start_year = now.year if now.month >= 7 else now.year - 1
    return str(start_year - _RFAF_TEMPORADA_EPOCH_YEAR)


def rfaf_temporada_label(code: str) -> str:
    """Etiqueta legible: '22' → '2026-2027'."""
    try:
        y = _RFAF_TEMPORADA_EPOCH_YEAR + int(str(code).strip())
        return f"{y}-{y + 1}"
    except (TypeError, ValueError):
        return f"Temporada {code}"

_MINUTE_ADDED = re.compile(r"(\d{1,3})\s*\+\s*(\d{1,2})")
_MINUTE_PARENS = re.compile(r"\((\d{1,3})(?:\s*\+\s*(\d{1,2}))?'?\)")
_MINUTE_QUOTE = re.compile(r"(\d{1,3})\s*'")
_MINUTE_BARE = re.compile(r"(\d{1,3})")


def parse_acta_minuto(value, *, allow_bare: bool = True) -> int | None:
    """Coerce RFEF minute fields: 16, '16', \"16'\", '(16')', '45+2'."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        n = int(value)
        return n if 0 <= n <= 130 else None
    text = str(value).strip()
    if not text:
        return None
    m = _MINUTE_ADDED.search(text)
    if m:
        total = int(m.group(1)) + int(m.group(2))
        return min(total, 130) if total >= 0 else None
    m = _MINUTE_PARENS.search(text)
    if m:
        n = int(m.group(1)) + (int(m.group(2)) if m.group(2) else 0)
        return n if 0 <= n <= 130 else None
    m = _MINUTE_QUOTE.search(text)
    if m:
        n = int(m.group(1))
        return n if 0 <= n <= 130 else None
    if not allow_bare:
        return None
    m = _MINUTE_BARE.fullmatch(text)
    if m:
        n = int(m.group(1))
        return n if 0 <= n <= 130 else None
    return None


def goal_minuto(gol: dict | None) -> int | None:
    """Minute of a scraped goal, including minutes buried in the player string."""
    if not gol:
        return None
    for key in ("minuto", "minute", "min", "m"):
        parsed = parse_acta_minuto(gol.get(key))
        if parsed is not None:
            return parsed
    return parse_acta_minuto(gol.get("jugador"))


def acta_has_lineups(acta: dict) -> bool:
    titulares = acta.get("titulares_local") or []
    return len(titulares) > 0


def acta_needs_goles_rescrape(acta: dict) -> bool:
    """True when the match had goals but acta JSON lacks minute-level goles."""
    if not acta_has_lineups(acta):
        return True

    gl = acta.get("goles_local")
    gv = acta.get("goles_visitante")
    if gl is None or gv is None:
        return True

    total = (gl or 0) + (gv or 0)
    if total == 0:
        return False

    goles = acta.get("goles") or []
    if not goles:
        return True

    return not any(goal_minuto(g) is not None for g in goles)


def is_acta_complete(acta: dict) -> bool:
    return acta_has_lineups(acta) and not acta_needs_goles_rescrape(acta)
