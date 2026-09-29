"""Roles de balón parado y tamaño de los dorsales en el SVG del PDF."""
from app.services.svg_renderer import render_element_svg, roles_campo_from_diagram


def test_player_circle_is_large_enough_to_read_the_shirt():
    svg = render_element_svg({
        "type": "player",
        "position": {"x": 10, "y": 20},
        "label": "10",
    })
    assert 'r="22"' in svg
    assert 'font-size="20"' in svg
    assert ">10<" in svg


def test_roles_campo_keep_dorsals_and_text():
    roles = roles_campo_from_diagram({
        "roles": [
            {"id": "a", "dorsales": ["9", "9", " 4"], "texto": " Remata al primer palo "},
            {"id": "b", "dorsales": [], "texto": "   "},
            {"dorsales": ["3"], "texto": ""},
            "nope",
        ]
    })
    assert roles == [
        {"dorsales": ["9", "4"], "texto": "Remata al primer palo"},
        {"dorsales": ["3"], "texto": ""},
    ]


def test_roles_campo_missing_diagram():
    assert roles_campo_from_diagram(None) == []
    assert roles_campo_from_diagram({"elements": []}) == []
