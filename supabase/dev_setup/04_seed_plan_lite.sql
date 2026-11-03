-- DEV SETUP 04: plan "lite" (edición reducida: pizarra táctica + herramienta de vídeo)
-- Usado por backend/scripts/create_lite_user.py. Mismo contenido que
-- backend/database/migrations/090_plan_lite.sql.
--
-- video_enabled=true es obligatorio: los permisos video.* (revisión) pasan por el
-- feature gate de planes.features (backend/app/security/dependencies.py).
-- Safe to re-run: ON CONFLICT (codigo) DO NOTHING.

insert into public.planes
  (codigo, nombre, tipo_licencia, max_equipos, max_usuarios_por_equipo, max_jugadores_por_equipo,
   max_storage_mb, max_ai_calls_month, max_kb_documents, features,
   precio_mensual_cents, precio_anual_cents, dias_prueba, orden, activo)
values
('lite', 'Lite', 'equipo', 1, 1, 0, 500, 0, 0,
 '{"video_enabled": true, "rival_analysis_enabled": false, "rfef_enabled": false, "medical_enabled": false, "branding_enabled": false, "advanced_stats_enabled": false, "ai_enabled": false}',
 0, 0, 0, 99, true)
on conflict (codigo) do nothing;
