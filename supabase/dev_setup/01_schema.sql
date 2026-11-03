


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."auto_link_sesion_microciclo"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NEW.microciclo_id IS NULL THEN
        SELECT id INTO NEW.microciclo_id
        FROM microciclos
        WHERE equipo_id = NEW.equipo_id
          AND NEW.fecha BETWEEN fecha_inicio AND fecha_fin
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_link_sesion_microciclo"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_resultado"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF NEW.goles_favor IS NOT NULL AND NEW.goles_contra IS NOT NULL THEN
        IF NEW.goles_favor > NEW.goles_contra THEN
            NEW.resultado := 'victoria';
        ELSIF NEW.goles_favor < NEW.goles_contra THEN
            NEW.resultado := 'derrota';
        ELSE
            NEW.resultado := 'empate';
        END IF;
    ELSE
        NEW.resultado := NULL;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_resultado"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hybrid_search_kb"("p_query_text" "text", "p_query_embedding" "public"."vector", "p_match_count" integer DEFAULT 10, "p_filter_doc_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS TABLE("id" "uuid", "documento_id" "uuid", "contenido" "text", "posicion" integer, "metadata" "jsonb", "created_at" timestamp with time zone, "vector_rank" integer, "text_rank" integer, "rrf_score" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    k_rrf CONSTANT int := 60;  -- RRF smoothing constant
    vector_weight CONSTANT float := 0.7;
    text_weight CONSTANT float := 0.3;
BEGIN
    RETURN QUERY
    WITH
    -- Vector similarity search (top candidates by cosine distance)
    vector_results AS (
        SELECT
            c.id,
            c.documento_id,
            c.contenido,
            c.posicion,
            c.metadata,
            c.created_at,
            ROW_NUMBER() OVER (ORDER BY c.embedding <=> p_query_embedding) AS rank_pos
        FROM chunks_kb c
        WHERE
            c.embedding IS NOT NULL
            AND (p_filter_doc_ids IS NULL OR c.documento_id = ANY(p_filter_doc_ids))
        ORDER BY c.embedding <=> p_query_embedding
        LIMIT p_match_count * 3  -- Fetch more candidates for fusion
    ),
    -- Trigram text similarity search
    text_results AS (
        SELECT
            c.id,
            c.documento_id,
            c.contenido,
            c.posicion,
            c.metadata,
            c.created_at,
            ROW_NUMBER() OVER (ORDER BY similarity(c.contenido, p_query_text) DESC) AS rank_pos
        FROM chunks_kb c
        WHERE
            (p_filter_doc_ids IS NULL OR c.documento_id = ANY(p_filter_doc_ids))
            AND (
                c.contenido % p_query_text  -- trigram similarity threshold
                OR c.contenido ILIKE '%' || p_query_text || '%'  -- exact substring fallback
            )
        ORDER BY similarity(c.contenido, p_query_text) DESC
        LIMIT p_match_count * 3
    ),
    -- Combine with Reciprocal Rank Fusion
    combined AS (
        SELECT
            COALESCE(v.id, t.id) AS id,
            COALESCE(v.documento_id, t.documento_id) AS documento_id,
            COALESCE(v.contenido, t.contenido) AS contenido,
            COALESCE(v.posicion, t.posicion) AS posicion,
            COALESCE(v.metadata, t.metadata) AS metadata,
            COALESCE(v.created_at, t.created_at) AS created_at,
            v.rank_pos AS vector_rank,
            t.rank_pos AS text_rank,
            -- RRF formula: score = w1/(k+rank1) + w2/(k+rank2)
            COALESCE(vector_weight / (k_rrf + v.rank_pos), 0) +
            COALESCE(text_weight / (k_rrf + t.rank_pos), 0) AS rrf_score
        FROM vector_results v
        FULL OUTER JOIN text_results t ON v.id = t.id
    )
    SELECT
        combined.id,
        combined.documento_id,
        combined.contenido,
        combined.posicion,
        combined.metadata,
        combined.created_at,
        combined.vector_rank::int,
        combined.text_rank::int,
        combined.rrf_score
    FROM combined
    WHERE combined.rrf_score > 0.005  -- Filter low-quality results
    ORDER BY combined.rrf_score DESC
    LIMIT p_match_count;
END;
$$;


ALTER FUNCTION "public"."hybrid_search_kb"("p_query_text" "text", "p_query_embedding" "public"."vector", "p_match_count" integer, "p_filter_doc_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_tarea_uso"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE tareas SET num_usos = num_usos + 1 WHERE id = NEW.tarea_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_tarea_uso"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_kb_chunks"("query_embedding" "public"."vector", "match_count" integer DEFAULT 5, "filter_doc_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS TABLE("id" "uuid", "documento_id" "uuid", "contenido" "text", "posicion" integer, "metadata" "jsonb", "created_at" timestamp with time zone, "distance" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.documento_id,
        c.contenido,
        c.posicion,
        c.metadata,
        c.created_at,
        (c.embedding <=> query_embedding)::float AS distance
    FROM chunks_kb c
    WHERE
        c.embedding IS NOT NULL
        AND (filter_doc_ids IS NULL OR c.documento_id = ANY(filter_doc_ids))
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."search_kb_chunks"("query_embedding" "public"."vector", "match_count" integer, "filter_doc_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_carga_acumulada_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
  BEGIN
      NEW.updated_at = now();
      RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_carga_acumulada_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_entrenamientos_margen_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_entrenamientos_margen_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_estadisticas_partido_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
  BEGIN
      NEW.updated_at = now();
      RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_estadisticas_partido_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_jugador_evaluaciones_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_jugador_evaluaciones_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_jugador_habitos_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_jugador_habitos_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tratamiento_diario_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tratamiento_diario_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_org_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT DISTINCT organizacion_id
    FROM usuarios
    WHERE id = auth.uid()
    AND organizacion_id IS NOT NULL
  $$;


ALTER FUNCTION "public"."user_org_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_team_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT equipo_id FROM usuarios_equipos WHERE usuario_id = auth.uid()
  $$;


ALTER FUNCTION "public"."user_team_ids"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."abp_jugadas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizacion_id" "uuid" NOT NULL,
    "equipo_id" "uuid",
    "creado_por" "uuid",
    "nombre" character varying(255) NOT NULL,
    "codigo" character varying(20),
    "tipo" character varying(30) NOT NULL,
    "lado" character varying(15) NOT NULL,
    "subtipo" character varying(30),
    "descripcion" "text",
    "senal_codigo" character varying(50),
    "sistema_marcaje" character varying(20),
    "notas_tacticas" "text",
    "fases" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "asignaciones" "jsonb" DEFAULT '[]'::"jsonb",
    "es_plantilla" boolean DEFAULT false,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "orden" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."abp_jugadas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."abp_partido_jugadas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partido_id" "uuid" NOT NULL,
    "jugada_id" "uuid" NOT NULL,
    "asignaciones_override" "jsonb",
    "notas" "text",
    "orden" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."abp_partido_jugadas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."abp_partido_plan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partido_id" "uuid" NOT NULL,
    "organizacion_id" "uuid" NOT NULL,
    "comentario_ofensivo" "text",
    "comentario_defensivo" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."abp_partido_plan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."abp_rival_jugadas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rival_id" "uuid" NOT NULL,
    "organizacion_id" "uuid" NOT NULL,
    "nombre" character varying(255) NOT NULL,
    "tipo" character varying(30) NOT NULL,
    "lado" character varying(15) NOT NULL,
    "subtipo" character varying(30),
    "descripcion" "text",
    "fases" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "video_url" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."abp_rival_jugadas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."abp_sesion_jugadas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sesion_id" "uuid" NOT NULL,
    "jugada_id" "uuid" NOT NULL,
    "notas" "text",
    "orden" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."abp_sesion_jugadas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accesos_medicos_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "registro_medico_id" "uuid" NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "accion" character varying(20) NOT NULL,
    "ip_address" character varying(45),
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "accesos_medicos_log_accion_check" CHECK ((("accion")::"text" = ANY ((ARRAY['ver'::character varying, 'crear'::character varying, 'editar'::character varying, 'eliminar'::character varying, 'exportar'::character varying])::"text"[])))
);


ALTER TABLE "public"."accesos_medicos_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_conversaciones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "equipo_id" "uuid",
    "titulo" character varying(255),
    "contexto" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_conversaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_mensajes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversacion_id" "uuid" NOT NULL,
    "rol" character varying(20) NOT NULL,
    "contenido" "text" NOT NULL,
    "herramientas_usadas" "jsonb" DEFAULT '[]'::"jsonb",
    "tokens_input" integer,
    "tokens_output" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "feedback" character varying(10),
    "cache_read_input_tokens" integer DEFAULT 0,
    "cache_creation_input_tokens" integer DEFAULT 0,
    "modelo" character varying(50),
    CONSTRAINT "ai_mensajes_feedback_check" CHECK ((("feedback")::"text" = ANY ((ARRAY['positivo'::character varying, 'negativo'::character varying])::"text"[]))),
    CONSTRAINT "ai_mensajes_rol_check" CHECK ((("rol")::"text" = ANY ((ARRAY['user'::character varying, 'assistant'::character varying, 'system'::character varying])::"text"[])))
);


ALTER TABLE "public"."ai_mensajes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alertas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "microciclo_id" "uuid",
    "tipo" "text" NOT NULL,
    "prioridad" "text" DEFAULT 'normal'::"text" NOT NULL,
    "titulo" "text" NOT NULL,
    "mensaje" "text",
    "entidad_tipo" "text",
    "entidad_id" "uuid",
    "accion_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "resuelta" boolean DEFAULT false NOT NULL,
    "resuelta_por" "uuid",
    "resuelta_en" timestamp with time zone,
    "notas_resolucion" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."alertas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asistencias_sesion" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sesion_id" "uuid" NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "presente" boolean DEFAULT true NOT NULL,
    "motivo_ausencia" character varying(100),
    "notas" "text",
    "hora_llegada" time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tipo_participacion" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."asistencias_sesion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "usuario_id" "uuid",
    "accion" character varying(20) NOT NULL,
    "entidad_tipo" character varying(50) NOT NULL,
    "entidad_id" "uuid",
    "datos_anteriores" "jsonb",
    "datos_nuevos" "jsonb",
    "ip_address" character varying(45),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_agent" "text",
    "organizacion_id" "uuid",
    "equipo_id" "uuid",
    "severidad" character varying(10) DEFAULT 'info'::character varying,
    "resultado" character varying(10) DEFAULT 'exito'::character varying,
    CONSTRAINT "audit_log_accion_check" CHECK ((("accion")::"text" = ANY ((ARRAY['crear'::character varying, 'actualizar'::character varying, 'eliminar'::character varying, 'login'::character varying, 'logout'::character varying, 'login_fallido'::character varying, 'invitar'::character varying, 'aceptar_invitacion'::character varying, 'revocar_acceso'::character varying, 'ver_datos_medicos'::character varying, 'exportar_datos'::character varying, 'cambiar_rol'::character varying, 'transferir_propiedad'::character varying, 'consentimiento_gdpr'::character varying, 'solicitud_gdpr'::character varying, 'cambiar_password'::character varying, 'activar_mfa'::character varying, 'acceso_denegado'::character varying])::"text"[]))),
    CONSTRAINT "audit_log_resultado_check" CHECK ((("resultado")::"text" = ANY ((ARRAY['exito'::character varying, 'fallo'::character varying, 'denegado'::character varying])::"text"[]))),
    CONSTRAINT "audit_log_severidad_check" CHECK ((("severidad")::"text" = ANY ((ARRAY['info'::character varying, 'warning'::character varying, 'critical'::character varying])::"text"[])))
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carga_acumulada_jugador" (
    "jugador_id" "uuid" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "carga_aguda" numeric(8,2) DEFAULT 0,
    "carga_cronica" numeric(8,2) DEFAULT 0,
    "ratio_acwr" numeric(6,3),
    "nivel_carga" "text" DEFAULT 'optimo'::"text",
    "ultima_carga" numeric(8,2) DEFAULT 0,
    "ultima_actividad_fecha" "date",
    "dias_sin_actividad" integer DEFAULT 0,
    "wellness_valor" integer,
    "wellness_fecha" "date",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "wellness_total" integer,
    "wellness_general_avg" numeric(4,2),
    "wellness_7d_avg" numeric(4,2),
    "wellness_last" integer,
    "wellness_last_fecha" "date",
    "wellness_alerta" boolean DEFAULT false,
    "monotonia" numeric(6,3),
    "strain" numeric(10,2),
    CONSTRAINT "carga_acumulada_jugador_nivel_carga_check" CHECK (("nivel_carga" = ANY (ARRAY['bajo'::"text", 'optimo'::"text", 'alto'::"text", 'critico'::"text"]))),
    CONSTRAINT "carga_acumulada_jugador_wellness_valor_check" CHECK ((("wellness_valor" >= 1) AND ("wellness_valor" <= 10)))
);


ALTER TABLE "public"."carga_acumulada_jugador" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carga_diaria_jugador" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "fecha" "date" NOT NULL,
    "load_sesion" numeric(8,2) DEFAULT 0,
    "load_partido" numeric(8,2) DEFAULT 0,
    "load_manual" numeric(8,2) DEFAULT 0,
    "load_total" numeric(8,2) DEFAULT 0,
    "ewma_acute" numeric(8,2) DEFAULT 0,
    "ewma_chronic" numeric(8,2) DEFAULT 0,
    "acwr" numeric(6,3),
    "monotonia" numeric(6,3),
    "strain" numeric(10,2)
);


ALTER TABLE "public"."carga_diaria_jugador" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categorias_tarea" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "codigo" character varying(10) NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "nombre_corto" character varying(50),
    "descripcion" "text",
    "naturaleza" character varying(50),
    "objetivo_principal" "text",
    "icono" character varying(50),
    "color" character varying(7),
    "orden" integer DEFAULT 0,
    "activo" boolean DEFAULT true
);


ALTER TABLE "public"."categorias_tarea" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chunks_kb" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "documento_id" "uuid" NOT NULL,
    "contenido" "text" NOT NULL,
    "posicion" integer NOT NULL,
    "embedding" "public"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "relevance_score" numeric(5,2) DEFAULT 1.0,
    "veces_citado" integer DEFAULT 0
);


ALTER TABLE "public"."chunks_kb" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."composicion_corporal" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "fecha" "date" NOT NULL,
    "peso_kg" numeric(5,2) NOT NULL,
    "porcentaje_grasa" numeric(5,2),
    "masa_muscular_kg" numeric(5,2),
    "imc" numeric(4,2),
    "agua_corporal_pct" numeric(5,2),
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."composicion_corporal" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conocimiento_global" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "match_day" character varying(10),
    "categoria_codigo" character varying(10),
    "fase_juego" character varying(50),
    "contenido" "jsonb" NOT NULL,
    "frecuencia" integer DEFAULT 1,
    "confianza" numeric(3,2) DEFAULT 0.5,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conocimiento_global" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consentimientos_gdpr" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "version" character varying(20) NOT NULL,
    "otorgado" boolean DEFAULT false NOT NULL,
    "ip_address" character varying(45),
    "user_agent" "text",
    "fecha" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revocado" boolean DEFAULT false,
    "revocado_fecha" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "consentimientos_gdpr_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['terminos_servicio'::character varying, 'politica_privacidad'::character varying, 'datos_personales'::character varying, 'datos_medicos'::character varying, 'comunicaciones_marketing'::character varying, 'tratamiento_imagen'::character varying, 'transferencia_datos'::character varying, 'menor_representacion'::character varying])::"text"[])))
);


ALTER TABLE "public"."consentimientos_gdpr" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contenidos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "codigo" character varying(50) NOT NULL,
    "nombre" character varying(150) NOT NULL,
    "descripcion" "text",
    "dimension" character varying(50) NOT NULL,
    "fase_juego" character varying(50),
    "contenido_padre_id" "uuid",
    "nivel" integer DEFAULT 1,
    "icono" character varying(50),
    "color" character varying(7),
    "orden" integer DEFAULT 0,
    "activo" boolean DEFAULT true,
    CONSTRAINT "contenidos_dimension_check" CHECK ((("dimension")::"text" = ANY ((ARRAY['tecnico'::character varying, 'tactico'::character varying, 'fisico'::character varying, 'psicologico'::character varying, 'estrategico'::character varying])::"text"[]))),
    CONSTRAINT "contenidos_fase_juego_check" CHECK ((("fase_juego")::"text" = ANY ((ARRAY['ataque_organizado'::character varying, 'transicion_def_ataque'::character varying, 'defensa_organizada'::character varying, 'transicion_ataq_defensa'::character varying, 'balon_parado'::character varying, NULL::character varying])::"text"[])))
);


ALTER TABLE "public"."contenidos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversacion_participantes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversacion_id" "uuid" NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "rol" character varying(20) DEFAULT 'miembro'::character varying,
    "ultimo_leido" timestamp with time zone,
    "silenciado" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conversacion_participantes_rol_check" CHECK ((("rol")::"text" = ANY ((ARRAY['admin'::character varying, 'miembro'::character varying])::"text"[])))
);


ALTER TABLE "public"."conversacion_participantes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversaciones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "equipo_id" "uuid",
    "tipo" character varying(20) NOT NULL,
    "nombre" character varying(255),
    "creado_por" "uuid" NOT NULL,
    "activa" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conversaciones_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['directa'::character varying, 'grupo'::character varying, 'canal'::character varying])::"text"[])))
);


ALTER TABLE "public"."conversaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."convocatorias" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "partido_id" "uuid" NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "titular" boolean DEFAULT false,
    "posicion_asignada" character varying(50),
    "dorsal" integer,
    "minutos_jugados" integer DEFAULT 0,
    "goles" integer DEFAULT 0,
    "asistencias" integer DEFAULT 0,
    "tarjeta_amarilla" boolean DEFAULT false,
    "tarjeta_roja" boolean DEFAULT false,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "rendimiento_media" numeric(3,1),
    "rendimiento_num_notas" integer DEFAULT 0 NOT NULL,
    "rpe" integer,
    CONSTRAINT "convocatorias_rpe_check" CHECK ((("rpe" IS NULL) OR (("rpe" >= 1) AND ("rpe" <= 10))))
);


ALTER TABLE "public"."convocatorias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."descansos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "fecha" "date" NOT NULL,
    "tipo" "text" DEFAULT 'descanso'::"text" NOT NULL,
    "notas" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "descansos_tipo_check" CHECK (("tipo" = ANY (ARRAY['descanso'::"text", 'festivo'::"text"])))
);


ALTER TABLE "public"."descansos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documentos_kb" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organizacion_id" "uuid",
    "titulo" character varying(255) NOT NULL,
    "fuente" character varying(255),
    "tipo" character varying(50) DEFAULT 'manual'::character varying,
    "contenido_texto" "text",
    "archivo_url" "text",
    "estado" character varying(20) DEFAULT 'pendiente'::character varying,
    "num_chunks" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "documentos_kb_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['pendiente'::character varying, 'procesando'::character varying, 'indexado'::character varying, 'error'::character varying])::"text"[]))),
    CONSTRAINT "documentos_kb_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['manual'::character varying, 'pdf'::character varying, 'url'::character varying, 'seed'::character varying])::"text"[])))
);


ALTER TABLE "public"."documentos_kb" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entrenamientos_margen" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sesion_id" "uuid" NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "registro_medico_id" "uuid",
    "objetivo" "text",
    "notas" "text",
    "responsable" character varying(100),
    "estado" character varying(20) DEFAULT 'planificado'::character varying,
    "fase_recuperacion" character varying(50),
    "duracion_estimada" integer,
    "rpe_post" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "entrenamientos_margen_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['planificado'::character varying, 'en_curso'::character varying, 'completado'::character varying, 'cancelado'::character varying])::"text"[]))),
    CONSTRAINT "entrenamientos_margen_fase_recuperacion_check" CHECK ((("fase_recuperacion")::"text" = ANY ((ARRAY['fase_1_control_dolor'::character varying, 'fase_2_movilidad'::character varying, 'fase_3_fuerza_base'::character varying, 'fase_4_fuerza_funcional'::character varying, 'fase_5_carrera_lineal'::character varying, 'fase_6_cambios_direccion'::character varying, 'fase_7_entrenamiento_equipo'::character varying, 'fase_8_competicion'::character varying, NULL::character varying])::"text"[]))),
    CONSTRAINT "entrenamientos_margen_rpe_post_check" CHECK ((("rpe_post" IS NULL) OR (("rpe_post" >= 1) AND ("rpe_post" <= 10))))
);


ALTER TABLE "public"."entrenamientos_margen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entrenamientos_margen_tareas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entrenamiento_margen_id" "uuid" NOT NULL,
    "tarea_id" "uuid",
    "orden" integer DEFAULT 1 NOT NULL,
    "titulo_custom" character varying(255),
    "descripcion_custom" "text",
    "duracion" integer,
    "series" integer DEFAULT 1,
    "repeticiones" character varying(50),
    "descanso" character varying(50),
    "carga" character varying(100),
    "tipo_ejercicio" character varying(30),
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_tiene_titulo" CHECK ((("tarea_id" IS NOT NULL) OR ("titulo_custom" IS NOT NULL))),
    CONSTRAINT "entrenamientos_margen_tareas_tipo_ejercicio_check" CHECK ((("tipo_ejercicio")::"text" = ANY ((ARRAY['movilidad'::character varying, 'activacion'::character varying, 'fuerza'::character varying, 'propioceptivo'::character varying, 'cardio'::character varying, 'campo'::character varying, 'pliometria'::character varying, 'flexibilidad'::character varying, 'otro'::character varying, NULL::character varying])::"text"[])))
);


ALTER TABLE "public"."entrenamientos_margen_tareas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipaciones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "rival_id" "uuid",
    "organizacion_id" "uuid",
    "tipo" character varying(20) DEFAULT 'local'::character varying NOT NULL,
    "color_camiseta_principal" character varying(7) DEFAULT '#1a365d'::character varying NOT NULL,
    "color_camiseta_secundario" character varying(7),
    "patron_camiseta" character varying(30) DEFAULT 'solido'::character varying NOT NULL,
    "color_pantalon" character varying(7) DEFAULT '#1a365d'::character varying NOT NULL,
    "color_medias" character varying(7) DEFAULT '#1a365d'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "equipaciones_patron_camiseta_check" CHECK ((("patron_camiseta")::"text" = ANY ((ARRAY['solido'::character varying, 'rayas_verticales'::character varying, 'franjas_horizontales'::character varying, 'mangas_diferentes'::character varying, 'degradado'::character varying])::"text"[]))),
    CONSTRAINT "equipaciones_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['local'::character varying, 'visitante'::character varying, 'portero_local'::character varying, 'portero_visitante'::character varying])::"text"[]))),
    CONSTRAINT "equipaciones_un_solo_dueno" CHECK (((("rival_id" IS NOT NULL) AND ("organizacion_id" IS NULL)) OR (("rival_id" IS NULL) AND ("organizacion_id" IS NOT NULL))))
);


ALTER TABLE "public"."equipaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organizacion_id" "uuid" NOT NULL,
    "nombre" character varying(255) NOT NULL,
    "categoria" character varying(100),
    "temporada" character varying(20),
    "num_jugadores_plantilla" integer DEFAULT 22,
    "sistema_juego" character varying(20) DEFAULT '1-4-3-3'::character varying,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "temporada_anterior_id" "uuid"
);


