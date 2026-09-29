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
 * Informe del rival: el vídeo es de ese rival contra otro equipo.
 * Los recortes van a su informe y no a la revisión del partido que vais a jugar.
 */
export function revisionLinkForMode(mode: VideoWatchMode): {
  lockAmbito: 'rival' | null
  attachUpcomingMatch: boolean
} {
  if (mode === 'informe_rival') {
    return { lockAmbito: 'rival', attachUpcomingMatch: false }
  }
  return { lockAmbito: null, attachUpcomingMatch: true }
}

/** Etiqueta del partido visto (el rival contra otro equipo), p. ej. "vs Herrera". */
export function watchedMatchNote(opponent: string): string | undefined {
  const name = opponent.trim().replace(/^vs\.?\s+/i, '')
  if (!name) return undefined
  return `vs ${name}`
}

export function canLoadMatchVideo(mode: VideoWatchMode | null, watchedOpponent: string): boolean {
  if (!mode) return false
  if (mode === 'informe_rival') return Boolean(watchedMatchNote(watchedOpponent))
  return true
}
