import type { ABPPlayerRol } from '@/types'
import { ABP_ROLES } from '@/types'

/** Abreviaturas pintadas en el token del jugador (pizarra ABP). */
export const ABP_ROLE_ABBREV: Record<ABPPlayerRol, string> = {
  lanzador: 'LAN',
  bloqueador: 'BLQ',
  palo_corto: 'PC',
  palo_largo: 'PL',
  borde_area: 'BA',
  señuelo: 'SEÑ',
  rechace: 'RCH',
  referencia: 'REF',
  barrera: 'BAR',
  marcaje_zonal: 'MZ',
  marcaje_individual: 'MI',
  portero: 'GK',
  otro: '?',
}

const ABBREV_VALUES = new Set(Object.values(ABP_ROLE_ABBREV))

export function isAbpRole(rol?: string | null): rol is ABPPlayerRol {
  return !!rol && ABP_ROLES.some((r) => r.value === rol)
}

/** Abreviatura para pintar en el círculo; null si el rol no es de ABP. */
export function abpRoleAbbrev(rol?: string | null): string | null {
  if (!rol) return null
  if (isAbpRole(rol)) return ABP_ROLE_ABBREV[rol]
  if (ABBREV_VALUES.has(rol)) return rol
  return null
}

export function abpRoleLabel(rol?: string | null): string | null {
  if (!rol) return null
  return ABP_ROLES.find((r) => r.value === rol)?.label ?? rol
}
