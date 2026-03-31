import { api } from './client'

// ---- Types ----

export interface ClubDashboard {
  total_jugadores: number
  total_staff: number
  sesiones_mes: number
  tareas_mes: number
  partidos_temporada: number
  lesiones_activas: number
  ai_calls_mes: number
  storage_mb: number
}

export interface ClubEquipo {
  id: string
  nombre: string
  categoria?: string
  temporada?: string
  activo: boolean
  created_at: string
  num_jugadores: number
  num_staff: number
  sesiones_mes: number
  tareas_mes: number
  num_partidos: number
}

export interface ClubMiembro {
  id: string
  email: string
  nombre: string
  apellidos?: string
  rol: string
  activo: boolean
  created_at: string
  last_login?: string
  usuarios_equipos?: Array<{
    equipo_id: string
    rol_en_equipo: string
    equipos?: { id: string; nombre: string }
  }>
}

export interface ClubTarea {
  id: string
  nombre: string
  categoria: string
  objetivo?: string
  created_at: string
  equipo_id: string
}

export interface ClubSesion {
  id: string
  titulo: string
  fecha: string
  fase?: string
  duracion_minutos?: number
  match_day?: string
  equipo_id: string
}

export interface ClubAnalytics {
  per_team: Array<{
    equipo_id: string
    equipo_nombre: string
    sesiones: number
    tareas: number
  }>
  coach_activity: Array<{
    id: string
    nombre: string
    rol: string
    sesiones_creadas: number
    last_login?: string
  }>
  periodo_meses: number
}

export interface AuditEntry {
  id: string
  usuario_id: string
  accion: string
  entidad_tipo: string
  entidad_id?: string
  severidad: string
  created_at: string
  datos_nuevos?: Record<string, unknown>
  datos_anteriores?: Record<string, unknown>
}

export interface BatchInviteResult {
  created: number
  invitaciones: Array<{
    nombre: string
    token: string
    link: string
    id: string
  }>
}

// ---- API ----

export const clubAdminApi = {
  // Dashboard
  getDashboard: () =>
    api.get<ClubDashboard>('/club/dashboard'),

  // Equipos
  getEquipos: () =>
    api.get<ClubEquipo[]>('/club/equipos'),

  createEquipo: (data: { nombre: string; categoria?: string; temporada?: string }) =>
    api.post<ClubEquipo>('/club/equipos', data),

  updateEquipo: (id: string, data: { nombre?: string; categoria?: string; temporada?: string }) =>
    api.patch<ClubEquipo>(`/club/equipos/${id}`, data),

  // Miembros
  getMiembros: () =>
    api.get<ClubMiembro[]>('/club/miembros'),

  changeMemberRole: (userId: string, rol: string) =>
    api.patch<{ ok: boolean; old_rol: string; new_rol: string }>(`/club/miembros/${userId}/rol`, { rol }),

  deactivateMember: (userId: string) =>
    api.delete(`/club/miembros/${userId}`),

  // Invitaciones
  inviteStaff: (data: { email: string; nombre?: string; equipo_id?: string; rol_en_equipo?: string; rol_organizacion?: string }) =>
    api.post<{ invitacion: unknown; token: string; link: string }>('/club/invitaciones', data),

  batchInvitePlayers: (data: { equipo_id: string; nombres: string[] }) =>
    api.post<BatchInviteResult>('/club/invitaciones/batch', data),

  revokeInvite: (id: string) =>
    api.delete(`/club/invitaciones/${id}`),

  // Cross-team views
  getTareas: (params?: { equipo_id?: string; page?: number; limit?: number }) =>
    api.get<{ data: ClubTarea[]; total: number }>('/club/tareas', { params }),

  getSesiones: (params?: { equipo_id?: string; page?: number; limit?: number }) =>
    api.get<{ data: ClubSesion[]; total: number }>('/club/sesiones', { params }),

  // Analytics
  getAnalytics: (meses?: number) =>
    api.get<ClubAnalytics>('/club/analytics', { params: meses ? { meses } : undefined }),

  getActividad: (limit?: number) =>
    api.get<AuditEntry[]>('/club/actividad', { params: limit ? { limit } : undefined }),

  getAudit: (params?: { page?: number; limit?: number; accion?: string; severidad?: string }) =>
    api.get<{ data: AuditEntry[]; total: number }>('/club/audit', { params }),
}
