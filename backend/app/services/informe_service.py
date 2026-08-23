"""Gabinete de informes — dossier PDF con cromado único (escudo + temporada)."""

from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime
from typing import Any, Optional

from app.database import get_supabase
from app.services.informe_boards import (
    as_list,
    bloques_de_tareas,
    clip,
    extract_preview,
    is_poisoned_preview,
    md_chrome,
    parse_grafico,
    weekday,
    _PREVIEW_KEYS,
    _first_preview_uri,
)
from app.services.informe_semana import sintetizar_sala_lunes
from app.services.informe_sesion_detalle import (
    detalle_sesiones,
    _lesiones_semana,
    resumen_asistencia,
)
from app.services.informe_spec import (
    AUDIENCIAS,
    PROFUNIDADES,
    InformeSpec,
    limite_filas,
    narrativa_periodo,
    redactar_lectura_ai,
    spec_from_tipo,
)
from app.services.partido_ambito import AMBITO_LABELS, filtrar_por_ambito
from app.services.pdf_service import _get_jinja_env_v2, _url_to_data_uri

logger = logging.getLogger(__name__)

TIPOS_INFORME = {
    "temporada": "Estadísticas de temporada",
    "plantilla": "Informe de plantilla",
    "jugador": "Ficha extendida de jugador",
    "microciclo": "Informe de microciclo",
    "resultados": "Resultados",
}


