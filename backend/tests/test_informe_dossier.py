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
    assert "tarea-detalle" in html


def test_informe_carga_sesion_tareas():
    src = (ROOT / "app" / "services" / "informe_service.py").read_text(encoding="utf-8")
    assert "sesion_tareas" in src
    assert "_tareas_por_sesion" in src
    assert "FASE_SESION_LABEL" in src
