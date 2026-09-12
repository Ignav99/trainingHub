from app.services.partido_campo import (
    hydrate_partido_campo,
    sanitize_partido_campo,
    split_campo_arbitro,
)


def test_splits_jammed_referee():
    lugar, arbitro = split_campo_arbitro(
        "Campo Municipal El PalmarÁrbitro: PEREZ GARCIA, JUAN"
    )
    assert lugar == "Campo Municipal El Palmar"
    assert arbitro == "PEREZ GARCIA, JUAN"


def test_splits_spaced_referee():
    lugar, arbitro = split_campo_arbitro(
        "Estadio Municipal - Árbitro: Ana López"
    )
    assert lugar == "Estadio Municipal"
    assert arbitro == "Ana López"


def test_keeps_only_first_referee():
    lugar, arbitro = split_campo_arbitro(
        "Anexo NorteÁrbitro: UnoÁrbitro asistente: Dos"
    )
    assert lugar == "Anexo Norte"
    assert arbitro == "Uno"


def test_stadium_only():
    assert split_campo_arbitro("Municipal") == ("Municipal", "")
    assert split_campo_arbitro("") == ("", "")
    assert split_campo_arbitro(None) == ("", "")


def test_sanitize_prefers_explicit_referee():
    data = sanitize_partido_campo(
        {"ubicacion": "AnexoÁrbitro: Viejo", "arbitro": "Nuevo"}
    )
    assert data["ubicacion"] == "Anexo"
    assert data["arbitro"] == "Nuevo"


def test_hydrate_fills_missing_referee():
    row = hydrate_partido_campo({"ubicacion": "Campo El PalmarÁrbitro: PEREZ, JUAN"})
    assert row["ubicacion"] == "Campo El Palmar"
    assert row["arbitro"] == "PEREZ, JUAN"
