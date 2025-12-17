-- ============================================================================
-- TRAININGHUB PRO - SEED: RELACIÓN TAREAS-CONTENIDOS
-- ============================================================================
-- Ejecutar DESPUÉS de:
-- - 003_objetivos_contenidos.sql (migración)
-- - 001_tareas_profesionales.sql (seed tareas)
-- ============================================================================

-- ============================================================================
-- RONDO 4v2 (RND-001) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-001' AND c.codigo = 'TEC_PASE_CORTO'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-001' AND c.codigo = 'TEC_CONTROL'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-001' AND c.codigo = 'TAC_AO_MOVILIDAD'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-001' AND c.codigo = 'TAC_DO_PRESSING'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-001' AND c.codigo = 'PSI_CONCENTRACION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 5
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-001' AND c.codigo = 'PSI_TOMA_DECISION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 5
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-001' AND c.codigo = 'FIS_VELOCIDAD_REAC'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- RONDO POSICIONAL 4v4+3 (RND-002) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-002' AND c.codigo = 'TAC_AO_POSICIONAL'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-002' AND c.codigo = 'TAC_AO_SUPERIORIDAD'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-002' AND c.codigo = 'TAC_AO_TERCER_HOMBRE'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-002' AND c.codigo = 'TEC_PASE_CORTO'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-002' AND c.codigo = 'PSI_VISION_JUEGO'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 5
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-002' AND c.codigo = 'FIS_RESISTENCIA_AER'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- RONDO DIRECCIONAL 3v3+2 (RND-003) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-003' AND c.codigo = 'TAC_AO_PROFUNDIDAD'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-003' AND c.codigo = 'TAC_TDA_VERTICALIDAD'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-003' AND c.codigo = 'TEC_CONDUCCION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-003' AND c.codigo = 'FIS_POTENCIA_AER'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'RND-003' AND c.codigo = 'TAC_AO_CAMBIO_ORIENT'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SALIDA BALÓN 4+POR vs 3 (JDP-001) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'JDP-001' AND c.codigo = 'TAC_AO_SALIDA'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'JDP-001' AND c.codigo = 'TAC_AO_CONSTRUCCION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'JDP-001' AND c.codigo = 'TEC_PORTERO'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'JDP-001' AND c.codigo = 'PSI_GESTION_PRESION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'JDP-001' AND c.codigo = 'PSI_TOMA_DECISION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 5
FROM tareas t, contenidos c
WHERE t.codigo = 'JDP-001' AND c.codigo = 'TEC_PASE_CORTO'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- JUEGO POSICIONAL 6v4+POR (JDP-002) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'JDP-002' AND c.codigo = 'TAC_AO_POSICIONAL'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'JDP-002' AND c.codigo = 'TAC_AO_CREACION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'JDP-002' AND c.codigo = 'TAC_AO_SUPERIORIDAD'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'JDP-002' AND c.codigo = 'TEC_DESMARQUE'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'JDP-002' AND c.codigo = 'TAC_AO_FINALIZACION'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- POSESIÓN 5v5+5 (POS-001) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'POS-001' AND c.codigo = 'TAC_AO_CAMBIO_ORIENT'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'POS-001' AND c.codigo = 'TAC_AO_AMPLITUD'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'POS-001' AND c.codigo = 'TEC_PASE_LARGO'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'POS-001' AND c.codigo = 'FIS_RESISTENCIA_AER'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 5
FROM tareas t, contenidos c
WHERE t.codigo = 'POS-001' AND c.codigo = 'TAC_DO_BASCULACION'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- POSESIÓN 4v4+2 TRANSICIONES (POS-002) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'POS-002' AND c.codigo = 'TAC_TDA_ATAQUE_RAPIDO'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'POS-002' AND c.codigo = 'TAC_TAD_GEGENPRESSING'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'POS-002' AND c.codigo = 'FIS_RSA'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'POS-002' AND c.codigo = 'PSI_CONCENTRACION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'POS-002' AND c.codigo = 'TEC_PASE_CORTO'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- OLEADAS 3v2 (EVO-001) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'EVO-001' AND c.codigo = 'TAC_AO_FINALIZACION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'EVO-001' AND c.codigo = 'TEC_REMATE'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'EVO-001' AND c.codigo = 'TAC_AO_SUPERIORIDAD'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'EVO-001' AND c.codigo = 'FIS_VELOCIDAD_MAX'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'EVO-001' AND c.codigo = 'FIS_RSA'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'EVO-001' AND c.codigo = 'TEC_DESMARQUE'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- EVOLUCIÓN BANDA-CENTRO (EVO-002) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'EVO-002' AND c.codigo = 'TAC_AO_JUEGO_EXTERIOR'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'EVO-002' AND c.codigo = 'TEC_CENTRO'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'EVO-002' AND c.codigo = 'TEC_REMATE'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'EVO-002' AND c.codigo = 'TAC_AO_FINALIZACION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'EVO-002' AND c.codigo = 'FIS_COORDINACION'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ATAQUE vs DEFENSA 7v7 (AVD-001) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'AVD-001' AND c.codigo = 'TAC_AO_CREACION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'AVD-001' AND c.codigo = 'TAC_DO_MARCAJE'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'AVD-001' AND c.codigo = 'TAC_DO_COBERTURA'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'AVD-001' AND c.codigo = 'TAC_AO_MOVILIDAD'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'AVD-001' AND c.codigo = 'FIS_DUELOS'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PRESSING ALTO 6v5 (AVD-002) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'AVD-002' AND c.codigo = 'TAC_DO_PRESSING'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'AVD-002' AND c.codigo = 'TAC_DO_BLOQUE_ALTO'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'AVD-002' AND c.codigo = 'TAC_TDA_CONTRAATAQUE'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'AVD-002' AND c.codigo = 'FIS_RSA'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'AVD-002' AND c.codigo = 'PSI_AGRESIVIDAD'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'AVD-002' AND c.codigo = 'PSI_COHESION'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PARTIDO CONDICIONADO 8v8 (PCO-001) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'PCO-001' AND c.codigo = 'TAC_AO_JUEGO_EXTERIOR'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'PCO-001' AND c.codigo = 'TEC_CENTRO'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'PCO-001' AND c.codigo = 'TAC_AO_FINALIZACION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'PCO-001' AND c.codigo = 'FIS_RESISTENCIA_AER'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'PCO-001' AND c.codigo = 'TAC_AO_AMPLITUD'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SSG 4v4 (SSG-001) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'SSG-001' AND c.codigo = 'FIS_FUERZA_RES'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'SSG-001' AND c.codigo = 'FIS_DUELOS'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'SSG-001' AND c.codigo = 'TAC_TDA_CONTRAATAQUE'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'SSG-001' AND c.codigo = 'TAC_TAD_GEGENPRESSING'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'SSG-001' AND c.codigo = 'PSI_COMPETITIVIDAD'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'SSG-001' AND c.codigo = 'FIS_RSA'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CÓRNER OFENSIVO (ABP-001) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'ABP-001' AND c.codigo = 'TAC_ABP_CORNER_OF'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 8
FROM tareas t, contenidos c
WHERE t.codigo = 'ABP-001' AND c.codigo = 'TEC_CABEZA'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'ABP-001' AND c.codigo = 'TEC_REMATE'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'ABP-001' AND c.codigo = 'PSI_CONCENTRACION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 5
FROM tareas t, contenidos c
WHERE t.codigo = 'ABP-001' AND c.codigo = 'FIS_FUERZA_EXPL'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEFENSA FALTA LATERAL (ABP-002) - Contenidos
-- ============================================================================
INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 10
FROM tareas t, contenidos c
WHERE t.codigo = 'ABP-002' AND c.codigo = 'TAC_ABP_FALTA_DEF'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, true, 9
FROM tareas t, contenidos c
WHERE t.codigo = 'ABP-002' AND c.codigo = 'TAC_ABP_MIXTO'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 7
FROM tareas t, contenidos c
WHERE t.codigo = 'ABP-002' AND c.codigo = 'PSI_COMUNICACION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 6
FROM tareas t, contenidos c
WHERE t.codigo = 'ABP-002' AND c.codigo = 'PSI_CONCENTRACION'
ON CONFLICT DO NOTHING;

INSERT INTO tareas_contenidos (tarea_id, contenido_id, es_principal, relevancia)
SELECT t.id, c.id, false, 5
FROM tareas t, contenidos c
WHERE t.codigo = 'ABP-002' AND c.codigo = 'TEC_CABEZA'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FIN DEL SEED DE RELACIONES
-- ============================================================================
