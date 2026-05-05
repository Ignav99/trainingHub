"""
TrainingHub Pro - Shared AI Tool Executor
Executes tool calls from any AI provider (Claude, OpenAI-compatible).
"""

import json
import logging

from app.database import get_supabase

logger = logging.getLogger(__name__)


def execute_tool(tool_name: str, tool_input: dict) -> str:
    """Execute a tool and return the result as a JSON string."""
    supabase = get_supabase()

    try:
        if tool_name == "consultar_jugadores":
            return _tool_jugadores(supabase, tool_input)
        elif tool_name == "consultar_sesiones":
            return _tool_sesiones(supabase, tool_input)
        elif tool_name == "consultar_partidos":
            return _tool_partidos(supabase, tool_input)
        elif tool_name == "consultar_rpe":
            return _tool_rpe(supabase, tool_input)
        elif tool_name == "consultar_microciclo":
            return _tool_microciclo(supabase, tool_input)
        elif tool_name == "buscar_knowledge_base":
            return _tool_kb_search(supabase, tool_input)
        elif tool_name == "consultar_convocatorias":
            return _tool_convocatorias(supabase, tool_input)
        elif tool_name == "consultar_estadisticas_jugador":
            return _tool_estadisticas_jugador(supabase, tool_input)
        elif tool_name == "buscar_tareas":
            return _tool_buscar_tareas(supabase, tool_input)
        elif tool_name == "buscar_tareas_biblioteca":
            return _tool_buscar_tareas(supabase, tool_input)
        elif tool_name == "consultar_mejores_practicas":
            return _tool_mejores_practicas(tool_input)
        else:
            return json.dumps({"error": f"Herramienta desconocida: {tool_name}"})
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {e}")
        return json.dumps({"error": f"Error al ejecutar consulta: {str(e)}"})


