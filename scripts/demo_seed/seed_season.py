# -*- coding: utf-8 -*-
"""Ejecuta el seeding de la temporada demo contra la API real de TrainingHub.

Reanudable: el progreso se guarda en checkpoint.json por fases.
Uso:
    python3 seed_season.py --base-url https://traininghub-api-eu.onrender.com/v1 \
        [--until FASE] [--phase FASE]
Fases en orden: auth, equipo, jugadores, rivales, tareas, partidos,
convocatorias, microciclos, sesiones, rpe, medico
"""
import argparse
import json
import os
import sys
import time

import requests

import season_data as D
import plan as PL

CKPT_FILE = os.path.join(os.path.dirname(__file__), "checkpoint.json")
THROTTLE = 0.65  # el backend limita a 100 req/min por IP
PHASES = ["auth", "equipo", "jugadores", "rivales", "tareas", "partidos",
          "convocatorias", "microciclos", "sesiones", "rpe", "medico"]


class Api:
    def __init__(self, base_url):
        self.base = base_url.rstrip("/")
        self.s = requests.Session()
        self.token = None

    def call(self, method, path, expected=(200, 201, 204), **kw):
        url = self.base + path
        headers = kw.pop("headers", {})
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        for attempt in range(4):
            time.sleep(THROTTLE)
            try:
                r = self.s.request(method, url, headers=headers, timeout=60, **kw)
            except requests.RequestException as e:
                print(f"  ! red {e}; reintento {attempt + 1}")
                time.sleep(3 * (attempt + 1))
                continue
            if r.status_code == 429 and attempt < 3:
                print(f"  ! 429 en {path}; espero 35s (ventana de rate limit)")
                time.sleep(35)
                continue
            if r.status_code == 401 and attempt < 3 and path != "/auth/login":
                # cortes transitorios backend<->Supabase Auth: re-login y seguir
                print(f"  ! 401 transitorio en {path}; re-login")
                time.sleep(5)
                tok = self.call("POST", "/auth/login", json={
                    "email": D.DEMO_USER["email"],
                    "password": D.DEMO_USER["password"]})
                self.token = tok["access_token"]
                continue
            if r.status_code in (500, 502, 503, 504) and attempt < 3:
                print(f"  ! {r.status_code} en {path}; reintento {attempt + 1}")
                time.sleep(4 * (attempt + 1))
                continue
            if r.status_code not in expected:
                raise RuntimeError(f"{method} {path} -> {r.status_code}: {r.text[:400]}")
            return r.json() if r.status_code != 204 and r.text else None
        raise RuntimeError(f"{method} {path}: agotados los reintentos")

    def get(self, p, **kw): return self.call("GET", p, **kw)
    def post(self, p, **kw): return self.call("POST", p, **kw)
    def put(self, p, **kw): return self.call("PUT", p, **kw)


def load_ckpt():
    if os.path.exists(CKPT_FILE):
        with open(CKPT_FILE) as f:
            return json.load(f)
    return {"done": [], "ids": {}}


def save_ckpt(c):
    with open(CKPT_FILE, "w") as f:
        json.dump(c, f, indent=1)


# ── Fases ────────────────────────────────────────────────────────────────

def phase_auth(api, ck, plan):
    u = D.DEMO_USER
    r = api.call("POST", "/auth/register", json=u, expected=(201, 409))
    print(f"  registro: {'creado' if r and r.get('id') else 'ya existía'}")
    tok = api.post("/auth/login", json={"email": u["email"], "password": u["password"]})
    api.token = tok["access_token"]
    me = api.get("/auth/me", expected=(200,))
    ck["ids"]["user_id"] = me.get("id")
    ck["ids"]["organizacion_id"] = me.get("organizacion_id")
    print(f"  org: {ck['ids']['organizacion_id']}")


def phase_equipo(api, ck, plan):
    existing = api.get("/equipos").get("data", [])
    for e in existing:
        if e["nombre"] == D.EQUIPO["nombre"]:
            ck["ids"]["equipo_id"] = e["id"]
            print(f"  equipo ya existe: {e['id']}")
            return
    if existing:
        # el registro crea un equipo por defecto: lo reconfiguramos como Primer Equipo
        eid = existing[0]["id"]
        api.put(f"/equipos/{eid}", json=D.EQUIPO, expected=(200,))
        ck["ids"]["equipo_id"] = eid
        print(f"  equipo por defecto reconfigurado: {eid}")
        return
    eq = api.post("/equipos", json=D.EQUIPO, expected=(201,))
    ck["ids"]["equipo_id"] = eq["id"]
    print(f"  equipo creado: {eq['id']}")


