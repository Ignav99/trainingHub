"""Retry de insert/update de tarea cuando PostgREST no conoce una columna."""

from app.services.tarea_write import drop_missing_tarea_cols, retry_tarea_write


PGRST204_DESARROLLO = (
    "{'code': 'PGRST204', 'details': None, 'hint': None, "
    "\"message\": \"Could not find the 'desarrollo' column of 'tareas' in the schema cache\"}"
)

PGRST204_ETIQUETAS = (
    "{'code': 'PGRST204', 'details': None, 'hint': None, "
    "\"message\": \"Could not find the 'etiquetas_fisicas' column of 'tareas' in the schema cache\"}"
)


class TestDropMissingTareaCols:
    def test_drops_desarrollo_from_pgrst204(self):
        payload = {
            "titulo": "Rondo",
            "descripcion": "4vs4+3",
            "desarrollo": "4vs4+3",
            "etiquetas_fisicas": ["RSA"],
        }
        out, dropped = drop_missing_tarea_cols(payload, PGRST204_DESARROLLO)
        assert dropped == ["desarrollo"]
        assert "desarrollo" not in out
        assert out["etiquetas_fisicas"] == ["RSA"]
        assert out["descripcion"] == "4vs4+3"

    def test_does_not_drop_titulo(self):
        payload = {"titulo": "Rondo", "desarrollo": "x"}
        out, dropped = drop_missing_tarea_cols(
            payload,
            "Could not find the 'titulo' column of 'tareas' in the schema cache",
        )
        assert dropped == []
        assert out["titulo"] == "Rondo"


class TestRetryTareaWrite:
    def test_retries_desarrollo_then_etiquetas_and_succeeds(self):
        calls = []

        def execute(data):
            calls.append(dict(data))
            if "desarrollo" in data:
                raise Exception(PGRST204_DESARROLLO)
            if "etiquetas_fisicas" in data:
                raise Exception(PGRST204_ETIQUETAS)
            return {"ok": True, "data": [data]}

        result = retry_tarea_write(
            execute,
            {
                "titulo": "Rondo",
                "descripcion": "4vs4",
                "desarrollo": "4vs4",
                "etiquetas_fisicas": ["RSA"],
                "tipo_variante": "original",
            },
            op="update",
        )
        assert result["ok"] is True
        assert len(calls) == 3
        assert "desarrollo" not in calls[1]
        assert "tipo_variante" not in calls[1]
        assert calls[1]["etiquetas_fisicas"] == ["RSA"]
        assert "etiquetas_fisicas" not in calls[2]
        assert calls[2]["titulo"] == "Rondo"
        assert calls[2]["descripcion"] == "4vs4"

    def test_reraises_unrelated_errors(self):
        def execute(_data):
            raise RuntimeError("disk full")

        try:
            retry_tarea_write(execute, {"titulo": "X"}, op="update")
            assert False, "should have raised"
        except RuntimeError as e:
            assert "disk full" in str(e)

    def test_keeps_siate_stash_when_go_column_missing(self):
        calls = []

        def execute(data):
            calls.append(dict(data))
            if "complejidad_go" in data:
                raise Exception(
                    "Could not find the 'complejidad_go' column of 'tareas' in the schema cache"
                )
            return {"ok": True, "data": [data]}

        result = retry_tarea_write(
            execute,
            {"titulo": "Rondo", "descripcion": "4vs4", "complejidad_go": 4},
            op="update",
        )
        assert result["ok"] is True
        assert calls[0]["grafico_data"]["siate"]["go"] == 4
        assert "complejidad_go" not in calls[1]
        assert "complejidad_pes" not in calls[1]
        assert calls[1]["grafico_data"]["siate"]["go"] == 4