ALTER TABLE "public"."equipos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estadisticas_partido" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partido_id" "uuid" NOT NULL,
    "tiros_a_puerta" integer DEFAULT 0,
    "ocasiones_gol" integer DEFAULT 0,
    "saques_esquina" integer DEFAULT 0,
    "penaltis" integer DEFAULT 0,
    "fueras_juego" integer DEFAULT 0,
    "faltas_cometidas" integer DEFAULT 0,
    "tarjetas_amarillas" integer DEFAULT 0,
    "tarjetas_rojas" integer DEFAULT 0,
    "balones_perdidos" integer DEFAULT 0,
    "balones_recuperados" integer DEFAULT 0,
    "rival_tiros_a_puerta" integer DEFAULT 0,
    "rival_ocasiones_gol" integer DEFAULT 0,
    "rival_saques_esquina" integer DEFAULT 0,
    "rival_penaltis" integer DEFAULT 0,
    "rival_fueras_juego" integer DEFAULT 0,
    "rival_faltas_cometidas" integer DEFAULT 0,
    "rival_tarjetas_amarillas" integer DEFAULT 0,
    "rival_tarjetas_rojas" integer DEFAULT 0,
    "rival_balones_perdidos" integer DEFAULT 0,
    "rival_balones_recuperados" integer DEFAULT 0,
    "goles_por_periodo" "jsonb" DEFAULT '{}'::"jsonb",
    "tipos_gol_favor" "jsonb" DEFAULT '{}'::"jsonb",
    "tipos_gol_contra" "jsonb" DEFAULT '{}'::"jsonb",
    "comentario_tactico" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "goles_detalle_favor" "jsonb" DEFAULT '[]'::"jsonb",
    "goles_detalle_contra" "jsonb" DEFAULT '[]'::"jsonb",
    "faltas_mapa_cometidas" "jsonb" DEFAULT '[]'::"jsonb",
    "faltas_mapa_recibidas" "jsonb" DEFAULT '[]'::"jsonb",
    "reflexion_entrenador" "text" DEFAULT ''::"text" NOT NULL,
    "stats_periodos" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."estadisticas_partido" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "nombre" "text" DEFAULT 'Modelo de Juego'::"text" NOT NULL,
    "sistema_juego" "text",
    "estilo" "text",
    "descripcion_general" "text",
    "principios_ataque_organizado" "jsonb" DEFAULT '[]'::"jsonb",
    "principios_defensa_organizada" "jsonb" DEFAULT '[]'::"jsonb",
    "principios_transicion_of" "jsonb" DEFAULT '[]'::"jsonb",
    "principios_transicion_def" "jsonb" DEFAULT '[]'::"jsonb",
    "principios_balon_parado" "jsonb" DEFAULT '[]'::"jsonb",
    "subprincipios" "jsonb" DEFAULT '{}'::"jsonb",
    "roles_posicionales" "jsonb" DEFAULT '{}'::"jsonb",
    "pressing_tipo" "text",
    "salida_balon" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."game_models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historial_suscripciones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organizacion_id" "uuid" NOT NULL,
    "plan_anterior_id" "uuid",
    "plan_nuevo_id" "uuid",
    "accion" character varying(30) NOT NULL,
    "motivo" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "historial_suscripciones_accion_check" CHECK ((("accion")::"text" = ANY ((ARRAY['created'::character varying, 'upgraded'::character varying, 'downgraded'::character varying, 'renewed'::character varying, 'cancelled'::character varying, 'suspended'::character varying, 'reactivated'::character varying])::"text"[])))
);


ALTER TABLE "public"."historial_suscripciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."informes_rival" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rival_id" "uuid" NOT NULL,
    "partido_id" "uuid",
    "sistema_juego" "text",
    "sistema_variantes" "jsonb" DEFAULT '[]'::"jsonb",
    "estilo" "text",
    "fortalezas" "jsonb" DEFAULT '[]'::"jsonb",
    "debilidades" "jsonb" DEFAULT '[]'::"jsonb",
    "jugadores_clave" "jsonb" DEFAULT '[]'::"jsonb",
    "lesionados_sancionados" "jsonb" DEFAULT '[]'::"jsonb",
    "ultimos_partidos" "jsonb" DEFAULT '[]'::"jsonb",
    "abp_ofensivo" "text",
    "abp_defensivo" "text",
    "mapa_presion" "jsonb",
    "notas" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."informes_rival" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitaciones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "nombre" character varying(255),
    "organizacion_id" "uuid" NOT NULL,
    "equipo_id" "uuid",
    "rol_organizacion" character varying(50),
    "rol_en_equipo" character varying(50),
    "token" character varying(128) NOT NULL,
    "token_hash" character varying(64) NOT NULL,
    "estado" character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    "expira_en" timestamp with time zone NOT NULL,
    "invitado_por" "uuid" NOT NULL,
    "aceptado_por" "uuid",
    "fecha_respuesta" timestamp with time zone,
    "reinvitaciones" integer DEFAULT 0,
    "ultimo_reenvio" timestamp with time zone,
    "es_invitacion_tutor" boolean DEFAULT false,
    "jugador_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invitaciones_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['pendiente'::character varying, 'aceptada'::character varying, 'rechazada'::character varying, 'expirada'::character varying, 'revocada'::character varying])::"text"[])))
);


ALTER TABLE "public"."invitaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jugador_evaluaciones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "bloque" character varying(20) NOT NULL,
    "fecha" "date" NOT NULL,
    "momento" character varying(30) DEFAULT 'control'::character varying NOT NULL,
    "titulo" character varying(160),
    "datos" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notas" "text",
    "creado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "jugador_evaluaciones_bloque_check" CHECK ((("bloque")::"text" = ANY ((ARRAY['valoracion'::character varying, 'tests'::character varying])::"text"[]))),
    CONSTRAINT "jugador_evaluaciones_momento_check" CHECK ((("momento")::"text" = ANY ((ARRAY['pretemporada'::character varying, 'inicio_temporada'::character varying, 'control'::character varying, 'post_lesion'::character varying, 'fin_temporada'::character varying, 'otro'::character varying])::"text"[])))
);


ALTER TABLE "public"."jugador_evaluaciones" OWNER TO "postgres";


COMMENT ON TABLE "public"."jugador_evaluaciones" IS 'Tomas clínicas datadas: valoración postural/antropométrica/artromuscular o batería de tests.';



CREATE TABLE IF NOT EXISTS "public"."jugador_habitos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "comidas" "text",
    "sueno" "text",
    "actividades_nocivas" "text",
    "deportes_externos" "text",
    "notas" "text",
    "datos" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "actualizado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."jugador_habitos" OWNER TO "postgres";


COMMENT ON TABLE "public"."jugador_habitos" IS 'Hábitos e información general del futbolista (sigue al jugador entre plantillas).';



CREATE TABLE IF NOT EXISTS "public"."jugadores" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "apellidos" character varying(100) NOT NULL,
    "fecha_nacimiento" "date",
    "dorsal" integer,
    "foto_url" "text",
    "posicion_principal" character varying(10) NOT NULL,
    "posiciones_secundarias" "jsonb" DEFAULT '[]'::"jsonb",
    "es_portero" boolean DEFAULT false,
    "altura" numeric(3,2),
    "peso" numeric(4,1),
    "pierna_dominante" character varying(20) DEFAULT 'derecha'::character varying,
    "nivel_tecnico" integer DEFAULT 5,
    "nivel_tactico" integer DEFAULT 5,
    "nivel_fisico" integer DEFAULT 5,
    "nivel_mental" integer DEFAULT 5,
    "estado" character varying(20) DEFAULT 'activo'::character varying,
    "motivo_baja" "text",
    "fecha_lesion" "date",
    "fecha_vuelta_estimada" "date",
    "es_capitan" boolean DEFAULT false,
    "es_convocable" boolean DEFAULT true,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "usuario_id" "uuid",
    "es_invitado" boolean DEFAULT false,
    "apodo" character varying(50),
    "tipo_jugador" "text" DEFAULT 'plantilla'::"text" NOT NULL,
    "ficha_estado" "text" DEFAULT 'completa'::"text" NOT NULL,
    "fecha_fin_prueba" "date",
    "disponibilidad" "text" DEFAULT 'pleno'::"text" NOT NULL,
    "nivel_tecnico_comentario" "text",
    "nivel_tactico_comentario" "text",
    "nivel_fisico_comentario" "text",
    "nivel_mental_comentario" "text",
    CONSTRAINT "jugadores_disponibilidad_check" CHECK (("disponibilidad" = ANY (ARRAY['fuera'::"text", 'individual'::"text", 'grupo_adaptado'::"text", 'pleno'::"text"]))),
    CONSTRAINT "jugadores_dorsal_check" CHECK ((("dorsal" > 0) AND ("dorsal" < 100))),
    CONSTRAINT "jugadores_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['activo'::character varying, 'lesionado'::character varying, 'en_recuperacion'::character varying, 'enfermo'::character varying, 'sancionado'::character varying, 'viaje'::character varying, 'permiso'::character varying, 'seleccion'::character varying, 'baja'::character varying, 'invitado'::character varying])::"text"[]))),
    CONSTRAINT "jugadores_ficha_estado_check" CHECK (("ficha_estado" = ANY (ARRAY['completa'::"text", 'pre_ficha'::"text", 'minima'::"text"]))),
    CONSTRAINT "jugadores_nivel_fisico_check" CHECK ((("nivel_fisico" >= 1) AND ("nivel_fisico" <= 10))),
    CONSTRAINT "jugadores_nivel_mental_check" CHECK ((("nivel_mental" >= 1) AND ("nivel_mental" <= 10))),
    CONSTRAINT "jugadores_nivel_tactico_check" CHECK ((("nivel_tactico" >= 1) AND ("nivel_tactico" <= 10))),
    CONSTRAINT "jugadores_nivel_tecnico_check" CHECK ((("nivel_tecnico" >= 1) AND ("nivel_tecnico" <= 10))),
    CONSTRAINT "jugadores_pierna_dominante_check" CHECK ((("pierna_dominante")::"text" = ANY ((ARRAY['derecha'::character varying, 'izquierda'::character varying, 'ambas'::character varying])::"text"[]))),
    CONSTRAINT "jugadores_tipo_jugador_check" CHECK (("tipo_jugador" = ANY (ARRAY['plantilla'::"text", 'juvenil'::"text", 'prueba'::"text", 'invitado'::"text"])))
);


ALTER TABLE "public"."jugadores" OWNER TO "postgres";


COMMENT ON COLUMN "public"."jugadores"."es_invitado" IS 'True for guest players (from other teams or temporary for trials)';



COMMENT ON COLUMN "public"."jugadores"."tipo_jugador" IS 'plantilla=ficha oficial; juvenil=cantera/seguimiento; prueba=trial con pre-ficha; invitado=sin seguimiento';



COMMENT ON COLUMN "public"."jugadores"."ficha_estado" IS 'completa=perfil full; pre_ficha=tracking cargas; minima=solo identidad para sesiones';



CREATE TABLE IF NOT EXISTS "public"."match_day_config" (
    "codigo" character varying(10) NOT NULL,
    "nombre" character varying(50),
    "dias_desde_partido" integer,
    "carga_fisica" character varying(100),
    "espacios_recomendados" character varying(255),
    "nivel_cognitivo_max" integer,
    "descripcion" "text",
    "categorias_preferidas" "jsonb" DEFAULT '[]'::"jsonb",
    "categorias_evitar" "jsonb" DEFAULT '[]'::"jsonb",
    "orden" integer
);


ALTER TABLE "public"."match_day_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mensajes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversacion_id" "uuid" NOT NULL,
    "autor_id" "uuid" NOT NULL,
    "contenido" "text" NOT NULL,
    "tipo" character varying(20) DEFAULT 'texto'::character varying,
    "archivo_url" "text",
    "fijado" boolean DEFAULT false,
    "editado" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "mensajes_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['texto'::character varying, 'imagen'::character varying, 'archivo'::character varying, 'sistema'::character varying])::"text"[])))
);


ALTER TABLE "public"."mensajes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."microciclos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "fecha_inicio" "date" NOT NULL,
    "fecha_fin" "date" NOT NULL,
    "partido_id" "uuid",
    "objetivo_principal" "text",
    "objetivo_tactico" "text",
    "objetivo_fisico" "text",
    "estado" character varying(20) DEFAULT 'borrador'::character varying,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "rival_id" "uuid",
    "game_model_id" "uuid",
    "plan_ct" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "microciclos_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['borrador'::character varying, 'planificado'::character varying, 'en_curso'::character varying, 'completado'::character varying])::"text"[])))
);


ALTER TABLE "public"."microciclos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."microciclos"."plan_ct" IS 'CT planning for the week (Sala del Lunes): rival_scout, plan_partido, once_probable, dias (morfociclo structure per Frade/Seirulo).';



CREATE TABLE IF NOT EXISTS "public"."notificaciones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "titulo" character varying(255) NOT NULL,
    "contenido" "text",
    "entidad_tipo" character varying(50),
    "entidad_id" "uuid",
    "leida" boolean DEFAULT false,
    "prioridad" character varying(20) DEFAULT 'normal'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notificaciones_prioridad_check" CHECK ((("prioridad")::"text" = ANY ((ARRAY['baja'::character varying, 'normal'::character varying, 'alta'::character varying, 'urgente'::character varying])::"text"[])))
);


ALTER TABLE "public"."notificaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_progreso" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "paso_actual" integer DEFAULT 1,
    "pasos_completados" "jsonb" DEFAULT '{}'::"jsonb",
    "completado" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."onboarding_progreso" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizaciones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nombre" character varying(255) NOT NULL,
    "logo_url" "text",
    "color_primario" character varying(7) DEFAULT '#1a365d'::character varying,
    "color_secundario" character varying(7) DEFAULT '#ffffff'::character varying,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tipo_licencia" character varying(20) DEFAULT 'equipo'::character varying,
    "owner_id" "uuid",
    CONSTRAINT "organizaciones_tipo_licencia_check" CHECK ((("tipo_licencia")::"text" = ANY ((ARRAY['equipo'::character varying, 'club'::character varying])::"text"[])))
);


ALTER TABLE "public"."organizaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partidos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "rival_id" "uuid" NOT NULL,
    "fecha" "date" NOT NULL,
    "hora" character varying(5),
    "localia" character varying(20) DEFAULT 'local'::character varying NOT NULL,
    "competicion" character varying(20) DEFAULT 'liga'::character varying NOT NULL,
    "jornada" integer,
    "goles_favor" integer,
    "goles_contra" integer,
    "resultado" character varying(20),
    "notas_pre" "text",
    "notas_post" "text",
    "video_url" "text",
    "informe_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "rfef_competicion_id" "uuid",
    "auto_creado" boolean DEFAULT false,
    "ubicacion" "text",
    "pre_match_intel" "jsonb",
    "hora_citacion" "text",
    "lugar_citacion" "text",
    "kit_convocatoria" "text" DEFAULT 'local'::"text",
    "arbitro" "text",
    "kit_portero" "text",
    CONSTRAINT "partidos_competicion_check" CHECK ((("competicion")::"text" = ANY ((ARRAY['liga'::character varying, 'copa'::character varying, 'amistoso'::character varying, 'torneo'::character varying, 'otro'::character varying])::"text"[]))),
    CONSTRAINT "partidos_goles_contra_check" CHECK ((("goles_contra" IS NULL) OR ("goles_contra" >= 0))),
    CONSTRAINT "partidos_goles_favor_check" CHECK ((("goles_favor" IS NULL) OR ("goles_favor" >= 0))),
    CONSTRAINT "partidos_jornada_check" CHECK ((("jornada" IS NULL) OR ("jornada" >= 1))),
    CONSTRAINT "partidos_kit_convocatoria_check" CHECK ((("kit_convocatoria" IS NULL) OR ("kit_convocatoria" = ANY (ARRAY['local'::"text", 'visitante'::"text"])))),
    CONSTRAINT "partidos_kit_portero_check" CHECK ((("kit_portero" IS NULL) OR ("kit_portero" = ANY (ARRAY['local'::"text", 'visitante'::"text"])))),
    CONSTRAINT "partidos_localia_check" CHECK ((("localia")::"text" = ANY ((ARRAY['local'::character varying, 'visitante'::character varying, 'neutral'::character varying])::"text"[]))),
    CONSTRAINT "partidos_resultado_check" CHECK ((("resultado" IS NULL) OR (("resultado")::"text" = ANY ((ARRAY['victoria'::character varying, 'empate'::character varying, 'derrota'::character varying])::"text"[]))))
);


ALTER TABLE "public"."partidos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."perfiles_nutricionales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "peso_kg" numeric(5,2),
    "altura_cm" numeric(5,2),
    "porcentaje_grasa" numeric(5,2),
    "masa_muscular_kg" numeric(5,2),
    "metabolismo_basal_kcal" integer,
    "objetivo" "text",
    "alergias" "text"[],
    "intolerancias" "text"[],
    "preferencias_dieta" "text",
    "notas" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "perfiles_nutricionales_objetivo_check" CHECK (("objetivo" = ANY (ARRAY['mantenimiento'::"text", 'ganancia_muscular'::"text", 'perdida_grasa'::"text", 'rendimiento'::"text", 'recuperacion'::"text"])))
);


ALTER TABLE "public"."perfiles_nutricionales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permisos_personalizados" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "rol_en_equipo" character varying(50),
    "usuario_id" "uuid",
    "puede_crear_sesiones" boolean,
    "puede_editar_sesiones" boolean,
    "puede_eliminar_sesiones" boolean,
    "puede_crear_tareas" boolean,
    "puede_editar_tareas" boolean,
    "puede_eliminar_tareas" boolean,
    "puede_gestionar_plantilla" boolean,
    "puede_crear_convocatorias" boolean,
    "puede_ver_rivales" boolean,
    "puede_editar_rivales" boolean,
    "puede_subir_videos" boolean,
    "puede_exportar" boolean,
    "puede_usar_ai" boolean,
    "puede_gestionar_kb" boolean,
    "puede_ver_datos_medicos" boolean,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."permisos_personalizados" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."planes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "codigo" character varying(50) NOT NULL,
    "nombre" character varying(255) NOT NULL,
    "tipo_licencia" character varying(20) NOT NULL,
    "max_equipos" integer DEFAULT 1 NOT NULL,
    "max_usuarios_por_equipo" integer DEFAULT 5 NOT NULL,
    "max_jugadores_por_equipo" integer DEFAULT 25 NOT NULL,
    "max_storage_mb" integer DEFAULT 500 NOT NULL,
    "max_ai_calls_month" integer DEFAULT 50 NOT NULL,
    "max_kb_documents" integer DEFAULT 10 NOT NULL,
    "features" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "precio_mensual_cents" integer DEFAULT 0 NOT NULL,
    "precio_anual_cents" integer DEFAULT 0 NOT NULL,
    "dias_prueba" integer DEFAULT 0,
    "orden" integer DEFAULT 0,
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "stripe_price_id_mensual" "text",
    "stripe_price_id_anual" "text",
    CONSTRAINT "planes_tipo_licencia_check" CHECK ((("tipo_licencia")::"text" = ANY ((ARRAY['equipo'::character varying, 'club'::character varying])::"text"[])))
);


ALTER TABLE "public"."planes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."planes"."stripe_price_id_mensual" IS 'Stripe Price ID for monthly billing';



COMMENT ON COLUMN "public"."planes"."stripe_price_id_anual" IS 'Stripe Price ID for annual billing';



CREATE TABLE IF NOT EXISTS "public"."planes_nutricionales_dia" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "jugador_id" "uuid",
    "fecha" "date" NOT NULL,
    "contexto" "text",
    "comidas" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "calorias_objetivo" integer,
    "proteinas_objetivo_g" numeric(6,2),
    "carbohidratos_objetivo_g" numeric(6,2),
    "grasas_objetivo_g" numeric(6,2),
    "hidratacion_litros" numeric(4,2),
    "notas" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "planes_nutricionales_dia_contexto_check" CHECK (("contexto" = ANY (ARRAY['dia_normal'::"text", 'pre_partido'::"text", 'post_partido'::"text", 'dia_descanso'::"text", 'viaje'::"text"])))
);


ALTER TABLE "public"."planes_nutricionales_dia" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."planes_partido" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partido_id" "uuid" NOT NULL,
    "microciclo_id" "uuid" NOT NULL,
    "game_model_id" "uuid",
    "sistema_juego" "text" DEFAULT '4-3-3'::"text" NOT NULL,
    "estilo_previsto" "text",
    "once_inicial" "jsonb" DEFAULT '{}'::"jsonb",
    "suplentes" "jsonb" DEFAULT '[]'::"jsonb",
    "descartados" "jsonb" DEFAULT '[]'::"jsonb",
    "capitan_id" "uuid",
    "fase_ataque_organizado" "jsonb",
    "fase_defensa_organizada" "jsonb",
    "fase_transicion_ofensiva" "jsonb",
    "fase_transicion_defensiva" "jsonb",
    "fase_abp_ofensivo" "jsonb",
    "fase_abp_defensivo" "jsonb",
    "momentos_partido" "jsonb" DEFAULT '[]'::"jsonb",
    "escenarios" "jsonb" DEFAULT '[]'::"jsonb",
    "estado" "text" DEFAULT 'borrador'::"text" NOT NULL,
    "notas" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."planes_partido" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plantillas_nutricionales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "tipo_comida" "text" NOT NULL,
    "contexto" "text",
    "descripcion" "text",
    "alimentos" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "calorias_total" integer,
    "proteinas_total_g" numeric(6,2),
    "carbohidratos_total_g" numeric(6,2),
    "grasas_total_g" numeric(6,2),
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "plantillas_nutricionales_contexto_check" CHECK (("contexto" = ANY (ARRAY['dia_normal'::"text", 'pre_partido'::"text", 'post_partido'::"text", 'dia_descanso'::"text", 'viaje'::"text", 'cualquiera'::"text"]))),
    CONSTRAINT "plantillas_nutricionales_tipo_comida_check" CHECK (("tipo_comida" = ANY (ARRAY['desayuno'::"text", 'almuerzo'::"text", 'comida'::"text", 'merienda'::"text", 'cena'::"text", 'snack_pre'::"text", 'snack_post'::"text"])))
);


ALTER TABLE "public"."plantillas_nutricionales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portero_tareas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sesion_id" "uuid" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "orden" integer DEFAULT 0 NOT NULL,
    "nombre" character varying(200) NOT NULL,
    "descripcion" "text",
    "duracion" integer DEFAULT 10,
    "intensidad" character varying(20) DEFAULT 'media'::character varying,
    "tipo" character varying(50),
    "diagram" "jsonb",
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."portero_tareas" OWNER TO "postgres";













CREATE TABLE IF NOT EXISTS "public"."pruebas_medicas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "registro_medico_id" "uuid" NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "tipo" "text" DEFAULT 'otro'::"text" NOT NULL,
    "titulo" "text" NOT NULL,
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "resultado" "text",
    "apto" boolean,
    "documento_url" "text",
    "notas" "text",
    "creado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pruebas_medicas_tipo_check" CHECK (("tipo" = ANY (ARRAY['imagen'::"text", 'reconocimiento'::"text", 'isokinetico'::"text", 'gps_campo'::"text", 'laboratorio'::"text", 'funcional'::"text", 'otro'::"text"])))
);


