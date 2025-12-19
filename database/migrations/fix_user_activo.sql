-- Fix user 'activo' status migration
-- Run this in Supabase SQL Editor to fix any users with activo = false or null

-- First, check current user status
SELECT id, email, nombre, activo, organizacion_id, created_at
FROM usuarios
ORDER BY created_at DESC;

-- Fix: Set activo = true for all users where it's null or false
UPDATE usuarios
SET activo = true
WHERE activo IS NULL OR activo = false;

-- Verify the fix
SELECT id, email, nombre, activo, organizacion_id
FROM usuarios
WHERE activo = true;
