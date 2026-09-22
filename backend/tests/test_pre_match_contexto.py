"""Goal-context aggregation for the rival pre-match report."""

from app.services.pre_match_service import (
    _compute_contexto_stats,
    _get_clasificacion,
    _get_goleadores_rival,
    _goal_scored_by_rival,
    _goals_matching_marcador,
    _is_rival_local,
    _jornada_resultados_rival,
    _match_rival_name,
    _merge_historico_temporadas,
    _split_actas_by_temporada,
    _strict_liga_goals,
    _team_is_local,
)


class _Result:
    def __init__(self, data):
        self.data = data


class _Chain:
    def __init__(self, data):
        self.data = data

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def or_(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def in_(self, *args, **kwargs):
        return self

    def execute(self):
        return _Result(self.data)


class _FakeSupabase:
    def __init__(self, actas, jornadas=None):
        self.actas = actas
        self.jornadas = jornadas or []

    def table(self, name):
        if name == "rfef_actas":
            return _Chain(self.actas)
        if name == "rfef_jornadas":
            return _Chain(self.jornadas)
        return _Chain([])


def _acta_1_1(*, extra_foreign=False):
    acta = {
        "local_nombre": "C.D. Rival",
        "visitante_nombre": "U.D. Otro",
        "goles_local": 1,
        "goles_visitante": 1,
        "jornada_numero": 1,
        "titulares_local": [{"nombre": "Garcia"}, {"nombre": "Lopez"}],
        "suplentes_local": [],
        "titulares_visitante": [{"nombre": "Perez"}, {"nombre": "Ruiz"}],
        "suplentes_visitante": [],
        "goles": [
            {
                "minuto": 20,
                "jugador": "Garcia",
                "parcial_local": 1,
                "parcial_visitante": 0,
            },
            {
                "minuto": 70,
                "jugador": "Perez",
                "parcial_local": 1,
                "parcial_visitante": 1,
            },
        ],
    }
    if extra_foreign:
        # Own-goal / shared surname that used to be counted as a rival goal.
        acta["goles"].append({
            "minuto": 88,
            "jugador": "Garcia",
            "parcial_local": 1,
            "parcial_visitante": 1,
        })
    return acta


def test_parcials_win_over_scorer_name():
    rival = {"Garcia"}
    opponent = {"Perez"}
    own_goal = {
        "minuto": 70,
        "jugador": "Garcia",
        "parcial_local": 1,
        "parcial_visitante": 1,
    }
    scored = _goal_scored_by_rival(own_goal, rival, opponent, True, (1, 0))
    assert scored is False


def test_1_1_does_not_become_2_gf_1_gc():
    events = _goals_matching_marcador(
        _acta_1_1(extra_foreign=True)["goles"],
        True,
        {"garcia", "lopez"},
        {"perez", "ruiz"},
        1,
        1,
    )
    assert sum(1 for _, scored in events if scored) == 1
    assert sum(1 for _, scored in events if not scored) == 1


def test_contexto_jornada_1_empate_no_infla_goles():
    foreign = {
        "local_nombre": "Atletico Inventado",
        "visitante_nombre": "C.D. Ajeno",
        "goles_local": 1,
        "goles_visitante": 0,
        "jornada_numero": 2,
        "titulares_local": [{"nombre": "X"}],
        "titulares_visitante": [{"nombre": "Y"}],
        "suplentes_local": [],
        "suplentes_visitante": [],
        "goles": [
            {"minuto": 10, "jugador": "X", "parcial_local": 1, "parcial_visitante": 0},
        ],
    }
    supabase = _FakeSupabase([_acta_1_1(extra_foreign=True), foreign])
    clasificacion = {"gf": 2, "gc": 1, "ultimos_5": ["E"]}
    ctx = _compute_contexto_stats(supabase, "comp-1", "C.D. Rival", clasificacion=clasificacion)
    assert ctx is not None
    assert ctx["liga"]["gf"] == 1
    assert ctx["liga"]["gc"] == 1
    assert ctx["casa"]["gf"] == 1
    assert ctx["casa"]["gc"] == 1
    assert ctx["casa"]["pj"] == 1
    assert ctx["fuera"]["pj"] == 0
    assert ctx["mitades"]["marcados_1t"] == 1
    assert ctx["mitades"]["marcados_2t"] == 0
    assert ctx["mitades"]["encajados_2t"] == 1
    assert ctx["actas_analizadas"] == 1


def test_skip_acta_when_rival_side_unknown():
    unknown = {
        "local_nombre": "",
        "visitante_nombre": "",
        "goles_local": 2,
        "goles_visitante": 1,
        "titulares_local": [{"nombre": "A"}],
        "titulares_visitante": [{"nombre": "B"}],
        "suplentes_local": [],
        "suplentes_visitante": [],
        "goles": [
            {"minuto": 15, "jugador": "A", "parcial_local": 1, "parcial_visitante": 0},
            {"minuto": 40, "jugador": "A", "parcial_local": 2, "parcial_visitante": 0},
            {"minuto": 80, "jugador": "B", "parcial_local": 2, "parcial_visitante": 1},
        ],
    }
    supabase = _FakeSupabase([_acta_1_1(), unknown])
    ctx = _compute_contexto_stats(supabase, "comp-1", "C.D. Rival")
    assert ctx["liga"]["gf"] == 1
    assert ctx["liga"]["gc"] == 1
    assert ctx["mitades"]["marcados_1t"] + ctx["mitades"]["marcados_2t"] == 1


def test_clasificacion_prefers_exact_team_name():
    comp = {
        "clasificacion": [
            {"equipo": "C.D. Rival B", "gf": 2, "gc": 1, "pj": 1},
            {"equipo": "C.D. Rival", "gf": 1, "gc": 1, "pj": 1},
        ]
    }
    standing = _get_clasificacion(comp, "C.D. Rival")
    assert standing["gf"] == 1
    assert standing["gc"] == 1


def test_is_rival_local_exact_name_wins():
    acta = {
        "local_nombre": "San Vicente",
        "visitante_nombre": "San Vicente B",
    }
    assert _is_rival_local(acta, "San Vicente") is True
    assert _is_rival_local(acta, "San Vicente B") is False


def test_match_does_not_confuse_filial_or_substring():
    assert _match_rival_name("San Vicente", "San Vicente B") is False
    assert _match_rival_name("San Vicente B", "C.D. San Vicente") is False
    assert _match_rival_name("C.D. Alcoy", "C.D. Alcoyano") is False
    assert _match_rival_name("U.D. Almería", "Almería") is True
    assert _match_rival_name("C.D. Mirandés", "Mirandés") is True


def test_contexto_skips_user_club_actas():
    user_home = {
        "local_nombre": "C.D. Usuario",
        "visitante_nombre": "U.D. Otro",
        "goles_local": 4,
        "goles_visitante": 0,
        "jornada_numero": 1,
        "titulares_local": [{"nombre": "Nuestro9"}],
        "titulares_visitante": [{"nombre": "Ajeno"}],
        "suplentes_local": [],
        "suplentes_visitante": [],
        "goles": [
            {"minuto": 10, "jugador": "Nuestro9", "parcial_local": 1, "parcial_visitante": 0},
            {"minuto": 20, "jugador": "Nuestro9", "parcial_local": 2, "parcial_visitante": 0},
            {"minuto": 30, "jugador": "Nuestro9", "parcial_local": 3, "parcial_visitante": 0},
            {"minuto": 40, "jugador": "Nuestro9", "parcial_local": 4, "parcial_visitante": 0},
        ],
    }
    rival_away = {
        "local_nombre": "Atletico Inventado",
        "visitante_nombre": "C.D. Rival",
        "goles_local": 0,
        "goles_visitante": 1,
        "jornada_numero": 2,
        "titulares_local": [{"nombre": "X"}],
        "titulares_visitante": [{"nombre": "Garcia"}],
        "suplentes_local": [],
        "suplentes_visitante": [],
        "goles": [
            {"minuto": 55, "jugador": "Garcia", "parcial_local": 0, "parcial_visitante": 1},
        ],
    }
    supabase = _FakeSupabase([user_home, rival_away, _acta_1_1()])
    ctx = _compute_contexto_stats(
        supabase, "comp-1", "C.D. Rival",
        clasificacion={"gf": 2, "gc": 1, "ultimos_5": ["V", "E"]},
        mi_equipo="C.D. Usuario",
    )
    assert ctx is not None
    assert ctx["liga"]["gf"] == 2
    assert ctx["liga"]["gc"] == 1
    assert ctx["actas_analizadas"] == 2
    assert ctx["casa"]["pj"] == 1
    assert ctx["fuera"]["pj"] == 1
    assert ctx["datos_minuto_disponibles"] is True


def test_clasificacion_skips_user_club_row():
    comp = {
        "clasificacion": [
            {"equipo": "C.D. Usuario", "gf": 12, "gc": 2, "pj": 4, "ultimos_5": ["V", "V", "V", "V"]},
            {"equipo": "C.D. Rival", "gf": 3, "gc": 3, "pj": 4, "ultimos_5": ["E", "D"]},
        ]
    }
    standing = _get_clasificacion(comp, "C.D. Rival", mi_equipo="C.D. Usuario")
    assert standing["gf"] == 3
    assert standing["ultimos_5"] == ["E", "D"]


def test_goleadores_are_rival_not_user_club():
    comp = {
        "goleadores": [
            {"jugador": "Nuestro9", "goles": 8, "equipo": "C.D. Usuario"},
            {"jugador": "Garcia", "goles": 2, "equipo": "C.D. Rival"},
        ]
    }
    scorers = _get_goleadores_rival(comp, "C.D. Rival", mi_equipo="C.D. Usuario")
    assert [s["jugador"] for s in scorers] == ["Garcia"]


def test_minutes_without_parcials_still_dump():
    goles = [
        {"minuto": "20'", "jugador": "Garcia López"},
        {"minuto": "70", "jugador": "Perez"},
    ]
    events = _goals_matching_marcador(
        goles, True, {"garcia lopez", "lopez"}, {"perez", "ruiz"}, 1, 1,
    )
    assert [(m, scored) for m, scored in events] == [(20, True), (70, False)]


def test_minutes_added_time_and_string_fields():
    goles = [
        {"minuto": "45+2", "jugador": "Garcia", "parcial_local": 1, "parcial_visitante": 0},
        {"jugador": "Perez (90+4')", "parcial_local": 1, "parcial_visitante": 1},
    ]
    events = _goals_matching_marcador(
        goles, True, {"garcia"}, {"perez"}, 1, 1,
    )
    assert [m for m, _ in events] == [47, 94]


def test_contexto_minutes_from_actas_like_competition():
    acta = {
        "local_nombre": "C.D. Rival",
        "visitante_nombre": "U.D. Otro",
        "goles_local": 1,
        "goles_visitante": 0,
        "jornada_numero": 3,
        "titulares_local": [{"nombre": "GARCIA LOPEZ"}],
        "titulares_visitante": [{"nombre": "Perez"}],
        "suplentes_local": [],
        "suplentes_visitante": [],
        "goles": [
            {"minuto": "16'", "jugador": "Garcia"},
        ],
    }
    ctx = _compute_contexto_stats(_FakeSupabase([acta]), "comp-1", "C.D. Rival")
    assert ctx["datos_minuto_disponibles"] is True
    assert ctx["actas_con_goles_minuto"] == 1
    assert ctx["goles_por_minuto"]["marcados"][1] == 1  # 16-30 bucket
    assert ctx["mitades"]["marcados_1t"] == 1


def test_liga_gf_never_exceeds_clasificacion():
    extra = {
        "local_nombre": "C.D. Rival",
        "visitante_nombre": "U.D. Fantasma",
        "goles_local": 1,
        "goles_visitante": 0,
        "jornada_numero": 34,
        "cod_acta": "old-34",
        "fecha": "2025-05-18",
        "titulares_local": [{"nombre": "Garcia"}],
        "titulares_visitante": [{"nombre": "Z"}],
        "suplentes_local": [],
        "suplentes_visitante": [],
        "goles": [
            {"minuto": 10, "jugador": "Garcia", "parcial_local": 1, "parcial_visitante": 0},
        ],
    }
    supabase = _FakeSupabase([_acta_1_1(), extra])
    ctx = _compute_contexto_stats(
        supabase, "comp-1", "C.D. Rival",
        clasificacion={"gf": 1, "gc": 1, "pj": 1, "ultimos_5": ["E"]},
    )
    assert ctx["liga"]["gf"] == 1
    assert ctx["liga"]["gc"] == 1


def test_strict_liga_goals_caps_plus_one():
    gf, gc = _strict_liga_goals(2, 1, 2, {"gf": 1, "gc": 1, "pj": 1})
    assert gf == 1
    assert gc == 1


def test_split_actas_keeps_current_season_only():
    current = {
        "cod_acta": "curr-1",
        "fecha": "2026-09-07",
        "jornada_numero": 1,
        "local_nombre": "C.D. Rival",
        "visitante_nombre": "U.D. Otro",
        "goles_local": 1,
        "goles_visitante": 1,
    }
    leftover = {
        "cod_acta": "old-1",
        "fecha": "2025-09-08",
        "jornada_numero": 1,
        "local_nombre": "C.D. Rival",
        "visitante_nombre": "U.D. Otro",
        "goles_local": 3,
        "goles_visitante": 0,
    }
    now, hist = _split_actas_by_temporada(
        [current, leftover], "22", current_cod_actas={"curr-1"},
    )
    assert [a["cod_acta"] for a in now] == ["curr-1"]
    assert [a["cod_acta"] for a in hist.get("21", [])] == ["old-1"]


def test_contexto_drops_last_season_acta():
    current = {
        **_acta_1_1(),
        "cod_acta": "curr-1",
        "fecha": "2026-09-07",
    }
    leftover = {
        "local_nombre": "C.D. Rival",
        "visitante_nombre": "U.D. Otro",
        "goles_local": 3,
        "goles_visitante": 0,
        "jornada_numero": 1,
        "cod_acta": "old-1",
        "fecha": "2025-09-08",
        "titulares_local": [{"nombre": "Garcia"}],
        "titulares_visitante": [{"nombre": "Perez"}],
        "suplentes_local": [],
        "suplentes_visitante": [],
        "goles": [
            {"minuto": 10, "jugador": "Garcia", "parcial_local": 1, "parcial_visitante": 0},
            {"minuto": 20, "jugador": "Garcia", "parcial_local": 2, "parcial_visitante": 0},
            {"minuto": 30, "jugador": "Garcia", "parcial_local": 3, "parcial_visitante": 0},
        ],
    }
    jornadas = [{
        "numero": 1,
        "partidos": [{
            "local": "C.D. Rival",
            "visitante": "U.D. Otro",
            "cod_acta": "curr-1",
            "goles_local": 1,
            "goles_visitante": 1,
        }],
    }]
    supabase = _FakeSupabase([current, leftover], jornadas=jornadas)
    ctx = _compute_contexto_stats(
        supabase, "comp-1", "C.D. Rival",
        clasificacion={"gf": 1, "gc": 1, "pj": 1, "ultimos_5": ["E"]},
        temporada_code="22",
    )
    assert ctx is not None
    assert ctx["actas_analizadas"] == 1
    assert ctx["liga"]["gf"] == 1
    assert ctx["liga"]["gc"] == 1
    assert ctx["casa"]["gf"] == 1
    assert ctx["casa"]["pj"] == 1


def test_team_is_local_uses_calendar_names():
    assert _team_is_local("C.D. Calavera", "C.D. Rival", "C.D. Calavera") is False
    assert _team_is_local("C.D. Calavera", "C.D. Calavera", "U.D. Otro") is True


def test_contexto_calavera_away_win_then_home_draw():
    """Actas list the rival as local both times; calendar has away 1-3 then home 0-0.

    Casa must be the 0-0, fuera the 3 GF / 1 GC, liga 3-1. Minutes stay on
    the acta POV so the three first-half goals are still counted as scored.
    """
    away_as_local = {
        "local_nombre": "C.D. Calavera",
        "visitante_nombre": "Atletico Inventado",
        "goles_local": 3,
        "goles_visitante": 1,
        "jornada_numero": 1,
        "cod_acta": "j1",
        "fecha": "2026-09-07",
        "titulares_local": [{"nombre": "Garcia"}, {"nombre": "Lopez"}],
        "suplentes_local": [],
        "titulares_visitante": [{"nombre": "Perez"}, {"nombre": "Ruiz"}],
        "suplentes_visitante": [],
        "goles": [
            {"minuto": 10, "jugador": "Garcia", "parcial_local": 1, "parcial_visitante": 0},
            {"minuto": 20, "jugador": "Garcia", "parcial_local": 2, "parcial_visitante": 0},
            {"minuto": 30, "jugador": "Lopez", "parcial_local": 3, "parcial_visitante": 0},
            {"minuto": 70, "jugador": "Perez", "parcial_local": 3, "parcial_visitante": 1},
        ],
    }
    home_draw = {
        "local_nombre": "C.D. Calavera",
        "visitante_nombre": "U.D. Otro",
        "goles_local": 0,
        "goles_visitante": 0,
        "jornada_numero": 2,
        "cod_acta": "j2",
        "fecha": "2026-09-14",
        "titulares_local": [{"nombre": "Garcia"}],
        "suplentes_local": [],
        "titulares_visitante": [{"nombre": "Perez"}],
        "suplentes_visitante": [],
        "goles": [],
    }
    leftover = {
        "local_nombre": "C.D. Calavera",
        "visitante_nombre": "U.D. Fantasma",
        "goles_local": 1,
        "goles_visitante": 0,
        "jornada_numero": 1,
        "cod_acta": "old-1",
        "fecha": "2025-09-08",
        "titulares_local": [{"nombre": "Garcia"}],
        "titulares_visitante": [{"nombre": "Z"}],
        "suplentes_local": [],
        "suplentes_visitante": [],
        "goles": [
            {"minuto": 12, "jugador": "Garcia", "parcial_local": 1, "parcial_visitante": 0},
        ],
    }
    jornadas = [
        {
            "numero": 1,
            "partidos": [{
                "local": "Atletico Inventado",
                "visitante": "C.D. Calavera",
                "cod_acta": "j1",
                "goles_local": 1,
                "goles_visitante": 3,
            }],
        },
        {
            "numero": 2,
            "partidos": [{
                "local": "C.D. Calavera",
                "visitante": "U.D. Otro",
                "cod_acta": "j2",
                "goles_local": 0,
                "goles_visitante": 0,
            }],
        },
    ]
    clasificacion = {
        "gf": 3, "gc": 1, "pj": 2,
        "pg_casa": 0, "pe_casa": 1, "pp_casa": 0,
        "pg_fuera": 1, "pe_fuera": 0, "pp_fuera": 0,
        "ultimos_5": ["V", "E"],
    }
    supabase = _FakeSupabase(
        [away_as_local, home_draw, leftover], jornadas=jornadas,
    )
    ctx = _compute_contexto_stats(
        supabase, "comp-1", "C.D. Calavera",
        clasificacion=clasificacion,
        temporada_code="22",
    )
    assert ctx is not None
    assert ctx["casa"]["pj"] == 1
    assert ctx["casa"]["gf"] == 0
    assert ctx["casa"]["gc"] == 0
    assert ctx["casa"]["pe"] == 1
    assert ctx["casa"]["pg"] == 0
    assert ctx["casa"]["pct_victoria"] == 0
    assert ctx["fuera"]["pj"] == 1
    assert ctx["fuera"]["gf"] == 3
    assert ctx["fuera"]["gc"] == 1
    assert ctx["fuera"]["pg"] == 1
    assert ctx["fuera"]["pct_victoria"] == 100
    assert ctx["liga"]["gf"] == 3
    assert ctx["liga"]["gc"] == 1
    assert ctx["liga"]["media_gf"] == 1.5
    assert ctx["liga"]["media_gc"] == 0.5
    assert ctx["mitades"]["marcados_1t"] == 3
    assert ctx["mitades"]["marcados_2t"] == 0
    assert ctx["mitades"]["encajados_2t"] == 1
    assert ctx["goles_por_minuto"]["marcados"][0] == 1  # 0-15
    assert ctx["goles_por_minuto"]["marcados"][1] == 2  # 16-30
    results = _jornada_resultados_rival(supabase, "comp-1", "C.D. Calavera")
    assert [(r["is_local"], r["gf"], r["gc"]) for r in results] == [
        (False, 3, 1),
        (True, 0, 0),
    ]


def test_historico_keeps_last_season_on_the_rival():
    leftover = {
        "local_nombre": "C.D. Rival",
        "visitante_nombre": "U.D. Otro",
        "goles_local": 3,
        "goles_visitante": 1,
        "jornada_numero": 1,
        "cod_acta": "old-1",
        "fecha": "2025-09-08",
        "titulares_local": [{"nombre": "Garcia"}],
        "titulares_visitante": [{"nombre": "Perez"}],
        "suplentes_local": [],
        "suplentes_visitante": [],
        "goles": [],
    }
    hist = _merge_historico_temporadas(
        {}, {"21": [leftover]}, "C.D. Rival", None,
    )
    assert hist["21"]["label"] == "2025-2026"
    assert hist["21"]["contexto_stats"]["liga"]["gf"] == 3
    assert hist["21"]["contexto_stats"]["liga"]["gc"] == 1
    assert hist["21"]["contexto_stats"]["casa"]["pj"] == 1
