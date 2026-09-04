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
  rivalDorsal?: number
}

export interface FoulDot {
  x: number
  y: number
}

export type AttackLane = 'izq' | 'cen' | 'dch'
export type FoulMap = { cometidas: FoulDot[]; recibidas: FoulDot[] }

export interface OccasionLaneState {
  us: Record<AttackLane, number>
  rival: Record<AttackLane, number>
}

export interface PeriodState {
  teamStats: TeamStatsState
  occasionLanes: OccasionLaneState
  foulMap: FoulMap
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
  half2Ms: number
  started: boolean
  closed: boolean
  closedAt?: string
  events: AnotadorEvent[]
  enteredAt: Record<string, number>
  playedOff: Record<string, number>
  teamStats: TeamStatsState
  foulMap: FoulMap
  occasionLanes: OccasionLaneState
  periods: Record<AnotadorHalf, PeriodState>
  rivalDorsals: number[]
}

export interface PeriodReportRow {
  key: string
  label: string
  p1us: number
  p1rival: number
  p2us: number
  p2rival: number
  tus: number
  trival: number
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

export function emptyOccasionLanes(): OccasionLaneState {
  return {
    us: { izq: 0, cen: 0, dch: 0 },
    rival: { izq: 0, cen: 0, dch: 0 },
  }
}

export function emptyFoulMap(): FoulMap {
  return { cometidas: [], recibidas: [] }
}

export function emptyPeriod(): PeriodState {
  return {
    teamStats: emptyTeamStats(),
    occasionLanes: emptyOccasionLanes(),
    foulMap: emptyFoulMap(),
  }
}

export function emptyPeriods(): Record<AnotadorHalf, PeriodState> {
  return { 1: emptyPeriod(), 2: emptyPeriod() }
}

export function clonePeriod(raw?: Partial<PeriodState> | null): PeriodState {
  const base = emptyPeriod()
  return {
    teamStats: { ...base.teamStats, ...(raw?.teamStats || {}) },
    occasionLanes: {
      us: { ...base.occasionLanes.us, ...(raw?.occasionLanes?.us || {}) },
      rival: { ...base.occasionLanes.rival, ...(raw?.occasionLanes?.rival || {}) },
    },
    foulMap: {
      cometidas: [...(raw?.foulMap?.cometidas || [])],
      recibidas: [...(raw?.foulMap?.recibidas || [])],
    },
  }
}

export function clonePeriods(
  raw?: Partial<Record<AnotadorHalf, Partial<PeriodState>>> | null,
): Record<AnotadorHalf, PeriodState> {
  return { 1: clonePeriod(raw?.[1]), 2: clonePeriod(raw?.[2]) }
}

export function addTeamStats(a: TeamStatsState, b: TeamStatsState): TeamStatsState {
  const out = emptyTeamStats()
  for (const key of Object.keys(out)) {
    out[key] = (a[key] || 0) + (b[key] || 0)
  }
  return out
}

export function addOccasionLanes(a: OccasionLaneState, b: OccasionLaneState): OccasionLaneState {
  return {
    us: {
      izq: a.us.izq + b.us.izq,
      cen: a.us.cen + b.us.cen,
      dch: a.us.dch + b.us.dch,
    },
    rival: {
      izq: a.rival.izq + b.rival.izq,
      cen: a.rival.cen + b.rival.cen,
      dch: a.rival.dch + b.rival.dch,
    },
  }
}

export function addFoulMaps(a: FoulMap, b: FoulMap): FoulMap {
  return {
    cometidas: [...a.cometidas, ...b.cometidas],
    recibidas: [...a.recibidas, ...b.recibidas],
  }
}

export function totalsFromPeriods(periods: Record<AnotadorHalf, PeriodState>): {
  teamStats: TeamStatsState
  occasionLanes: OccasionLaneState
  foulMap: FoulMap
} {
  const p1 = applyFoulMapCounts(periods[1])
  const p2 = applyFoulMapCounts(periods[2])
  const occasionLanes = addOccasionLanes(p1.occasionLanes, p2.occasionLanes)
  return {
    teamStats: {
      ...addTeamStats(p1.teamStats, p2.teamStats),
      ocasiones_gol: totalOccasionsFromLanes(occasionLanes, 'us'),
      rival_ocasiones_gol: totalOccasionsFromLanes(occasionLanes, 'rival'),
    },
    occasionLanes,
    foulMap: addFoulMaps(p1.foulMap, p2.foulMap),
  }
}

export function applyFoulMapCounts(period: PeriodState): PeriodState {
  const nextStats = { ...period.teamStats }
  if (period.foulMap.cometidas.length > 0) {
    nextStats.faltas_cometidas = period.foulMap.cometidas.length
  }
  if (period.foulMap.recibidas.length > 0) {
    nextStats.rival_faltas_cometidas = period.foulMap.recibidas.length
  }
  return { ...period, teamStats: nextStats }
}

export function withSyncedTotals(snapshot: AnotadorSnapshot): AnotadorSnapshot {
  return { ...snapshot, ...totalsFromPeriods(snapshot.periods) }
}

export function currentPeriod(snapshot: AnotadorSnapshot): PeriodState {
  return snapshot.periods[snapshot.half] || emptyPeriod()
}

const HALF_MS = 45 * 60_000

function stampedHalfMs(elapsedMs: number, previous = 0): number {
  if (elapsedMs >= 60_000) return elapsedMs
  if (previous >= 60_000) return previous
  return HALF_MS
}

export function setActiveHalf(snapshot: AnotadorSnapshot, half: AnotadorHalf): AnotadorSnapshot {
  if (snapshot.half === half) return snapshot
  const next: AnotadorSnapshot = {
    ...snapshot,
    running: false,
    half,
  }
  if (snapshot.half === 1) next.half1Ms = stampedHalfMs(snapshot.elapsedMs, snapshot.half1Ms)
  if (snapshot.half === 2) next.half2Ms = stampedHalfMs(snapshot.elapsedMs, snapshot.half2Ms)
  next.elapsedMs = half === 1 ? (snapshot.half1Ms || 0) : (snapshot.half2Ms || 0)
  return next
}

export function closeMatch(snapshot: AnotadorSnapshot): AnotadorSnapshot {
  const paused = snapshot.half === 1
    ? { ...snapshot, running: false, half1Ms: stampedHalfMs(snapshot.elapsedMs, snapshot.half1Ms) }
    : { ...snapshot, running: false, half2Ms: stampedHalfMs(snapshot.elapsedMs, snapshot.half2Ms) }
  return { ...paused, closed: true, closedAt: new Date().toISOString() }
}

export function secondHalfStarted(snapshot: AnotadorSnapshot): boolean {
  return snapshot.half === 2
    || Boolean(snapshot.closed)
    || (snapshot.half2Ms || 0) > 0
    || (snapshot.events || []).some((ev) => ev.half === 2)
}

export function effectiveMatchMinute(snapshot: AnotadorSnapshot): number {
  const clock = matchMinute(snapshot.half, snapshot.elapsedMs)
  const eventMax = (snapshot.events || []).reduce((max, ev) => Math.max(max, ev.minute || 0), 0)
  const h1 = snapshot.half1Ms || 0
  const h2 = snapshot.half2Ms || 0
  const stamped = h2 >= 60_000
    ? matchMinute(2, h2)
    : h1 >= 60_000
      ? matchMinute(1, h1)
      : 0
  const assumed = snapshot.closed
    ? (secondHalfStarted(snapshot) ? 90 : 45)
    : 0
  return Math.max(clock, eventMax, stamped, assumed)
}

export function reopenMatch(snapshot: AnotadorSnapshot): AnotadorSnapshot {
  return { ...snapshot, closed: false, closedAt: undefined, running: false }
}

function hasPeriodPayload(raw: Partial<AnotadorSnapshot> | null | undefined): boolean {
  const periods = raw?.periods
  if (!periods) return false
  return Boolean(periods[1] || periods[2])
}

function periodFoulsEmpty(periods: Record<AnotadorHalf, PeriodState>): boolean {
  return periods[1].foulMap.cometidas.length
    + periods[1].foulMap.recibidas.length
    + periods[2].foulMap.cometidas.length
    + periods[2].foulMap.recibidas.length === 0
}

export function migrateLegacyPeriods(raw: Partial<AnotadorSnapshot>): Record<AnotadorHalf, PeriodState> {
  if (hasPeriodPayload(raw)) {
    const periods = clonePeriods(raw.periods)
    const top = raw.foulMap
    const topCount = (top?.cometidas?.length || 0) + (top?.recibidas?.length || 0)
    if (periodFoulsEmpty(periods) && topCount > 0) {
      periods[1].foulMap = {
        cometidas: [...(top?.cometidas || [])],
        recibidas: [...(top?.recibidas || [])],
      }
    }
    const hasPeriodStats = Object.values(periods[1].teamStats).some((n) => n > 0)
      || Object.values(periods[2].teamStats).some((n) => n > 0)
    if (!hasPeriodStats && raw.teamStats && Object.values(raw.teamStats).some((n) => n > 0)) {
      periods[1].teamStats = { ...emptyTeamStats(), ...raw.teamStats }
    }
    return periods
  }
  const legacy = clonePeriod({
    teamStats: raw.teamStats,
    occasionLanes: raw.occasionLanes,
    foulMap: raw.foulMap,
  })
  return { 1: legacy, 2: emptyPeriod() }
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
  half2Ms: 0,
  started: false,
  closed: false,
  events: [],
  enteredAt: {},
  playedOff: {},
  teamStats: emptyTeamStats(),
  foulMap: emptyFoulMap(),
  occasionLanes: emptyOccasionLanes(),
  periods: emptyPeriods(),
  rivalDorsals: [],
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

export function isPenaltyGoal(ev?: AnotadorEvent | null): boolean {
  return Boolean(ev && (ev.type === 'gol' || ev.type === 'gol_contra') && ev.es_abp && ev.tipo_abp === 'penalti')
}

export function goalSide(ev: AnotadorEvent): AnotadorSide {
  if (ev.side) return ev.side
  return ev.type === 'gol_contra' ? 'rival' : 'us'
}

export function nudgeElapsed(elapsedMs: number, deltaMs: number): number {
  return Math.max(0, elapsedMs + deltaMs)
}

export function normalizeFoulDot(dot: FoulDot, dirRight: boolean): FoulDot {
  if (dirRight) return dot
  return { x: Math.round((150 - dot.x) * 10) / 10, y: dot.y }
}

export function denormalizeFoulDot(dot: FoulDot, dirRight: boolean): FoulDot {
  return normalizeFoulDot(dot, dirRight)
}

export function totalOccasionsFromLanes(lanes: OccasionLaneState, side: AnotadorSide): number {
  const row = lanes[side]
  return row.izq + row.cen + row.dch
}

export function bumpOccasionLane(
  lanes: OccasionLaneState,
  side: AnotadorSide,
  lane: AttackLane,
  delta: number,
): OccasionLaneState {
  const next = {
    us: { ...lanes.us },
    rival: { ...lanes.rival },
  }
  next[side][lane] = Math.max(0, next[side][lane] + delta)
  return next
}

export function bumpPeriodStat(
  snapshot: AnotadorSnapshot,
  key: string,
  side: AnotadorSide,
  delta: number,
  half: AnotadorHalf = snapshot.half,
): AnotadorSnapshot {
  const periods = clonePeriods(snapshot.periods)
  periods[half].teamStats = bumpStat(periods[half].teamStats, key, side, delta)
  return withSyncedTotals({ ...snapshot, periods })
}

export function bumpPeriodOccasion(
  snapshot: AnotadorSnapshot,
  side: AnotadorSide,
  lane: AttackLane,
  delta: number,
  half: AnotadorHalf = snapshot.half,
): AnotadorSnapshot {
  const periods = clonePeriods(snapshot.periods)
  periods[half].occasionLanes = bumpOccasionLane(periods[half].occasionLanes, side, lane, delta)
  periods[half].teamStats = {
    ...periods[half].teamStats,
    ocasiones_gol: totalOccasionsFromLanes(periods[half].occasionLanes, 'us'),
    rival_ocasiones_gol: totalOccasionsFromLanes(periods[half].occasionLanes, 'rival'),
  }
  return withSyncedTotals({ ...snapshot, periods })
}

export function setPeriodFoulMap(
  snapshot: AnotadorSnapshot,
  foulMap: FoulMap,
  half: AnotadorHalf = snapshot.half,
): AnotadorSnapshot {
  const periods = clonePeriods(snapshot.periods)
  periods[half].foulMap = {
    cometidas: [...foulMap.cometidas],
    recibidas: [...foulMap.recibidas],
  }
  periods[half].teamStats = {
    ...periods[half].teamStats,
    faltas_cometidas: foulMap.cometidas.length,
    rival_faltas_cometidas: foulMap.recibidas.length,
  }
  return withSyncedTotals({ ...snapshot, periods })
}

export function addRivalDorsal(snapshot: AnotadorSnapshot, dorsal: number): AnotadorSnapshot {
  const n = Math.trunc(dorsal)
  if (!Number.isFinite(n) || n < 0 || n > 99) return snapshot
  const current = snapshot.rivalDorsals || []
  if (current.includes(n)) return snapshot
  return { ...snapshot, rivalDorsals: [...current, n].sort((a, b) => a - b) }
}

export function removeRivalDorsal(snapshot: AnotadorSnapshot, dorsal: number): AnotadorSnapshot {
  return {
    ...snapshot,
    rivalDorsals: (snapshot.rivalDorsals || []).filter((d) => d !== dorsal),
  }
}

export function rivalDorsalLabel(dorsal?: number): string {
  return dorsal == null ? '' : `#${dorsal}`
}

export function scoreFromEventsByHalf(events: AnotadorEvent[]): Record<AnotadorHalf, { gf: number; gc: number }> {
  return {
    1: scoreFromEvents(events.filter((ev) => ev.half === 1)),
    2: scoreFromEvents(events.filter((ev) => ev.half === 2)),
  }
}

export function golesPorPeriodoFromEvents(events: AnotadorEvent[]): Record<string, number> {
  const out: Record<string, number> = {
    '1a_favor': 0,
    '2a_favor': 0,
    '1a_contra': 0,
    '2a_contra': 0,
  }
  for (const ev of events) {
    const halfKey = ev.half === 2 ? '2a' : '1a'
    if (ev.type === 'gol') out[`${halfKey}_favor`] += 1
    if (ev.type === 'gol_contra') out[`${halfKey}_contra`] += 1
  }
  return out
}

export function periodReport(snapshot: AnotadorSnapshot): {
  score1: { gf: number; gc: number }
  score2: { gf: number; gc: number }
  total: { gf: number; gc: number }
  rows: PeriodReportRow[]
  lanes: PeriodReportRow[]
  fouls: { cometidas1: number; recibidas1: number; cometidas2: number; recibidas2: number }
  closed: boolean
} {
  const p1 = snapshot.periods?.[1] || emptyPeriod()
  const p2 = snapshot.periods?.[2] || emptyPeriod()
  const byHalf = scoreFromEventsByHalf(snapshot.events || [])
  const rows = TEAM_STAT_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    p1us: p1.teamStats[field.key] || 0,
    p1rival: p1.teamStats[`rival_${field.key}`] || 0,
    p2us: p2.teamStats[field.key] || 0,
    p2rival: p2.teamStats[`rival_${field.key}`] || 0,
    tus: (p1.teamStats[field.key] || 0) + (p2.teamStats[field.key] || 0),
    trival: (p1.teamStats[`rival_${field.key}`] || 0) + (p2.teamStats[`rival_${field.key}`] || 0),
  }))
  const laneMeta = [
    { key: 'izq', label: 'Ocasiones izq' },
    { key: 'cen', label: 'Ocasiones cen' },
    { key: 'dch', label: 'Ocasiones dch' },
  ] as const
  const lanes = laneMeta.map((lane) => ({
    key: `oc_${lane.key}`,
    label: lane.label,
    p1us: p1.occasionLanes.us[lane.key],
    p1rival: p1.occasionLanes.rival[lane.key],
    p2us: p2.occasionLanes.us[lane.key],
    p2rival: p2.occasionLanes.rival[lane.key],
    tus: p1.occasionLanes.us[lane.key] + p2.occasionLanes.us[lane.key],
    trival: p1.occasionLanes.rival[lane.key] + p2.occasionLanes.rival[lane.key],
  }))
  return {
    score1: byHalf[1],
    score2: byHalf[2],
    total: scoreFromEvents(snapshot.events || []),
    rows,
    lanes,
    fouls: {
      cometidas1: p1.foulMap.cometidas.length,
      recibidas1: p1.foulMap.recibidas.length,
      cometidas2: p2.foulMap.cometidas.length,
      recibidas2: p2.foulMap.recibidas.length,
    },
    closed: Boolean(snapshot.closed),
  }
}

