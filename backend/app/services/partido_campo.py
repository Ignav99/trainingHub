"""Separa estadio y árbitro cuando la RFEF los pega en un solo texto."""

from __future__ import annotations

import re

_ARBITRO_RE = re.compile(
    r"(Árbitros?|Arbitros?|Colegiados?)\s*:?\s*",
    re.IGNORECASE,
)
_PITCH_CUT_RE = re.compile(
    r"\s*[\(\[]\s*f\s*-?\s*11\b"
    r"|\s+f\s*-?\s*11\b"
    r"|\s+hierba\s+artificial\b"
    r"|\s+c[eé]sped\s+artificial\b"
    r"|\s+hierba\s+natural\b"
    r"|\s+c[eé]sped\s+natural\b",
    re.IGNORECASE,
)
KIT_CONVOCATORIA_RE = re.compile(
    r"^(local|visitante)(:(local|visitante)){0,2}$"
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


def clean_estadio_nombre(raw: str | None) -> str:
    """Deja el nombre del campo: quita (F11), hierba/césped artificial y el árbitro."""
    lugar, _ = split_campo_arbitro(raw)
    if not lugar:
        return ""
    cut = _PITCH_CUT_RE.search(lugar)
    if cut:
        lugar = lugar[: cut.start()]
    return lugar.rstrip(" -–—,.;:").strip()


def parse_kit_convocatoria(raw: str | None, localia: str | None = None) -> dict:
    """Camiseta / calzonas / medias, cada una local o visitante."""
    fallback = "visitante" if localia == "visitante" else "local"
    text = (raw or "").strip().lower()
    if not text or not KIT_CONVOCATORIA_RE.match(text):
        return {"camiseta": fallback, "pantalon": fallback, "medias": fallback}
    parts = text.split(":")
    if len(parts) == 1:
        return {"camiseta": parts[0], "pantalon": parts[0], "medias": parts[0]}
    return {"camiseta": parts[0], "pantalon": parts[1], "medias": parts[2]}


def format_kit_convocatoria_label(raw: str | None, localia: str | None = None) -> str:
    combo = parse_kit_convocatoria(raw, localia)
    if combo["camiseta"] == combo["pantalon"] == combo["medias"]:
        return "Camiseta · calzonas · medias"
    return (
        f"Camiseta {combo['camiseta']} · "
        f"Calzonas {combo['pantalon']} · "
        f"Medias {combo['medias']}"
    )


def sanitize_partido_campo(data: dict) -> dict:
    """Parte `ubicacion` si viene pegada con el árbitro. No pisa un árbitro ya informado."""
    lugar, parsed_arb = split_campo_arbitro(data.get("ubicacion"))
    if "ubicacion" in data:
        cleaned = clean_estadio_nombre(lugar)
        data["ubicacion"] = cleaned or None
    explicit = (data.get("arbitro") or "").strip() if isinstance(data.get("arbitro"), str) else data.get("arbitro")
    if explicit:
        data["arbitro"] = explicit
    elif parsed_arb:
        data["arbitro"] = parsed_arb
    return data


def hydrate_partido_campo(row: dict) -> dict:
    """En lecturas, el estadio no arrastra el nombre del colegiado ni (F11)."""
    lugar, parsed_arb = split_campo_arbitro(row.get("ubicacion"))
    cleaned = clean_estadio_nombre(lugar)
    if cleaned:
        row["ubicacion"] = cleaned
    if not (row.get("arbitro") or "").strip() and parsed_arb:
        row["arbitro"] = parsed_arb
    return row
