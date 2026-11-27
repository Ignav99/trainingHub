"""PDF de sesión: extendido (v2), reducido (cartel A4) y plegado (1 folio en paneles)."""
import asyncio

import pytest

from app.services import pdf_service as ps

ORG = {"nombre": "Club Test", "color_primario": "#1B5E3F"}
JM = {f"p{i}": {"nombre": f"N{i}", "apellidos": f"Ape{i} Dos", "dorsal": i} for i in range(1, 8)}


def _graf(n=6):
    els = [{"id": f"e{i}", "type": "player", "position": {"x": 60 + 40 * i, "y": 80 + 20 * i},
            "color": "#3B82F6", "label": str(i)} for i in range(n)]
    return {"pitchType": "half", "elements": els, "arrows": [], "zones": []}


def _tarea_sesion(i, fase="desarrollo_1"):
    return {
        "orden": i, "fase_sesion": fase,
        "tareas": {
            "titulo": f"Tarea {i}", "duracion_total": 10, "num_series": 1,
            "categorias_tarea": {"codigo": "RND", "nombre": "Rondos"},
            "desarrollo": f"Descripcion de la tarea {i} con detalle suficiente.",
            "reglas_tecnicas": [f"Norma tecnica {i}"], "reglas_tacticas": [f"Norma tactica {i}"],
            "reglas_psicologicas": [f"Norma psico {i}"],
            "reglas": f"Norma tecnica {i}\nVariante libre {i}",
            "material": ["balones", "Pelotas medicinales"] if i % 2 else ["petos"],
            "grafico_data": _graf(),
        },
    }


def _sesion(lanes=True):
    est = [{"id": "d1", "tipo": "desarrollo_1", "orden": 1}]
    if lanes:
        est.append({"id": "c", "tipo": "compensatorio", "orden": 2, "compensatorio": {"lanes": [
            {"id": "l1", "label": "Grupo A", "jugador_ids": ["p1", "p2", "p3"]},
            {"id": "l2", "label": "Grupo B", "jugador_ids": ["p4"]}]}})
    return {"titulo": "Sesion test", "fecha": "2026-11-27", "match_day": "MD-3",
            "objetivo_principal": "Objetivo de prueba", "estructura_fases": est,
            "equipos": {"nombre": "Senior", "categoria": "Senior"}}


def _tareas(n, lanes=True):
    out = [_tarea_sesion(i) for i in range(1, n + 1)]
    if lanes and n >= 3:
        out[-2]["fase_sesion"] = "compensatorio_1"
        out[-1]["fase_sesion"] = "compensatorio_2"
    return out


MARGEN = [{"nombre": "Pepe", "apellidos": "Lesion", "dorsal": 20, "objetivo": "Readaptacion",
           "tareas": [{"titulo": "Carrera suave", "duracion": 10}]}]


def _paginas(pdf: bytes) -> int:
    pypdf = pytest.importorskip("pypdf")
    import io
    return len(pypdf.PdfReader(io.BytesIO(pdf)).pages)


def _run(coro):
    return asyncio.run(coro)


def test_normas_de_provocacion_sin_duplicados():
    t = _tarea_sesion(1)["tareas"]
    grupos = dict(ps._normas_grupos(t))
    assert grupos["Técnicas"] == ["Norma tecnica 1"]
    assert grupos["Tácticas"] == ["Norma tactica 1"]
    assert grupos["Psicológicas"] == ["Norma psico 1"]
    # «reglas» ya repetía la norma técnica: solo queda la variante nueva
    assert grupos["Reglas y variantes"] == ["Variante libre 1"]


def test_board_nunca_falta_aunque_la_foto_sea_el_raster_inventado():
    b = ps._board_tarea({"grafico_data": _graf()}, "x")
    assert b["svg"].startswith("<svg") and not b["img"]
    vacio = ps._board_tarea({}, "y")
    assert vacio["svg"].startswith("<svg")  # campo vacío, no hueco


