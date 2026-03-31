export interface Overview {
  total_organizaciones: number
  total_usuarios: number
  total_equipos: number
  suscripciones_activas: number
  suscripciones_trial: number
}

export interface Plan {
  id: string
  codigo: string
  nombre: string
  precio_mensual: number
  max_equipos?: number
  max_usuarios_por_equipo?: number
  max_jugadores_por_equipo?: number
}

export interface Suscripcion {
  id: string
  estado: string
  plan_id: string
  trial_fin?: string
  planes?: Plan
}

export interface Org {
  id: string
  nombre: string
  created_at: string
  suscripcion?: Suscripcion
  num_miembros: number
  num_equipos: number
}

export interface Limites {
  max_equipos: number
  max_usuarios_por_equipo: number
  max_jugadores_por_equipo: number
  max_storage_mb: number
  max_ai_calls_month: number
  equipos_usados: number
  uso_storage_mb: number
  uso_ai_calls_month: number
}

export interface OrgMember {
  id: string
  email: string
  nombre: string
  apellidos?: string
  rol: string
  created_at: string
  usuarios_equipos?: Array<{
    equipo_id: string
    rol_en_equipo: string
    equipos?: { nombre: string }
  }>
}

export interface OrgTeam {
  id: string
  nombre: string
  categoria?: string
  activo: boolean
  num_miembros?: number
}

export interface OrgInvite {
  id: string
  email: string
  nombre?: string
  rol_en_equipo: string
  rol_organizacion?: string
  token: string
  expira_en: string
}

export interface OrgDetail {
  organizacion: { id: string; nombre: string }
  miembros: OrgMember[]
  equipos: OrgTeam[]
  suscripcion?: any
  invitaciones_pendientes: OrgInvite[]
  limites?: Limites
}

export interface UserRecord {
  id: string
  email: string
  nombre: string
  apellidos?: string
  rol: string
  activo: boolean
  created_at: string
  organizaciones?: { nombre: string }
}

export const ROLE_GROUPS = [
  {
    label: 'Cuerpo Tecnico',
    roles: [
      { value: 'entrenador_principal', label: 'Entrenador Principal' },
      { value: 'segundo_entrenador', label: '2do Entrenador' },
      { value: 'preparador_fisico', label: 'Preparador Fisico' },
      { value: 'entrenador_porteros', label: 'Entr. Porteros' },
      { value: 'analista', label: 'Analista' },
      { value: 'fisio', label: 'Fisioterapeuta' },
      { value: 'delegado', label: 'Delegado' },
    ],
  },
  {
    label: 'Jugadores',
    roles: [{ value: 'jugador', label: 'Jugador' }],
  },
  {
    label: 'Directiva',
    roles: [
      { value: 'presidente', label: 'Presidente' },
      { value: 'director_deportivo', label: 'Director Deportivo' },
      { value: 'secretario', label: 'Secretario' },
    ],
  },
]

export const ALL_ROLES = ROLE_GROUPS.flatMap(g => g.roles)
export const DIRECTIVA_ROLES = ['presidente', 'director_deportivo', 'secretario']
