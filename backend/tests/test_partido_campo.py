from app.services.partido_campo import (
    clean_estadio_nombre,
    format_kit_convocatoria_label,
    hydrate_partido_campo,
    parse_kit_convocatoria,
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


def test_strips_f11_and_artificial_pitch():
    assert (
        clean_estadio_nombre("Campo El Palmar (F11) Hierba Artificial")
        == "Campo El Palmar"
    )
    assert (
        clean_estadio_nombre("Municipal (f-11) césped artificial")
        == "Municipal"
    )
    assert clean_estadio_nombre("Anexo Norte Hierba artificial") == "Anexo Norte"
    jammed = clean_estadio_nombre(
        "Campo El Palmar (F11) Hierba ArtificialÁrbitro: PEREZ, JUAN"
    )
    assert jammed == "Campo El Palmar"


def test_hydrate_strips_pitch_type():
    row = hydrate_partido_campo(
        {"ubicacion": "Campo El Palmar (F11) Hierba Artificial"}
    )
    assert row["ubicacion"] == "Campo El Palmar"


def test_kit_combo_parses_legacy_and_mixed():
    assert parse_kit_convocatoria("local") == {
        "camiseta": "local",
        "pantalon": "local",
        "medias": "local",
    }
    assert parse_kit_convocatoria("local:visitante:local") == {
        "camiseta": "local",
        "pantalon": "visitante",
        "medias": "local",
    }
    assert parse_kit_convocatoria(None, "visitante")["camiseta"] == "visitante"
    assert "Camiseta" in format_kit_convocatoria_label("local:visitante:local")
    assert format_kit_convocatoria_label("visitante") == "Camiseta · calzonas · medias"
