-- ============================================================================
-- TRAININGHUB PRO - MIGRACIÓN: SISTEMA DE OBJETIVOS Y CONTENIDOS
-- ============================================================================
-- Este sistema permite filtrar tareas por lo que se quiere trabajar
-- ============================================================================

-- ============================================================================
-- TABLA: CONTENIDOS (Catálogo maestro de qué se puede trabajar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS contenidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,

    -- Clasificación
    dimension VARCHAR(50) NOT NULL CHECK (dimension IN (
        'tecnico',      -- Técnica individual
        'tactico',      -- Táctica colectiva/individual
        'fisico',       -- Capacidades físicas
        'psicologico',  -- Aspectos mentales
        'estrategico'   -- Balón parado y estrategia
    )),

    -- Sub-clasificación táctica (solo si dimension = 'tactico')
    fase_juego VARCHAR(50) CHECK (fase_juego IN (
        'ataque_organizado',
        'transicion_def_ataque',
        'defensa_organizada',
        'transicion_ataq_defensa',
        'balon_parado',
        NULL
    )),

    -- Jerarquía (para agrupar)
    contenido_padre_id UUID REFERENCES contenidos(id),
    nivel INTEGER DEFAULT 1, -- 1=principal, 2=subcontenido, 3=detalle

    -- Metadatos
    icono VARCHAR(50),
    color VARCHAR(7),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true
);

CREATE INDEX idx_contenidos_dimension ON contenidos(dimension);
CREATE INDEX idx_contenidos_fase ON contenidos(fase_juego);
CREATE INDEX idx_contenidos_padre ON contenidos(contenido_padre_id);

-- ============================================================================
-- TABLA: TAREAS_CONTENIDOS (Relación N:M entre tareas y contenidos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tareas_contenidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tarea_id UUID NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
    contenido_id UUID NOT NULL REFERENCES contenidos(id) ON DELETE CASCADE,

    -- Importancia del contenido en esta tarea
    es_principal BOOLEAN DEFAULT false, -- Contenido principal de la tarea
    relevancia INTEGER DEFAULT 5 CHECK (relevancia BETWEEN 1 AND 10), -- 1-10

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tarea_id, contenido_id)
);

CREATE INDEX idx_tareas_contenidos_tarea ON tareas_contenidos(tarea_id);
CREATE INDEX idx_tareas_contenidos_contenido ON tareas_contenidos(contenido_id);
CREATE INDEX idx_tareas_contenidos_principal ON tareas_contenidos(es_principal);

-- ============================================================================
-- SEED: CONTENIDOS TÉCNICOS
-- ============================================================================
INSERT INTO contenidos (codigo, nombre, descripcion, dimension, nivel, orden) VALUES
-- Técnica con balón
('TEC_CONTROL', 'Control orientado', 'Recepción del balón orientando el cuerpo hacia la siguiente acción', 'tecnico', 1, 1),
('TEC_PASE_CORTO', 'Pase corto', 'Pase a menos de 15 metros con precisión', 'tecnico', 1, 2),
('TEC_PASE_MEDIO', 'Pase medio', 'Pase entre 15 y 30 metros', 'tecnico', 1, 3),
('TEC_PASE_LARGO', 'Pase largo', 'Pase a más de 30 metros, cambios de orientación', 'tecnico', 1, 4),
('TEC_CONDUCCION', 'Conducción', 'Desplazamiento con el balón controlado', 'tecnico', 1, 5),
('TEC_REGATE', 'Regate/Desborde', 'Superar al rival en el 1v1 con balón', 'tecnico', 1, 6),
('TEC_CENTRO', 'Centro al área', 'Envío del balón al área desde banda', 'tecnico', 1, 7),
('TEC_REMATE', 'Remate/Finalización', 'Golpeo a portería con intención de gol', 'tecnico', 1, 8),
('TEC_CABEZA', 'Juego de cabeza', 'Control, pase o remate con la cabeza', 'tecnico', 1, 9),
('TEC_PORTERO', 'Técnica de portero', 'Blocajes, despejes, saques', 'tecnico', 1, 10),

