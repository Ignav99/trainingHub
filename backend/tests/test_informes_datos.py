from collections import Counter

from app.services.informes_datos import (
    bloque_contenido,
    cambios_anotador,
    carga_registro,
    duracion_partido,
    goles_por_tramo,
    minutos_disputados,
    resumen_resultados,
    tercios,
    tipos_de_partido,
    wellness_medias,
)


def test_goals_fall_in_fifteen_minute_bands_and_added_time_counts_in_the_last():
    tramos = goles_por_tramo([
        {"lado": "favor", "minuto": 0},
        {"lado": "favor", "minuto": 15},
        {"lado": "contra", "minuto": 16},
        {"lado": "contra", "minuto": 93},
    ])
    assert tramos[0] == {"tramo": "0-15", "favor": 2, "contra": 0}
    assert tramos[1]["contra"] == 1
    assert tramos[-1]["contra"] == 1


def test_fouls_split_into_thirds_of_the_painted_pitch():
    assert tercios([{"x": 5}, {"x": 51}, {"x": 52}, {"x": 99}, {"x": 145}, {"x": 150}, {"y": 3}]) == [2, 1, 3]


def test_goal_types_prefer_the_saved_counter_over_the_detail():
    goles = [{"lado": "contra", "tipo": "Córner"}]
    est = {"tipos_gol_contra": {"balon_espalda": 2, "corner": 0}}
    assert tipos_de_partido(est, "contra", goles) == Counter({"Balón a la espalda": 2})
    assert tipos_de_partido({}, "contra", goles) == Counter({"Córner": 1})


def test_minutes_share_uses_the_real_length_of_each_match():
    partidos = [{"id": "a"}, {"id": "b"}]
    convs = [
        {"partido_id": "a", "minutos_jugados": 96},
        {"partido_id": "a", "minutos_jugados": 30},
        {"partido_id": "b", "minutos_jugados": 80},
    ]
    assert duracion_partido([None, 12]) == 90
    assert minutos_disputados(partidos, convs) == 96 + 90


def test_substitutions_come_from_the_annotator_in_minute_order():
    notas = {"anotador": {"events": [
        {"type": "gol", "minute": 10},
        {"type": "cambio", "minute": 70, "convId": "out2", "relatedConvId": "in2"},
        {"type": "cambio", "minute": 46, "convId": "out1", "relatedConvId": "in1"},
    ]}}
    assert cambios_anotador(notas) == [
        {"minuto": 46, "sale": "out1", "entra": "in1"},
        {"minuto": 70, "sale": "out2", "entra": "in2"},
    ]


def test_results_summary_counts_points_and_clean_sheets():
    r = resumen_resultados([
        {"resultado": "victoria", "goles_favor": 2, "goles_contra": 0},
        {"resultado": "empate", "goles_favor": 1, "goles_contra": 1},
        {"resultado": "derrota", "goles_favor": 0, "goles_contra": 3},
    ])
    assert (r["pj"], r["pts"], r["gf"], r["gc"], r["dg"]) == (3, 4, 3, 4, -1)
    assert r["porteria_cero"] == 1 and r["sin_marcar"] == 1
    assert r["ppp"] == 1.33


def test_session_load_uses_saved_load_or_rpe_by_minutes():
    assert carga_registro({"carga_sesion": 420}) == 420
    assert carga_registro({"rpe": 6, "duracion_percibida": 70}) == 420
    assert carga_registro({"rpe": 6}) is None


def test_wellness_total_only_counts_complete_days():
    w = wellness_medias([
        {"sueno": 4, "fatiga": 3, "dolor": 4, "estres": 3, "humor": 4},
        {"sueno": 2},
    ])
    assert w["total"] == 18 and w["n"] == 1
    assert w["sueno"] == 3


def test_training_content_groups_by_phase_of_play_then_session_stage():
    assert bloque_contenido("ataque_organizado", "desarrollo_1") == "Ataque organizado"
    assert bloque_contenido(None, "activacion") == "Activación"
    assert bloque_contenido("", "compensatorio_2") == "Compensatorio"
    assert bloque_contenido(None, "desarrollo_2") == "Sin fase de juego"
