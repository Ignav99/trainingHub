/**
 * Motor del anotador de partido (tablet).
 * El registro en campo es la fuente de verdad: al guardar se vuelca
 * a convocatoria, marcador, detalle de goles y estadísticas de ambos equipos.
 */

export type AnotadorHalf = 1 | 2
export type AnotadorSide = 'us' | 'rival'

export type AnotadorEventType =
  | 'gol'
  | 'gol_contra'
  | 'amarilla'
  | 'roja'
  | 'cambio'
  | 'corner'
  | 'falta'

export const TEAM_STAT_FIELDS = [
  { key: 'tiros_a_puerta', label: 'Tiros a puerta', short: 'Tiro' },
  { key: 'ocasiones_gol', label: 'Ocasiones de gol', short: 'Ocasión' },
  { key: 'saques_esquina', label: 'Córners', short: 'Córner' },
  { key: 'penaltis', label: 'Penaltis', short: 'Penalti' },
  { key: 'fueras_juego', label: 'Fueras de juego', short: 'Fuera' },
  { key: 'faltas_cometidas', label: 'Faltas', short: 'Falta' },
  { key: 'tarjetas_amarillas', label: 'Amarillas', short: 'Amarilla' },
  { key: 'tarjetas_rojas', label: 'Rojas', short: 'Roja' },
  { key: 'balones_perdidos', label: 'Pérdidas', short: 'Pérdida' },
  { key: 'balones_recuperados', label: 'Recuperaciones', short: 'Recup.' },
] as const

export type TeamStatKey = typeof TEAM_STAT_FIELDS[number]['key']
export type TeamStatsState = Record<string, number>

export const TIPO_GOL_OPTIONS = [
  { value: 'centro_lateral', label: 'Centro' },
  { value: 'balon_filtrado', label: 'Filtrado' },
  { value: 'balon_espalda', label: 'Espalda' },
  { value: 'jugada_individual', label: 'Individual' },
  { value: 'contraataque', label: 'Contra' },
  { value: 'error_rival', label: 'Error rival' },
  { value: 'otro', label: 'Otro' },
] as const

export const TIPO_ABP_OPTIONS = [
  { value: 'corner', label: 'Córner' },
  { value: 'falta_directa', label: 'Falta dir.' },
  { value: 'falta_indirecta', label: 'Falta ind.' },
  { value: 'penalti', label: 'Penalti' },
  { value: 'saque_banda', label: 'Banda' },
] as const

export const ZONA_OPTIONS = [
  { value: 'izquierda', label: 'Izq' },
  { value: 'central', label: 'Centro' },
  { value: 'central_lejana', label: 'Lejos' },
  { value: 'derecha', label: 'Der' },
] as const

export interface AnotadorEvent {
  id: string
  minute: number
  half: AnotadorHalf
  type: AnotadorEventType
  convId?: string
  relatedConvId?: string
  slotId?: string
  side?: AnotadorSide
  es_abp?: boolean
  tipo_gol?: string
  tipo_abp?: string
  zona?: string
}

export interface FoulDot {
  x: number
  y: number
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
  enteredAt: Record<string, number>
  playedOff: Record<string, number>
  teamStats: TeamStatsState
  foulMap: { cometidas: FoulDot[]; recibidas: FoulDot[] }
}

export interface AnotadorPlayerRow {
  minutos_jugados: number
  goles: number
  asistencias: number
  tarjeta_amarilla: boolean
  tarjeta_roja: boolean
}

export function emptyTeamStats(): TeamStatsState {
  const out: TeamStatsState = {}
  for (const f of TEAM_STAT_FIELDS) {
    out[f.key] = 0
    out[`rival_${f.key}`] = 0
  }
  return out
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
  teamStats: emptyTeamStats(),
  foulMap: { cometidas: [], recibidas: [] },
}

export function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

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

export function bumpStat(
  stats: TeamStatsState,
  key: string,
  side: AnotadorSide,
  delta: number,
): TeamStatsState {
  const k = side === 'rival' ? `rival_${key}` : key
  return { ...stats, [k]: Math.max(0, (stats[k] || 0) + delta) }
}

export function teamStatsFromEvents(events: AnotadorEvent[]): TeamStatsState {
  const stats = emptyTeamStats()
  for (const ev of events) {
    const side: AnotadorSide = ev.side || (ev.type === 'gol_contra' ? 'rival' : 'us')
    if (ev.type === 'corner') {
      Object.assign(stats, bumpStat(stats, 'saques_esquina', side, 1))
    }
    if (ev.type === 'falta') {
      Object.assign(stats, bumpStat(stats, 'faltas_cometidas', side, 1))
    }
    if (ev.type === 'amarilla') {
      Object.assign(stats, bumpStat(stats, 'tarjetas_amarillas', side, 1))
    }
    if (ev.type === 'roja') {
      Object.assign(stats, bumpStat(stats, 'tarjetas_rojas', side, 1))
    }
    if (ev.type === 'gol' && ev.es_abp && ev.tipo_abp === 'penalti') {
      Object.assign(stats, bumpStat(stats, 'penaltis', 'us', 1))
    }
    if (ev.type === 'gol_contra' && ev.es_abp && ev.tipo_abp === 'penalti') {
      Object.assign(stats, bumpStat(stats, 'penaltis', 'rival', 1))
    }
  }
  return stats
}

