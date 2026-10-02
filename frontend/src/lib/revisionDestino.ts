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
