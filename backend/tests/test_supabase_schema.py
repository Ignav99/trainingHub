from app.services.supabase_schema import (
    PARTIDOS_LIST_SELECT,
    drop_optional_partido_cols,
    execute_partidos_query,
    is_missing_column_error,
    select_without_optional_partido_cols,
    strip_column_from_select,
    write_partido_row,
)

PGRST204_ARBITRO = (
    "{'code': 'PGRST204', 'details': None, 'hint': None, "
    "\"message\": \"Could not find the 'arbitro' column of "
    "'partidos' in the schema cache\"}"
)


def test_pgrst204_arbitro_is_missing_column():
    assert is_missing_column_error(Exception(PGRST204_ARBITRO))
    assert is_missing_column_error(Exception("column arbitro does not exist 42703"))
    assert not is_missing_column_error(Exception("duplicate key"))


def test_select_strips_arbitro_keeps_rivales_embed():
    out = select_without_optional_partido_cols(PARTIDOS_LIST_SELECT)
    head = out.split("rivales(")[0]
    assert "arbitro" not in head
    assert "ubicacion" in head
    assert "rivales(" in out
    assert "escudo_url" in out


def test_strip_unknown_column_from_select():
    out = strip_column_from_select(PARTIDOS_LIST_SELECT, "kit_convocatoria")
    assert "kit_convocatoria" not in out.split("rivales(")[0]
    assert "rivales(" in out


def test_execute_retries_without_missing_arbitro():
    calls = []

    def run(select):
        calls.append(select)
        if "arbitro" in select.split("rivales(")[0]:
            raise Exception(PGRST204_ARBITRO)
        return {"data": [{"id": "p1", "fecha": "2026-01-01"}]}

    out = execute_partidos_query(run, PARTIDOS_LIST_SELECT)
    assert out["data"][0]["id"] == "p1"
    assert len(calls) == 2
    assert "arbitro" not in calls[1].split("rivales(")[0]


def test_execute_does_not_swallow_other_errors():
    def run(_select):
        raise Exception("duplicate key")

    try:
        execute_partidos_query(run, PARTIDOS_LIST_SELECT)
    except Exception as err:
        assert "duplicate key" in str(err)
    else:
        raise AssertionError("expected duplicate key to propagate")


def test_write_drops_arbitro_on_pgrst204():
    bodies = []

    def write(body):
        bodies.append(dict(body))
        if "arbitro" in body:
            raise Exception(PGRST204_ARBITRO)
        return {"ok": True}

    out = write_partido_row(write, {"fecha": "2026-01-01", "arbitro": "PEREZ"})
    assert out == {"ok": True}
    assert bodies[0]["arbitro"] == "PEREZ"
    assert "arbitro" not in bodies[1]
    assert drop_optional_partido_cols({"fecha": "x", "arbitro": "y"}) == {"fecha": "x"}
