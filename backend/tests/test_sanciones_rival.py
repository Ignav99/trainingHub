"""Sancionados del rival para nuestro partido: cumplimiento, apercibidos y comité pendiente."""

from datetime import date, timedelta

from app.services.sanciones_rival_service import (
    PartidoRival,
    calcular_sanciones_partido,
    ordinal_amonestacion,
    partidos_suspension,
    suspension_temporal,
    viernes_comite,
)

J1 = date(2026, 9, 13)


def _domingo(j: int) -> date:
    return J1 + timedelta(days=7 * (j - 1))


def _partidos(jugados: range, aplazados: tuple = ()) -> list[PartidoRival]:
    return [
        PartidoRival(jornada=j, fecha=_domingo(j), jugado=j not in aplazados)
        for j in jugados
    ]


def _s(nombre, jornada, descripcion, categoria="jugador", articulo="112"):
    return {
        "persona_nombre": nombre,
        "jornada_numero": jornada,
        "descripcion": descripcion,
        "categoria": categoria,
        "articulo": articulo,
    }


SUSP = "{n} Partidos de suspensión y multa accesoria al club por agredir a otro  ({n} partidos)"


def _calc(sanciones, jugados=range(1, 9), objetivo=9, comite=None, hoy=None, **kw):
    comite = set(range(1, 9)) if comite is None else comite
    return calcular_sanciones_partido(
        sanciones,
        comite,
        kw.pop("partidos", None) or _partidos(jugados),
        jornada_objetivo=objetivo,
        fecha_partido=_domingo(objetivo),
        hoy=hoy or _domingo(objetivo) - timedelta(days=1),
        **kw,
    )


def test_parsers():
    assert partidos_suspension(SUSP.format(n=4)) == 4
    assert partidos_suspension("1 Partido de suspensión y multa accesoria ... (1 partido)") == 1
    assert partidos_suspension("SUSPENSION POR UN PARTIDO") == 1
    assert partidos_suspension("Multa al club por incidentes de público en un partido") is None
    assert ordinal_amonestacion("Cuarta amonestación") == 4
    assert ordinal_amonestacion("Décima amonestación") == 10
    assert ordinal_amonestacion("1 Partido de suspensión por doble amonestación") is None
    assert suspension_temporal("Suspensión de dos meses por agresión al árbitro") == (2, "meses")
    assert viernes_comite(date(2026, 11, 8)) == date(2026, 11, 6)


def test_cuatro_partidos_hace_tres_jornadas_lleva_tres_cumplidos():
    r = _calc([_s("GARCIA, PEPE", 5, SUSP.format(n=4), articulo="99.1")])
    [s] = r["sancionados"]
    assert (s["partidos_total"], s["cumplidos"], s["pendientes"]) == (4, 3, 1)
    assert s["sanciones"][0]["cumplidos_en"] == [6, 7, 8]
    assert r["comite"]["estado"] == "publicado"


def test_suspensiones_del_mismo_dia_se_suman():
    r = _calc([
        _s("SANCHEZ, DANIEL", 8, "1 Partido de suspensión por doble amonestación y consiguiente expulsión (1 partido)", articulo="115"),
        _s("SANCHEZ, DANIEL", 8, "1 Partido de suspensión por incumplir la obligación de los expulsados", articulo="116.3"),
    ])
    [s] = r["sancionados"]
    assert (s["partidos_total"], s["cumplidos"], s["pendientes"]) == (2, 0, 2)


def test_cumplida_no_es_baja_y_sale_en_recientes():
    r = _calc([_s("RUIZ, LUIS", 6, SUSP.format(n=2))])
    assert r["sancionados"] == []
    assert r["cumplidas_recientes"][0]["nombre"] == "RUIZ, LUIS"


def test_aplazado_no_cuenta_como_cumplido():
    partidos = _partidos(range(1, 9), aplazados=(7,))
    r = _calc([_s("GARCIA, PEPE", 5, SUSP.format(n=4))], partidos=partidos)
    s = r["sancionados"][0]
    assert (s["cumplidos"], s["pendientes"]) == (2, 2)
    assert any("J7" in a for a in r["avisos"])


def test_sanciones_posteriores_a_nuestro_partido_no_cuentan():
    r = _calc([_s("GARCIA, PEPE", 9, SUSP.format(n=3))])
    assert r["sancionados"] == []


def test_apercibido_y_quinta_amarilla_deducida():
    r = _calc([
        _s("LUNA, LUIS", 7, "Cuarta amonestación"),
        _s("PEREZ, ALVARO", 8, "Quinta amonestación"),
    ])
    assert [a["nombre"] for a in r["apercibidos"]] == ["LUNA, LUIS"]
    [s] = r["sancionados"]
    assert s["nombre"] == "PEREZ, ALVARO" and s["pendientes"] == 1
    assert s["sanciones"][0]["deducida"] is True


def test_quinta_con_acumulacion_explicita_no_duplica():
    r = _calc([
        _s("PEREZ, ALVARO", 8, "Quinta amonestación"),
        _s("PEREZ, ALVARO", 8, "1 Partido de suspensión por acumulación de amonestaciones (1 partido)"),
    ])
    assert r["sancionados"][0]["partidos_total"] == 1


def test_comite_pendiente_usa_el_acta_como_provisional():
    acta = [
        {"tipo": "roja", "jugador": "REY, MANUEL"},
        {"tipo": "amarilla", "jugador": "VEGA, JOSE"},
        {"tipo": "roja", "jugador": "VEGA, JOSE"},
        {"tipo": "amarilla", "jugador": "LUNA, LUIS"},
    ]
    r = _calc(
        [_s("LUNA, LUIS", 6, "Cuarta amonestación")],
        comite=set(range(1, 8)),
        hoy=_domingo(9) - timedelta(days=4),
        tarjetas_ultimo_acta=acta,
    )
    assert r["comite"] == {"estado": "pendiente", "jornada": 8, "fecha_esperada": "2026-11-06"}
    tipos = {p["nombre"]: p["tipo"] for p in r["provisionales"]}
    assert tipos == {"REY, MANUEL": "roja", "VEGA, JOSE": "doble_amarilla", "LUNA, LUIS": "ciclo"}


