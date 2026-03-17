-- Fix: add 'molestias' and 'otro' to registros_medicos tipo check constraint
ALTER TABLE registros_medicos DROP CONSTRAINT IF EXISTS registros_medicos_tipo_check;
ALTER TABLE registros_medicos ADD CONSTRAINT registros_medicos_tipo_check
  CHECK (tipo IN ('lesion', 'enfermedad', 'molestias', 'rehabilitacion', 'otro'));
