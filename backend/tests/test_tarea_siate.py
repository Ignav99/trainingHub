from app.services.tarea_siate import hydrate_siate, merge_siate_into_grafico, preserve_siate_on_grafico_patch


class TestMergeSiateIntoGrafico:
    def test_stashes_go_and_pes_even_without_pizarra(self):
        out = merge_siate_into_grafico({
            "titulo": "Rondo",
            "complejidad_go": 4,
            "complejidad_pes": 2,
        })
        assert out["complejidad_go"] == 4
        assert out["complejidad_pes"] == 2
        assert out["grafico_data"]["siate"] == {"go": 4, "pes": 2}

    def test_keeps_existing_board_and_adds_siate(self):
        out = merge_siate_into_grafico({
            "grafico_data": {"elements": [{"id": "p1"}], "arrows": [], "zones": []},
            "complejidad_go": 5,
        })
        assert out["grafico_data"]["elements"][0]["id"] == "p1"
        assert out["grafico_data"]["siate"]["go"] == 5
        assert "pes" not in out["grafico_data"]["siate"]

    def test_clears_go_when_null(self):
        out = merge_siate_into_grafico({
            "grafico_data": {"siate": {"go": 4, "pes": 3}},
            "complejidad_go": None,
            "complejidad_pes": 3,
        })
        assert out["complejidad_go"] is None
        assert out["grafico_data"]["siate"] == {"pes": 3}

    def test_leaves_payload_untouched_without_siate_keys(self):
        payload = {"titulo": "Rondo", "grafico_data": {"elements": []}}
        out = merge_siate_into_grafico(payload)
        assert out == payload


class TestHydrateSiate:
    def test_prefers_columns(self):
        out = hydrate_siate({
            "complejidad_go": 2,
            "grafico_data": {"siate": {"go": 5, "pes": 1}},
        })
        assert out["complejidad_go"] == 2
        assert out["complejidad_pes"] == 1

    def test_falls_back_to_stash(self):
        out = hydrate_siate({"grafico_data": {"siate": {"go": 4}}})
        assert out["complejidad_go"] == 4
        assert "complejidad_pes" not in out


class TestPreserveSiateOnGraficoPatch:
    def test_keeps_previous_siate_when_pizarra_save_omits_it(self):
        out = preserve_siate_on_grafico_patch(
            {"grafico_data": {"siate": {"go": 4, "pes": 2}, "elements": []}},
            {"grafico_data": {"elements": [{"id": "a"}], "arrows": [], "zones": []}},
        )
        assert out["grafico_data"]["elements"][0]["id"] == "a"
        assert out["grafico_data"]["siate"] == {"go": 4, "pes": 2}

    def test_does_not_override_incoming_siate(self):
        out = preserve_siate_on_grafico_patch(
            {"grafico_data": {"siate": {"go": 4}}},
            {"grafico_data": {"siate": {"go": 1}, "elements": []}},
        )
        assert out["grafico_data"]["siate"] == {"go": 1}