def phase_jugadores(api, ck, plan):
    eq = ck["ids"]["equipo_id"]
    ck["ids"].setdefault("players", {})
    for p in D.PLAYERS:
        if p["key"] in ck["ids"]["players"]:
            continue
        body = {k: v for k, v in p.items() if k != "key"}
        body["equipo_id"] = eq
        r = api.post("/jugadores", json=body, expected=(201,))
        ck["ids"]["players"][p["key"]] = r["id"]
        save_ckpt(ck)
        print(f"  jugador {p['dorsal']:>2} {p['nombre']} {p['apellidos']}")


def phase_rivales(api, ck, plan):
    ck["ids"].setdefault("rivals", {})
    for i, r in enumerate(D.RIVALS):
        if str(i) in ck["ids"]["rivals"]:
            continue
        notas = (
            f"INFORME DE SCOUTING — {r['nombre']}\n\n"
            f"Sistema habitual: {r['sistema_juego']}. Estilo: {r['estilo']}.\n\n"
            f"Jugador clave: {r['clave']}.\n\n"
            f"Fortalezas: {r['fuerte']}.\n\n"
            f"Debilidades: {r['debil']}.\n\n"
            f"Balón parado: {r['abp']}."
        )
        body = {"nombre": r["nombre"], "nombre_corto": r["nombre_corto"],
                "ciudad": r["ciudad"], "estadio": r["estadio"],
                "sistema_juego": r["sistema_juego"], "estilo": r["estilo"],
                "notas": notas}
        resp = api.post("/rivales", json=body, expected=(201,))
        ck["ids"]["rivals"][str(i)] = resp["id"]
        save_ckpt(ck)
        print(f"  rival {r['nombre']}")


def phase_tareas(api, ck, plan):
    eq = ck["ids"]["equipo_id"]
    ck["ids"].setdefault("tasks", {})
    for i, (cat, titulo, desc, dur, jmin, estructura, _fase) in enumerate(D.TASKS):
        if str(i) in ck["ids"]["tasks"]:
            continue
        body = {"categoria_id": cat, "titulo": titulo, "descripcion": desc,
                "duracion_total": dur, "num_jugadores_min": jmin,
                "equipo_id": eq}
        if estructura:
            body["estructura_equipos"] = estructura
        r = api.post("/tareas", json=body, expected=(201,))
        ck["ids"]["tasks"][str(i)] = r["id"]
        save_ckpt(ck)
        print(f"  tarea [{cat}] {titulo}")


def _create_match(api, ck, m, key):
    eq = ck["ids"]["equipo_id"]
    rid = ck["ids"]["rivals"][str(m["rival_idx"])]
    body = {"equipo_id": eq, "rival_id": rid, "fecha": m["fecha"], "hora": "12:00",
            "localia": m["localia"], "competicion": m["competicion"],
            "notas_pre": f"Plan de partido basado en el informe de scouting de "
                         f"{D.RIVALS[m['rival_idx']]['nombre']}."}
    if m.get("jornada"):
        body["jornada"] = m["jornada"]
    r = api.post("/partidos", json=body, expected=(201,))
    pid = r["id"]
    ck["ids"]["matches"][key] = pid
    save_ckpt(ck)
    api.post(f"/partidos/{pid}/resultado",
             params={"goles_favor": m["gf"], "goles_contra": m["gc"],
                     "notas_post": m["cronica"]}, expected=(200,))
    if m["competicion"] == "liga":
        api.put(f"/estadisticas-partido/{pid}", json=m["stats"], expected=(200, 201))
    return pid


