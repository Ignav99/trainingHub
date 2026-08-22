"""Asistencia, cargas, margen y lesiones para el dossier de microciclo."""

from __future__ import annotations

import logging
from typing import Any, Optional

from app.services.informe_boards import clip

logger = logging.getLogger(__name__)

TIPO_ORDER = {"sesion": 0, "fisio": 1, "margen": 2, "presente": 3}
TIPO_LABEL = {
    "sesion": "Sesión",
    "fisio": "Fisio",
    "margen": "Margen",
    "presente": "Presente (sin carga)",
}
MOTIVO_LABEL = {
    "lesion": "Lesión",
    "enfermedad": "Enfermedad",
    "sancion": "Sanción",
    "permiso": "Permiso",
    "seleccion": "Selección",
    "viaje": "Viaje",
    "otro": "Otro",
}
RTP_LABEL = {
    "fase_1_control_dolor": "F1 control dolor",
    "fase_2_movilidad": "F2 movilidad",
    "fase_3_fuerza_base": "F3 fuerza base",
    "fase_4_fuerza_funcional": "F4 fuerza funcional",
    "fase_5_carrera_lineal": "F5 carrera lineal",
    "fase_6_cambios_direccion": "F6 cambios de dirección",
    "fase_7_entrenamiento_equipo": "F7 con el equipo",
    "fase_8_competicion": "F8 competición",
}
DISP_LABEL = {
    "pleno": "Pleno",
    "grupo_adaptado": "Grupo adaptado",
    "individual": "Individual",
    "fuera": "Fuera",
}
ESTADO_MED_LABEL = {
    "activo": "Activo",
    "en_recuperacion": "En recuperación",
    "alta": "Alta",
    "cronico": "Crónico",
}
TIPO_MED_LABEL = {
    "lesion": "Lesión",
    "enfermedad": "Enfermedad",
    "molestias": "Molestias",
    "rehabilitacion": "Rehabilitación",
    "otro": "Otro",
}
TIPO_EJERCICIO_MARGEN = {
    "movilidad": "Movilidad",
    "activacion": "Activación",
    "fuerza": "Fuerza",
    "propioceptivo": "Propioceptivo",
    "cardio": "Cardio",
    "campo": "Campo",
    "pliometria": "Pliometría",
    "flexibilidad": "Flexibilidad",
    "otro": "Otro",
}


def _unwrap(raw: Any) -> dict:
    if isinstance(raw, list) and raw:
        raw = raw[0]
    return raw if isinstance(raw, dict) else {}


def _nombre(j: dict) -> str:
    return f"{j.get('nombre', '')} {j.get('apellidos', '')}".strip()


def _label_motivo(raw: Any) -> str:
    key = str(raw or "").strip().lower()
    if not key:
        return "Otro"
    return MOTIVO_LABEL.get(key, key.replace("_", " ").title())


def normalizar_asistencia(row: dict) -> dict:
    """Convierte una fila de asistencias_sesion en la fila del dossier."""
    jugador = _unwrap(row.get("jugadores"))
    presente = bool(row.get("presente"))
    tipos = [str(t) for t in (row.get("tipo_participacion") or []) if t]
    if presente and not tipos:
        tipos = ["sesion"]
    if presente:
        tipo_key = min((TIPO_ORDER.get(t, 99) for t in tipos), default=0)
        grupo = next((t for t in ("sesion", "fisio", "margen", "presente") if t in tipos), "sesion")
        rol = " + ".join(TIPO_LABEL.get(t, t.title()) for t in tipos)
        motivo = ""
    else:
        tipo_key = 9
        grupo = "ausente"
        motivo = _label_motivo(row.get("motivo_ausencia"))
        rol = f"Ausente — {motivo}"
    return {
        "jugador_id": str(row.get("jugador_id") or jugador.get("id") or ""),
        "dorsal": jugador.get("dorsal"),
        "nombre": jugador.get("nombre") or "",
        "apellidos": jugador.get("apellidos") or "",
        "nombre_completo": _nombre(jugador) or "—",
        "posicion": (jugador.get("posicion_principal") or "").replace("_", " "),
        "presente": presente,
        "tipos": tipos,
        "grupo": grupo,
        "rol": rol,
        "motivo": motivo,
        "notas": clip(row.get("notas") or "", 80),
        "tipo_key": tipo_key,
        "rpe": None,
        "carga": None,
    }


def resumen_asistencia(filas: list[dict]) -> dict:
    n_sesion = sum(1 for p in filas if "sesion" in (p.get("tipos") or []) or p.get("grupo") == "sesion")
    n_fisio = sum(1 for p in filas if "fisio" in (p.get("tipos") or []))
    n_margen = sum(1 for p in filas if "margen" in (p.get("tipos") or []) or p.get("grupo") == "margen")
    n_ausente = sum(1 for p in filas if p.get("grupo") == "ausente")
    n_presente = sum(1 for p in filas if p.get("presente"))
    return {
        "n_sesion": n_sesion,
        "n_fisio": n_fisio,
        "n_margen": n_margen,
        "n_ausente": n_ausente,
        "n_presente": n_presente,
        "n_total": len(filas),
    }


