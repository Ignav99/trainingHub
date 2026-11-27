import type { Convocatoria } from '@/types'

/** Datos del jugador de una convocatoria, vengan como `jugador` o `jugadores`. */
export interface JugadorBasico {
  apodo?: string | null
  nombre?: string | null
  apellidos?: string | null
  dorsal?: number | null
  foto_url?: string | null
  posicion_principal?: string | null
}

export function playerOf(c: Convocatoria): JugadorBasico {
  return (c.jugador || c.jugadores || {}) as JugadorBasico
}

export function displayName(c: Convocatoria): string {
  const p = playerOf(c)
  return p.apodo || `${p.nombre || ''} ${p.apellidos || ''}`.trim() || 'Jugador'
}

/** Etiqueta corta para la ficha: apodo, o primer apellido, o nombre. */
export function etiquetaCorta(c: Convocatoria): string {
  const p = playerOf(c)
  if (p.apodo) return p.apodo
  const ap = (p.apellidos || '').trim().split(/\s+/)[0]
  return ap || (p.nombre || '').trim().split(/\s+/)[0] || 'Jugador'
}

export function dorsalOf(c: Convocatoria): number | null {
  return c.dorsal ?? playerOf(c).dorsal ?? null
}

export function byDorsal(a: Convocatoria, b: Convocatoria): number {
  return (dorsalOf(a) ?? 99) - (dorsalOf(b) ?? 99)
}

export function iniciales(c: Convocatoria): string {
  const p = playerOf(c)
  const a = (p.nombre || p.apodo || '').trim()[0] || ''
  const b = (p.apellidos || '').trim()[0] || ''
  return (a + b).toUpperCase() || '·'
}

export function fotoOf(c: Convocatoria): string | null {
  return playerOf(c).foto_url || null
}

/** Hora local "12:41" desde epoch ms o ISO. */
export function formatHora(valor?: number | string | Date | null): string {
  if (valor == null) return ''
  const d = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
