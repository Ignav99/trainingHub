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