def fusionar_rpe(filas: list[dict], rpe_rows: list[dict]) -> list[dict]:
    by_id = {str(r.get("jugador_id") or ""): r for r in rpe_rows if r.get("jugador_id")}
    by_name = {(r.get("nombre_completo") or "").strip().lower(): r for r in rpe_rows}
    for p in filas:
        rec = by_id.get(str(p.get("jugador_id") or "")) or by_name.get(
            (p.get("nombre_completo") or "").strip().lower()
        )
        if not rec:
            continue
        p["rpe"] = rec.get("rpe")
        p["carga"] = rec.get("carga")
    return filas


def agregar_rpe(rows: list[dict]) -> dict:
    valores = [r.get("rpe") for r in rows if isinstance(r.get("rpe"), (int, float))]
    cargas = [r.get("carga") for r in rows if isinstance(r.get("carga"), (int, float))]
    medio = round(sum(valores) / len(valores), 1) if valores else None
    return {
        "n": len(rows),
        "rpe_medio": medio,
        "carga_total": round(sum(cargas), 1) if cargas else None,
        "filas": rows[:40],
    }


def _asistencia_por_sesion(supabase, sesion_ids: list[str]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {sid: [] for sid in sesion_ids}
    if not sesion_ids:
        return out
    rows: list[dict] = []
    for select in (
        "sesion_id, jugador_id, presente, tipo_participacion, motivo_ausencia, notas, "
        "jugadores(id, nombre, apellidos, dorsal, posicion_principal)",
        "sesion_id, jugador_id, presente, tipo_participacion, motivo_ausencia, "
        "jugadores(nombre, apellidos, dorsal)",
    ):
        try:
            resp = (
                supabase.table("asistencias_sesion")
                .select(select)
                .in_("sesion_id", sesion_ids[:40])
                .execute()
            )
            rows = resp.data or []
            break
        except Exception:
            logger.exception("informe asistencia select failed")
            rows = []
    for row in rows:
        sid = str(row.get("sesion_id") or "")
        if sid not in out:
            out[sid] = []
        out.setdefault(sid, []).append(normalizar_asistencia(row))
    for sid, items in out.items():
        items.sort(key=lambda x: (x.get("tipo_key") or 99, x.get("dorsal") or 999))
    return out


def _rpe_por_sesion(supabase, sesion_ids: list[str]) -> dict[str, dict]:
    empty = {sid: agregar_rpe([]) for sid in sesion_ids}
    if not sesion_ids:
        return empty
    rows: list[dict] = []
    for select in (
        "sesion_id, jugador_id, rpe, carga_sesion, duracion_percibida, tipo, "
        "jugadores(nombre, apellidos, dorsal)",
        "sesion_id, jugador_id, rpe, tipo, jugadores(nombre, apellidos, dorsal)",
    ):
        try:
            resp = (
                supabase.table("registros_rpe")
                .select(select)
                .in_("sesion_id", sesion_ids[:40])
                .execute()
            )
            rows = resp.data or []
            break
        except Exception:
            logger.exception("informe rpe select failed")
            rows = []
    by: dict[str, list[dict]] = {sid: [] for sid in sesion_ids}
    for row in rows:
        if row.get("tipo") == "wellness":
            continue
        sid = str(row.get("sesion_id") or "")
        if not sid:
            continue
        jugador = _unwrap(row.get("jugadores"))
        carga = row.get("carga_sesion")
        if carga is None and row.get("rpe") and row.get("duracion_percibida"):
            try:
                carga = float(row["rpe"]) * float(row["duracion_percibida"])
            except (TypeError, ValueError):
                carga = None
        by.setdefault(sid, []).append({
            "jugador_id": str(row.get("jugador_id") or ""),
            "nombre_completo": _nombre(jugador) or "—",
            "dorsal": jugador.get("dorsal"),
            "rpe": row.get("rpe"),
            "carga": carga,
            "min": row.get("duracion_percibida"),
        })
    return {sid: agregar_rpe(items) for sid, items in by.items()}


def _margen_por_sesion(supabase, sesion_ids: list[str]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {sid: [] for sid in sesion_ids}
    if not sesion_ids:
        return out
    try:
        resp = (
            supabase.table("entrenamientos_margen")
            .select(
                "id, sesion_id, objetivo, notas, responsable, estado, fase_recuperacion, "
                "duracion_estimada, rpe_post, registro_medico_id, "
                "jugadores(nombre, apellidos, dorsal, posicion_principal)"
            )
            .in_("sesion_id", sesion_ids[:40])
            .execute()
        )
        ents = resp.data or []
    except Exception:
        logger.exception("informe margen select failed")
        return out

    ent_ids = [str(e["id"]) for e in ents if e.get("id")]
    tareas_by: dict[str, list[dict]] = {eid: [] for eid in ent_ids}
    if ent_ids:
        try:
            t_res = (
                supabase.table("entrenamientos_margen_tareas")
                .select("entrenamiento_margen_id, titulo_custom, descripcion_custom, "
                        "tipo_ejercicio, duracion, series, repeticiones, carga, notas, "
                        "tareas(titulo)")
                .in_("entrenamiento_margen_id", ent_ids)
                .order("orden")
                .execute()
            )
            for t in t_res.data or []:
                eid = str(t.get("entrenamiento_margen_id") or "")
                lib = _unwrap(t.get("tareas"))
                titulo = t.get("titulo_custom") or lib.get("titulo") or "Ejercicio"
                tipo = t.get("tipo_ejercicio") or ""
                tareas_by.setdefault(eid, []).append({
                    "titulo": titulo,
                    "tipo": TIPO_EJERCICIO_MARGEN.get(tipo, tipo.replace("_", " ").title() if tipo else ""),
                    "series": t.get("series"),
                    "reps": t.get("repeticiones"),
                    "duracion": t.get("duracion"),
                    "carga": t.get("carga"),
                    "notas": clip(t.get("notas") or t.get("descripcion_custom") or "", 70),
                })
        except Exception:
            logger.exception("informe margen tareas failed")

    for ent in ents:
        sid = str(ent.get("sesion_id") or "")
        jugador = _unwrap(ent.get("jugadores"))
        out.setdefault(sid, []).append({
            "nombre_completo": _nombre(jugador) or "—",
            "dorsal": jugador.get("dorsal"),
            "objetivo": clip(ent.get("objetivo") or "", 120),
            "notas": clip(ent.get("notas") or "", 100),
            "fase": RTP_LABEL.get(str(ent.get("fase_recuperacion") or ""), "")
            or str(ent.get("fase_recuperacion") or "").replace("_", " "),
            "duracion": ent.get("duracion_estimada"),
            "rpe_post": ent.get("rpe_post"),
            "tareas": tareas_by.get(str(ent.get("id") or ""), []),
        })
    return out


def _lesiones_semana(supabase, equipo_id: str) -> list[dict]:
    """Resumen operativo (sin diagnóstico clínico)."""
    rows: list[dict] = []
    for select in (
        "id, tipo, titulo, estado, disponibilidad, fase_rtp, severidad, "
        "zona_corporal, fecha_inicio, fecha_fin, dias_baja_estimados, "
        "jugadores(nombre, apellidos, dorsal)",
        "id, tipo, titulo, estado, disponibilidad, fase_rtp, "
        "jugadores(nombre, apellidos, dorsal)",
    ):
        try:
            resp = (
                supabase.table("registros_medicos")
                .select(select)
                .eq("equipo_id", equipo_id)
                .in_("estado", ["activo", "en_recuperacion", "cronico"])
                .order("fecha_inicio", desc=True)
                .limit(40)
                .execute()
            )
            rows = resp.data or []
            break
        except Exception:
            logger.exception("informe lesiones select failed")
            rows = []
    out = []
    for r in rows:
        jugador = _unwrap(r.get("jugadores"))
        out.append({
            "nombre_completo": _nombre(jugador) or "—",
            "dorsal": jugador.get("dorsal"),
            "tipo": TIPO_MED_LABEL.get(str(r.get("tipo") or ""), str(r.get("tipo") or "—")),
            "titulo": clip(r.get("titulo") or "", 80),
            "estado": ESTADO_MED_LABEL.get(str(r.get("estado") or ""), str(r.get("estado") or "—")),
            "disponibilidad": DISP_LABEL.get(str(r.get("disponibilidad") or ""), r.get("disponibilidad") or "—"),
            "rtp": RTP_LABEL.get(str(r.get("fase_rtp") or ""), ""),
            "zona": (r.get("zona_corporal") or "").replace("_", " "),
            "severidad": (r.get("severidad") or "").title(),
            "desde": str(r.get("fecha_inicio") or "")[:10],
        })
    return out


def detalle_sesiones(
    supabase,
    sesion_ids: list[str],
) -> tuple[dict[str, list[dict]], dict[str, dict], dict[str, list[dict]]]:
    asistencia = _asistencia_por_sesion(supabase, sesion_ids)
    rpe = _rpe_por_sesion(supabase, sesion_ids)
    margen = _margen_por_sesion(supabase, sesion_ids)
    for sid, filas in asistencia.items():
        fusionar_rpe(filas, (rpe.get(sid) or {}).get("filas") or [])
    return asistencia, rpe, margen
