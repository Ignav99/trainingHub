export type PickerPartido = {
  id: string
  fecha: string
  localia: 'local' | 'visitante' | string
  jornada?: number
}

export type VideoSourceChoice =
  | { kind: 'loose' }
  | { kind: 'match'; partidoId: string }

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
