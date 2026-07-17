-- Enfermería: disponibilidad operativa, severidad, zona, pruebas + constraint estados jugador
-- Aplicar manualmente en Supabase SQL Editor.

-- 1) Ampliar estados permitidos en jugadores
ALTER TABLE jugadores DROP CONSTRAINT IF EXISTS jugadores_estado_check;
ALTER TABLE jugadores ADD CONSTRAINT jugadores_estado_check
  CHECK (estado IN (
    'activo',
    'lesionado',
    'en_recuperacion',
    'enfermo',
    'sancionado',
    'viaje',
    'permiso',
    'seleccion',
    'baja',
    'invitado'
  ));

-- 2) Disponibilidad operativa del jugador (fuente rápida para entrenos/convocatorias)
ALTER TABLE jugadores
  ADD COLUMN IF NOT EXISTS disponibilidad TEXT NOT NULL DEFAULT 'pleno'
    CHECK (disponibilidad IN ('fuera', 'individual', 'grupo_adaptado', 'pleno'));

CREATE INDEX IF NOT EXISTS idx_jugadores_disponibilidad
  ON jugadores (equipo_id, disponibilidad);

-- Backfill desde estado actual
UPDATE jugadores SET disponibilidad = CASE
  WHEN estado IN ('lesionado', 'enfermo', 'baja') THEN 'fuera'
  WHEN estado = 'en_recuperacion' THEN 'individual'
  WHEN estado IN ('sancionado', 'viaje', 'permiso', 'seleccion') THEN 'fuera'
  ELSE 'pleno'
END
WHERE disponibilidad = 'pleno' AND estado IS DISTINCT FROM 'activo';

-- 3) Campos clínicos / RTP en registros_medicos
ALTER TABLE registros_medicos
  ADD COLUMN IF NOT EXISTS severidad TEXT
    CHECK (severidad IS NULL OR severidad IN ('leve', 'moderada', 'grave')),
  ADD COLUMN IF NOT EXISTS zona_corporal TEXT,
  ADD COLUMN IF NOT EXISTS lado TEXT
    CHECK (lado IS NULL OR lado IN ('izquierdo', 'derecho', 'bilateral', 'no_aplica')),
  ADD COLUMN IF NOT EXISTS mecanismo TEXT,
  ADD COLUMN IF NOT EXISTS es_relesion BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registro_origen_id UUID REFERENCES registros_medicos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS disponibilidad TEXT
    CHECK (disponibilidad IS NULL OR disponibilidad IN ('fuera', 'individual', 'grupo_adaptado', 'pleno')),
  ADD COLUMN IF NOT EXISTS fase_rtp TEXT
    CHECK (fase_rtp IS NULL OR fase_rtp IN (
      'fase_1_control_dolor',
      'fase_2_movilidad',
      'fase_3_fuerza_base',
      'fase_4_fuerza_funcional',
      'fase_5_carrera_lineal',
      'fase_6_cambios_direccion',
      'fase_7_entrenamiento_equipo',
      'fase_8_competicion'
    ));

CREATE INDEX IF NOT EXISTS idx_registros_medicos_disponibilidad
  ON registros_medicos (jugador_id, estado, disponibilidad);

-- Backfill disponibilidad del registro según tipo/estado
UPDATE registros_medicos SET disponibilidad = CASE
  WHEN estado = 'alta' THEN 'pleno'
  WHEN tipo = 'molestias' THEN 'pleno'
  WHEN tipo = 'enfermedad' THEN 'fuera'
  WHEN tipo = 'rehabilitacion' OR estado = 'en_recuperacion' THEN 'individual'
  WHEN tipo = 'lesion' THEN 'fuera'
  ELSE 'fuera'
END
WHERE disponibilidad IS NULL;

-- 4) Pruebas médicas ligadas al caso
CREATE TABLE IF NOT EXISTS pruebas_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_medico_id UUID NOT NULL REFERENCES registros_medicos(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'otro'
    CHECK (tipo IN (
      'imagen',
      'reconocimiento',
      'isokinetico',
      'gps_campo',
      'laboratorio',
      'funcional',
      'otro'
    )),
  titulo TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  resultado TEXT,
  apto BOOLEAN,
  documento_url TEXT,
  notas TEXT,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pruebas_medicas_registro
  ON pruebas_medicas (registro_medico_id);

CREATE INDEX IF NOT EXISTS idx_pruebas_medicas_jugador
  ON pruebas_medicas (jugador_id, fecha DESC);
