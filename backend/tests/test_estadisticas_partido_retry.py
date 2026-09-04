from app.api.v1.estadisticas_partido import (
    drop_missing_from_error,
    drop_optional_estadistica_cols,
    is_missing_column_error,
)

PGRST204_STATS = (
    "{'code': 'PGRST204', 'details': None, 'hint': None, "
    "\"message\": \"Could not find the 'stats_periodos' column of "
    "'estadisticas_partido' in the schema cache\"}"
)


def test_pgrst204_is_missing_column():
    assert is_missing_column_error(Exception(PGRST204_STATS))
    assert is_missing_column_error(Exception("column stats_periodos does not exist 42703"))
    assert not is_missing_column_error(Exception("duplicate key"))


def test_drop_optional_cols_keeps_core_stats():
    payload = {
        "tiros_a_puerta": 4,
        "faltas_mapa_cometidas": [{"x": 10, "y": 20}],
        "reflexion_entrenador": "press",
        "stats_periodos": {"1": {}},
    }
    out = drop_optional_estadistica_cols(payload)
    assert out["tiros_a_puerta"] == 4
    assert out["faltas_mapa_cometidas"] == [{"x": 10, "y": 20}]
    assert "stats_periodos" not in out
    assert "reflexion_entrenador" not in out
    assert payload["stats_periodos"] == {"1": {}}


def test_drop_missing_from_pgrst204_message():
    payload = {
        "tiros_a_puerta": 2,
        "stats_periodos": {"1": {}},
        "faltas_mapa_cometidas": [{"x": 1, "y": 2}],
    }
    out = drop_missing_from_error(payload, Exception(PGRST204_STATS))
    assert "stats_periodos" not in out
    assert out["tiros_a_puerta"] == 2
    assert out["faltas_mapa_cometidas"] == [{"x": 1, "y": 2}]