export function statsPeriodosPayload(snapshot: AnotadorSnapshot) {
  const report = periodReport(snapshot)
  const pack = (period: PeriodState, score: { gf: number; gc: number }) => ({
    ...period.teamStats,
    goles_favor: score.gf,
    goles_contra: score.gc,
    occasionLanes: period.occasionLanes,
    foulMap: period.foulMap,
  })
  return {
    '1': pack(snapshot.periods[1], report.score1),
    '2': pack(snapshot.periods[2], report.score2),
    total: {
      ...snapshot.teamStats,
      goles_favor: report.total.gf,
      goles_contra: report.total.gc,
    },
    closed: snapshot.closed,
    closedAt: snapshot.closedAt || null,
  }
}

export function periodReportFromNotasPre(raw?: string | null) {
  const parsed = parseNotasPre(raw)
  if (!parsed.anotador) return null
  return periodReport(normalizeSnapshot(parsed.anotador))
}

export function remapFormationSlots(
  prev: Record<string, string>,
  oldDefs: { id: string; position: string }[],
  newDefs: { id: string; position: string }[],
): Record<string, string> {
  const next: Record<string, string> = {}
  const used = new Set<string>()
  const oldById = new Map(oldDefs.map((s) => [s.id, s]))
  const occupied = Object.entries(prev).filter(([, convId]) => Boolean(convId))

  for (const [slotId, convId] of occupied) {
    if (newDefs.some((s) => s.id === slotId) && !used.has(convId)) {
      next[slotId] = convId
      used.add(convId)
    }
  }

  for (const [slotId, convId] of occupied) {
    if (used.has(convId)) continue
    const pos = oldById.get(slotId)?.position
    const dest = newDefs.find((s) => s.position === pos && !next[s.id])
    if (dest) {
      next[dest.id] = convId
      used.add(convId)
    }
  }

  for (const [, convId] of occupied) {
    if (used.has(convId)) continue
    const dest = newDefs.find((s) => !next[s.id])
    if (dest) {
      next[dest.id] = convId
      used.add(convId)
    }
  }

  return next
}