def _tool_jugadores(supabase, params: dict) -> str:
    select_fields = (
        "id, nombre, apellidos, dorsal, posicion_principal, "
        "estado, fecha_nacimiento, "
        "nivel_tecnico, nivel_tactico, nivel_fisico, nivel_mental, "
        "fecha_lesion, fecha_vuelta_estimada, es_convocable"
    )
    query = supabase.table("jugadores").select(select_fields).eq("equipo_id", params["equipo_id"])

    if params.get("estado"):
        query = query.eq("estado", params["estado"])

    if params.get("posicion"):
        query = query.ilike("posicion_principal", f"%{params['posicion']}%")

    response = query.order("dorsal").execute()
    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_sesiones(supabase, params: dict) -> str:
    query = supabase.table("sesiones").select(
        "id, titulo, fecha, match_day, estado, duracion_total, "
        "objetivo_principal, fase_juego_principal, principio_tactico_principal, "
        "intensidad_objetivo, notas_pre, notas_post"
    ).eq("equipo_id", params["equipo_id"])

    if params.get("fecha_desde"):
        query = query.gte("fecha", params["fecha_desde"])
    if params.get("fecha_hasta"):
        query = query.lte("fecha", params["fecha_hasta"])
    if params.get("match_day"):
        query = query.eq("match_day", params["match_day"])
    if params.get("estado"):
        query = query.eq("estado", params["estado"])

    limite = params.get("limite", 10)
    response = query.order("fecha", desc=True).limit(limite).execute()
    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_partidos(supabase, params: dict) -> str:
    query = supabase.table("partidos").select(
        "id, fecha, hora, localia, competicion, "
        "goles_favor, goles_contra, resultado, "
        "sistema_rival, notas_tacticas, notas_post, "
        "rivales(nombre, nombre_corto, sistema_habitual)"
    ).eq("equipo_id", params["equipo_id"])

    if params.get("fecha_desde"):
        query = query.gte("fecha", params["fecha_desde"])
    if params.get("fecha_hasta"):
        query = query.lte("fecha", params["fecha_hasta"])
    if params.get("solo_pendientes"):
        query = query.is_("goles_favor", "null")

    limite = params.get("limite", 10)
    response = query.order("fecha", desc=True).limit(limite).execute()

    # Flatten rival data
    for p in response.data:
        p["rival"] = p.pop("rivales", None)

    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_rpe(supabase, params: dict) -> str:
    # Get player IDs for the team
    jugadores = supabase.table("jugadores").select("id, nombre, apellidos").eq(
        "equipo_id", params["equipo_id"]
    ).execute()

    jugador_ids = [j["id"] for j in jugadores.data]
    jugador_map = {j["id"]: f"{j['nombre']} {j['apellidos']}" for j in jugadores.data}

    if not jugador_ids:
        return json.dumps({"mensaje": "No hay jugadores en este equipo", "registros": []})

    query = supabase.table("registros_rpe").select(
        "id, jugador_id, fecha, rpe, sueno, fatiga, dolor, estres, humor, "
        "carga_sesion, notas"
    )

    if params.get("jugador_id"):
        query = query.eq("jugador_id", params["jugador_id"])
    else:
        query = query.in_("jugador_id", jugador_ids)

    if params.get("fecha_desde"):
        query = query.gte("fecha", params["fecha_desde"])
    if params.get("fecha_hasta"):
        query = query.lte("fecha", params["fecha_hasta"])

    limite = params.get("limite", 20)
    response = query.order("fecha", desc=True).limit(limite).execute()

    # Add player names
    for r in response.data:
        r["jugador_nombre"] = jugador_map.get(r["jugador_id"], "Desconocido")

    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_microciclo(supabase, params: dict) -> str:
    query = supabase.table("microciclos").select(
        "id, fecha_inicio, fecha_fin, objetivo_principal, objetivo_tactico, "
        "objetivo_fisico, estado, notas"
    ).eq("equipo_id", params["equipo_id"])

    if params.get("fecha_desde"):
        query = query.gte("fecha_inicio", params["fecha_desde"])
    if params.get("fecha_hasta"):
        query = query.lte("fecha_fin", params["fecha_hasta"])
    if params.get("estado"):
        query = query.eq("estado", params["estado"])

    response = query.order("fecha_inicio", desc=True).limit(5).execute()
    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_kb_search(supabase, params: dict) -> str:
    """Search the knowledge base using hybrid search (vector + text + RRF) with fallbacks."""
    from app.config import get_settings

    # Get indexed documents for org
    docs = supabase.table("documentos_kb").select("id, titulo").eq(
        "organizacion_id", params["organizacion_id"]
    ).eq("estado", "indexado").execute()

    doc_ids = [d["id"] for d in docs.data]
    doc_map = {d["id"]: d["titulo"] for d in docs.data}

    if not doc_ids:
        return json.dumps({"mensaje": "No hay documentos indexados en la base de conocimiento", "resultados": []})

    limite = params.get("limite", 8)
    settings = get_settings()
    query_text = params["query"]

    # Try hybrid search (vector + text + RRF) first
    if settings.GEMINI_API_KEY:
        try:
            from app.services.embedding_service import generate_query_embedding
            query_embedding = generate_query_embedding(query_text)

            result = supabase.rpc("hybrid_search_kb", {
                "p_query_text": query_text,
                "p_query_embedding": query_embedding,
                "p_match_count": limite,
                "p_filter_doc_ids": doc_ids,
            }).execute()

            results = []
            for row in result.data:
                results.append({
                    "documento": doc_map.get(row["documento_id"], "?"),
                    "contenido": row["contenido"],
                    "score": round(row.get("rrf_score", 0), 4),
                })

            if results:
                return json.dumps({"resultados": results, "total": len(results), "metodo": "hybrid"}, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"KB hybrid search failed, trying vector-only: {e}")

            # Fallback to vector-only search
            try:
                result = supabase.rpc("search_kb_chunks", {
                    "query_embedding": query_embedding,
                    "match_count": limite,
                    "filter_doc_ids": doc_ids,
                }).execute()

                results = []
                for row in result.data:
                    results.append({
                        "documento": doc_map.get(row["documento_id"], "?"),
                        "contenido": row["contenido"],
                        "similitud": round(1 - row.get("distance", 0.5), 3),
                    })

                if results:
                    return json.dumps({"resultados": results, "total": len(results), "metodo": "vector"}, ensure_ascii=False)
            except Exception as e2:
                logger.warning(f"KB vector search also failed, falling back to text: {e2}")

    # Final fallback: text search (ILIKE)
    chunks = supabase.table("chunks_kb").select("*").in_(
        "documento_id", doc_ids
    ).ilike("contenido", f"%{query_text}%").limit(limite).execute()

    results = []
    for chunk in chunks.data:
        results.append({
            "documento": doc_map.get(chunk["documento_id"], "?"),
            "contenido": chunk["contenido"],
        })

    return json.dumps({"resultados": results, "total": len(results), "metodo": "text"}, ensure_ascii=False)


