"""
TrainingHub Pro - Dashboard de Estadísticas Agregadas
Endpoint único que devuelve todas las métricas de la temporada.
"""

import asyncio
import logging
from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, Query
from uuid import UUID

from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/dashboard")
async def estadisticas_dashboard(
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(Permission.PARTIDO_READ)),
):
    """
    Dashboard agregado de estadísticas de la temporada.
    Ejecuta queries en paralelo y devuelve todo consolidado.
    """
    supabase = get_supabase()
    eid = str(equipo_id)

    # ── 6 parallel queries ──────────────────────────────────────
    (
        partidos_resp,
        stats_resp,
        convocatorias_resp,
        jugadores_resp,
        medico_resp,
        sesiones_resp,
    ) = await asyncio.gather(
        # 1. All played matches with rival info
        asyncio.to_thread(
            lambda: supabase.table("partidos")
            .select("id, fecha, jornada, localia, competicion, goles_favor, goles_contra, resultado, rivales(nombre, nombre_corto, escudo_url)")
            .eq("equipo_id", eid)
            .not_.is_("goles_favor", "null")
            .order("fecha")
            .execute()
        ),
        # 2. All match statistics
        asyncio.to_thread(
            lambda: supabase.table("estadisticas_partido")
            .select("*, partidos!inner(equipo_id)")
            .eq("partidos.equipo_id", eid)
            .execute()
        ),
        # 3. All convocatorias with player info
        asyncio.to_thread(
            lambda: supabase.table("convocatorias")
            .select("*, jugadores(nombre, apellidos, dorsal, posicion_principal, foto_url), partidos!inner(equipo_id, fecha)")
            .eq("partidos.equipo_id", eid)
            .execute()
        ),
        # 4. All players (non-invitados)
        asyncio.to_thread(
            lambda: supabase.table("jugadores")
            .select("id, nombre, apellidos, dorsal, posicion_principal, foto_url, estado")
            .eq("equipo_id", eid)
            .eq("es_invitado", False)
            .order("apellidos")
            .execute()
        ),
        # 5. Medical records
        asyncio.to_thread(
            lambda: supabase.table("registros_medicos")
            .select("id, jugador_id, tipo, titulo, estado, fecha_inicio, fecha_fin, fecha_alta, dias_baja_estimados, jugadores(nombre, apellidos)")
            .eq("equipo_id", eid)
            .order("fecha_inicio", desc=True)
            .execute()
        ),
        # 6. Training sessions
        asyncio.to_thread(
            lambda: supabase.table("sesiones")
            .select("id, fecha, match_day, estado, duracion_total, carga_fisica_objetivo, fase_juego_principal")
            .eq("equipo_id", eid)
            .execute()
        ),
    )

    partidos = partidos_resp.data or []
    stats_all = stats_resp.data or []
    convocatorias_all = convocatorias_resp.data or []
    jugadores_all = jugadores_resp.data or []
    medico_all = medico_resp.data or []
    sesiones_all = sesiones_resp.data or []

    # ── Build partido lookup ───────────────────────────────────
    partido_map = {p["id"]: p for p in partidos}
    total_partidos = len(partidos)

    # ── 1. EQUIPO stats ───────────────────────────────────────
    victorias = sum(1 for p in partidos if p.get("resultado") == "victoria")
    empates = sum(1 for p in partidos if p.get("resultado") == "empate")
    derrotas = sum(1 for p in partidos if p.get("resultado") == "derrota")
    gf_total = sum(p.get("goles_favor", 0) or 0 for p in partidos)
    gc_total = sum(p.get("goles_contra", 0) or 0 for p in partidos)

    local_partidos = [p for p in partidos if p.get("localia") == "local"]
    visitante_partidos = [p for p in partidos if p.get("localia") == "visitante"]

    def _localia_stats(matches):
        return {
            "pj": len(matches),
            "pg": sum(1 for m in matches if m.get("resultado") == "victoria"),
            "pe": sum(1 for m in matches if m.get("resultado") == "empate"),
            "pp": sum(1 for m in matches if m.get("resultado") == "derrota"),
            "gf": sum(m.get("goles_favor", 0) or 0 for m in matches),
            "gc": sum(m.get("goles_contra", 0) or 0 for m in matches),
        }

    equipo_data = {
        "total_partidos": total_partidos,
        "victorias": victorias,
        "empates": empates,
        "derrotas": derrotas,
        "goles_favor": gf_total,
        "goles_contra": gc_total,
        "local": _localia_stats(local_partidos),
        "visitante": _localia_stats(visitante_partidos),
    }

    # ── 2. ESTADÍSTICAS ACUMULADAS ────────────────────────────
    stat_fields = [
        "tiros_a_puerta", "ocasiones_gol", "saques_esquina", "penaltis",
        "fueras_juego", "faltas_cometidas", "tarjetas_amarillas", "tarjetas_rojas",
        "balones_perdidos", "balones_recuperados",
        "rival_tiros_a_puerta", "rival_ocasiones_gol", "rival_saques_esquina",
        "rival_penaltis", "rival_fueras_juego", "rival_faltas_cometidas",
        "rival_tarjetas_amarillas", "rival_tarjetas_rojas",
        "rival_balones_perdidos", "rival_balones_recuperados",
    ]

    acumulados = {f: 0 for f in stat_fields}
    partidos_con_stats = 0

    for s in stats_all:
        has_data = any(s.get(f) for f in stat_fields[:10])
        if has_data:
            partidos_con_stats += 1
        for f in stat_fields:
            acumulados[f] += s.get(f, 0) or 0

    promedios = {}
    if partidos_con_stats > 0:
        for f in stat_fields:
            promedios[f] = round(acumulados[f] / partidos_con_stats, 1)

    acumulados["partidos_con_estadisticas"] = partidos_con_stats
    acumulados["promedios"] = promedios

    # ── 3. GOLES analysis ─────────────────────────────────────
    goles_periodo_favor = defaultdict(int)
    goles_periodo_contra = defaultdict(int)
    tipos_favor = defaultdict(int)
    tipos_contra = defaultdict(int)

    for s in stats_all:
        gpp = s.get("goles_por_periodo") or {}
        # goles_por_periodo has keys like "0_20_favor", "0_20_contra", etc.
        # or sometimes just period keys with favor/contra as nested
        for key, val in gpp.items():
            if isinstance(val, (int, float)):
                if "contra" in key:
                    period = key.replace("_contra", "")
                    goles_periodo_contra[period] += int(val)
                elif "favor" in key:
                    period = key.replace("_favor", "")
                    goles_periodo_favor[period] += int(val)
                else:
                    goles_periodo_favor[key] += int(val)

        tgf = s.get("tipos_gol_favor") or {}
        for k, v in tgf.items():
            tipos_favor[k] += int(v) if isinstance(v, (int, float)) else 0

        tgc = s.get("tipos_gol_contra") or {}
        for k, v in tgc.items():
            tipos_contra[k] += int(v) if isinstance(v, (int, float)) else 0

    # Aggregate goal zones + foul map from detailed data
    zonas_favor = defaultdict(int)
    zonas_contra = defaultdict(int)
    faltas_mapa_all_cometidas = []
    faltas_mapa_all_recibidas = []

    for s in stats_all:
        for g in (s.get("goles_detalle_favor") or []):
            zona = g.get("zona", "central")
            zonas_favor[zona] += 1
        for g in (s.get("goles_detalle_contra") or []):
            zona = g.get("zona", "central")
            zonas_contra[zona] += 1
        for f in (s.get("faltas_mapa_cometidas") or []):
            if isinstance(f, dict) and "x" in f and "y" in f:
                faltas_mapa_all_cometidas.append({"x": f["x"], "y": f["y"]})
        for f in (s.get("faltas_mapa_recibidas") or []):
            if isinstance(f, dict) and "x" in f and "y" in f:
                faltas_mapa_all_recibidas.append({"x": f["x"], "y": f["y"]})

    goles_data = {
        "por_periodo_favor": dict(goles_periodo_favor),
        "por_periodo_contra": dict(goles_periodo_contra),
        "tipos_favor": dict(tipos_favor),
        "tipos_contra": dict(tipos_contra),
        "zonas_favor": dict(zonas_favor),
        "zonas_contra": dict(zonas_contra),
        "faltas_mapa": {
            "cometidas": faltas_mapa_all_cometidas,
            "recibidas": faltas_mapa_all_recibidas,
        },
    }

    # ── 4. EVOLUCIÓN POR PARTIDO ──────────────────────────────
    # Build stats lookup by partido_id
    stats_by_partido = {s.get("partido_id"): s for s in stats_all}

    evolucion = []
    for p in partidos:
        rival = p.get("rivales") or {}
        s = stats_by_partido.get(p["id"]) or {}
        evolucion.append({
            "partido_id": p["id"],
            "fecha": p.get("fecha"),
            "jornada": p.get("jornada"),
            "rival_nombre": rival.get("nombre_corto") or rival.get("nombre") or "?",
            "localia": p.get("localia"),
            "goles_favor": p.get("goles_favor", 0),
            "goles_contra": p.get("goles_contra", 0),
            "resultado": p.get("resultado"),
            "tiros_a_puerta": s.get("tiros_a_puerta"),
            "ocasiones_gol": s.get("ocasiones_gol"),
            "saques_esquina": s.get("saques_esquina"),
            "faltas_cometidas": s.get("faltas_cometidas"),
            "tarjetas_amarillas": s.get("tarjetas_amarillas"),
            "tarjetas_rojas": s.get("tarjetas_rojas"),
            "balones_recuperados": s.get("balones_recuperados"),
            "balones_perdidos": s.get("balones_perdidos"),
            "rival_tiros_a_puerta": s.get("rival_tiros_a_puerta"),
            "rival_ocasiones_gol": s.get("rival_ocasiones_gol"),
            "rival_saques_esquina": s.get("rival_saques_esquina"),
            "rival_faltas_cometidas": s.get("rival_faltas_cometidas"),
            "rival_tarjetas_amarillas": s.get("rival_tarjetas_amarillas"),
            "rival_tarjetas_rojas": s.get("rival_tarjetas_rojas"),
        })

    # ── 5. JUGADORES stats ────────────────────────────────────
    # Aggregate convocatorias per player
    player_stats = {}
    for c in convocatorias_all:
        jid = c.get("jugador_id")
        if not jid:
            continue
        if jid not in player_stats:
            jug = c.get("jugadores") or {}
            player_stats[jid] = {
                "jugador_id": jid,
                "nombre": jug.get("nombre", ""),
                "apellidos": jug.get("apellidos", ""),
                "dorsal": jug.get("dorsal"),
                "posicion_principal": jug.get("posicion_principal", ""),
                "foto_url": jug.get("foto_url"),
                "convocatorias": 0,
                "titularidades": 0,
                "minutos_totales": 0,
                "goles": 0,
                "asistencias": 0,
                "amarillas": 0,
                "rojas": 0,
            }
        ps = player_stats[jid]
        ps["convocatorias"] += 1
        if c.get("titular"):
            ps["titularidades"] += 1
        ps["minutos_totales"] += c.get("minutos_jugados", 0) or 0
        ps["goles"] += c.get("goles", 0) or 0
        ps["asistencias"] += c.get("asistencias", 0) or 0
        if c.get("tarjeta_amarilla"):
            ps["amarillas"] += 1
        if c.get("tarjeta_roja"):
            ps["rojas"] += 1

    jugadores_list = []
    for ps in player_stats.values():
        ps["minutos_por_gol"] = (
            round(ps["minutos_totales"] / ps["goles"], 0) if ps["goles"] > 0 else None
        )
        ps["ratio_titular"] = (
            round(ps["titularidades"] / ps["convocatorias"] * 100, 1) if ps["convocatorias"] > 0 else 0
        )
        jugadores_list.append(ps)

    jugadores_list.sort(key=lambda x: x["minutos_totales"], reverse=True)

    # ── 6. ASISTENCIA/CONVOCATORIAS ───────────────────────────
    asistencia = []
    for ps in jugadores_list:
        asistencia.append({
            "jugador_id": ps["jugador_id"],
            "nombre": f"{ps['nombre']} {ps['apellidos']}".strip(),
            "dorsal": ps["dorsal"],
            "total_partidos_jugados": total_partidos,
            "convocatorias": ps["convocatorias"],
            "porcentaje": round(ps["convocatorias"] / total_partidos * 100, 1) if total_partidos > 0 else 0,
        })
    asistencia.sort(key=lambda x: x["porcentaje"], reverse=True)

    # ── 7. MÉDICO ─────────────────────────────────────────────
    hoy = date.today()
    activos = 0
    en_recuperacion = 0
    alta = 0
    dias_baja_totales = 0
    por_tipo = defaultdict(int)
    por_jugador_medico = defaultdict(lambda: {"registros": 0, "dias_baja": 0, "nombre": ""})
    registros_recientes = []

    for r in medico_all:
        estado = r.get("estado", "")
        if estado == "activa":
            activos += 1
        elif estado == "en_recuperacion":
            en_recuperacion += 1
        elif estado == "alta":
            alta += 1

        tipo = r.get("tipo", "otro")
        por_tipo[tipo] += 1

        dias = r.get("dias_baja_estimados", 0) or 0
        if r.get("fecha_inicio") and r.get("fecha_alta"):
            try:
                d1 = date.fromisoformat(r["fecha_inicio"])
                d2 = date.fromisoformat(r["fecha_alta"])
                dias = (d2 - d1).days
            except (ValueError, TypeError):
                pass
        elif r.get("fecha_inicio") and estado != "alta":
            try:
                d1 = date.fromisoformat(r["fecha_inicio"])
                dias = (hoy - d1).days
            except (ValueError, TypeError):
                pass

        dias_baja_totales += dias

        jid = r.get("jugador_id", "")
        jug = r.get("jugadores") or {}
        nombre = f"{jug.get('nombre', '')} {jug.get('apellidos', '')}".strip()
        por_jugador_medico[jid]["registros"] += 1
        por_jugador_medico[jid]["dias_baja"] += dias
        por_jugador_medico[jid]["nombre"] = nombre
        por_jugador_medico[jid]["jugador_id"] = jid

    # Recent records (limit 10)
    for r in medico_all[:10]:
        jug = r.get("jugadores") or {}
        registros_recientes.append({
            "id": r.get("id"),
            "jugador_nombre": f"{jug.get('nombre', '')} {jug.get('apellidos', '')}".strip(),
            "titulo": r.get("titulo"),
            "tipo": r.get("tipo"),
            "estado": r.get("estado"),
            "fecha_inicio": r.get("fecha_inicio"),
            "fecha_alta": r.get("fecha_alta"),
        })

    medico_data = {
        "total_registros": len(medico_all),
        "activos": activos,
        "en_recuperacion": en_recuperacion,
        "alta": alta,
        "dias_baja_totales": dias_baja_totales,
        "por_tipo": dict(por_tipo),
        "por_jugador": sorted(
            [v for v in por_jugador_medico.values()],
            key=lambda x: x["dias_baja"],
            reverse=True,
        ),
        "registros_recientes": registros_recientes,
    }

    # ── 8. SESIONES ───────────────────────────────────────────
    total_sesiones = len(sesiones_all)
    completadas = sum(1 for s in sesiones_all if s.get("estado") == "completada")

    por_match_day = defaultdict(int)
    por_fase_juego = defaultdict(int)
    por_carga = defaultdict(int)
    duraciones = []

    for s in sesiones_all:
        md = s.get("match_day")
        if md:
            por_match_day[md] += 1
        fj = s.get("fase_juego_principal")
        if fj:
            por_fase_juego[fj] += 1
        carga = s.get("carga_fisica_objetivo")
        if carga:
            por_carga[carga] += 1
        dur = s.get("duracion_total")
        if dur:
            duraciones.append(dur)

    sesiones_data = {
        "total": total_sesiones,
        "completadas": completadas,
        "por_match_day": dict(por_match_day),
        "por_fase_juego": dict(por_fase_juego),
        "por_carga": dict(por_carga),
        "duracion_media": round(sum(duraciones) / len(duraciones)) if duraciones else 0,
    }

    return {
        "equipo": equipo_data,
        "estadisticas_acumuladas": acumulados,
        "goles": goles_data,
        "evolucion_partidos": evolucion,
        "jugadores": jugadores_list,
        "asistencia_convocatorias": asistencia,
        "medico": medico_data,
        "sesiones": sesiones_data,
    }