ALTER TABLE "public"."pruebas_medicas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."registros_medicos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "tipo" character varying(30) NOT NULL,
    "titulo" character varying(255) NOT NULL,
    "descripcion" "text",
    "diagnostico" "text",
    "tratamiento" "text",
    "medicacion" "text",
    "fecha_inicio" "date" NOT NULL,
    "fecha_fin" "date",
    "fecha_alta" "date",
    "dias_baja_estimados" integer,
    "dias_baja_reales" integer,
    "protocolo_recuperacion" "jsonb",
    "estado" character varying(20) DEFAULT 'activo'::character varying,
    "documentos" "jsonb" DEFAULT '[]'::"jsonb",
    "creado_por" "uuid" NOT NULL,
    "solo_medico" boolean DEFAULT true,
    "encryption_version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "diagnostico_fisioterapeutico" "text",
    "documentos_urls" "jsonb" DEFAULT '[]'::"jsonb",
    "registro_padre_id" "uuid",
    "severidad" "text",
    "zona_corporal" "text",
    "lado" "text",
    "mecanismo" "text",
    "es_relesion" boolean DEFAULT false NOT NULL,
    "registro_origen_id" "uuid",
    "disponibilidad" "text",
    "fase_rtp" "text",
    "es_historico" boolean DEFAULT false,
    "zonas" "jsonb" DEFAULT '[]'::"jsonb",
    "fase_tratamiento" character varying(30),
    CONSTRAINT "registros_medicos_disponibilidad_check" CHECK ((("disponibilidad" IS NULL) OR ("disponibilidad" = ANY (ARRAY['fuera'::"text", 'individual'::"text", 'grupo_adaptado'::"text", 'pleno'::"text"])))),
    CONSTRAINT "registros_medicos_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['activo'::character varying, 'en_recuperacion'::character varying, 'alta'::character varying, 'cronico'::character varying])::"text"[]))),
    CONSTRAINT "registros_medicos_fase_rtp_check" CHECK ((("fase_rtp" IS NULL) OR ("fase_rtp" = ANY (ARRAY['fase_1_control_dolor'::"text", 'fase_2_movilidad'::"text", 'fase_3_fuerza_base'::"text", 'fase_4_fuerza_funcional'::"text", 'fase_5_carrera_lineal'::"text", 'fase_6_cambios_direccion'::"text", 'fase_7_entrenamiento_equipo'::"text", 'fase_8_competicion'::"text"])))),
    CONSTRAINT "registros_medicos_fase_tratamiento_check" CHECK ((("fase_tratamiento" IS NULL) OR (("fase_tratamiento")::"text" = ANY ((ARRAY['reposo'::character varying, 'margen'::character varying, 'inicio_grupo'::character varying, 'disponible'::character varying])::"text"[])))),
    CONSTRAINT "registros_medicos_lado_check" CHECK ((("lado" IS NULL) OR ("lado" = ANY (ARRAY['izquierdo'::"text", 'derecho'::"text", 'bilateral'::"text", 'no_aplica'::"text"])))),
    CONSTRAINT "registros_medicos_severidad_check" CHECK ((("severidad" IS NULL) OR ("severidad" = ANY (ARRAY['leve'::"text", 'moderada'::"text", 'grave'::"text"])))),
    CONSTRAINT "registros_medicos_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['lesion'::character varying, 'enfermedad'::character varying, 'molestias'::character varying, 'rehabilitacion'::character varying, 'otro'::character varying])::"text"[])))
);


ALTER TABLE "public"."registros_medicos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."registros_medicos"."es_historico" IS 'Lesión previa (otra etapa / otro club). No mueve la disponibilidad actual.';



COMMENT ON COLUMN "public"."registros_medicos"."zonas" IS 'Zonas del mapa corporal: [{id, lado?}].';



COMMENT ON COLUMN "public"."registros_medicos"."fase_tratamiento" IS 'Crescendo clínico (ficha/enfermería): reposo → margen → inicio grupo → disponible.';



CREATE TABLE IF NOT EXISTS "public"."registros_rpe" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "sesion_id" "uuid",
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "rpe" integer,
    "duracion_percibida" integer,
    "sueno" integer,
    "fatiga" integer,
    "dolor" integer,
    "estres" integer,
    "humor" integer,
    "carga_sesion" numeric(6,1),
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tipo" "text" DEFAULT 'sesion'::"text" NOT NULL,
    "titulo" "text",
    "horas_sueno" numeric(4,1),
    "molestia" boolean,
    "molestia_texto" "text",
    "partido_id" "uuid",
    CONSTRAINT "registros_rpe_dolor_check" CHECK ((("dolor" >= 1) AND ("dolor" <= 5))),
    CONSTRAINT "registros_rpe_estres_check" CHECK ((("estres" >= 1) AND ("estres" <= 5))),
    CONSTRAINT "registros_rpe_fatiga_check" CHECK ((("fatiga" >= 1) AND ("fatiga" <= 5))),
    CONSTRAINT "registros_rpe_humor_check" CHECK ((("humor" >= 1) AND ("humor" <= 5))),
    CONSTRAINT "registros_rpe_rpe_check" CHECK ((("rpe" >= 1) AND ("rpe" <= 10))),
    CONSTRAINT "registros_rpe_sueno_check" CHECK ((("sueno" >= 1) AND ("sueno" <= 5)))
);


ALTER TABLE "public"."registros_rpe" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rendimiento_notas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "convocatoria_id" "uuid" NOT NULL,
    "evaluador_id" "uuid" NOT NULL,
    "nota" numeric(3,1) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rendimiento_notas_nota_check" CHECK ((("nota" >= (1)::numeric) AND ("nota" <= (10)::numeric)))
);


ALTER TABLE "public"."rendimiento_notas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."revision_clip_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clip_id" "uuid" NOT NULL,
    "folder_id" "uuid",
    "slot_tipo" "text" DEFAULT 'folder'::"text" NOT NULL,
    "jugador_id" "uuid",
    "rival_jugador_nombre" "text",
    "rival_jugador_dorsal" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "revision_clip_links_slot_tipo_check" CHECK (("slot_tipo" = ANY (ARRAY['folder'::"text", 'once_jugador'::"text"])))
);


ALTER TABLE "public"."revision_clip_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."revision_clips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pack_id" "uuid" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "titulo" "text" NOT NULL,
    "frase" "text",
    "nota" "text",
    "url" "text",
    "storage_path" "text",
    "mime_type" "text",
    "size_bytes" integer,
    "duration_ms" integer,
    "fase" "text",
    "jugador_id" "uuid",
    "rival_jugador_nombre" "text",
    "rival_jugador_dorsal" "text",
    "source_video_id" "uuid",
    "start_ms" integer,
    "end_ms" integer,
    "hot_until" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "drive_file_id" "text",
    "drive_path" "text",
    "status" "text" DEFAULT 'hot'::"text" NOT NULL,
    "archive_warning" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "revision_clips_status_check" CHECK (("status" = ANY (ARRAY['hot'::"text", 'en_drive'::"text", 'missing'::"text"])))
);


ALTER TABLE "public"."revision_clips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."revision_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pack_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "nombre" "text" NOT NULL,
    "fase" "text",
    "orden" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."revision_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."revision_packs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "ambito" "text" NOT NULL,
    "partido_id" "uuid",
    "rival_id" "uuid",
    "microciclo_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "revision_packs_ambito_check" CHECK (("ambito" = ANY (ARRAY['partido_post'::"text", 'rival'::"text", 'partido_plan'::"text"])))
);


ALTER TABLE "public"."revision_packs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."revision_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "pack_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "host_user_id" "uuid",
    "current_clip_id" "uuid",
    "current_time_ms" integer DEFAULT 0 NOT NULL,
    "paused" boolean DEFAULT true NOT NULL,
    "overlay_json" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."revision_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rfef_actas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "competicion_id" "uuid" NOT NULL,
    "jornada_numero" integer NOT NULL,
    "cod_acta" "text" NOT NULL,
    "local_nombre" "text" NOT NULL,
    "visitante_nombre" "text" NOT NULL,
    "local_escudo_url" "text",
    "visitante_escudo_url" "text",
    "goles_local" integer,
    "goles_visitante" integer,
    "estadio" "text",
    "ciudad" "text",
    "fecha" "date",
    "hora" time without time zone,
    "titulares_local" "jsonb" DEFAULT '[]'::"jsonb",
    "suplentes_local" "jsonb" DEFAULT '[]'::"jsonb",
    "titulares_visitante" "jsonb" DEFAULT '[]'::"jsonb",
    "suplentes_visitante" "jsonb" DEFAULT '[]'::"jsonb",
    "goles" "jsonb" DEFAULT '[]'::"jsonb",
    "tarjetas_local" "jsonb" DEFAULT '[]'::"jsonb",
    "tarjetas_visitante" "jsonb" DEFAULT '[]'::"jsonb",
    "sustituciones_local" "jsonb" DEFAULT '[]'::"jsonb",
    "sustituciones_visitante" "jsonb" DEFAULT '[]'::"jsonb",
    "cuerpo_tecnico_local" "jsonb" DEFAULT '{}'::"jsonb",
    "cuerpo_tecnico_visitante" "jsonb" DEFAULT '{}'::"jsonb",
    "arbitros" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rfef_actas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rfef_competiciones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "rfef_id" character varying(100),
    "nombre" character varying(255) NOT NULL,
    "categoria" character varying(100),
    "grupo" character varying(100),
    "temporada" character varying(20),
    "url_fuente" "text",
    "clasificacion" "jsonb" DEFAULT '[]'::"jsonb",
    "calendario" "jsonb" DEFAULT '[]'::"jsonb",
    "ultima_sync" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "rfef_codcompeticion" "text",
    "rfef_codgrupo" "text",
    "rfef_codtemporada" "text" DEFAULT '21'::"text",
    "ultima_sincronizacion" timestamp with time zone,
    "sync_habilitado" boolean DEFAULT true,
    "goleadores" "jsonb" DEFAULT '[]'::"jsonb",
    "mi_equipo_nombre" "text",
    "sancion_competicion_id" "text",
    "sancion_grupo_id" "text",
    "sync_status" "jsonb"
);


ALTER TABLE "public"."rfef_competiciones" OWNER TO "postgres";


COMMENT ON COLUMN "public"."rfef_competiciones"."rfef_codcompeticion" IS 'RFAF competition ID for scraping';



COMMENT ON COLUMN "public"."rfef_competiciones"."rfef_codgrupo" IS 'RFAF group ID for scraping';



COMMENT ON COLUMN "public"."rfef_competiciones"."rfef_codtemporada" IS 'RFAF season code (e.g. 21)';



COMMENT ON COLUMN "public"."rfef_competiciones"."ultima_sincronizacion" IS 'Last successful sync timestamp';



COMMENT ON COLUMN "public"."rfef_competiciones"."sync_habilitado" IS 'Whether automatic sync is enabled';



COMMENT ON COLUMN "public"."rfef_competiciones"."goleadores" IS 'Top scorers ranking from RFAF';



COMMENT ON COLUMN "public"."rfef_competiciones"."sync_status" IS 'Tracks acta sync completeness: total, complete, incomplete, failed counts and timestamps';



CREATE TABLE IF NOT EXISTS "public"."rfef_jornadas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "competicion_id" "uuid" NOT NULL,
    "numero" integer NOT NULL,
    "fecha" "date",
    "partidos" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rfef_jornadas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rfef_sanciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "competicion_id" "uuid" NOT NULL,
    "jornada_numero" integer NOT NULL,
    "jornada_fecha" "date",
    "reunion_fecha" "date",
    "categoria" "text" NOT NULL,
    "equipo_nombre" "text" NOT NULL,
    "persona_nombre" "text" DEFAULT ''::"text",
    "tipo_licencia" "text",
    "articulo" "text",
    "descripcion" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rfef_sanciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rival_informes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rival_id" "uuid" NOT NULL,
    "organizacion_id" "uuid" NOT NULL,
    "partido_id" "uuid",
    "tipo" "text" DEFAULT 'informe'::"text" NOT NULL,
    "contenido" "jsonb" NOT NULL,
    "conversacion" "jsonb" DEFAULT '[]'::"jsonb",
    "intel_snapshot" "jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rival_informes_tipo_check" CHECK (("tipo" = ANY (ARRAY['informe'::"text", 'plan'::"text"])))
);


ALTER TABLE "public"."rival_informes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rivales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizacion_id" "uuid" NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "nombre_corto" character varying(10),
    "escudo_url" "text",
    "estadio" character varying(100),
    "ciudad" character varying(100),
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "rfef_nombre" "text",
    "sistema_juego" character varying(20),
    "estilo" character varying(50),
    "rival_intel" "jsonb",
    "scout_manual" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "plan_partido_manual" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."rivales" OWNER TO "postgres";


COMMENT ON COLUMN "public"."rivales"."scout_manual" IS 'Informe rival manual: fases, clips, pizarras, anotaciones. Sync bidireccional con plan_ct.rival_scout (excepto contexto semanal y XI RFEF).';



COMMENT ON COLUMN "public"."rivales"."plan_partido_manual" IS 'Plan de partido manual: fases, principios, clips, pizarras. Sync bidireccional con plan_ct.plan_partido (excepto consignas semanales).';



CREATE TABLE IF NOT EXISTS "public"."sesion_tareas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sesion_id" "uuid" NOT NULL,
    "tarea_id" "uuid" NOT NULL,
    "orden" integer NOT NULL,
    "fase_sesion" character varying(50) NOT NULL,
    "duracion_override" integer,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "formacion_equipos" "jsonb",
    "responsable" "text",
    "carga_calculada" numeric,
    "minutos_efectivos" integer,
    CONSTRAINT "sesion_tareas_fase_sesion_check" CHECK ((("fase_sesion")::"text" = ANY ((ARRAY['activacion'::character varying, 'desarrollo_1'::character varying, 'desarrollo_2'::character varying, 'desarrollo_3'::character varying, 'desarrollo_4'::character varying, 'desarrollo_5'::character varying, 'desarrollo_6'::character varying, 'vuelta_calma'::character varying, 'compensatorio_1'::character varying, 'compensatorio_2'::character varying, 'compensatorio_3'::character varying])::"text"[])))
);


ALTER TABLE "public"."sesion_tareas" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sesion_tareas"."formacion_equipos" IS 'Estructura: { estructura_original, auto_generado, espacios: [{ nombre, estructura, grupos: [{ nombre, color, tipo, jugador_ids }] }] }';



CREATE TABLE IF NOT EXISTS "public"."sesiones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "titulo" character varying(255) NOT NULL,
    "fecha" "date" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "creado_por" "uuid",
    "match_day" character varying(10) NOT NULL,
    "rival" character varying(255),
    "competicion" character varying(255),
    "duracion_total" integer,
    "objetivo_principal" "text",
    "fase_juego_principal" character varying(50),
    "principio_tactico_principal" character varying(255),
    "carga_fisica_objetivo" character varying(100),
    "intensidad_objetivo" character varying(20),
    "estado" character varying(20) DEFAULT 'borrador'::character varying,
    "notas_pre" "text",
    "notas_post" "text",
    "pdf_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "microciclo_id" "uuid",
    "materiales" "jsonb" DEFAULT '[]'::"jsonb",
    "staff_asistentes" "jsonb" DEFAULT '[]'::"jsonb",
    "fase_notas" "jsonb" DEFAULT '{}'::"jsonb",
    "hora" time without time zone,
    "lugar" "text",
    "plan_partido_id" "uuid",
    "fase_plan" "text",
    "dia_numero" integer,
    "orden" integer DEFAULT 0,
    "espacio_disponible" character varying(30),
    "jugadores_campo" smallint,
    "numero_sesion" integer,
    "objetivos" "jsonb" DEFAULT '[]'::"jsonb",
    "contenidos_ofensivos" "jsonb" DEFAULT '[]'::"jsonb",
    "contenidos_defensivos" "jsonb" DEFAULT '[]'::"jsonb",
    "fases_juego" "text"[] DEFAULT '{}'::"text"[],
    "subfases" "jsonb" DEFAULT '[]'::"jsonb",
    "abp_config" "jsonb",
    "contenidos_tecnicos_of" "text"[] DEFAULT '{}'::"text"[],
    "contenidos_tecnicos_def" "text"[] DEFAULT '{}'::"text"[],
    "keywords" "text"[] DEFAULT '{}'::"text"[],
    "objetivo_fisico" "text",
    "objetivo_psicologico" "text",
    "contexto_periodo" "text" DEFAULT 'competicion'::"text",
    "dia_carga" "text",
    "partido_id" "uuid",
    "es_pretemporada" boolean DEFAULT false,
    "carga_sesion" numeric,
    "intensidad_calculada" "text",
    "share_token" "text",
    "estructura_fases" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "sesiones_espacio_disponible_valido" CHECK ((("espacio_disponible" IS NULL) OR (("espacio_disponible")::"text" = ANY ((ARRAY['campo_completo'::character varying, 'medio_campo'::character varying, 'area_doble'::character varying, 'area_simple'::character varying, 'gimnasio'::character varying])::"text"[])))),
    CONSTRAINT "sesiones_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['borrador'::character varying, 'planificada'::character varying, 'completada'::character varying, 'cancelada'::character varying])::"text"[]))),
    CONSTRAINT "sesiones_intensidad_objetivo_check" CHECK ((("intensidad_objetivo")::"text" = ANY ((ARRAY['alta'::character varying, 'media'::character varying, 'baja'::character varying, 'muy_baja'::character varying])::"text"[])))
);


ALTER TABLE "public"."sesiones" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sesiones"."espacio_disponible" IS 'Espacio del que se dispone para la sesion';



COMMENT ON COLUMN "public"."sesiones"."jugadores_campo" IS 'Jugadores de campo previstos (sin porteros)';



COMMENT ON COLUMN "public"."sesiones"."numero_sesion" IS 'Numero correlativo de sesion de la temporada';



COMMENT ON COLUMN "public"."sesiones"."objetivos" IS 'Codigos de OBJETIVOS_TAREA que se quieren trabajar';



COMMENT ON COLUMN "public"."sesiones"."contenidos_ofensivos" IS 'Codigos de CONTENIDOS_OFENSIVOS';



COMMENT ON COLUMN "public"."sesiones"."contenidos_defensivos" IS 'Codigos de CONTENIDOS_DEFENSIVOS';



COMMENT ON COLUMN "public"."sesiones"."fases_juego" IS 'Fases de juego multi (ataque_organizado, …)';



COMMENT ON COLUMN "public"."sesiones"."subfases" IS 'Lista {fase, subfase, opcion?}';



COMMENT ON COLUMN "public"."sesiones"."abp_config" IS '{activo, lado, tipos[]} o null';



COMMENT ON COLUMN "public"."sesiones"."keywords" IS 'Keywords derivadas del objetivo + edición manual';



COMMENT ON COLUMN "public"."sesiones"."carga_sesion" IS 'Carga agregada calculada desde tareas';



COMMENT ON COLUMN "public"."sesiones"."intensidad_calculada" IS 'alta|media|baja|muy_baja derivada';



COMMENT ON COLUMN "public"."sesiones"."share_token" IS 'Token para vista compartible de solo lectura';



COMMENT ON COLUMN "public"."sesiones"."estructura_fases" IS 'Lista ordenada de bloques de la sesión: { id, tipo, label, duracion_objetivo?, notas?, orden }';



CREATE TABLE IF NOT EXISTS "public"."solicitudes_gdpr" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "tipo" character varying(30) NOT NULL,
    "estado" character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    "descripcion" "text",
    "respuesta" "text",
    "procesado_por" "uuid",
    "fecha_limite" timestamp with time zone NOT NULL,
    "fecha_completada" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "solicitudes_gdpr_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['pendiente'::character varying, 'en_proceso'::character varying, 'completada'::character varying, 'rechazada'::character varying])::"text"[]))),
    CONSTRAINT "solicitudes_gdpr_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['acceso'::character varying, 'rectificacion'::character varying, 'supresion'::character varying, 'portabilidad'::character varying, 'oposicion'::character varying, 'limitacion'::character varying])::"text"[])))
);


ALTER TABLE "public"."solicitudes_gdpr" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suplementacion_jugador" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "dosis" "text",
    "frecuencia" "text",
    "fecha_inicio" "date" NOT NULL,
    "fecha_fin" "date",
    "activo" boolean DEFAULT true,
    "notas" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."suplementacion_jugador" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suscripciones" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organizacion_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "estado" character varying(20) DEFAULT 'trial'::character varying NOT NULL,
    "ciclo" character varying(10) DEFAULT 'mensual'::character varying NOT NULL,
    "fecha_inicio" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fecha_fin" timestamp with time zone,
    "fecha_proximo_pago" timestamp with time zone,
    "fecha_cancelacion" timestamp with time zone,
    "fecha_gracia_fin" timestamp with time zone,
    "trial_fin" timestamp with time zone,
    "trial_convertido" boolean DEFAULT false,
    "stripe_subscription_id" character varying(255),
    "stripe_customer_id" character varying(255),
    "uso_equipos" integer DEFAULT 0,
    "uso_storage_mb" integer DEFAULT 0,
    "uso_ai_calls_month" integer DEFAULT 0,
    "uso_ai_calls_reset_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "suscripciones_ciclo_check" CHECK ((("ciclo")::"text" = ANY ((ARRAY['mensual'::character varying, 'anual'::character varying])::"text"[]))),
    CONSTRAINT "suscripciones_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['trial'::character varying, 'active'::character varying, 'past_due'::character varying, 'grace_period'::character varying, 'suspended'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."suscripciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tactical_board_frames" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "board_id" "uuid" NOT NULL,
    "orden" integer DEFAULT 0 NOT NULL,
    "nombre" "text",
    "duration_ms" integer DEFAULT 2000 NOT NULL,
    "elements" "jsonb" DEFAULT '[]'::"jsonb",
    "arrows" "jsonb" DEFAULT '[]'::"jsonb",
    "zones" "jsonb" DEFAULT '[]'::"jsonb",
    "transition_type" "text" DEFAULT 'linear'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tactical_board_frames_transition_type_check" CHECK (("transition_type" = ANY (ARRAY['linear'::"text", 'ease'::"text", 'ease-in-out'::"text"])))
);


ALTER TABLE "public"."tactical_board_frames" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tactical_boards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "tipo" "text" DEFAULT 'static'::"text" NOT NULL,
    "pitch_type" "text" DEFAULT 'full'::"text" NOT NULL,
    "home_team" "jsonb" DEFAULT '[]'::"jsonb",
    "away_team" "jsonb" DEFAULT '[]'::"jsonb",
    "elements" "jsonb" DEFAULT '[]'::"jsonb",
    "arrows" "jsonb" DEFAULT '[]'::"jsonb",
    "zones" "jsonb" DEFAULT '[]'::"jsonb",
    "thumbnail_data" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tactical_boards_pitch_type_check" CHECK (("pitch_type" = ANY (ARRAY['full'::"text", 'half'::"text"]))),
    CONSTRAINT "tactical_boards_tipo_check" CHECK (("tipo" = ANY (ARRAY['static'::"text", 'animated'::"text"])))
);


