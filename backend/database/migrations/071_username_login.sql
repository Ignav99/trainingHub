-- Migration 071: columna username para cuentas sin email real
-- (superadmin de plataforma, administrador_club, coordinador_club).
-- El staff de equipo sigue usando email real (flujo de invitacion existente).

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username VARCHAR(50);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_username_unique ON usuarios (LOWER(username)) WHERE username IS NOT NULL;