-- Técnica sin balón
('TEC_DESMARQUE', 'Desmarque', 'Movimiento para recibir libre de marca', 'tecnico', 1, 11),
('TEC_ENTRADA', 'Entrada/Tackle', 'Acción defensiva para recuperar balón', 'tecnico', 1, 12),
('TEC_INTERCEPCION', 'Intercepción', 'Cortar línea de pase o trayectoria', 'tecnico', 1, 13)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- SEED: CONTENIDOS TÁCTICOS - ATAQUE ORGANIZADO
-- ============================================================================
INSERT INTO contenidos (codigo, nombre, descripcion, dimension, fase_juego, nivel, orden) VALUES
-- Principios Ataque Organizado
('TAC_AO_SALIDA', 'Salida de balón', 'Construcción desde portero y defensas', 'tactico', 'ataque_organizado', 1, 1),
('TAC_AO_CONSTRUCCION', 'Construcción', 'Progresión en zona 1 y 2 del campo', 'tactico', 'ataque_organizado', 1, 2),
('TAC_AO_CREACION', 'Creación de ocasiones', 'Generación de oportunidades en zona 3', 'tactico', 'ataque_organizado', 1, 3),
('TAC_AO_FINALIZACION', 'Finalización', 'Culminación de jugada con remate', 'tactico', 'ataque_organizado', 1, 4),

-- Subprincipios Ataque
('TAC_AO_AMPLITUD', 'Amplitud', 'Ocupar todo el ancho del campo', 'tactico', 'ataque_organizado', 2, 5),
('TAC_AO_PROFUNDIDAD', 'Profundidad', 'Generar líneas de pase verticales', 'tactico', 'ataque_organizado', 2, 6),
('TAC_AO_MOVILIDAD', 'Movilidad', 'Movimiento constante para generar espacios', 'tactico', 'ataque_organizado', 2, 7),
('TAC_AO_SUPERIORIDAD', 'Superioridad numérica', 'Crear ventaja de jugadores en zona', 'tactico', 'ataque_organizado', 2, 8),
('TAC_AO_TERCER_HOMBRE', 'Tercer hombre', 'Combinaciones con tercero en apoyo', 'tactico', 'ataque_organizado', 2, 9),
('TAC_AO_CAMBIO_ORIENT', 'Cambio de orientación', 'Mover balón de un lado a otro', 'tactico', 'ataque_organizado', 2, 10),
('TAC_AO_JUEGO_INTERIOR', 'Juego interior', 'Combinaciones por el centro', 'tactico', 'ataque_organizado', 2, 11),
('TAC_AO_JUEGO_EXTERIOR', 'Juego por banda', 'Ataque y llegada por los extremos', 'tactico', 'ataque_organizado', 2, 12),
('TAC_AO_POSICIONAL', 'Juego posicional', 'Ocupación racional del espacio', 'tactico', 'ataque_organizado', 2, 13)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- SEED: CONTENIDOS TÁCTICOS - TRANSICIÓN DEFENSA-ATAQUE
-- ============================================================================
INSERT INTO contenidos (codigo, nombre, descripcion, dimension, fase_juego, nivel, orden) VALUES
('TAC_TDA_CONTRAATAQUE', 'Contraataque', 'Ataque rápido y directo tras recuperación', 'tactico', 'transicion_def_ataque', 1, 1),
('TAC_TDA_ATAQUE_RAPIDO', 'Ataque rápido', 'Transición rápida buscando desorden rival', 'tactico', 'transicion_def_ataque', 1, 2),
('TAC_TDA_TRANSICION_POS', 'Transición posicional', 'Pasar de defender a atacar con pausa', 'tactico', 'transicion_def_ataque', 1, 3),
('TAC_TDA_VERTICALIDAD', 'Verticalidad', 'Buscar profundidad inmediata al recuperar', 'tactico', 'transicion_def_ataque', 2, 4),
('TAC_TDA_CONSERVAR', 'Conservar tras robo', 'Asegurar posesión antes de atacar', 'tactico', 'transicion_def_ataque', 2, 5)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- SEED: CONTENIDOS TÁCTICOS - DEFENSA ORGANIZADA
-- ============================================================================
INSERT INTO contenidos (codigo, nombre, descripcion, dimension, fase_juego, nivel, orden) VALUES
-- Principios Defensa
('TAC_DO_PRESSING', 'Pressing', 'Presión sobre el poseedor del balón', 'tactico', 'defensa_organizada', 1, 1),
('TAC_DO_REPLIEGUE', 'Repliegue', 'Retroceso ordenado hacia portería propia', 'tactico', 'defensa_organizada', 1, 2),
('TAC_DO_MARCAJE', 'Marcaje', 'Vigilancia de jugadores rivales', 'tactico', 'defensa_organizada', 1, 3),
('TAC_DO_COBERTURA', 'Coberturas', 'Ayuda al compañero superado', 'tactico', 'defensa_organizada', 1, 4),
('TAC_DO_PERMUTA', 'Permutas', 'Intercambio de posiciones defensivas', 'tactico', 'defensa_organizada', 1, 5),

