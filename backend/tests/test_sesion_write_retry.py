"""Retry de insert/update de sesión cuando PostgREST no conoce una columna."""

from app.services.sesion_taxonomy import (
    ESTRUCTURA_FALLBACK_KEY,
    drop_unsupported_columns,
    normalize_sesion_row,
    prepare_sesion_write_payload,
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


class TestContenidosTecnicosSync:
    def test_mirrors_tecnicos_to_legacy_jsonb(self):
        out = prepare_sesion_write_payload(
            {
                "titulo": "MD-3 presion",
                "fecha": "2026-08-21",
                "contenidos_tecnicos_of": ["pase_circulacion", "Presión alta"],
                "contenidos_tecnicos_def": ["acoso"],
            },
            synthesize=False,
        )
        assert out["contenidos_tecnicos_of"] == ["pase_circulacion", "Presión alta"]
        assert out["contenidos_ofensivos"] == ["pase_circulacion", "Presión alta"]
        assert out["contenidos_tecnicos_def"] == ["acoso"]
        assert out["contenidos_defensivos"] == ["acoso"]

    def test_mirrors_legacy_to_tecnicos(self):
        out = prepare_sesion_write_payload(
            {
                "titulo": "MD-3 presion",
                "fecha": "2026-08-21",
                "contenidos_ofensivos": ["tercer_hombre"],
            },
            synthesize=False,
        )
        assert out["contenidos_tecnicos_of"] == ["tercer_hombre"]
        assert out["contenidos_ofensivos"] == ["tercer_hombre"]

    def test_strips_blank_tags(self):
        out = prepare_sesion_write_payload(
            {
                "titulo": "MD-3 presion",
                "fecha": "2026-08-21",
                "contenidos_tecnicos_of": ["  pared  ", "", "  "],
            },
            synthesize=False,
        )
        assert out["contenidos_tecnicos_of"] == ["pared"]
        assert out["contenidos_ofensivos"] == ["pared"]

    def test_normalize_hydrates_from_legacy_when_text_array_empty(self):
        row = normalize_sesion_row(
            {
                "contenidos_tecnicos_of": [],
                "contenidos_ofensivos": ["desmarques"],
                "contenidos_tecnicos_def": None,
                "contenidos_defensivos": ["repliegue"],
            }
        )
        assert row["contenidos_tecnicos_of"] == ["desmarques"]
        assert row["contenidos_tecnicos_def"] == ["repliegue"]

    def test_retry_keeps_legacy_when_text_array_unknown(self):
        calls = []
        err = (
            "{'code': 'PGRST204', 'details': None, 'hint': None, "
            "\"message\": \"Could not find the 'contenidos_tecnicos_of' column of 'sesiones' in the schema cache\"}"
        )

        def execute(data):
            calls.append(dict(data))
            if "contenidos_tecnicos_of" in data:
                raise Exception(err)
            return {"ok": True, "data": [data]}

        payload = prepare_sesion_write_payload(
            {
                "titulo": "MD-3 presion",
                "fecha": "2026-08-21",
                "equipo_id": "e1",
                "contenidos_tecnicos_of": ["Presión alta"],
            },
            synthesize=False,
        )
        result = retry_sesion_write(execute, payload, op="update")
        assert result["ok"] is True
        assert "contenidos_tecnicos_of" not in calls[-1]
        assert calls[-1]["contenidos_ofensivos"] == ["Presión alta"]
