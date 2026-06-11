# -*- coding: utf-8 -*-
"""Planificador determinista de la temporada CD Atlántico 2025/26.

Precalcula TODA la temporada en memoria (alineaciones, minutos, goleadores,
tarjetas, sanciones, bajas por lesión, sesiones, RPE) antes de tocar la API.
test_coherence.py valida los invariantes sobre esta estructura.
"""
import random
from datetime import date, timedelta

import season_data as D

RNG = random.Random(42)

KEYS = [p["key"] for p in D.PLAYERS]
P = {p["key"]: p for p in D.PLAYERS}
GKS = [k for k in KEYS if P[k]["posicion_principal"] == "POR"]
FIELD = [k for k in KEYS if P[k]["posicion_principal"] != "POR"]

# Suplentes preferidos por posición del once base
BENCH_ROTATION = ["echarri", "pineda", "ferreiro", "sarria", "casals",
                  "larralde", "outeiro", "cuevas", "aranda", "campos"]

SUB_PLAN = [(70, 20), (65, 25), (60, 30), (75, 15)]  # (min titular, min suplente)


def _iso(d):
    return d.isoformat()


def jornada_dates():
    """34 domingos desde el 7-sep, saltando el parón navideño."""
    dates, d = [], date(2025, 9, 7)
    brk_a, brk_b = (date.fromisoformat(x) for x in D.WINTER_BREAK)
    while len(dates) < 34:
        if not (brk_a <= d <= brk_b):
            dates.append(d)
        d += timedelta(days=7)
    return dates


def injury_window(inj):
    start = date.fromisoformat(inj["fecha_inicio"])
    end = date.fromisoformat(inj["fecha_alta"]) if inj["fecha_alta"] else date(2026, 6, 30)
    return start, end


def is_injured(key, on_date):
    for inj in D.INJURIES:
        if inj["player"] != key:
            continue
        if inj["player"] == "aranda" and inj["titulo"].startswith("Pubalgia"):
            continue  # gestión de carga: sigue disponible con minutos limitados
        a, b = injury_window(inj)
        if a <= on_date <= b:
            return True
    return False


def aranda_capped(on_date):
    inj = next(i for i in D.INJURIES if i["player"] == "aranda")
    a, b = injury_window(inj)
    return a <= on_date <= b


def build_match(match_date, gf, gc, available, red_key=None, yellow_state=None,
                competicion="liga", jornada=None):
    """Construye convocatoria coherente: 11 titulares + 5 suplentes, 990 min."""
    gk = next(k for k in GKS if k in available)
    xi = [gk]
    for k in D.BASE_XI[1:]:
        if k in available and len(xi) < 11:
            xi.append(k)
    for k in BENCH_ROTATION + FIELD:
        if len(xi) >= 11:
            break
        if k in available and k not in xi:
            xi.append(k)
    bench_pool = [k for k in available if k not in xi]
    bench_gk = next((k for k in bench_pool if k in GKS), None)
    bench_field = [k for k in bench_pool if k not in GKS]
    RNG.shuffle(bench_field)
    bench = ([bench_gk] if bench_gk else []) + bench_field
    bench = bench[:7]

    minutes = {k: 90 for k in xi}
    subs_used = []
    # 4 cambios: titulares de campo salen, suplentes de campo entran
    # (el expulsado nunca es candidato a cambio: sale del campo, no del banquillo)
    field_starters = [k for k in xi if k not in GKS and k != red_key]
    sub_candidates = [k for k in bench if k not in GKS]
    n_subs = min(4, len(sub_candidates))
    outs = RNG.sample(field_starters, n_subs)
    for i in range(n_subs):
        mt, ms = SUB_PLAN[i]
        out_k, in_k = outs[i], sub_candidates[i]
        # Aranda con pubalgia: máximo 60 minutos
        if aranda_capped(match_date) and out_k == "aranda":
            mt, ms = 55, 35
        minutes[out_k] = mt
        minutes[in_k] = ms
        subs_used.append(in_k)
    if aranda_capped(match_date) and "aranda" in minutes and minutes["aranda"] > 60:
        # titular no sustituido: forzar cambio extra dentro del plan
        spare = next((k for k in sub_candidates if k not in subs_used), None)
        if spare:
            minutes["aranda"], minutes[spare] = 60, 30
            subs_used.append(spare)

    # Roja directa diseñada: minutos truncados y sin reemplazo
    red_minute = None
    if red_key and red_key in minutes:
        red_minute = RNG.randint(48, 72)
        delta = minutes[red_key] - red_minute
        minutes[red_key] = red_minute
        # el equipo juega con 10: nadie recupera esos minutos

    on_pitch = [k for k, m in minutes.items() if m > 0]

    # Goles y asistencias entre jugadores en el campo
    weights = {k: D.SCORER_WEIGHTS.get(k, 0.6) for k in on_pitch if k not in GKS}
    goals, assists = {}, {}
    for _ in range(gf):
        ks, ws = zip(*weights.items())
        scorer = RNG.choices(ks, weights=ws)[0]
        goals[scorer] = goals.get(scorer, 0) + 1
        if RNG.random() < 0.7:
            others = [k for k in on_pitch if k != scorer and k not in GKS]
            a = RNG.choice(others)
            assists[a] = assists.get(a, 0) + 1

    # Amarillas (~2/partido) a perfiles defensivos; el estado acumulado decide sanciones
    yellows = []
    n_yellow = RNG.choices([0, 1, 2, 3], weights=[10, 35, 40, 15])[0]
    pool = [k for k in on_pitch if P[k]["posicion_principal"] in
            ("DFC", "LTD", "LTI", "MCD", "MC") and k != red_key]
    RNG.shuffle(pool)
    for k in pool[:n_yellow]:
        yellows.append(k)
        if yellow_state is not None:
            yellow_state[k] = yellow_state.get(k, 0) + 1

    convocados = []
    for k in xi + bench:
        convocados.append({
            "key": k,
            "titular": k in xi,
            "posicion": P[k]["posicion_principal"],
            "dorsal": P[k]["dorsal"],
            "minutos": minutes.get(k, 0),
            "goles": goals.get(k, 0),
            "asistencias": assists.get(k, 0),
            "amarilla": k in yellows,
            "roja": k == red_key,
        })
    return {"fecha": _iso(match_date), "gf": gf, "gc": gc, "convocados": convocados,
            "competicion": competicion, "jornada": jornada, "red_minute": red_minute}