def phase_partidos(api, ck, plan):
    ck["ids"].setdefault("matches", {})
    for i, m in enumerate(plan["friendlies"]):
        key = f"A{i}"
        if key in ck["ids"]["matches"]:
            continue
        _create_match(api, ck, m, key)
        print(f"  amistoso {m['fecha']} vs {D.RIVALS[m['rival_idx']]['nombre']} "
              f"{m['gf']}-{m['gc']}")
    for m in plan["jornadas"]:
        key = f"J{m['jornada']}"
        if key in ck["ids"]["matches"]:
            continue
        _create_match(api, ck, m, key)
        print(f"  J{m['jornada']:>2} {m['fecha']} vs "
              f"{D.RIVALS[m['rival_idx']]['nombre']} {m['gf']}-{m['gc']}")


def phase_convocatorias(api, ck, plan):
    done = set(ck["ids"].setdefault("convocatorias_done", []))
    all_matches = ([("A%d" % i, m) for i, m in enumerate(plan["friendlies"])] +
                   [("J%d" % m["jornada"], m) for m in plan["jornadas"]])
    for key, m in all_matches:
        if key in done:
            continue
        pid = ck["ids"]["matches"][key]
        batch = []
        for c in m["convocados"]:
            batch.append({
                "partido_id": pid,
                "jugador_id": ck["ids"]["players"][c["key"]],
                "titular": c["titular"], "posicion_asignada": c["posicion"],
                "dorsal": c["dorsal"], "minutos_jugados": c["minutos"],
                "goles": c["goles"], "asistencias": c["asistencias"],
                "tarjeta_amarilla": c["amarilla"], "tarjeta_roja": c["roja"],
            })
        api.post("/convocatorias/batch", json=batch, expected=(201,))
        ck["ids"]["convocatorias_done"].append(key)
        save_ckpt(ck)
        print(f"  convocatoria {key}: {len(batch)} jugadores")


def phase_microciclos(api, ck, plan):
    eq = ck["ids"]["equipo_id"]
    ck["ids"].setdefault("micros", {})
    for wk in plan["weeks"]:
        key = wk["inicio"]
        if key in ck["ids"]["micros"]:
            continue
        obj = wk["objetivos"]
        body = {"equipo_id": eq, "fecha_inicio": wk["inicio"], "fecha_fin": wk["fin"],
                "objetivo_principal": obj[0], "objetivo_tactico": obj[1],
                "objetivo_fisico": obj[2], "estado": "completado"}
        if wk["jornada_fecha"]:
            jn = next(m["jornada"] for m in plan["jornadas"]
                      if m["fecha"] == wk["jornada_fecha"])
            body["partido_id"] = ck["ids"]["matches"][f"J{jn}"]
        r = api.post("/microciclos", json=body, expected=(201,))
        ck["ids"]["micros"][key] = r["id"]
        save_ckpt(ck)
        print(f"  microciclo {wk['inicio']}")


def phase_sesiones(api, ck, plan):
    eq = ck["ids"]["equipo_id"]
    ck["ids"].setdefault("sessions", {})
    for wk in plan["weeks"]:
        for s in wk["sessions"]:
            if s["fecha"] in ck["ids"]["sessions"]:
                continue
            body = {"equipo_id": eq, "titulo": s["titulo"], "fecha": s["fecha"],
                    "match_day": s["match_day"], "rival": s["rival"],
                    "competicion": "Liga" if s["rival"] else None,
                    "hora": "19:30", "lugar": "Ciudad Deportiva CD Atlántico",
                    "objetivo_principal": s["objetivo"],
                    "intensidad_objetivo": s["intensidad"]}
            r = api.post("/sesiones", json=body, expected=(201,))
            sid = r["id"]
            # el campo inline `tareas` de SesionCreate no funciona (se cuela en
            # el INSERT y revienta): usamos el sub-endpoint oficial
            for idx, fase, orden in s["tasks"]:
                api.post(f"/sesiones/{sid}/tareas",
                         json={"tarea_id": ck["ids"]["tasks"][str(idx)],
                               "orden": orden, "fase_sesion": fase},
                         expected=(200, 201))
            api.put(f"/sesiones/{sid}", json={"estado": "completada"},
                    expected=(200,))
            ck["ids"]["sessions"][s["fecha"]] = sid
            save_ckpt(ck)
            print(f"  sesión {s['fecha']} [{s['match_day']}] {s['titulo']}")
        if wk["inicio"] in ck["ids"]["micros"] and wk["sessions"]:
            api.post(f"/microciclos/{ck['ids']['micros'][wk['inicio']]}/link-sesiones",
                     expected=(200, 201))


