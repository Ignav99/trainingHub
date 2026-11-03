


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








