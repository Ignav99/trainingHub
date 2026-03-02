"""
TrainingHub Pro - Router de Dashboard
Endpoints de datos agregados para el panel principal.
"""

import logging

from fastapi import APIRouter, Depends, Query
from typing import Optional
from uuid import UUID
from datetime import date, timedelta

from app.database import get_supabase
from app.dependencies import require_permission, AuthContext
from app.security.permissions import Permission

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/resumen")
async def dashboard_resumen(
    equipo_id: Optional[UUID] = None,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """
    Resumen general del dashboard:
    - Contadores principales
    - Próximo partido
    - Última sesión
    - Estado de plantilla
    """
    supabase = get_supabase()
    org_id = auth.organizacion_id

    # Obtener equipos de la organización
    equipos_resp = supabase.table("equipos").select("id, nombre, categoria").eq(
        "organizacion_id", org_id
    ).eq("activo", True).execute()

    equipo_ids = [e["id"] for e in equipos_resp.data]

    if equipo_id:
        equipo_ids = [str(equipo_id)]

    if not equipo_ids:
        return {
            "equipos": 0,
            "jugadores": 0,
            "sesiones_mes": 0,
            "partidos_pendientes": 0,
            "proximo_partido": None,
            "ultima_sesion": None,
        }

    # Contadores en paralelo conceptual (secuencial por API sync)
    jugadores = supabase.table("jugadores").select(
        "id", count="exact"
    ).in_("equipo_id", equipo_ids).limit(0).execute()

    hoy = date.today()
    inicio_mes = hoy.replace(day=1)

    sesiones_mes = supabase.table("sesiones").select(
        "id", count="exact"
    ).in_("equipo_id", equipo_ids).gte(
        "fecha", inicio_mes.isoformat()
    ).limit(0).execute()

    partidos_pendientes = supabase.table("partidos").select(
        "id", count="exact"
    ).in_("equipo_id", equipo_ids).gte(
        "fecha", hoy.isoformat()
    ).is_("goles_favor", "null").limit(0).execute()

    # Próximo partido
    proximo = supabase.table("partidos").select(
        "*, rivales(nombre, nombre_corto, escudo_url)"
    ).in_("equipo_id", equipo_ids).gte(
        "fecha", hoy.isoformat()
    ).is_("goles_favor", "null").order("fecha").limit(1).execute()

    proximo_partido = None
    if proximo.data:
        p = proximo.data[0]
        p["rival"] = p.pop("rivales", None)
        proximo_partido = p

    # Última sesión
    ultima = supabase.table("sesiones").select(
        "id, titulo, fecha, match_day, estado"
    ).in_("equipo_id", equipo_ids).order(
        "fecha", desc=True
    ).limit(1).execute()

    ultima_sesion = ultima.data[0] if ultima.data else None

    return {
        "equipos": len(equipos_resp.data),
        "jugadores": jugadores.count or 0,
        "sesiones_mes": sesiones_mes.count or 0,
        "partidos_pendientes": partidos_pendientes.count or 0,
        "proximo_partido": proximo_partido,
        "ultima_sesion": ultima_sesion,
    }


@router.get("/semana")
async def dashboard_semana(
    equipo_id: Optional[UUID] = None,
    fecha_referencia: Optional[date] = None,
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """
    Vista semanal: sesiones y partidos de la semana actual.
    Ideal para el calendario del dashboard.
    """
    supabase = get_supabase()
    org_id = auth.organizacion_id

    if not fecha_referencia:
        fecha_referencia = date.today()

    # Calcular lunes y domingo de la semana
    lunes = fecha_referencia - timedelta(days=fecha_referencia.weekday())
    domingo = lunes + timedelta(days=6)

    # Obtener equipos
    if equipo_id:
        equipo_ids = [str(equipo_id)]
    else:
        equipos_resp = supabase.table("equipos").select("id").eq(
            "organizacion_id", org_id
        ).eq("activo", True).execute()
        equipo_ids = [e["id"] for e in equipos_resp.data]

    if not equipo_ids:
        return {"sesiones": [], "partidos": [], "semana": {"inicio": lunes.isoformat(), "fin": domingo.isoformat()}}

    # Sesiones de la semana
    sesiones = supabase.table("sesiones").select(
        "id, titulo, fecha, match_day, estado, duracion_total"
    ).in_("equipo_id", equipo_ids).gte(
        "fecha", lunes.isoformat()
    ).lte("fecha", domingo.isoformat()).order("fecha").execute()

    # Partidos de la semana
    partidos = supabase.table("partidos").select(
        "id, fecha, hora, localia, competicion, goles_favor, goles_contra, resultado, rivales(nombre, nombre_corto)"
    ).in_("equipo_id", equipo_ids).gte(
        "fecha", lunes.isoformat()
    ).lte("fecha", domingo.isoformat()).order("fecha").execute()

    for p in partidos.data:
        p["rival"] = p.pop("rivales", None)

    return {
        "sesiones": sesiones.data,
        "partidos": partidos.data,
        "semana": {
            "inicio": lunes.isoformat(),
            "fin": domingo.isoformat(),
        }
    }


@router.get("/plantilla")
async def dashboard_plantilla(
    equipo_id: UUID = Query(...),
    auth: AuthContext = Depends(require_permission(Permission.PLANTILLA_READ)),
):
    """
    Estado de la plantilla: disponibilidad, lesionados, etc.
    """
    supabase = get_supabase()

    response = supabase.table("jugadores").select(
        "id, nombre, apellidos, dorsal, posicion_principal, estado, "
        "fecha_lesion, fecha_vuelta_estimada, es_convocable, foto_url, "
        "nivel_tecnico, nivel_tactico, nivel_fisico, nivel_mental"
    ).eq("equipo_id", str(equipo_id)).order("apellidos").execute()

    jugadores = response.data
    total = len(jugadores)

    # Agrupar por estado
    por_estado = {}
    for j in jugadores:
        est = j.get("estado", "activo")
        if est not in por_estado:
            por_estado[est] = []
        por_estado[est].append(j)

    disponibles = len(por_estado.get("activo", []))
    lesionados = por_estado.get("lesionado", [])
    sancionados = por_estado.get("sancionado", [])

    return {
        "total": total,
        "disponibles": disponibles,
        "lesionados": len(lesionados),
        "sancionados": len(sancionados),
        "no_disponibles": total - disponibles,
        "por_estado": {k: len(v) for k, v in por_estado.items()},
        "jugadores_lesionados": lesionados,
        "jugadores_sancionados": sancionados,
    }


@router.get("/carga-semanal")
async def dashboard_carga_semanal(
    equipo_id: UUID = Query(...),
    semanas: int = Query(4, ge=1, le=12),
    auth: AuthContext = Depends(require_permission(Permission.RPE_READ)),
):
    """
    Evolución de carga semanal del equipo (RPE promedio por semana).
    """
    supabase = get_supabase()

    hoy = date.today()
    fecha_inicio = hoy - timedelta(weeks=semanas)

    # Obtener jugadores del equipo
    jugadores = supabase.table("jugadores").select("id").eq(
        "equipo_id", str(equipo_id)
    ).execute()

    jugador_ids = [j["id"] for j in jugadores.data]

    if not jugador_ids:
        return {"semanas": [], "promedio_global": None}

    # Obtener registros RPE
    registros = supabase.table("registros_rpe").select(
        "fecha, rpe, carga_sesion"
    ).in_("jugador_id", jugador_ids).gte(
        "fecha", fecha_inicio.isoformat()
    ).order("fecha").execute()

    # Agrupar por semana
    semanas_data = {}
    for r in registros.data:
        fecha_r = date.fromisoformat(r["fecha"])
        lunes = fecha_r - timedelta(days=fecha_r.weekday())
        semana_key = lunes.isoformat()

        if semana_key not in semanas_data:
            semanas_data[semana_key] = {"rpe_vals": [], "carga_vals": []}

        semanas_data[semana_key]["rpe_vals"].append(r["rpe"])
        if r.get("carga_sesion"):
            semanas_data[semana_key]["carga_vals"].append(float(r["carga_sesion"]))

    resultado = []
    for semana_key in sorted(semanas_data.keys()):
        data = semanas_data[semana_key]
        resultado.append({
            "semana_inicio": semana_key,
            "rpe_promedio": round(sum(data["rpe_vals"]) / len(data["rpe_vals"]), 1),
            "carga_promedio": round(sum(data["carga_vals"]) / len(data["carga_vals"]), 1) if data["carga_vals"] else None,
            "num_registros": len(data["rpe_vals"]),
        })

    global_rpe = [r["rpe_promedio"] for r in resultado]
    promedio_global = round(sum(global_rpe) / len(global_rpe), 1) if global_rpe else None

    return {"semanas": resultado, "promedio_global": promedio_global}


@router.get("/actividad-reciente")
async def dashboard_actividad_reciente(
    limit: int = Query(10, ge=1, le=50),
    auth: AuthContext = Depends(require_permission(Permission.SESSION_READ)),
):
    """
    Actividad reciente: últimas acciones relevantes.
    """
    supabase = get_supabase()
    org_id = auth.organizacion_id

    equipos_resp = supabase.table("equipos").select("id").eq(
        "organizacion_id", org_id
    ).execute()
    equipo_ids = [e["id"] for e in equipos_resp.data]

    actividad = []

    if equipo_ids:
        # Últimas sesiones creadas
        sesiones = supabase.table("sesiones").select(
            "id, titulo, fecha, estado, created_at"
        ).in_("equipo_id", equipo_ids).order(
            "created_at", desc=True
        ).limit(5).execute()

        for s in sesiones.data:
            actividad.append({
                "tipo": "sesion",
                "titulo": s["titulo"],
                "detalle": f"Sesión {s.get('estado', '')} - {s.get('fecha', '')}",
                "fecha": s["created_at"],
                "entidad_id": s["id"],
            })

        # Últimos partidos con resultado
        partidos = supabase.table("partidos").select(
            "id, fecha, goles_favor, goles_contra, resultado, updated_at, rivales(nombre)"
        ).in_("equipo_id", equipo_ids).not_.is_(
            "goles_favor", "null"
        ).order("updated_at", desc=True).limit(5).execute()

        for p in partidos.data:
            rival = p.get("rivales", {})
            actividad.append({
                "tipo": "partido",
                "titulo": f"vs {rival.get('nombre', '?')}",
                "detalle": f"{p.get('goles_favor', 0)}-{p.get('goles_contra', 0)} ({p.get('resultado', '')})",
                "fecha": p["updated_at"],
                "entidad_id": p["id"],
            })

    # Ordenar por fecha
    actividad.sort(key=lambda x: x["fecha"], reverse=True)

    return {"data": actividad[:limit]}


# ============================================
# AI USAGE ANALYTICS
# ============================================

# Anthropic pricing (per million tokens) — Claude Sonnet 4.5
# https://docs.anthropic.com/en/docs/about-claude/models
PRICING = {
    "claude-sonnet-4-5-20250929": {
        "input_per_mtok": 3.00,        # $3 per 1M input tokens
        "output_per_mtok": 15.00,      # $15 per 1M output tokens
        "cache_read_per_mtok": 0.30,   # $0.30 per 1M cached input tokens (90% discount)
        "cache_write_per_mtok": 3.75,  # $3.75 per 1M cache creation tokens (25% premium)
    },
    "gemini_embedding": {
        "per_1k_chars": 0.0,           # text-embedding-004 is free tier for most usage
    },
}
DEFAULT_MODEL = "claude-sonnet-4-5-20250929"


def _calculate_cost_usd(
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int = 0,
    cache_creation_tokens: int = 0,
    model: str = DEFAULT_MODEL,
) -> dict:
    """Calculate cost in USD from token counts."""
    prices = PRICING.get(model, PRICING[DEFAULT_MODEL])

    # Regular input tokens = total input - cache_read - cache_creation
    regular_input = max(0, input_tokens - cache_read_tokens - cache_creation_tokens)

    cost_regular_input = regular_input / 1_000_000 * prices["input_per_mtok"]
    cost_output = output_tokens / 1_000_000 * prices["output_per_mtok"]
    cost_cache_read = cache_read_tokens / 1_000_000 * prices["cache_read_per_mtok"]
    cost_cache_write = cache_creation_tokens / 1_000_000 * prices["cache_write_per_mtok"]

    total = cost_regular_input + cost_output + cost_cache_read + cost_cache_write

    # What it would have cost WITHOUT caching (all input at full price)
    cost_without_cache = input_tokens / 1_000_000 * prices["input_per_mtok"] + cost_output
    cache_savings = cost_without_cache - total

    return {
        "total_usd": round(total, 4),
        "regular_input_usd": round(cost_regular_input, 4),
        "output_usd": round(cost_output, 4),
        "cache_read_usd": round(cost_cache_read, 4),
        "cache_write_usd": round(cost_cache_write, 4),
        "sin_cache_usd": round(cost_without_cache, 4),
        "ahorro_cache_usd": round(cache_savings, 4),
    }


@router.get("/ai-usage")
async def dashboard_ai_usage(
    meses: int = Query(3, ge=1, le=12, description="Meses de historico"),
    auth: AuthContext = Depends(require_permission(Permission.AI_USE)),
):
    """
    Estudio de uso de IA de la organizacion.

    Devuelve metricas reales desglosadas por mes:
    - Conversaciones y mensajes
    - Tokens consumidos (input, output, cache)
    - Coste estimado en USD con precios reales de Anthropic
    - Ahorro real por prompt caching
    - Uso por equipo y por usuario
    - Herramientas mas usadas
    - Proyeccion mensual
    """
    supabase = get_supabase()
    org_id = auth.organizacion_id

    hoy = date.today()
    desde = (hoy.replace(day=1) - timedelta(days=30 * meses)).isoformat()

    # ------- 1. Get all users in this org -------
    usuarios = supabase.table("usuarios").select("id, nombre, apellidos, email").eq(
        "organizacion_id", org_id
    ).execute()
    user_ids = [u["id"] for u in usuarios.data]
    user_map = {u["id"]: f"{u['nombre']} {u.get('apellidos', '')}".strip() for u in usuarios.data}

    if not user_ids:
        return _empty_usage_response()

    # ------- 2. Get all conversations for these users -------
    conversaciones = supabase.table("ai_conversaciones").select(
        "id, usuario_id, equipo_id, created_at"
    ).in_("usuario_id", user_ids).gte("created_at", desde).execute()

    conv_ids = [c["id"] for c in conversaciones.data]
    conv_user_map = {c["id"]: c["usuario_id"] for c in conversaciones.data}
    conv_equipo_map = {c["id"]: c.get("equipo_id") for c in conversaciones.data}

    if not conv_ids:
        return _empty_usage_response()

    # ------- 3. Get all assistant messages with token data -------
    # Fetch in batches if many conversations
    all_messages = []
    for i in range(0, len(conv_ids), 50):
        batch_ids = conv_ids[i:i + 50]
        msgs = supabase.table("ai_mensajes").select(
            "id, conversacion_id, rol, tokens_input, tokens_output, "
            "cache_read_input_tokens, cache_creation_input_tokens, "
            "herramientas_usadas, feedback, created_at"
        ).in_("conversacion_id", batch_ids).eq("rol", "assistant").execute()
        all_messages.extend(msgs.data)

    # ------- 4. Aggregate by month -------
    monthly: dict[str, dict] = {}
    for msg in all_messages:
        mes_key = msg["created_at"][:7]  # "YYYY-MM"
        if mes_key not in monthly:
            monthly[mes_key] = {
                "mes": mes_key,
                "mensajes": 0,
                "conversaciones": set(),
                "usuarios": set(),
                "equipos": set(),
                "tokens_input": 0,
                "tokens_output": 0,
                "cache_read": 0,
                "cache_creation": 0,
                "tools_count": 0,
                "feedback_pos": 0,
                "feedback_neg": 0,
                "tools_detail": {},
            }

        m = monthly[mes_key]
        conv_id = msg["conversacion_id"]
        m["mensajes"] += 1
        m["conversaciones"].add(conv_id)
        m["usuarios"].add(conv_user_map.get(conv_id, "?"))

        equipo_id = conv_equipo_map.get(conv_id)
        if equipo_id:
            m["equipos"].add(equipo_id)

        m["tokens_input"] += msg.get("tokens_input") or 0
        m["tokens_output"] += msg.get("tokens_output") or 0
        m["cache_read"] += msg.get("cache_read_input_tokens") or 0
        m["cache_creation"] += msg.get("cache_creation_input_tokens") or 0

        herramientas = msg.get("herramientas_usadas") or []
        if herramientas:
            m["tools_count"] += len(herramientas)
            for h in herramientas:
                name = h.get("nombre", "desconocida")
                m["tools_detail"][name] = m["tools_detail"].get(name, 0) + 1

        if msg.get("feedback") == "positivo":
            m["feedback_pos"] += 1
        elif msg.get("feedback") == "negativo":
            m["feedback_neg"] += 1

    # ------- 5. Build response -------
    meses_data = []
    totals = {
        "mensajes": 0, "conversaciones": 0, "tokens_input": 0, "tokens_output": 0,
        "cache_read": 0, "cache_creation": 0, "coste_usd": 0, "sin_cache_usd": 0,
    }

    for mes_key in sorted(monthly.keys()):
        m = monthly[mes_key]
        cost = _calculate_cost_usd(
            m["tokens_input"], m["tokens_output"],
            m["cache_read"], m["cache_creation"],
        )

        mes_result = {
            "mes": m["mes"],
            "conversaciones": len(m["conversaciones"]),
            "mensajes_ia": m["mensajes"],
            "usuarios_activos": len(m["usuarios"]),
            "equipos_activos": len(m["equipos"]),
            "tokens": {
                "input": m["tokens_input"],
                "output": m["tokens_output"],
                "cache_read": m["cache_read"],
                "cache_creation": m["cache_creation"],
                "total": m["tokens_input"] + m["tokens_output"],
            },
            "coste": cost,
            "tools": {
                "total_calls": m["tools_count"],
                "detalle": dict(sorted(m["tools_detail"].items(), key=lambda x: -x[1])),
            },
            "feedback": {
                "positivo": m["feedback_pos"],
                "negativo": m["feedback_neg"],
            },
        }
        meses_data.append(mes_result)

        totals["mensajes"] += m["mensajes"]
        totals["conversaciones"] += len(m["conversaciones"])
        totals["tokens_input"] += m["tokens_input"]
        totals["tokens_output"] += m["tokens_output"]
        totals["cache_read"] += m["cache_read"]
        totals["cache_creation"] += m["cache_creation"]
        totals["coste_usd"] += cost["total_usd"]
        totals["sin_cache_usd"] += cost["sin_cache_usd"]

    # ------- 6. Per-user breakdown -------
    uso_por_usuario = {}
    for msg in all_messages:
        uid = conv_user_map.get(msg["conversacion_id"], "?")
        if uid not in uso_por_usuario:
            uso_por_usuario[uid] = {"nombre": user_map.get(uid, "?"), "mensajes": 0, "tokens": 0}
        uso_por_usuario[uid]["mensajes"] += 1
        uso_por_usuario[uid]["tokens"] += (msg.get("tokens_input") or 0) + (msg.get("tokens_output") or 0)

    usuarios_ranking = sorted(uso_por_usuario.values(), key=lambda x: -x["tokens"])

    # ------- 7. Projection -------
    num_meses = len(meses_data) or 1
    proyeccion_mensual = {
        "mensajes_estimados": round(totals["mensajes"] / num_meses),
        "coste_estimado_usd": round(totals["coste_usd"] / num_meses, 2),
        "coste_sin_cache_usd": round(totals["sin_cache_usd"] / num_meses, 2),
    }

    total_cost = _calculate_cost_usd(
        totals["tokens_input"], totals["tokens_output"],
        totals["cache_read"], totals["cache_creation"],
    )

    return {
        "periodo": {"desde": desde, "hasta": hoy.isoformat(), "meses": len(meses_data)},
        "resumen": {
            "total_conversaciones": totals["conversaciones"],
            "total_mensajes_ia": totals["mensajes"],
            "total_tokens": totals["tokens_input"] + totals["tokens_output"],
            "coste_total": total_cost,
        },
        "por_mes": meses_data,
        "por_usuario": usuarios_ranking[:20],
        "proyeccion_mensual": proyeccion_mensual,
        "precios_referencia": {
            "modelo": DEFAULT_MODEL,
            "input_por_millon": PRICING[DEFAULT_MODEL]["input_per_mtok"],
            "output_por_millon": PRICING[DEFAULT_MODEL]["output_per_mtok"],
            "cache_read_por_millon": PRICING[DEFAULT_MODEL]["cache_read_per_mtok"],
            "cache_write_por_millon": PRICING[DEFAULT_MODEL]["cache_write_per_mtok"],
            "nota": "Precios en USD, segun pricing oficial de Anthropic",
        },
    }


def _empty_usage_response():
    """Return empty response when there's no data."""
    return {
        "periodo": {"desde": None, "hasta": None, "meses": 0},
        "resumen": {
            "total_conversaciones": 0,
            "total_mensajes_ia": 0,
            "total_tokens": 0,
            "coste_total": {"total_usd": 0, "ahorro_cache_usd": 0},
        },
        "por_mes": [],
        "por_usuario": [],
        "proyeccion_mensual": {
            "mensajes_estimados": 0,
            "coste_estimado_usd": 0,
            "coste_sin_cache_usd": 0,
        },
        "precios_referencia": {
            "modelo": DEFAULT_MODEL,
            "nota": "Sin datos de uso todavia",
        },
    }
