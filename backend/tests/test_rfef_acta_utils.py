"""Tests for RFEF acta completeness helpers."""

from app.services.rfef_acta_utils import (
    acta_needs_goles_rescrape,
    goal_minuto,
    is_acta_complete,
    parse_acta_minuto,
)


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


def test_parse_acta_minuto_formats():
    assert parse_acta_minuto(16) == 16
    assert parse_acta_minuto("16'") == 16
    assert parse_acta_minuto("(16')") == 16
    assert parse_acta_minuto("45+2") == 47
    assert parse_acta_minuto("(90+4')") == 94
    assert parse_acta_minuto("Garcia (20')") == 20
    assert parse_acta_minuto("1-0", allow_bare=False) is None


def test_goal_minuto_from_player_string():
    assert goal_minuto({"jugador": "Perez (70')"}) == 70
    assert goal_minuto({"minuto": "12'"}) == 12


def test_string_minutes_count_as_complete():
    acta = {
        "titulares_local": [{"nombre": "A"}],
        "goles_local": 1,
        "goles_visitante": 0,
        "goles": [{"minuto": "16'", "jugador": "A"}],
    }
    assert acta_needs_goles_rescrape(acta) is False
    assert is_acta_complete(acta) is True
