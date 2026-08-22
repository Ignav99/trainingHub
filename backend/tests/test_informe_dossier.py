from ast import ImportFrom, parse, walk
from pathlib import Path

import pytest

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
    assert "svg_thumbnail|safe" not in html
    assert "ses-banner" in html
    assert "board-empty" in html
    assert "md_bar" in html
    assert "week-hero" in html
    assert "Sala del lunes" in html
    assert "Mensaje de la semana" in html
    assert "sala.mensaje" in html
    assert "s.asistencia" in html
    assert "Trabajo al margen" in html
    assert "Informe de lesiones" in html
    assert "Plantilla de la sesión" in html
    assert "75.5mm" in html
    assert "PREVIEW_MAX_CHARS" not in (ROOT / "app" / "services" / "informe_boards.py").read_text(encoding="utf-8")


def test_informe_carga_sesion_tareas():
    src = (ROOT / "app" / "services" / "informe_service.py").read_text(encoding="utf-8")
    assert "sesion_tareas" in src
    assert "_tareas_por_sesion" in src
    assert "FASE_SESION_LABEL" in src
    assert "grafico_data" in src
    assert "board_assets" in src
    assert "consignas_ofensivas" in src
    assert "_grafico_de_tarea" in src
    assert "_foto_pizarra" in src
    assert "_preview_de_tarea" in src
    assert "_sesion_tareas_rows" in src
    assert "_get_jinja_env_v2" in src
    assert "detalle_sesiones" in src
    assert "asistencias_sesion" in (ROOT / "app" / "services" / "informe_sesion_detalle.py").read_text(encoding="utf-8")
    assert "sintetizar_sala_lunes" in src
    boards = (ROOT / "app" / "services" / "informe_boards.py").read_text(encoding="utf-8")
    assert "extract_preview" in boards
    assert "board_assets" in boards
    assert "MATCH_DAY_CHROME" in boards
    assert "rasterize_board" in boards
    assert "_svg_to_jpeg" in boards


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

    img, svg = board_assets(
        {"grafico_data": {
            "pitchType": "full",
            "elements": [{"type": "player", "x": 200, "y": 180, "label": "9"}],
        }},
        "t1",
    )
    assert svg == ""
    cairosvg = pytest.importorskip("cairosvg")
    assert img.startswith("data:image/jpeg")
    assert len(img) > 800

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


def test_normalizar_asistencia_y_rpe():
    from app.services.informe_sesion_detalle import (
        agregar_rpe,
        fusionar_rpe,
        normalizar_asistencia,
        resumen_asistencia,
    )

    sesion = normalizar_asistencia({
        "presente": True,
        "tipo_participacion": ["sesion"],
        "jugadores": {"nombre": "Juan", "apellidos": "Pérez", "dorsal": 10, "posicion_principal": "medio"},
        "jugador_id": "j1",
    })
    assert sesion["grupo"] == "sesion"
    assert sesion["rol"] == "Sesión"
    assert sesion["nombre_completo"] == "Juan Pérez"

    ausente = normalizar_asistencia({
        "presente": False,
        "motivo_ausencia": "lesion",
        "jugadores": {"nombre": "Luis", "apellidos": "García", "dorsal": 4},
    })
    assert ausente["grupo"] == "ausente"
    assert "Lesión" in ausente["rol"]

    margen = normalizar_asistencia({
        "presente": True,
        "tipo_participacion": ["margen", "fisio"],
        "jugadores": {"nombre": "Alex", "apellidos": "Ruiz", "dorsal": 7},
    })
    assert margen["grupo"] == "fisio"
    assert "Margen" in margen["rol"]
    assert "Fisio" in margen["rol"]

    filas = [sesion, ausente, margen]
    counts = resumen_asistencia(filas)
    assert counts["n_sesion"] == 1
    assert counts["n_ausente"] == 1
    assert counts["n_margen"] == 1
    assert counts["n_fisio"] == 1

    fusionar_rpe(filas, [{"jugador_id": "j1", "rpe": 7, "carga": 420}])
    assert sesion["rpe"] == 7
    assert sesion["carga"] == 420
    agg = agregar_rpe([{"rpe": 6, "carga": 300}, {"rpe": 8, "carga": 400}])
    assert agg["rpe_medio"] == 7.0
    assert agg["carga_total"] == 700


def test_dossier_weasyprint_incrusta_jpeg():
    """WeasyPrint debe pintar el JPEG de pizarra con el CSS del dossier (como el PDF de sesión)."""
    weasy = pytest.importorskip("weasyprint")
    from app.services.pdf_service import _get_jinja_env_v2

    pixel = (
        "data:image/jpeg;base64,"
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U"
        "HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN"
        "DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy"
        "MjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAU"
        "EAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAA"
        "AAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/a"
        "AAgBAQABPwB//9k="
    )
    env = _get_jinja_env_v2()
    html = env.get_template("informe_dossier.html").render(
        tipo="microciclo",
        titulo="Sala del lunes",
        color="#1a365d",
        organizacion={"nombre": "Kabin", "logo_url": ""},
        equipo={"nombre": "Primera", "categoria": "", "temporada": "26/27"},
        ambito_label="Competición",
        audiencia_label="Cuerpo técnico",
        profundidad_label="Extendido",
        profundidad="extendido",
        periodo="18/08 – 24/08",
        generado="22/08/2026 12:00",
        secciones=["microciclo"],
        resumen={"pj": 0, "pg": 0, "pe": 0, "pp": 0, "gf": 0, "gc": 0, "dg": 0, "pts": 0},
        local={"pj": 0, "pg": 0, "pe": 0, "pp": 0, "gf": 0, "gc": 0},
        visitante={"pj": 0, "pg": 0, "pe": 0, "pp": 0, "gf": 0, "gc": 0},
        racha=[],
        narrativa="",
        prompt="",
        notas="",
        evolucion=[],
        plantilla=[],
        jugador=None,
        microciclo={
            "rango": "18/08 – 24/08",
            "objetivo": "Presión",
            "detalle": True,
            "extendido": True,
            "n_sesiones": 1,
            "n_tareas": 1,
            "n_boards": 1,
            "lesiones": [],
            "sala": None,
            "sesiones": [{
                "fecha": "18/08/2026",
                "weekday": "lunes",
                "titulo": "MD+1",
                "md": "MD+1",
                "md_bar": "#22C55E",
                "md_ink": "#15803D",
                "md_wash": "#ECFDF5",
                "md_label": "Recuperación",
                "min": 70,
                "carga": "Baja",
                "n_tareas": 1,
                "asistencia": [],
                "margen": [],
                "bloques": [{
                    "fase": "Desarrollo 1",
                    "tareas": [{
                        "orden": 1,
                        "titulo": "Rondo 4v2",
                        "preview_img": pixel,
                        "svg_thumbnail": "",
                        "categoria": "POS",
                        "min": 12,
                        "resumen": "Tercer hombre",
                    }],
                }],
            }],
        },
    )
    assert pixel in html
    pdf = weasy.HTML(string=html).write_pdf()
    assert pdf.startswith(b"%PDF")
    assert b"/Image" in pdf or b"/XObject" in pdf
