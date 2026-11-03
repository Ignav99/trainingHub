-- Migration 090: plan "lite" (edición reducida: pizarra táctica + herramienta de vídeo).
-- Los usuarios lite se crean con backend/scripts/create_lite_user.py.
-- video_enabled=true es obligatorio: los permisos video.* pasan por el feature gate
-- de planes.features (app/security/dependencies.py).

INSERT INTO planes
  (codigo, nombre, tipo_licencia, max_equipos, max_usuarios_por_equipo, max_jugadores_por_equipo,
   max_storage_mb, max_ai_calls_month, max_kb_documents, features,
   precio_mensual_cents, precio_anual_cents, dias_prueba, orden, activo)
VALUES
('lite', 'Lite', 'equipo', 1, 1, 0, 500, 0, 0,
 '{"video_enabled": true, "rival_analysis_enabled": false, "rfef_enabled": false, "medical_enabled": false, "branding_enabled": false, "advanced_stats_enabled": false, "ai_enabled": false}',
 0, 0, 0, 99, true)
ON CONFLICT (codigo) DO NOTHING;