export function patchGoalEvent(
  snapshot: AnotadorSnapshot,
  id: string,
  patch: Partial<AnotadorEvent>,
): AnotadorSnapshot {
  const before = snapshot.events.find((ev) => ev.id === id)
  const events = snapshot.events.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev))
  const after = events.find((ev) => ev.id === id)
  let next: AnotadorSnapshot = { ...snapshot, events }
  if (before && after && isPenaltyGoal(before) !== isPenaltyGoal(after)) {
    next = bumpPeriodStat(
      next,
      'penaltis',
      goalSide(after),
      isPenaltyGoal(after) ? 1 : -1,
      after.half || snapshot.half,
    )
  }
  return next
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

export function ensureEventStatsInPeriods(
  periods: Record<AnotadorHalf, PeriodState>,
  events: AnotadorEvent[],
): Record<AnotadorHalf, PeriodState> {
  const next = clonePeriods(periods)
  const byHalf: Record<AnotadorHalf, AnotadorEvent[]> = { 1: [], 2: [] }
  for (const ev of events) {
    byHalf[ev.half === 2 ? 2 : 1].push(ev)
  }
  for (const half of [1, 2] as const) {
    const derived = teamStatsFromEvents(byHalf[half])
    for (const key of Object.keys(next[half].teamStats)) {
      next[half].teamStats[key] = Math.max(next[half].teamStats[key] || 0, derived[key] || 0)
    }
  }
  return next
}