-- Subprincipios Defensa
('TAC_DO_BLOQUE_ALTO', 'Bloque alto', 'Defender lejos de portería propia', 'tactico', 'defensa_organizada', 2, 6),
('TAC_DO_BLOQUE_MEDIO', 'Bloque medio', 'Defender en zona media del campo', 'tactico', 'defensa_organizada', 2, 7),
('TAC_DO_BLOQUE_BAJO', 'Bloque bajo', 'Defender cerca de portería propia', 'tactico', 'defensa_organizada', 2, 8),
('TAC_DO_COMPACTACION', 'Compactación', 'Reducir espacios entre líneas', 'tactico', 'defensa_organizada', 2, 9),
('TAC_DO_BASCULACION', 'Basculación', 'Movimiento colectivo hacia zona del balón', 'tactico', 'defensa_organizada', 2, 10),
('TAC_DO_LINEA_FUERA_J', 'Línea de fuera de juego', 'Coordinar línea defensiva', 'tactico', 'defensa_organizada', 2, 11),
('TAC_DO_VIGILANCIAS', 'Vigilancias', 'Control de jugadores alejados del balón', 'tactico', 'defensa_organizada', 2, 12),
('TAC_DO_ANTICIPACION', 'Anticipación', 'Leer jugada y actuar antes que rival', 'tactico', 'defensa_organizada', 2, 13)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- SEED: CONTENIDOS TÁCTICOS - TRANSICIÓN ATAQUE-DEFENSA
-- ============================================================================
INSERT INTO contenidos (codigo, nombre, descripcion, dimension, fase_juego, nivel, orden) VALUES
('TAC_TAD_GEGENPRESSING', 'Gegenpressing', 'Presión inmediata tras pérdida (6 seg)', 'tactico', 'transicion_ataq_defensa', 1, 1),
('TAC_TAD_REPLIEGUE_INT', 'Repliegue intensivo', 'Vuelta rápida a posiciones defensivas', 'tactico', 'transicion_ataq_defensa', 1, 2),
('TAC_TAD_TEMPORIZACION', 'Temporización', 'Retrasar avance rival mientras se organiza', 'tactico', 'transicion_ataq_defensa', 1, 3),
('TAC_TAD_BALANCE', 'Balance defensivo', 'Jugadores bien posicionados para defender', 'tactico', 'transicion_ataq_defensa', 2, 4),
('TAC_TAD_FALTA_TACTICA', 'Falta táctica', 'Cometer falta para cortar transición', 'tactico', 'transicion_ataq_defensa', 2, 5)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- SEED: CONTENIDOS TÁCTICOS - BALÓN PARADO
-- ============================================================================
INSERT INTO contenidos (codigo, nombre, descripcion, dimension, fase_juego, nivel, orden) VALUES
-- Ofensivos
('TAC_ABP_CORNER_OF', 'Córner ofensivo', 'Estrategia de saque de esquina', 'tactico', 'balon_parado', 1, 1),
('TAC_ABP_FALTA_FRONT_OF', 'Falta frontal ofensiva', 'Tiro directo o jugada ensayada', 'tactico', 'balon_parado', 1, 2),
('TAC_ABP_FALTA_LAT_OF', 'Falta lateral ofensiva', 'Centro al área desde banda', 'tactico', 'balon_parado', 1, 3),
('TAC_ABP_BANDA_OF', 'Saque banda largo', 'Saque de banda al área', 'tactico', 'balon_parado', 1, 4),
('TAC_ABP_PENALTI', 'Penaltis', 'Ejecución de penaltis', 'tactico', 'balon_parado', 1, 5),

