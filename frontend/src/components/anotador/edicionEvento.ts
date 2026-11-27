/** Reductores puros para editar o crear un evento. Sin dependencias. */

export type TipoEvento = 'gol' | 'gol_contra' | 'amarilla' | 'roja' | 'cambio' | 'corner' | 'falta'
export type Parte = 1 | 2
export type Lado = 'us' | 'rival'

export interface EventoEditable {
  id: string
  minute: number
  half: Parte
  type: TipoEvento
  convId?: string
  relatedConvId?: string
  slotId?: string
  side?: Lado
  rivalDorsal?: number
  es_abp?: boolean
  tipo_gol?: string
  tipo_abp?: string
  zona?: string
}

export function rangoMinuto(parte: Parte): { min: number; max: number } {
  return parte === 1 ? { min: 0, max: 60 } : { min: 45, max: 130 }
}

export function acotarMinuto(minuto: number, parte: Parte): number {
  const { min, max } = rangoMinuto(parte)
  return Math.min(max, Math.max(min, Math.round(minuto)))
}

export function ajustarMinuto<T extends EventoEditable>(ev: T, delta: number): T {
  return { ...ev, minute: acotarMinuto(ev.minute + delta, ev.half) }
}

export function cambiarParte<T extends EventoEditable>(ev: T, parte: Parte): T {
  if (ev.half === parte) return ev
  const minute = parte === 2 && ev.minute < 45 ? 45 : parte === 1 && ev.minute > 60 ? 60 : ev.minute
  return { ...ev, half: parte, minute: acotarMinuto(minute, parte) }
}

/** Tipo real que se guarda según lo que se pulsa y el lado (gol rival = gol_contra). */
export function tipoEfectivo(tipo: TipoEvento, lado: Lado): TipoEvento {
  if (tipo === 'gol' || tipo === 'gol_contra') return lado === 'rival' ? 'gol_contra' : 'gol'
  return tipo
}

export function ladoDe(ev: Pick<EventoEditable, 'type' | 'side'>): Lado {
  return ev.side || (ev.type === 'gol_contra' ? 'rival' : 'us')
}

export function cambiarTipoLado<T extends EventoEditable>(ev: T, tipo: TipoEvento, lado: Lado): T {
  const type = tipoEfectivo(tipo, lado)
  const next: T = { ...ev, type, side: lado }
  if (lado === 'rival') {
    delete next.convId
    delete next.relatedConvId
  } else {
    delete next.rivalDorsal
  }
  if (type !== 'gol' && type !== 'gol_contra') {
    delete next.es_abp
    delete next.tipo_gol
    delete next.tipo_abp
    delete next.zona
    delete next.relatedConvId
  }
  return next
}

export function cambiarJugador<T extends EventoEditable>(
  ev: T,
  campo: 'convId' | 'relatedConvId',
  id: string | undefined,
): T {
  const next: T = { ...ev }
  if (id) next[campo] = id
  else delete next[campo]
  return next
}

/** Qué campos de jugador admite cada tipo. */
export function camposJugador(ev: Pick<EventoEditable, 'type' | 'side'>): {
  principal: boolean
  secundario: 'asiste' | 'entra' | null
  dorsalRival: boolean
} {
  const rival = ladoDe(ev) === 'rival'
  switch (ev.type) {
    case 'gol':
      return { principal: true, secundario: 'asiste', dorsalRival: false }
    case 'gol_contra':
      return { principal: false, secundario: null, dorsalRival: true }
    case 'amarilla':
    case 'roja':
      return { principal: !rival, secundario: null, dorsalRival: rival }
    case 'cambio':
      return { principal: true, secundario: 'entra', dorsalRival: false }
    default:
      return { principal: false, secundario: null, dorsalRival: false }
  }
}

/** Errores que impiden guardar la edición. */
export function validarBorrador(ev: EventoEditable): string[] {
  const errores: string[] = []
  const campos = camposJugador(ev)
  if (campos.principal && !ev.convId) {
    errores.push(ev.type === 'cambio' ? 'Falta quién sale' : 'Falta elegir el jugador')
  }
  if (ev.type === 'cambio') {
    if (!ev.relatedConvId) errores.push('Falta quién entra')
    if (ev.convId && ev.convId === ev.relatedConvId) errores.push('Sale y entra el mismo jugador')
  }
  if (ev.type === 'gol' && ev.convId && ev.convId === ev.relatedConvId) {
    errores.push('El goleador no puede asistirse a sí mismo')
  }
  return errores
}

export function ordenCronologico<T extends Pick<EventoEditable, 'half' | 'minute'>>(eventos: T[]): T[] {
  return eventos
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.half - b.e.half || a.e.minute - b.e.minute || a.i - b.i)
    .map((x) => x.e)
}

export function borradorNuevo(
  id: string,
  tipo: TipoEvento,
  lado: Lado,
  minute: number,
  half: Parte,
): EventoEditable {
  const type = tipoEfectivo(tipo, lado)
  const base: EventoEditable = { id, type, side: lado, half, minute: acotarMinuto(minute, half) }
  if (type === 'gol' || type === 'gol_contra') {
    return { ...base, es_abp: false, tipo_gol: 'otro', zona: 'central' }
  }
  return base
}
