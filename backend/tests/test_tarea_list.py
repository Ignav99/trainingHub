from app.services.tarea_list import (
    coerce_tarea_row_for_response,
    matches_family_filter,
    pages_for_total,
    resolve_list_tareas_total,
)


class TestResolveListTareasTotal:
    def test_keeps_db_count_even_when_page_is_smaller(self):
        # Regression: client-side "solo madres" used to set total = len(page) = 12
        assert resolve_list_tareas_total(37, 12) == 37

    def test_uses_page_len_when_count_missing(self):
        assert resolve_list_tareas_total(None, 8) == 8
        assert resolve_list_tareas_total(0, 8) == 8

    def test_zero_when_empty(self):
        assert resolve_list_tareas_total(0, 0) == 0

    def test_pages_use_real_total(self):
        assert pages_for_total(12, 12) == 1
        assert pages_for_total(13, 12) == 2
        assert pages_for_total(37, 12) == 4
        assert pages_for_total(64, 24) == 3


class TestCoerceTareaRow:
    def test_invalid_enum_does_not_drop_row(self):
        row = coerce_tarea_row_for_response(
            {
                "titulo": "Rondo 4vs4",
                "duracion_total": 0,
                "num_jugadores_min": 0,
                "fase_juego": "no_existe",
                "modalidad": "",
                "densidad": "media",
            }
        )
        assert row["titulo"] == "Rondo 4vs4"
        assert row["duracion_total"] == 1
        assert row["num_jugadores_min"] == 1
        assert row["fase_juego"] is None
        assert row["modalidad"] is None
        assert row["densidad"] == "media"

    def test_empty_title_gets_fallback(self):
        row = coerce_tarea_row_for_response({"titulo": "  ", "duracion_total": 8, "num_jugadores_min": 4})
        assert row["titulo"] == "Tarea"


class TestFamilyFilter:
    def test_madres_skip_variants(self):
        assert matches_family_filter({"tarea_origen_id": None}, solo_madres=True, solo_variantes=False)
        assert not matches_family_filter(
            {"tarea_origen_id": "abc"}, solo_madres=True, solo_variantes=False
        )

    def test_todas_keeps_both(self):
        assert matches_family_filter({"tarea_origen_id": None}, solo_madres=False, solo_variantes=False)
        assert matches_family_filter(
            {"tarea_origen_id": "abc"}, solo_madres=False, solo_variantes=False
        )
