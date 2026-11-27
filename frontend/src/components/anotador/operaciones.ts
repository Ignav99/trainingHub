/**
 * Operaciones sobre el snapshot del anotador: registrar, deshacer y reemplazar eventos.
 * Mantiene la semántica de `lib/anotador.ts` (contadores por parte, hueco de la roja,
 * minutos de los cambios). No cambia la lógica; solo la generaliza a "cualquier evento".
 */
import {
  applySub,
  bumpPeriodStat,
  isPenaltyGoal,
  type AnotadorEvent,
  type AnotadorSnapshot,
} from '@/lib/anotador'

function ladoDe(ev: AnotadorEvent): 'us' | 'rival' {
  return ev.side || (ev.type === 'gol_contra' ? 'rival' : 'us')
}

/** Añade el evento y aplica sus efectos (contadores, hueco de la roja). Sin duplicar ids. */
export function registrarEvento(snap: AnotadorSnapshot, ev: AnotadorEvent, posicion?: number): AnotadorSnapshot {
  let next: AnotadorSnapshot = { ...snap }
  const events = [...snap.events]
  const idx = posicion == null ? events.length : Math.max(0, Math.min(events.length, posicion))
  let evento = ev
  const lado = ladoDe(ev)
  const parte = ev.half
  if (ev.type === 'corner') next = bumpPeriodStat(next, 'saques_esquina', lado, 1, parte)
  if (ev.type === 'falta') next = bumpPeriodStat(next, 'faltas_cometidas', lado, 1, parte)
  if (ev.type === 'amarilla') next = bumpPeriodStat(next, 'tarjetas_amarillas', lado, 1, parte)
  if (ev.type === 'roja') {
    next = bumpPeriodStat(next, 'tarjetas_rojas', lado, 1, parte)
    if (lado === 'us' && ev.convId) {
      const slotId = ev.slotId ?? Object.entries(next.slots).find(([, v]) => v === ev.convId)?.[0]
      const entered = next.enteredAt[ev.convId] ?? ev.minute
      const slots = { ...next.slots }
      if (slotId) delete slots[slotId]
      next = {
        ...next,
        slots,
        playedOff: {
          ...next.playedOff,
          [ev.convId]: (next.playedOff[ev.convId] || 0) + Math.max(0, ev.minute - entered),
        },
      }
      evento = { ...ev, slotId }
    }
  }
  if (isPenaltyGoal(ev)) next = bumpPeriodStat(next, 'penaltis', lado, 1, parte)
  events.splice(idx, 0, evento)
  return { ...next, events }
}

/** Registra un cambio: mueve a los jugadores y guarda el evento. */
export function registrarCambio(
  snap: AnotadorSnapshot,
  sale: string,
  entra: string,
  slotId: string,
  minute: number,
  id: string,
): AnotadorSnapshot {
  const conSub = applySub(snap, sale, entra, slotId, minute)
  return {
    ...conSub,
    events: [
      ...conSub.events,
      { id, minute, half: snap.half, type: 'cambio', convId: sale, relatedConvId: entra, slotId },
    ],
  }
}

export interface ResultadoRevertir {
  snap: AnotadorSnapshot
  /** El evento se quitó pero el once no se pudo rebobinar (hubo cambios posteriores en ese hueco). */
  parcial: boolean
  evento: AnotadorEvent | null
  posicion: number
}

/** Quita un evento y deshace sus efectos. */
export function revertirEvento(snap: AnotadorSnapshot, id: string): ResultadoRevertir {
  const posicion = snap.events.findIndex((e) => e.id === id)
  if (posicion < 0) return { snap, parcial: false, evento: null, posicion: -1 }
  const ev = snap.events[posicion]
  let next: AnotadorSnapshot = { ...snap, events: snap.events.filter((e) => e.id !== id) }
  let parcial = false
  const lado = ladoDe(ev)
  const parte = ev.half || snap.half
  if (ev.type === 'corner') next = bumpPeriodStat(next, 'saques_esquina', lado, -1, parte)
  if (ev.type === 'falta') next = bumpPeriodStat(next, 'faltas_cometidas', lado, -1, parte)
  if (ev.type === 'amarilla') next = bumpPeriodStat(next, 'tarjetas_amarillas', lado, -1, parte)
  if (ev.type === 'roja') next = bumpPeriodStat(next, 'tarjetas_rojas', lado, -1, parte)
  if (isPenaltyGoal(ev)) next = bumpPeriodStat(next, 'penaltis', lado, -1, parte)
  if (ev.type === 'cambio' && ev.convId && ev.relatedConvId && ev.slotId) {
    if (next.slots[ev.slotId] === ev.relatedConvId) {
      const enteredAt = { ...next.enteredAt }
      delete enteredAt[ev.relatedConvId]
      const playedOff = { ...next.playedOff }
      delete playedOff[ev.convId]
      next = { ...next, slots: { ...next.slots, [ev.slotId]: ev.convId }, enteredAt, playedOff }
    } else {
      parcial = true
    }
  }
  if (ev.type === 'roja' && lado === 'us' && ev.convId && ev.slotId) {
    if (!next.slots[ev.slotId]) {
      const playedOff = { ...next.playedOff }
      delete playedOff[ev.convId]
      next = { ...next, slots: { ...next.slots, [ev.slotId]: ev.convId }, playedOff }
    } else {
      parcial = true
    }
  }
  return { snap: next, parcial, evento: ev, posicion }
}

/** Sustituye un evento por su versión editada (deshace y vuelve a aplicar en la misma posición). */
export function reemplazarEvento(snap: AnotadorSnapshot, nuevo: AnotadorEvent): AnotadorSnapshot {
  const rev = revertirEvento(snap, nuevo.id)
  if (!rev.evento) return snap
  // Un cambio no se reaplica (movería a los jugadores otra vez): se edita en sitio.
  if (rev.evento.type === 'cambio' && nuevo.type === 'cambio') {
    return { ...snap, events: snap.events.map((e) => (e.id === nuevo.id ? { ...e, ...nuevo } : e)) }
  }
  const slotPrevio = rev.evento.slotId
  const base = nuevo.type === 'roja' && nuevo.convId === rev.evento.convId
    ? { ...nuevo, slotId: slotPrevio }
    : { ...nuevo, slotId: undefined }
  return registrarEvento(rev.snap, base, rev.posicion)
}

export function restaurarEvento(snap: AnotadorSnapshot, ev: AnotadorEvent, posicion: number): AnotadorSnapshot {
  if (snap.events.some((e) => e.id === ev.id)) return snap
  return registrarEvento(snap, ev, posicion)
}
