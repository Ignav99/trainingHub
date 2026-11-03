


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
