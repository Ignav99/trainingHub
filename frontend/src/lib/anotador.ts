/**
 * Motor del anotador de partido (tablet).
 * El registro en campo es la fuente de verdad: al guardar se vuelca
 * a convocatoria, marcador y detalle de goles del informe.
 */

export type AnotadorHalf = 1 | 2

export type AnotadorEventType =
  | 'gol'
  | 'gol_contra'
  | 'amarilla'
  | 'roja'
  | 'cambio'
  | 'corner'
  | 'falta'

export interface AnotadorEvent {
  id: string
  minute: number
  half: AnotadorHalf
  type: AnotadorEventType
  convId?: string
  relatedConvId?: string
  slotId?: string
}

export interface AnotadorSnapshot {
  form: string
  slots: Record<string, string>
  dirRight: boolean
  showDorsal: boolean
  half: AnotadorHalf
  running: boolean
  elapsedMs: number
  half1Ms: number
  started: boolean
  events: AnotadorEvent[]
  /** convId → minuto en que saltó al campo */
  enteredAt: Record<string, number>
  /** convId → minutos ya cerrados (sustituido) */
  playedOff: Record<string, number>
}

export interface AnotadorPlayerRow {
  minutos_jugados: number
  goles: number
  asistencias: number
  tarjeta_amarilla: boolean
  tarjeta_roja: boolean
}

export const DEFAULT_ANOTADOR: AnotadorSnapshot = {
  form: '4-3-3',
  slots: {},
  dirRight: true,
  showDorsal: true,
  half: 1,
  running: false,
  elapsedMs: 0,
  half1Ms: 0,
  started: false,
  events: [],
  enteredAt: {},
  playedOff: {},
}

export function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Minuto de partido (1ª = 0…; 2ª = 45 + transcurrido). */
export function matchMinute(half: AnotadorHalf, elapsedMs: number): number {
  const mins = Math.max(0, Math.floor(elapsedMs / 60000))
  return half === 1 ? mins : 45 + mins
}

