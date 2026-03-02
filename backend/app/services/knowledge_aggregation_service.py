"""
TrainingHub Pro - Knowledge Aggregation Service
Agrega patrones anonimizados de todas las organizaciones
para generar conocimiento compartido (mejores practicas).

Designed to run as a nightly job (e.g., via cron or scheduled task).
"""

import json
import logging
from datetime import datetime, timedelta
from collections import Counter

from app.database import get_supabase

logger = logging.getLogger(__name__)


def aggregate_session_patterns():
    """
    Agrega patrones de sesiones de todas las organizaciones.
    Genera conocimiento como:
    - "70% de los entrenadores usan SSG en desarrollo_1 en MD-4"
    - "La duracion media de activacion es 12 min"
    - "Los coaching points mas comunes para RND son..."
    """
    supabase = get_supabase()

    # Get sessions from the last 90 days with their tasks
    since = (datetime.utcnow() - timedelta(days=90)).isoformat()

    sessions = supabase.table("sesiones").select(
        "id, match_day, estado, duracion_total, "
        "sesiones_tareas(fase_sesion, duracion_override, "
        "tareas(categoria_id, categorias_tarea(codigo), fase_juego, principio_tactico, duracion_total))"
    ).gte("fecha", since).eq("estado", "completada").execute()

    if not sessions.data:
        logger.info("No completed sessions found for aggregation")
        return

    # Aggregate patterns
    md_category_counts: dict[str, Counter] = {}  # {match_day: Counter({fase_sesion:categoria: count})}
    md_duration_sums: dict[str, list] = {}

    for session in sessions.data:
        md = session.get("match_day")
        if not md:
            continue

        if md not in md_category_counts:
            md_category_counts[md] = Counter()
        if md not in md_duration_sums:
            md_duration_sums[md] = []

        dur = session.get("duracion_total")
        if dur:
            md_duration_sums[md].append(dur)

        for st in (session.get("sesiones_tareas") or []):
            tarea = st.get("tareas") or {}
            cat = tarea.get("categorias_tarea") or {}
            cat_code = cat.get("codigo", "?")
            fase = st.get("fase_sesion", "?")
            key = f"{fase}:{cat_code}"
            md_category_counts[md][key] += 1

    # Build global knowledge entries
    patterns = []

    for md, counter in md_category_counts.items():
        total = sum(counter.values())
        if total < 5:
            continue  # Not enough data

        top_combos = counter.most_common(5)
        for combo, count in top_combos:
            fase, cat = combo.split(":", 1)
            pct = round(count / total * 100)
            if pct < 10:
                continue

            patterns.append({
                "tipo": "match_day_pattern",
                "match_day": md,
                "categoria_codigo": cat,
                "fase_juego": None,
                "contenido": {
                    "fase_sesion": fase,
                    "categoria": cat,
                    "porcentaje_uso": pct,
                    "total_sesiones": total,
                    "descripcion": f"{pct}% de las sesiones en {md} usan {cat} en {fase}",
                },
                "frecuencia": count,
                "confianza": min(round(pct / 100, 2), 0.99),
            })

    # Duration patterns
    for md, durations in md_duration_sums.items():
        if len(durations) < 5:
            continue
        avg_dur = round(sum(durations) / len(durations))
        patterns.append({
            "tipo": "estructura_sesion",
            "match_day": md,
            "categoria_codigo": None,
            "fase_juego": None,
            "contenido": {
                "duracion_media": avg_dur,
                "num_sesiones": len(durations),
                "descripcion": f"Duracion media de sesion en {md}: {avg_dur} min ({len(durations)} sesiones)",
            },
            "frecuencia": len(durations),
            "confianza": min(round(len(durations) / 50, 2), 0.99),
        })

    if not patterns:
        logger.info("No patterns generated from aggregation")
        return

    # Upsert into conocimiento_global
    # Clear old patterns of same types and re-insert
    supabase.table("conocimiento_global").delete().in_(
        "tipo", ["match_day_pattern", "estructura_sesion"]
    ).execute()

    # Insert in batches
    for i in range(0, len(patterns), 20):
        batch = patterns[i:i + 20]
        supabase.table("conocimiento_global").insert(batch).execute()

    logger.info(f"Knowledge aggregation complete: {len(patterns)} patterns generated")
    return len(patterns)


def get_best_practices(
    match_day: str = None,
    categoria: str = None,
    tipo: str = None,
    limite: int = 10,
) -> list[dict]:
    """
    Query global knowledge for best practices.
    Used by the Claude tool 'consultar_mejores_practicas'.
    """
    supabase = get_supabase()

    query = supabase.table("conocimiento_global").select("*")

    if tipo:
        query = query.eq("tipo", tipo)
    if match_day:
        query = query.eq("match_day", match_day)
    if categoria:
        query = query.eq("categoria_codigo", categoria)

    query = query.order("confianza", desc=True).order("frecuencia", desc=True)
    response = query.limit(limite).execute()

    return response.data or []