ALTER TABLE "public"."tactical_boards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tareas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "titulo" character varying(255) NOT NULL,
    "codigo" character varying(50),
    "categoria_id" "uuid",
    "organizacion_id" "uuid" NOT NULL,
    "equipo_id" "uuid",
    "creado_por" "uuid",
    "duracion_total" integer NOT NULL,
    "num_series" integer DEFAULT 1,
    "duracion_serie" integer,
    "tiempo_descanso" integer DEFAULT 0,
    "espacio_largo" numeric(5,1),
    "espacio_ancho" numeric(5,1),
    "espacio_forma" character varying(50) DEFAULT 'rectangular'::character varying,
    "num_jugadores_min" integer NOT NULL,
    "num_jugadores_max" integer,
    "num_porteros" integer DEFAULT 0,
    "estructura_equipos" character varying(100),
    "descripcion" "text",
    "como_inicia" "text",
    "como_finaliza" "text",
    "reglas_tecnicas" "jsonb" DEFAULT '[]'::"jsonb",
    "reglas_tacticas" "jsonb" DEFAULT '[]'::"jsonb",
    "reglas_psicologicas" "jsonb" DEFAULT '[]'::"jsonb",
    "forma_puntuar" "text",
    "fase_juego" character varying(50),
    "principio_tactico" character varying(255),
    "subprincipio_tactico" character varying(255),
    "accion_tecnica" character varying(255),
    "intencion_tactica" character varying(255),
    "tipo_esfuerzo" character varying(100),
    "m2_por_jugador" numeric(6,1),
    "ratio_trabajo_descanso" character varying(20),
    "densidad" character varying(20),
    "fc_esperada_min" integer,
    "fc_esperada_max" integer,
    "nivel_cognitivo" integer,
    "consignas_ofensivas" "jsonb" DEFAULT '[]'::"jsonb",
    "consignas_defensivas" "jsonb" DEFAULT '[]'::"jsonb",
    "errores_comunes" "jsonb" DEFAULT '[]'::"jsonb",
    "grafico_url" "text",
    "grafico_svg" "text",
    "grafico_data" "jsonb",
    "es_plantilla" boolean DEFAULT false,
    "es_publica" boolean DEFAULT false,
    "tags" "jsonb" DEFAULT '[]'::"jsonb",
    "valoracion_media" numeric(2,1),
    "num_usos" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "variantes" "jsonb" DEFAULT '[]'::"jsonb",
    "progresiones" "jsonb" DEFAULT '[]'::"jsonb",
    "regresiones" "jsonb" DEFAULT '[]'::"jsonb",
    "material" "jsonb" DEFAULT '[]'::"jsonb",
    "match_days_recomendados" "jsonb" DEFAULT '[]'::"jsonb",
    "objetivo_fisico" character varying(100),
    "objetivo_psicologico" character varying(100),
    "video_url" "text",
    "es_complementaria" boolean DEFAULT false,
    "grupo_muscular" "text"[],
    "equipamiento" "text"[],
    "tipo_contraccion" character varying(20),
    "zona_cuerpo" character varying(20),
    "objetivo_gym" character varying(30),
    "series_repeticiones" "jsonb",
    "protocolo_progresion" "text",
    "complejidad" "text",
    "dificultad" smallint,
    "exigencia" smallint,
    "modalidad" character varying(20),
    "objetivos_tacticos" "text"[] DEFAULT '{}'::"text"[],
    "objetivos_tecnicos" "text"[] DEFAULT '{}'::"text"[],
    "orientaciones_fisicas" "text"[] DEFAULT '{}'::"text"[],
    "etiquetas_fisicas" "text"[] DEFAULT '{}'::"text"[],
    "desarrollo" "text",
    "reglas" "text",
    "anotaciones" "text",
    "tarea_origen_id" "uuid",
    "tipo_variante" character varying(20),
    "complejidad_go" smallint,
    "complejidad_pes" smallint,
    CONSTRAINT "tareas_complejidad_go_check" CHECK ((("complejidad_go" IS NULL) OR (("complejidad_go" >= 1) AND ("complejidad_go" <= 5)))),
    CONSTRAINT "tareas_complejidad_pes_check" CHECK ((("complejidad_pes" IS NULL) OR (("complejidad_pes" >= 1) AND ("complejidad_pes" <= 5)))),
    CONSTRAINT "tareas_densidad_check" CHECK ((("densidad")::"text" = ANY ((ARRAY['alta'::character varying, 'media'::character varying, 'baja'::character varying])::"text"[]))),
    CONSTRAINT "tareas_dificultad_rango" CHECK ((("dificultad" IS NULL) OR (("dificultad" >= 1) AND ("dificultad" <= 5)))),
    CONSTRAINT "tareas_exigencia_rango" CHECK ((("exigencia" IS NULL) OR (("exigencia" >= 1) AND ("exigencia" <= 5)))),
    CONSTRAINT "tareas_fase_juego_check" CHECK ((("fase_juego")::"text" = ANY ((ARRAY['ataque_organizado'::character varying, 'defensa_organizada'::character varying, 'transicion_ataque_defensa'::character varying, 'transicion_defensa_ataque'::character varying, 'balon_parado_ofensivo'::character varying, 'balon_parado_defensivo'::character varying])::"text"[]))),
    CONSTRAINT "tareas_modalidad_check" CHECK ((("modalidad" IS NULL) OR (("modalidad")::"text" = ANY ((ARRAY['analitica'::character varying, 'global'::character varying, 'competitiva'::character varying, 'general'::character varying])::"text"[])))),
    CONSTRAINT "tareas_nivel_cognitivo_check" CHECK ((("nivel_cognitivo" >= 1) AND ("nivel_cognitivo" <= 3))),
    CONSTRAINT "tareas_objetivo_gym_check" CHECK ((("objetivo_gym")::"text" = ANY ((ARRAY['fuerza_maxima'::character varying, 'hipertrofia'::character varying, 'potencia'::character varying, 'resistencia_muscular'::character varying, 'movilidad'::character varying, 'activacion'::character varying, 'recuperacion'::character varying])::"text"[]))),
    CONSTRAINT "tareas_tipo_contraccion_check" CHECK ((("tipo_contraccion")::"text" = ANY ((ARRAY['concentrica'::character varying, 'excentrica'::character varying, 'isometrica'::character varying, 'pliometrica'::character varying])::"text"[]))),
    CONSTRAINT "tareas_tipo_variante_check" CHECK ((("tipo_variante" IS NULL) OR (("tipo_variante")::"text" = ANY ((ARRAY['original'::character varying, 'progresion'::character varying, 'regresion'::character varying, 'adaptacion'::character varying, 'contexto'::character varying, 'reglas'::character varying])::"text"[])))),
    CONSTRAINT "tareas_zona_cuerpo_check" CHECK ((("zona_cuerpo")::"text" = ANY ((ARRAY['tren_superior'::character varying, 'tren_inferior'::character varying, 'core'::character varying, 'full_body'::character varying])::"text"[])))
);


ALTER TABLE "public"."tareas" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tareas"."complejidad" IS 'Regla que aumenta la exigencia cognitiva (ej. "Limitar a 1-2 toques")';



COMMENT ON COLUMN "public"."tareas"."dificultad" IS 'Escala 1-5 de dificultad tecnico-tactica';



COMMENT ON COLUMN "public"."tareas"."exigencia" IS 'Escala 1-5 de exigencia fisica percibida';



COMMENT ON COLUMN "public"."tareas"."modalidad" IS 'Enfoque: analitica | global | competitiva | general (no fútbol)';



COMMENT ON COLUMN "public"."tareas"."objetivos_tacticos" IS 'Objetivos tácticos (principios / intenciones de juego)';



COMMENT ON COLUMN "public"."tareas"."objetivos_tecnicos" IS 'Objetivos técnicos (gestos y acciones)';



COMMENT ON COLUMN "public"."tareas"."orientaciones_fisicas" IS 'activacion | fuerza | resistencia | velocidad';



COMMENT ON COLUMN "public"."tareas"."etiquetas_fisicas" IS 'Etiquetas libres del preparador físico';



CREATE TABLE IF NOT EXISTS "public"."tareas_contenidos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tarea_id" "uuid" NOT NULL,
    "contenido_id" "uuid" NOT NULL,
    "es_principal" boolean DEFAULT false,
    "relevancia" integer DEFAULT 5,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tareas_contenidos_relevancia_check" CHECK ((("relevancia" >= 1) AND ("relevancia" <= 10)))
);


ALTER TABLE "public"."tareas_contenidos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transferencias_propiedad" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "de_usuario_id" "uuid" NOT NULL,
    "a_usuario_id" "uuid" NOT NULL,
    "estado" character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    "token" character varying(128) NOT NULL,
    "expira_en" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "fecha_respuesta" timestamp with time zone,
    CONSTRAINT "transferencias_propiedad_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['pendiente'::character varying, 'aceptada'::character varying, 'rechazada'::character varying, 'expirada'::character varying])::"text"[])))
);


ALTER TABLE "public"."transferencias_propiedad" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tratamiento_diario" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "registro_medico_id" "uuid" NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "equipo_id" "uuid",
    "fecha" "date" NOT NULL,
    "sesion_id" "uuid",
    "entrenamiento_margen_id" "uuid",
    "fase_tratamiento" character varying(30),
    "trabajo" "text",
    "ejercicios" "text",
    "feedback" "text",
    "nutricion" "text",
    "suplementacion" "text",
    "creado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tratamiento_diario" OWNER TO "postgres";


COMMENT ON TABLE "public"."tratamiento_diario" IS 'Cuaderno diario de readaptación: trabajo, margen, feedback, nutrición.';



CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "nombre" character varying(255) NOT NULL,
    "apellidos" character varying(255),
    "avatar_url" "text",
    "rol" character varying(50) DEFAULT 'tecnico_asistente'::character varying NOT NULL,
    "organizacion_id" "uuid",
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "es_menor" boolean DEFAULT false,
    "fecha_nacimiento" "date",
    "mfa_enabled" boolean DEFAULT false,
    "gdpr_consentimiento" boolean DEFAULT false,
    "gdpr_consentimiento_fecha" timestamp with time zone,
    "ultimo_acceso" timestamp with time zone,
    "username" character varying(50),
    CONSTRAINT "usuarios_rol_check" CHECK ((("rol")::"text" = ANY ((ARRAY['superadmin_plataforma'::character varying, 'admin'::character varying, 'administrador_club'::character varying, 'coordinador_club'::character varying, 'presidente'::character varying, 'director_deportivo'::character varying, 'secretario'::character varying, 'entrenador_principal'::character varying, 'segundo_entrenador'::character varying, 'preparador_fisico'::character varying, 'entrenador_porteros'::character varying, 'analista'::character varying, 'fisio'::character varying, 'nutricionista'::character varying, 'delegado'::character varying, 'delegado_equipo'::character varying, 'tecnico_principal'::character varying, 'tecnico_asistente'::character varying, 'visualizador'::character varying, 'jugador'::character varying, 'tutor'::character varying])::"text"[])))
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios_equipos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "usuario_id" "uuid" NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "rol_en_equipo" character varying(50) DEFAULT 'segundo_entrenador'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "usuarios_equipos_rol_en_equipo_check" CHECK ((("rol_en_equipo")::"text" = ANY ((ARRAY['entrenador_principal'::character varying, 'segundo_entrenador'::character varying, 'preparador_fisico'::character varying, 'entrenador_porteros'::character varying, 'analista'::character varying, 'fisio'::character varying, 'nutricionista'::character varying, 'delegado'::character varying, 'delegado_equipo'::character varying, 'jugador'::character varying])::"text"[])))
);


ALTER TABLE "public"."usuarios_equipos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_ai_usage_monthly" WITH ("security_invoker"='true') AS
 SELECT "o"."id" AS "organizacion_id",
    "o"."nombre" AS "organizacion_nombre",
    "date_trunc"('month'::"text", "m"."created_at") AS "mes",
    "count"(DISTINCT "c"."id") AS "conversaciones",
    "count"(*) FILTER (WHERE (("m"."rol")::"text" = 'user'::"text")) AS "mensajes_usuario",
    "count"(*) FILTER (WHERE (("m"."rol")::"text" = 'assistant'::"text")) AS "mensajes_assistant",
    COALESCE("sum"("m"."tokens_input") FILTER (WHERE (("m"."rol")::"text" = 'assistant'::"text")), (0)::bigint) AS "total_input_tokens",
    COALESCE("sum"("m"."tokens_output") FILTER (WHERE (("m"."rol")::"text" = 'assistant'::"text")), (0)::bigint) AS "total_output_tokens",
    COALESCE("sum"("m"."cache_read_input_tokens") FILTER (WHERE (("m"."rol")::"text" = 'assistant'::"text")), (0)::bigint) AS "total_cache_read_tokens",
    COALESCE("sum"("m"."cache_creation_input_tokens") FILTER (WHERE (("m"."rol")::"text" = 'assistant'::"text")), (0)::bigint) AS "total_cache_creation_tokens",
    "count"(*) FILTER (WHERE ((("m"."rol")::"text" = 'assistant'::"text") AND ("m"."herramientas_usadas" IS NOT NULL) AND ("jsonb_array_length"("m"."herramientas_usadas") > 0))) AS "mensajes_con_tools",
    "count"(*) FILTER (WHERE (("m"."feedback")::"text" = 'positivo'::"text")) AS "feedback_positivo",
    "count"(*) FILTER (WHERE (("m"."feedback")::"text" = 'negativo'::"text")) AS "feedback_negativo",
    "round"("avg"("m"."tokens_input") FILTER (WHERE (("m"."rol")::"text" = 'assistant'::"text"))) AS "avg_input_tokens",
    "round"("avg"("m"."tokens_output") FILTER (WHERE (("m"."rol")::"text" = 'assistant'::"text"))) AS "avg_output_tokens"
   FROM ((("public"."ai_mensajes" "m"
     JOIN "public"."ai_conversaciones" "c" ON (("c"."id" = "m"."conversacion_id")))
     JOIN "public"."usuarios" "u" ON (("u"."id" = "c"."usuario_id")))
     JOIN "public"."organizaciones" "o" ON (("o"."id" = "u"."organizacion_id")))
  GROUP BY "o"."id", "o"."nombre", ("date_trunc"('month'::"text", "m"."created_at"));


ALTER VIEW "public"."v_ai_usage_monthly" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_anotaciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid",
    "equipo_id" "uuid" NOT NULL,
    "timestamp_seconds" double precision DEFAULT 0 NOT NULL,
    "titulo" "text" NOT NULL,
    "descripcion" "text",
    "drawing_data" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "thumbnail_data" "text",
    "orden" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "partido_id" "uuid"
);


ALTER TABLE "public"."video_anotaciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_playlist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "playlist_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "orden" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."video_playlist_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_playlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."video_playlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_tag_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipo_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "color" "text" DEFAULT '#3B82F6'::"text" NOT NULL,
    "shortcut_key" "text",
    "fase" "text",
    "default_duration_secs" integer DEFAULT 10 NOT NULL,
    "orden" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "video_tag_categories_fase_check" CHECK (("fase" = ANY (ARRAY['ataque_organizado'::"text", 'defensa_organizada'::"text", 'transicion_ataque_defensa'::"text", 'transicion_defensa_ataque'::"text", 'abp'::"text", NULL::"text"])))
);


ALTER TABLE "public"."video_tag_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_tag_descriptors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "color" "text",
    "shortcut_key" "text",
    "orden" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."video_tag_descriptors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "descriptor_id" "uuid",
    "jugador_id" "uuid",
    "start_ms" integer NOT NULL,
    "end_ms" integer NOT NULL,
    "fase" "text",
    "zona_campo" "text",
    "nota" "text",
    "drawing_data" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "thumbnail_data" "text",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "confidence" real,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "video_tags_fase_check" CHECK (("fase" = ANY (ARRAY['ataque_organizado'::"text", 'defensa_organizada'::"text", 'transicion_ataque_defensa'::"text", 'transicion_defensa_ataque'::"text", 'abp'::"text", NULL::"text"]))),
    CONSTRAINT "video_tags_source_check" CHECK (("source" = ANY (ARRAY['manual'::"text", 'ai'::"text", 'import'::"text"])))
);


ALTER TABLE "public"."video_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."videos_partido" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partido_id" "uuid",
    "equipo_id" "uuid" NOT NULL,
    "tipo" "text" NOT NULL,
    "contexto" "text" NOT NULL,
    "titulo" "text" NOT NULL,
    "descripcion" "text",
    "url" "text" NOT NULL,
    "storage_path" "text",
    "mime_type" "text",
    "size_bytes" bigint,
    "thumbnail_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "local_file_fingerprint" "text",
    CONSTRAINT "videos_partido_contexto_check" CHECK (("contexto" = ANY (ARRAY['pre_partido'::"text", 'post_partido'::"text"]))),
    CONSTRAINT "videos_partido_tipo_check" CHECK (("tipo" = ANY (ARRAY['veo'::"text", 'enlace_externo'::"text", 'upload'::"text"])))
);


ALTER TABLE "public"."videos_partido" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vinculos_tutor" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "jugador_id" "uuid" NOT NULL,
    "tutor_usuario_id" "uuid" NOT NULL,
    "relacion" character varying(30) NOT NULL,
    "consentimiento_otorgado" boolean DEFAULT false NOT NULL,
    "consentimiento_fecha" timestamp with time zone,
    "consentimiento_ip" character varying(45),
    "consentimiento_metodo" character varying(30),
    "documento_consentimiento_url" "text",
    "consentimiento_revocado" boolean DEFAULT false,
    "revocacion_fecha" timestamp with time zone,
    "revocacion_motivo" "text",
    "activo" boolean DEFAULT true,
    "verificado" boolean DEFAULT false,
    "verificado_por" "uuid",
    "verificado_fecha" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "vinculos_tutor_consentimiento_metodo_check" CHECK ((("consentimiento_metodo")::"text" = ANY ((ARRAY['digital'::character varying, 'presencial'::character varying, 'documento'::character varying])::"text"[]))),
    CONSTRAINT "vinculos_tutor_relacion_check" CHECK ((("relacion")::"text" = ANY ((ARRAY['padre'::character varying, 'madre'::character varying, 'tutor_legal'::character varying])::"text"[])))
);


ALTER TABLE "public"."vinculos_tutor" OWNER TO "postgres";





ALTER TABLE ONLY "public"."abp_jugadas"
    ADD CONSTRAINT "abp_jugadas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."abp_partido_jugadas"
    ADD CONSTRAINT "abp_partido_jugadas_partido_id_jugada_id_key" UNIQUE ("partido_id", "jugada_id");



ALTER TABLE ONLY "public"."abp_partido_jugadas"
    ADD CONSTRAINT "abp_partido_jugadas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."abp_partido_plan"
    ADD CONSTRAINT "abp_partido_plan_partido_id_key" UNIQUE ("partido_id");



ALTER TABLE ONLY "public"."abp_partido_plan"
    ADD CONSTRAINT "abp_partido_plan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."abp_rival_jugadas"
    ADD CONSTRAINT "abp_rival_jugadas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."abp_sesion_jugadas"
    ADD CONSTRAINT "abp_sesion_jugadas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."abp_sesion_jugadas"
    ADD CONSTRAINT "abp_sesion_jugadas_sesion_id_jugada_id_key" UNIQUE ("sesion_id", "jugada_id");