export function formatClock(half: AnotadorHalf, elapsedMs: number): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1000))
  const mm = Math.floor(total / 60)
  const ss = total % 60
  const shown = half === 1 ? mm : 45 + mm
  return `${String(shown).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export function parseNotasPre(raw?: string | null): {
  formacion?: string
  formacion_slots?: Record<string, string>
  anotador?: AnotadorSnapshot
  rest: Record<string, unknown>
} {
  if (!raw) return { rest: {} }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { rest: {} }
    const { formacion, formacion_slots, anotador, ...rest } = parsed as Record<string, unknown>
    return {
      formacion: typeof formacion === 'string' ? formacion : undefined,
      formacion_slots: formacion_slots && typeof formacion_slots === 'object'
        ? formacion_slots as Record<string, string>
        : undefined,
      anotador: isSnapshot(anotador) ? anotador : undefined,
      rest,
    }
  } catch {
    return { rest: {} }
  }
}

function isSnapshot(v: unknown): v is AnotadorSnapshot {
  if (!v || typeof v !== 'object') return false
  const o = v as AnotadorSnapshot
  return Array.isArray(o.events) && typeof o.slots === 'object'
}

export function mergeNotasPre(
  existingRaw: string | null | undefined,
  snapshot: AnotadorSnapshot,
): string {
  const { rest } = parseNotasPre(existingRaw)
  return JSON.stringify({
    ...rest,
    formacion: snapshot.form,
    formacion_slots: snapshot.slots,
    anotador: { ...snapshot, running: false },
  })
}

export function assignTitularesToSlots(
  slotDefs: { id: string; position: string }[],
  titulares: { id: string; posicion?: string | null }[],
): Record<string, string> {
  const slots: Record<string, string> = {}
  const used = new Set<string>()
  for (const t of titulares) {
    const pos = t.posicion || ''
    const exact = slotDefs.find((s) => s.id === pos && !slots[s.id])
    if (exact) {
      slots[exact.id] = t.id
      used.add(t.id)
    }
  }
  for (const t of titulares) {
    if (used.has(t.id)) continue
    const pos = t.posicion || ''
    const byPos = slotDefs.find((s) => s.position === pos && !slots[s.id])
    if (byPos) {
      slots[byPos.id] = t.id
      used.add(t.id)
    }
  }
  for (const t of titulares) {
    if (used.has(t.id)) continue
    const empty = slotDefs.find((s) => !slots[s.id])
    if (empty) {
      slots[empty.id] = t.id
      used.add(t.id)
    }
  }
  return slots
}

export function hydrateSnapshot(args: {
  notasPre?: string | null
  titulares?: { id: string; posicion?: string | null }[]
  formationSlots?: { id: string; position: string }[]
}): AnotadorSnapshot {
  const parsed = parseNotasPre(args.notasPre)
  if (parsed.anotador) {
    return { ...DEFAULT_ANOTADOR, ...parsed.anotador, running: false }
  }
  const form = parsed.formacion || DEFAULT_ANOTADOR.form
  let slots = parsed.formacion_slots || {}
  if (!Object.values(slots).some(Boolean) && args.titulares?.length && args.formationSlots?.length) {
    slots = assignTitularesToSlots(args.formationSlots, args.titulares)
  }
  const enteredAt: Record<string, number> = {}
  for (const convId of Object.values(slots)) {
    if (convId) enteredAt[convId] = 0
  }
  return {
    ...DEFAULT_ANOTADOR,
    form,
    slots,
    enteredAt,
  }
}

export function computeMinutes(
  snapshot: AnotadorSnapshot,
  convIds: string[],
  nowMinute: number,
): Record<string, number> {
  const out: Record<string, number> = {}
  const onField = new Set(Object.values(snapshot.slots).filter(Boolean))
  for (const id of convIds) {
    const closed = snapshot.playedOff[id] || 0
    if (onField.has(id) && snapshot.enteredAt[id] != null) {
      out[id] = closed + Math.max(0, nowMinute - snapshot.enteredAt[id])
    } else {
      out[id] = closed
    }
  }
  return out
}

export function computePlayerRows(
  snapshot: AnotadorSnapshot,
  convIds: string[],
  nowMinute: number,
): Record<string, AnotadorPlayerRow> {
  const minutes = computeMinutes(snapshot, convIds, nowMinute)
  const rows: Record<string, AnotadorPlayerRow> = {}
  for (const id of convIds) {
    rows[id] = {
      minutos_jugados: minutes[id] || 0,
      goles: 0,
      asistencias: 0,
      tarjeta_amarilla: false,
      tarjeta_roja: false,
    }
  }
  for (const ev of snapshot.events) {
    if (ev.type === 'gol' && ev.convId && rows[ev.convId]) {
      rows[ev.convId].goles += 1
    }
    if (ev.type === 'gol' && ev.relatedConvId && rows[ev.relatedConvId]) {
      rows[ev.relatedConvId].asistencias += 1
    }
    if (ev.type === 'amarilla' && ev.convId && rows[ev.convId]) {
      rows[ev.convId].tarjeta_amarilla = true
    }
    if (ev.type === 'roja' && ev.convId && rows[ev.convId]) {
      rows[ev.convId].tarjeta_roja = true
    }
  }
  return rows
}

export function scoreFromEvents(events: AnotadorEvent[]): { gf: number; gc: number } {
  let gf = 0
  let gc = 0
  for (const ev of events) {
    if (ev.type === 'gol') gf += 1
    if (ev.type === 'gol_contra') gc += 1
  }
  return { gf, gc }
}

export function teamStatsFromEvents(events: AnotadorEvent[]): {
  saques_esquina: number
  faltas_cometidas: number
  tarjetas_amarillas: number
  tarjetas_rojas: number
} {
  let saques_esquina = 0
  let faltas_cometidas = 0
  let tarjetas_amarillas = 0
  let tarjetas_rojas = 0
  for (const ev of events) {
    if (ev.type === 'corner') saques_esquina += 1
    if (ev.type === 'falta') faltas_cometidas += 1
    if (ev.type === 'amarilla') tarjetas_amarillas += 1
    if (ev.type === 'roja') tarjetas_rojas += 1
  }
  return { saques_esquina, faltas_cometidas, tarjetas_amarillas, tarjetas_rojas }
}

export function golesDetalleFromEvents(
  events: AnotadorEvent[],
  nameOf: (convId?: string) => string,
): { favor: { minuto: number; es_abp: boolean; jugador?: string; asistencia?: string }[]; contra: { minuto: number; es_abp: boolean; jugador?: string }[] } {
  const favor: { minuto: number; es_abp: boolean; jugador?: string; asistencia?: string }[] = []
  const contra: { minuto: number; es_abp: boolean; jugador?: string }[] = []
  for (const ev of events) {
    if (ev.type === 'gol') {
      const row: { minuto: number; es_abp: boolean; jugador?: string; asistencia?: string } = {
        minuto: ev.minute,
        es_abp: false,
      }
      const n = nameOf(ev.convId)
      if (n) row.jugador = n
      const a = nameOf(ev.relatedConvId)
      if (a) row.asistencia = a
      favor.push(row)
    }
    if (ev.type === 'gol_contra') {
      contra.push({ minuto: ev.minute, es_abp: false, jugador: nameOf(ev.convId) || undefined })
    }
  }
  return { favor, contra }
}

export function applySub(
  snapshot: AnotadorSnapshot,
  outConvId: string,
  inConvId: string,
  slotId: string,
  minute: number,
): AnotadorSnapshot {
  const played = snapshot.playedOff[outConvId] || 0
  const entered = snapshot.enteredAt[outConvId] ?? minute
  const nextSlots = { ...snapshot.slots }
  for (const [k, v] of Object.entries(nextSlots)) {
    if (v === outConvId) delete nextSlots[k]
  }
  nextSlots[slotId] = inConvId
  return {
    ...snapshot,
    slots: nextSlots,
    playedOff: {
      ...snapshot.playedOff,
      [outConvId]: played + Math.max(0, minute - entered),
    },
    enteredAt: {
      ...snapshot.enteredAt,
      [inConvId]: minute,
    },
  }
}

export function startEleven(snapshot: AnotadorSnapshot): AnotadorSnapshot {
  const enteredAt: Record<string, number> = { ...snapshot.enteredAt }
  for (const convId of Object.values(snapshot.slots)) {
    if (convId && enteredAt[convId] == null) enteredAt[convId] = 0
  }
  return { ...snapshot, started: true, enteredAt }
}

export function eventLabel(ev: AnotadorEvent, nameOf: (id?: string) => string): string {
  const who = nameOf(ev.convId) || '—'
  switch (ev.type) {
    case 'gol':
      return `${ev.minute}' Gol ${who}${ev.relatedConvId ? ` (asiste ${nameOf(ev.relatedConvId)})` : ''}`
    case 'gol_contra':
      return `${ev.minute}' Gol en contra`
    case 'amarilla':
      return `${ev.minute}' Amarilla ${who}`
    case 'roja':
      return `${ev.minute}' Roja ${who}`
    case 'cambio':
      return `${ev.minute}' Cambio ${who} → ${nameOf(ev.relatedConvId)}`
    case 'corner':
      return `${ev.minute}' Córner`
    case 'falta':
      return `${ev.minute}' Falta`
    default:
      return `${ev.minute}'`
  }
}
