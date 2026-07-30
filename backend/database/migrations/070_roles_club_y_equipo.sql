-- Migration 070: Roles de club (administrador_club, coordinador_club) y
-- nuevos roles de equipo (fisioterapeuta ya cubierto por 'fisio', nutricionista,
-- delegado_equipo). Corrige roles fantasma que no pasaban el CHECK constraint.

-- ============================================================
-- 1. usuarios.rol - agregar roles de club nuevos
-- ============================================================

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN (
    'superadmin_plataforma',
    'admin',
    'administrador_club', 'coordinador_club',
    'presidente', 'director_deportivo', 'secretario',
    'entrenador_principal', 'segundo_entrenador', 'preparador_fisico',
    'entrenador_porteros', 'analista', 'fisio', 'nutricionista', 'delegado', 'delegado_equipo',
    'tecnico_principal', 'tecnico_asistente', 'visualizador',
    'jugador', 'tutor'
));

-- ============================================================
-- 2. usuarios_equipos.rol_en_equipo - agregar nutricionista y delegado_equipo
-- ============================================================

ALTER TABLE usuarios_equipos DROP CONSTRAINT IF EXISTS usuarios_equipos_rol_en_equipo_check;
ALTER TABLE usuarios_equipos ADD CONSTRAINT usuarios_equipos_rol_en_equipo_check CHECK (
    rol_en_equipo IN (
        'entrenador_principal', 'segundo_entrenador', 'preparador_fisico',
        'entrenador_porteros', 'analista', 'fisio', 'nutricionista',
        'delegado', 'delegado_equipo', 'jugador'
    )
);
