import { api } from './client'

// ---- Types ----

export interface ClubDashboard {
  total_jugadores: number
  total_staff: number
  sesiones_mes: number
  tareas_mes: number
  partidos_temporada: number
  lesiones_activas: number
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
  total_sesiones: number
  total_tareas: number
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
  ultimo_acceso?: string
  usuarios_equipos?: Array<{
    equipo_id: string
    rol_en_equipo: string
    equipos?: { id: string; nombre: string }
  }>
}

export interface ClubTarea {
  id: string
  titulo: string
  descripcion?: string
  fase_juego?: string
  principio_tactico?: string
  duracion_total?: number
  num_jugadores_min?: number
  num_jugadores_max?: number
  objetivo_fisico?: string
  nivel_cognitivo?: number
  match_days_recomendados?: string[]
  created_at: string
  equipo_id: string
  creado_por?: string
  grafico_url?: string
  categorias_tarea?: { codigo: string; nombre: string; color?: string }
}

export interface ClubSesion {
  id: string
  titulo: string
  fecha: string
  match_day?: string
  duracion_total?: number
  equipo_id: string
  creado_por?: string
  estado?: string
  objetivo_principal?: string
  fase_juego_principal?: string
  principio_tactico_principal?: string
  rival?: string
  competicion?: string
}

export interface CategoriaTarea {
  id: string
  codigo: string
  nombre: string
  nombre_corto?: string
  color?: string
  naturaleza?: string
  orden: number
}

export interface TeamAnalytics {
  equipo_id: string
  equipo_nombre: string
  sesiones: number
  tareas: number
}

export interface CoachActivity {
  id: string
  nombre: string
  rol: string
  sesiones_creadas: number
  last_login?: string
}

export interface ClubAnalytics {
  per_team: TeamAnalytics[]
  coach_activity: CoachActivity[]
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

// Detalle de equipo — GET /club/equipos/{id} devuelve EquipoDetalleResponse
// (backend/app/models/usuario.py), que NO es un superset de ClubEquipo: le
// faltan num_jugadores/total_sesiones/total_tareas y en cambio trae los
// campos crudos de EquipoBase/EquipoResponse (num_jugadores_plantilla,
// sistema_juego, config, num_sesiones, num_tareas, etc.).
export interface EquipoDetalle {
  id: string
  organizacion_id: string
  nombre: string
  categoria?: string
  temporada?: string
  num_jugadores_plantilla: number
  sistema_juego: string
  config: Record<string, unknown>
  activo: boolean
  temporada_anterior_id?: string
  created_at: string
  updated_at: string
  num_sesiones?: number
  num_tareas?: number
  num_staff: number
  num_partidos: number
  num_lesiones_activas: number
}

// Fila de staff de un equipo — GET /club/equipos/{id}/staff devuelve las
// filas de usuarios_equipos con el usuario anidado bajo la clave `usuarios`
// (no `usuario`), distinto del shape de ClubMiembro (que es la vista de
// miembros a nivel organizacion en GET /club/miembros).
export interface EquipoStaffMember {
  id: string
  usuario_id: string
  equipo_id: string
  rol_en_equipo: string
  created_at: string
  usuarios?: {
    id: string
    email: string
    nombre: string
    apellidos?: string
    rol: string
    activo: boolean
  }
}

export interface ClubJugador {
  id: string
  nombre: string
  apellidos: string
  foto_url?: string
  dorsal?: number
  posicion_principal: string
  fecha_nacimiento?: string
  nivel_tecnico?: number
  nivel_tactico?: number
  nivel_fisico?: number
  nivel_mental?: number
  estado: string
  tipo_jugador: string
  equipo_id: string
  equipos?: { id: string; nombre: string; categoria?: string }
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

  updateEquipo: (id: string, data: { nombre?: string; categoria?: string; temporada?: string; sistema_juego?: string }) =>
    api.patch<ClubEquipo>(`/club/equipos/${id}`, data),

  getEquipoDetalle: (equipoId: string) =>
    api.get<EquipoDetalle>(`/club/equipos/${equipoId}`),

  getEquipoStaff: (equipoId: string) =>
    api.get<EquipoStaffMember[]>(`/club/equipos/${equipoId}/staff`),

  unlinkStaffFromEquipo: (equipoId: string, userId: string) =>
    api.delete(`/club/equipos/${equipoId}/staff/${userId}`),

  // Jugadores (full org roster)
  getClubJugadores: (params?: { equipo_id?: string; search?: string; page?: number; limit?: number }) =>
    api.get<{ data: ClubJugador[]; total: number }>('/club/jugadores', { params }),

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

  // Biblioteca de tareas (full org library)
  getTareas: (params?: {
    equipo_id?: string; categoria?: string; fase_juego?: string;
    creado_por?: string; search?: string; page?: number; limit?: number
  }) =>
    api.get<{ data: ClubTarea[]; total: number }>('/club/tareas', { params }),

  getCategorias: () =>
    api.get<CategoriaTarea[]>('/club/categorias'),

  // Sesiones (full org library)
  getSesiones: (params?: {
    equipo_id?: string; match_day?: string; estado?: string;
    fase_juego?: string; search?: string; page?: number; limit?: number
  }) =>
    api.get<{ data: ClubSesion[]; total: number }>('/club/sesiones', { params }),

  // Analytics
  getAnalytics: (meses?: number) =>
    api.get<ClubAnalytics>('/club/analytics', { params: meses ? { meses } : undefined }),

  getActividad: (limit?: number) =>
    api.get<AuditEntry[]>('/club/actividad', { params: limit ? { limit } : undefined }),

  getAudit: (params?: { page?: number; limit?: number; accion?: string; severidad?: string }) =>
    api.get<{ data: AuditEntry[]; total: number }>('/club/audit', { params }),
}
