from app.services.partido_ambito import (
    AMBITO_COMPETICION,
    AMBITO_AMISTOSOS,
    AMBITO_TODOS,
    AMBITO_LABELS,
    competicion_de,
    en_ambito,
    es_amistoso,
    es_oficial,
    filtrar_por_ambito,
    normalize_ambito,
)


class TestNormalizeAmbito:
    def test_default(self):
        assert normalize_ambito(None) == AMBITO_COMPETICION
        assert normalize_ambito("") == AMBITO_COMPETICION

    def test_aliases(self):
        assert normalize_ambito("oficial") == AMBITO_COMPETICION
        assert normalize_ambito("amistoso") == AMBITO_AMISTOSOS
        assert normalize_ambito("conjunto") == AMBITO_TODOS


class TestEnAmbito:
    def test_competicion_excludes_amistoso(self):
        assert en_ambito("liga", AMBITO_COMPETICION) is True
        assert en_ambito("copa", AMBITO_COMPETICION) is True
        assert en_ambito("torneo", AMBITO_COMPETICION) is True
        assert en_ambito("amistoso", AMBITO_COMPETICION) is False
        assert en_ambito("otro", AMBITO_COMPETICION) is False

    def test_amistosos_only_friendliest(self):
        assert en_ambito("amistoso", AMBITO_AMISTOSOS) is True
        assert en_ambito("liga", AMBITO_AMISTOSOS) is False

    def test_otro_only_in_todos(self):
        assert en_ambito("otro", AMBITO_COMPETICION) is False
        assert en_ambito("otro", AMBITO_AMISTOSOS) is False
        assert en_ambito("otro", AMBITO_TODOS) is True


class TestFiltrar:
    def test_nested_partidos_competicion(self):
        rows = [
            {"id": "1", "partidos": {"competicion": "liga"}},
            {"id": "2", "partidos": {"competicion": "amistoso"}},
            {"id": "3", "competicion": "copa"},
        ]
        of = filtrar_por_ambito(rows, AMBITO_COMPETICION)
        assert [r["id"] for r in of] == ["1", "3"]
        am = filtrar_por_ambito(rows, AMBITO_AMISTOSOS)
        assert [r["id"] for r in am] == ["2"]

    def test_helpers(self):
        assert es_oficial("liga")
        assert es_amistoso("amistoso")
        assert competicion_de({"partidos": {"competicion": "copa"}}) == "copa"
        assert AMBITO_LABELS[AMBITO_COMPETICION]


class TestTarjetasPorJugador:
    def test_excludes_amistoso_cards_from_competition(self):
        from app.services.partido_ambito import tarjetas_por_jugador

        rows = [
            {
                "jugador_id": "j1",
                "tarjeta_amarilla": True,
                "tarjeta_roja": False,
                "partidos": {"competicion": "amistoso"},
            },
            {
                "jugador_id": "j1",
                "tarjeta_amarilla": True,
                "tarjeta_roja": False,
                "partidos": {"competicion": "liga"},
            },
            {
                "jugador_id": "j1",
                "tarjeta_amarilla": False,
                "tarjeta_roja": True,
                "partidos": {"competicion": "amistoso"},
            },
        ]
        of = tarjetas_por_jugador(rows, AMBITO_COMPETICION)
        assert of["j1"]["amarillas"] == 1
        assert of["j1"]["rojas"] == 0
        am = tarjetas_por_jugador(rows, AMBITO_AMISTOSOS)
        assert am["j1"]["amarillas"] == 1
        assert am["j1"]["rojas"] == 1
        todos = tarjetas_por_jugador(rows, AMBITO_TODOS)
        assert todos["j1"]["amarillas"] == 2
        assert todos["j1"]["rojas"] == 1


class TestCuentaTitularSuplente:
    def test_el_banquillo_cuenta_aunque_no_juegue(self):
        from app.services.partido_ambito import cuenta_titular_suplente

        titularidades, suplencias = cuenta_titular_suplente([
            {"titular": True, "minutos_jugados": 90},
            {"titular": True, "minutos_jugados": 90},
            {"titular": False, "minutos_jugados": 12},
            {"titular": False, "minutos_jugados": 0},
            {"titular": None, "minutos_jugados": 0},
        ])
        assert titularidades == 2
        assert suplencias == 3

    def test_ignora_filas_que_no_son_convocatoria(self):
        from app.services.partido_ambito import cuenta_titular_suplente

        assert cuenta_titular_suplente([None, "x", {"titular": False}]) == (0, 1)


class TestRendimientoReciente:
    def test_ultimas_cinco_con_minutos(self):
        from app.services.partido_ambito import rendimiento_reciente

        rows = [
            {"minutos_jugados": 90, "rendimiento_media": 8},
            {"minutos_jugados": 0, "rendimiento_media": 2},
            {"minutos_jugados": 20, "rendimiento_media": None},
            {"minutos_jugados": 45, "rendimiento_media": 6},
            {"minutos_jugados": 90, "rendimiento_media": 7},
            {"minutos_jugados": 90, "rendimiento_media": 7},
            {"minutos_jugados": 90, "rendimiento_media": 7},
            {"minutos_jugados": 90, "rendimiento_media": 1},
        ]
        media, n = rendimiento_reciente(rows)
        assert n == 5
        assert media == 7.0

    def test_sin_notas(self):
        from app.services.partido_ambito import rendimiento_reciente

        assert rendimiento_reciente([{"minutos_jugados": 90}]) == (None, 0)

