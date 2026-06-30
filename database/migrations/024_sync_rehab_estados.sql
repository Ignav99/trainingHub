-- Migration: Sync jugador estado from active medical records
-- One-time data fix: sets estado='en_recuperacion' for jugadores
-- that have active (non-alta) rehabilitacion records but are still 'activo'.
--
-- This is safe to re-run — only updates rows where the transition is needed.

UPDATE jugadores
SET estado = 'en_recuperacion'
WHERE id IN (
  SELECT DISTINCT rm.jugador_id
  FROM registros_medicos rm
  WHERE rm.tipo = 'rehabilitacion'
    AND rm.estado != 'alta'
)
AND estado = 'activo';
