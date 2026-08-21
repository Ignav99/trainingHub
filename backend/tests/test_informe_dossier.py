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


def test_dossier_template_chrome():
    html = (ROOT / "app" / "templates" / "informe_dossier.html").read_text(encoding="utf-8")
    assert "Dossier" in html
    assert "{{ titulo }}" in html
    assert "{{ ambito_label }}" in html
    assert "organizacion.logo_url" in html
    assert "racha" in html
    assert "notas" in html
    assert "local" in html
