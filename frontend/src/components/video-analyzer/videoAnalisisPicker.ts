export type PickerPartido = {
  id: string
  fecha: string
  localia: 'local' | 'visitante' | string
  jornada?: number
}

export type VideoWatchMode = 'revision' | 'informe_rival'

export type VideoSourceChoice =
  | { kind: 'loose' }
  | { kind: 'match'; partidoId: string; mode: VideoWatchMode }

export interface PartidoMonthGroup<T extends PickerPartido = PickerPartido> {
  key: string
  label: string
  partidos: T[]
}

export function groupPartidosByMonth<T extends PickerPartido>(partidos: T[]): PartidoMonthGroup<T>[] {
  const groups = new Map<string, T[]>()
  for (const p of partidos) {
    const d = new Date(p.fecha)
    const key = Number.isNaN(d.getTime()) ? 'sin-fecha' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const list = groups.get(key) || []
    list.push(p)
    groups.set(key, list)
  }
  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => ({
      key,
      label: key === 'sin-fecha'
        ? 'Sin fecha'
        : new Date(`${key}-01T12:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      partidos: list.slice().sort((left, right) => String(right.fecha).localeCompare(String(left.fecha))),
    }))
}

export function localiaLabel(localia: string): string {
  return localia === 'local' ? 'Casa · ida' : 'Fuera · vuelta'
}

export function watchModeLabel(mode: VideoWatchMode): string {
  return mode === 'informe_rival' ? 'Informe del rival' : 'Revisión del partido'
}

/**
 * Informe del rival: el archivo es de ese rival contra otro equipo, así que no se guarda
 * como el vídeo de nuestro partido. Al recortar se elige el destino.
 */
export function revisionLinkForMode(mode: VideoWatchMode): {
  attachUpcomingMatch: boolean
} {
  return { attachUpcomingMatch: mode !== 'informe_rival' }
}

/** Etiqueta del partido visto (el rival contra otro equipo), p. ej. "vs Herrera". */
export function watchedMatchNote(opponent: string): string | undefined {
  const name = opponent.trim().replace(/^vs\.?\s+/i, '')
  if (!name) return undefined
  return `vs ${name}`
}

const MATCH_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function shortMatchDate(fecha?: string | null): string {
  const day = (fecha || '').slice(0, 10)
  const parts = day.split('-')
  const month = Number(parts[1])
  const date = Number(parts[2])
  if (!month || !date || month > 12) return ''
  return `${date} ${MATCH_MONTHS[month - 1]}`
}

/** Nombre por defecto del zip: el partido, o el archivo si el vídeo no va a ninguno. */
export function matchArchiveLabel(opts: {
  clubName?: string | null
  rivalName?: string | null
  localia?: string | null
  fecha?: string | null
  watchMode?: VideoWatchMode | null
  watchedOpponent?: string | null
  fileName?: string | null
}): string {
  const file = (opts.fileName || '').replace(/\.[^.]+$/, '').trim()
  const rival = (opts.rivalName || '').trim()
  const date = shortMatchDate(opts.fecha)
  if (!rival) return file || 'Vídeo'
  if (opts.watchMode === 'informe_rival') {
    const note = watchedMatchNote(opts.watchedOpponent || '')
    const base = note ? `${rival} ${note}` : rival
    return date ? `${base} ${date}` : base
  }
  const club = (opts.clubName || '').trim() || 'Nosotros'
  const home = opts.localia !== 'visitante'
  const left = home ? club : rival
  const right = home ? rival : club
  const base = `${left} vs ${right}`
  return date ? `${base} ${date}` : base
}

export function canLoadMatchVideo(mode: VideoWatchMode | null, watchedOpponent: string): boolean {
  if (!mode) return false
  if (mode === 'informe_rival') return Boolean(watchedMatchNote(watchedOpponent))
  return true
}
