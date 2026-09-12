/** Catálogo de posiciones de plantilla. Sin dependencias de API. */

export const POSICIONES = {
  POR: { nombre: 'Portero', zona: 'porteria', color: '#F59E0B', orden: 0 },
  LTD: { nombre: 'Lateral Derecho', zona: 'defensa', color: '#3B82F6', orden: 1 },
  CAD: { nombre: 'Carrilero Derecho', zona: 'defensa', color: '#3B82F6', orden: 2 },
  DFC: { nombre: 'Defensa Central', zona: 'defensa', color: '#3B82F6', orden: 3 },
  LTI: { nombre: 'Lateral Izquierdo', zona: 'defensa', color: '#3B82F6', orden: 4 },
  CAI: { nombre: 'Carrilero Izquierdo', zona: 'defensa', color: '#3B82F6', orden: 5 },
  MID: { nombre: 'Interior Derecho', zona: 'mediocampo', color: '#10B981', orden: 6 },
  MCD: { nombre: 'Mediocentro Defensivo', zona: 'mediocampo', color: '#10B981', orden: 7 },
  MC: { nombre: 'Mediocentro', zona: 'mediocampo', color: '#10B981', orden: 8 },
  MCO: { nombre: 'Mediocentro Ofensivo', zona: 'mediocampo', color: '#10B981', orden: 9 },
  MII: { nombre: 'Interior Izquierdo', zona: 'mediocampo', color: '#10B981', orden: 10 },
  EXD: { nombre: 'Extremo Derecho', zona: 'ataque', color: '#EF4444', orden: 11 },
  SD: { nombre: 'Segundo Delantero', zona: 'ataque', color: '#EF4444', orden: 12 },
  MP: { nombre: 'Mediapunta', zona: 'ataque', color: '#EF4444', orden: 13 },
  DC: { nombre: 'Delantero Centro', zona: 'ataque', color: '#EF4444', orden: 14 },
  EXI: { nombre: 'Extremo Izquierdo', zona: 'ataque', color: '#EF4444', orden: 15 },
} as const

export type PosicionCodigo = keyof typeof POSICIONES

export const POSICION_ALIASES: Record<string, PosicionCodigo> = {
  LD: 'LTD',
  LI: 'LTI',
  ED: 'EXD',
  EI: 'EXI',
  DFD: 'DFC',
  DFI: 'DFC',
  PT: 'POR',
  GK: 'POR',
  PORTERO: 'POR',
}

export function canonicalPosicion(codigo?: string | null): string {
  if (!codigo) return ''
  const upper = codigo.trim().toUpperCase()
  return POSICION_ALIASES[upper] ?? upper
}

export function posicionMeta(codigo?: string | null) {
  const code = canonicalPosicion(codigo)
  return POSICIONES[code as PosicionCodigo] ?? null
}

/** Badge de línea: portero / defensa / medio / ataque. */
export function posicionZonaClasses(codigo?: string | null): string {
  const zona = posicionMeta(codigo)?.zona
  switch (zona) {
    case 'porteria':
      return 'bg-amber-100 text-amber-800'
    case 'defensa':
      return 'bg-blue-100 text-blue-800'
    case 'mediocampo':
      return 'bg-emerald-100 text-emerald-800'
    case 'ataque':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}
