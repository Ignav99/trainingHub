"""Retry de insert/update de sesión cuando PostgREST no conoce una columna."""

from app.services.sesion_taxonomy import (
    ESTRUCTURA_FALLBACK_KEY,
    drop_unsupported_columns,
    normalize_sesion_row,
    retry_sesion_write,
    stash_estructura_fases,
)


PGRST204_ESTRUCTURA = (
    "{'code': 'PGRST204', 'details': None, 'hint': None, "
    "\"message\": \"Could not find the 'estructura_fases' column of 'sesiones' in the schema cache\"}"
)


class TestDropUnsupportedColumns:
    def test_drops_estructura_fases_from_pgrst204(self):
        payload = {
            "titulo": "MD-3",
            "fecha": "2026-08-18",
            "equipo_id": "abc",
            "estructura_fases": [{"id": "1", "tipo": "activacion", "label": "Activación", "orden": 0}],
        }
        out, dropped = drop_unsupported_columns(payload, PGRST204_ESTRUCTURA)
        assert dropped == ["estructura_fases"]
        assert "estructura_fases" not in out
        assert out["titulo"] == "MD-3"
        assert out["fecha"] == "2026-08-18"

    def test_does_not_drop_required_columns(self):
        payload = {"titulo": "X", "fecha": "2026-01-01"}
        out, dropped = drop_unsupported_columns(
            payload,
            "Could not find the 'fecha' column of 'sesiones' in the schema cache",
        )
        assert dropped == []
        assert out["fecha"] == "2026-01-01"

    def test_no_match_returns_unchanged(self):
        payload = {"titulo": "X", "estructura_fases": []}
        out, dropped = drop_unsupported_columns(payload, "connection refused")
        assert dropped == []
        assert out == payload


class TestEstructuraFallback:
    def test_stash_and_read_roundtrip(self):
        bloques = [{"id": "b1", "tipo": "desarrollo_1", "label": "Desarrollo 1", "orden": 0}]
        stashed = stash_estructura_fases({"titulo": "S"}, bloques)
        assert ESTRUCTURA_FALLBACK_KEY in stashed["fase_notas"]
        row = normalize_sesion_row({"titulo": "S", "fase_notas": stashed["fase_notas"]})
        assert row["estructura_fases"] == bloques

    def test_prefers_real_column(self):
        real = [{"id": "real", "tipo": "activacion", "label": "A", "orden": 0}]
        row = normalize_sesion_row({
            "estructura_fases": real,
            "fase_notas": {ESTRUCTURA_FALLBACK_KEY: "[]"},
        })
        assert row["estructura_fases"] == real


class TestRetryWrite:
    def test_retries_after_pgrst204_and_succeeds(self):
        calls = []

        def execute(data):
            calls.append(dict(data))
            if "estructura_fases" in data:
                raise Exception(PGRST204_ESTRUCTURA)
            return {"ok": True, "data": [data]}

        result = retry_sesion_write(
            execute,
            {
                "titulo": "Sesion",
                "fecha": "2026-08-18",
                "equipo_id": "e1",
                "estructura_fases": [{"id": "1", "tipo": "activacion", "label": "Activación", "orden": 0}],
            },
            op="insert",
        )
        assert result["ok"] is True
        assert len(calls) == 2
        assert "estructura_fases" not in calls[1]
        assert ESTRUCTURA_FALLBACK_KEY in calls[1]["fase_notas"]

    def test_reraises_unrelated_errors(self):
        def execute(_data):
            raise RuntimeError("disk full")

        try:
            retry_sesion_write(execute, {"titulo": "X"}, op="insert")
            assert False, "should have raised"
        except RuntimeError as e:
            assert "disk full" in str(e)