def match_stats(gf, gc):
    return {
        "tiros_a_puerta": gf + RNG.randint(2, 6),
        "ocasiones_gol": gf + RNG.randint(3, 8),
        "saques_esquina": RNG.randint(3, 9),
        "penaltis": 1 if RNG.random() < 0.12 else 0,
        "fueras_juego": RNG.randint(0, 4),
        "faltas_cometidas": RNG.randint(8, 16),
        "balones_perdidos": RNG.randint(60, 110),
        "balones_recuperados": RNG.randint(55, 100),
        "rival_tiros_a_puerta": gc + RNG.randint(1, 4),
        "rival_ocasiones_gol": gc + RNG.randint(2, 6),
        "rival_saques_esquina": RNG.randint(2, 7),
        "rival_penaltis": 1 if RNG.random() < 0.08 else 0,
        "rival_fueras_juego": RNG.randint(0, 4),
        "rival_faltas_cometidas": RNG.randint(8, 17),
    }


def rpe_for(md, key):
    base = {"MD-4": (6, 8), "MD-3": (5, 7), "MD-1": (3, 5), "MD": (7, 9),
            "MD+1": (3, 4)}[md]
    return min(10, max(1, RNG.randint(*base)))


SESSION_TEMPLATES = {
    "MD-4": ("Fuerza y tensión — juego reducido", "alta",
             "Desarrollar fuerza específica mediante duelos y espacios reducidos"),
    "MD-3": ("Resistencia específica — espacios grandes", "alta",
             "Acumular volumen en contextos tácticos de espacio grande"),
    "MD-1": ("Activación y plan de partido", "baja",
             "Activar, repasar balón parado y fijar el plan de partido"),
    "MD+1": ("Recuperación post-partido", "muy_baja",
             "Regenerar a los titulares y compensar carga de los no convocados"),
}

WARMUPS = [i for i, t in enumerate(D.TASKS) if t[6] == "warmup"]
MAINS = [i for i, t in enumerate(D.TASKS) if t[6] == "main"]
FINISHERS = [i for i, t in enumerate(D.TASKS) if t[6] == "finish"]
CALMS = [i for i, t in enumerate(D.TASKS) if t[6] == "calm"]


