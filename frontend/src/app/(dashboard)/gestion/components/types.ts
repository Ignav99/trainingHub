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

export interface CoachActivity {
  id: string
  nombre: string
  rol: string
  sesiones_creadas: number
  last_login?: string
}

export interface TeamAnalytics {
  equipo_id: string
  equipo_nombre: string
  sesiones: number
  tareas: number
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

export const CLUB_ROLES = [
  { value: 'presidente', label: 'Presidente' },
  { value: 'director_deportivo', label: 'Director Deportivo' },
  { value: 'secretario', label: 'Secretario' },
  { value: 'admin', label: 'Administrador' },
  { value: 'tecnico_principal', label: 'Entrenador Principal' },
  { value: 'segundo_entrenador', label: '2do Entrenador' },
  { value: 'preparador_fisico', label: 'Preparador Fisico' },
  { value: 'entrenador_porteros', label: 'Entr. Porteros' },
  { value: 'analista', label: 'Analista' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta' },
  { value: 'delegado', label: 'Delegado' },
  { value: 'nutricionista', label: 'Nutricionista' },
  { value: 'coordinador', label: 'Coordinador' },
]

export function formatRole(rol: string): string {
  return CLUB_ROLES.find(r => r.value === rol)?.label || rol.replace(/_/g, ' ')
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
