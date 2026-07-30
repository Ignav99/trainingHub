/**
 * Roles que gestionan el club completo (todos los equipos, staff e invitaciones)
 * desde /gestion, en vez del dashboard operativo de un equipo (/).
 *
 * Unica fuente de verdad: antes esta lista estaba duplicada (y desincronizada)
 * en login/page.tsx, (dashboard)/layout.tsx y gestion/page.tsx, lo que provocaba
 * que roles como 'admin' (legacy) quedaran fuera del redirect a /gestion.
 */
export const CLUB_ADMIN_ROLES = [
  'administrador_club',
  'coordinador_club',
  'presidente',
  'director_deportivo',
  'secretario',
  'admin',
] as const

export function isClubAdminRole(rol: string | undefined | null): boolean {
  return !!rol && (CLUB_ADMIN_ROLES as readonly string[]).includes(rol)
}

export function isSuperadminRole(rol: string | undefined | null): boolean {
  return rol === 'superadmin_plataforma'
}
