import type { AsignacionRolTactico, FasePlanPartido, FaseRival, RivalSubfaseAtaque } from '@/types'

export type ContextoRoles =
  | 'creacion_progresion'
  | 'finalizacion_vigilancia'
  | 'transicion_ofensiva'
  | 'defensa_bloque'

export interface RolTacticoOption {
  value: string
  label: string
}

export const ROLES_CREACION_PROGRESION: RolTacticoOption[] = [
  { value: 'constructor', label: 'Constructor' },
  { value: 'constructor_lateral', label: 'Constructor lateral' },
  { value: 'base', label: 'Base' },
  { value: 'fijador_lateral', label: 'Fijador lateral' },
  { value: 'fijador_central', label: 'Fijador central' },
  { value: 'cuadrante', label: 'Cuadrante' },
  { value: 'portero_golpeo', label: 'Portero — golpeo' },
  { value: 'portero_corto', label: 'Portero — juego en corto' },
]

export const ROLES_FINALIZACION: RolTacticoOption[] = [
  { value: 'vigilancia', label: 'Vigilancia' },
  { value: 'responsable_estructura', label: 'Responsable estructura' },
  { value: 'cobertura', label: 'Cobertura' },
  { value: 'marca', label: 'Marca' },
]

export const ROLES_TRANSICION_OF: RolTacticoOption[] = [
  { value: 'corredor', label: 'Corredor' },
  { value: 'carril_central', label: 'Carril central' },
  { value: 'carril_izquierdo', label: 'Carril izquierdo' },
  { value: 'carril_derecho', label: 'Carril derecho' },
  { value: 'detonador', label: 'Jugador determinante' },
  { value: 'verticalidad', label: 'Verticalidad' },
]

export const ROLES_DEFENSA_BLOQUE: RolTacticoOption[] = [
  { value: 'presion', label: 'Presión' },
  { value: 'cobertura', label: 'Cobertura' },
  { value: 'vigilancia', label: 'Vigilancia' },
  { value: 'marca', label: 'Marca' },
  { value: 'linea', label: 'Línea de bloque' },
]

export function getRolesForContext(context: ContextoRoles): RolTacticoOption[] {
  switch (context) {
    case 'creacion_progresion':
      return ROLES_CREACION_PROGRESION
    case 'finalizacion_vigilancia':
      return ROLES_FINALIZACION
    case 'transicion_ofensiva':
      return ROLES_TRANSICION_OF
    case 'defensa_bloque':
      return ROLES_DEFENSA_BLOQUE
  }
}

export function getContextForSubfase(
  fase: 'ataque_organizado' | 'defensa_organizada' | FasePlanPartido | FaseRival,
  subfase: RivalSubfaseAtaque | string
): ContextoRoles {
  if (fase === 'defensa_organizada') return 'defensa_bloque'
  if (subfase === 'finalizacion') return 'finalizacion_vigilancia'
  return 'creacion_progresion'
}

export function rolLabel(rol: string, options: RolTacticoOption[]): string {
  return options.find((o) => o.value === rol)?.label ?? rol
}

export function newAsignacion(jugador: string, rol: string): AsignacionRolTactico {
  return {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now().toString(),
    jugador: jugador.trim(),
    rol,
  }
}
