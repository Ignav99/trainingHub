"""Tests for RFEF acta completeness helpers."""

from app.services.rfef_acta_utils import acta_needs_goles_rescrape, is_acta_complete


def test_acta_complete_with_goles_minuto():
    acta = {
        "titulares_local": [{"nombre": "A"}],
        "goles_local": 2,
        "goles_visitante": 1,
        "goles": [
            {"minuto": 12, "jugador": "A"},
            {"minuto": 55, "jugador": "B"},
            {"minuto": 80, "jugador": "C"},
        ],
    }
    assert is_acta_complete(acta) is True
    assert acta_needs_goles_rescrape(acta) is False


def test_acta_needs_rescrape_when_score_but_no_goles_json():
    acta = {
        "titulares_local": [{"nombre": "A"}],
        "goles_local": 1,
        "goles_visitante": 0,
        "goles": [],
    }
    assert is_acta_complete(acta) is False
    assert acta_needs_goles_rescrape(acta) is True


def test_acta_ok_for_0_0_without_goles_detail():
    acta = {
        "titulares_local": [{"nombre": "A"}],
        "goles_local": 0,
        "goles_visitante": 0,
        "goles": [],
    }
    assert is_acta_complete(acta) is True
