"""ABP playbook PDF: pitch orientation, names, movements, cover branding."""
from unittest.mock import MagicMock, patch

import pytest

from app.services.pdf_service import (
    _collect_directrices,
    _name_by_element_id,
    _render_abp_diagram_svg,
    generate_abp_playbook_pdf,
)
from app.services.svg_renderer import (
    prepare_abp_playbook_snapshot,
    render_abp_diagram_svg,
    render_arrow_svg,
    render_element_svg,
)


def _half_diagram(**extra):
    return {
        "pitchType": "half",
        "elements": [
            {
                "id": "p1",
                "type": "player",
                "position": {"x": 340, "y": 390},
                "label": "9",
                "rol": "lanzador",
                "jugador": "García",
                "funciones": [{"id": "f1", "funcion": "Pasa al palo corto", "jugadorLabel": "García"}],
            },
            {
                "id": "p2",
                "type": "player",
                "position": {"x": 250, "y": 450},
                "label": "7",
                "rol": "palo_corto",
            },
            {
                "id": "txt",
                "type": "text",
                "position": {"x": 340, "y": 80},
                "label": "Bloquea 1er palo",
                "color": "#FFFFFF",
            },
        ],
        "arrows": [
            {
                "id": "a1",
                "type": "pass",
                "from": {"x": 340, "y": 390},
                "to": {"x": 250, "y": 450},
                "label": "1",
                "comment": "Pase raso",
            },
            {
                "id": "a2",
                "type": "movement",
                "from": {"x": 250, "y": 450},
                "to": {"x": 200, "y": 480},
            },
        ],
        "zones": [],
        **extra,
    }


def test_playbook_svg_uses_abp_vertical_half_not_horizontal_task_pitch():
    svg = render_abp_diagram_svg(_half_diagram(), diagram_id="pb1")
    assert 'viewBox="0 0 680 525"' in svg
    assert 'viewBox="0 0 1050 680"' not in svg
    # Goal at BOTTOM (ABP), not left/right generic pitch
    assert 'y="500"' in svg
    assert 'x="10" y="305"' not in svg
    assert "rotate(90)" not in svg


def test_playbook_full_pitch_rotates_with_players_like_editor():
    diagram = {
        "pitchType": "full",
        "elements": [{"id": "p1", "type": "player", "x": 340, "y": 800, "label": "9"}],
        "arrows": [{"id": "a1", "type": "movement", "from": {"x": 340, "y": 800}, "to": {"x": 340, "y": 900}}],
        "zones": [],
    }
    svg = render_abp_diagram_svg(diagram, diagram_id="full1", horizontal_full=True)
    assert 'viewBox="0 0 1050 680"' in svg
    assert "rotate(90)" in svg
    # Players stay inside the rotated group so they match the field
    assert "translate(340,800)" in svg or "translate(340,800.0)" in svg


def test_playbook_renders_names_roles_text_and_arrow_comment():
    svg = render_abp_diagram_svg(
        _half_diagram(),
        diagram_id="names",
        name_by_element={"p2": "López"},
    )
    assert "LAN" in svg
    assert "García" in svg
    assert "López" in svg
    assert "Pasa al palo corto" in svg
    assert "Bloquea 1er palo" in svg
    assert "Pase raso" in svg
    assert "stroke-dasharray" in svg  # pass style


def test_animation_frames_produce_movement_trails():
    diagram = {
        "pitchType": "half",
        "elements": [{"id": "p1", "type": "player", "position": {"x": 100, "y": 100}, "label": "9"}],
        "arrows": [],
        "zones": [],
        "frames": [
            {"id": "f0", "elements": [{"id": "p1", "type": "player", "position": {"x": 100, "y": 100}, "label": "9"}], "arrows": []},
            {"id": "f1", "elements": [{"id": "p1", "type": "player", "position": {"x": 200, "y": 300}, "label": "9"}], "arrows": []},
        ],
    }
    snap = prepare_abp_playbook_snapshot(diagram)
    assert snap is not None
    trail_ids = [a.get("id") for a in snap["arrows"]]
    assert any(str(i).startswith("trail-") for i in trail_ids)
    svg = render_abp_diagram_svg(diagram, diagram_id="trail")
    assert "opacity=\"0.38\"" in svg