export function normalizeSnapshot(raw: AnotadorSnapshot): AnotadorSnapshot {
  const teamStats = { ...emptyTeamStats(), ...(raw.teamStats || {}) }
  const derived = teamStatsFromEvents(raw.events || [])
  const hasAny = Object.values(teamStats).some((n) => n > 0)
  return {
    ...DEFAULT_ANOTADOR,
    ...raw,
    running: false,
    teamStats: hasAny ? teamStats : { ...emptyTeamStats(), ...derived },
    foulMap: raw.foulMap || { cometidas: [], recibidas: [] },
    events: raw.events || [],
    slots: raw.slots || {},
    enteredAt: raw.enteredAt || {},
    playedOff: raw.playedOff || {},
  }
}

export function hydrateSnapshot(args: {
  notasPre?: string | null
  titulares?: { id: string; posicion?: string | null }[]
  formationSlots?: { id: string; position: string }[]
  informeStats?: TeamStatsState | null
  foulMap?: { cometidas: FoulDot[]; recibidas: FoulDot[] } | null
}): AnotadorSnapshot {
  const parsed = parseNotasPre(args.notasPre)
  if (parsed.anotador) {
    const snap = normalizeSnapshot(parsed.anotador)
    if (!Object.values(snap.teamStats).some((n) => n > 0) && args.informeStats) {
      snap.teamStats = { ...emptyTeamStats(), ...args.informeStats }
    }
    if (!snap.foulMap.cometidas.length && !snap.foulMap.recibidas.length && args.foulMap) {
      snap.foulMap = args.foulMap
    }
    return snap
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
    teamStats: { ...emptyTeamStats(), ...(args.informeStats || {}) },
    foulMap: args.foulMap || { cometidas: [], recibidas: [] },
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

export function golesDetalleFromEvents(
  events: AnotadorEvent[],
  nameOf: (convId?: string) => string,
): {
  favor: { minuto: number; es_abp: boolean; tipo_gol?: string; tipo_abp?: string; zona?: string; jugador?: string; asistencia?: string }[]
  contra: { minuto: number; es_abp: boolean; tipo_gol?: string; tipo_abp?: string; zona?: string; jugador?: string }[]
} {
  const favor: { minuto: number; es_abp: boolean; tipo_gol?: string; tipo_abp?: string; zona?: string; jugador?: string; asistencia?: string }[] = []
  const contra: { minuto: number; es_abp: boolean; tipo_gol?: string; tipo_abp?: string; zona?: string; jugador?: string }[] = []
  for (const ev of events) {
    if (ev.type === 'gol') {
      const row: (typeof favor)[number] = {
        minuto: ev.minute,
        es_abp: Boolean(ev.es_abp),
      }
      if (ev.tipo_gol) row.tipo_gol = ev.tipo_gol
      if (ev.tipo_abp) row.tipo_abp = ev.tipo_abp
      if (ev.zona) row.zona = ev.zona
      const n = nameOf(ev.convId)
      if (n) row.jugador = n
      const a = nameOf(ev.relatedConvId)
      if (a) row.asistencia = a
      favor.push(row)
    }
    if (ev.type === 'gol_contra') {
      const row: (typeof contra)[number] = {
        minuto: ev.minute,
        es_abp: Boolean(ev.es_abp),
      }
      if (ev.tipo_gol) row.tipo_gol = ev.tipo_gol
      if (ev.tipo_abp) row.tipo_abp = ev.tipo_abp
      if (ev.zona) row.zona = ev.zona
      const n = nameOf(ev.convId)
      if (n) row.jugador = n
      contra.push(row)
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

function tipoLabel(ev: AnotadorEvent): string {
  if (ev.es_abp) {
    const abp = TIPO_ABP_OPTIONS.find((o) => o.value === ev.tipo_abp)
    return abp ? ` ABP ${abp.label}` : ' ABP'
  }
  const t = TIPO_GOL_OPTIONS.find((o) => o.value === ev.tipo_gol)
  return t && t.value !== 'otro' ? ` ${t.label}` : ''
}

export function eventLabel(ev: AnotadorEvent, nameOf: (id?: string) => string): string {
  const who = nameOf(ev.convId) || '—'
  const side = ev.side === 'rival' ? ' rival' : ''
  switch (ev.type) {
    case 'gol':
      return `${ev.minute}' Gol ${who}${tipoLabel(ev)}${ev.relatedConvId ? ` (asiste ${nameOf(ev.relatedConvId)})` : ''}`
    case 'gol_contra':
      return `${ev.minute}' Gol rival${tipoLabel(ev)}`
    case 'amarilla':
      return `${ev.minute}' Amarilla${side} ${ev.convId ? who : ''}`.trim()
    case 'roja':
      return `${ev.minute}' Roja${side} ${ev.convId ? who : ''}`.trim()
    case 'cambio':
      return `${ev.minute}' Cambio ${who} → ${nameOf(ev.relatedConvId)}`
    case 'corner':
      return `${ev.minute}' Córner${side}`
    case 'falta':
      return `${ev.minute}' Falta${side}`
    default:
      return `${ev.minute}'`
  }
}

export function informeStatsFromUnknown(data: Record<string, unknown> | null | undefined): TeamStatsState {
  const stats = emptyTeamStats()
  if (!data) return stats
  for (const f of TEAM_STAT_FIELDS) {
    const v = data[f.key]
    const r = data[`rival_${f.key}`]
    if (typeof v === 'number') stats[f.key] = v
    if (typeof r === 'number') stats[`rival_${f.key}`] = r
  }
  return stats
}