def test_comite_retrasado_tras_el_viernes():
    r = _calc([], comite=set(range(1, 8)), hoy=_domingo(9) - timedelta(days=1))
    assert r["comite"]["estado"] == "retrasado"
    assert any("acta de la J8" in a for a in r["avisos"])


def test_comite_publicado_no_muestra_provisionales():
    r = _calc([], tarjetas_ultimo_acta=[{"tipo": "roja", "jugador": "REY, MANUEL"}])
    assert r["provisionales"] == []


def test_jornada_sin_comite_avisa():
    r = _calc([], comite={1, 2, 3, 5, 6, 7, 8})
    assert any("J4" in a for a in r["avisos"])


def test_partido_programado_antes_del_nuestro_cuenta_para_el_partido():
    partidos = _partidos(range(1, 8)) + [PartidoRival(jornada=8, fecha=_domingo(9) - timedelta(days=3), jugado=False)]
    r = _calc(
        [_s("GARCIA, PEPE", 6, SUSP.format(n=3))],
        partidos=partidos,
        comite=set(range(1, 8)),
        hoy=_domingo(9) - timedelta(days=4),
    )
    [s] = r["sancionados"]
    assert (s["cumplidos"], s["pendientes"], s["pendientes_para_partido"]) == (1, 2, 1)
    assert s["baja"] is True
    assert r["comite"]["estado"] == "faltan_partidos"
    assert r["comite"]["jornadas_por_jugar"] == [8]


def test_cumplira_antes_de_nuestro_partido_no_es_baja():
    partidos = _partidos(range(1, 8)) + [PartidoRival(jornada=8, fecha=_domingo(8), jugado=False)]
    r = _calc(
        [_s("GARCIA, PEPE", 7, SUSP.format(n=1))],
        partidos=partidos,
        comite=set(range(1, 8)),
        hoy=_domingo(8) - timedelta(days=2),
    )
    [s] = r["sancionados"]
    assert s["pendientes"] == 1 and s["pendientes_para_partido"] == 0 and s["baja"] is False


def test_sin_datos_no_rompe():
    r = calcular_sanciones_partido(
        [], set(), [], jornada_objetivo=None, fecha_partido=None, hoy=date(2026, 11, 4),
    )
    assert r["sin_datos"] is True
    assert r["comite"]["estado"] == "sin_partidos"
    assert r["sancionados"] == [] and r["apercibidos"] == []


def test_tecnicos_van_detras_de_jugadores():
    r = _calc([
        _s("HURTADO, MOISES", 8, SUSP.format(n=1), categoria="tecnico"),
        _s("GARCIA, PEPE", 8, SUSP.format(n=1)),
    ])
    assert [s["categoria"] for s in r["sancionados"]] == ["jugador", "tecnico"]


def test_suspension_por_meses_vigente():
    s = _s("TORRES, ANA", 3, "Suspensión de 3 meses por agresión al árbitro")
    s["reunion_fecha"] = "2026-10-01"
    r = _calc([s])
    assert r["sancionados"][0]["temporal"]["cantidad"] == 3
    s["reunion_fecha"] = "2026-06-01"
    assert _calc([s])["sancionados"] == []


def test_wrapper_con_bd_y_tarjetas_alineadas():
    from app.services import pre_match_service as pm
    from tests.fake_supabase import FakeSupabase

    rival = "C.D. EL PALMAR VEREDA REAL"
    comp = "c1"
    jornadas = [
        {"competicion_id": comp, "numero": j, "partidos": [{
            "local": rival if j % 2 else "OTRO", "visitante": "OTRO" if j % 2 else rival,
            "fecha": _domingo(j).strftime("%d-%m-%Y"), "goles_local": 1 if j < 9 else None,
        }]}
        for j in range(1, 10)
    ]
    sb = FakeSupabase({
        "rfef_sanciones": [
            {**_s("GAGO, JUAN", 5, SUSP.format(n=4)), "competicion_id": comp, "equipo_nombre": rival},
            {**_s("REINA, FRAN", 2, "Primera amonestación"), "competicion_id": comp, "equipo_nombre": rival},
            {**_s("OTRO, X", 8, SUSP.format(n=1)), "competicion_id": comp, "equipo_nombre": "OTRO"},
        ],
        "rfef_jornadas": jornadas,
        "rfef_actas": [],
    })
    informe = pm._get_sanciones_partido(sb, comp, rival, {"jornada": 9, "fecha": _domingo(9).isoformat()})
    [s] = informe["sancionados"]
    assert (s["nombre"], s["cumplidos"], s["pendientes"]) == ("GAGO, JUAN", 3, 1)
    assert informe["comite"]["estado"] == "publicado"

    tarjetas = {"jugadores": [
        {"nombre": "REINA, FRAN", "estado": "Sancionado", "amarillas_ciclo": 1, "amarillas": 1},
        {"nombre": "GAGO, JUAN", "estado": "OK", "amarillas_ciclo": 0, "amarillas": 0},
    ]}
    pm._alinear_tarjetas_con_partido(tarjetas, informe)
    estados = {j["nombre"]: j["estado"] for j in tarjetas["jugadores"]}
    assert estados == {"GAGO, JUAN": "Sancionado", "REINA, FRAN": "OK"}
