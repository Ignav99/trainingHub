/** Resumen de cierre calculado desde los eventos. Puro. */
import type { EventoEditable } from './edicionEvento.ts'

export interface FilaJugadorResumen {
  convId: string
  nombre: string
  dorsal: number | null
  minutos: number
}

export interface Goleador {
  convId: string
  nombre: string
  minutos: number[]
}

export interface ResumenPartido {
  gf: number
  gc: number
  goleadores: Goleador[]
  golesRivalMinutos: number[]
  amarillas: { nombre: string; minute: number; lado: 'us' | 'rival' }[]
  rojas: { nombre: string; minute: number; lado: 'us' | 'rival' }[]
  cambios: { minute: number; sale: string; entra: string }[]
  porMinutos: FilaJugadorResumen[]
}

export function resumenPartido(
  events: EventoEditable[],
  nameOf: (id?: string) => string,
  filas: FilaJugadorResumen[],
): ResumenPartido {
  const ordenados = [...events].sort((a, b) => a.half - b.half || a.minute - b.minute)
  const goles = new Map<string, Goleador>()
  const res: ResumenPartido = {
    gf: 0,
    gc: 0,
    goleadores: [],
    golesRivalMinutos: [],
    amarillas: [],
    rojas: [],
    cambios: [],
    porMinutos: [...filas].filter((f) => f.minutos > 0).sort((a, b) => b.minutos - a.minutos),
  }
  const quien = (ev: EventoEditable) =>
    ev.side === 'rival'
      ? ev.rivalDorsal != null ? `Rival #${ev.rivalDorsal}` : 'Rival'
      : nameOf(ev.convId) || 'Sin jugador'
  for (const ev of ordenados) {
    if (ev.type === 'gol') {
      res.gf += 1
      const id = ev.convId || '—'
      const g = goles.get(id) || { convId: id, nombre: nameOf(ev.convId) || 'Sin jugador', minutos: [] }
      g.minutos.push(ev.minute)
      goles.set(id, g)
    } else if (ev.type === 'gol_contra') {
      res.gc += 1
      res.golesRivalMinutos.push(ev.minute)
    } else if (ev.type === 'amarilla') {
      res.amarillas.push({ nombre: quien(ev), minute: ev.minute, lado: ev.side === 'rival' ? 'rival' : 'us' })
    } else if (ev.type === 'roja') {
      res.rojas.push({ nombre: quien(ev), minute: ev.minute, lado: ev.side === 'rival' ? 'rival' : 'us' })
    } else if (ev.type === 'cambio') {
      res.cambios.push({ minute: ev.minute, sale: nameOf(ev.convId), entra: nameOf(ev.relatedConvId) })
    }
  }
  res.goleadores = Array.from(goles.values())
  return res
}
