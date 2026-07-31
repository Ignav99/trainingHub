export type {
  ClubDashboard,
  ClubEquipo,
  ClubMiembro,
  ClubTarea,
  ClubSesion,
  CategoriaTarea,
  TeamAnalytics,
  CoachActivity,
  AuditEntry,
  EquipoDetalle,
  EquipoStaffMember,
  ClubJugador,
} from '@/lib/api/clubAdmin'

export const CLUB_ROLES = [
  { value: 'administrador_club', label: 'Administrador del Club' },
  { value: 'coordinador_club', label: 'Coordinador del Club' },
  { value: 'presidente', label: 'Presidente' },
  { value: 'director_deportivo', label: 'Director Deportivo' },
  { value: 'secretario', label: 'Secretario' },
  { value: 'admin', label: 'Administrador' },
  { value: 'entrenador_principal', label: 'Entrenador Principal' },
  { value: 'tecnico_principal', label: 'Entrenador Principal (legacy)' },
  { value: 'segundo_entrenador', label: '2do Entrenador' },
  { value: 'preparador_fisico', label: 'Preparador Fisico' },
  { value: 'entrenador_porteros', label: 'Entr. Porteros' },
  { value: 'analista', label: 'Analista' },
  { value: 'fisio', label: 'Fisioterapeuta' },
  { value: 'delegado', label: 'Delegado de Campo' },
  { value: 'delegado_equipo', label: 'Delegado de Equipo' },
  { value: 'nutricionista', label: 'Nutricionista' },
]

// Valores permitidos por el CHECK constraint real de usuarios_equipos.rol_en_equipo
// (ver database: usuarios_equipos_rol_en_equipo_check). CLUB_ROLES mezcla roles de
// club (administrador_club, presidente, etc.) y un valor legacy invalido
// (tecnico_principal) que rompen ese constraint -- usar esta lista, no CLUB_ROLES,
// para cualquier selector de "rol en el equipo" al invitar/asignar staff a un equipo.
export const ROLES_EN_EQUIPO = [
  { value: 'entrenador_principal', label: 'Entrenador Principal' },
  { value: 'segundo_entrenador', label: '2do Entrenador' },
  { value: 'preparador_fisico', label: 'Preparador Fisico' },
  { value: 'entrenador_porteros', label: 'Entr. Porteros' },
  { value: 'analista', label: 'Analista' },
  { value: 'fisio', label: 'Fisioterapeuta' },
  { value: 'nutricionista', label: 'Nutricionista' },
  { value: 'delegado', label: 'Delegado de Campo' },
  { value: 'delegado_equipo', label: 'Delegado de Equipo' },
  { value: 'jugador', label: 'Jugador' },
]

export const FASES_JUEGO = [
  'ataque_organizado',
  'defensa_organizada',
  'transicion_ofensiva',
  'transicion_defensiva',
  'balon_parado_ofensivo',
  'balon_parado_defensivo',
]

export const MATCH_DAYS = ['MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD', 'MD+1', 'MD+2']

export const MATCH_DAY_COLORS: Record<string, { bg: string; text: string }> = {
  'MD-4': { bg: 'bg-sky-50', text: 'text-sky-700' },
  'MD-3': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'MD-2': { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  'MD-1': { bg: 'bg-violet-50', text: 'text-violet-700' },
  'MD': { bg: 'bg-red-50', text: 'text-red-700' },
  'MD+1': { bg: 'bg-amber-50', text: 'text-amber-700' },
  'MD+2': { bg: 'bg-green-50', text: 'text-green-700' },
}

export const ESTADOS_SESION = ['borrador', 'planificada', 'completada', 'cancelada']

export function formatRole(rol: string): string {
  return CLUB_ROLES.find(r => r.value === rol)?.label || rol.replace(/_/g, ' ')
}

export function formatFase(fase: string): string {
  return fase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
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
