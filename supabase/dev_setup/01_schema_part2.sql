


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