ALTER TABLE ONLY "public"."accesos_medicos_log"
    ADD CONSTRAINT "accesos_medicos_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_conversaciones"
    ADD CONSTRAINT "ai_conversaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_mensajes"
    ADD CONSTRAINT "ai_mensajes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asistencias_sesion"
    ADD CONSTRAINT "asistencias_sesion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asistencias_sesion"
    ADD CONSTRAINT "asistencias_sesion_sesion_id_jugador_id_key" UNIQUE ("sesion_id", "jugador_id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carga_acumulada_jugador"
    ADD CONSTRAINT "carga_acumulada_jugador_pkey" PRIMARY KEY ("jugador_id");



ALTER TABLE ONLY "public"."carga_diaria_jugador"
    ADD CONSTRAINT "carga_diaria_jugador_jugador_id_fecha_key" UNIQUE ("jugador_id", "fecha");



ALTER TABLE ONLY "public"."carga_diaria_jugador"
    ADD CONSTRAINT "carga_diaria_jugador_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categorias_tarea"
    ADD CONSTRAINT "categorias_tarea_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."categorias_tarea"
    ADD CONSTRAINT "categorias_tarea_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chunks_kb"
    ADD CONSTRAINT "chunks_kb_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."composicion_corporal"
    ADD CONSTRAINT "composicion_corporal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conocimiento_global"
    ADD CONSTRAINT "conocimiento_global_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consentimientos_gdpr"
    ADD CONSTRAINT "consentimientos_gdpr_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contenidos"
    ADD CONSTRAINT "contenidos_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."contenidos"
    ADD CONSTRAINT "contenidos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversacion_participantes"
    ADD CONSTRAINT "conversacion_participantes_conversacion_id_usuario_id_key" UNIQUE ("conversacion_id", "usuario_id");



ALTER TABLE ONLY "public"."conversacion_participantes"
    ADD CONSTRAINT "conversacion_participantes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversaciones"
    ADD CONSTRAINT "conversaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."convocatorias"
    ADD CONSTRAINT "convocatorias_partido_id_jugador_id_key" UNIQUE ("partido_id", "jugador_id");



ALTER TABLE ONLY "public"."convocatorias"
    ADD CONSTRAINT "convocatorias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."descansos"
    ADD CONSTRAINT "descansos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documentos_kb"
    ADD CONSTRAINT "documentos_kb_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entrenamientos_margen"
    ADD CONSTRAINT "entrenamientos_margen_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entrenamientos_margen"
    ADD CONSTRAINT "entrenamientos_margen_sesion_id_jugador_id_key" UNIQUE ("sesion_id", "jugador_id");



ALTER TABLE ONLY "public"."entrenamientos_margen_tareas"
    ADD CONSTRAINT "entrenamientos_margen_tareas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipaciones"
    ADD CONSTRAINT "equipaciones_organizacion_id_tipo_key" UNIQUE ("organizacion_id", "tipo");



ALTER TABLE ONLY "public"."equipaciones"
    ADD CONSTRAINT "equipaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipaciones"
    ADD CONSTRAINT "equipaciones_rival_id_tipo_key" UNIQUE ("rival_id", "tipo");



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."estadisticas_partido"
    ADD CONSTRAINT "estadisticas_partido_partido_id_key" UNIQUE ("partido_id");



ALTER TABLE ONLY "public"."estadisticas_partido"
    ADD CONSTRAINT "estadisticas_partido_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_models"
    ADD CONSTRAINT "game_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historial_suscripciones"
    ADD CONSTRAINT "historial_suscripciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."informes_rival"
    ADD CONSTRAINT "informes_rival_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitaciones"
    ADD CONSTRAINT "invitaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitaciones"
    ADD CONSTRAINT "invitaciones_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."jugador_evaluaciones"
    ADD CONSTRAINT "jugador_evaluaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jugador_habitos"
    ADD CONSTRAINT "jugador_habitos_jugador_id_key" UNIQUE ("jugador_id");



ALTER TABLE ONLY "public"."jugador_habitos"
    ADD CONSTRAINT "jugador_habitos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jugadores"
    ADD CONSTRAINT "jugadores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_day_config"
    ADD CONSTRAINT "match_day_config_pkey" PRIMARY KEY ("codigo");



ALTER TABLE ONLY "public"."mensajes"
    ADD CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."microciclos"
    ADD CONSTRAINT "microciclos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notificaciones"
    ADD CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_progreso"
    ADD CONSTRAINT "onboarding_progreso_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_progreso"
    ADD CONSTRAINT "onboarding_progreso_usuario_id_key" UNIQUE ("usuario_id");



ALTER TABLE ONLY "public"."organizaciones"
    ADD CONSTRAINT "organizaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partidos"
    ADD CONSTRAINT "partidos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."perfiles_nutricionales"
    ADD CONSTRAINT "perfiles_nutricionales_jugador_id_equipo_id_key" UNIQUE ("jugador_id", "equipo_id");



ALTER TABLE ONLY "public"."perfiles_nutricionales"
    ADD CONSTRAINT "perfiles_nutricionales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permisos_personalizados"
    ADD CONSTRAINT "permisos_personalizados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."planes"
    ADD CONSTRAINT "planes_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."planes_nutricionales_dia"
    ADD CONSTRAINT "planes_nutricionales_dia_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."planes_partido"
    ADD CONSTRAINT "planes_partido_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."planes"
    ADD CONSTRAINT "planes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plantillas_nutricionales"
    ADD CONSTRAINT "plantillas_nutricionales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portero_tareas"
    ADD CONSTRAINT "portero_tareas_pkey" PRIMARY KEY ("id");









ALTER TABLE ONLY "public"."pruebas_medicas"
    ADD CONSTRAINT "pruebas_medicas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_medicos"
    ADD CONSTRAINT "registros_medicos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros_rpe"
    ADD CONSTRAINT "registros_rpe_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rendimiento_notas"
    ADD CONSTRAINT "rendimiento_notas_convocatoria_id_evaluador_id_key" UNIQUE ("convocatoria_id", "evaluador_id");



ALTER TABLE ONLY "public"."rendimiento_notas"
    ADD CONSTRAINT "rendimiento_notas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revision_clip_links"
    ADD CONSTRAINT "revision_clip_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revision_clips"
    ADD CONSTRAINT "revision_clips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revision_folders"
    ADD CONSTRAINT "revision_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revision_packs"
    ADD CONSTRAINT "revision_packs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revision_sessions"
    ADD CONSTRAINT "revision_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfef_actas"
    ADD CONSTRAINT "rfef_actas_cod_acta_key" UNIQUE ("cod_acta");



ALTER TABLE ONLY "public"."rfef_actas"
    ADD CONSTRAINT "rfef_actas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfef_competiciones"
    ADD CONSTRAINT "rfef_competiciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfef_jornadas"
    ADD CONSTRAINT "rfef_jornadas_competicion_id_numero_key" UNIQUE ("competicion_id", "numero");



ALTER TABLE ONLY "public"."rfef_jornadas"
    ADD CONSTRAINT "rfef_jornadas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfef_sanciones"
    ADD CONSTRAINT "rfef_sanciones_competicion_id_jornada_numero_equipo_nombre__key" UNIQUE ("competicion_id", "jornada_numero", "equipo_nombre", "persona_nombre", "articulo", "descripcion");



ALTER TABLE ONLY "public"."rfef_sanciones"
    ADD CONSTRAINT "rfef_sanciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rival_informes"
    ADD CONSTRAINT "rival_informes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rivales"
    ADD CONSTRAINT "rivales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sesion_tareas"
    ADD CONSTRAINT "sesion_tareas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sesion_tareas"
    ADD CONSTRAINT "sesion_tareas_sesion_id_orden_key" UNIQUE ("sesion_id", "orden");



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."solicitudes_gdpr"
    ADD CONSTRAINT "solicitudes_gdpr_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suplementacion_jugador"
    ADD CONSTRAINT "suplementacion_jugador_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suscripciones"
    ADD CONSTRAINT "suscripciones_organizacion_id_key" UNIQUE ("organizacion_id");



ALTER TABLE ONLY "public"."suscripciones"
    ADD CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tactical_board_frames"
    ADD CONSTRAINT "tactical_board_frames_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tactical_boards"
    ADD CONSTRAINT "tactical_boards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tareas_contenidos"
    ADD CONSTRAINT "tareas_contenidos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tareas_contenidos"
    ADD CONSTRAINT "tareas_contenidos_tarea_id_contenido_id_key" UNIQUE ("tarea_id", "contenido_id");



ALTER TABLE ONLY "public"."tareas"
    ADD CONSTRAINT "tareas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transferencias_propiedad"
    ADD CONSTRAINT "transferencias_propiedad_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transferencias_propiedad"
    ADD CONSTRAINT "transferencias_propiedad_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."tratamiento_diario"
    ADD CONSTRAINT "tratamiento_diario_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permisos_personalizados"
    ADD CONSTRAINT "uq_permisos_equipo_rol" UNIQUE ("equipo_id", "rol_en_equipo");



ALTER TABLE ONLY "public"."permisos_personalizados"
    ADD CONSTRAINT "uq_permisos_equipo_usuario" UNIQUE ("equipo_id", "usuario_id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."usuarios_equipos"
    ADD CONSTRAINT "usuarios_equipos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios_equipos"
    ADD CONSTRAINT "usuarios_equipos_usuario_id_equipo_id_key" UNIQUE ("usuario_id", "equipo_id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_anotaciones"
    ADD CONSTRAINT "video_anotaciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_playlist_items"
    ADD CONSTRAINT "video_playlist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_playlists"
    ADD CONSTRAINT "video_playlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_tag_categories"
    ADD CONSTRAINT "video_tag_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_tag_descriptors"
    ADD CONSTRAINT "video_tag_descriptors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos_partido"
    ADD CONSTRAINT "videos_partido_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vinculos_tutor"
    ADD CONSTRAINT "vinculos_tutor_jugador_id_tutor_usuario_id_key" UNIQUE ("jugador_id", "tutor_usuario_id");



ALTER TABLE ONLY "public"."vinculos_tutor"
    ADD CONSTRAINT "vinculos_tutor_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_abp_jugadas_equipo" ON "public"."abp_jugadas" USING "btree" ("equipo_id");



CREATE INDEX "idx_abp_jugadas_org" ON "public"."abp_jugadas" USING "btree" ("organizacion_id");



CREATE INDEX "idx_abp_jugadas_tipo" ON "public"."abp_jugadas" USING "btree" ("tipo", "lado");



CREATE INDEX "idx_abp_partido_jugadas_jugada_id" ON "public"."abp_partido_jugadas" USING "btree" ("jugada_id");



CREATE INDEX "idx_abp_partido_jugadas_partido" ON "public"."abp_partido_jugadas" USING "btree" ("partido_id");



CREATE INDEX "idx_abp_partido_plan_partido" ON "public"."abp_partido_plan" USING "btree" ("partido_id");



CREATE INDEX "idx_abp_rival_jugadas_org" ON "public"."abp_rival_jugadas" USING "btree" ("organizacion_id");



CREATE INDEX "idx_abp_rival_jugadas_rival" ON "public"."abp_rival_jugadas" USING "btree" ("rival_id");



CREATE INDEX "idx_abp_sesion_jugadas_jugada_id" ON "public"."abp_sesion_jugadas" USING "btree" ("jugada_id");



CREATE INDEX "idx_abp_sesion_jugadas_sesion" ON "public"."abp_sesion_jugadas" USING "btree" ("sesion_id");



CREATE INDEX "idx_accesos_medicos_registro" ON "public"."accesos_medicos_log" USING "btree" ("registro_medico_id");



CREATE INDEX "idx_accesos_medicos_usuario" ON "public"."accesos_medicos_log" USING "btree" ("usuario_id");



CREATE INDEX "idx_ai_conversaciones_equipo_id" ON "public"."ai_conversaciones" USING "btree" ("equipo_id");



CREATE INDEX "idx_ai_conversaciones_usuario" ON "public"."ai_conversaciones" USING "btree" ("usuario_id");



CREATE INDEX "idx_ai_mensajes_conversacion" ON "public"."ai_mensajes" USING "btree" ("conversacion_id");



CREATE INDEX "idx_ai_mensajes_conversacion_rol" ON "public"."ai_mensajes" USING "btree" ("conversacion_id", "rol") WHERE (("rol")::"text" = 'assistant'::"text");



CREATE INDEX "idx_ai_mensajes_created_at" ON "public"."ai_mensajes" USING "btree" ("created_at");



CREATE INDEX "idx_ai_mensajes_feedback" ON "public"."ai_mensajes" USING "btree" ("feedback") WHERE ("feedback" IS NOT NULL);



CREATE INDEX "idx_alertas_equipo" ON "public"."alertas" USING "btree" ("equipo_id");



CREATE INDEX "idx_alertas_microciclo" ON "public"."alertas" USING "btree" ("microciclo_id");



CREATE INDEX "idx_alertas_prioridad" ON "public"."alertas" USING "btree" ("prioridad");



CREATE INDEX "idx_alertas_resuelta" ON "public"."alertas" USING "btree" ("resuelta");



CREATE INDEX "idx_alertas_tipo" ON "public"."alertas" USING "btree" ("tipo");



CREATE INDEX "idx_asistencias_jugador" ON "public"."asistencias_sesion" USING "btree" ("jugador_id");



CREATE INDEX "idx_asistencias_sesion" ON "public"."asistencias_sesion" USING "btree" ("sesion_id");



CREATE INDEX "idx_audit_log_accion" ON "public"."audit_log" USING "btree" ("accion");



CREATE INDEX "idx_audit_log_entidad" ON "public"."audit_log" USING "btree" ("entidad_tipo", "entidad_id");



CREATE INDEX "idx_audit_log_equipo" ON "public"."audit_log" USING "btree" ("equipo_id");



CREATE INDEX "idx_audit_log_fecha" ON "public"."audit_log" USING "btree" ("created_at");



CREATE INDEX "idx_audit_log_org" ON "public"."audit_log" USING "btree" ("organizacion_id");



CREATE INDEX "idx_audit_log_usuario" ON "public"."audit_log" USING "btree" ("usuario_id");



CREATE INDEX "idx_carga_acum_equipo" ON "public"."carga_acumulada_jugador" USING "btree" ("equipo_id");



CREATE INDEX "idx_carga_diaria_equipo" ON "public"."carga_diaria_jugador" USING "btree" ("equipo_id");



CREATE INDEX "idx_carga_diaria_fecha" ON "public"."carga_diaria_jugador" USING "btree" ("jugador_id", "fecha");



CREATE INDEX "idx_chunks_kb_contenido_trgm" ON "public"."chunks_kb" USING "gin" ("contenido" "public"."gin_trgm_ops");



CREATE INDEX "idx_chunks_kb_documento" ON "public"."chunks_kb" USING "btree" ("documento_id");



CREATE INDEX "idx_chunks_kb_embedding_hnsw" ON "public"."chunks_kb" USING "hnsw" ("embedding" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "idx_composicion_corporal_equipo_id" ON "public"."composicion_corporal" USING "btree" ("equipo_id");



CREATE INDEX "idx_composicion_corporal_jugador" ON "public"."composicion_corporal" USING "btree" ("jugador_id", "fecha" DESC);



CREATE INDEX "idx_conocimiento_global_categoria" ON "public"."conocimiento_global" USING "btree" ("categoria_codigo") WHERE ("categoria_codigo" IS NOT NULL);



CREATE INDEX "idx_conocimiento_global_match_day" ON "public"."conocimiento_global" USING "btree" ("match_day") WHERE ("match_day" IS NOT NULL);



CREATE INDEX "idx_conocimiento_global_tipo" ON "public"."conocimiento_global" USING "btree" ("tipo");



CREATE INDEX "idx_consentimientos_usuario" ON "public"."consentimientos_gdpr" USING "btree" ("usuario_id");



CREATE INDEX "idx_contenidos_dimension" ON "public"."contenidos" USING "btree" ("dimension");



CREATE INDEX "idx_contenidos_fase" ON "public"."contenidos" USING "btree" ("fase_juego");



CREATE INDEX "idx_contenidos_padre" ON "public"."contenidos" USING "btree" ("contenido_padre_id");



CREATE INDEX "idx_conversacion_participantes_usuario_id" ON "public"."conversacion_participantes" USING "btree" ("usuario_id");



CREATE INDEX "idx_conversaciones_creado_por" ON "public"."conversaciones" USING "btree" ("creado_por");



CREATE INDEX "idx_conversaciones_equipo_id" ON "public"."conversaciones" USING "btree" ("equipo_id");



CREATE INDEX "idx_convocatorias_jugador" ON "public"."convocatorias" USING "btree" ("jugador_id");



CREATE INDEX "idx_convocatorias_partido" ON "public"."convocatorias" USING "btree" ("partido_id");



CREATE UNIQUE INDEX "idx_descansos_equipo_fecha" ON "public"."descansos" USING "btree" ("equipo_id", "fecha");



CREATE INDEX "idx_descansos_fecha" ON "public"."descansos" USING "btree" ("fecha");



CREATE INDEX "idx_documentos_kb_organizacion_id" ON "public"."documentos_kb" USING "btree" ("organizacion_id");



CREATE INDEX "idx_entrenamientos_margen_estado" ON "public"."entrenamientos_margen" USING "btree" ("estado");



CREATE INDEX "idx_entrenamientos_margen_jugador" ON "public"."entrenamientos_margen" USING "btree" ("jugador_id");



CREATE INDEX "idx_entrenamientos_margen_registro" ON "public"."entrenamientos_margen" USING "btree" ("registro_medico_id");



CREATE INDEX "idx_entrenamientos_margen_sesion" ON "public"."entrenamientos_margen" USING "btree" ("sesion_id");



CREATE INDEX "idx_equipaciones_organizacion" ON "public"."equipaciones" USING "btree" ("organizacion_id") WHERE ("organizacion_id" IS NOT NULL);



CREATE INDEX "idx_equipaciones_rival" ON "public"."equipaciones" USING "btree" ("rival_id") WHERE ("rival_id" IS NOT NULL);



CREATE INDEX "idx_equipos_organizacion" ON "public"."equipos" USING "btree" ("organizacion_id");



CREATE INDEX "idx_equipos_temporada_anterior" ON "public"."equipos" USING "btree" ("temporada_anterior_id");



CREATE INDEX "idx_estadisticas_partido_partido" ON "public"."estadisticas_partido" USING "btree" ("partido_id");



CREATE INDEX "idx_game_models_created_by" ON "public"."game_models" USING "btree" ("created_by");



CREATE INDEX "idx_game_models_equipo" ON "public"."game_models" USING "btree" ("equipo_id");



CREATE INDEX "idx_historial_suscripciones_org" ON "public"."historial_suscripciones" USING "btree" ("organizacion_id");



CREATE INDEX "idx_historial_suscripciones_plan_anterior_id" ON "public"."historial_suscripciones" USING "btree" ("plan_anterior_id");



CREATE INDEX "idx_historial_suscripciones_plan_nuevo_id" ON "public"."historial_suscripciones" USING "btree" ("plan_nuevo_id");



CREATE INDEX "idx_informes_rival_partido" ON "public"."informes_rival" USING "btree" ("partido_id");



CREATE INDEX "idx_informes_rival_rival" ON "public"."informes_rival" USING "btree" ("rival_id");



CREATE INDEX "idx_invitaciones_aceptado_por" ON "public"."invitaciones" USING "btree" ("aceptado_por");



CREATE INDEX "idx_invitaciones_email" ON "public"."invitaciones" USING "btree" ("email");



CREATE INDEX "idx_invitaciones_equipo_id" ON "public"."invitaciones" USING "btree" ("equipo_id");



CREATE INDEX "idx_invitaciones_estado" ON "public"."invitaciones" USING "btree" ("estado");



CREATE INDEX "idx_invitaciones_invitado_por" ON "public"."invitaciones" USING "btree" ("invitado_por");



CREATE INDEX "idx_invitaciones_jugador_id" ON "public"."invitaciones" USING "btree" ("jugador_id");



CREATE INDEX "idx_invitaciones_org" ON "public"."invitaciones" USING "btree" ("organizacion_id");



CREATE INDEX "idx_invitaciones_token_hash" ON "public"."invitaciones" USING "btree" ("token_hash");



CREATE INDEX "idx_jugador_evaluaciones_equipo" ON "public"."jugador_evaluaciones" USING "btree" ("equipo_id", "fecha" DESC);



CREATE INDEX "idx_jugador_evaluaciones_jugador_fecha" ON "public"."jugador_evaluaciones" USING "btree" ("jugador_id", "bloque", "fecha" DESC);



CREATE INDEX "idx_jugadores_disponibilidad" ON "public"."jugadores" USING "btree" ("equipo_id", "disponibilidad");



CREATE INDEX "idx_jugadores_equipo" ON "public"."jugadores" USING "btree" ("equipo_id");



CREATE INDEX "idx_jugadores_estado" ON "public"."jugadores" USING "btree" ("estado");



CREATE INDEX "idx_jugadores_posicion" ON "public"."jugadores" USING "btree" ("posicion_principal");



CREATE INDEX "idx_jugadores_tipo" ON "public"."jugadores" USING "btree" ("equipo_id", "tipo_jugador");



CREATE INDEX "idx_jugadores_usuario_id" ON "public"."jugadores" USING "btree" ("usuario_id");



CREATE INDEX "idx_margen_tareas_entrenamiento" ON "public"."entrenamientos_margen_tareas" USING "btree" ("entrenamiento_margen_id");



CREATE INDEX "idx_margen_tareas_tarea" ON "public"."entrenamientos_margen_tareas" USING "btree" ("tarea_id");



CREATE INDEX "idx_mensajes_autor_id" ON "public"."mensajes" USING "btree" ("autor_id");



CREATE INDEX "idx_mensajes_conversacion" ON "public"."mensajes" USING "btree" ("conversacion_id");



CREATE INDEX "idx_mensajes_fecha" ON "public"."mensajes" USING "btree" ("created_at");



CREATE INDEX "idx_microciclos_equipo" ON "public"."microciclos" USING "btree" ("equipo_id");



CREATE INDEX "idx_microciclos_fechas" ON "public"."microciclos" USING "btree" ("fecha_inicio", "fecha_fin");



CREATE INDEX "idx_microciclos_game_model_id" ON "public"."microciclos" USING "btree" ("game_model_id");



CREATE INDEX "idx_microciclos_partido_id" ON "public"."microciclos" USING "btree" ("partido_id");



CREATE INDEX "idx_microciclos_rival_id" ON "public"."microciclos" USING "btree" ("rival_id");



CREATE INDEX "idx_notificaciones_leida" ON "public"."notificaciones" USING "btree" ("usuario_id", "leida");



CREATE INDEX "idx_notificaciones_usuario" ON "public"."notificaciones" USING "btree" ("usuario_id");



CREATE INDEX "idx_organizaciones_owner_id" ON "public"."organizaciones" USING "btree" ("owner_id");



CREATE INDEX "idx_partidos_competicion" ON "public"."partidos" USING "btree" ("competicion");



CREATE INDEX "idx_partidos_equipo" ON "public"."partidos" USING "btree" ("equipo_id");



CREATE INDEX "idx_partidos_fecha" ON "public"."partidos" USING "btree" ("fecha");



CREATE INDEX "idx_partidos_rfef_comp" ON "public"."partidos" USING "btree" ("rfef_competicion_id");



CREATE INDEX "idx_partidos_rival" ON "public"."partidos" USING "btree" ("rival_id");



CREATE INDEX "idx_perfiles_nutricionales_equipo_id" ON "public"."perfiles_nutricionales" USING "btree" ("equipo_id");



CREATE INDEX "idx_perfiles_nutricionales_jugador" ON "public"."perfiles_nutricionales" USING "btree" ("jugador_id", "equipo_id");



CREATE INDEX "idx_permisos_personalizados_equipo" ON "public"."permisos_personalizados" USING "btree" ("equipo_id");



CREATE INDEX "idx_permisos_personalizados_usuario_id" ON "public"."permisos_personalizados" USING "btree" ("usuario_id");



CREATE INDEX "idx_planes_nutricionales_dia_equipo_fecha" ON "public"."planes_nutricionales_dia" USING "btree" ("equipo_id", "fecha");



CREATE INDEX "idx_planes_nutricionales_dia_jugador" ON "public"."planes_nutricionales_dia" USING "btree" ("jugador_id", "fecha");



CREATE INDEX "idx_planes_partido_estado" ON "public"."planes_partido" USING "btree" ("estado");



CREATE INDEX "idx_planes_partido_microciclo" ON "public"."planes_partido" USING "btree" ("microciclo_id");



CREATE INDEX "idx_planes_partido_partido" ON "public"."planes_partido" USING "btree" ("partido_id");



CREATE INDEX "idx_plantillas_nutricionales_equipo" ON "public"."plantillas_nutricionales" USING "btree" ("equipo_id");



CREATE INDEX "idx_portero_tareas_equipo" ON "public"."portero_tareas" USING "btree" ("equipo_id");



CREATE INDEX "idx_portero_tareas_sesion" ON "public"."portero_tareas" USING "btree" ("sesion_id");


















CREATE INDEX "idx_pruebas_medicas_jugador" ON "public"."pruebas_medicas" USING "btree" ("jugador_id", "fecha" DESC);



CREATE INDEX "idx_pruebas_medicas_registro" ON "public"."pruebas_medicas" USING "btree" ("registro_medico_id");



CREATE INDEX "idx_registros_medicos_creado_por" ON "public"."registros_medicos" USING "btree" ("creado_por");



CREATE INDEX "idx_registros_medicos_disponibilidad" ON "public"."registros_medicos" USING "btree" ("jugador_id", "estado", "disponibilidad");



CREATE INDEX "idx_registros_medicos_equipo" ON "public"."registros_medicos" USING "btree" ("equipo_id");



CREATE INDEX "idx_registros_medicos_estado" ON "public"."registros_medicos" USING "btree" ("estado");



CREATE INDEX "idx_registros_medicos_jugador" ON "public"."registros_medicos" USING "btree" ("jugador_id");



CREATE INDEX "idx_registros_medicos_registro_padre_id" ON "public"."registros_medicos" USING "btree" ("registro_padre_id");



CREATE INDEX "idx_registros_medicos_tipo" ON "public"."registros_medicos" USING "btree" ("tipo");



CREATE INDEX "idx_registros_rpe_fecha" ON "public"."registros_rpe" USING "btree" ("fecha");



CREATE INDEX "idx_registros_rpe_jugador" ON "public"."registros_rpe" USING "btree" ("jugador_id");



CREATE UNIQUE INDEX "idx_registros_rpe_jugador_partido" ON "public"."registros_rpe" USING "btree" ("jugador_id", "partido_id") WHERE (("partido_id" IS NOT NULL) AND (COALESCE("tipo", 'sesion'::"text") = 'partido'::"text"));



CREATE UNIQUE INDEX "idx_registros_rpe_jugador_sesion" ON "public"."registros_rpe" USING "btree" ("jugador_id", "sesion_id") WHERE (("sesion_id" IS NOT NULL) AND (COALESCE("tipo", 'sesion'::"text") = 'sesion'::"text"));



CREATE INDEX "idx_registros_rpe_partido" ON "public"."registros_rpe" USING "btree" ("partido_id") WHERE ("partido_id" IS NOT NULL);



CREATE INDEX "idx_registros_rpe_sesion" ON "public"."registros_rpe" USING "btree" ("sesion_id");



CREATE INDEX "idx_rendimiento_notas_convocatoria" ON "public"."rendimiento_notas" USING "btree" ("convocatoria_id");



CREATE INDEX "idx_rendimiento_notas_evaluador" ON "public"."rendimiento_notas" USING "btree" ("evaluador_id");



CREATE INDEX "idx_revision_clip_links_clip" ON "public"."revision_clip_links" USING "btree" ("clip_id");



CREATE INDEX "idx_revision_clip_links_folder" ON "public"."revision_clip_links" USING "btree" ("folder_id");



CREATE UNIQUE INDEX "idx_revision_clip_links_folder_unique" ON "public"."revision_clip_links" USING "btree" ("clip_id", "folder_id") WHERE (("folder_id" IS NOT NULL) AND ("slot_tipo" = 'folder'::"text"));



CREATE INDEX "idx_revision_clips_hot" ON "public"."revision_clips" USING "btree" ("hot_until") WHERE ("status" = 'hot'::"text");



CREATE INDEX "idx_revision_clips_pack" ON "public"."revision_clips" USING "btree" ("pack_id");



CREATE INDEX "idx_revision_folders_pack" ON "public"."revision_folders" USING "btree" ("pack_id");



CREATE INDEX "idx_revision_packs_equipo" ON "public"."revision_packs" USING "btree" ("equipo_id");



CREATE UNIQUE INDEX "idx_revision_packs_partido" ON "public"."revision_packs" USING "btree" ("equipo_id", "partido_id") WHERE (("ambito" = 'partido_post'::"text") AND ("partido_id" IS NOT NULL));



CREATE UNIQUE INDEX "idx_revision_packs_rival" ON "public"."revision_packs" USING "btree" ("equipo_id", "rival_id", COALESCE("microciclo_id", '00000000-0000-0000-0000-000000000000'::"uuid")) WHERE (("ambito" = 'rival'::"text") AND ("rival_id" IS NOT NULL));



CREATE UNIQUE INDEX "idx_revision_sessions_code" ON "public"."revision_sessions" USING "btree" ("code");



CREATE INDEX "idx_revision_sessions_equipo" ON "public"."revision_sessions" USING "btree" ("equipo_id");



CREATE INDEX "idx_rfef_actas_cod" ON "public"."rfef_actas" USING "btree" ("cod_acta");



CREATE INDEX "idx_rfef_actas_comp" ON "public"."rfef_actas" USING "btree" ("competicion_id");



CREATE INDEX "idx_rfef_actas_jornada" ON "public"."rfef_actas" USING "btree" ("competicion_id", "jornada_numero");



CREATE INDEX "idx_rfef_competiciones_equipo_id" ON "public"."rfef_competiciones" USING "btree" ("equipo_id");



CREATE INDEX "idx_rfef_jornadas_competicion" ON "public"."rfef_jornadas" USING "btree" ("competicion_id");



CREATE INDEX "idx_rfef_sanciones_comp" ON "public"."rfef_sanciones" USING "btree" ("competicion_id");



CREATE INDEX "idx_rfef_sanciones_equipo" ON "public"."rfef_sanciones" USING "btree" ("equipo_nombre");



CREATE INDEX "idx_rfef_sanciones_jornada" ON "public"."rfef_sanciones" USING "btree" ("competicion_id", "jornada_numero");



CREATE INDEX "idx_rival_informes_partido" ON "public"."rival_informes" USING "btree" ("partido_id");



CREATE INDEX "idx_rival_informes_rival" ON "public"."rival_informes" USING "btree" ("rival_id");



CREATE INDEX "idx_rivales_nombre" ON "public"."rivales" USING "btree" ("nombre");



CREATE INDEX "idx_rivales_organizacion" ON "public"."rivales" USING "btree" ("organizacion_id");



CREATE INDEX "idx_rivales_rfef_nombre" ON "public"."rivales" USING "btree" ("rfef_nombre");



CREATE INDEX "idx_sesion_tareas_sesion" ON "public"."sesion_tareas" USING "btree" ("sesion_id");



CREATE INDEX "idx_sesion_tareas_tarea" ON "public"."sesion_tareas" USING "btree" ("tarea_id");



CREATE INDEX "idx_sesiones_cont_def" ON "public"."sesiones" USING "gin" ("contenidos_defensivos");



CREATE INDEX "idx_sesiones_cont_of" ON "public"."sesiones" USING "gin" ("contenidos_ofensivos");



CREATE INDEX "idx_sesiones_creado_por" ON "public"."sesiones" USING "btree" ("creado_por");



CREATE INDEX "idx_sesiones_equipo" ON "public"."sesiones" USING "btree" ("equipo_id");



CREATE INDEX "idx_sesiones_espacio" ON "public"."sesiones" USING "btree" ("equipo_id", "espacio_disponible");



CREATE INDEX "idx_sesiones_estado_fecha" ON "public"."sesiones" USING "btree" ("estado", "fecha");



CREATE INDEX "idx_sesiones_fases_juego_gin" ON "public"."sesiones" USING "gin" ("fases_juego");



CREATE INDEX "idx_sesiones_fecha" ON "public"."sesiones" USING "btree" ("fecha");



CREATE INDEX "idx_sesiones_keywords_gin" ON "public"."sesiones" USING "gin" ("keywords");



CREATE INDEX "idx_sesiones_match_day" ON "public"."sesiones" USING "btree" ("match_day");



CREATE INDEX "idx_sesiones_materiales_gin" ON "public"."sesiones" USING "gin" ("materiales");



CREATE INDEX "idx_sesiones_microciclo" ON "public"."sesiones" USING "btree" ("microciclo_id");



CREATE INDEX "idx_sesiones_microciclo_dia" ON "public"."sesiones" USING "btree" ("microciclo_id", "dia_numero", "orden") WHERE ("microciclo_id" IS NOT NULL);



CREATE INDEX "idx_sesiones_microciclo_dia_orden" ON "public"."sesiones" USING "btree" ("microciclo_id", "dia_numero", "orden");



CREATE INDEX "idx_sesiones_objetivos" ON "public"."sesiones" USING "gin" ("objetivos");



CREATE INDEX "idx_sesiones_partido_id" ON "public"."sesiones" USING "btree" ("partido_id") WHERE ("partido_id" IS NOT NULL);



CREATE INDEX "idx_sesiones_plan_partido_id" ON "public"."sesiones" USING "btree" ("plan_partido_id");



CREATE INDEX "idx_sesiones_share_token" ON "public"."sesiones" USING "btree" ("share_token") WHERE ("share_token" IS NOT NULL);



CREATE INDEX "idx_solicitudes_gdpr_estado" ON "public"."solicitudes_gdpr" USING "btree" ("estado");



CREATE INDEX "idx_solicitudes_gdpr_procesado_por" ON "public"."solicitudes_gdpr" USING "btree" ("procesado_por");



CREATE INDEX "idx_solicitudes_gdpr_usuario" ON "public"."solicitudes_gdpr" USING "btree" ("usuario_id");



CREATE INDEX "idx_suplementacion_jugador_equipo_id" ON "public"."suplementacion_jugador" USING "btree" ("equipo_id");



CREATE INDEX "idx_suplementacion_jugador_jugador" ON "public"."suplementacion_jugador" USING "btree" ("jugador_id", "equipo_id");



CREATE INDEX "idx_suscripciones_estado" ON "public"."suscripciones" USING "btree" ("estado");



CREATE INDEX "idx_suscripciones_org" ON "public"."suscripciones" USING "btree" ("organizacion_id");



CREATE INDEX "idx_suscripciones_plan_id" ON "public"."suscripciones" USING "btree" ("plan_id");



CREATE INDEX "idx_tactical_board_frames_board" ON "public"."tactical_board_frames" USING "btree" ("board_id");



CREATE INDEX "idx_tactical_board_frames_order" ON "public"."tactical_board_frames" USING "btree" ("board_id", "orden");



CREATE INDEX "idx_tactical_boards_created_by" ON "public"."tactical_boards" USING "btree" ("created_by");



CREATE INDEX "idx_tactical_boards_equipo" ON "public"."tactical_boards" USING "btree" ("equipo_id");



CREATE INDEX "idx_tactical_boards_tipo" ON "public"."tactical_boards" USING "btree" ("equipo_id", "tipo");



CREATE INDEX "idx_tareas_categoria" ON "public"."tareas" USING "btree" ("categoria_id");



CREATE INDEX "idx_tareas_contenidos_contenido" ON "public"."tareas_contenidos" USING "btree" ("contenido_id");



CREATE INDEX "idx_tareas_contenidos_principal" ON "public"."tareas_contenidos" USING "btree" ("es_principal");



CREATE INDEX "idx_tareas_contenidos_tarea" ON "public"."tareas_contenidos" USING "btree" ("tarea_id");



CREATE INDEX "idx_tareas_creado_por" ON "public"."tareas" USING "btree" ("creado_por");



CREATE INDEX "idx_tareas_equipo" ON "public"."tareas" USING "btree" ("equipo_id");



CREATE INDEX "idx_tareas_es_complementaria" ON "public"."tareas" USING "btree" ("es_complementaria");



CREATE INDEX "idx_tareas_fase" ON "public"."tareas" USING "btree" ("fase_juego");



CREATE INDEX "idx_tareas_madres" ON "public"."tareas" USING "btree" ("organizacion_id") WHERE ("tarea_origen_id" IS NULL);



CREATE INDEX "idx_tareas_modalidad" ON "public"."tareas" USING "btree" ("modalidad") WHERE ("modalidad" IS NOT NULL);



CREATE INDEX "idx_tareas_nivel_cognitivo" ON "public"."tareas" USING "btree" ("nivel_cognitivo");



CREATE INDEX "idx_tareas_objetivo_gym" ON "public"."tareas" USING "btree" ("objetivo_gym");



CREATE INDEX "idx_tareas_organizacion" ON "public"."tareas" USING "btree" ("organizacion_id");



CREATE INDEX "idx_tareas_origen" ON "public"."tareas" USING "btree" ("tarea_origen_id") WHERE ("tarea_origen_id" IS NOT NULL);



CREATE INDEX "idx_tareas_zona_cuerpo" ON "public"."tareas" USING "btree" ("zona_cuerpo");



CREATE INDEX "idx_transferencias_equipo" ON "public"."transferencias_propiedad" USING "btree" ("equipo_id");



CREATE INDEX "idx_transferencias_propiedad_a_usuario_id" ON "public"."transferencias_propiedad" USING "btree" ("a_usuario_id");



CREATE INDEX "idx_transferencias_propiedad_de_usuario_id" ON "public"."transferencias_propiedad" USING "btree" ("de_usuario_id");



CREATE INDEX "idx_tratamiento_diario_jugador" ON "public"."tratamiento_diario" USING "btree" ("jugador_id", "fecha" DESC);



CREATE INDEX "idx_tratamiento_diario_registro_fecha" ON "public"."tratamiento_diario" USING "btree" ("registro_medico_id", "fecha" DESC);



CREATE INDEX "idx_usuarios_email" ON "public"."usuarios" USING "btree" ("email");



CREATE INDEX "idx_usuarios_equipos_equipo" ON "public"."usuarios_equipos" USING "btree" ("equipo_id");



CREATE INDEX "idx_usuarios_equipos_usuario" ON "public"."usuarios_equipos" USING "btree" ("usuario_id");



CREATE INDEX "idx_usuarios_organizacion" ON "public"."usuarios" USING "btree" ("organizacion_id");



CREATE INDEX "idx_usuarios_rol" ON "public"."usuarios" USING "btree" ("rol");



CREATE INDEX "idx_video_anotaciones_equipo" ON "public"."video_anotaciones" USING "btree" ("equipo_id");



CREATE INDEX "idx_video_anotaciones_partido" ON "public"."video_anotaciones" USING "btree" ("partido_id");



CREATE INDEX "idx_video_anotaciones_video" ON "public"."video_anotaciones" USING "btree" ("video_id");



CREATE INDEX "idx_video_playlist_items_playlist" ON "public"."video_playlist_items" USING "btree" ("playlist_id");



CREATE INDEX "idx_video_playlist_items_tag" ON "public"."video_playlist_items" USING "btree" ("tag_id");



CREATE INDEX "idx_video_playlists_created_by" ON "public"."video_playlists" USING "btree" ("created_by");



CREATE INDEX "idx_video_playlists_equipo" ON "public"."video_playlists" USING "btree" ("equipo_id");



CREATE INDEX "idx_video_tag_categories_equipo" ON "public"."video_tag_categories" USING "btree" ("equipo_id");



CREATE INDEX "idx_video_tag_descriptors_category" ON "public"."video_tag_descriptors" USING "btree" ("category_id");



CREATE INDEX "idx_video_tags_category" ON "public"."video_tags" USING "btree" ("category_id");



CREATE INDEX "idx_video_tags_descriptor_id" ON "public"."video_tags" USING "btree" ("descriptor_id");



CREATE INDEX "idx_video_tags_jugador" ON "public"."video_tags" USING "btree" ("jugador_id");



CREATE INDEX "idx_video_tags_video" ON "public"."video_tags" USING "btree" ("video_id");



CREATE INDEX "idx_video_tags_video_start" ON "public"."video_tags" USING "btree" ("video_id", "start_ms");



CREATE INDEX "idx_videos_partido_equipo" ON "public"."videos_partido" USING "btree" ("equipo_id");



CREATE UNIQUE INDEX "idx_videos_partido_local_fingerprint" ON "public"."videos_partido" USING "btree" ("equipo_id", "partido_id", "local_file_fingerprint") WHERE (("local_file_fingerprint" IS NOT NULL) AND ("tipo" = 'local_session'::"text"));



CREATE UNIQUE INDEX "idx_videos_partido_loose_fingerprint" ON "public"."videos_partido" USING "btree" ("equipo_id", "local_file_fingerprint") WHERE (("tipo" = 'local_session'::"text") AND ("partido_id" IS NULL) AND ("local_file_fingerprint" IS NOT NULL));



CREATE INDEX "idx_videos_partido_partido" ON "public"."videos_partido" USING "btree" ("partido_id");



CREATE INDEX "idx_vinculos_tutor_jugador" ON "public"."vinculos_tutor" USING "btree" ("jugador_id");



CREATE INDEX "idx_vinculos_tutor_tutor" ON "public"."vinculos_tutor" USING "btree" ("tutor_usuario_id");



CREATE INDEX "idx_vinculos_tutor_verificado_por" ON "public"."vinculos_tutor" USING "btree" ("verificado_por");



CREATE UNIQUE INDEX "usuarios_username_unique" ON "public"."usuarios" USING "btree" ("lower"(("username")::"text")) WHERE ("username" IS NOT NULL);



CREATE OR REPLACE TRIGGER "calculate_partido_resultado" BEFORE INSERT OR UPDATE OF "goles_favor", "goles_contra" ON "public"."partidos" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_resultado"();



CREATE OR REPLACE TRIGGER "tr_estadisticas_partido_updated" BEFORE UPDATE ON "public"."estadisticas_partido" FOR EACH ROW EXECUTE FUNCTION "public"."update_estadisticas_partido_updated_at"();



CREATE OR REPLACE TRIGGER "trg_entrenamientos_margen_updated_at" BEFORE UPDATE ON "public"."entrenamientos_margen" FOR EACH ROW EXECUTE FUNCTION "public"."update_entrenamientos_margen_updated_at"();



CREATE OR REPLACE TRIGGER "trg_jugador_evaluaciones_updated_at" BEFORE UPDATE ON "public"."jugador_evaluaciones" FOR EACH ROW EXECUTE FUNCTION "public"."update_jugador_evaluaciones_updated_at"();



CREATE OR REPLACE TRIGGER "trg_jugador_habitos_updated_at" BEFORE UPDATE ON "public"."jugador_habitos" FOR EACH ROW EXECUTE FUNCTION "public"."update_jugador_habitos_updated_at"();



CREATE OR REPLACE TRIGGER "trg_tratamiento_diario_updated_at" BEFORE UPDATE ON "public"."tratamiento_diario" FOR EACH ROW EXECUTE FUNCTION "public"."update_tratamiento_diario_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_auto_link_sesion_microciclo" BEFORE INSERT OR UPDATE OF "fecha" ON "public"."sesiones" FOR EACH ROW EXECUTE FUNCTION "public"."auto_link_sesion_microciclo"();



CREATE OR REPLACE TRIGGER "trigger_carga_acumulada_updated_at" BEFORE UPDATE ON "public"."carga_acumulada_jugador" FOR EACH ROW EXECUTE FUNCTION "public"."update_carga_acumulada_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_increment_tarea_uso" AFTER INSERT ON "public"."sesion_tareas" FOR EACH ROW EXECUTE FUNCTION "public"."increment_tarea_uso"();



CREATE OR REPLACE TRIGGER "update_ai_conversaciones_updated_at" BEFORE UPDATE ON "public"."ai_conversaciones" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversaciones_updated_at" BEFORE UPDATE ON "public"."conversaciones" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_convocatorias_updated_at" BEFORE UPDATE ON "public"."convocatorias" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_documentos_kb_updated_at" BEFORE UPDATE ON "public"."documentos_kb" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_equipos_updated_at" BEFORE UPDATE ON "public"."equipos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_jugadores_updated_at" BEFORE UPDATE ON "public"."jugadores" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_mensajes_updated_at" BEFORE UPDATE ON "public"."mensajes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_microciclos_updated_at" BEFORE UPDATE ON "public"."microciclos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_onboarding_progreso_updated_at" BEFORE UPDATE ON "public"."onboarding_progreso" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizaciones_updated_at" BEFORE UPDATE ON "public"."organizaciones" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_partidos_updated_at" BEFORE UPDATE ON "public"."partidos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rfef_competiciones_updated_at" BEFORE UPDATE ON "public"."rfef_competiciones" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rfef_jornadas_updated_at" BEFORE UPDATE ON "public"."rfef_jornadas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rivales_updated_at" BEFORE UPDATE ON "public"."rivales" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sesiones_updated_at" BEFORE UPDATE ON "public"."sesiones" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tareas_updated_at" BEFORE UPDATE ON "public"."tareas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_usuarios_updated_at" BEFORE UPDATE ON "public"."usuarios" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."abp_jugadas"
    ADD CONSTRAINT "abp_jugadas_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."abp_partido_jugadas"
    ADD CONSTRAINT "abp_partido_jugadas_jugada_id_fkey" FOREIGN KEY ("jugada_id") REFERENCES "public"."abp_jugadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."abp_partido_jugadas"
    ADD CONSTRAINT "abp_partido_jugadas_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."abp_partido_plan"
    ADD CONSTRAINT "abp_partido_plan_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."abp_rival_jugadas"
    ADD CONSTRAINT "abp_rival_jugadas_rival_id_fkey" FOREIGN KEY ("rival_id") REFERENCES "public"."rivales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."abp_sesion_jugadas"
    ADD CONSTRAINT "abp_sesion_jugadas_jugada_id_fkey" FOREIGN KEY ("jugada_id") REFERENCES "public"."abp_jugadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."abp_sesion_jugadas"
    ADD CONSTRAINT "abp_sesion_jugadas_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accesos_medicos_log"
    ADD CONSTRAINT "accesos_medicos_log_registro_medico_id_fkey" FOREIGN KEY ("registro_medico_id") REFERENCES "public"."registros_medicos"("id");



ALTER TABLE ONLY "public"."accesos_medicos_log"
    ADD CONSTRAINT "accesos_medicos_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."ai_conversaciones"
    ADD CONSTRAINT "ai_conversaciones_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id");



ALTER TABLE ONLY "public"."ai_conversaciones"
    ADD CONSTRAINT "ai_conversaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_mensajes"
    ADD CONSTRAINT "ai_mensajes_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "public"."ai_conversaciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_microciclo_id_fkey" FOREIGN KEY ("microciclo_id") REFERENCES "public"."microciclos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alertas"
    ADD CONSTRAINT "alertas_resuelta_por_fkey" FOREIGN KEY ("resuelta_por") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."asistencias_sesion"
    ADD CONSTRAINT "asistencias_sesion_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asistencias_sesion"
    ADD CONSTRAINT "asistencias_sesion_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."carga_acumulada_jugador"
    ADD CONSTRAINT "carga_acumulada_jugador_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carga_acumulada_jugador"
    ADD CONSTRAINT "carga_acumulada_jugador_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carga_diaria_jugador"
    ADD CONSTRAINT "carga_diaria_jugador_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carga_diaria_jugador"
    ADD CONSTRAINT "carga_diaria_jugador_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chunks_kb"
    ADD CONSTRAINT "chunks_kb_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos_kb"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."composicion_corporal"
    ADD CONSTRAINT "composicion_corporal_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."composicion_corporal"
    ADD CONSTRAINT "composicion_corporal_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consentimientos_gdpr"
    ADD CONSTRAINT "consentimientos_gdpr_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contenidos"
    ADD CONSTRAINT "contenidos_contenido_padre_id_fkey" FOREIGN KEY ("contenido_padre_id") REFERENCES "public"."contenidos"("id");



ALTER TABLE ONLY "public"."conversacion_participantes"
    ADD CONSTRAINT "conversacion_participantes_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversaciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversacion_participantes"
    ADD CONSTRAINT "conversacion_participantes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."conversaciones"
    ADD CONSTRAINT "conversaciones_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."conversaciones"
    ADD CONSTRAINT "conversaciones_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id");



ALTER TABLE ONLY "public"."convocatorias"
    ADD CONSTRAINT "convocatorias_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id");



ALTER TABLE ONLY "public"."convocatorias"
    ADD CONSTRAINT "convocatorias_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."descansos"
    ADD CONSTRAINT "descansos_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documentos_kb"
    ADD CONSTRAINT "documentos_kb_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id");



