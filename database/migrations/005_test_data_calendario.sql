-- ============================================
-- TRAININGHUB PRO - DATOS DE PRUEBA CALENDARIO
-- Migración 005: Datos de test para visualizar el calendario
-- ============================================
-- NOTA: Este script asume que ya existe una organización y un equipo.
-- Ajustar los IDs si es necesario.

-- ============================================
-- 1. CREAR RIVALES
-- ============================================

-- Obtener la organización del usuario (ajustar según sea necesario)
DO $$
DECLARE
    v_org_id UUID;
    v_equipo_id UUID;
    v_rival_1 UUID;
    v_rival_2 UUID;
    v_rival_3 UUID;
    v_partido_1 UUID;
    v_partido_2 UUID;
    v_partido_3 UUID;
    v_sesion_id UUID;
BEGIN
    -- Obtener la primera organización
    SELECT id INTO v_org_id FROM organizaciones LIMIT 1;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'No hay organizaciones. Primero crea una organización.';
    END IF;

    -- Obtener el primer equipo de esa organización
    SELECT id INTO v_equipo_id FROM equipos WHERE organizacion_id = v_org_id LIMIT 1;

    IF v_equipo_id IS NULL THEN
        RAISE EXCEPTION 'No hay equipos. Primero crea un equipo.';
    END IF;

    RAISE NOTICE 'Usando organización: % y equipo: %', v_org_id, v_equipo_id;

    -- ============================================
    -- CREAR RIVALES
    -- ============================================

    INSERT INTO rivales (id, organizacion_id, nombre, nombre_corto, estadio, ciudad, notas)
    VALUES
        (gen_random_uuid(), v_org_id, 'CD Atlético Madrid B', 'ATM B', 'Ciudad Deportiva Wanda', 'Madrid', 'Equipo filial, buen juego combinativo')
    RETURNING id INTO v_rival_1;

    INSERT INTO rivales (id, organizacion_id, nombre, nombre_corto, estadio, ciudad, notas)
    VALUES
        (gen_random_uuid(), v_org_id, 'RCD Espanyol B', 'ESP B', 'Ciudad Deportiva Dani Jarque', 'Barcelona', 'Presión alta, transiciones rápidas')
    RETURNING id INTO v_rival_2;

    INSERT INTO rivales (id, organizacion_id, nombre, nombre_corto, estadio, ciudad, notas)
    VALUES
        (gen_random_uuid(), v_org_id, 'Valencia CF Mestalla', 'VCF M', 'Ciudad Deportiva de Paterna', 'Valencia', 'Bloque bajo, contraataque')
    RETURNING id INTO v_rival_3;

    RAISE NOTICE 'Rivales creados: %, %, %', v_rival_1, v_rival_2, v_rival_3;

    -- ============================================
    -- CREAR PARTIDOS (Diciembre 2025 - Enero 2026)
    -- ============================================

    -- Partido 1: Domingo 29 Diciembre 2025 (Liga, Local)
    INSERT INTO partidos (id, equipo_id, rival_id, fecha, hora, localia, competicion, jornada, notas_pre)
    VALUES
        (gen_random_uuid(), v_equipo_id, v_rival_1, '2025-12-29', '12:00', 'local', 'liga', 15,
         'Partido importante antes del parón navideño. Rival con buen juego de posición.')
    RETURNING id INTO v_partido_1;

    -- Partido 2: Domingo 5 Enero 2026 (Liga, Visitante)
    INSERT INTO partidos (id, equipo_id, rival_id, fecha, hora, localia, competicion, jornada, notas_pre)
    VALUES
        (gen_random_uuid(), v_equipo_id, v_rival_2, '2026-01-05', '17:00', 'visitante', 'liga', 16,
         'Desplazamiento largo. Trabajar transiciones defensivas.')
    RETURNING id INTO v_partido_2;

    -- Partido 3: Domingo 12 Enero 2026 (Copa, Local)
    INSERT INTO partidos (id, equipo_id, rival_id, fecha, hora, localia, competicion, jornada)
    VALUES
        (gen_random_uuid(), v_equipo_id, v_rival_3, '2026-01-12', '18:30', 'local', 'copa', NULL)
    RETURNING id INTO v_partido_3;

    RAISE NOTICE 'Partidos creados: %, %, %', v_partido_1, v_partido_2, v_partido_3;

    -- ============================================
    -- CREAR SESIONES - SEMANA PARTIDO 29 DIC
    -- ============================================

    -- MD+1 Lunes 23 Dic (recuperación del partido anterior ficticio)
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'Recuperación activa', '2025-12-23', 'MD+1',
            'Regeneración muscular y activación suave post-partido', 45, 'planificada',
            'ataque_organizado', 'muy_baja');

    -- MD-4 Miércoles 25 Dic (Navidad - Descanso)
    -- No hay entrenamiento

    -- MD-3 Jueves 26 Dic
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'Resistencia + Posesión', '2025-12-26', 'MD-3',
            'Trabajo de resistencia con espacios grandes y posesiones largas', 90, 'planificada',
            'ataque_organizado', 'alta');

    -- MD-2 Viernes 27 Dic
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'Velocidad y Automatismos', '2025-12-27', 'MD-2',
            'Trabajo de velocidad con evoluciones y acciones de finalización', 75, 'planificada',
            'transicion_defensa_ataque', 'media');

    -- MD-1 Sábado 28 Dic
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'Activación + ABP', '2025-12-28', 'MD-1',
            'Activación pre-partido con rondos y balón parado ofensivo', 60, 'planificada',
            'ataque_organizado', 'baja');

    -- ============================================
    -- CREAR SESIONES - SEMANA PARTIDO 5 ENE
    -- ============================================

    -- MD+1 Lunes 30 Dic
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'Regeneración post-partido', '2025-12-30', 'MD+1',
            'Recuperación activa, estiramientos y video análisis', 45, 'planificada',
            NULL, 'muy_baja');

    -- MD+2 Martes 31 Dic (Fin de año - opcional)
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'Sesión técnica ligera', '2025-12-31', 'MD+2',
            'Trabajo técnico suave antes de Nochevieja', 60, 'planificada',
            'ataque_organizado', 'baja');

    -- MD-4 Miércoles 1 Ene - FESTIVO
    -- No hay entrenamiento (Año Nuevo)

    -- MD-3 Jueves 2 Ene
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'Fuerza y Tensión', '2026-01-02', 'MD-3',
            'Trabajo de fuerza con espacios reducidos y duelos', 90, 'planificada',
            'defensa_organizada', 'alta');

    -- MD-2 Viernes 3 Ene
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'Transiciones y Contraataque', '2026-01-03', 'MD-2',
            'Trabajo de transiciones rápidas, contraataque', 75, 'planificada',
            'transicion_defensa_ataque', 'media');

    -- MD-1 Sábado 4 Ene
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'Activación + Córners', '2026-01-04', 'MD-1',
            'Activación pre-partido y trabajo de córners defensivos', 55, 'planificada',
            'defensa_organizada', 'baja');

    -- ============================================
    -- CREAR SESIONES - SEMANA PARTIDO 12 ENE
    -- ============================================

    -- MD+1 Lunes 6 Ene (Reyes - opcional)
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'Regeneración Reyes', '2026-01-06', 'MD+1',
            'Sesión ligera de recuperación', 40, 'planificada',
            NULL, 'muy_baja');

    -- MD-4 Martes 7 Ene
    -- (saltamos porque MD+1 fue el 6)

    -- MD-4 Miércoles 8 Ene
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'SSG Intensivo', '2026-01-08', 'MD-4',
            'Espacios reducidos, duelos 1v1 y 2v2 con alta intensidad', 85, 'planificada',
            'ataque_organizado', 'alta');

    -- MD-3 Jueves 9 Ene
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'Partido Condicionado', '2026-01-09', 'MD-3',
            'Simulación de partido con condiciones tácticas específicas', 90, 'planificada',
            'ataque_organizado', 'alta');

    -- MD-2 Viernes 10 Ene
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'Velocidad + Finalización', '2026-01-10', 'MD-2',
            'Trabajo de velocidad con evoluciones hacia portería', 70, 'planificada',
            'transicion_defensa_ataque', 'media');

    -- MD-1 Sábado 11 Ene
    INSERT INTO sesiones (equipo_id, titulo, fecha, match_day, objetivo_principal, duracion_total, estado, fase_juego_principal, intensidad_objetivo)
    VALUES (v_equipo_id, 'Activación + Faltas', '2026-01-11', 'MD-1',
            'Activación y ensayo de faltas directas', 50, 'planificada',
            'ataque_organizado', 'baja');

    RAISE NOTICE '¡Datos de prueba creados exitosamente!';
    RAISE NOTICE 'Se han creado 3 rivales, 3 partidos y 14 sesiones de entrenamiento.';

END $$;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- SELECT COUNT(*) as rivales FROM rivales;
-- SELECT COUNT(*) as partidos FROM partidos;
-- SELECT COUNT(*) as sesiones FROM sesiones;
-- SELECT fecha, match_day, titulo FROM sesiones ORDER BY fecha;
