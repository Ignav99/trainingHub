-- ============================================================
-- Migration 039: Add extended fields to tareas table
-- objetivo_fisico, objetivo_psicologico, variantes, progresiones,
-- regresiones, material, video_url
-- ============================================================

ALTER TABLE tareas ADD COLUMN IF NOT EXISTS objetivo_fisico TEXT;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS objetivo_psicologico TEXT;
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS variantes JSONB DEFAULT '[]';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS progresiones JSONB DEFAULT '[]';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS regresiones JSONB DEFAULT '[]';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS material JSONB DEFAULT '[]';
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS video_url TEXT;
