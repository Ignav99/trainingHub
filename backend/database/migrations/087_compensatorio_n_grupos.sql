-- 087: compensatorio N grupos (2–8). Amplía el CHECK de fase_sesion.
-- Idempotente. Pegar entero en Supabase SQL Editor.

ALTER TABLE sesion_tareas DROP CONSTRAINT IF EXISTS sesion_tareas_fase_sesion_check;

ALTER TABLE sesion_tareas
  ADD CONSTRAINT sesion_tareas_fase_sesion_check
  CHECK (
    fase_sesion IS NULL OR fase_sesion IN (
      'activacion',
      'desarrollo_1',
      'desarrollo_2',
      'desarrollo_3',
      'desarrollo_4',
      'desarrollo_5',
      'desarrollo_6',
      'vuelta_calma',
      'compensatorio_1',
      'compensatorio_2',
      'compensatorio_3',
      'compensatorio_4',
      'compensatorio_5',
      'compensatorio_6',
      'compensatorio_7',
      'compensatorio_8'
    )
  );