def _fmt_fecha(val: Any) -> str:
    if val is None:
        return "—"
    if hasattr(val, "strftime"):
        return val.strftime("%d/%m/%Y")
    s = str(val)[:10]
    try:
        return datetime.strptime(s, "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        return s


def _nombre_jugador(j: dict) -> str:
    return f"{j.get('nombre', '')} {j.get('apellidos', '')}".strip() or "—"


FASE_SESION_LABEL = {
    "activacion": "Activación",
    "desarrollo_1": "Desarrollo 1",
    "desarrollo_2": "Desarrollo 2",
    "desarrollo_3": "Desarrollo 3",
    "desarrollo_4": "Desarrollo 4",
    "desarrollo_5": "Desarrollo 5",
    "desarrollo_6": "Desarrollo 6",
    "vuelta_calma": "Vuelta a calma",
}


def _unwrap_tarea(raw: Any) -> dict:
    if isinstance(raw, list) and raw:
        raw = raw[0]
    return raw if isinstance(raw, dict) else {}


def _preview_de_tarea(supabase, tid: str) -> str:
    """Solo la captura del editor: grafico_url o preview. Sin grafico_data completo."""
    if not tid:
        return ""
    for select in (
        "grafico_url, preview:grafico_data->>preview",
        "grafico_url, preview:grafico_data->preview",
        "grafico_url",
    ):
        try:
            resp = (
                supabase.table("tareas")
                .select(select)
                .eq("id", tid)
                .maybe_single()
                .execute()
            )
            row = resp.data or {}
            photo = extract_preview({"preview": row.get("preview")}, row.get("grafico_url"))
            if photo:
                return photo
        except Exception:
            logger.exception("informe preview json-path failed %s", tid)
    return ""


def _purge_preview_inventada(supabase, tid: str, grafico: dict, grafico_url: Any) -> None:
    """Quita el JPEG inventado para que el editor vuelva a capturar la foto real."""
    if not tid:
        return
    cleaned = {k: v for k, v in grafico.items() if k not in _PREVIEW_KEYS}
    frames = cleaned.get("frames")
    if isinstance(frames, list):
        cleaned["frames"] = [
            {k: v for k, v in fr.items() if k not in _PREVIEW_KEYS} if isinstance(fr, dict) else fr
            for fr in frames
        ]
    payload: dict[str, Any] = {"grafico_data": cleaned}
    if isinstance(grafico_url, str) and grafico_url.startswith("data:image"):
        payload["grafico_url"] = None
    try:
        supabase.table("tareas").update(payload).eq("id", tid).execute()
    except Exception:
        logger.exception("informe purge preview inventada failed %s", tid)


def _foto_pizarra(supabase, t: dict, diagram_id: str) -> str:
    """Captura real del editor. No se redibuja ni se sirve el JPEG inventado."""
    grafico = parse_grafico(t.get("grafico_data"))
    if t.get("preview") and not grafico.get("preview"):
        grafico = {**grafico, "preview": t.get("preview")}
    raw = _first_preview_uri(grafico, t.get("grafico_url"))
    if raw and is_poisoned_preview(raw):
        _purge_preview_inventada(supabase, str(t.get("id") or ""), grafico, t.get("grafico_url"))
        return ""
    photo = extract_preview(grafico, t.get("grafico_url"))
    if photo:
        return photo
    tid = str(t.get("id") or "")
    return _preview_de_tarea(supabase, tid) if tid else ""


def _sesion_tareas_rows(supabase, sid: str) -> list[dict]:
    """Mismo embed que el PDF de sesión (grafico_data via tareas(*))."""
    selects = (
        "sesion_id, orden, fase_sesion, duracion_override, notas, "
        "tareas(id, titulo, duracion_total, densidad, desarrollo, descripcion, "
        "reglas, consignas_ofensivas, consignas_defensivas, "
        "objetivos_tacticos, objetivos_tecnicos, fase_juego, "
        "principio_tactico, modalidad, grafico_url, "
        "preview:grafico_data->>preview, "
        "espacio_largo, espacio_ancho, categorias_tarea(codigo, nombre))",
        "sesion_id, orden, fase_sesion, duracion_override, notas, "
        "tareas(id, titulo, duracion_total, densidad, desarrollo, descripcion, "
        "reglas, consignas_ofensivas, consignas_defensivas, "
        "objetivos_tacticos, objetivos_tecnicos, fase_juego, "
        "principio_tactico, modalidad, grafico_url, "
        "espacio_largo, espacio_ancho, categorias_tarea(codigo, nombre))",
        "sesion_id, orden, fase_sesion, duracion_override, notas, "
        "tareas(id, titulo, duracion_total, desarrollo, descripcion, grafico_url)",
    )
    for select in selects:
        try:
            resp = (
                supabase.table("sesion_tareas")
                .select(select)
                .eq("sesion_id", sid)
                .order("orden")
                .execute()
            )
            return resp.data or []
        except Exception:
            logger.exception("informe sesion_tareas embed failed, retrying simpler select")
    return []


def _tareas_por_sesion(supabase, sesion_ids: list[str], profundidad: str) -> dict[str, list[dict]]:
    """Tareas + foto de pizarra, sesión a sesión como el PDF de vestuario."""
    if not sesion_ids or profundidad == "breve":
        return {}
    by_sesion: dict[str, list[dict]] = {}
    extendido = profundidad == "extendido"
    for sid in sesion_ids[:40]:
        rows = _sesion_tareas_rows(supabase, sid)
        for st in rows:
            t = _unwrap_tarea(st.get("tareas"))
            cat = t.get("categorias_tarea") or {}
            if not isinstance(cat, dict):
                cat = {}
            desc = t.get("desarrollo") or t.get("descripcion") or ""
            obj: list[str] = []
            for key in ("objetivos_tacticos", "objetivos_tecnicos"):
                obj.extend(as_list(t.get(key), 3))
            if t.get("principio_tactico"):
                obj.append(str(t.get("principio_tactico")).replace("_", " "))
            obj = obj[:4]
            consignas_of = as_list(t.get("consignas_ofensivas"), 3)
            consignas_df = as_list(t.get("consignas_defensivas"), 3)
            notas = str(st.get("notas") or "").strip()
            fase_key = st.get("fase_sesion") or ""
            orden = st.get("orden") or 0
            preview_img = _foto_pizarra(supabase, t, diagram_id=f"s{sid[:8]}t{orden}")
            svg_thumb = ""
            espacio = ""
            if t.get("espacio_largo") and t.get("espacio_ancho"):
                try:
                    espacio = f"{int(t['espacio_largo'])}×{int(t['espacio_ancho'])} m"
                except (TypeError, ValueError):
                    espacio = ""
            detalle = ""
            if extendido:
                bits = [clip(desc, 280)]
                if obj:
                    bits.append("Objetivos: " + " · ".join(obj[:4]))
                if notas:
                    bits.append(notas)
                detalle = " ".join(b for b in bits if b)
            by_sesion.setdefault(sid, []).append({
                "orden": orden,
                "fase": FASE_SESION_LABEL.get(
                    fase_key,
                    fase_key.replace("_", " ").title() if fase_key else "—",
                ),
                "titulo": t.get("titulo") or "Tarea",
                "categoria": (cat.get("codigo") or cat.get("nombre") or "").upper(),
                "min": st.get("duracion_override") or t.get("duracion_total") or "",
                "detalle": detalle,
                "resumen": clip(desc, 320 if extendido else 160),
                "objetivos": obj,
                "consignas_of": consignas_of,
                "consignas_df": consignas_df,
                "notas": notas,
                "densidad": t.get("densidad") or "",
                "modalidad": (t.get("modalidad") or "").replace("_", " "),
                "espacio": espacio,
                "preview_img": preview_img,
                "svg_thumbnail": svg_thumb,
                "has_board": bool(preview_img or svg_thumb),
            })
        items = by_sesion.get(sid) or []
        items.sort(key=lambda x: x.get("orden") or 0)
        by_sesion[sid] = items
    return by_sesion


def listar_pizarras_microciclo(supabase, microciclo_id: str) -> list[dict]:
    """Pizarras de la semana sin el JPEG (el front recaptura la foto del editor)."""
    if not microciclo_id:
        return []
    try:
        ses = (
            supabase.table("sesiones")
            .select("id")
            .eq("microciclo_id", microciclo_id)
            .execute()
        )
    except Exception:
        logger.exception("informe pizarras sesiones failed")
        return []
    ids = [str(s["id"]) for s in (ses.data or []) if s.get("id")]
    if not ids:
        return []
    try:
        rows = (
            supabase.table("sesion_tareas")
            .select("tareas(id, grafico_data)")
            .in_("sesion_id", ids)
            .execute()
        )
    except Exception:
        logger.exception("informe pizarras embed failed")
        return []
    out: list[dict] = []
    seen: set[str] = set()
    for row in rows.data or []:
        t = _unwrap_tarea(row.get("tareas"))
        tid = str(t.get("id") or "")
        if not tid or tid in seen:
            continue
        grafico = parse_grafico(t.get("grafico_data"))
        slim = {k: v for k, v in grafico.items() if k not in _PREVIEW_KEYS}
        frames = slim.get("frames")
        if isinstance(frames, list):
            slim["frames"] = [
                {k: v for k, v in fr.items() if k not in _PREVIEW_KEYS} if isinstance(fr, dict) else fr
                for fr in frames
            ]
        has = bool(
            slim.get("elements") or slim.get("arrows") or slim.get("zones") or slim.get("frames")
        )
        if not has:
            continue
        seen.add(tid)
        out.append({"id": tid, "grafico_data": slim})
    return out


def _plantilla_semana(supabase, equipo_id: str) -> Optional[dict]:
    try:
        resp = (
            supabase.table("jugadores")
            .select(
                "id, nombre, apellidos, dorsal, estado, disponibilidad, motivo_baja"
            )
            .eq("equipo_id", equipo_id)
            .eq("es_invitado", False)
            .execute()
        )
        jugadores = resp.data or []
    except Exception:
        logger.exception("informe plantilla semana failed")
        return None

    def _disp(j: dict) -> str:
        return j.get("disponibilidad") or (
            "pleno" if j.get("estado") == "activo"
            else "individual" if j.get("estado") == "en_recuperacion"
            else "fuera"
        )

    lesionados = [
        j for j in jugadores
        if _disp(j) == "fuera" and j.get("estado") in ("lesionado", "enfermo", "baja")
    ]
    return {
        "disponibles": sum(1 for j in jugadores if _disp(j) == "pleno"),
        "lesionados": len(lesionados),
        "en_recuperacion": sum(1 for j in jugadores if _disp(j) == "individual"),
        "por_disponibilidad": {
            "pleno": sum(1 for j in jugadores if _disp(j) == "pleno"),
            "grupo_adaptado": sum(1 for j in jugadores if _disp(j) == "grupo_adaptado"),
            "individual": sum(1 for j in jugadores if _disp(j) == "individual"),
            "fuera": sum(1 for j in jugadores if _disp(j) == "fuera"),
        },
        "jugadores_lesionados": lesionados,
    }


def _reflexion_anterior(supabase, equipo_id: str, fecha_inicio: Any) -> Optional[dict]:
    iso = str(fecha_inicio or "")[:10]
    if not iso:
        return None
    try:
        prev = (
            supabase.table("partidos")
            .select("id, fecha, rivales(nombre, nombre_corto)")
            .eq("equipo_id", equipo_id)
            .lt("fecha", iso)
            .order("fecha", desc=True)
            .limit(1)
            .execute()
        )
        if not prev.data:
            return None
        pp = prev.data[0]
        stats = (
            supabase.table("estadisticas_partido")
            .select("reflexion_entrenador")
            .eq("partido_id", pp["id"])
            .limit(1)
            .execute()
        )
        texto = ""
        if stats.data:
            texto = (stats.data[0].get("reflexion_entrenador") or "").strip()
        if not texto:
            return None
        rival_join = pp.get("rivales") or {}
        return {
            "partido_id": pp["id"],
            "fecha": pp.get("fecha"),
            "rival_nombre": rival_join.get("nombre_corto") or rival_join.get("nombre") or "Rival",
            "texto": texto,
        }
    except Exception:
        logger.exception("informe reflexion anterior failed")
        return None


async def generate_informe_pdf(
    *,
    equipo_id: str,
    organizacion_id: str,
    spec: Optional[InformeSpec] = None,
    tipo: str = "temporada",
    ambito: str = "competicion",
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    jugador_id: Optional[str] = None,
    microciclo_id: Optional[str] = None,
    profundidad: str = "estandar",
) -> tuple[bytes, str]:
    if spec is None:
        spec = spec_from_tipo(
            tipo,
            ambito=ambito,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            jugador_id=jugador_id,
            microciclo_id=microciclo_id,
            profundidad=profundidad,
        )
    spec = spec.normalized()
    ctx = await asyncio.to_thread(_build_context, equipo_id, organizacion_id, spec)
    if spec.asunto != "microciclo" and "narrativa" in spec.secciones and (spec.prompt or spec.profundidad == "extendido"):
        try:
            lectura = await asyncio.wait_for(redactar_lectura_ai(spec, ctx), timeout=10)
            if lectura:
                ctx["narrativa"] = lectura
        except Exception:
            pass

    def _render() -> bytes:
        env = _get_jinja_env_v2()
        html = env.get_template("informe_dossier.html").render(**ctx)
        from weasyprint import HTML
        return HTML(string=html).write_pdf()

    pdf = await asyncio.to_thread(_render)
    stamp = datetime.now().strftime("%Y%m%d")
    filename = f"informe_{spec.asunto}_{spec.profundidad}_{stamp}.pdf"
    return pdf, filename


def _build_context(
    equipo_id: str,
    organizacion_id: str,
    spec: InformeSpec,
) -> dict[str, Any]:
    tipo = spec.asunto
    ambito = spec.ambito
    fecha_desde = spec.fecha_desde
    fecha_hasta = spec.fecha_hasta
    jugador_id = spec.jugador_id
    microciclo_id = spec.microciclo_id
    limite = limite_filas(spec.profundidad)
    supabase = get_supabase()
    org = (
        supabase.table("organizaciones")
        .select("id, nombre, logo_url, color_primario")
        .eq("id", organizacion_id)
        .maybe_single()
        .execute()
    )
    organizacion = org.data or {}
    logo = organizacion.get("logo_url")
    if logo:
        organizacion["logo_url"] = _url_to_data_uri(logo)

    eq = (
        supabase.table("equipos")
        .select("id, nombre, categoria, temporada")
        .eq("id", equipo_id)
        .maybe_single()
        .execute()
    )
    equipo = eq.data or {}

    partidos_q = (
        supabase.table("partidos")
        .select(
            "id, fecha, jornada, localia, competicion, goles_favor, goles_contra, resultado, "
            "rivales(nombre, nombre_corto)"
        )
        .eq("equipo_id", equipo_id)
        .not_.is_("goles_favor", "null")
        .order("fecha")
        .execute()
    )
    partidos_all = partidos_q.data or []

    def _en_rango(p: dict) -> bool:
        iso = str(p.get("fecha") or "")[:10]
        if fecha_desde and iso and iso < fecha_desde.isoformat():
            return False
        if fecha_hasta and iso and iso > fecha_hasta.isoformat():
            return False
        return True

    partidos_rango = [p for p in partidos_all if _en_rango(p)]
    partidos = filtrar_por_ambito(partidos_rango, ambito)
    if spec.ultimos_n:
        partidos = partidos[-spec.ultimos_n :]

    convs: list[dict] = []
    partido_ids = [p.get("id") for p in partidos if p.get("id")]
    if partido_ids:
        try:
            conv_q = (
                supabase.table("convocatorias")
                .select(
                    "jugador_id, partido_id, titular, minutos_jugados, goles, asistencias, "
                    "tarjeta_amarilla, tarjeta_roja, "
                    "partidos(fecha, competicion, resultado, rivales(nombre, nombre_corto))"
                )
                .in_("partido_id", partido_ids[:120])
                .execute()
            )
            convs = conv_q.data or []
        except Exception:
            logger.exception("informe convocatorias query failed")
            convs = []

    jug_q = (
        supabase.table("jugadores")
        .select("id, nombre, apellidos, dorsal, posicion_principal, foto_url, estado")
        .eq("equipo_id", equipo_id)
        .eq("es_invitado", False)
        .order("apellidos")
        .execute()
    )
    jugadores = jug_q.data or []
    by_id = {j["id"]: j for j in jugadores}

    player_rows: list[dict] = []
    buckets: dict[str, dict] = {}
    for c in convs:
        jid = c.get("jugador_id")
        if not jid:
            continue
        if jid not in buckets:
            j = by_id.get(jid) or {}
            buckets[jid] = {
                "nombre": _nombre_jugador(j) or jid,
                "dorsal": j.get("dorsal"),
                "posicion": j.get("posicion_principal") or "",
                "minutos": 0,
                "goles": 0,
                "asistencias": 0,
                "titular": 0,
                "pj": 0,
                "amarillas": 0,
                "rojas": 0,
            }
        b = buckets[jid]
        b["pj"] += 1
        b["minutos"] += c.get("minutos_jugados") or 0
        b["goles"] += c.get("goles") or 0
        b["asistencias"] += c.get("asistencias") or 0
        if c.get("titular"):
            b["titular"] += 1
        if c.get("tarjeta_amarilla"):
            b["amarillas"] += 1
        if c.get("tarjeta_roja"):
            b["rojas"] += 1
    if tipo in ("plantilla", "temporada") or "plantilla" in spec.secciones:
        player_rows = []
        for j in jugadores:
            b = buckets.get(j["id"]) or {
                "nombre": _nombre_jugador(j),
                "dorsal": j.get("dorsal"),
                "posicion": j.get("posicion_principal") or "",
                "minutos": 0,
                "goles": 0,
                "asistencias": 0,
                "titular": 0,
                "pj": 0,
                "amarillas": 0,
                "rojas": 0,
            }
            player_rows.append(b)
        player_rows = sorted(player_rows, key=lambda x: (-x["minutos"], x["nombre"]))
    else:
        player_rows = sorted(buckets.values(), key=lambda x: (-x["minutos"], x["nombre"]))
    player_rows = player_rows[:limite]

    pg = sum(1 for p in partidos if p.get("resultado") == "victoria")
    pe = sum(1 for p in partidos if p.get("resultado") == "empate")
    pp = sum(1 for p in partidos if p.get("resultado") == "derrota")
    gf = sum(p.get("goles_favor") or 0 for p in partidos)
    gc = sum(p.get("goles_contra") or 0 for p in partidos)

    def _split_localia(kind: str) -> dict[str, int]:
        subset = [p for p in partidos if p.get("localia") == kind]
        return {
            "pj": len(subset),
            "pg": sum(1 for p in subset if p.get("resultado") == "victoria"),
            "pe": sum(1 for p in subset if p.get("resultado") == "empate"),
            "pp": sum(1 for p in subset if p.get("resultado") == "derrota"),
            "gf": sum(p.get("goles_favor") or 0 for p in subset),
            "gc": sum(p.get("goles_contra") or 0 for p in subset),
        }

    local = _split_localia("local")
    visitante = _split_localia("visitante")
    racha: list[str] = []
    for p in partidos[-5:]:
        racha.append({"victoria": "V", "empate": "E", "derrota": "D"}.get(p.get("resultado") or "", "·"))

    evolucion = []
    for p in partidos:
        rival = p.get("rivales") or {}
        evolucion.append({
            "fecha": _fmt_fecha(p.get("fecha")),
            "rival": rival.get("nombre_corto") or rival.get("nombre") or "—",
            "localia": p.get("localia") or "",
            "marcador": f"{p.get('goles_favor', 0)}-{p.get('goles_contra', 0)}",
            "resultado": (p.get("resultado") or "")[:1].upper(),
            "competicion": p.get("competicion") or "",
        })

    jugador_ctx = None
    if ("jugador" in spec.secciones or tipo == "jugador") and jugador_id:
        jrow = by_id.get(jugador_id)
        if not jrow:
            jr = (
                supabase.table("jugadores")
                .select("id, nombre, apellidos, dorsal, posicion_principal, foto_url, estado")
                .eq("id", jugador_id)
                .maybe_single()
                .execute()
            )
            jrow = jr.data
        if not jrow:
            raise ValueError("Jugador no encontrado")
        hist = [
            c for c in convs
            if c.get("jugador_id") == jugador_id
        ]
        historial = []
        for c in hist:
            p = c.get("partidos") or {}
            rival = p.get("rivales") or {}
            historial.append({
                "fecha": _fmt_fecha(p.get("fecha")),
                "rival": rival.get("nombre_corto") or rival.get("nombre") or "—",
                "minutos": c.get("minutos_jugados") or 0,
                "goles": c.get("goles") or 0,
                "asistencias": c.get("asistencias") or 0,
                "titular": bool(c.get("titular")),
                "competicion": p.get("competicion") or "",
                "resultado": p.get("resultado") or "",
            })
        stats = buckets.get(jugador_id) or {
            "minutos": 0, "goles": 0, "asistencias": 0, "pj": 0, "titular": 0, "amarillas": 0, "rojas": 0,
        }
        jugador_ctx = {
            "nombre": _nombre_jugador(jrow or {}),
            "dorsal": (jrow or {}).get("dorsal"),
            "posicion": (jrow or {}).get("posicion_principal") or "",
            "estado": (jrow or {}).get("estado") or "",
            "stats": stats,
            "historial": historial[:limite],
        }

    micro_ctx = None
    if ("microciclo" in spec.secciones or tipo == "microciclo") and microciclo_id:
        try:
            mc = (
                supabase.table("microciclos")
                .select(
                    "id, fecha_inicio, fecha_fin, objetivo_principal, objetivo_tactico, objetivo_fisico, "
                    "notas, plan_ct, rival_id, partido_id, equipo_id, "
                    "rivales(nombre, nombre_corto)"
                )
                .eq("id", microciclo_id)
                .maybe_single()
                .execute()
            )
        except Exception:
            logger.exception("informe microciclo select con plan_ct failed")
            mc = (
                supabase.table("microciclos")
                .select(
                    "id, fecha_inicio, fecha_fin, objetivo_principal, objetivo_tactico, objetivo_fisico, "
                    "notas, rivales(nombre, nombre_corto)"
                )
                .eq("id", microciclo_id)
                .maybe_single()
                .execute()
            )
        micro = mc.data or {}
        if not micro.get("id"):
            raise ValueError("Microciclo no encontrado")
        try:
            ses = (
                supabase.table("sesiones")
                .select(
                    "id, titulo, fecha, match_day, duracion_total, objetivo_principal, estado, "
                    "dia_numero, orden, carga_fisica_objetivo, fase_juego_principal, lugar, notas_pre"
                )
                .eq("microciclo_id", microciclo_id)
                .execute()
            )
        except Exception:
            logger.exception("informe sesiones select amplio failed")
            ses = (
                supabase.table("sesiones")
                .select("id, titulo, fecha, match_day, duracion_total, objetivo_principal, estado, dia_numero, orden")
                .eq("microciclo_id", microciclo_id)
                .execute()
            )
        sesiones = sorted(
            ses.data or [],
            key=lambda s: (s.get("dia_numero") or 0, s.get("orden") or 0, str(s.get("fecha") or "")),
        )
        sesion_ids = [str(s["id"]) for s in sesiones if s.get("id")]
        tareas_map = _tareas_por_sesion(supabase, sesion_ids, spec.profundidad)
        asist_map, rpe_map, margen_map = detalle_sesiones(supabase, sesion_ids)
        lesiones = _lesiones_semana(supabase, equipo_id)
        rival = micro.get("rivales") or {}
        ses_rows = []
        n_tareas = 0
        n_boards = 0
        n_presentes_semana = 0
        n_ausentes_semana = 0
        rpe_vals: list[float] = []
        carga_vals: list[float] = []
        for s in sesiones:
            sid = str(s.get("id") or "")
            tareas = tareas_map.get(sid) or []
            n_tareas += len(tareas)
            n_boards += sum(1 for t in tareas if t.get("has_board"))
            asistencia = asist_map.get(sid) or []
            rpe = rpe_map.get(sid) or {}
            margen = margen_map.get(sid) or []
            counts = resumen_asistencia(asistencia)
            n_presentes_semana += counts["n_presente"]
            n_ausentes_semana += counts["n_ausente"]
            if isinstance(rpe.get("rpe_medio"), (int, float)):
                rpe_vals.append(float(rpe["rpe_medio"]))
            if isinstance(rpe.get("carga_total"), (int, float)):
                carga_vals.append(float(rpe["carga_total"]))
            chrome = md_chrome(s.get("match_day"))
            ses_rows.append({
                "fecha": _fmt_fecha(s.get("fecha")),
                "weekday": weekday(s.get("fecha")),
                "titulo": s.get("titulo") or "Sesión",
                "md": s.get("match_day") or "MD",
                "md_bar": chrome["bar"],
                "md_ink": chrome["ink"],
                "md_wash": chrome["wash"],
                "md_label": chrome["label"],
                "md_carga": chrome["carga"],
                "min": s.get("duracion_total") or "",
                "objetivo": s.get("objetivo_principal") or "",
                "estado": s.get("estado") or "",
                "carga": s.get("carga_fisica_objetivo") or chrome["carga"],
                "fase_juego": (s.get("fase_juego_principal") or "").replace("_", " "),
                "lugar": s.get("lugar") or "",
                "notas": s.get("notas_pre") or "",
                "tareas": tareas,
                "bloques": bloques_de_tareas(tareas),
                "n_tareas": len(tareas),
                "n_boards": sum(1 for t in tareas if t.get("has_board")),
                "asistencia": asistencia,
                "margen": margen,
                "rpe_medio": rpe.get("rpe_medio"),
                "carga_total": rpe.get("carga_total"),
                "n_rpe": rpe.get("n") or 0,
                **counts,
            })
        plantilla_semana = _plantilla_semana(supabase, equipo_id)
        reflexion = _reflexion_anterior(
            supabase, equipo_id, micro.get("fecha_inicio")
        )
        sala = sintetizar_sala_lunes(
            micro={
                "rango": f"{_fmt_fecha(micro.get('fecha_inicio'))} – {_fmt_fecha(micro.get('fecha_fin'))}",
                "objetivo": micro.get("objetivo_principal") or "",
                "objetivo_tactico": micro.get("objetivo_tactico") or "",
                "objetivo_fisico": micro.get("objetivo_fisico") or "",
                "notas": micro.get("notas") or "",
                "rival": rival.get("nombre_corto") or rival.get("nombre") or "",
            },
            plan_ct=micro.get("plan_ct") if isinstance(micro.get("plan_ct"), dict) else {},
            sesiones=ses_rows,
            reflexion=reflexion,
            plantilla=plantilla_semana,
        )
        micro_ctx = {
            "rango": f"{_fmt_fecha(micro.get('fecha_inicio'))} – {_fmt_fecha(micro.get('fecha_fin'))}",
            "objetivo": micro.get("objetivo_principal") or "",
            "objetivo_tactico": micro.get("objetivo_tactico") or "",
            "objetivo_fisico": micro.get("objetivo_fisico") or "",
            "notas": micro.get("notas") or "",
            "rival": rival.get("nombre_corto") or rival.get("nombre") or "",
            "n_sesiones": len(ses_rows),
            "n_tareas": n_tareas,
            "n_boards": n_boards,
            "n_presentes": n_presentes_semana,
            "n_ausentes": n_ausentes_semana,
            "rpe_medio": round(sum(rpe_vals) / len(rpe_vals), 1) if rpe_vals else None,
            "carga_semana": round(sum(carga_vals), 1) if carga_vals else None,
            "detalle": spec.profundidad != "breve",
            "extendido": spec.profundidad == "extendido",
            "con_pizarras": spec.profundidad != "breve",
            "sesiones": ses_rows,
            "sala": sala,
            "lesiones": lesiones,
        }

    periodo = "Temporada"
    if spec.ultimos_n:
        periodo = f"Últimos {spec.ultimos_n} partidos"
    elif fecha_desde or fecha_hasta:
        periodo = f"{_fmt_fecha(fecha_desde) if fecha_desde else 'Inicio'} – {_fmt_fecha(fecha_hasta) if fecha_hasta else 'hoy'}"

    resumen = {
        "pj": len(partidos),
        "pg": pg,
        "pe": pe,
        "pp": pp,
        "gf": gf,
        "gc": gc,
        "dg": gf - gc,
        "pts": pg * 3 + pe,
    }
    ambito_label = AMBITO_LABELS.get(ambito, ambito)
    color = organizacion.get("color_primario") or "#1a365d"
    titulo = spec.titulo or TIPOS_INFORME.get(tipo, "Informe")
    if tipo == "microciclo" and not spec.titulo:
        titulo = "Sala del lunes"
    if tipo == "microciclo" and micro_ctx:
        periodo = micro_ctx.get("rango") or periodo
    narrativa = narrativa_periodo(
        resumen,
        ambito_label,
        spec.profundidad,
        spec.audiencia,
        racha=racha,
        local=local,
        visitante=visitante,
    )
    if tipo == "microciclo" and micro_ctx and (micro_ctx.get("sala") or {}).get("mensaje"):
        narrativa = micro_ctx["sala"]["mensaje"]
    return {
        "tipo": tipo,
        "titulo": titulo,
        "organizacion": organizacion,
        "equipo": equipo,
        "color": color,
        "ambito_label": ambito_label,
        "audiencia_label": AUDIENCIAS.get(spec.audiencia, spec.audiencia),
        "profundidad_label": PROFUNIDADES.get(spec.profundidad, spec.profundidad),
        "profundidad": spec.profundidad,
        "periodo": periodo,
        "generado": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "secciones": spec.secciones,
        "resumen": resumen,
        "local": local,
        "visitante": visitante,
        "racha": racha,
        "narrativa": narrativa,
        "prompt": spec.prompt or "",
        "notas": spec.notas or "",
        "evolucion": evolucion[:limite] if spec.profundidad == "breve" else evolucion,
        "plantilla": player_rows,
        "jugador": jugador_ctx,
        "microciclo": micro_ctx,
    }