def build_session(d, md, rival_name=None):
    titulo, intensidad, objetivo = SESSION_TEMPLATES[md]
    tasks = [(RNG.choice(WARMUPS), "activacion", 1)]
    n_main = 1 if md in ("MD-1", "MD+1") else 2
    chosen = RNG.sample(MAINS, n_main)
    for j, idx in enumerate(chosen):
        tasks.append((idx, f"desarrollo_{j+1}", 2 + j))
    if md == "MD-1":
        tasks.append((RNG.choice(FINISHERS), f"desarrollo_{n_main+1}", 2 + n_main))
    tasks.append((RNG.choice(CALMS), "vuelta_calma", len(tasks) + 1))
    return {"fecha": _iso(d), "match_day": md, "titulo": titulo,
            "intensidad": intensidad, "objetivo": objetivo,
            "rival": rival_name, "tasks": tasks}


def build_plan():
    dates = jornada_dates()
    yellow_state, suspended_next = {}, set()
    jornadas = []

    for (jn, gf, gc), jdate in zip(D.RESULTS, dates):
        idx = (jn - 1) % 17
        localia = "local" if jn % 2 == 1 else "visitante"
        if jn > 17:
            localia = "visitante" if idx % 2 == 0 else "local"
        available = [k for k in KEYS
                     if not is_injured(k, jdate) and k not in suspended_next]
        red_key = D.REDS.get(jn)
        if red_key and red_key not in available:
            red_key = None
        m = build_match(jdate, gf, gc, available, red_key=red_key,
                        yellow_state=yellow_state, jornada=jn)
        m["rival_idx"] = idx
        m["localia"] = localia
        m["stats"] = match_stats(gf, gc)
        res = "W" if gf > gc else ("D" if gf == gc else "L")
        pool = {"W": D.CRONICAS_WIN, "D": D.CRONICAS_DRAW, "L": D.CRONICAS_LOSS}[res]
        m["cronica"] = RNG.choice(pool).format(rival=D.RIVALS[idx]["nombre"])
        jornadas.append(m)

        # sanciones para la siguiente jornada
        suspended_next = set()
        if red_key:
            suspended_next.add(red_key)
        for k, n in list(yellow_state.items()):
            if n >= 5:
                suspended_next.add(k)
                yellow_state[k] = 0

    friendlies = []
    for f_date, ridx, localia, gf, gc in D.FRIENDLIES:
        fd = date.fromisoformat(f_date)
        available = [k for k in KEYS if not is_injured(k, fd)]
        m = build_match(fd, gf, gc, available, competicion="amistoso")
        m["rival_idx"], m["localia"] = ridx, localia
        m["cronica"] = "Amistoso de pretemporada: minutos repartidos y conceptos del nuevo modelo de juego sobre la mesa."
        friendlies.append(m)

    # Semanas: pretemporada (lun 4-ago) hasta última jornada
    weeks = []
    monday = date(2025, 8, 4)
    brk_a, brk_b = (date.fromisoformat(x) for x in D.WINTER_BREAK)
    match_by_date = {m["fecha"]: m for m in jornadas}
    season_end = dates[-1]
    wk_i = 0
    while monday <= season_end:
        sunday = monday + timedelta(days=6)
        in_break = brk_a <= monday <= brk_b
        jdate = next((d for d in dates if monday <= d <= sunday), None)
        preseason = monday < date(2025, 9, 1)
        rival_name = None
        if jdate:
            rival_name = D.RIVALS[match_by_date[_iso(jdate)]["rival_idx"]]["nombre"]
        sessions = []
        if not in_break:
            plan_days = ([(0, "MD-4"), (1, "MD-3"), (3, "MD-4"), (4, "MD-1")]
                         if preseason else [(1, "MD-4"), (3, "MD-3"), (4, "MD-1")])
            for off, md in plan_days:
                sd = monday + timedelta(days=off)
                if sd > season_end:
                    continue
                sessions.append(build_session(sd, md, rival_name=rival_name))
        obj = D.MICROCYCLE_OBJECTIVES[wk_i % len(D.MICROCYCLE_OBJECTIVES)]
        weeks.append({"inicio": _iso(monday), "fin": _iso(sunday),
                      "jornada_fecha": _iso(jdate) if jdate else None,
                      "objetivos": obj, "sessions": sessions,
                      "descanso": None if preseason else _iso(monday)})
        monday += timedelta(days=7)
        wk_i += 1

    return {"jornadas": jornadas, "friendlies": friendlies, "weeks": weeks}


def availability_on(d):
    return [k for k in KEYS if not is_injured(k, d)]
