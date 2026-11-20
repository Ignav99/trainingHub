import type { RPERegistro } from '@/types'

/** Punto de las barras que se abren bajo un jugador en RPE. */
export interface PuntoRpe {
  label: string
  rpe: number
  ua: number
  tipo: 'Partido' | 'Manual' | 'Sesión'
}

function kindOf(row: Pick<RPERegistro, 'tipo' | 'partido_id' | 'sesion_id'>): PuntoRpe['tipo'] {
  if (row.tipo === 'partido' || row.partido_id) return 'Partido'
  if (row.tipo === 'manual' && !row.sesion_id) return 'Manual'
  return 'Sesión'
}

function dayLabel(fecha: string): string {
  const d = new Date(`${fecha.slice(0, 10)}T12:00:00`)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

/**
 * Las 12 cargas más recientes (sesión, partido o manual).
 * El wellness no entra: si se cuela en la lista, no desplaza un RPE más nuevo.
 */
export function serieRpeReciente(rows: RPERegistro[], n = 12): PuntoRpe[] {
  return [...rows]
    .filter((row) => row.rpe != null && row.tipo !== 'wellness')
    .sort((a, b) => {
      const byFecha = a.fecha.localeCompare(b.fecha)
      if (byFecha !== 0) return byFecha
      return (a.created_at || '').localeCompare(b.created_at || '')
    })
    .slice(-n)
    .map((row) => {
      const minutos = row.duracion_percibida || 0
      const ua = row.carga_sesion || (minutos > 0 ? row.rpe! * minutos : 0)
      return {
        label: dayLabel(row.fecha),
        rpe: row.rpe!,
        ua: Math.round(ua),
        tipo: kindOf(row),
      }
    })
}