export function normalizeSnapshot(raw: AnotadorSnapshot): AnotadorSnapshot {
  const periods = ensureEventStatsInPeriods(
    migrateLegacyPeriods(raw),
    raw.events || [],
  )
  return withSyncedTotals({
    ...DEFAULT_ANOTADOR,
    ...raw,
    running: false,
    closed: Boolean(raw.closed),
    half2Ms: raw.half2Ms || 0,
    periods,
    events: raw.events || [],
    slots: raw.slots || {},
    enteredAt: raw.enteredAt || {},
    playedOff: raw.playedOff || {},
    rivalDorsals: Array.isArray(raw.rivalDorsals)
      ? raw.rivalDorsals.filter((n) => Number.isInteger(n) && n >= 0 && n <= 99)
      : [],
  })
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
    let snap = normalizeSnapshot(parsed.anotador)
    if (!Object.values(snap.teamStats).some((n) => n > 0) && args.informeStats) {
      const periods = clonePeriods(snap.periods)
      periods[1].teamStats = { ...emptyTeamStats(), ...args.informeStats }
      snap = withSyncedTotals({ ...snap, periods })
    }
    if (!snap.foulMap.cometidas.length && !snap.foulMap.recibidas.length && args.foulMap) {
      const periods = clonePeriods(snap.periods)
      periods[1].foulMap = args.foulMap
      snap = withSyncedTotals({ ...snap, periods })
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
    foulMap: args.foulMap || emptyFoulMap(),
    occasionLanes: emptyOccasionLanes(),
    periods: {
      1: clonePeriod({
        teamStats: { ...emptyTeamStats(), ...(args.informeStats || {}) },
        occasionLanes: emptyOccasionLanes(),
        foulMap: args.foulMap || emptyFoulMap(),
      }),
      2: emptyPeriod(),
    },
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
    const entered = snapshot.enteredAt[id]
    if (onField.has(id) && entered != null) {
      out[id] = closed + Math.max(0, nowMinute - entered)
    } else if (onField.has(id) && entered == null && nowMinute > 0) {
      out[id] = nowMinute
    } else {
      out[id] = closed
    }
  }
  return out
}

