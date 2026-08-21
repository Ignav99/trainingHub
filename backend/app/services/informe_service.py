"""Gabinete de informes — dossier PDF con cromado único (escudo + temporada)."""

from __future__ import annotations

import asyncio
from datetime import date, datetime
from typing import Any, Optional

from app.database import get_supabase
from app.services.partido_ambito import (
    AMBITO_LABELS,
    filtrar_por_ambito,
    normalize_ambito,
)
from app.services.pdf_service import _get_jinja_env, _url_to_data_uri

TIPOS_INFORME = {
    "temporada": "Estadísticas de temporada",
    "plantilla": "Informe de plantilla",
    "jugador": "Ficha extendida de jugador",
    "microciclo": "Informe de microciclo",
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


async def generate_informe_pdf(
    *,
    tipo: str,
    equipo_id: str,
    organizacion_id: str,
    ambito: str = "competicion",
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    jugador_id: Optional[str] = None,
    microciclo_id: Optional[str] = None,
) -> tuple[bytes, str]:
    tipo = (tipo or "temporada").strip().lower()
    if tipo not in TIPOS_INFORME:
        raise ValueError("Plantilla de informe no válida")
    ambito_n = normalize_ambito(ambito)
    ctx = await asyncio.to_thread(
        _build_context,
        tipo,
        equipo_id,
        organizacion_id,
        ambito_n,
        fecha_desde,
        fecha_hasta,
        jugador_id,
        microciclo_id,
    )

    def _render() -> bytes:
        env = _get_jinja_env()
        html = env.get_template("informe_dossier.html").render(**ctx)
        from weasyprint import HTML
        return HTML(string=html).write_pdf()

    pdf = await asyncio.to_thread(_render)
    stamp = datetime.now().strftime("%Y%m%d")
    filename = f"informe_{tipo}_{stamp}.pdf"
    return pdf, filename


def _build_context(
    tipo: str,
    equipo_id: str,
    organizacion_id: str,
    ambito: str,
    fecha_desde: Optional[date],
    fecha_hasta: Optional[date],
    jugador_id: Optional[str],
    microciclo_id: Optional[str],
) -> dict[str, Any]:
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

    conv_q = (
        supabase.table("convocatorias")
        .select(
            "jugador_id, titular, minutos_jugados, goles, asistencias, tarjeta_amarilla, tarjeta_roja, "
            "partidos!inner(equipo_id, fecha, competicion, resultado, rivales(nombre, nombre_corto))"
        )
        .eq("partidos.equipo_id", equipo_id)
        .execute()
    )
    convs_raw = conv_q.data or []
    convs = []
    for c in convs_raw:
        p = c.get("partidos") or {}
        if not _en_rango({"fecha": p.get("fecha")}):
            continue
        convs.append(c)
    convs = filtrar_por_ambito(convs, ambito)

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
    if tipo == "plantilla":
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

    pg = sum(1 for p in partidos if p.get("resultado") == "victoria")
    pe = sum(1 for p in partidos if p.get("resultado") == "empate")
    pp = sum(1 for p in partidos if p.get("resultado") == "derrota")
    gf = sum(p.get("goles_favor") or 0 for p in partidos)
    gc = sum(p.get("goles_contra") or 0 for p in partidos)

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
    if tipo == "jugador" and jugador_id:
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
            "historial": historial,
        }

    micro_ctx = None
    if tipo == "microciclo" and microciclo_id:
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
        ses = (
            supabase.table("sesiones")
            .select("titulo, fecha, match_day, duracion_total, objetivo_principal, estado, dia_numero, orden")
            .eq("microciclo_id", microciclo_id)
            .execute()
        )
        sesiones = sorted(ses.data or [], key=lambda s: (s.get("dia_numero") or 0, s.get("orden") or 0))
        rival = micro.get("rivales") or {}
        micro_ctx = {
            "rango": f"{_fmt_fecha(micro.get('fecha_inicio'))} – {_fmt_fecha(micro.get('fecha_fin'))}",
            "objetivo": micro.get("objetivo_principal") or "",
            "objetivo_tactico": micro.get("objetivo_tactico") or "",
            "objetivo_fisico": micro.get("objetivo_fisico") or "",
            "notas": micro.get("notas") or "",
            "rival": rival.get("nombre_corto") or rival.get("nombre") or "",
            "sesiones": [
                {
                    "fecha": _fmt_fecha(s.get("fecha")),
                    "titulo": s.get("titulo") or "Sesión",
                    "md": s.get("match_day") or "",
                    "min": s.get("duracion_total") or "",
                    "objetivo": s.get("objetivo_principal") or "",
                    "estado": s.get("estado") or "",
                }
                for s in sesiones
            ],
        }

    periodo = "Temporada"
    if fecha_desde or fecha_hasta:
        periodo = f"{_fmt_fecha(fecha_desde) if fecha_desde else 'Inicio'} – {_fmt_fecha(fecha_hasta) if fecha_hasta else 'hoy'}"

    color = organizacion.get("color_primario") or "#1a365d"
    return {
        "tipo": tipo,
        "titulo": TIPOS_INFORME[tipo],
        "organizacion": organizacion,
        "equipo": equipo,
        "color": color,
        "ambito_label": AMBITO_LABELS.get(ambito, ambito),
        "periodo": periodo,
        "generado": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "resumen": {
            "pj": len(partidos),
            "pg": pg,
            "pe": pe,
            "pp": pp,
            "gf": gf,
            "gc": gc,
            "dg": gf - gc,
        },
        "evolucion": evolucion,
        "plantilla": player_rows,
        "jugador": jugador_ctx,
        "microciclo": micro_ctx,
    }
