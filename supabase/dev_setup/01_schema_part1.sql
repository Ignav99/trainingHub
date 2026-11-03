


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