def _tool_convocatorias(supabase, params: dict) -> str:
    response = supabase.table("convocatorias").select(
        "*, jugadores(nombre, apellidos, dorsal, posicion_principal)"
    ).eq("partido_id", params["partido_id"]).order("titular", desc=True).execute()

    for c in response.data:
        c["jugador"] = c.pop("jugadores", None)

    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_buscar_tareas(supabase, params: dict) -> str:
    """Search tasks in the organization's library. Supports semantic search."""
    limite = params.get("limite", 10)
    org_id = params.get("organizacion_id")

    query = supabase.table("tareas").select(
        "id, titulo, descripcion, duracion_total, num_jugadores_min, num_jugadores_max, "
        "num_porteros, fase_juego, principio_tactico, nivel_cognitivo, densidad, "
        "num_series, espacio_largo, espacio_ancho, estructura_equipos, "
        "reglas_tecnicas, reglas_tacticas, consignas_ofensivas, consignas_defensivas, "
        "es_complementaria, grupo_muscular, equipamiento, tipo_contraccion, zona_cuerpo, "
        "objetivo_gym, series_repeticiones, grafico_data, categorias_tarea(codigo, nombre)"
    )

    if org_id:
        query = query.eq("organizacion_id", org_id)
    elif params.get("equipo_id"):
        query = query.eq("equipo_id", params["equipo_id"])

    if params.get("categoria"):
        query = query.eq("categorias_tarea.codigo", params["categoria"])

    if params.get("fase_juego"):
        query = query.eq("fase_juego", params["fase_juego"])

    if params.get("busqueda"):
        query = query.ilike("titulo", f"%{params['busqueda']}%")

    response = query.order("created_at", desc=True).limit(limite).execute()

    for t in response.data:
        cat = t.pop("categorias_tarea", None)
        t["categoria"] = cat

    return json.dumps(response.data, ensure_ascii=False, default=str)


def _tool_estadisticas_jugador(supabase, params: dict) -> str:
    jugador_id = params["jugador_id"]

    # Player info
    jugador = supabase.table("jugadores").select(
        "nombre, apellidos, dorsal, posicion_principal, estado"
    ).eq("id", jugador_id).single().execute()

    if not jugador.data:
        return json.dumps({"error": "Jugador no encontrado"})

    # Convocatorias stats
    convos = supabase.table("convocatorias").select(
        "titular, minutos_jugados, goles, asistencias, tarjeta_amarilla, tarjeta_roja"
    ).eq("jugador_id", jugador_id).execute()

    total_partidos = len(convos.data)
    titularidades = sum(1 for c in convos.data if c.get("titular"))
    minutos = sum(c.get("minutos_jugados", 0) for c in convos.data)
    goles = sum(c.get("goles", 0) for c in convos.data)
    asistencias = sum(c.get("asistencias", 0) for c in convos.data)
    amarillas = sum(1 for c in convos.data if c.get("tarjeta_amarilla"))
    rojas = sum(1 for c in convos.data if c.get("tarjeta_roja"))

    # RPE stats (last 10)
    rpes = supabase.table("registros_rpe").select(
        "rpe, carga_sesion, fecha"
    ).eq("jugador_id", jugador_id).order("fecha", desc=True).limit(10).execute()

    rpe_promedio = None
    if rpes.data:
        rpe_vals = [r["rpe"] for r in rpes.data]
        rpe_promedio = round(sum(rpe_vals) / len(rpe_vals), 1)

    return json.dumps({
        "jugador": jugador.data,
        "estadisticas": {
            "partidos_jugados": total_partidos,
            "titularidades": titularidades,
            "suplencias": total_partidos - titularidades,
            "minutos_totales": minutos,
            "goles": goles,
            "asistencias": asistencias,
            "tarjetas_amarillas": amarillas,
            "tarjetas_rojas": rojas,
        },
        "rpe": {
            "promedio_ultimos_10": rpe_promedio,
            "registros_recientes": rpes.data,
        },
    }, ensure_ascii=False, default=str)