def phase_rpe(api, ck, plan):
    from datetime import date as _date
    done = set(ck["ids"].setdefault("rpe_done", []))
    # RPE de sesiones
    for wk in plan["weeks"]:
        for s in wk["sessions"]:
            key = f"S{s['fecha']}"
            if key in done:
                continue
            sid = ck["ids"]["sessions"].get(s["fecha"])
            avail = PL.availability_on(_date.fromisoformat(s["fecha"]))
            batch = []
            for k in avail:
                batch.append({"jugador_id": ck["ids"]["players"][k],
                              "sesion_id": sid, "fecha": s["fecha"],
                              "rpe": PL.rpe_for(s["match_day"], k),
                              "duracion_percibida": 80, "tipo": "sesion"})
            api.post("/rpe/batch", json=batch, expected=(201,))
            ck["ids"]["rpe_done"].append(key)
            save_ckpt(ck)
            print(f"  RPE sesión {s['fecha']}: {len(batch)}")
    # RPE de partidos (solo quienes jugaron minutos)
    for m in plan["jornadas"] + plan["friendlies"]:
        key = f"P{m['fecha']}"
        if key in done:
            continue
        batch = []
        for c in m["convocados"]:
            if c["minutos"] <= 0:
                continue
            batch.append({"jugador_id": ck["ids"]["players"][c["key"]],
                          "fecha": m["fecha"], "rpe": PL.rpe_for("MD", c["key"]),
                          "duracion_percibida": c["minutos"], "tipo": "manual",
                          "titulo": f"Partido vs {D.RIVALS[m['rival_idx']]['nombre']}"})
        api.post("/rpe/batch", json=batch, expected=(201,))
        ck["ids"]["rpe_done"].append(key)
        save_ckpt(ck)
        print(f"  RPE partido {m['fecha']}: {len(batch)}")


def phase_medico(api, ck, plan):
    eq = ck["ids"]["equipo_id"]
    done = set(ck["ids"].setdefault("medico_done", []))
    for inj in D.INJURIES:
        key = f"{inj['player']}-{inj['fecha_inicio']}"
        if key in done:
            continue
        body = {"jugador_id": ck["ids"]["players"][inj["player"]],
                "equipo_id": eq, "tipo": inj["tipo"], "titulo": inj["titulo"],
                "descripcion": inj["descripcion"],
                "diagnostico": inj["diagnostico"],
                "tratamiento": inj["tratamiento"],
                "fecha_inicio": inj["fecha_inicio"],
                "dias_baja_estimados": inj["dias_estimados"],
                "solo_medico": False}
        if inj.get("medicacion"):
            body["medicacion"] = inj["medicacion"]
        if inj["fecha_alta"]:
            body["fecha_alta"] = inj["fecha_alta"]
            body["estado"] = "alta"
        else:
            body["estado"] = "en_recuperacion"
        api.post("/medico", json=body, expected=(201,))
        ck["ids"]["medico_done"].append(key)
        save_ckpt(ck)
        print(f"  lesión {inj['player']}: {inj['titulo']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--phase")
    ap.add_argument("--until")
    args = ap.parse_args()

    plan = PL.build_plan()
    ck = load_ckpt()
    api = Api(args.base_url)

    to_run = [args.phase] if args.phase else PHASES
    for ph in to_run:
        if ph != "auth" and "auth" not in ck["done"] and not args.phase:
            pass
        if ph in ck["done"] and ph != "auth":
            print(f"[{ph}] ya completada — salto")
            continue
        if ph != "auth" and api.token is None:
            phase_auth(api, ck, plan)  # re-login en reanudaciones
        print(f"[{ph}] iniciando…")
        globals()[f"phase_{ph}"](api, ck, plan)
        if ph not in ck["done"]:
            ck["done"].append(ph)
        save_ckpt(ck)
        print(f"[{ph}] COMPLETADA")
        if args.until and ph == args.until:
            break
    print("\nSEEDING TERMINADO. Credenciales:")
    print(f"  {D.DEMO_USER['email']} / {D.DEMO_USER['password']}")


if __name__ == "__main__":
    main()
