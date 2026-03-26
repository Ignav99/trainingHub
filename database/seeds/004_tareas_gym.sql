-- ============================================================================
-- SEED 004: TAREAS DE GIMNASIO / PREPARACIÓN FÍSICA
-- ============================================================================
-- 17 ejercicios profesionales basados en investigación S&C
-- (FIFA 11+, NSCA, periodización de Match Day)
--
-- NOTA: Este seed requiere que la migración 010_gym_tasks.sql se haya ejecutado
-- y que exista al menos una organización. Usa la primera organización disponible.
-- ============================================================================

DO $$
DECLARE
    v_org_id UUID;
    v_cat_gym UUID;
    v_cat_prv UUID;
    v_cat_mov UUID;
    v_cat_rcf UUID;
BEGIN
    -- Obtener primera organización disponible
    SELECT id INTO v_org_id FROM organizaciones LIMIT 1;
    IF v_org_id IS NULL THEN
        RAISE NOTICE 'No hay organizaciones. Saltando seed de tareas gym.';
        RETURN;
    END IF;

    -- Obtener IDs de categorías
    SELECT id INTO v_cat_gym FROM categorias_tarea WHERE codigo = 'GYM';
    SELECT id INTO v_cat_prv FROM categorias_tarea WHERE codigo = 'PRV';
    SELECT id INTO v_cat_mov FROM categorias_tarea WHERE codigo = 'MOV';
    SELECT id INTO v_cat_rcf FROM categorias_tarea WHERE codigo = 'RCF';

    -- ========================================================================
    -- GYM: FUERZA / GIMNASIO (5 tareas)
    -- ========================================================================

    -- GYM-001: Sentadilla Trasera (Back Squat)
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Sentadilla Trasera (Back Squat)', 'GYM-001', v_cat_gym, v_org_id,
        20, 1, 4, 0,
        'Sentadilla trasera con barra olímpica. Ejercicio fundamental de fuerza para tren inferior. '
        'Posición de la barra en trapecio alto/bajo según preferencia. Descenso controlado hasta paralelo o por debajo. '
        'Pies separados ancho de hombros, punta de pies ligeramente hacia fuera.',
        1, 'media',
        true, ARRAY['cuádriceps','glúteos','isquiotibiales','core'],
        ARRAY['barra olímpica','rack de sentadillas','discos'],
        'concentrica', 'tren_inferior', 'fuerza_maxima',
        '{"series":4,"repeticiones":"6","descanso_seg":120,"porcentaje_rm":80}',
        'Semana 1-2: 4x8 @70%. Semana 3-4: 4x6 @80%. Semana 5: 3x4 @85%. Deload: 3x6 @65%.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- GYM-002: Peso Muerto Rumano (RDL)
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Peso Muerto Rumano (RDL)', 'GYM-002', v_cat_gym, v_org_id,
        15, 1, 4, 0,
        'Peso muerto rumano con barra o mancuernas. Énfasis en cadena posterior: isquiotibiales y glúteos. '
        'Mantener espalda neutra, rodillas ligeramente flexionadas. Descenso lento y controlado (3-4 seg excéntrico). '
        'Fundamental para prevención de lesiones de isquiotibiales en futbolistas.',
        1, 'media',
        true, ARRAY['isquiotibiales','glúteos','erectores espinales'],
        ARRAY['barra olímpica','mancuernas'],
        'excentrica', 'tren_inferior', 'fuerza_maxima',
        '{"series":3,"repeticiones":"8","descanso_seg":90,"porcentaje_rm":70}',
        'Semana 1-2: 3x10 @60%. Semana 3-4: 3x8 @70%. Semana 5: 4x6 @75%. Priorizar tempo excéntrico.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- GYM-003: Press Banca (Bench Press)
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Press Banca (Bench Press)', 'GYM-003', v_cat_gym, v_org_id,
        18, 1, 4, 0,
        'Press de banca con barra olímpica. Trabajo de empuje horizontal para tren superior. '
        'Agarre ancho de hombros, retracción escapular, arco torácico natural. '
        'Descenso controlado hasta el pecho, empuje explosivo.',
        1, 'media',
        true, ARRAY['pectoral','deltoides','tríceps'],
        ARRAY['barra olímpica','banco press','discos'],
        'concentrica', 'tren_superior', 'fuerza_maxima',
        '{"series":4,"repeticiones":"8","descanso_seg":90,"porcentaje_rm":75}',
        'Semana 1-2: 3x10 @65%. Semana 3-4: 4x8 @75%. Semana 5: 4x5 @82%. Deload: 3x8 @60%.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- GYM-004: Hip Thrust
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Hip Thrust', 'GYM-004', v_cat_gym, v_org_id,
        15, 1, 4, 0,
        'Hip Thrust con barra apoyando la espalda alta en un banco. '
        'Extensión completa de cadera en la parte superior. Activación máxima de glúteos. '
        'Esencial para potencia de sprint y cambios de dirección en fútbol.',
        1, 'baja',
        true, ARRAY['glúteos','isquiotibiales','core'],
        ARRAY['barra olímpica','banco','discos','pad de barra'],
        'concentrica', 'tren_inferior', 'potencia',
        '{"series":3,"repeticiones":"10","descanso_seg":90,"porcentaje_rm":70}',
        'Semana 1-2: 3x12 @60%. Semana 3-4: 3x10 @70%. Semana 5: 4x8 @75%.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- GYM-005: Sentadilla Búlgara
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Sentadilla Búlgara (Split Squat)', 'GYM-005', v_cat_gym, v_org_id,
        15, 1, 4, 0,
        'Sentadilla búlgara con pie trasero elevado en banco. Trabajo unilateral de fuerza. '
        'Excelente para corregir asimetrías entre piernas y mejorar estabilidad. '
        'Puede realizarse con peso corporal, mancuernas o chaleco lastrado.',
        1, 'media',
        true, ARRAY['cuádriceps','glúteos','isquiotibiales','aductores'],
        ARRAY['banco','mancuernas','peso corporal'],
        'concentrica', 'tren_inferior', 'hipertrofia',
        '{"series":3,"repeticiones":"8/pierna","descanso_seg":90}',
        'Comenzar con peso corporal. Progresar a mancuernas ligeras. Semana 3+: añadir carga.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- PRV: PREVENCIÓN DE LESIONES (4 tareas)
    -- ========================================================================

    -- PRV-001: Protocolo Nórdicos (Nordic Hamstring)
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Protocolo Nórdicos (Nordic Hamstring Curl)', 'PRV-001', v_cat_prv, v_org_id,
        12, 1, 6, 0,
        'Ejercicio excéntrico de isquiotibiales con evidencia A para reducción de lesiones (>50% según meta-análisis). '
        'En parejas: el ejecutante se arrodilla y el compañero sujeta los tobillos. '
        'Descenso lento y controlado (3-5 seg) manteniendo línea cadera-rodilla-hombro.',
        1, 'baja',
        true, ARRAY['isquiotibiales'],
        ARRAY['colchoneta','compañero'],
        'excentrica', 'tren_inferior', 'fuerza_maxima',
        '{"series":3,"repeticiones":"5","descanso_seg":120}',
        'Sem 1-2: 2x3. Sem 3-4: 3x5. Sem 5-6: 3x6-8. Sem 7+: 3x8-10. Según protocolo FIFA 11+.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- PRV-002: Copenhagen Adductors
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Copenhagen Adductors', 'PRV-002', v_cat_prv, v_org_id,
        10, 1, 6, 0,
        'Ejercicio de fortalecimiento de aductores en posición lateral. '
        'El compañero o un banco sujeta la pierna superior mientras la inferior realiza aducción isométrica/concéntrica. '
        'Evidencia fuerte para prevención de lesiones inguinales en futbolistas (protocolo Copenhagen).',
        1, 'baja',
        true, ARRAY['aductores','core'],
        ARRAY['banco','compañero'],
        'isometrica', 'tren_inferior', 'fuerza_maxima',
        '{"series":3,"repeticiones":"8/lado","descanso_seg":90}',
        'Nivel 1: isométrico 3x15s. Nivel 2: 3x8 concéntrico corto. Nivel 3: 3x8 ROM completo.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- PRV-003: FIFA 11+ Nivel 2
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'FIFA 11+ Nivel 2 (Circuito Completo)', 'PRV-003', v_cat_prv, v_org_id,
        15, 2, 22, 0,
        'Protocolo completo FIFA 11+ Nivel 2: calentamiento de carrera + 6 ejercicios de fuerza/equilibrio/pliometría + '
        'ejercicios de carrera final. Incluye: sentadillas sobre una pierna, nórdicos, equilibrio, saltos laterales, '
        'planchas y carrera con cambios de dirección. Programa validado por FIFA con reducción de lesiones del 30-50%.',
        1, 'media',
        true, ARRAY['cuádriceps','isquiotibiales','core','glúteos','gemelos'],
        ARRAY['conos','colchoneta'],
        'pliometrica', 'full_body', 'activacion',
        '{"series":1,"repeticiones":"circuito completo","descanso_seg":0}',
        'Nivel 1 → Nivel 2 → Nivel 3 según las 3 dificultades de cada ejercicio del FIFA 11+.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- PRV-004: Equilibrio Propioceptivo en Bosu
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Equilibrio Propioceptivo en Bosu', 'PRV-004', v_cat_prv, v_org_id,
        10, 1, 6, 0,
        'Trabajo de propiocepción y estabilidad de tobillo/rodilla en superficie inestable (Bosu). '
        'Apoyo monopodal con ojos abiertos → ojos cerrados → con perturbaciones externas. '
        'Fundamental para prevención de esguinces de tobillo y estabilidad de rodilla.',
        1, 'baja',
        true, ARRAY['gemelos','core','glúteos'],
        ARRAY['bosu','colchoneta'],
        'isometrica', 'tren_inferior', 'activacion',
        '{"series":3,"repeticiones":"30s/pierna","descanso_seg":60}',
        'Fase 1: bipodal sobre bosu. Fase 2: monopodal ojos abiertos. Fase 3: monopodal ojos cerrados. Fase 4: con pases de balón.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- MOV: MOVILIDAD / FLEXIBILIDAD (5 tareas)
    -- ========================================================================

    -- MOV-001: Movilidad de Cadera 90/90
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Movilidad de Cadera 90/90', 'MOV-001', v_cat_mov, v_org_id,
        10, 1, 22, 0,
        'Ejercicio de movilidad articular de cadera en posición 90/90. '
        'Sentado en el suelo, ambas piernas a 90 grados. Rotaciones internas y externas alternadas. '
        'Mejora rango de movimiento de cadera, esencial para sprints, cambios de dirección y disparos.',
        1, 'baja',
        true, ARRAY['cadera','glúteos','aductores'],
        ARRAY['colchoneta'],
        NULL, 'tren_inferior', 'movilidad',
        '{"series":3,"repeticiones":"10/lado","descanso_seg":30}',
        'Progresar de pasivo a activo. Añadir carga ligera con disco (2-5kg) en fases avanzadas.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- MOV-002: Movilidad Torácica con Foam Roller
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Movilidad Torácica con Foam Roller', 'MOV-002', v_cat_mov, v_org_id,
        8, 1, 22, 0,
        'Extensión torácica sobre foam roller. Posicionar el roller perpendicular a la columna a nivel medio-dorsal. '
        'Manos detrás de la cabeza, extensión controlada sobre el roller. '
        'Rotaciones torácicas en cuadrupedia con mano detrás de la cabeza. Mejora la postura y el rango de movimiento del tronco.',
        1, 'baja',
        true, ARRAY['dorsal','core','deltoides'],
        ARRAY['foam roller','colchoneta'],
        NULL, 'tren_superior', 'movilidad',
        '{"series":2,"repeticiones":"12","descanso_seg":30}',
        'Comenzar con extensiones simples. Añadir rotaciones. Progresar a movilidad con banda elástica.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- MOV-003: Estiramiento Dinámico Pre-Entrenamiento
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Estiramiento Dinámico Pre-Entrenamiento', 'MOV-003', v_cat_mov, v_org_id,
        8, 2, 22, 0,
        'Circuito de estiramientos dinámicos para calentamiento: '
        '1) Zancadas con rotación de tronco, 2) Inchworms, 3) Balanceo de pierna frontal/lateral, '
        '4) Sentadilla profunda con apertura, 5) Rodillas al pecho caminando, '
        '6) Patada de glúteo + apertura de cadera. En columnas por el campo.',
        1, 'baja',
        true, ARRAY['isquiotibiales','cuádriceps','cadera','core','gemelos'],
        ARRAY['conos'],
        NULL, 'full_body', 'activacion',
        '{"series":1,"repeticiones":"circuito 8 min","descanso_seg":0}',
        'Usar como rutina estándar de pre-entrenamiento. Adaptar intensidad según Match Day.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- MOV-004: Yoga para Futbolistas
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Yoga para Futbolistas (Flujo de Movilidad)', 'MOV-004', v_cat_mov, v_org_id,
        15, 1, 22, 0,
        'Flujo de yoga adaptado para futbolistas centrado en caderas, isquiotibiales y tobillos. '
        'Secuencia: Perro boca abajo → Guerrero I → Guerrero II → Triángulo → Paloma → '
        'Lagarto → Medio splits. 30-45 seg por posición. Enfoque en respiración diafragmática.',
        1, 'baja',
        true, ARRAY['isquiotibiales','cadera','gemelos','core','cuádriceps'],
        ARRAY['colchoneta'],
        NULL, 'full_body', 'movilidad',
        '{"series":1,"repeticiones":"flujo 15 min","descanso_seg":0}',
        'Ideal para MD+1 o MD-1. Puede usarse como vuelta a calma en cualquier sesión.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- MOV-005: Liberación Miofascial (Foam Rolling)
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Liberación Miofascial (Foam Rolling)', 'MOV-005', v_cat_mov, v_org_id,
        10, 1, 22, 0,
        'Protocolo de liberación miofascial con foam roller. Zonas a trabajar: '
        '1) Cuádriceps (2 min), 2) Isquiotibiales (2 min), 3) Glúteos/piriforme (1 min/lado), '
        '4) Banda iliotibial (1 min/lado), 5) Gemelos (1 min). '
        'Rodar lento, detenerse en puntos de tensión 20-30 seg.',
        1, 'baja',
        true, ARRAY['cuádriceps','isquiotibiales','glúteos','gemelos'],
        ARRAY['foam roller','pelota de lacrosse'],
        NULL, 'full_body', 'recuperacion',
        '{"series":1,"repeticiones":"10 min full body","descanso_seg":0}',
        'Usar pre-entrenamiento para mejorar ROM o post-entrenamiento para recuperación.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- RCF: RECUPERACIÓN FÍSICA (3 tareas)
    -- ========================================================================

    -- RCF-001: Circuito de Recuperación Activa Post-Partido
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Circuito de Recuperación Activa Post-Partido', 'RCF-001', v_cat_rcf, v_org_id,
        30, 1, 22, 0,
        'Protocolo de recuperación activa para MD+1: '
        '1) Bicicleta estática 10 min a 60% FC máx (regenerativa), '
        '2) Foam rolling completo 10 min (cuádriceps, isquios, glúteos, gemelos), '
        '3) Estiramientos estáticos suaves 10 min (30 seg por grupo muscular). '
        'Objetivo: promover flujo sanguíneo sin generar estrés mecánico adicional.',
        1, 'baja',
        true, ARRAY['cuádriceps','isquiotibiales','glúteos','gemelos','core'],
        ARRAY['bicicleta estática','foam roller','colchoneta'],
        NULL, 'full_body', 'recuperacion',
        '{"series":1,"repeticiones":"circuito 30 min","descanso_seg":0}',
        'Obligatorio en MD+1 para todos los jugadores que participaron >45 min. Adaptar para suplentes.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- RCF-002: Baño de Contraste
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Baño de Contraste (Protocolo Frío/Calor)', 'RCF-002', v_cat_rcf, v_org_id,
        20, 1, 6, 0,
        'Protocolo de hidroterapia de contraste para recuperación muscular. '
        '3 ciclos alternando: 3 min agua fría (10-12°C) + 3 min agua caliente (38-40°C). '
        'Finalizar SIEMPRE en frío. Mejora el flujo sanguíneo y reduce inflamación y DOMS.',
        1, 'baja',
        true, ARRAY['cuádriceps','isquiotibiales','gemelos'],
        ARRAY['bañera fría','bañera caliente'],
        NULL, 'full_body', 'recuperacion',
        '{"series":3,"repeticiones":"3 min frío + 3 min calor","descanso_seg":0}',
        'Usar en MD+1 o tras partidos de alta carga. No usar si hay lesión muscular aguda.',
        true, true
    ) ON CONFLICT DO NOTHING;

    -- RCF-003: Pool Recovery Session
    INSERT INTO tareas (
        titulo, codigo, categoria_id, organizacion_id,
        duracion_total, num_jugadores_min, num_jugadores_max, num_porteros,
        descripcion, nivel_cognitivo, densidad,
        es_complementaria, grupo_muscular, equipamiento,
        tipo_contraccion, zona_cuerpo, objetivo_gym,
        series_repeticiones, protocolo_progresion,
        es_publica, es_plantilla
    ) VALUES (
        'Pool Recovery Session (Recuperación en Piscina)', 'RCF-003', v_cat_rcf, v_org_id,
        20, 1, 12, 0,
        'Sesión de recuperación activa en piscina (profundidad cintura-pecho). '
        'Circuito: 1) Caminar/trotar en agua 5 min, 2) Ejercicios de movilidad articular 5 min, '
        '3) Patadas suaves con tabla 5 min, 4) Estiramientos en agua 5 min. '
        'La flotabilidad reduce impacto articular. Ideal para jugadores con sobrecarga.',
        1, 'baja',
        true, ARRAY['cuádriceps','isquiotibiales','core','gemelos'],
        ARRAY['piscina','tabla de natación'],
        NULL, 'full_body', 'recuperacion',
        '{"series":1,"repeticiones":"circuito 20 min","descanso_seg":0}',
        'Ideal para MD+1 como alternativa a recuperación en gimnasio. Especialmente útil tras partidos congestionados.',
        true, true
    ) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Seed 004: 17 tareas de gimnasio/preparación física insertadas correctamente.';
END $$;
