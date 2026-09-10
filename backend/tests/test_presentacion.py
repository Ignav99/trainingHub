from io import BytesIO
from zipfile import ZipFile

from app.services.presentacion_briefing import briefing_from_informe, briefing_from_plan, briefing_to_prompt
from app.services.presentacion_deck import MAX_SLIDES, fallback_deck, normalize_deck, parse_deck_json
from app.services.presentacion_pptx import build_pptx_bytes


INFORME = {
    "sistema": "4-3-3",
    "fortalezas": ["Amplitud", "Balón parado"],
    "debilidades": ["Espalda del lateral"],
    "anotaciones": "Presionar la salida por izquierda.",
    "fases": [
        {
            "fase": "ataque_organizado",
            "fortalezas": ["Salida por 2"],
            "debilidades": ["Pérdidas interiores"],
            "pizarra_diagrama": {"elements": [{"x": 1}]},
            "clips": [{"id": "c1", "url": "http://x"}],
            "subfases": {"creacion": {"notas": "Portero + 2, buscan al 6"}},
        },
        {
            "fase": "defensa_organizada",
            "fortalezas": ["Bloque medio"],
            "subfases": {"bloque_medio": {"notas": "Basculan tarde al lado débil"}},
        },
    ],
    "estrategia": {
        "sistema": "4-3-3",
        "once_probable": {
            "jugadores": [{"nombre": "García", "dorsal": 9}, {"nombre": "López", "dorsal": 10}],
        },
    },
}

PLAN = {
    "consignas_clave": ["Ataque al espacio", "No regalar córner"],
    "fases": [
        {
            "fase": "ataque_organizado",
            "subfases": {"finalizacion": {"notas": "Llegadas del interior a penalti"}},
        },
        {
            "fase": "abp_ofensiva",
            "jugadas_abp": [{"jugada_id": "abc", "comentario": "Corto + segundo palo", "orden": 1}],
        },
    ],
}


class TestBriefing:
    def test_informe_omits_diagrams_and_clips(self):
        brief = briefing_from_informe(INFORME, {"rival_nombre": "Atlético"})
        assert brief["tipo"] == "informe"
        assert brief["rival"] == "Atlético"
        assert "García" in brief["once"]
        dumped = briefing_to_prompt(brief)
        assert "pizarra" not in dumped
        assert "http://x" not in dumped
        assert "Portero + 2" in dumped

    def test_plan_keeps_abp_comments(self):
        brief = briefing_from_plan(PLAN, {"rival_nombre": "Atlético", "tramo": "ida"})
        assert brief["tramo"] == "ida"
        assert any("segundo palo" in str(v) for v in brief["fases"].values())


class TestDeck:
    def test_fallback_is_short_and_starts_with_title(self):
        deck = fallback_deck(briefing_from_informe(INFORME, {"rival_nombre": "Atlético"}))
        assert 1 <= len(deck["slides"]) <= MAX_SLIDES
        assert deck["slides"][0]["layout"] == "portada"
        assert any(s["layout"] == "claves" for s in deck["slides"])

    def test_parse_json_strips_markdown(self):
        raw = """```json
        {"titulo": "vs X", "slides": [{"layout": "bullets", "title": "Ataque", "bullets": ["Salen por 2"]}]}
        ```"""
        deck = parse_deck_json(raw, {"tipo": "informe", "rival": "X"})
        assert deck["slides"][0]["layout"] == "portada"
        assert any(s["title"] == "Ataque" for s in deck["slides"])

    def test_normalize_drops_empty_and_caps_bullets(self):
        deck = normalize_deck({
            "slides": [
                {"layout": "bullets", "title": "A", "bullets": ["uno", "dos", "tres", "cuatro", "cinco"]},
                {"layout": "bullets", "title": "", "bullets": []},
            ]
        }, {"tipo": "plan", "rival": "Y"})
        bullets_slide = next(s for s in deck["slides"] if s["layout"] == "bullets")
        assert len(bullets_slide["bullets"]) == 4


class TestPptx:
    def test_pptx_is_a_zip_with_slides(self):
        deck = fallback_deck(briefing_from_plan(PLAN, {"rival_nombre": "Atlético", "club_nombre": "Nuestro"}))
        blob = build_pptx_bytes(deck, {
            "club_nombre": "Nuestro",
            "rival_nombre": "Atlético",
            "color_primario": "#1e3a5f",
        })
        assert blob[:2] == b"PK"
        with ZipFile(BytesIO(blob)) as zf:
            names = zf.namelist()
            assert any(n.startswith("ppt/slides/slide") for n in names)
            assert "ppt/presentation.xml" in names


def test_export_route_filename():
    from app.api.v1.presentaciones import _filename
    assert _filename("informe", "Atlético M.").endswith(".pptx")
    assert _filename("plan", None).startswith("plan-partido")
