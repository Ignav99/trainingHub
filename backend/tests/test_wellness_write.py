"""Retry de insert wellness cuando PostgREST no conoce columnas nuevas."""

from app.services import wellness_write
from app.services.wellness_write import (
    OPTIONAL_WELLNESS_COLS,
    build_wellness_row,
    drop_optional_wellness_cols,
    retry_wellness_write,
    stash_wellness_extras_in_notas,
)

PGRST204_HORAS = (
    "{'code': 'PGRST204', 'details': None, 'hint': None, "
    "\"message\": \"Could not find the 'horas_sueno' column of 'registros_rpe' in the schema cache\"}"
)


def setup_function():
    wellness_write._extra_columns_ok = True


class TestWellnessWrite:
    def test_build_row_includes_extras(self):
        row = build_wellness_row(
            jugador_id="abc",
            fecha="2026-09-02",
            sueno=4,
            fatiga=3,
            dolor=3,
            estres=3,
            humor=4,
            horas_sueno=7.5,
            molestia=True,
            molestia_texto="isquio izquierdo",
        )
        assert row["horas_sueno"] == 7.5
        assert row["molestia"] is True
        assert row["molestia_texto"] == "isquio izquierdo"
        assert row["tipo"] == "wellness"
        assert row["rpe"] is None

    def test_stash_notas_keeps_summary(self):
        row = stash_wellness_extras_in_notas({
            "sueno": 3,
            "horas_sueno": 8,
            "molestia": True,
            "molestia_texto": "adductor",
        })
        assert "Horas sueño: 8" in row["notas"]
        assert "Molestia: adductor" in row["notas"]

    def test_drop_from_pgrst204(self):
        payload = {
            "sueno": 3,
            "horas_sueno": 7,
            "molestia": False,
            "molestia_texto": None,
        }
        out, dropped = drop_optional_wellness_cols(payload, PGRST204_HORAS)
        assert "horas_sueno" in dropped
        assert "horas_sueno" not in out

    def test_retry_bulk_drops_extras_and_stashes_notas(self):
        calls = []

        def execute(data):
            calls.append(data)
            if isinstance(data, list) and any("horas_sueno" in row for row in data):
                raise Exception(PGRST204_HORAS)
            return {"ok": True, "data": data}

        rows = [
            build_wellness_row(
                jugador_id="1",
                fecha="2026-09-02",
                sueno=3,
                fatiga=3,
                dolor=3,
                estres=3,
                humor=3,
                horas_sueno=7,
                molestia=True,
                molestia_texto="rodilla",
            )
        ]
        result = retry_wellness_write(execute, rows, op="bulk-insert")
        assert result["ok"] is True
        assert len(calls) == 2
        second = calls[1][0]
        for col in OPTIONAL_WELLNESS_COLS:
            assert col not in second
        assert "Horas sueño: 7" in second["notas"]
        assert "Molestia: rodilla" in second["notas"]
