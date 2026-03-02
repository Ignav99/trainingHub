-- Migration 015: Per-task team formations
-- Adds JSONB column to store team formation data per sesion_tarea

ALTER TABLE sesion_tareas
ADD COLUMN IF NOT EXISTS formacion_equipos JSONB DEFAULT NULL;

COMMENT ON COLUMN sesion_tareas.formacion_equipos IS
'Estructura: { estructura_original, auto_generado, espacios: [{ nombre, estructura, grupos: [{ nombre, color, tipo, jugador_ids }] }] }';