ALTER TABLE ONLY "public"."entrenamientos_margen"
    ADD CONSTRAINT "entrenamientos_margen_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entrenamientos_margen"
    ADD CONSTRAINT "entrenamientos_margen_registro_medico_id_fkey" FOREIGN KEY ("registro_medico_id") REFERENCES "public"."registros_medicos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."entrenamientos_margen"
    ADD CONSTRAINT "entrenamientos_margen_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entrenamientos_margen_tareas"
    ADD CONSTRAINT "entrenamientos_margen_tareas_entrenamiento_margen_id_fkey" FOREIGN KEY ("entrenamiento_margen_id") REFERENCES "public"."entrenamientos_margen"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entrenamientos_margen_tareas"
    ADD CONSTRAINT "entrenamientos_margen_tareas_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipaciones"
    ADD CONSTRAINT "equipaciones_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipaciones"
    ADD CONSTRAINT "equipaciones_rival_id_fkey" FOREIGN KEY ("rival_id") REFERENCES "public"."rivales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_temporada_anterior_id_fkey" FOREIGN KEY ("temporada_anterior_id") REFERENCES "public"."equipos"("id");



ALTER TABLE ONLY "public"."estadisticas_partido"
    ADD CONSTRAINT "estadisticas_partido_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_models"
    ADD CONSTRAINT "game_models_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."game_models"
    ADD CONSTRAINT "game_models_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."historial_suscripciones"
    ADD CONSTRAINT "historial_suscripciones_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id");



ALTER TABLE ONLY "public"."historial_suscripciones"
    ADD CONSTRAINT "historial_suscripciones_plan_anterior_id_fkey" FOREIGN KEY ("plan_anterior_id") REFERENCES "public"."planes"("id");



ALTER TABLE ONLY "public"."historial_suscripciones"
    ADD CONSTRAINT "historial_suscripciones_plan_nuevo_id_fkey" FOREIGN KEY ("plan_nuevo_id") REFERENCES "public"."planes"("id");



ALTER TABLE ONLY "public"."informes_rival"
    ADD CONSTRAINT "informes_rival_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."informes_rival"
    ADD CONSTRAINT "informes_rival_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."informes_rival"
    ADD CONSTRAINT "informes_rival_rival_id_fkey" FOREIGN KEY ("rival_id") REFERENCES "public"."rivales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitaciones"
    ADD CONSTRAINT "invitaciones_aceptado_por_fkey" FOREIGN KEY ("aceptado_por") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."invitaciones"
    ADD CONSTRAINT "invitaciones_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitaciones"
    ADD CONSTRAINT "invitaciones_invitado_por_fkey" FOREIGN KEY ("invitado_por") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."invitaciones"
    ADD CONSTRAINT "invitaciones_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id");



ALTER TABLE ONLY "public"."invitaciones"
    ADD CONSTRAINT "invitaciones_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jugador_evaluaciones"
    ADD CONSTRAINT "jugador_evaluaciones_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jugador_evaluaciones"
    ADD CONSTRAINT "jugador_evaluaciones_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jugador_evaluaciones"
    ADD CONSTRAINT "jugador_evaluaciones_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jugador_habitos"
    ADD CONSTRAINT "jugador_habitos_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jugador_habitos"
    ADD CONSTRAINT "jugador_habitos_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jugadores"
    ADD CONSTRAINT "jugadores_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jugadores"
    ADD CONSTRAINT "jugadores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."mensajes"
    ADD CONSTRAINT "mensajes_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."mensajes"
    ADD CONSTRAINT "mensajes_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversaciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."microciclos"
    ADD CONSTRAINT "microciclos_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."microciclos"
    ADD CONSTRAINT "microciclos_game_model_id_fkey" FOREIGN KEY ("game_model_id") REFERENCES "public"."game_models"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."microciclos"
    ADD CONSTRAINT "microciclos_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id");



ALTER TABLE ONLY "public"."microciclos"
    ADD CONSTRAINT "microciclos_rival_id_fkey" FOREIGN KEY ("rival_id") REFERENCES "public"."rivales"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notificaciones"
    ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_progreso"
    ADD CONSTRAINT "onboarding_progreso_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizaciones"
    ADD CONSTRAINT "organizaciones_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."partidos"
    ADD CONSTRAINT "partidos_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partidos"
    ADD CONSTRAINT "partidos_rfef_competicion_id_fkey" FOREIGN KEY ("rfef_competicion_id") REFERENCES "public"."rfef_competiciones"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."partidos"
    ADD CONSTRAINT "partidos_rival_id_fkey" FOREIGN KEY ("rival_id") REFERENCES "public"."rivales"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."perfiles_nutricionales"
    ADD CONSTRAINT "perfiles_nutricionales_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."perfiles_nutricionales"
    ADD CONSTRAINT "perfiles_nutricionales_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permisos_personalizados"
    ADD CONSTRAINT "permisos_personalizados_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permisos_personalizados"
    ADD CONSTRAINT "permisos_personalizados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planes_nutricionales_dia"
    ADD CONSTRAINT "planes_nutricionales_dia_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planes_nutricionales_dia"
    ADD CONSTRAINT "planes_nutricionales_dia_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planes_partido"
    ADD CONSTRAINT "planes_partido_capitan_id_fkey" FOREIGN KEY ("capitan_id") REFERENCES "public"."jugadores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."planes_partido"
    ADD CONSTRAINT "planes_partido_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."planes_partido"
    ADD CONSTRAINT "planes_partido_game_model_id_fkey" FOREIGN KEY ("game_model_id") REFERENCES "public"."game_models"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."planes_partido"
    ADD CONSTRAINT "planes_partido_microciclo_id_fkey" FOREIGN KEY ("microciclo_id") REFERENCES "public"."microciclos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planes_partido"
    ADD CONSTRAINT "planes_partido_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plantillas_nutricionales"
    ADD CONSTRAINT "plantillas_nutricionales_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portero_tareas"
    ADD CONSTRAINT "portero_tareas_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portero_tareas"
    ADD CONSTRAINT "portero_tareas_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pruebas_medicas"
    ADD CONSTRAINT "pruebas_medicas_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pruebas_medicas"
    ADD CONSTRAINT "pruebas_medicas_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pruebas_medicas"
    ADD CONSTRAINT "pruebas_medicas_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pruebas_medicas"
    ADD CONSTRAINT "pruebas_medicas_registro_medico_id_fkey" FOREIGN KEY ("registro_medico_id") REFERENCES "public"."registros_medicos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_medicos"
    ADD CONSTRAINT "registros_medicos_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."registros_medicos"
    ADD CONSTRAINT "registros_medicos_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id");



