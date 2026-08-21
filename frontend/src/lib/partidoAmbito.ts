export const AMBITO_COMPETICION = 'competicion'
export const AMBITO_AMISTOSOS = 'amistosos'
export const AMBITO_TODOS = 'todos'

export type PartidoAmbito = typeof AMBITO_COMPETICION | typeof AMBITO_AMISTOSOS | typeof AMBITO_TODOS

export const COMPETICIONES_OFICIALES = new Set(['liga', 'copa', 'torneo'])

export const AMBITO_OPTIONS: { value: PartidoAmbito; label: string; hint: string }[] = [
  {
    value: AMBITO_COMPETICION,
    label: 'Competición',
    hint: 'Liga, copa y torneo. Sin amistosos.',
  },
  {
    value: AMBITO_AMISTOSOS,
    label: 'Amistosos',
    hint: 'Solo partidos amistosos.',
  },
  {
    value: AMBITO_TODOS,
    label: 'Conjunta',
    hint: 'Competición y amistosos juntos.',
  },
]

export function ambitoLabel(ambito: PartidoAmbito | string | undefined): string {
  return AMBITO_OPTIONS.find((o) => o.value === ambito)?.label || 'Competición'
}

export function esAmistoso(competicion?: string | null): boolean {
  return competicion === 'amistoso'
}

export function esOficial(competicion?: string | null): boolean {
  return COMPETICIONES_OFICIALES.has(competicion || '')
}

export function enAmbito(
  competicion: string | null | undefined,
  ambito: PartidoAmbito | string | undefined
): boolean {
  const a = ambito || AMBITO_COMPETICION
  if (a === AMBITO_TODOS) return true
  if (a === AMBITO_AMISTOSOS) return esAmistoso(competicion)
  return esOficial(competicion)
}
