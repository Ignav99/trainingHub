# -*- coding: utf-8 -*-
"""Valida los invariantes de coherencia del plan de temporada SIN red."""
import sys
from datetime import date

import season_data as D
import plan as PL


def main():
    p = PL.build_plan()
    errors = []

    # 1. Resultados globales: 34 jornadas, 22V 9E 3D = 75 pts
    res = [("W" if gf > gc else "D" if gf == gc else "L") for _, gf, gc in D.RESULTS]
    w, d, l = res.count("W"), res.count("D"), res.count("L")
    pts = w * 3 + d
    gf_total = sum(gf for _, gf, _ in D.RESULTS)
    gc_total = sum(gc for _, _, gc in D.RESULTS)
    assert len(D.RESULTS) == 34, "deben ser 34 jornadas"
    if (w, d, l) != (22, 9, 3):
        errors.append(f"balance {w}V {d}E {l}D (esperado 22/9/3)")
    if pts != 75:
        errors.append(f"puntos {pts} (esperado 75)")
    print(f"Temporada: {w}V {d}E {l}D = {pts} pts | GF {gf_total} GC {gc_total}")

    # 2. Por partido: goles cuadran, minutos cuadran, asistencias <= goles
    season_goals = {}
    for m in p["jornadas"] + p["friendlies"]:
        goles = sum(c["goles"] for c in m["convocados"])
        asis = sum(c["asistencias"] for c in m["convocados"])
        if goles != m["gf"]:
            errors.append(f"{m['fecha']}: goles {goles} != gf {m['gf']}")
        if asis > m["gf"]:
            errors.append(f"{m['fecha']}: asistencias {asis} > goles {m['gf']}")
        mins = sum(c["minutos"] for c in m["convocados"])
        expected = 990
        if m.get("red_minute"):
            expected = 990 - (90 - m["red_minute"])
        if mins != expected:
            errors.append(f"{m['fecha']}: minutos {mins} != {expected}")
        for c in m["convocados"]:
            season_goals[c["key"]] = season_goals.get(c["key"], 0) + c["goles"]
        n_tit = sum(1 for c in m["convocados"] if c["titular"])
        if n_tit != 11:
            errors.append(f"{m['fecha']}: {n_tit} titulares")

    # 3. Lesionados nunca convocados
    for m in p["jornadas"] + p["friendlies"]:
        md = date.fromisoformat(m["fecha"])
        for c in m["convocados"]:
            if PL.is_injured(c["key"], md):
                errors.append(f"{m['fecha']}: {c['key']} convocado estando lesionado")

    # 4. Rojas diseñadas y sanción cumplida (no convocado la siguiente jornada)
    by_jornada = {m["jornada"]: m for m in p["jornadas"]}
    for jn, key in D.REDS.items():
        m = by_jornada[jn]
        reds = [c["key"] for c in m["convocados"] if c["roja"]]
        if key in [c["key"] for c in m["convocados"]] and reds != [key]:
            errors.append(f"J{jn}: roja esperada de {key}, encontradas {reds}")
        nxt = by_jornada.get(jn + 1)
        if nxt and key in [c["key"] for c in nxt["convocados"]]:
            errors.append(f"J{jn + 1}: {key} convocado estando sancionado")

    # 5. Ciclo de 5 amarillas: simular y verificar ausencia
    seen = {}
    for m in p["jornadas"]:
        for c in m["convocados"]:
            if c["amarilla"]:
                seen[c["key"]] = seen.get(c["key"], 0) + 1
                if seen[c["key"]] == 5:
                    nxt = by_jornada.get(m["jornada"] + 1)
                    if nxt and c["key"] in [x["key"] for x in nxt["convocados"]]:
                        errors.append(
                            f"J{m['jornada'] + 1}: {c['key']} jugó tras 5ª amarilla")
                    seen[c["key"]] = 0

    # 6. Pichichi razonable
    top = sorted(season_goals.items(), key=lambda x: -x[1])[:5]
    print("Goleadores:", ", ".join(f"{k} {n}" for k, n in top))
    if top[0][1] < 12:
        errors.append(f"pichichi con solo {top[0][1]} goles")

    # 7. Sesiones: estructura y fechas
    n_ses = 0
    for wk in p["weeks"]:
        for s in wk["sessions"]:
            n_ses += 1
            fases = [t[1] for t in s["tasks"]]
            if "activacion" not in fases or "vuelta_calma" not in fases:
                errors.append(f"sesión {s['fecha']} sin activación/vuelta a la calma")
            sd = date.fromisoformat(s["fecha"])
            brk_a, brk_b = (date.fromisoformat(x) for x in D.WINTER_BREAK)
            if brk_a <= sd <= brk_b:
                errors.append(f"sesión {s['fecha']} dentro del parón navideño")
    print(f"Sesiones: {n_ses} | Semanas: {len(p['weeks'])} | "
          f"Amistosos: {len(p['friendlies'])}")

    if errors:
        print("\nERRORES DE COHERENCIA:")
        for e in errors[:30]:
            print(" -", e)
        sys.exit(1)
    print("\nCOHERENCIA OK — plan válido.")


if __name__ == "__main__":
    main()
