-- Add responsable (CT) field to sesion_tareas
ALTER TABLE sesion_tareas ADD COLUMN IF NOT EXISTS responsable TEXT;