def _tool_mejores_practicas(params: dict) -> str:
    """Query global best practices and aggregated patterns."""
    try:
        from app.services.knowledge_aggregation_service import get_best_practices

        results = get_best_practices(
            match_day=params.get("match_day"),
            categoria=params.get("categoria"),
            tipo=params.get("tipo"),
            limite=params.get("limite", 10),
        )

        if not results:
            return json.dumps({"mensaje": "No hay datos de mejores practicas disponibles todavia.", "resultados": []})

        # Simplify output
        simplified = []
        for r in results:
            contenido = r.get("contenido", {})
            simplified.append({
                "tipo": r.get("tipo"),
                "match_day": r.get("match_day"),
                "categoria": r.get("categoria_codigo"),
                "descripcion": contenido.get("descripcion", ""),
                "confianza": r.get("confianza"),
                "frecuencia": r.get("frecuencia"),
            })

        return json.dumps({"resultados": simplified, "total": len(simplified)}, ensure_ascii=False, default=str)
    except Exception as e:
        logger.warning(f"Error querying best practices: {e}")
        return json.dumps({"mensaje": "Datos de mejores practicas no disponibles.", "resultados": []})


def get_team_game_model(equipo_id: str) -> str | None:
    """Fetch the team's game model and format it for AI context injection."""
    try:
        supabase = get_supabase()
        result = supabase.table("game_models").select("*").eq(
            "equipo_id", equipo_id
        ).order("updated_at", desc=True).limit(1).execute()

        if not result.data:
            return None

        gm = result.data[0]
        parts = []
        if gm.get("sistema_juego"):
            parts.append(f"Sistema: {gm['sistema_juego']}")
        if gm.get("estilo"):
            parts.append(f"Estilo: {gm['estilo']}")
        if gm.get("descripcion_general"):
            parts.append(f"Filosofia: {gm['descripcion_general']}")
        if gm.get("pressing_tipo"):
            parts.append(f"Pressing: {gm['pressing_tipo']}")
        if gm.get("salida_balon"):
            parts.append(f"Salida de balon: {gm['salida_balon']}")

        fase_names = {
            "principios_ataque_organizado": "Ataque Organizado",
            "principios_defensa_organizada": "Defensa Organizada",
            "principios_transicion_of": "Transicion Ofensiva",
            "principios_transicion_def": "Transicion Defensiva",
            "principios_balon_parado": "Balon Parado",
        }
        for key, label in fase_names.items():
            principios = gm.get(key, [])
            if principios:
                parts.append(f"Principios {label}: {', '.join(principios)}")

        roles = gm.get("roles_posicionales", {})
        if roles:
            role_lines = [f"  - {k}: {v}" for k, v in roles.items() if v]
            if role_lines:
                parts.append("Roles Posicionales:\n" + "\n".join(role_lines))

        if not parts:
            return None

        return "MODELO DE JUEGO DEL EQUIPO:\n" + "\n".join(parts)
    except Exception as e:
        logger.warning(f"Error fetching game model for team {equipo_id}: {e}")
        return None