ALTER TABLE ONLY "public"."registros_medicos"
    ADD CONSTRAINT "registros_medicos_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_medicos"
    ADD CONSTRAINT "registros_medicos_registro_origen_id_fkey" FOREIGN KEY ("registro_origen_id") REFERENCES "public"."registros_medicos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_medicos"
    ADD CONSTRAINT "registros_medicos_registro_padre_id_fkey" FOREIGN KEY ("registro_padre_id") REFERENCES "public"."registros_medicos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_rpe"
    ADD CONSTRAINT "registros_rpe_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."registros_rpe"
    ADD CONSTRAINT "registros_rpe_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros_rpe"
    ADD CONSTRAINT "registros_rpe_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id");



ALTER TABLE ONLY "public"."rendimiento_notas"
    ADD CONSTRAINT "rendimiento_notas_convocatoria_id_fkey" FOREIGN KEY ("convocatoria_id") REFERENCES "public"."convocatorias"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rendimiento_notas"
    ADD CONSTRAINT "rendimiento_notas_evaluador_id_fkey" FOREIGN KEY ("evaluador_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revision_clip_links"
    ADD CONSTRAINT "revision_clip_links_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "public"."revision_clips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revision_clip_links"
    ADD CONSTRAINT "revision_clip_links_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."revision_folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revision_clip_links"
    ADD CONSTRAINT "revision_clip_links_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."revision_clips"
    ADD CONSTRAINT "revision_clips_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."revision_clips"
    ADD CONSTRAINT "revision_clips_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revision_clips"
    ADD CONSTRAINT "revision_clips_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."revision_clips"
    ADD CONSTRAINT "revision_clips_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."revision_packs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revision_clips"
    ADD CONSTRAINT "revision_clips_source_video_id_fkey" FOREIGN KEY ("source_video_id") REFERENCES "public"."videos_partido"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."revision_folders"
    ADD CONSTRAINT "revision_folders_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."revision_packs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revision_folders"
    ADD CONSTRAINT "revision_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."revision_folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revision_packs"
    ADD CONSTRAINT "revision_packs_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revision_packs"
    ADD CONSTRAINT "revision_packs_microciclo_id_fkey" FOREIGN KEY ("microciclo_id") REFERENCES "public"."microciclos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."revision_packs"
    ADD CONSTRAINT "revision_packs_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revision_packs"
    ADD CONSTRAINT "revision_packs_rival_id_fkey" FOREIGN KEY ("rival_id") REFERENCES "public"."rivales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revision_sessions"
    ADD CONSTRAINT "revision_sessions_current_clip_id_fkey" FOREIGN KEY ("current_clip_id") REFERENCES "public"."revision_clips"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."revision_sessions"
    ADD CONSTRAINT "revision_sessions_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revision_sessions"
    ADD CONSTRAINT "revision_sessions_host_user_id_fkey" FOREIGN KEY ("host_user_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."revision_sessions"
    ADD CONSTRAINT "revision_sessions_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."revision_packs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfef_actas"
    ADD CONSTRAINT "rfef_actas_competicion_id_fkey" FOREIGN KEY ("competicion_id") REFERENCES "public"."rfef_competiciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfef_competiciones"
    ADD CONSTRAINT "rfef_competiciones_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfef_jornadas"
    ADD CONSTRAINT "rfef_jornadas_competicion_id_fkey" FOREIGN KEY ("competicion_id") REFERENCES "public"."rfef_competiciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfef_sanciones"
    ADD CONSTRAINT "rfef_sanciones_competicion_id_fkey" FOREIGN KEY ("competicion_id") REFERENCES "public"."rfef_competiciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rival_informes"
    ADD CONSTRAINT "rival_informes_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rival_informes"
    ADD CONSTRAINT "rival_informes_rival_id_fkey" FOREIGN KEY ("rival_id") REFERENCES "public"."rivales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rivales"
    ADD CONSTRAINT "rivales_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sesion_tareas"
    ADD CONSTRAINT "sesion_tareas_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sesion_tareas"
    ADD CONSTRAINT "sesion_tareas_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id");



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "sesiones_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "sesiones_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id");



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "sesiones_microciclo_id_fkey" FOREIGN KEY ("microciclo_id") REFERENCES "public"."microciclos"("id");



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "sesiones_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sesiones"
    ADD CONSTRAINT "sesiones_plan_partido_id_fkey" FOREIGN KEY ("plan_partido_id") REFERENCES "public"."planes_partido"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."solicitudes_gdpr"
    ADD CONSTRAINT "solicitudes_gdpr_procesado_por_fkey" FOREIGN KEY ("procesado_por") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."solicitudes_gdpr"
    ADD CONSTRAINT "solicitudes_gdpr_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."suplementacion_jugador"
    ADD CONSTRAINT "suplementacion_jugador_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suplementacion_jugador"
    ADD CONSTRAINT "suplementacion_jugador_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suscripciones"
    ADD CONSTRAINT "suscripciones_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suscripciones"
    ADD CONSTRAINT "suscripciones_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."planes"("id");



ALTER TABLE ONLY "public"."tactical_board_frames"
    ADD CONSTRAINT "tactical_board_frames_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."tactical_boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tactical_boards"
    ADD CONSTRAINT "tactical_boards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tactical_boards"
    ADD CONSTRAINT "tactical_boards_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tareas"
    ADD CONSTRAINT "tareas_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_tarea"("id");



ALTER TABLE ONLY "public"."tareas_contenidos"
    ADD CONSTRAINT "tareas_contenidos_contenido_id_fkey" FOREIGN KEY ("contenido_id") REFERENCES "public"."contenidos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tareas_contenidos"
    ADD CONSTRAINT "tareas_contenidos_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tareas"
    ADD CONSTRAINT "tareas_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."tareas"
    ADD CONSTRAINT "tareas_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id");



ALTER TABLE ONLY "public"."tareas"
    ADD CONSTRAINT "tareas_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id");



ALTER TABLE ONLY "public"."tareas"
    ADD CONSTRAINT "tareas_tarea_origen_id_fkey" FOREIGN KEY ("tarea_origen_id") REFERENCES "public"."tareas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transferencias_propiedad"
    ADD CONSTRAINT "transferencias_propiedad_a_usuario_id_fkey" FOREIGN KEY ("a_usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."transferencias_propiedad"
    ADD CONSTRAINT "transferencias_propiedad_de_usuario_id_fkey" FOREIGN KEY ("de_usuario_id") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."transferencias_propiedad"
    ADD CONSTRAINT "transferencias_propiedad_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id");



ALTER TABLE ONLY "public"."tratamiento_diario"
    ADD CONSTRAINT "tratamiento_diario_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tratamiento_diario"
    ADD CONSTRAINT "tratamiento_diario_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tratamiento_diario"
    ADD CONSTRAINT "tratamiento_diario_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tratamiento_diario"
    ADD CONSTRAINT "tratamiento_diario_registro_medico_id_fkey" FOREIGN KEY ("registro_medico_id") REFERENCES "public"."registros_medicos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tratamiento_diario"
    ADD CONSTRAINT "tratamiento_diario_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "public"."sesiones"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."usuarios_equipos"
    ADD CONSTRAINT "usuarios_equipos_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios_equipos"
    ADD CONSTRAINT "usuarios_equipos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id");



ALTER TABLE ONLY "public"."video_anotaciones"
    ADD CONSTRAINT "video_anotaciones_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id");



ALTER TABLE ONLY "public"."video_anotaciones"
    ADD CONSTRAINT "video_anotaciones_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id");



ALTER TABLE ONLY "public"."video_anotaciones"
    ADD CONSTRAINT "video_anotaciones_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos_partido"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_playlist_items"
    ADD CONSTRAINT "video_playlist_items_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."video_playlists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_playlist_items"
    ADD CONSTRAINT "video_playlist_items_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."video_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_playlists"
    ADD CONSTRAINT "video_playlists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."video_playlists"
    ADD CONSTRAINT "video_playlists_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_tag_categories"
    ADD CONSTRAINT "video_tag_categories_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_tag_descriptors"
    ADD CONSTRAINT "video_tag_descriptors_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."video_tag_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."video_tag_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_descriptor_id_fkey" FOREIGN KEY ("descriptor_id") REFERENCES "public"."video_tag_descriptors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos_partido"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."videos_partido"
    ADD CONSTRAINT "videos_partido_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id");



ALTER TABLE ONLY "public"."videos_partido"
    ADD CONSTRAINT "videos_partido_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "public"."partidos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vinculos_tutor"
    ADD CONSTRAINT "vinculos_tutor_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "public"."jugadores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vinculos_tutor"
    ADD CONSTRAINT "vinculos_tutor_tutor_usuario_id_fkey" FOREIGN KEY ("tutor_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vinculos_tutor"
    ADD CONSTRAINT "vinculos_tutor_verificado_por_fkey" FOREIGN KEY ("verificado_por") REFERENCES "public"."usuarios"("id");



CREATE POLICY "Admins editan su organización" ON "public"."organizaciones" FOR UPDATE USING (("id" IN ( SELECT "usuarios"."organizacion_id"
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios"."rol")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins gestionan equipos" ON "public"."equipos" USING (("organizacion_id" IN ( SELECT "usuarios"."organizacion_id"
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios"."rol")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins ven usuarios de su organización" ON "public"."usuarios" FOR SELECT USING (("organizacion_id" IN ( SELECT "usuarios_1"."organizacion_id"
   FROM "public"."usuarios" "usuarios_1"
  WHERE (("usuarios_1"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios_1"."rol")::"text" = 'admin'::"text")))));



CREATE POLICY "Allow all for service_role" ON "public"."rfef_sanciones" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Técnicos crean sesiones" ON "public"."sesiones" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios"."rol")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('tecnico_principal'::character varying)::"text", ('tecnico_asistente'::character varying)::"text"]))))));



CREATE POLICY "Técnicos crean tareas" ON "public"."tareas" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios"."rol")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('tecnico_principal'::character varying)::"text", ('tecnico_asistente'::character varying)::"text"]))))));



CREATE POLICY "Técnicos gestionan jugadores" ON "public"."jugadores" USING (("equipo_id" IN ( SELECT "equipos"."id"
   FROM "public"."equipos"
  WHERE ("equipos"."organizacion_id" IN ( SELECT "usuarios"."organizacion_id"
           FROM "public"."usuarios"
          WHERE (("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios"."rol")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('tecnico_principal'::character varying)::"text", ('tecnico_asistente'::character varying)::"text"]))))))));



CREATE POLICY "Técnicos pueden gestionar partidos" ON "public"."partidos" USING (("equipo_id" IN ( SELECT "e"."id"
   FROM ("public"."equipos" "e"
     JOIN "public"."usuarios" "u" ON (("e"."organizacion_id" = "u"."organizacion_id")))
  WHERE (("u"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("u"."rol")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('tecnico_principal'::character varying)::"text", ('tecnico_asistente'::character varying)::"text"]))))));



CREATE POLICY "Técnicos pueden gestionar rivales" ON "public"."rivales" USING (("organizacion_id" IN ( SELECT "usuarios"."organizacion_id"
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios"."rol")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('tecnico_principal'::character varying)::"text", ('tecnico_asistente'::character varying)::"text"]))))));



CREATE POLICY "Usuarios editan su perfil" ON "public"."usuarios" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Usuarios editan sus sesiones" ON "public"."sesiones" FOR UPDATE USING ((("creado_por" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios"."rol")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('tecnico_principal'::character varying)::"text"])))))));



