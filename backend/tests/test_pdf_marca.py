"""Papel Cal: colores del club calculados como clubTone.ts, contraste garantizado."""
from app.services.pdf_marca import contraste, preparar_html, tema_pdf


def test_tema_tine_neutros_con_el_tono_del_club():
    t = tema_pdf({"color_primario": "#c8102e", "nombre": "CAC"})
    assert t["club"] == "CAC"
    assert contraste(t["color_club"], "#FFFFFF") >= 4.5
    # tinta casi negra pero del tono del club (rojo)
    assert t["tinta"].startswith("#2") and contraste(t["tinta"], "#FFFFFF") > 12


def test_club_claro_se_oscurece_hasta_4_5():
    t = tema_pdf({"color_primario": "#FFE600"})
    assert contraste(t["color_club"], "#FFFFFF") >= 4.5


def test_colores_invalidos_caen_al_defecto():
    t = tema_pdf({"color_primario": "rojo", "color_secundario": None})
    assert t["color_club"].startswith("#") and len(t["color_club"]) == 7


def test_preparar_html_inyecta_papel_cal_y_quita_google_fonts():
    html = (
        '<html><head><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue" rel="stylesheet">'
        "</head><body><p>hola</p></body></html>"
    )
    out = preparar_html(html, {"color_primario": "#c8102e", "nombre": "CAC"}, "Sesión")
    assert "fonts.googleapis.com" not in out
    assert "Encode Sans" in out
    assert "--c-club:" in out and "--k-primario:" in out
    assert 'class="k-marca-agua"' in out
    assert out.index('class="k-marca-agua"') < out.index("<p>hola</p>")