def test_frames_only_diagram_still_renders_tokens():
    diagram = {
        "pitchType": "half",
        "elements": [],
        "arrows": [],
        "zones": [],
        "frames": [
            {
                "elements": [{"id": "p1", "type": "player", "position": {"x": 340, "y": 400}, "label": "1"}],
                "arrows": [{"id": "a1", "type": "shot", "from": {"x": 340, "y": 400}, "to": {"x": 340, "y": 500}}],
            }
        ],
    }
    svg = _render_abp_diagram_svg({"diagram": diagram}, diagram_id="frame0")
    assert 'viewBox="0 0 680 525"' in svg
    assert "translate(340,400)" in svg


def test_arrow_styles_shot_and_sprint():
    shot = render_arrow_svg({"type": "shot", "from": {"x": 0, "y": 0}, "to": {"x": 80, "y": 0}})
    assert shot.count("<polygon") >= 2
    sprint = render_arrow_svg({"type": "sprint", "from": {"x": 0, "y": 0}, "to": {"x": 80, "y": 0}})
    assert "L " in sprint


def test_element_role_abbrev_and_name():
    svg = render_element_svg({
        "type": "player",
        "x": 10,
        "y": 20,
        "rol": "bloqueador",
        "label": "5",
        "jugador": "Martín",
    })
    assert "BLQ" in svg
    assert "Martín" in svg


def test_name_map_and_directrices():
    elements = [
        {"id": "e1", "label": "9", "rol": "lanzador", "funciones": [{"funcion": "Arrastra al central"}]},
    ]
    names = _name_by_element_id(
        [{"element_id": "e1", "jugador_id": "j1"}],
        {"j1": {"nombre": "Ana", "apellidos": "Ruiz"}},
        elements,
    )
    assert names["e1"] == "Ana Ruiz"
    dirs = _collect_directrices({"descripcion": "Saque corto"}, elements, [{"comment": "Desmarca", "label": "2"}])
    assert "Saque corto" in dirs
    assert any("Arrastra" in d for d in dirs)
    assert any("Desmarca" in d for d in dirs)


@pytest.mark.asyncio
async def test_playbook_pdf_html_has_logo_and_abp_viewbox():
    jugadas = [{
        "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "nombre": "Corto 1er palo",
        "codigo": "C1",
        "tipo": "corner",
        "lado": "ofensivo",
        "senal_codigo": "Puño",
        "descripcion": "Bloquea y pasa",
        "notas_tacticas": "Llegar al rechace",
        "asignaciones": [{"element_id": "p2", "jugador_id": "j2"}],
        "fases": [{"id": "f", "nombre": "Principal", "diagram": _half_diagram()}],
    }]
    kwargs = dict(
        equipo_nombre="Juvenil A",
        organizacion={
            "nombre": "Club Test",
            "logo_url": "data:image/png;base64,aaa",
            "color_primario": "#112233",
        },
        equipo_temporada="2025/26",
        equipo_categoria="Juvenil",
        jugadores_map={"j2": {"nombre": "Pedro", "apellidos": "López"}},
    )

    captured = {}

    def fake_html(string=""):
        captured["html"] = string
        mock = MagicMock()
        mock.write_pdf.return_value = b"%PDF-fake"
        return mock

    try:
        import weasyprint  # noqa: F401
        with patch("weasyprint.HTML", side_effect=lambda string, **kw: fake_html(string)):
            await generate_abp_playbook_pdf(jugadas, **kwargs)
        html = captured["html"]
    except ImportError:
        html = (await generate_abp_playbook_pdf(jugadas, **kwargs)).decode("utf-8")

    assert "Playbook ABP" in html
    assert "Club Test" in html
    assert "data:image/png;base64,aaa" in html
    assert "Generado con Kabin-e" in html
    assert "Juvenil A" in html
    assert 'viewBox="0 0 680 525"' in html
    assert 'x="10" y="305"' not in html
    assert "García" in html
    assert "Pedro López" in html
    assert "Pasa al palo corto" in html
    assert "Puño" in html
    assert "#112233" in html
    assert "Índice de jugadas" in html