CREATE POLICY "Usuarios editan sus tareas" ON "public"."tareas" FOR UPDATE USING ((("creado_por" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios"."rol")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('tecnico_principal'::character varying)::"text"])))))));



CREATE POLICY "Usuarios eliminan sus tareas" ON "public"."tareas" FOR DELETE USING ((("creado_por" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios"."rol")::"text" = 'admin'::"text"))))));



CREATE POLICY "Usuarios gestionan tareas de sus sesiones" ON "public"."sesion_tareas" USING (("sesion_id" IN ( SELECT "sesiones"."id"
   FROM "public"."sesiones"
  WHERE ("sesiones"."creado_por" = ( SELECT "auth"."uid"() AS "uid"))
UNION
 SELECT "s"."id"
   FROM ("public"."sesiones" "s"
     JOIN "public"."usuarios" "u" ON (("u"."id" = ( SELECT "auth"."uid"() AS "uid"))))
  WHERE (("u"."rol")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('tecnico_principal'::character varying)::"text"])))));



CREATE POLICY "Usuarios pueden ver partidos de equipos de su organización" ON "public"."partidos" FOR SELECT USING (("equipo_id" IN ( SELECT "e"."id"
   FROM ("public"."equipos" "e"
     JOIN "public"."usuarios" "u" ON (("e"."organizacion_id" = "u"."organizacion_id")))
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Usuarios pueden ver rivales de su organización" ON "public"."rivales" FOR SELECT USING (("organizacion_id" IN ( SELECT "usuarios"."organizacion_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Usuarios se ven a sí mismos" ON "public"."usuarios" FOR SELECT USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Usuarios ven equipos de su organización" ON "public"."equipos" FOR SELECT USING (("organizacion_id" IN ( SELECT "usuarios"."organizacion_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Usuarios ven jugadores de sus equipos" ON "public"."jugadores" FOR SELECT USING (("equipo_id" IN ( SELECT "equipos"."id"
   FROM "public"."equipos"
  WHERE ("equipos"."organizacion_id" IN ( SELECT "usuarios"."organizacion_id"
           FROM "public"."usuarios"
          WHERE ("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Usuarios ven sesiones de sus equipos" ON "public"."sesiones" FOR SELECT USING (("equipo_id" IN ( SELECT "usuarios_equipos"."equipo_id"
   FROM "public"."usuarios_equipos"
  WHERE ("usuarios_equipos"."usuario_id" = ( SELECT "auth"."uid"() AS "uid"))
UNION
 SELECT "equipos"."id"
   FROM "public"."equipos"
  WHERE ("equipos"."organizacion_id" IN ( SELECT "usuarios"."organizacion_id"
           FROM "public"."usuarios"
          WHERE (("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios"."rol")::"text" = 'admin'::"text")))))));



CREATE POLICY "Usuarios ven su organización" ON "public"."organizaciones" FOR SELECT USING (("id" IN ( SELECT "usuarios"."organizacion_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Usuarios ven tareas de sesiones accesibles" ON "public"."sesion_tareas" FOR SELECT USING (("sesion_id" IN ( SELECT "sesiones"."id"
   FROM "public"."sesiones")));



CREATE POLICY "Usuarios ven tareas de su organización" ON "public"."tareas" FOR SELECT USING (("organizacion_id" IN ( SELECT "usuarios"."organizacion_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."abp_jugadas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."abp_partido_jugadas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."abp_partido_plan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."abp_rival_jugadas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."abp_sesion_jugadas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accesos_medicos_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accesos_medicos_log_insert" ON "public"."accesos_medicos_log" FOR INSERT WITH CHECK (("usuario_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "accesos_medicos_log_select" ON "public"."accesos_medicos_log" FOR SELECT USING ((("usuario_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."usuarios"
  WHERE (("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios"."rol")::"text" = ANY (ARRAY[('superadmin_plataforma'::character varying)::"text", ('presidente'::character varying)::"text"])))))));



CREATE POLICY "ai_conv_insert" ON "public"."ai_conversaciones" FOR INSERT WITH CHECK (("usuario_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "ai_conv_select" ON "public"."ai_conversaciones" FOR SELECT USING (("usuario_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."ai_conversaciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_mensajes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_msg_insert" ON "public"."ai_mensajes" FOR INSERT WITH CHECK (("conversacion_id" IN ( SELECT "ai_conversaciones"."id"
   FROM "public"."ai_conversaciones"
  WHERE ("ai_conversaciones"."usuario_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "ai_msg_select" ON "public"."ai_mensajes" FOR SELECT USING (("conversacion_id" IN ( SELECT "ai_conversaciones"."id"
   FROM "public"."ai_conversaciones"
  WHERE ("ai_conversaciones"."usuario_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "asistencias_all" ON "public"."asistencias_sesion" TO "service_role" USING (true);



ALTER TABLE "public"."asistencias_sesion" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_log_insert" ON "public"."audit_log" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "audit_log_select" ON "public"."audit_log" FOR SELECT TO "service_role" USING (true);



ALTER TABLE "public"."carga_acumulada_jugador" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."carga_diaria_jugador" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categorias_tarea" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chunks_kb" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chunks_kb_select" ON "public"."chunks_kb" FOR SELECT USING (("documento_id" IN ( SELECT "documentos_kb"."id"
   FROM "public"."documentos_kb"
  WHERE ("documentos_kb"."organizacion_id" IN ( SELECT "usuarios"."organizacion_id"
           FROM "public"."usuarios"
          WHERE ("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."composicion_corporal" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conocimiento_global" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consentimientos_gdpr" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contenidos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversacion_participantes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversaciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversaciones_insert" ON "public"."conversaciones" FOR INSERT WITH CHECK (("creado_por" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "conversaciones_select" ON "public"."conversaciones" FOR SELECT USING ((("id" IN ( SELECT "conversacion_participantes"."conversacion_id"
   FROM "public"."conversacion_participantes"
  WHERE ("conversacion_participantes"."usuario_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("creado_por" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."convocatorias" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "convocatorias_insert" ON "public"."convocatorias" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "convocatorias_select" ON "public"."convocatorias" FOR SELECT TO "service_role" USING (true);



ALTER TABLE "public"."descansos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documentos_kb" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documentos_kb_insert" ON "public"."documentos_kb" FOR INSERT WITH CHECK (("organizacion_id" IN ( SELECT "usuarios"."organizacion_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "documentos_kb_select" ON "public"."documentos_kb" FOR SELECT USING (("organizacion_id" IN ( SELECT "usuarios"."organizacion_id"
   FROM "public"."usuarios"
  WHERE ("usuarios"."id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."entrenamientos_margen" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entrenamientos_margen_delete" ON "public"."entrenamientos_margen" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "entrenamientos_margen_insert" ON "public"."entrenamientos_margen" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "entrenamientos_margen_select" ON "public"."entrenamientos_margen" FOR SELECT TO "service_role" USING (true);



ALTER TABLE "public"."entrenamientos_margen_tareas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "entrenamientos_margen_update" ON "public"."entrenamientos_margen" FOR UPDATE TO "service_role" USING (true);



ALTER TABLE "public"."equipaciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."estadisticas_partido" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "estadisticas_partido_delete" ON "public"."estadisticas_partido" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "estadisticas_partido_insert" ON "public"."estadisticas_partido" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "estadisticas_partido_select" ON "public"."estadisticas_partido" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "estadisticas_partido_update" ON "public"."estadisticas_partido" FOR UPDATE TO "service_role" USING (true);



ALTER TABLE "public"."game_models" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "game_models_all" ON "public"."game_models" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."historial_suscripciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitaciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jugador_evaluaciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jugador_habitos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jugadores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "margen_tareas_delete" ON "public"."entrenamientos_margen_tareas" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "margen_tareas_insert" ON "public"."entrenamientos_margen_tareas" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "margen_tareas_select" ON "public"."entrenamientos_margen_tareas" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "margen_tareas_update" ON "public"."entrenamientos_margen_tareas" FOR UPDATE TO "service_role" USING (true);



ALTER TABLE "public"."match_day_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mensajes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mensajes_insert" ON "public"."mensajes" FOR INSERT WITH CHECK (("autor_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "mensajes_select" ON "public"."mensajes" FOR SELECT USING (("conversacion_id" IN ( SELECT "conversacion_participantes"."conversacion_id"
   FROM "public"."conversacion_participantes"
  WHERE ("conversacion_participantes"."usuario_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."microciclos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "microciclos_insert" ON "public"."microciclos" FOR INSERT WITH CHECK (("equipo_id" IN ( SELECT "usuarios_equipos"."equipo_id"
   FROM "public"."usuarios_equipos"
  WHERE ("usuarios_equipos"."usuario_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "microciclos_select" ON "public"."microciclos" FOR SELECT USING (("equipo_id" IN ( SELECT "usuarios_equipos"."equipo_id"
   FROM "public"."usuarios_equipos"
  WHERE ("usuarios_equipos"."usuario_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."notificaciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notificaciones_select" ON "public"."notificaciones" FOR SELECT USING (("usuario_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notificaciones_update" ON "public"."notificaciones" FOR UPDATE USING (("usuario_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "onboarding_all" ON "public"."onboarding_progreso" USING (("usuario_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."onboarding_progreso" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "onboarding_select" ON "public"."onboarding_progreso" FOR SELECT USING (("usuario_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."organizaciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "participantes_select" ON "public"."conversacion_participantes" FOR SELECT USING ((("usuario_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("conversacion_id" IN ( SELECT "conversacion_participantes_1"."conversacion_id"
   FROM "public"."conversacion_participantes" "conversacion_participantes_1"
  WHERE ("conversacion_participantes_1"."usuario_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."partidos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."perfiles_nutricionales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permisos_personalizados" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."planes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."planes_nutricionales_dia" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plantillas_nutricionales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portero_tareas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portero_tareas_all" ON "public"."portero_tareas" TO "service_role" USING (true) WITH CHECK (true);











ALTER TABLE "public"."pruebas_medicas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."registros_medicos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "registros_medicos_insert" ON "public"."registros_medicos" FOR INSERT WITH CHECK (("equipo_id" IN ( SELECT "usuarios_equipos"."equipo_id"
   FROM "public"."usuarios_equipos"
  WHERE (("usuarios_equipos"."usuario_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios_equipos"."rol_en_equipo")::"text" = 'fisio'::"text")))));



CREATE POLICY "registros_medicos_select" ON "public"."registros_medicos" FOR SELECT USING ((("equipo_id" IN ( SELECT "usuarios_equipos"."equipo_id"
   FROM "public"."usuarios_equipos"
  WHERE (("usuarios_equipos"."usuario_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios_equipos"."rol_en_equipo")::"text" = 'fisio'::"text")))) OR ("equipo_id" IN ( SELECT "usuarios_equipos"."equipo_id"
   FROM "public"."usuarios_equipos"
  WHERE (("usuarios_equipos"."usuario_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios_equipos"."rol_en_equipo")::"text" = 'entrenador_principal'::"text")))) OR ("jugador_id" IN ( SELECT "jugadores"."id"
   FROM "public"."jugadores"
  WHERE ("jugadores"."usuario_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("jugador_id" IN ( SELECT "vt"."jugador_id"
   FROM "public"."vinculos_tutor" "vt"
  WHERE (("vt"."tutor_usuario_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("vt"."consentimiento_otorgado" = true) AND ("vt"."consentimiento_revocado" = false))))));



CREATE POLICY "registros_medicos_update" ON "public"."registros_medicos" FOR UPDATE USING (("equipo_id" IN ( SELECT "usuarios_equipos"."equipo_id"
   FROM "public"."usuarios_equipos"
  WHERE (("usuarios_equipos"."usuario_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("usuarios_equipos"."rol_en_equipo")::"text" = 'fisio'::"text")))));



ALTER TABLE "public"."registros_rpe" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rendimiento_notas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revision_clip_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revision_clips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revision_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revision_packs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revision_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfef_actas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfef_competiciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rfef_competiciones_select" ON "public"."rfef_competiciones" FOR SELECT USING (("equipo_id" IN ( SELECT "usuarios_equipos"."equipo_id"
   FROM "public"."usuarios_equipos"
  WHERE ("usuarios_equipos"."usuario_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."rfef_jornadas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rfef_jornadas_select" ON "public"."rfef_jornadas" FOR SELECT USING (("competicion_id" IN ( SELECT "rfef_competiciones"."id"
   FROM "public"."rfef_competiciones"
  WHERE ("rfef_competiciones"."equipo_id" IN ( SELECT "usuarios_equipos"."equipo_id"
           FROM "public"."usuarios_equipos"
          WHERE ("usuarios_equipos"."usuario_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."rfef_sanciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rival_informes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rivales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rpe_insert" ON "public"."registros_rpe" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "rpe_select" ON "public"."registros_rpe" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "service_role_all" ON "public"."carga_acumulada_jugador" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."carga_diaria_jugador" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."descansos" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."jugador_evaluaciones" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."jugador_habitos" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."rfef_actas" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."rival_informes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all" ON "public"."tratamiento_diario" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."composicion_corporal" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."perfiles_nutricionales" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."planes_nutricionales_dia" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."plantillas_nutricionales" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."revision_clip_links" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."revision_clips" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."revision_folders" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."revision_packs" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."revision_sessions" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."suplementacion_jugador" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."tactical_board_frames" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."tactical_boards" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."video_playlist_items" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."video_playlists" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."video_tag_categories" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."video_tag_descriptors" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full_access" ON "public"."video_tags" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."sesion_tareas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sesiones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."solicitudes_gdpr" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suplementacion_jugador" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suscripciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tactical_board_frames" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tactical_boards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tareas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tareas_contenidos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transferencias_propiedad" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tratamiento_diario" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_own_data" ON "public"."consentimientos_gdpr" USING (("usuario_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users_own_data" ON "public"."solicitudes_gdpr" USING (("usuario_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users_own_org" ON "public"."audit_log" USING ((("organizacion_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")) OR ("usuario_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "users_own_org" ON "public"."documentos_kb" USING (("organizacion_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "users_own_org" ON "public"."equipos" USING (("organizacion_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "users_own_org" ON "public"."organizaciones" USING (("id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "users_own_org" ON "public"."suscripciones" USING (("organizacion_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")));



CREATE POLICY "users_own_org" ON "public"."usuarios" USING ((("organizacion_id" IN ( SELECT "public"."user_org_ids"() AS "user_org_ids")) OR ("id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "users_own_teams" ON "public"."jugadores" USING (("equipo_id" IN ( SELECT "public"."user_team_ids"() AS "user_team_ids")));



CREATE POLICY "users_own_teams" ON "public"."partidos" USING (("equipo_id" IN ( SELECT "public"."user_team_ids"() AS "user_team_ids")));



CREATE POLICY "users_own_teams" ON "public"."sesion_tareas" USING (("sesion_id" IN ( SELECT "sesiones"."id"
   FROM "public"."sesiones"
  WHERE ("sesiones"."equipo_id" IN ( SELECT "public"."user_team_ids"() AS "user_team_ids")))));



CREATE POLICY "users_own_teams" ON "public"."sesiones" USING (("equipo_id" IN ( SELECT "public"."user_team_ids"() AS "user_team_ids")));



CREATE POLICY "users_own_teams" ON "public"."tareas" USING (("equipo_id" IN ( SELECT "public"."user_team_ids"() AS "user_team_ids")));



CREATE POLICY "users_own_teams" ON "public"."usuarios_equipos" USING ((("equipo_id" IN ( SELECT "public"."user_team_ids"() AS "user_team_ids")) OR ("usuario_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuarios_equipos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_anotaciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "video_anotaciones_all" ON "public"."video_anotaciones" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."video_playlist_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_playlists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_tag_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_tag_descriptors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos_partido" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "videos_partido_all" ON "public"."videos_partido" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."vinculos_tutor" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_link_sesion_microciclo"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_link_sesion_microciclo"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_link_sesion_microciclo"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_resultado"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_resultado"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_resultado"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hybrid_search_kb"("p_query_text" "text", "p_query_embedding" "public"."vector", "p_match_count" integer, "p_filter_doc_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."hybrid_search_kb"("p_query_text" "text", "p_query_embedding" "public"."vector", "p_match_count" integer, "p_filter_doc_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hybrid_search_kb"("p_query_text" "text", "p_query_embedding" "public"."vector", "p_match_count" integer, "p_filter_doc_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_tarea_uso"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_tarea_uso"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_tarea_uso"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_kb_chunks"("query_embedding" "public"."vector", "match_count" integer, "filter_doc_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."search_kb_chunks"("query_embedding" "public"."vector", "match_count" integer, "filter_doc_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_kb_chunks"("query_embedding" "public"."vector", "match_count" integer, "filter_doc_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_carga_acumulada_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_carga_acumulada_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_carga_acumulada_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_entrenamientos_margen_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_entrenamientos_margen_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_entrenamientos_margen_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_estadisticas_partido_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_estadisticas_partido_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_estadisticas_partido_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_jugador_evaluaciones_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_jugador_evaluaciones_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_jugador_evaluaciones_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_jugador_habitos_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_jugador_habitos_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_jugador_habitos_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tratamiento_diario_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tratamiento_diario_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tratamiento_diario_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_org_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."user_org_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_org_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_team_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."user_team_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_team_ids"() TO "service_role";



GRANT ALL ON TABLE "public"."abp_jugadas" TO "anon";
GRANT ALL ON TABLE "public"."abp_jugadas" TO "authenticated";
GRANT ALL ON TABLE "public"."abp_jugadas" TO "service_role";



GRANT ALL ON TABLE "public"."abp_partido_jugadas" TO "anon";
GRANT ALL ON TABLE "public"."abp_partido_jugadas" TO "authenticated";
GRANT ALL ON TABLE "public"."abp_partido_jugadas" TO "service_role";



GRANT ALL ON TABLE "public"."abp_partido_plan" TO "anon";
GRANT ALL ON TABLE "public"."abp_partido_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."abp_partido_plan" TO "service_role";



GRANT ALL ON TABLE "public"."abp_rival_jugadas" TO "anon";
GRANT ALL ON TABLE "public"."abp_rival_jugadas" TO "authenticated";
GRANT ALL ON TABLE "public"."abp_rival_jugadas" TO "service_role";



GRANT ALL ON TABLE "public"."abp_sesion_jugadas" TO "anon";
GRANT ALL ON TABLE "public"."abp_sesion_jugadas" TO "authenticated";
GRANT ALL ON TABLE "public"."abp_sesion_jugadas" TO "service_role";



GRANT ALL ON TABLE "public"."accesos_medicos_log" TO "anon";
GRANT ALL ON TABLE "public"."accesos_medicos_log" TO "authenticated";
GRANT ALL ON TABLE "public"."accesos_medicos_log" TO "service_role";



GRANT ALL ON TABLE "public"."ai_conversaciones" TO "anon";
GRANT ALL ON TABLE "public"."ai_conversaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_conversaciones" TO "service_role";



GRANT ALL ON TABLE "public"."ai_mensajes" TO "anon";
GRANT ALL ON TABLE "public"."ai_mensajes" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_mensajes" TO "service_role";



GRANT ALL ON TABLE "public"."alertas" TO "anon";
GRANT ALL ON TABLE "public"."alertas" TO "authenticated";
GRANT ALL ON TABLE "public"."alertas" TO "service_role";



GRANT ALL ON TABLE "public"."asistencias_sesion" TO "anon";
GRANT ALL ON TABLE "public"."asistencias_sesion" TO "authenticated";
GRANT ALL ON TABLE "public"."asistencias_sesion" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."carga_acumulada_jugador" TO "anon";
GRANT ALL ON TABLE "public"."carga_acumulada_jugador" TO "authenticated";
GRANT ALL ON TABLE "public"."carga_acumulada_jugador" TO "service_role";



GRANT ALL ON TABLE "public"."carga_diaria_jugador" TO "anon";
GRANT ALL ON TABLE "public"."carga_diaria_jugador" TO "authenticated";
GRANT ALL ON TABLE "public"."carga_diaria_jugador" TO "service_role";



GRANT ALL ON TABLE "public"."categorias_tarea" TO "anon";
GRANT ALL ON TABLE "public"."categorias_tarea" TO "authenticated";
GRANT ALL ON TABLE "public"."categorias_tarea" TO "service_role";



GRANT ALL ON TABLE "public"."chunks_kb" TO "anon";
GRANT ALL ON TABLE "public"."chunks_kb" TO "authenticated";
GRANT ALL ON TABLE "public"."chunks_kb" TO "service_role";



GRANT ALL ON TABLE "public"."composicion_corporal" TO "anon";
GRANT ALL ON TABLE "public"."composicion_corporal" TO "authenticated";
GRANT ALL ON TABLE "public"."composicion_corporal" TO "service_role";



GRANT ALL ON TABLE "public"."conocimiento_global" TO "anon";
GRANT ALL ON TABLE "public"."conocimiento_global" TO "authenticated";
GRANT ALL ON TABLE "public"."conocimiento_global" TO "service_role";



GRANT ALL ON TABLE "public"."consentimientos_gdpr" TO "anon";
GRANT ALL ON TABLE "public"."consentimientos_gdpr" TO "authenticated";
GRANT ALL ON TABLE "public"."consentimientos_gdpr" TO "service_role";



GRANT ALL ON TABLE "public"."contenidos" TO "anon";
GRANT ALL ON TABLE "public"."contenidos" TO "authenticated";
GRANT ALL ON TABLE "public"."contenidos" TO "service_role";



GRANT ALL ON TABLE "public"."conversacion_participantes" TO "anon";
GRANT ALL ON TABLE "public"."conversacion_participantes" TO "authenticated";
GRANT ALL ON TABLE "public"."conversacion_participantes" TO "service_role";



GRANT ALL ON TABLE "public"."conversaciones" TO "anon";
GRANT ALL ON TABLE "public"."conversaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."conversaciones" TO "service_role";



GRANT ALL ON TABLE "public"."convocatorias" TO "anon";
GRANT ALL ON TABLE "public"."convocatorias" TO "authenticated";
GRANT ALL ON TABLE "public"."convocatorias" TO "service_role";



GRANT ALL ON TABLE "public"."descansos" TO "anon";
GRANT ALL ON TABLE "public"."descansos" TO "authenticated";
GRANT ALL ON TABLE "public"."descansos" TO "service_role";



GRANT ALL ON TABLE "public"."documentos_kb" TO "anon";
GRANT ALL ON TABLE "public"."documentos_kb" TO "authenticated";
GRANT ALL ON TABLE "public"."documentos_kb" TO "service_role";



GRANT ALL ON TABLE "public"."entrenamientos_margen" TO "anon";
GRANT ALL ON TABLE "public"."entrenamientos_margen" TO "authenticated";
GRANT ALL ON TABLE "public"."entrenamientos_margen" TO "service_role";



GRANT ALL ON TABLE "public"."entrenamientos_margen_tareas" TO "anon";
GRANT ALL ON TABLE "public"."entrenamientos_margen_tareas" TO "authenticated";
GRANT ALL ON TABLE "public"."entrenamientos_margen_tareas" TO "service_role";



GRANT ALL ON TABLE "public"."equipaciones" TO "anon";
GRANT ALL ON TABLE "public"."equipaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."equipaciones" TO "service_role";



GRANT ALL ON TABLE "public"."equipos" TO "anon";
GRANT ALL ON TABLE "public"."equipos" TO "authenticated";
GRANT ALL ON TABLE "public"."equipos" TO "service_role";



GRANT ALL ON TABLE "public"."estadisticas_partido" TO "anon";
GRANT ALL ON TABLE "public"."estadisticas_partido" TO "authenticated";
GRANT ALL ON TABLE "public"."estadisticas_partido" TO "service_role";



GRANT ALL ON TABLE "public"."game_models" TO "anon";
GRANT ALL ON TABLE "public"."game_models" TO "authenticated";
GRANT ALL ON TABLE "public"."game_models" TO "service_role";



GRANT ALL ON TABLE "public"."historial_suscripciones" TO "anon";
GRANT ALL ON TABLE "public"."historial_suscripciones" TO "authenticated";
GRANT ALL ON TABLE "public"."historial_suscripciones" TO "service_role";



GRANT ALL ON TABLE "public"."informes_rival" TO "anon";
GRANT ALL ON TABLE "public"."informes_rival" TO "authenticated";
GRANT ALL ON TABLE "public"."informes_rival" TO "service_role";



GRANT ALL ON TABLE "public"."invitaciones" TO "anon";
GRANT ALL ON TABLE "public"."invitaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."invitaciones" TO "service_role";



GRANT ALL ON TABLE "public"."jugador_evaluaciones" TO "anon";
GRANT ALL ON TABLE "public"."jugador_evaluaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."jugador_evaluaciones" TO "service_role";



GRANT ALL ON TABLE "public"."jugador_habitos" TO "anon";
GRANT ALL ON TABLE "public"."jugador_habitos" TO "authenticated";
GRANT ALL ON TABLE "public"."jugador_habitos" TO "service_role";



GRANT ALL ON TABLE "public"."jugadores" TO "anon";
GRANT ALL ON TABLE "public"."jugadores" TO "authenticated";
GRANT ALL ON TABLE "public"."jugadores" TO "service_role";



GRANT ALL ON TABLE "public"."match_day_config" TO "anon";
GRANT ALL ON TABLE "public"."match_day_config" TO "authenticated";
GRANT ALL ON TABLE "public"."match_day_config" TO "service_role";



GRANT ALL ON TABLE "public"."mensajes" TO "anon";
GRANT ALL ON TABLE "public"."mensajes" TO "authenticated";
GRANT ALL ON TABLE "public"."mensajes" TO "service_role";



GRANT ALL ON TABLE "public"."microciclos" TO "anon";
GRANT ALL ON TABLE "public"."microciclos" TO "authenticated";
GRANT ALL ON TABLE "public"."microciclos" TO "service_role";



GRANT ALL ON TABLE "public"."notificaciones" TO "anon";
GRANT ALL ON TABLE "public"."notificaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."notificaciones" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_progreso" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_progreso" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_progreso" TO "service_role";



GRANT ALL ON TABLE "public"."organizaciones" TO "anon";
GRANT ALL ON TABLE "public"."organizaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."organizaciones" TO "service_role";



GRANT ALL ON TABLE "public"."partidos" TO "anon";
GRANT ALL ON TABLE "public"."partidos" TO "authenticated";
GRANT ALL ON TABLE "public"."partidos" TO "service_role";



GRANT ALL ON TABLE "public"."perfiles_nutricionales" TO "anon";
GRANT ALL ON TABLE "public"."perfiles_nutricionales" TO "authenticated";
GRANT ALL ON TABLE "public"."perfiles_nutricionales" TO "service_role";



GRANT ALL ON TABLE "public"."permisos_personalizados" TO "anon";
GRANT ALL ON TABLE "public"."permisos_personalizados" TO "authenticated";
GRANT ALL ON TABLE "public"."permisos_personalizados" TO "service_role";



GRANT ALL ON TABLE "public"."planes" TO "anon";
GRANT ALL ON TABLE "public"."planes" TO "authenticated";
GRANT ALL ON TABLE "public"."planes" TO "service_role";



GRANT ALL ON TABLE "public"."planes_nutricionales_dia" TO "anon";
GRANT ALL ON TABLE "public"."planes_nutricionales_dia" TO "authenticated";
GRANT ALL ON TABLE "public"."planes_nutricionales_dia" TO "service_role";



GRANT ALL ON TABLE "public"."planes_partido" TO "anon";
GRANT ALL ON TABLE "public"."planes_partido" TO "authenticated";
GRANT ALL ON TABLE "public"."planes_partido" TO "service_role";



GRANT ALL ON TABLE "public"."plantillas_nutricionales" TO "anon";
GRANT ALL ON TABLE "public"."plantillas_nutricionales" TO "authenticated";
GRANT ALL ON TABLE "public"."plantillas_nutricionales" TO "service_role";



GRANT ALL ON TABLE "public"."portero_tareas" TO "anon";
GRANT ALL ON TABLE "public"."portero_tareas" TO "authenticated";
GRANT ALL ON TABLE "public"."portero_tareas" TO "service_role";









GRANT ALL ON TABLE "public"."pruebas_medicas" TO "anon";
GRANT ALL ON TABLE "public"."pruebas_medicas" TO "authenticated";
GRANT ALL ON TABLE "public"."pruebas_medicas" TO "service_role";



GRANT ALL ON TABLE "public"."registros_medicos" TO "anon";
GRANT ALL ON TABLE "public"."registros_medicos" TO "authenticated";
GRANT ALL ON TABLE "public"."registros_medicos" TO "service_role";



GRANT ALL ON TABLE "public"."registros_rpe" TO "anon";
GRANT ALL ON TABLE "public"."registros_rpe" TO "authenticated";
GRANT ALL ON TABLE "public"."registros_rpe" TO "service_role";



GRANT ALL ON TABLE "public"."rendimiento_notas" TO "anon";
GRANT ALL ON TABLE "public"."rendimiento_notas" TO "authenticated";
GRANT ALL ON TABLE "public"."rendimiento_notas" TO "service_role";



GRANT ALL ON TABLE "public"."revision_clip_links" TO "anon";
GRANT ALL ON TABLE "public"."revision_clip_links" TO "authenticated";
GRANT ALL ON TABLE "public"."revision_clip_links" TO "service_role";



GRANT ALL ON TABLE "public"."revision_clips" TO "anon";
GRANT ALL ON TABLE "public"."revision_clips" TO "authenticated";
GRANT ALL ON TABLE "public"."revision_clips" TO "service_role";



GRANT ALL ON TABLE "public"."revision_folders" TO "anon";
GRANT ALL ON TABLE "public"."revision_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."revision_folders" TO "service_role";



GRANT ALL ON TABLE "public"."revision_packs" TO "anon";
GRANT ALL ON TABLE "public"."revision_packs" TO "authenticated";
GRANT ALL ON TABLE "public"."revision_packs" TO "service_role";



GRANT ALL ON TABLE "public"."revision_sessions" TO "anon";
GRANT ALL ON TABLE "public"."revision_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."revision_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."rfef_actas" TO "anon";
GRANT ALL ON TABLE "public"."rfef_actas" TO "authenticated";
GRANT ALL ON TABLE "public"."rfef_actas" TO "service_role";



GRANT ALL ON TABLE "public"."rfef_competiciones" TO "anon";
GRANT ALL ON TABLE "public"."rfef_competiciones" TO "authenticated";
GRANT ALL ON TABLE "public"."rfef_competiciones" TO "service_role";



GRANT ALL ON TABLE "public"."rfef_jornadas" TO "anon";
GRANT ALL ON TABLE "public"."rfef_jornadas" TO "authenticated";
GRANT ALL ON TABLE "public"."rfef_jornadas" TO "service_role";



GRANT ALL ON TABLE "public"."rfef_sanciones" TO "anon";
GRANT ALL ON TABLE "public"."rfef_sanciones" TO "authenticated";
GRANT ALL ON TABLE "public"."rfef_sanciones" TO "service_role";



GRANT ALL ON TABLE "public"."rival_informes" TO "anon";
GRANT ALL ON TABLE "public"."rival_informes" TO "authenticated";
GRANT ALL ON TABLE "public"."rival_informes" TO "service_role";



GRANT ALL ON TABLE "public"."rivales" TO "anon";
GRANT ALL ON TABLE "public"."rivales" TO "authenticated";
GRANT ALL ON TABLE "public"."rivales" TO "service_role";



GRANT ALL ON TABLE "public"."sesion_tareas" TO "anon";
GRANT ALL ON TABLE "public"."sesion_tareas" TO "authenticated";
GRANT ALL ON TABLE "public"."sesion_tareas" TO "service_role";



GRANT ALL ON TABLE "public"."sesiones" TO "anon";
GRANT ALL ON TABLE "public"."sesiones" TO "authenticated";
GRANT ALL ON TABLE "public"."sesiones" TO "service_role";



GRANT ALL ON TABLE "public"."solicitudes_gdpr" TO "anon";
GRANT ALL ON TABLE "public"."solicitudes_gdpr" TO "authenticated";
GRANT ALL ON TABLE "public"."solicitudes_gdpr" TO "service_role";



GRANT ALL ON TABLE "public"."suplementacion_jugador" TO "anon";
GRANT ALL ON TABLE "public"."suplementacion_jugador" TO "authenticated";
GRANT ALL ON TABLE "public"."suplementacion_jugador" TO "service_role";



GRANT ALL ON TABLE "public"."suscripciones" TO "anon";
GRANT ALL ON TABLE "public"."suscripciones" TO "authenticated";
GRANT ALL ON TABLE "public"."suscripciones" TO "service_role";



GRANT ALL ON TABLE "public"."tactical_board_frames" TO "anon";
GRANT ALL ON TABLE "public"."tactical_board_frames" TO "authenticated";
GRANT ALL ON TABLE "public"."tactical_board_frames" TO "service_role";



GRANT ALL ON TABLE "public"."tactical_boards" TO "anon";
GRANT ALL ON TABLE "public"."tactical_boards" TO "authenticated";
GRANT ALL ON TABLE "public"."tactical_boards" TO "service_role";



GRANT ALL ON TABLE "public"."tareas" TO "anon";
GRANT ALL ON TABLE "public"."tareas" TO "authenticated";
GRANT ALL ON TABLE "public"."tareas" TO "service_role";



GRANT ALL ON TABLE "public"."tareas_contenidos" TO "anon";
GRANT ALL ON TABLE "public"."tareas_contenidos" TO "authenticated";
GRANT ALL ON TABLE "public"."tareas_contenidos" TO "service_role";



GRANT ALL ON TABLE "public"."transferencias_propiedad" TO "anon";
GRANT ALL ON TABLE "public"."transferencias_propiedad" TO "authenticated";
GRANT ALL ON TABLE "public"."transferencias_propiedad" TO "service_role";



GRANT ALL ON TABLE "public"."tratamiento_diario" TO "anon";
GRANT ALL ON TABLE "public"."tratamiento_diario" TO "authenticated";
GRANT ALL ON TABLE "public"."tratamiento_diario" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios_equipos" TO "anon";
GRANT ALL ON TABLE "public"."usuarios_equipos" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios_equipos" TO "service_role";



GRANT ALL ON TABLE "public"."v_ai_usage_monthly" TO "anon";
GRANT ALL ON TABLE "public"."v_ai_usage_monthly" TO "authenticated";
GRANT ALL ON TABLE "public"."v_ai_usage_monthly" TO "service_role";



GRANT ALL ON TABLE "public"."video_anotaciones" TO "anon";
GRANT ALL ON TABLE "public"."video_anotaciones" TO "authenticated";
GRANT ALL ON TABLE "public"."video_anotaciones" TO "service_role";



GRANT ALL ON TABLE "public"."video_playlist_items" TO "anon";
GRANT ALL ON TABLE "public"."video_playlist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."video_playlist_items" TO "service_role";



GRANT ALL ON TABLE "public"."video_playlists" TO "anon";
GRANT ALL ON TABLE "public"."video_playlists" TO "authenticated";
GRANT ALL ON TABLE "public"."video_playlists" TO "service_role";



GRANT ALL ON TABLE "public"."video_tag_categories" TO "anon";
GRANT ALL ON TABLE "public"."video_tag_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."video_tag_categories" TO "service_role";



GRANT ALL ON TABLE "public"."video_tag_descriptors" TO "anon";
GRANT ALL ON TABLE "public"."video_tag_descriptors" TO "authenticated";
GRANT ALL ON TABLE "public"."video_tag_descriptors" TO "service_role";



GRANT ALL ON TABLE "public"."video_tags" TO "anon";
GRANT ALL ON TABLE "public"."video_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."video_tags" TO "service_role";



GRANT ALL ON TABLE "public"."videos_partido" TO "anon";
GRANT ALL ON TABLE "public"."videos_partido" TO "authenticated";
GRANT ALL ON TABLE "public"."videos_partido" TO "service_role";



GRANT ALL ON TABLE "public"."vinculos_tutor" TO "anon";
GRANT ALL ON TABLE "public"."vinculos_tutor" TO "authenticated";
GRANT ALL ON TABLE "public"."vinculos_tutor" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







