-- Migration 016: Guest Players (Jugadores Invitados)
-- Adds es_invitado flag to jugadores table for cross-team and temporary players

ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS es_invitado BOOLEAN DEFAULT false;

COMMENT ON COLUMN jugadores.es_invitado IS 'True for guest players (from other teams or temporary for trials)';
