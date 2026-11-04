"""Datos de los informes del estudio: solo cifras, sin conclusiones.

Cada función devuelve JSON plano que el frontend maqueta en páginas A4.
"""

from __future__ import annotations

import json
import logging
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Iterable, Optional

from app.services.informe_sesion_detalle import _label_motivo
from app.services.partido_ambito import AMBITO_LABELS, en_ambito, normalize_ambito

logger = logging.getLogger(__name__)

TRAMOS = ((0, 15), (15, 30), (30, 45), (45, 60), (60, 75), (75, 90))
CAMPO_X0, CAMPO_X1 = 5.0, 145.0

STATS_PARTIDO = (
    ("ocasiones_gol", "Ocasiones"),
    ("tiros_a_puerta", "Tiros a puerta"),
    ("saques_esquina", "Córners"),
    ("faltas_cometidas", "Faltas cometidas"),
    ("fueras_juego", "Fueras de juego"),
    ("tarjetas_amarillas", "Amarillas"),
    ("tarjetas_rojas", "Rojas"),
    ("penaltis", "Penaltis"),
    ("balones_recuperados", "Recuperaciones"),
    ("balones_perdidos", "Pérdidas"),
)

TIPO_GOL_LABEL = {
    "balon_espalda": "Balón a la espalda",
    "centro_lateral": "Centro lateral",
    "contraataque": "Contraataque",
    "jugada_individual": "Jugada individual",
    "balon_filtrado": "Balón filtrado",
    "combinacion": "Combinación",
    "disparo_lejano": "Disparo lejano",
    "rechace": "Rechace",
    "error_rival": "Error rival",
    "penalti": "Penalti",
    "corner": "Córner",
    "falta_directa": "Falta directa",
    "falta_indirecta": "Falta indirecta",
    "saque_banda": "Saque de banda",
    "saque_centro": "Saque de centro",
    "otro": "Otro",
}

FASE_JUEGO_LABEL = {
    "ataque_organizado": "Ataque organizado",
    "defensa_organizada": "Defensa organizada",
    "transicion_defensa_ataque": "Transición ofensiva",
    "transicion_ataque_defensa": "Transición defensiva",
    "balon_parado_ofensivo": "ABP ofensivo",
    "balon_parado_defensivo": "ABP defensivo",
}

FASE_SESION_LABEL = {
    "activacion": "Activación",
    "desarrollo_1": "Desarrollo 1",
    "desarrollo_2": "Desarrollo 2",
    "desarrollo_3": "Desarrollo 3",
    "compensatorio_1": "Compensatorio",
    "compensatorio_2": "Compensatorio",
    "vuelta_calma": "Vuelta a la calma",
}

MD_ORDEN = ["MD+1", "MD+2", "MD-5", "MD-4", "MD-3", "MD-2", "MD-1", "MD"]


# ───────────────────────── utilidades puras ─────────────────────────

def media(values: Iterable[Any], ndigits: int = 1) -> Optional[float]:
    nums = [float(v) for v in values if isinstance(v, (int, float)) and not isinstance(v, bool)]
    if not nums:
        return None
    return round(sum(nums) / len(nums), ndigits)


def pct(part: float, total: float) -> Optional[int]:
    if not total:
        return None
    return round(100 * part / total)


def iso(value: Any) -> str:
    return str(value or "")[:10]


def parse_notas(raw: Any) -> dict:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip().startswith("{"):
        try:
            data = json.loads(raw)
            return data if isinstance(data, dict) else {}
        except ValueError:
            return {}
    return {}


def nombre_corto(j: dict) -> str:
    return (j.get("apodo") or j.get("nombre") or "").strip() or "—"


def nombre_completo(j: dict) -> str:
    return f"{(j.get('nombre') or '').strip()} {(j.get('apellidos') or '').strip()}".strip() or "—"


def edad(fecha_nacimiento: Any, hoy: Optional[date] = None) -> Optional[int]:
    try:
        nac = date.fromisoformat(iso(fecha_nacimiento))
    except ValueError:
        return None
    hoy = hoy or date.today()
    return hoy.year - nac.year - ((hoy.month, hoy.day) < (nac.month, nac.day))


def tramo_de(minuto: Any) -> Optional[int]:
    if not isinstance(minuto, (int, float)):
        return None
    for i, (a, b) in enumerate(TRAMOS):
        if a < minuto <= b or (i == 0 and minuto == 0):
            return i
    return len(TRAMOS) - 1 if minuto > 90 else None


def goles_por_tramo(goles: Iterable[dict]) -> list[dict]:
    out = [{"tramo": f"{a}-{b}", "favor": 0, "contra": 0} for a, b in TRAMOS]
    for g in goles:
        i = tramo_de(g.get("minuto"))
        if i is not None:
            out[i][g.get("lado") or "favor"] += 1
    return out


