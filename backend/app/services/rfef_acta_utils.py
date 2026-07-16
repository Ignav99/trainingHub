"""Helpers to decide if an RFEF acta row needs re-scraping."""


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

    return not any(g.get("minuto") is not None for g in goles)


def is_acta_complete(acta: dict) -> bool:
    return acta_has_lineups(acta) and not acta_needs_goles_rescrape(acta)
