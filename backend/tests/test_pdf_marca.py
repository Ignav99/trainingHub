"""Marca común de los PDF: colores del club con contraste garantizado."""
from app.services.pdf_marca import contraste, preparar_html, tema_pdf


def test_tema_usa_colores_del_club():
    t = tema_pdf({"color_primario": "#c8102e", "color_secundario": "#003087", "nombre": "CAC"})
    assert t["primario"] == "#C8102E"
    assert t["secundario"] == "#003087"
    assert t["club"] == "CAC"


def test_primario_claro_no_deja_texto_ilegible():
    t = tema_pdf({"color_primario": "#FFE600"})
    assert t["sobre_primario"] == "#0E1334"
    assert contraste(t["primario_texto"], "#FFFFFF") >= 4.5


def test_secundario_casi_blanco_se_sustituye():
    t = tema_pdf({"color_primario": "#1e3a5f", "color_secundario": "#f0f4f8"})
    assert t["secundario"] != "#F0F4F8"
    assert contraste(t["secundario"], "#FFFFFF") > 1.6


def test_colores_invalidos_caen_al_defecto():
    t = tema_pdf({"color_primario": "rojo", "color_secundario": None})
    assert t["primario"].startswith("#") and len(t["primario"]) == 7


def test_preparar_html_inyecta_fuentes_marca_y_quita_google_fonts():
    html = (
        '<html><head><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue" rel="stylesheet">'
        "</head><body><p>hola</p></body></html>"
    )
    out = preparar_html(html, {"color_primario": "#c8102e", "nombre": "CAC"}, "Sesión")
    assert "fonts.googleapis.com" not in out
    assert "Schibsted Grotesk" in out
    assert "--k-primario:#C8102E" in out
    assert 'class="k-marca-agua"' in out
    assert out.index('class="k-marca-agua"') < out.index("<p>hola</p>")
