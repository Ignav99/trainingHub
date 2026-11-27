"""PDF de sesión: extendido (v2), reducido (cartel A4) y plegado (1 folio en paneles)."""
import asyncio
import re

import pytest

from app.services import pdf_service as ps

ORG = {"nombre": "Club Test", "color_primario": "#1B5E3F"}
JM = {f"p{i}": {"nombre": f"N{i}", "apellidos": f"Ape{i} Dos", "dorsal": i} for i in range(1, 8)}


def _graf(n=6, pitch="half"):
    els = [{"id": f"e{i}", "type": "player", "position": {"x": 60 + 40 * i, "y": 80 + 20 * i},
            "color": "#3B82F6", "label": str(i)} for i in range(n)]
    return {"pitchType": pitch, "elements": els, "arrows": [], "zones": []}


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
            "grafico_data": _graf(pitch=["full", "half", "custom"][i % 3]),  # apaisado, medio, vertical
            "como_inicia": f"Inicia {i}", "como_finaliza": f"Finaliza {i}", "forma_puntuar": f"Puntua {i}",
            "anotaciones": f"Anotacion {i}", "tags": ["rondo"], "progresiones": [f"Progresion {i}"],
            "regresiones": [f"Regresion {i}"], "consignas_ofensivas": [f"Consigna of {i}"],
            "errores_comunes": [f"Error {i}"], "objetivos_tacticos": ["salida_balon"],
            "principio_tactico": "Conservacion", "tiempo_descanso": 60, "dificultad": 3,
            "complejidad": f"Regla exigencia {i}", "posicion_entrenador": "Banda",
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


