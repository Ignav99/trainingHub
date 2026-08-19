from app.services.tarea_narrative import (
    hydrate_tarea_narrative,
    reglas_as_text,
    sync_reglas_variantes,
)


class TestSyncReglasVariantes:
    def test_reglas_text_fills_variantes_list(self):
        out = sync_reglas_variantes({"reglas": "Máximo 2 toques.\nGol en portería pequeña vale doble."})
        assert out["reglas"].startswith("Máximo 2 toques")
        assert out["variantes"] == [
            "Máximo 2 toques.",
            "Gol en portería pequeña vale doble.",
        ]

    def test_variantes_list_fills_reglas_text(self):
        out = sync_reglas_variantes({"variantes": ["3 toques", "Presión tras pérdida"]})
        assert out["reglas"] == "3 toques\nPresión tras pérdida"


class TestHydrateNarrative:
    def test_reads_legacy_variantes_when_reglas_empty(self):
        t = hydrate_tarea_narrative({"reglas": None, "variantes": ["Fuera de juego", "Gol de cabeza"]})
        assert t["reglas"] == "Fuera de juego\nGol de cabeza"

    def test_reads_reglas_tacticas_when_reglas_empty(self):
        t = hydrate_tarea_narrative({"reglas": "", "reglas_tacticas": ["Máximo 2 toques"]})
        assert t["reglas"] == "Máximo 2 toques"

    def test_prefers_reglas_over_legacy(self):
        t = hydrate_tarea_narrative({
            "reglas": "Norma nueva",
            "variantes": ["Antigua"],
        })
        assert t["reglas"] == "Norma nueva"

    def test_desarrollo_from_descripcion(self):
        t = hydrate_tarea_narrative({"descripcion": "4vs4+3 en medio campo"})
        assert t["desarrollo"] == "4vs4+3 en medio campo"


class TestReglasAsText:
    def test_empty(self):
        assert reglas_as_text(None) == ""
        assert reglas_as_text({}) == ""