def test_layout_rejilla_cubre_todas_las_tareas():
    for n in (1, 3, 4, 7, 12, 13, 18):
        lay = ps._layout_rejilla(n, 120, 280)
        assert lay["rows"] * lay["cols"] >= n


@pytest.fixture
def html_capturado(monkeypatch):
    pytest.importorskip("jinja2")
    monkeypatch.setattr(ps, "html_a_pdf", lambda html, org, titulo="": html.encode("utf-8"))
    monkeypatch.setattr(ps, "_url_to_data_uri", lambda u: u)


def test_extendido_trae_todas_las_pizarras_descripcion_normas_y_material(html_capturado):
    n = 6
    html = _run(ps.generate_sesion_pdf_v2(
        _sesion(), _tareas(n), ORG, JM, margen_entrenamientos=MARGEN,
    )).decode()
    for i in range(1, n + 1):
        assert f"Descripcion de la tarea {i}" in html
        assert f"Norma psico {i}" in html and f"Norma tactica {i}" in html
    assert "Normas de provocación" in html
    assert "Material mínimo necesario" in html
    assert "Balones" in html and "Pelotas medicinales" in html and "Petos" in html
    # portada (n) + detalle (n) pizarras como SVG: ninguna falta
    assert html.count("<svg") >= 2 * n


def test_extendido_material_se_calcula_de_las_tareas_no_del_campo_manual(html_capturado):
    se = _sesion()
    se["materiales"] = ["campo manual que no debe salir"]
    html = _run(ps.generate_sesion_pdf_v2(se, _tareas(3), ORG, JM)).decode()
    assert "campo manual que no debe salir" not in html


def test_reducido_cartel_muestra_material_compensatorio_y_margen(html_capturado):
    html = _run(ps.generate_sesion_pdf_reducido(
        _sesion(), _tareas(6), ORG, jugadores_map=JM, margen_entrenamientos=MARGEN,
    )).decode()
    assert "Material mínimo necesario" in html and "Balones" in html
    assert "Compensatorio · Grupo A" in html and "Compensatorio · Grupo B" in html
    assert "Ape1" in html and "Al margen" in html and "Carrera suave" in html
    for i in range(1, 7):
        assert f"Tarea {i}" in html


def test_reducido_sin_compensatorio_no_pinta_la_franja(html_capturado):
    html = _run(ps.generate_sesion_pdf_reducido(_sesion(False), _tareas(4, False), ORG, jugadores_map=JM)).decode()
    assert "Compensatorio ·" not in html and "Al margen" not in html


@pytest.mark.parametrize("n", [1, 4, 6, 8, 12])
def test_reducido_y_plegado_son_exactamente_un_folio(n):
    pytest.importorskip("weasyprint")
    for gen in (ps.generate_sesion_pdf_reducido, ps.generate_sesion_pdf_plegado):
        pdf = _run(gen(_sesion(n >= 3), _tareas(n), ORG, jugadores_map=JM, margen_entrenamientos=MARGEN))
        assert pdf[:4] == b"%PDF"
        assert _paginas(pdf) == 1, (gen.__name__, n)


def test_plegado_usa_6_u_8_paneles_y_marca_los_dobleces(html_capturado):
    h4 = _run(ps.generate_sesion_pdf_plegado(_sesion(False), _tareas(4, False), ORG, jugadores_map=JM)).decode()
    h7 = _run(ps.generate_sesion_pdf_plegado(_sesion(), _tareas(7), ORG, jugadores_map=JM, margen_entrenamientos=MARGEN)).decode()
    assert "1 / 6" in h4 and "6 / 6" in h4 and "7 / 6" not in h4
    assert "1 / 8" in h7 and "8 / 8" in h7
    assert "doblar" in h7
    for i in range(1, 8):  # todas las tareas están en algún panel
        assert f"Tarea {i}" in h7
    assert "Compensatorio · Grupo A" in h7