def _foto(w, h):
    import base64
    import io
    from PIL import Image
    b = io.BytesIO()
    Image.new("RGB", (w, h), (90, 170, 215)).save(b, "JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()


def test_pizarra_conserva_la_orientacion_guardada():
    vb = lambda pt: re.search(r'viewBox="0 0 (\d+) (\d+)"', ps._svg_pizarra({"pitchType": pt}, "o")[0]).groups()  # noqa: E731
    assert vb("full") == ("1050", "680")      # campo entero apaisado
    assert vb("half") == ("680", "525")       # medio campo
    assert vb("custom") == ("680", "1050")    # campo entero vertical (como el editor)
    assert ps._svg_pizarra({}, "o")[2] == "full"  # sin pitchType = full, como TacticalBoardMini


def test_encaja_no_deforma_vertical_usa_alto_apaisada_usa_ancho():
    vert = ps._encaja({"ratio": 680 / 1050}, 70, 36)
    assert vert["h"] == 36 and vert["w"] < 36 and abs(vert["w"] / vert["h"] - 680 / 1050) < .01
    horiz = ps._encaja({"ratio": 1050 / 680}, 70, 60)
    assert horiz["w"] == 70 and horiz["h"] < 60 and horiz["top"] > 0
    assert abs(horiz["w"] / horiz["h"] - 1050 / 680) < .01


def test_foto_vertical_y_apaisada_mantienen_su_proporcion():
    v = ps._board_tarea({"grafico_data": {"preview": _foto(700, 1000)}}, "a")
    h = ps._board_tarea({"grafico_data": {"preview": _foto(1080, 699)}}, "b")
    assert v["img"] and abs(v["ratio"] - 0.7) < .01
    assert h["img"] and abs(h["ratio"] - 1080 / 699) < .01


def test_asistentes_todos_presentes_salvo_bajas_margen_y_fisio():
    r = [
        {"dorsal": 1, "nombre": "A", "apellidos": "Uno", "tipos": ["sesion"], "sort_key": "sesion"},
        {"dorsal": 2, "nombre": "B", "apellidos": "Dos", "tipos": ["sesion", "fisio"], "sort_key": "sesion"},
        {"dorsal": 3, "nombre": "C", "apellidos": "Tres", "tipos": ["margen"], "sort_key": "margen"},
        {"dorsal": 4, "nombre": "D", "apellidos": "Cuatro", "tipos": [], "sort_key": "ausente"},
        {"dorsal": 5, "nombre": "E", "apellidos": "Cinco", "tipos": ["fisio", "margen"], "sort_key": "fisio"},
    ]
    a = ps._asistentes(r)
    assert a["en_sesion"] == 1 and a["total"] == 5
    assert [p["dorsal"] for p in a["bajas"]] == [4]
    assert sorted(p["dorsal"] for p in a["fisio"]) == [2, 5]   # baja > fisio > margen
    assert [p["dorsal"] for p in a["margen"]] == [3]
    assert ps._asistentes([])["hay"] is False


ROSTER = [
    {"dorsal": 1, "nombre": "A", "apellidos": "Uno", "tipos": ["sesion"], "sort_key": "sesion"},
    {"dorsal": 2, "nombre": "B", "apellidos": "Dos", "tipos": ["sesion", "fisio"], "sort_key": "sesion"},
    {"dorsal": 3, "nombre": "C", "apellidos": "Tres", "tipos": ["margen"], "sort_key": "margen"},
    {"dorsal": 4, "nombre": "D", "apellidos": "Cuatro", "tipos": [], "sort_key": "ausente"},
]


def test_franja_de_asistentes_arriba_en_las_tres_variantes(html_capturado):
    htmls = [
        _run(ps.generate_sesion_pdf_v2(_sesion(), _tareas(4), ORG, JM, asistencia_roster=ROSTER)).decode(),
        _run(ps.generate_sesion_pdf_reducido(_sesion(), _tareas(4), ORG, jugadores_map=JM, asistencia_roster=ROSTER)).decode(),
        _run(ps.generate_sesion_pdf_plegado(_sesion(), _tareas(4), ORG, jugadores_map=JM, asistencia_roster=ROSTER)).decode(),
    ]
    for html in htmls:
        assert "en sesión" in html and "Bajas" in html and "Margen" in html and "Fisio" in html
        assert "c-ficha-baja" in html


def test_extendido_ficha_completa_de_la_tarea(html_capturado):
    html = _run(ps.generate_sesion_pdf_v2(_sesion(), _tareas(3), ORG, JM)).decode()
    for i in range(1, 4):
        for txt in (f"Inicia {i}", f"Finaliza {i}", f"Puntua {i}", f"Anotacion {i}", f"Progresion {i}",
                    f"Regresion {i}", f"Consigna of {i}", f"Error {i}", f"Regla exigencia {i}"):
            assert txt in html, txt
    for txt in ("Descanso", "Dificultad", "Objetivos y situación de juego",
                "Reglas y consignas", "Variantes y progresiones", "Organización", "Notas", "rondo"):
        assert txt in html, txt


@pytest.mark.parametrize("n", [3, 7, 12])
def test_pizarras_verticales_y_apaisadas_caben_en_un_folio(n):
    pytest.importorskip("weasyprint")
    for gen in (ps.generate_sesion_pdf_reducido, ps.generate_sesion_pdf_plegado):
        pdf = _run(gen(_sesion(), _tareas(n), ORG, jugadores_map=JM, asistencia_roster=ROSTER, margen_entrenamientos=MARGEN))
        assert _paginas(pdf) == 1, (gen.__name__, n)


def test_material_petos_con_cantidad_maxima_entre_tareas(html_capturado):
    tareas = _tareas(3)
    tareas[0]["tareas"]["material"] = ["balones", "petos:8"]
    tareas[1]["tareas"]["material"] = ["petos:12", "conos"]
    tareas[2]["tareas"]["material"] = ["petos"]
    for fn, kw in ((ps.generate_sesion_pdf_v2, {}), (ps.generate_sesion_pdf_reducido, {"jugadores_map": JM})):
        html = _run(fn(_sesion(), tareas, ORG, **({"jugadores_map": JM} if kw else {"jugadores_map": JM}))).decode()
        assert "Petos (~12)" in html
        assert "petos:12" not in html  # nunca la entrada cruda
        assert "Petos (~12)" in html.split("Material mínimo necesario", 1)[1][:400]
