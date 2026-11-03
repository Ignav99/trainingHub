-- DEV SETUP 03: plan catalogue (planes)
-- Source: backend/database/migrations/010_planes_suscripciones.sql (original seed).
-- Registration (backend/app/api/v1/auth.py -> LicenseService.create_trial_subscription)
-- looks up the plan with codigo = 'free_trial'; without it, registering a new club fails
-- halfway and leaves a partially created account.
--
-- Production's current values may have been edited by hand since this seed (the
-- schema-only dump has no rows). Stripe price ids are left empty on purpose.
-- Safe to re-run: ON CONFLICT (codigo) DO NOTHING.

insert into public.planes
  (codigo, nombre, tipo_licencia, max_equipos, max_usuarios_por_equipo, max_jugadores_por_equipo,
   max_storage_mb, max_ai_calls_month, max_kb_documents, features,
   precio_mensual_cents, precio_anual_cents, dias_prueba, orden)
values
('free_trial', 'Prueba Gratis', 'equipo', 1, 3, 25, 100, 10, 3,
 '{"video_enabled": false, "rival_analysis_enabled": false, "rfef_enabled": false, "medical_enabled": false, "branding_enabled": false, "advanced_stats_enabled": false, "ai_enabled": true}',
 0, 0, 14, 0),
('equipo_basico', 'Equipo Basico', 'equipo', 1, 5, 30, 500, 30, 10,
 '{"video_enabled": false, "rival_analysis_enabled": true, "rfef_enabled": false, "medical_enabled": false, "branding_enabled": false, "advanced_stats_enabled": false, "ai_enabled": true}',
 999, 9990, 0, 1),
('equipo_premium', 'Equipo Premium', 'equipo', 1, 10, 40, 2048, 100, 50,
 '{"video_enabled": true, "rival_analysis_enabled": true, "rfef_enabled": true, "medical_enabled": true, "branding_enabled": true, "advanced_stats_enabled": true, "ai_enabled": true}',
 1999, 19990, 0, 2),
('club_basico', 'Club Basico', 'club', 5, 8, 30, 5120, 100, 50,
 '{"video_enabled": true, "rival_analysis_enabled": true, "rfef_enabled": true, "medical_enabled": false, "branding_enabled": true, "advanced_stats_enabled": true, "ai_enabled": true}',
 4999, 49990, 0, 3),
('club_premium', 'Club Premium', 'club', 20, 15, 50, 20480, 500, 200,
 '{"video_enabled": true, "rival_analysis_enabled": true, "rfef_enabled": true, "medical_enabled": true, "branding_enabled": true, "advanced_stats_enabled": true, "ai_enabled": true}',
 9999, 99990, 0, 4)
on conflict (codigo) do nothing;