export function hasAnotadorLiveData(snapshot: AnotadorSnapshot): boolean {
  return snapshot.started
    || Boolean(snapshot.closed)
    || (snapshot.events || []).length > 0
    || Object.values(snapshot.teamStats || {}).some((n) => n > 0)
    || (snapshot.foulMap?.cometidas.length || 0) > 0
    || (snapshot.foulMap?.recibidas.length || 0) > 0
    || (snapshot.periods?.[1]?.foulMap.cometidas.length || 0) > 0
    || (snapshot.periods?.[2]?.foulMap.cometidas.length || 0) > 0
    || (snapshot.periods?.[1]?.foulMap.recibidas.length || 0) > 0
    || (snapshot.periods?.[2]?.foulMap.recibidas.length || 0) > 0
}

export function informeFromSnapshot(
  snapshot: AnotadorSnapshot,
  convIds: string[],
  nameOf: (id?: string) => string,
) {
  const snap = withSyncedTotals(normalizeSnapshot(snapshot))
  const now = effectiveMatchMinute(snap)
  return {
    snap,
    now,
    playerRows: computePlayerRows(snap, convIds, now),
    score: scoreFromEvents(snap.events),
    goles: golesDetalleFromEvents(snap.events, nameOf),
    teamStats: snap.teamStats,
    foulMap: snap.foulMap,
    report: periodReport(snap),
  }
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
      const n = nameOf(ev.convId) || (ev.rivalDorsal != null ? `#${ev.rivalDorsal}` : '')
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
  const rivalNum = ev.rivalDorsal != null ? ` #${ev.rivalDorsal}` : ''
  const who = nameOf(ev.convId) || rivalNum.trim() || '—'
  const side = ev.side === 'rival' ? ' rival' : ''
  switch (ev.type) {
    case 'gol':
      return `${ev.minute}' Gol ${who}${tipoLabel(ev)}${ev.relatedConvId ? ` (asiste ${nameOf(ev.relatedConvId)})` : ''}`
    case 'gol_contra':
      return `${ev.minute}' Gol rival${rivalNum}${tipoLabel(ev)}`
    case 'amarilla':
      return `${ev.minute}' Amarilla${side} ${ev.side === 'rival' ? rivalNum.trim() : (ev.convId ? who : '')}`.trim()
    case 'roja':
      return `${ev.minute}' Roja${side} ${ev.side === 'rival' ? rivalNum.trim() : (ev.convId ? who : '')}`.trim()
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
