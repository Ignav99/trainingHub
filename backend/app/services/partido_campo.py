"""Separa estadio y árbitro cuando la RFEF los pega en un solo texto."""

from __future__ import annotations

import re

_ARBITRO_RE = re.compile(
    r"(Árbitros?|Arbitros?|Colegiados?)\s*:?\s*",
    re.IGNORECASE,
)


def split_campo_arbitro(raw: str | None) -> tuple[str, str]:
    """Devuelve (estadio, árbitro). El colegiado sale como mucho una vez."""
    text = re.sub(r"\s+", " ", (raw or "").replace("\xa0", " ")).strip()
    if not text:
        return "", ""
    match = _ARBITRO_RE.search(text)
    if not match:
        return text, ""
    lugar = text[: match.start()].rstrip(" -–—,.;:")
    rest = text[match.end() :].strip()
    extra = _ARBITRO_RE.search(rest)
    if extra and extra.start() > 0:
        rest = rest[: extra.start()].rstrip(" -–—,.;:")
    return lugar.strip(), rest.strip()


def sanitize_partido_campo(data: dict) -> dict:
    """Parte `ubicacion` si viene pegada con el árbitro. No pisa un árbitro ya informado."""
    lugar, parsed_arb = split_campo_arbitro(data.get("ubicacion"))
    if "ubicacion" in data:
        data["ubicacion"] = lugar or None
    explicit = (data.get("arbitro") or "").strip() if isinstance(data.get("arbitro"), str) else data.get("arbitro")
    if explicit:
        data["arbitro"] = explicit
    elif parsed_arb:
        data["arbitro"] = parsed_arb
    return data


def hydrate_partido_campo(row: dict) -> dict:
    """En lecturas, el estadio no arrastra el nombre del colegiado."""
    lugar, parsed_arb = split_campo_arbitro(row.get("ubicacion"))
    if lugar:
        row["ubicacion"] = lugar
    if not (row.get("arbitro") or "").strip() and parsed_arb:
        row["arbitro"] = parsed_arb
    return row
