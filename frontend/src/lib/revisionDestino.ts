import type { RevisionAmbito } from './api/revision'

export interface RevisionDestinoPartido {
  id: string
  rivalId: string
  label: string
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function revisionDestinoLabel(opts: {
  fecha?: string | null
  rivalName: string
  localia?: string | null
}): string {
  const day = (opts.fecha || '').slice(0, 10)
  const parts = day.split('-')
  const month = Number(parts[1])
  const date = Number(parts[2])
  const when = month && date && month <= 12 ? `${date} ${MONTHS[month - 1]}` : ''
  const place = opts.localia === 'visitante' ? 'Fuera' : opts.localia === 'local' ? 'Casa' : ''
  return [when, opts.rivalName.trim() || 'Rival', place].filter(Boolean).join(' · ')
}

export function pickDestinoId(destinos: RevisionDestinoPartido[], preferred?: string | null): string {
  if (preferred && destinos.some((item) => item.id === preferred)) return preferred
  return destinos[0]?.id ?? ''
}

/** Informe del rival cuelga del rival. Informe y plan cuelgan del partido elegido. */
export function packQueryForDestino(
  equipoId: string,
  ambito: RevisionAmbito,
  destino: RevisionDestinoPartido,
) {
  if (ambito === 'rival') {
    return { equipo_id: equipoId, ambito, rival_id: destino.rivalId || undefined }
  }
  return { equipo_id: equipoId, ambito, partido_id: destino.id }
}

export interface RevisionPackLookup {
  equipo_id: string
  ambito: RevisionAmbito
  partido_id?: string
  rival_id?: string
  microciclo_id?: string
}

/**
 * La librería del plan tiene que abrir el mismo pack que crea el vídeo.
 * Informe y plan se identifican solo por partido. Si el plan aún no tiene
 * partido, se mantiene la clave antigua (rival + microciclo).
 */
export function revisionPackLookup(input: {
  equipoId: string
  ambito: RevisionAmbito
  partidoId?: string
  rivalId?: string
  microcicloId?: string
}): RevisionPackLookup {
  if ((input.ambito === 'partido_plan' || input.ambito === 'partido_post') && input.partidoId) {
    return { equipo_id: input.equipoId, ambito: input.ambito, partido_id: input.partidoId }
  }
  if (input.ambito === 'partido_post') {
    return { equipo_id: input.equipoId, ambito: input.ambito, partido_id: input.partidoId || undefined }
  }
  return {
    equipo_id: input.equipoId,
    ambito: input.ambito,
    rival_id: input.rivalId || undefined,
    microciclo_id: input.microcicloId || undefined,
  }
}

const PLAN_MATCH_COMPETICIONES = new Set(['liga', 'copa', 'torneo'])

/** Ida usa el primer partido con ese rival; vuelta, el siguiente. */
export function planMatchIdForTramo(
  matches: Array<{ id: string; fecha?: string | null; competicion?: string | null }>,
  tramo: 'ida' | 'vuelta',
): string | undefined {
  const sorted = [...matches].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
  const oficiales = sorted.filter((match) => PLAN_MATCH_COMPETICIONES.has(match.competicion || ''))
  const pool = oficiales.length > 0 ? oficiales : sorted
  if (pool.length === 0) return undefined
  if (tramo === 'vuelta') return (pool[1] ?? pool[pool.length - 1]).id
  return pool[0].id
}