-- Defensivos
('TAC_ABP_CORNER_DEF', 'Defensa de córner', 'Organización defensiva en córner', 'tactico', 'balon_parado', 1, 6),
('TAC_ABP_FALTA_DEF', 'Defensa de falta', 'Barrera y organización en faltas', 'tactico', 'balon_parado', 1, 7),
('TAC_ABP_ZONAL', 'Defensa zonal ABP', 'Sistema zonal en balón parado', 'tactico', 'balon_parado', 2, 8),
('TAC_ABP_INDIVIDUAL', 'Marcaje individual ABP', 'Sistema de marcajes individuales', 'tactico', 'balon_parado', 2, 9),
('TAC_ABP_MIXTO', 'Sistema mixto ABP', 'Combinación zonal + individual', 'tactico', 'balon_parado', 2, 10)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- SEED: CONTENIDOS FÍSICOS
-- ============================================================================
INSERT INTO contenidos (codigo, nombre, descripcion, dimension, nivel, orden) VALUES
('FIS_RESISTENCIA_AER', 'Resistencia aeróbica', 'Capacidad de mantener esfuerzo prolongado', 'fisico', 1, 1),
('FIS_RESISTENCIA_ANA', 'Resistencia anaeróbica', 'Capacidad de esfuerzo intenso corto', 'fisico', 1, 2),
('FIS_POTENCIA_AER', 'Potencia aeróbica', 'Máxima capacidad de consumo de O2', 'fisico', 1, 3),
('FIS_RSA', 'RSA (Repeated Sprint)', 'Capacidad de repetir sprints', 'fisico', 1, 4),
('FIS_VELOCIDAD_MAX', 'Velocidad máxima', 'Alcanzar máxima velocidad de carrera', 'fisico', 1, 5),
('FIS_VELOCIDAD_REAC', 'Velocidad de reacción', 'Tiempo de respuesta a estímulo', 'fisico', 1, 6),
('FIS_ACELERACION', 'Aceleración', 'Capacidad de aumentar velocidad rápido', 'fisico', 1, 7),
('FIS_CAMBIO_DIR', 'Cambios de dirección', 'Agilidad en cambios de sentido', 'fisico', 1, 8),
('FIS_FUERZA_EXPL', 'Fuerza explosiva', 'Fuerza aplicada en tiempo mínimo', 'fisico', 1, 9),
('FIS_FUERZA_RES', 'Fuerza resistencia', 'Mantener fuerza en el tiempo', 'fisico', 1, 10),
('FIS_COORDINACION', 'Coordinación', 'Control corporal y de movimientos', 'fisico', 1, 11),
('FIS_FLEXIBILIDAD', 'Flexibilidad', 'Rango de movimiento articular', 'fisico', 1, 12),
('FIS_RECUPERACION', 'Recuperación activa', 'Ejercicio regenerativo de baja carga', 'fisico', 1, 13),
('FIS_DUELOS', 'Capacidad de duelo', 'Fuerza y técnica en duelos 1v1', 'fisico', 1, 14)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- SEED: CONTENIDOS PSICOLÓGICOS
-- ============================================================================
INSERT INTO contenidos (codigo, nombre, descripcion, dimension, nivel, orden) VALUES
('PSI_CONCENTRACION', 'Concentración', 'Mantener atención en la tarea', 'psicologico', 1, 1),
('PSI_TOMA_DECISION', 'Toma de decisiones', 'Elegir la mejor opción bajo presión', 'psicologico', 1, 2),
('PSI_COMUNICACION', 'Comunicación', 'Transmitir información a compañeros', 'psicologico', 1, 3),
('PSI_LIDERAZGO', 'Liderazgo', 'Guiar y motivar al equipo', 'psicologico', 1, 4),
('PSI_COMPETITIVIDAD', 'Competitividad', 'Afán de ganar y superarse', 'psicologico', 1, 5),
('PSI_RESILIENCIA', 'Resiliencia', 'Superar errores y adversidad', 'psicologico', 1, 6),
('PSI_GESTION_PRESION', 'Gestión de presión', 'Rendir bajo situaciones de estrés', 'psicologico', 1, 7),
('PSI_COHESION', 'Cohesión grupal', 'Sentimiento de unidad del equipo', 'psicologico', 1, 8),
('PSI_AUTOCONFIANZA', 'Autoconfianza', 'Creer en las propias capacidades', 'psicologico', 1, 9),
('PSI_VISION_JUEGO', 'Visión de juego', 'Percepción amplia del entorno', 'psicologico', 1, 10),
('PSI_ANTICIPACION', 'Anticipación mental', 'Prever acciones de rivales/compañeros', 'psicologico', 1, 11),
('PSI_AGRESIVIDAD', 'Agresividad controlada', 'Intensidad sin perder control', 'psicologico', 1, 12)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
