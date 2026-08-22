from ast import ImportFrom, parse, walk
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_tipos_informe_v1():
    src = (ROOT / "app" / "services" / "informe_service.py").read_text(encoding="utf-8")
    for key in ("temporada", "plantilla", "jugador", "microciclo", "resultados"):
        assert f'"{key}"' in src


def test_dashboard_no_inner_join():
    src = (ROOT / "app" / "api" / "v1" / "estadisticas_dashboard.py").read_text(encoding="utf-8")
    assert "partidos!inner" not in src
    assert "_timed_query" in src
    assert 'in_("partido_id"' in src


def test_dashboard_date_is_imported_unaliased():
    src = (ROOT / "app" / "api" / "v1" / "estadisticas_dashboard.py").read_text(encoding="utf-8")
    aliases = {}
    for node in walk(parse(src)):
        if isinstance(node, ImportFrom) and node.module == "datetime":
            for alias in node.names:
                aliases[alias.name] = alias.asname or alias.name
    assert aliases.get("date") == "date"
    assert "hoy = date.today()" in src


def test_dossier_template_chrome():
    html = (ROOT / "app" / "templates" / "informe_dossier.html").read_text(encoding="utf-8")
    assert "Dossier" in html
    assert "{{ titulo }}" in html
    assert "{{ ambito_label }}" in html
    assert "organizacion.logo_url" in html
    assert "racha" in html
    assert "notas" in html
    assert "local" in html
    assert "s.tareas" in html
    assert "microciclo.extendido" in html
    assert "task-board" in html
    assert "preview_img" in html
    assert "svg_thumbnail" in html
    assert "ses-banner" in html
    assert "board-empty" in html
    assert "md_bar" in html
    assert "week-hero" in html
    assert "Sala del lunes" in html
    assert "Mensaje de la semana" in html
    assert "sala.mensaje" in html
    assert "PREVIEW_MAX_CHARS" not in (ROOT / "app" / "services" / "informe_boards.py").read_text(encoding="utf-8")


def test_informe_carga_sesion_tareas():
    src = (ROOT / "app" / "services" / "informe_service.py").read_text(encoding="utf-8")
    assert "sesion_tareas" in src
    assert "_tareas_por_sesion" in src
    assert "FASE_SESION_LABEL" in src
    assert "grafico_data" in src
    assert "board_assets" in src
    assert "consignas_ofensivas" in src
    assert "_graficos_por_tarea" in src
    assert "sintetizar_sala_lunes" in src
    boards = (ROOT / "app" / "services" / "informe_boards.py").read_text(encoding="utf-8")
    assert "extract_preview" in boards
    assert "board_assets" in boards
    assert "MATCH_DAY_CHROME" in boards
    assert "render_diagram_svg" in boards


def test_md_chrome_and_boards():
    from app.services.informe_boards import as_list, bloques_de_tareas, board_assets, md_chrome, weekday

    chrome = md_chrome("MD-3")
    assert chrome["label"] == "Resistencia"
    assert chrome["bar"].startswith("#")
    assert md_chrome("MD")["label"] == "Partido"
    assert md_chrome(None)["bar"] == "#334155"
    assert weekday("2026-08-21") == "viernes"
    assert as_list("a\nb\n", 4) == ["a", "b"]

    img, svg = board_assets({}, "x")
    assert img == ""
    assert svg == ""
    img, svg = board_assets(
        {"grafico_data": {"preview": "data:image/jpeg;base64,abc"}},
        "x",
    )
    assert img.startswith("data:image")
    assert svg == ""

    huge = "data:image/jpeg;base64," + ("A" * 950_000)
    img, svg = board_assets({"grafico_data": {"preview": huge}}, "x")
    assert img.startswith("data:image")
    assert svg == ""

    img, svg = board_assets({"grafico_data": {"pitchType": "full"}}, "x")
    assert img == ""
    assert svg == ""

    bloques = bloques_de_tareas([
        {"fase": "Activación", "orden": 1},
        {"fase": "Activación", "orden": 2},
        {"fase": "Desarrollo 1", "orden": 3},
    ])
    assert len(bloques) == 2
    assert len(bloques[0]["tareas"]) == 2


def test_sintetizar_sala_lunes_plantilla():
    from app.services.informe_semana import sintetizar_sala_lunes

    sala = sintetizar_sala_lunes(
        micro={
            "rango": "18/08 – 24/08",
            "objetivo": "Presión alta",
            "objetivo_tactico": "Salida 3+1",
            "objetivo_fisico": "RSA",
            "rival": "Écija",
        },
        plan_ct={
            "tipo_microciclo": "competicion",
            "modo_partido": "oficial",
            "objetivos_semana": ["Tercer hombre", "Presión tras pérdida"],
            "olfato_ct": "El grupo llega justo.",
            "rival_scout": {
                "sistema": "4-4-2",
                "fortalezas": ["Salida en largo"],
                "debilidades": ["Lateral izquierdo"],
            },
            "plan_partido": {"ataque_organizado": "Amplitud y tercer hombre"},
            "dias": {
                "MD-3": {"objetivo_dia": "Resistencia + presión", "objetivo_tactico": "Tras pérdida"},
            },
        },
        sesiones=[{"md": "MD-2", "objetivo": "Velocidad de circulación"}],
        reflexion={"rival_nombre": "Utrera", "texto": "Perdimos segundas jugadas."},
        plantilla={"por_disponibilidad": {"pleno": 16, "grupo_adaptado": 2, "individual": 1, "fuera": 1}},
    )
    assert "Sala del lunes" in sala["mensaje"]
    assert "Écija" in sala["mensaje"]
    assert "Presión alta" in sala["objetivos"] or any("Presión" in o for o in sala["objetivos"])
    assert sala["rival"]["sistema"] == "4-4-2"
    assert sala["rival"]["plan"]["ataque"]
    assert sala["reflexion"]["rival"] == "Utrera"
    assert any(d["md"] == "MD-3" for d in sala["dias"])