def tercios(puntos: Iterable[dict]) -> list[int]:
    ancho = (CAMPO_X1 - CAMPO_X0) / 3
    out = [0, 0, 0]
    for p in puntos:
        x = p.get("x") if isinstance(p, dict) else None
        if not isinstance(x, (int, float)):
            continue
        i = int((x - CAMPO_X0) // ancho)
        out[min(2, max(0, i))] += 1
    return out


def tipo_gol(g: dict) -> str:
    raw = g.get("tipo_abp") if g.get("es_abp") else g.get("tipo_gol")
    return label_tipo(raw or g.get("tipo_gol") or g.get("tipo_abp") or "")


def label_tipo(raw: str) -> str:
    return TIPO_GOL_LABEL.get(raw, raw.replace("_", " ").capitalize() or "Sin tipo")


def tipos_de_partido(est: dict, lado: str, goles: list[dict]) -> Counter:
    """Tipos de gol de un partido: el contador guardado, o el detalle si no hay contador."""
    guardado = est.get(f"tipos_gol_{lado}")
    c: Counter = Counter()
    if isinstance(guardado, dict) and any(isinstance(v, int) and v > 0 for v in guardado.values()):
        for k, v in guardado.items():
            if isinstance(v, int) and v > 0:
                c[label_tipo(k)] += v
        return c
    for g in goles:
        if g["lado"] == lado:
            c[g["tipo"]] += 1
    return c


def duracion_partido(minutos: Iterable[Any]) -> int:
    return max([90, *[m for m in minutos if isinstance(m, int)]])


def resultado_letra(r: Any) -> str:
    return {"victoria": "V", "empate": "E", "derrota": "D"}.get(str(r or ""), "")


def resumen_resultados(partidos: list[dict]) -> dict:
    v = sum(1 for p in partidos if p.get("resultado") == "victoria")
    e = sum(1 for p in partidos if p.get("resultado") == "empate")
    d = sum(1 for p in partidos if p.get("resultado") == "derrota")
    gf = sum(p.get("goles_favor") or 0 for p in partidos)
    gc = sum(p.get("goles_contra") or 0 for p in partidos)
    pj = len(partidos)
    pts = 3 * v + e
    return {
        "pj": pj, "v": v, "e": e, "d": d, "gf": gf, "gc": gc, "dg": gf - gc, "pts": pts,
        "ppp": round(pts / pj, 2) if pj else None,
        "porteria_cero": sum(1 for p in partidos if (p.get("goles_contra") or 0) == 0),
        "sin_marcar": sum(1 for p in partidos if (p.get("goles_favor") or 0) == 0),
    }


def cambios_anotador(notas: dict) -> list[dict]:
    snap = notas.get("anotador") if isinstance(notas.get("anotador"), dict) else {}
    out = []
    for ev in snap.get("events") or []:
        if not isinstance(ev, dict) or ev.get("type") != "cambio":
            continue
        out.append({
            "minuto": ev.get("minute"),
            "sale": ev.get("convId"),
            "entra": ev.get("relatedConvId"),
        })
    out.sort(key=lambda c: (c["minuto"] if isinstance(c["minuto"], (int, float)) else 999))
    return out


def formacion_partido(notas: dict) -> Optional[str]:
    snap = notas.get("anotador") if isinstance(notas.get("anotador"), dict) else {}
    return snap.get("kickoffForm") or notas.get("formacion") or snap.get("form") or None


def bloque_contenido(fase_juego: Any, fase_sesion: Any) -> str:
    if fase_juego in FASE_JUEGO_LABEL:
        return FASE_JUEGO_LABEL[fase_juego]
    fs = str(fase_sesion or "")
    if fs.startswith("activacion"):
        return "Activación"
    if fs.startswith("compensatorio") or fs == "vuelta_calma":
        return "Compensatorio"
    return "Sin fase de juego"


def carga_registro(r: dict) -> Optional[float]:
    c = r.get("carga_sesion")
    if isinstance(c, (int, float)) and c > 0:
        return float(c)
    rpe, dur = r.get("rpe"), r.get("duracion_percibida")
    if isinstance(rpe, (int, float)) and isinstance(dur, (int, float)) and rpe > 0 and dur > 0:
        return float(rpe * dur)
    return None


WELLNESS = ("sueno", "fatiga", "dolor", "estres", "humor")


def wellness_medias(rows: list[dict]) -> dict:
    out: dict[str, Any] = {k: media(r.get(k) for r in rows) for k in WELLNESS}
    con = [r for r in rows if all(isinstance(r.get(k), (int, float)) for k in WELLNESS)]
    out["total"] = media((sum(r[k] for k in WELLNESS) for r in con), 1)
    out["n"] = len(con)
    return out


def minutos_disputados(partidos: list[dict], convs: list[dict]) -> int:
    por_partido: dict[str, list[Any]] = defaultdict(list)
    for c in convs:
        por_partido[str(c.get("partido_id"))].append(c.get("minutos_jugados"))
    return sum(duracion_partido(por_partido.get(str(p.get("id")), [])) for p in partidos)


def lunes(d: date) -> date:
    return d - timedelta(days=d.weekday())


# ───────────────────────── carga de datos ─────────────────────────

def _rows(q) -> list[dict]:
    try:
        return q.execute().data or []
    except Exception:
        logger.exception("informes_datos query failed")
        return []


def _in_chunks(supabase, table: str, columns: str, column: str, ids: list[str], extra=None) -> list[dict]:
    out: list[dict] = []
    for i in range(0, len(ids), 150):
        q = supabase.table(table).select(columns).in_(column, ids[i:i + 150])
        if extra:
            q = extra(q)
        out.extend(_rows(q))
    return out


def cabecera(supabase, organizacion_id: str, equipo_id: str) -> dict:
    org = _rows(
        supabase.table("organizaciones")
        .select("nombre, logo_url, color_primario, color_secundario")
        .eq("id", organizacion_id).limit(1)
    )
    eq = _rows(
        supabase.table("equipos").select("id, nombre, categoria, temporada").eq("id", equipo_id).limit(1)
    )
    return {
        "club": org[0] if org else {},
        "equipo": eq[0] if eq else {},
        "generado": datetime.now().isoformat(timespec="minutes"),
    }


def _equipo_ok(supabase, equipo_id: str, organizacion_id: str) -> bool:
    rows = _rows(supabase.table("equipos").select("organizacion_id").eq("id", equipo_id).limit(1))
    return bool(rows) and str(rows[0].get("organizacion_id")) == str(organizacion_id)


def _jugadores(supabase, equipo_id: str) -> list[dict]:
    return _rows(
        supabase.table("jugadores")
        .select(
            "id, nombre, apellidos, apodo, dorsal, posicion_principal, foto_url, fecha_nacimiento, "
            "altura, peso, pierna_dominante, es_capitan, estado, disponibilidad, es_portero, "
            "nivel_tecnico, nivel_tactico, nivel_fisico, nivel_mental"
        )
        .eq("equipo_id", equipo_id)
        .eq("es_invitado", False)
        .order("dorsal")
    )


def _partidos(supabase, equipo_id: str, ambito: str, desde: Optional[date], hasta: Optional[date]) -> list[dict]:
    q = (
        supabase.table("partidos")
        .select(
            "id, fecha, hora, jornada, localia, competicion, goles_favor, goles_contra, resultado, "
            "rival_id, rivales(nombre, nombre_corto, escudo_url)"
        )
        .eq("equipo_id", equipo_id)
        .not_.is_("goles_favor", "null")
        .order("fecha")
    )
    if desde:
        q = q.gte("fecha", desde.isoformat())
    if hasta:
        q = q.lte("fecha", hasta.isoformat())
    return [p for p in _rows(q) if en_ambito(p.get("competicion"), ambito)]


def _partido_row(p: dict) -> dict:
    rival = p.get("rivales") or {}
    return {
        "id": p.get("id"),
        "fecha": iso(p.get("fecha")),
        "jornada": p.get("jornada"),
        "competicion": p.get("competicion") or "",
        "localia": p.get("localia") or "",
        "rival": rival.get("nombre_corto") or rival.get("nombre") or "Rival",
        "rival_nombre": rival.get("nombre") or rival.get("nombre_corto") or "Rival",
        "escudo_rival": rival.get("escudo_url"),
        "gf": p.get("goles_favor"),
        "gc": p.get("goles_contra"),
        "resultado": resultado_letra(p.get("resultado")),
    }


def _goles_partido(est: dict) -> list[dict]:
    out = []
    for lado, key in (("favor", "goles_detalle_favor"), ("contra", "goles_detalle_contra")):
        for g in est.get(key) or []:
            if not isinstance(g, dict):
                continue
            out.append({
                "lado": lado,
                "minuto": g.get("minuto"),
                "jugador": g.get("jugador") or "",
                "asistente": g.get("asistente") or g.get("asistencia") or "",
                "tipo": tipo_gol(g),
                "abp": bool(g.get("es_abp")),
                "zona": g.get("zona") or "",
            })
    out.sort(key=lambda g: g["minuto"] if isinstance(g["minuto"], (int, float)) else 999)
    return out


def _stats_comparadas(est: dict) -> list[dict]:
    periodos = est.get("stats_periodos") if isinstance(est.get("stats_periodos"), dict) else {}
    out = []
    for key, label in STATS_PARTIDO:
        nos, riv = est.get(key), est.get(f"rival_{key}")
        if nos is None and riv is None:
            continue
        row = {"key": key, "label": label, "nos": nos or 0, "rival": riv or 0}
        for half in ("1", "2"):
            h = periodos.get(half) if isinstance(periodos.get(half), dict) else None
            if h:
                row[f"p{half}"] = {"nos": h.get(key) or 0, "rival": h.get(f"rival_{key}") or 0}
        out.append(row)
    return out


# ───────────────────────── PARTIDO ─────────────────────────

def datos_partido(supabase, equipo_id: str, partido_id: str) -> dict:
    rows = _rows(
        supabase.table("partidos")
        .select(
            "id, equipo_id, fecha, hora, jornada, localia, competicion, goles_favor, goles_contra, resultado, "
            "notas_pre, ubicacion, arbitro, rivales(nombre, nombre_corto, escudo_url)"
        )
        .eq("id", partido_id).limit(1)
    )
    if not rows or str(rows[0].get("equipo_id")) != str(equipo_id):
        raise ValueError("Partido no encontrado")
    p = rows[0]
    notas = parse_notas(p.get("notas_pre"))
    convs = _rows(
        supabase.table("convocatorias")
        .select(
            "id, jugador_id, titular, posicion_asignada, dorsal, minutos_jugados, goles, asistencias, "
            "tarjeta_amarilla, tarjeta_roja, rendimiento_media, rpe, "
            "jugadores(nombre, apellidos, apodo, dorsal, posicion_principal, foto_url)"
        )
        .eq("partido_id", partido_id)
    )
    est_rows = _rows(supabase.table("estadisticas_partido").select("*").eq("partido_id", partido_id).limit(1))
    est = est_rows[0] if est_rows else {}

    cambios = cambios_anotador(notas)
    by_conv = {c["id"]: c for c in convs}
    sale_min = {c["sale"]: c["minuto"] for c in cambios if c.get("sale")}
    entra_min = {c["entra"]: c["minuto"] for c in cambios if c.get("entra")}

    def fila(c: dict) -> dict:
        j = c.get("jugadores") or {}
        return {
            "conv_id": c["id"],
            "jugador_id": c.get("jugador_id"),
            "nombre": nombre_corto(j),
            "nombre_completo": nombre_completo(j),
            "dorsal": c.get("dorsal") or j.get("dorsal"),
            "posicion": c.get("posicion_asignada") or j.get("posicion_principal") or "",
            "minutos": c.get("minutos_jugados") or 0,
            "goles": c.get("goles") or 0,
            "asistencias": c.get("asistencias") or 0,
            "amarilla": bool(c.get("tarjeta_amarilla")),
            "roja": bool(c.get("tarjeta_roja")),
            "nota": float(c["rendimiento_media"]) if c.get("rendimiento_media") is not None else None,
            "rpe": c.get("rpe"),
            "sale": sale_min.get(c["id"]),
            "entra": entra_min.get(c["id"]),
        }

    filas = [fila(c) for c in convs]
    once = sorted((f for f, c in zip(filas, convs) if c.get("titular")), key=lambda f: f["dorsal"] or 99)
    banquillo = sorted((f for f, c in zip(filas, convs) if not c.get("titular")), key=lambda f: (-(f["minutos"]), f["dorsal"] or 99))

    def nom(cid: Optional[str]) -> str:
        c = by_conv.get(cid or "")
        return nombre_corto((c or {}).get("jugadores") or {}) if c else "—"

    goles = _goles_partido(est)
    cometidas = est.get("faltas_mapa_cometidas") or []
    recibidas = est.get("faltas_mapa_recibidas") or []
    periodos = est.get("stats_periodos") if isinstance(est.get("stats_periodos"), dict) else {}
    carriles: dict[str, dict[str, int]] = {"nos": {"izq": 0, "cen": 0, "dch": 0}, "rival": {"izq": 0, "cen": 0, "dch": 0}}
    for half in ("1", "2"):
        lanes = (periodos.get(half) or {}).get("occasionLanes") if isinstance(periodos.get(half), dict) else None
        if isinstance(lanes, dict):
            for side, key in (("nos", "us"), ("rival", "rival")):
                for lane in ("izq", "cen", "dch"):
                    carriles[side][lane] += int((lanes.get(key) or {}).get(lane) or 0)
    jugados = [f for f in filas if f["minutos"] > 0]
    return {
        "partido": {
            **_partido_row(p),
            "hora": p.get("hora") or "",
            "ubicacion": p.get("ubicacion") or "",
            "arbitro": p.get("arbitro") or "",
            "formacion": formacion_partido(notas),
        },
        "once": once,
        "banquillo": banquillo,
        "cambios": [
            {"minuto": c["minuto"], "sale": nom(c["sale"]), "entra": nom(c["entra"])} for c in cambios
        ],
        "goles": goles,
        "goles_tramos": goles_por_tramo(goles),
        "stats": _stats_comparadas(est),
        "faltas": {
            "cometidas": cometidas,
            "recibidas": recibidas,
            "tercios_cometidas": tercios(cometidas),
            "tercios_recibidas": tercios(recibidas),
        },
        "carriles": carriles if any(sum(v.values()) for v in carriles.values()) else None,
        "media_equipo": {
            "convocados": len(filas),
            "jugaron": len(jugados),
            "nota_media": media(f["nota"] for f in jugados if f["nota"] is not None),
            "rpe_medio": media(f["rpe"] for f in jugados),
        },
    }


# ───────────────────────── ENTRENAMIENTO ─────────────────────────

def datos_entrenamiento(
    supabase,
    equipo_id: str,
    microciclo_id: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> dict:
    micro = None
    q = supabase.table("sesiones").select(
        "id, titulo, fecha, match_day, duracion_total, objetivo_principal, microciclo_id, estado, es_pretemporada"
    ).eq("equipo_id", equipo_id)
    if microciclo_id:
        mrows = _rows(
            supabase.table("microciclos")
            .select("id, equipo_id, fecha_inicio, fecha_fin, objetivo_principal, objetivo_tactico, objetivo_fisico, rivales(nombre, nombre_corto, escudo_url)")
            .eq("id", microciclo_id).limit(1)
        )
        if not mrows or str(mrows[0].get("equipo_id")) != str(equipo_id):
            raise ValueError("Microciclo no encontrado")
        micro = mrows[0]
        q = q.eq("microciclo_id", microciclo_id)
    else:
        if desde:
            q = q.gte("fecha", desde.isoformat())
        if hasta:
            q = q.lte("fecha", hasta.isoformat())
    sesiones = sorted(_rows(q), key=lambda s: iso(s.get("fecha")))
    sesiones = [s for s in sesiones if (s.get("estado") or "") != "cancelada"]
    ids = [str(s["id"]) for s in sesiones]

    asist = _in_chunks(supabase, "asistencias_sesion", "sesion_id, jugador_id, presente, motivo_ausencia", "sesion_id", ids)
    rpes = _in_chunks(supabase, "registros_rpe", "sesion_id, jugador_id, rpe, duracion_percibida, carga_sesion", "sesion_id", ids)
    st = _in_chunks(
        supabase, "sesion_tareas",
        "sesion_id, orden, fase_sesion, duracion_override, minutos_efectivos, tareas(id, titulo, fase_juego, duracion_total)",
        "sesion_id", ids,
    )
    jugadores = {j["id"]: j for j in _jugadores(supabase, equipo_id)}

    asist_by: dict[str, list[dict]] = defaultdict(list)
    for a in asist:
        asist_by[str(a["sesion_id"])].append(a)
    rpe_by: dict[str, list[dict]] = defaultdict(list)
    for r in rpes:
        rpe_by[str(r["sesion_id"])].append(r)
    tareas_by: dict[str, list[dict]] = defaultdict(list)
    for t in st:
        tareas_by[str(t["sesion_id"])].append(t)

    contenidos: Counter = Counter()
    ejercicios: dict[str, dict] = {}
    motivos: Counter = Counter()
    por_jugador: dict[str, dict] = defaultdict(lambda: {"convocado": 0, "presente": 0, "rpe": [], "carga": 0.0})
    ses_rows = []
    for s in sesiones:
        sid = str(s["id"])
        filas_a = asist_by.get(sid, [])
        presentes = sum(1 for a in filas_a if a.get("presente"))
        for a in filas_a:
            pj = por_jugador[str(a.get("jugador_id"))]
            pj["convocado"] += 1
            if a.get("presente"):
                pj["presente"] += 1
            else:
                motivos[_label_motivo(a.get("motivo_ausencia"))] += 1
        filas_r = rpe_by.get(sid, [])
        cargas = []
        for r in filas_r:
            c = carga_registro(r)
            pj = por_jugador[str(r.get("jugador_id"))]
            if isinstance(r.get("rpe"), (int, float)):
                pj["rpe"].append(r["rpe"])
            if c:
                cargas.append(c)
                pj["carga"] += c
        tareas = []
        for t in sorted(tareas_by.get(sid, []), key=lambda t: t.get("orden") or 0):
            tarea = t.get("tareas") or {}
            mins = t.get("duracion_override") or tarea.get("duracion_total") or 0
            bloque = bloque_contenido(tarea.get("fase_juego"), t.get("fase_sesion"))
            contenidos[bloque] += mins
            titulo = (tarea.get("titulo") or "Tarea").strip()
            e = ejercicios.setdefault(titulo.lower(), {"titulo": titulo, "veces": 0, "minutos": 0, "fase": bloque})
            e["veces"] += 1
            e["minutos"] += mins
            tareas.append({
                "titulo": titulo,
                "fase": bloque,
                "fase_sesion": FASE_SESION_LABEL.get(t.get("fase_sesion") or "", ""),
                "minutos": mins,
            })
        ses_rows.append({
            "id": sid,
            "fecha": iso(s.get("fecha")),
            "md": s.get("match_day") or "",
            "titulo": s.get("titulo") or "Sesión",
            "objetivo": s.get("objetivo_principal") or "",
            "duracion": s.get("duracion_total") or sum(t["minutos"] for t in tareas) or 0,
            "minutos_tareas": sum(t["minutos"] for t in tareas),
            "presentes": presentes,
            "convocados": len(filas_a),
            "asistencia_pct": pct(presentes, len(filas_a)),
            "rpe_medio": media(r.get("rpe") for r in filas_r),
            "carga_media": media(cargas, 0),
            "n_rpe": len(filas_r),
            "pretemporada": bool(s.get("es_pretemporada")),
            "microciclo_id": s.get("microciclo_id"),
            "tareas": tareas,
        })

    por_md: dict[str, list[dict]] = defaultdict(list)
    for s in ses_rows:
        por_md[s["md"] or "—"].append(s)
    md_rows = [
        {
            "md": md,
            "sesiones": len(lst),
            "duracion_media": media((s["duracion"] for s in lst), 0),
            "rpe_medio": media(s["rpe_medio"] for s in lst),
            "carga_media": media((s["carga_media"] for s in lst), 0),
            "asistencia_pct": media((s["asistencia_pct"] for s in lst), 0),
        }
        for md, lst in sorted(por_md.items(), key=lambda kv: MD_ORDEN.index(kv[0]) if kv[0] in MD_ORDEN else 99)
    ]

    semanas: dict[str, list[dict]] = defaultdict(list)
    for s in ses_rows:
        semanas[s["microciclo_id"] or lunes(date.fromisoformat(s["fecha"])).isoformat()].append(s)
    micro_ids = [k for k in semanas if k and len(k) > 10]
    micro_info = {
        str(m["id"]): m for m in _in_chunks(
            supabase, "microciclos",
            "id, fecha_inicio, fecha_fin, objetivo_principal, rivales(nombre, nombre_corto)",
            "id", micro_ids,
        )
    } if micro_ids else {}
    sem_rows = []
    for key, lst in semanas.items():
        m = micro_info.get(key) or {}
        rival = m.get("rivales") or {}
        sem_rows.append({
            "inicio": iso(m.get("fecha_inicio")) or lst[0]["fecha"],
            "fin": iso(m.get("fecha_fin")) or lst[-1]["fecha"],
            "rival": rival.get("nombre_corto") or rival.get("nombre") or "",
            "objetivo": m.get("objetivo_principal") or "",
            "sesiones": len(lst),
            "minutos": sum(s["duracion"] for s in lst),
            "rpe_medio": media(s["rpe_medio"] for s in lst),
            "carga": round(sum(s["carga_media"] or 0 for s in lst)),
            "asistencia_pct": media((s["asistencia_pct"] for s in lst), 0),
        })
    sem_rows.sort(key=lambda r: r["inicio"])

    total_min = sum(contenidos.values())
    jug_rows = []
    for jid, j in jugadores.items():
        pj = por_jugador.get(jid)
        if not pj or not pj["convocado"]:
            continue
        jug_rows.append({
            "nombre": nombre_corto(j),
            "dorsal": j.get("dorsal"),
            "posicion": j.get("posicion_principal") or "",
            "sesiones": pj["convocado"],
            "presente": pj["presente"],
            "asistencia_pct": pct(pj["presente"], pj["convocado"]),
            "rpe_medio": media(pj["rpe"]),
            "carga_total": round(pj["carga"]),
        })
    jug_rows.sort(key=lambda r: (-(r["asistencia_pct"] or 0), r["nombre"]))
    total_conv = sum(s["convocados"] for s in ses_rows)
    total_pres = sum(s["presentes"] for s in ses_rows)
    alcance: dict[str, Any] = {
        "tipo": "microciclo" if micro else "periodo",
        "desde": ses_rows[0]["fecha"] if ses_rows else (desde.isoformat() if desde else ""),
        "hasta": ses_rows[-1]["fecha"] if ses_rows else (hasta.isoformat() if hasta else ""),
    }
    if micro:
        rival = micro.get("rivales") or {}
        alcance.update({
            "desde": iso(micro.get("fecha_inicio")),
            "hasta": iso(micro.get("fecha_fin")),
            "objetivo": micro.get("objetivo_principal") or "",
            "objetivo_tactico": micro.get("objetivo_tactico") or "",
            "objetivo_fisico": micro.get("objetivo_fisico") or "",
            "rival": rival.get("nombre") or rival.get("nombre_corto") or "",
            "escudo_rival": rival.get("escudo_url"),
        })
    return {
        "alcance": alcance,
        "resumen": {
            "sesiones": len(ses_rows),
            "semanas": len(sem_rows),
            "minutos": sum(s["duracion"] for s in ses_rows),
            "duracion_media": media((s["duracion"] for s in ses_rows), 0),
            "tareas": sum(len(s["tareas"]) for s in ses_rows),
            "asistencia_pct": pct(total_pres, total_conv),
            "rpe_medio": media(r.get("rpe") for r in rpes),
            "carga_media": media((s["carga_media"] for s in ses_rows), 0),
            "registros_rpe": len(rpes),
        },
        "por_md": md_rows,
        "semanas": sem_rows,
        "contenidos": [
            {"bloque": k, "minutos": v, "pct": pct(v, total_min)} for k, v in contenidos.most_common()
        ],
        "ejercicios": sorted(ejercicios.values(), key=lambda e: (-e["veces"], -e["minutos"]))[:15],
        "ausencias": [{"motivo": k, "n": v} for k, v in motivos.most_common()],
        "sesiones": ses_rows,
        "jugadores": jug_rows,
    }


# ───────────────────────── JUGADORES ─────────────────────────

def datos_jugadores(
    supabase,
    equipo_id: str,
    jugador_ids: Optional[list[str]] = None,
    ambito: str = "competicion",
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    *,
    con_rpe: bool = True,
    con_medico: bool = False,
) -> dict:
    ambito = normalize_ambito(ambito)
    todos = _jugadores(supabase, equipo_id)
    elegidos = [j for j in todos if not jugador_ids or j["id"] in set(jugador_ids)]
    partidos = _partidos(supabase, equipo_id, ambito, desde, hasta)
    pids = [p["id"] for p in partidos]
    convs = _in_chunks(
        supabase, "convocatorias",
        "partido_id, jugador_id, titular, minutos_jugados, goles, asistencias, tarjeta_amarilla, tarjeta_roja, rendimiento_media, rpe",
        "partido_id", pids,
    ) if pids else []
    conv_by: dict[tuple[str, str], dict] = {(c["jugador_id"], c["partido_id"]): c for c in convs}
    minutos_equipo = minutos_disputados(partidos, convs)

    ses_q = supabase.table("sesiones").select("id, fecha").eq("equipo_id", equipo_id)
    if desde:
        ses_q = ses_q.gte("fecha", desde.isoformat())
    if hasta:
        ses_q = ses_q.lte("fecha", hasta.isoformat())
    sesiones = _rows(ses_q)
    sids = [str(s["id"]) for s in sesiones]
    jids = [j["id"] for j in elegidos]
    asist = _in_chunks(
        supabase, "asistencias_sesion", "sesion_id, jugador_id, presente, motivo_ausencia", "sesion_id", sids,
        extra=lambda q: q.in_("jugador_id", jids),
    ) if sids and jids else []

    rpe_rows: list[dict] = []
    if con_rpe and jids:
        def _rango(q):
            if desde:
                q = q.gte("fecha", desde.isoformat())
            if hasta:
                q = q.lte("fecha", hasta.isoformat())
            return q
        rpe_rows = _in_chunks(
            supabase, "registros_rpe",
            "jugador_id, sesion_id, partido_id, fecha, rpe, duracion_percibida, carga_sesion, sueno, fatiga, dolor, estres, humor, tipo",
            "jugador_id", jids, extra=_rango,
        )
    medico_rows: list[dict] = []
    if con_medico and jids:
        medico_rows = _in_chunks(
            supabase, "registros_medicos",
            "jugador_id, tipo, estado, zona_corporal, fecha_inicio, fecha_alta, dias_baja_reales, dias_baja_estimados, solo_medico",
            "jugador_id", jids,
        )

    asist_by: dict[str, list[dict]] = defaultdict(list)
    for a in asist:
        asist_by[str(a["jugador_id"])].append(a)
    rpe_by: dict[str, list[dict]] = defaultdict(list)
    for r in rpe_rows:
        rpe_by[str(r["jugador_id"])].append(r)
    med_by: dict[str, list[dict]] = defaultdict(list)
    for m in medico_rows:
        if not m.get("solo_medico"):
            med_by[str(m["jugador_id"])].append(m)

    ultimo = max((iso(r.get("fecha")) for r in rpe_rows if r.get("fecha")), default="")
    fin = hasta or (date.fromisoformat(ultimo) if ultimo else date.today())
    semanas = [lunes(fin) - timedelta(weeks=i) for i in range(5, -1, -1)]

    def ficha(j: dict) -> dict:
        jid = j["id"]
        filas = []
        for p in partidos:
            c = conv_by.get((jid, p["id"]))
            row = _partido_row(p)
            row.update({
                "convocado": bool(c),
                "titular": bool(c and c.get("titular")),
                "minutos": (c or {}).get("minutos_jugados") or 0,
                "goles": (c or {}).get("goles") or 0,
                "asistencias": (c or {}).get("asistencias") or 0,
                "amarilla": bool(c and c.get("tarjeta_amarilla")),
                "roja": bool(c and c.get("tarjeta_roja")),
                "nota": float(c["rendimiento_media"]) if c and c.get("rendimiento_media") is not None else None,
            })
            filas.append(row)
        conv = [f for f in filas if f["convocado"]]
        jugados = [f for f in conv if f["minutos"] > 0]
        minutos = sum(f["minutos"] for f in conv)
        a_rows = asist_by.get(jid, [])
        presentes = sum(1 for a in a_rows if a.get("presente"))
        r_rows = rpe_by.get(jid, [])
        r_ses = [r for r in r_rows if r.get("sesion_id") and isinstance(r.get("rpe"), (int, float))]
        r_par = [r for r in r_rows if r.get("partido_id") and isinstance(r.get("rpe"), (int, float))]
        well = [r for r in r_rows if any(isinstance(r.get(k), (int, float)) for k in WELLNESS)]
        carga_sem = []
        for lun in semanas:
            fin_sem = lun + timedelta(days=6)
            total = sum(
                carga_registro(r) or 0 for r in r_rows
                if r.get("fecha") and lun.isoformat() <= iso(r["fecha"]) <= fin_sem.isoformat()
            )
            carga_sem.append({"semana": lun.isoformat(), "ua": round(total)})
        meds = med_by.get(jid, [])
        out = {
            "id": jid,
            "nombre": (j.get("nombre") or "").strip(),
            "apellidos": (j.get("apellidos") or "").strip(),
            "apodo": (j.get("apodo") or "").strip(),
            "dorsal": j.get("dorsal"),
            "posicion": j.get("posicion_principal") or "",
            "foto_url": j.get("foto_url"),
            "edad": edad(j.get("fecha_nacimiento")),
            "altura": j.get("altura"),
            "peso": j.get("peso"),
            "pierna": j.get("pierna_dominante") or "",
            "capitan": bool(j.get("es_capitan")),
            "portero": bool(j.get("es_portero")),
            "estado": j.get("estado") or "",
            "disponibilidad": j.get("disponibilidad") or "",
            "totales": {
                "partidos_equipo": len(partidos),
                "convocatorias": len(conv),
                "jugados": len(jugados),
                "titular": sum(1 for f in conv if f["titular"]),
                "minutos": minutos,
                "minutos_pct": pct(minutos, minutos_equipo),
                "goles": sum(f["goles"] for f in conv),
                "asistencias": sum(f["asistencias"] for f in conv),
                "amarillas": sum(1 for f in conv if f["amarilla"]),
                "rojas": sum(1 for f in conv if f["roja"]),
                "nota_media": media(f["nota"] for f in jugados if f["nota"] is not None),
            },
            "partidos": filas,
            "entrenamiento": {
                "sesiones": len(a_rows),
                "presente": presentes,
                "asistencia_pct": pct(presentes, len(a_rows)),
                "ausencias": [
                    {"motivo": k, "n": v}
                    for k, v in Counter(_label_motivo(a.get("motivo_ausencia")) for a in a_rows if not a.get("presente")).most_common()
                ],
            },
            "valoracion": {
                "tecnico": j.get("nivel_tecnico"),
                "tactico": j.get("nivel_tactico"),
                "fisico": j.get("nivel_fisico"),
                "mental": j.get("nivel_mental"),
            },
        }
        if con_rpe:
            out["rpe"] = {
                "sesion_media": media(r["rpe"] for r in r_ses),
                "sesion_n": len(r_ses),
                "partido_media": media(r["rpe"] for r in r_par),
                "partido_n": len(r_par),
            }
            out["wellness"] = wellness_medias(well)
            out["carga_semanal"] = carga_sem
        if con_medico:
            out["medico"] = {
                "registros": len(meds),
                "activos": sum(1 for m in meds if (m.get("estado") or "") == "activo"),
                "dias_baja": sum(int(m.get("dias_baja_reales") or 0) for m in meds),
                "lesiones": sum(1 for m in meds if m.get("tipo") == "lesion"),
                "zonas": [z for z, _ in Counter(m.get("zona_corporal") for m in meds if m.get("zona_corporal")).most_common(3)],
            }
        return out

    fichas = [ficha(j) for j in elegidos]
    equipo_fichas = fichas if not jugador_ids else [ficha(j) for j in todos]
    equipo = {
        "minutos_media": media((f["totales"]["minutos"] for f in equipo_fichas if f["totales"]["convocatorias"]), 0),
        "nota_media": media(f["totales"]["nota_media"] for f in equipo_fichas),
        "asistencia_pct": media((f["entrenamiento"]["asistencia_pct"] for f in equipo_fichas), 0),
    }
    if con_rpe:
        equipo["rpe_sesion"] = media(f["rpe"]["sesion_media"] for f in equipo_fichas)
        equipo["rpe_partido"] = media(f["rpe"]["partido_media"] for f in equipo_fichas)
        equipo["wellness"] = media(f["wellness"]["total"] for f in equipo_fichas)
    return {
        "ambito": ambito,
        "ambito_label": AMBITO_LABELS.get(ambito, ambito),
        "partidos": [_partido_row(p) for p in partidos],
        "media_equipo": equipo,
        "jugadores": fichas,
        "plantilla": [
            {
                "id": f["id"],
                "nombre": f["apodo"] or f["nombre"],
                "dorsal": f["dorsal"],
                "posicion": f["posicion"],
                **f["totales"],
                "asistencia_pct": f["entrenamiento"]["asistencia_pct"],
            }
            for f in equipo_fichas
        ],
    }


# ───────────────────────── TEMPORADA ─────────────────────────

def datos_temporada(
    supabase,
    equipo_id: str,
    ambito: str = "competicion",
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> dict:
    ambito = normalize_ambito(ambito)
    partidos = _partidos(supabase, equipo_id, ambito, desde, hasta)
    pids = [p["id"] for p in partidos]
    ests = {
        str(e["partido_id"]): e for e in _in_chunks(supabase, "estadisticas_partido", "*", "partido_id", pids)
    } if pids else {}
    jug = _jugadores(supabase, equipo_id)
    by_j = {j["id"]: j for j in jug}
    convs = _in_chunks(
        supabase, "convocatorias",
        "partido_id, jugador_id, titular, minutos_jugados, goles, asistencias, tarjeta_amarilla, tarjeta_roja, rendimiento_media",
        "partido_id", pids,
    ) if pids else []

    rows = []
    puntos = 0
    goles_all: list[dict] = []
    tipos_favor: Counter = Counter()
    tipos_contra: Counter = Counter()
    cometidas: list[dict] = []
    recibidas: list[dict] = []
    faltas_partido = []
    totales: dict[str, list[int]] = defaultdict(lambda: [0, 0, 0])
    for p in partidos:
        r = _partido_row(p)
        puntos += {"V": 3, "E": 1}.get(r["resultado"], 0)
        r["puntos_acum"] = puntos
        rows.append(r)
        est = ests.get(p["id"]) or {}
        goles_p = _goles_partido(est)
        goles_all.extend(goles_p)
        tipos_favor.update(tipos_de_partido(est, "favor", goles_p))
        tipos_contra.update(tipos_de_partido(est, "contra", goles_p))
        c, rc = est.get("faltas_mapa_cometidas") or [], est.get("faltas_mapa_recibidas") or []
        cometidas.extend(c)
        recibidas.extend(rc)
        if est:
            faltas_partido.append({
                "rival": r["rival"], "resultado": r["resultado"], "gf": r["gf"], "gc": r["gc"],
                "cometidas": est.get("faltas_cometidas") if est.get("faltas_cometidas") is not None else len(c),
                "recibidas": est.get("rival_faltas_cometidas") if est.get("rival_faltas_cometidas") is not None else len(rc),
                "amarillas": est.get("tarjetas_amarillas") or 0,
            })
            for key, _ in STATS_PARTIDO:
                if est.get(key) is not None or est.get(f"rival_{key}") is not None:
                    t = totales[key]
                    t[0] += est.get(key) or 0
                    t[1] += est.get(f"rival_{key}") or 0
                    t[2] += 1

    favor = [g for g in goles_all if g["lado"] == "favor"]
    contra = [g for g in goles_all if g["lado"] == "contra"]
    stats = []
    for key, label in STATS_PARTIDO:
        t = totales.get(key)
        if not t or not t[2]:
            continue
        stats.append({
            "key": key, "label": label, "nos": t[0], "rival": t[1], "partidos": t[2],
            "nos_media": round(t[0] / t[2], 1), "rival_media": round(t[1] / t[2], 1),
        })

    plantilla: dict[str, dict] = {}
    for c in convs:
        jid = c.get("jugador_id")
        if jid not in by_j:
            continue
        b = plantilla.setdefault(jid, {
            "nombre": nombre_corto(by_j[jid]), "dorsal": by_j[jid].get("dorsal"),
            "posicion": by_j[jid].get("posicion_principal") or "",
            "convocatorias": 0, "jugados": 0, "titular": 0, "minutos": 0, "goles": 0, "asistencias": 0,
            "amarillas": 0, "rojas": 0, "_notas": [],
        })
        b["convocatorias"] += 1
        mins = c.get("minutos_jugados") or 0
        if mins > 0:
            b["jugados"] += 1
        b["titular"] += 1 if c.get("titular") else 0
        b["minutos"] += mins
        b["goles"] += c.get("goles") or 0
        b["asistencias"] += c.get("asistencias") or 0
        b["amarillas"] += 1 if c.get("tarjeta_amarilla") else 0
        b["rojas"] += 1 if c.get("tarjeta_roja") else 0
        if c.get("rendimiento_media") is not None and mins > 0:
            b["_notas"].append(float(c["rendimiento_media"]))
    minutos_equipo = minutos_disputados(partidos, convs)
    tabla = []
    for b in plantilla.values():
        notas = b.pop("_notas")
        b["nota_media"] = media(notas)
        b["minutos_pct"] = pct(b["minutos"], minutos_equipo)
        tabla.append(b)
    tabla.sort(key=lambda b: (-b["minutos"], b["nombre"]))

    ses_q = supabase.table("sesiones").select("id, duracion_total, fecha").eq("equipo_id", equipo_id)
    if desde:
        ses_q = ses_q.gte("fecha", desde.isoformat())
    if hasta:
        ses_q = ses_q.lte("fecha", hasta.isoformat())
    sesiones = _rows(ses_q)
    sids = [str(s["id"]) for s in sesiones]
    asist = _in_chunks(supabase, "asistencias_sesion", "presente", "sesion_id", sids) if sids else []
    rpes = _in_chunks(supabase, "registros_rpe", "rpe", "sesion_id", sids) if sids else []

    local = resumen_resultados([p for p in partidos if p.get("localia") == "local"])
    visitante = resumen_resultados([p for p in partidos if p.get("localia") == "visitante"])
    return {
        "ambito": ambito,
        "ambito_label": AMBITO_LABELS.get(ambito, ambito),
        "desde": rows[0]["fecha"] if rows else (desde.isoformat() if desde else ""),
        "hasta": rows[-1]["fecha"] if rows else (hasta.isoformat() if hasta else ""),
        "resumen": resumen_resultados(partidos),
        "local": local,
        "visitante": visitante,
        "partidos": rows,
        "goles_tramos": goles_por_tramo(goles_all),
        "goles_tipo": {
            "favor": [{"tipo": k, "n": v} for k, v in tipos_favor.most_common()],
            "contra": [{"tipo": k, "n": v} for k, v in tipos_contra.most_common()],
        },
        "abp": {
            "favor": sum(1 for g in favor if g["abp"]), "contra": sum(1 for g in contra if g["abp"]),
            "favor_total": len(favor), "contra_total": len(contra),
        },
        "stats": stats,
        "faltas": {
            "cometidas": cometidas,
            "recibidas": recibidas,
            "tercios_cometidas": tercios(cometidas),
            "tercios_recibidas": tercios(recibidas),
            "por_partido": faltas_partido,
        },
        "plantilla": tabla,
        "goleadores": sorted(
            ({"nombre": b["nombre"], "goles": b["goles"], "asistencias": b["asistencias"]} for b in tabla if b["goles"] or b["asistencias"]),
            key=lambda g: (-g["goles"], -g["asistencias"], g["nombre"]),
        ),
        "entrenamiento": {
            "sesiones": len(sesiones),
            "duracion_media": media((s.get("duracion_total") for s in sesiones), 0),
            "asistencia_pct": pct(sum(1 for a in asist if a.get("presente")), len(asist)),
            "rpe_medio": media(r.get("rpe") for r in rpes),
        },
    }
