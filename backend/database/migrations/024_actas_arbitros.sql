-- ============================================================
-- Migration 024: Add arbitros column to rfef_actas
-- Stores referee information (name + delegation) as JSONB array
-- ============================================================

BEGIN;

ALTER TABLE rfef_actas ADD COLUMN IF NOT EXISTS arbitros JSONB DEFAULT '[]';

COMMIT;
