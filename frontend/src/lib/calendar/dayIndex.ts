import type { Sesion, Partido, Microciclo } from '@/types'
import { isSameDay } from './types'

export interface DayBucket {
  sesiones: Sesion[]
  partidos: Partido[]
  descanso: boolean
  microciclos: Microciclo[]
}

export function buildDayIndex(params: {
  sesiones: Sesion[]
  partidos: Partido[]
  microciclos: Microciclo[]
  descansos: Set<string>
}): Record<string, DayBucket> {
  const index: Record<string, DayBucket> = {}

  const ensure = (date: string): DayBucket => {
    const key = date.slice(0, 10)
    if (!index[key]) {
      index[key] = { sesiones: [], partidos: [], descanso: false, microciclos: [] }
    }
    return index[key]
  }

  for (const s of params.sesiones) {
    ensure(s.fecha).sesiones.push(s)
  }
  for (const p of params.partidos) {
    ensure(p.fecha).partidos.push(p)
  }
  for (const d of Array.from(params.descansos)) {
    ensure(d).descanso = true
  }
  for (const m of params.microciclos) {
    const start = m.fecha_inicio.slice(0, 10)
    const end = m.fecha_fin.slice(0, 10)
    const cur = new Date(start + 'T12:00:00')
    const last = new Date(end + 'T12:00:00')
    while (cur <= last) {
      const localKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
      ensure(localKey).microciclos.push(m)
      cur.setDate(cur.getDate() + 1)
    }
  }

  return index
}

export function getBucket(index: Record<string, DayBucket>, date: string): DayBucket {
  return index[date.slice(0, 10)] || { sesiones: [], partidos: [], descanso: false, microciclos: [] }
}

export function microsCovering(microciclos: Microciclo[], date: string): Microciclo[] {
  const d = date.slice(0, 10)
  return microciclos.filter((m) => m.fecha_inicio.slice(0, 10) <= d && m.fecha_fin.slice(0, 10) >= d)
}

export function filterByRange<T extends { fecha?: string; fecha_inicio?: string; fecha_fin?: string }>(
  items: T[],
  desde: string,
  hasta: string,
  mode: 'point' | 'range' = 'point'
): T[] {
  if (mode === 'range') {
    return items.filter((item) => {
      const start = (item.fecha_inicio || item.fecha || '').slice(0, 10)
      const end = (item.fecha_fin || item.fecha || '').slice(0, 10)
      return start && end && start <= hasta && end >= desde
    })
  }
  return items.filter((item) => {
    const f = (item.fecha || '').slice(0, 10)
    return f >= desde && f <= hasta
  })
}

export { isSameDay }
