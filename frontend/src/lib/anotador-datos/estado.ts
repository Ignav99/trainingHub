/**
 * Estado del partido, aplicación de operaciones y fusión entre dispositivos.
 * Todo puro (sin red, sin almacenamiento, sin React) y conmutativo: aplicar las
 * mismas operaciones en cualquier orden, o repetidas, da el mismo estado.
 *
 * Reglas de fusión (documentadas en docs/design/anotador-datos.md):
 *  - eventos: unión por `id`; el más reciente gana si ambos lados lo tienen;
 *    un borrado gana salvo que exista una edición POSTERIOR (nunca se pierde un dato).
 *  - reloj y cierre: gana el lado con mayor `rev` (Lamport).
 *  - alineación, config: gana el sello más reciente (ts).
 *  - estadísticas por periodo: mismo dispositivo = el más reciente; dispositivos
 *    distintos = máximo por contador y unión de puntos de falta.
 *  - dorsales rivales: unión. Reflexión: el más reciente; si divergen, se concatenan.
 *  - valoraciones: la más reciente por jugador.
 */
import type { AnotadorEvent, AnotadorHalf, AnotadorSnapshot, PeriodState } from '../anotador'
import {
  VERSION_ESQUEMA,
  type AlineacionState,
  type EstadoPartido,
  type MetaSync,
  type Op,
  type OpInput,
  type RelojState,
  type Seccion,
  type Sello,
} from './tipos.ts'

const uniq = <T,>(a: Iterable<T>): T[] => Array.from(new Set(a))
const SELLO_CERO: Sello = { rev: 0, ts: 0, dev: '' }

// ---------------------------------------------------------------- utilidades

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`
}

/** JSON con claves ordenadas: sirve para comparar contenido. */
export function canon(v: unknown): string {
  return JSON.stringify(v, (_k, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(val).sort()) {
        const x = (val as Record<string, unknown>)[k]
        if (x !== undefined) out[k] = x
      }
      return out
    }
    return val
  })
}

function clonar<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T)
}

/** ¿`a` es estrictamente más reciente que `b`? Dentro de un dispositivo manda `rev`; entre dispositivos, `rev` (Lamport). */
export function mayorPorRev(a: Sello | undefined, b: Sello | undefined): boolean {
  const x = a || SELLO_CERO
  const y = b || SELLO_CERO
  if (x.dev === y.dev) return x.rev > y.rev
  if (x.rev !== y.rev) return x.rev > y.rev
  if (x.ts !== y.ts) return x.ts > y.ts
  return x.dev > y.dev
}

/** Igual, pero entre dispositivos manda el reloj de pared (`ts`). */
export function mayorPorTs(a: Sello | undefined, b: Sello | undefined): boolean {
  const x = a || SELLO_CERO
  const y = b || SELLO_CERO
  if (x.dev === y.dev) return x.rev > y.rev
  if (x.ts !== y.ts) return x.ts > y.ts
  if (x.rev !== y.rev) return x.rev > y.rev
  return x.dev > y.dev
}

function selloDe(op: { rev: number; ts: number; deviceId: string }): Sello {
  return { rev: op.rev, ts: op.ts, dev: op.deviceId }
}

// ------------------------------------------------------------------ totales

const LANES = ['izq', 'cen', 'dch'] as const

function totalesDe(periods: Record<AnotadorHalf, PeriodState>) {
  const ps = [periods[1], periods[2]].map((p) => {
    const stats = { ...p.teamStats }
    if (p.foulMap.cometidas.length > 0) stats.faltas_cometidas = p.foulMap.cometidas.length
    if (p.foulMap.recibidas.length > 0) stats.rival_faltas_cometidas = p.foulMap.recibidas.length
    return { ...p, teamStats: stats }
  })
  const teamStats: Record<string, number> = {}
  for (const p of ps) for (const [k, v] of Object.entries(p.teamStats)) teamStats[k] = (teamStats[k] || 0) + (v || 0)
  const occasionLanes = {
    us: { izq: 0, cen: 0, dch: 0 },
    rival: { izq: 0, cen: 0, dch: 0 },
  }
  for (const p of ps) for (const side of ['us', 'rival'] as const) for (const l of LANES) occasionLanes[side][l] += p.occasionLanes?.[side]?.[l] || 0
  teamStats.ocasiones_gol = LANES.reduce((s, l) => s + occasionLanes.us[l], 0)
  teamStats.rival_ocasiones_gol = LANES.reduce((s, l) => s + occasionLanes.rival[l], 0)
  return {
    teamStats,
    occasionLanes,
    foulMap: {
      cometidas: [...ps[0].foulMap.cometidas, ...ps[1].foulMap.cometidas],
      recibidas: [...ps[0].foulMap.recibidas, ...ps[1].foulMap.recibidas],
    },
  }
}

function periodoVacio(): PeriodState {
  return {
    teamStats: {},
    occasionLanes: { us: { izq: 0, cen: 0, dch: 0 }, rival: { izq: 0, cen: 0, dch: 0 } },
    foulMap: { cometidas: [], recibidas: [] },
  }
}

function combinarPeriodo(a: PeriodState, b: PeriodState): PeriodState {
  const teamStats: Record<string, number> = {}
  for (const k of uniq([...Object.keys(a.teamStats || {}), ...Object.keys(b.teamStats || {})])) {
    teamStats[k] = Math.max(a.teamStats?.[k] || 0, b.teamStats?.[k] || 0)
  }
  const lanes = { us: { izq: 0, cen: 0, dch: 0 }, rival: { izq: 0, cen: 0, dch: 0 } }
  for (const side of ['us', 'rival'] as const) {
    for (const l of LANES) lanes[side][l] = Math.max(a.occasionLanes?.[side]?.[l] || 0, b.occasionLanes?.[side]?.[l] || 0)
  }
  const union = (x: { x: number; y: number }[] = [], y: { x: number; y: number }[] = []) => {
    const seen = new Set<string>()
    const out: { x: number; y: number }[] = []
    for (const d of [...x, ...y]) {
      const key = `${d.x}|${d.y}`
      if (!seen.has(key)) {
        seen.add(key)
        out.push(d)
      }
    }
    return out
  }
  return {
    teamStats,
    occasionLanes: lanes,
    foulMap: {
      cometidas: union(a.foulMap?.cometidas, b.foulMap?.cometidas),
      recibidas: union(a.foulMap?.recibidas, b.foulMap?.recibidas),
    },
  }
}

// ------------------------------------------------------------------- estado

export function nuevoMeta(deviceId: string): MetaSync {
  return { v: VERSION_ESQUEMA, rev: 0, deviceId, tombstones: {}, evSello: {}, sec: {}, notasSello: {}, huecos: [] }
}

export function snapshotVacio(): AnotadorSnapshot {
  const p = () => periodoVacio()
  const periods = { 1: p(), 2: p() }
  return {
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
    periods,
    rivalDorsals: [],
    ...totalesDe(periods),
  }
}

export function estadoDesdeSnapshot(
  snapshot: AnotadorSnapshot,
  deviceId: string,
  extra: { reflexion?: string; notas?: Record<string, number | null> } = {},
): EstadoPartido {
  return {
    snapshot: clonar(snapshot),
    reflexion: extra.reflexion || '',
    notas: { ...(extra.notas || {}) },
    meta: nuevoMeta(deviceId),
  }
}

export function estadoVacio(deviceId: string): EstadoPartido {
  return estadoDesdeSnapshot(snapshotVacio(), deviceId)
}

/** Lo que se escribe en `notas_pre.anotador`: el snapshot de siempre + `sync` con los metadatos. */
export function empaquetar(estado: EstadoPartido): AnotadorSnapshot & { sync: Record<string, unknown> } {
  return {
    ...estado.snapshot,
    running: false,
    sync: { ...estado.meta, reflexion: estado.reflexion, notas: estado.notas },
  }
}

/** Inversa de `empaquetar`. Acepta snapshots antiguos sin `sync` (meta vacía, sin sellos). */
export function desempaquetar(raw: unknown, deviceId = 'remoto'): EstadoPartido | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.events)) return null
  const { sync, ...resto } = o
  const base = snapshotVacio()
  const snapshot = { ...base, ...(resto as unknown as AnotadorSnapshot), running: false }
  snapshot.events = (o.events as AnotadorEvent[]).filter((e) => e && typeof e === 'object' && typeof e.id === 'string')
  if (!snapshot.periods || !snapshot.periods[1] || !snapshot.periods[2]) snapshot.periods = base.periods
  const s = (sync && typeof sync === 'object' ? sync : {}) as Partial<MetaSync> & { reflexion?: string; notas?: Record<string, number | null> }
  const meta: MetaSync = {
    ...nuevoMeta(typeof s.deviceId === 'string' && s.deviceId ? s.deviceId : deviceId),
    rev: Number.isFinite(s.rev) ? Number(s.rev) : 0,
    tombstones: s.tombstones && typeof s.tombstones === 'object' ? s.tombstones : {},
    evSello: s.evSello && typeof s.evSello === 'object' ? s.evSello : {},
    sec: s.sec && typeof s.sec === 'object' ? s.sec : {},
    notasSello: s.notasSello && typeof s.notasSello === 'object' ? s.notasSello : {},
    huecos: Array.isArray(s.huecos) ? s.huecos : [],
  }
  return {
    snapshot,
    reflexion: typeof s.reflexion === 'string' ? s.reflexion : '',
    notas: s.notas && typeof s.notas === 'object' ? s.notas : {},
    meta,
  }
}

// --------------------------------------------------------------- operaciones

export function crearOp(
  estado: EstadoPartido,
  partidoId: string,
  input: OpInput,
  ctx: { deviceId: string; now: number; opId?: string },
): Op {
  return {
    ...input,
    v: VERSION_ESQUEMA,
    opId: ctx.opId || uuid(),
    partidoId,
    deviceId: ctx.deviceId,
    rev: estado.meta.rev + 1,
    ts: ctx.now,
  } as Op
}

function relojDe(s: AnotadorSnapshot): RelojState {
  return { half: s.half, running: s.running, elapsedMs: s.elapsedMs, half1Ms: s.half1Ms, half2Ms: s.half2Ms, started: s.started }
}

function alineacionDe(s: AnotadorSnapshot): AlineacionState {
  return {
    form: s.form,
    slots: s.slots || {},
    enteredAt: s.enteredAt || {},
    playedOff: s.playedOff || {},
    kickoffSlots: s.kickoffSlots,
    kickoffForm: s.kickoffForm,
  }
}

function ordenarEventos(events: AnotadorEvent[], sellos: Record<string, Sello>): AnotadorEvent[] {
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) =>
      ((a.e.half || 1) - (b.e.half || 1))
      || ((a.e.minute || 0) - (b.e.minute || 0))
      || ((sellos[a.e.id]?.ts || 0) - (sellos[b.e.id]?.ts || 0))
      || a.e.id.localeCompare(b.e.id)
      || a.i - b.i)
    .map((x) => x.e)
}

/** Aplica una operación. Idempotente y conmutativa por secciones (ver cabecera). */
export function aplicarOp(estado: EstadoPartido, op: Op): EstadoPartido {
  const sello = selloDe(op)
  const meta: MetaSync = {
    ...estado.meta,
    rev: Math.max(estado.meta.rev, op.rev),
    tombstones: { ...estado.meta.tombstones },
    evSello: { ...estado.meta.evSello },
    sec: { ...estado.meta.sec },
    notasSello: { ...estado.meta.notasSello },
    huecos: estado.meta.huecos.slice(),
  }
  let snapshot = estado.snapshot
  let reflexion = estado.reflexion
  let notas = estado.notas
  const secNueva = (s: Seccion, cmp: (a: Sello, b: Sello | undefined) => boolean) => {
    if (meta.sec[s] && !cmp(sello, meta.sec[s])) return false
    meta.sec[s] = sello
    return true
  }

  switch (op.kind) {
    case 'evento_add':
    case 'evento_edit': {
      const id = op.event?.id
      if (!id) break
      const tomb = meta.tombstones[id]
      if (tomb && !mayorPorTs(sello, tomb)) break
      const actual = meta.evSello[id]
      const existe = snapshot.events.some((e) => e.id === id)
      if (existe && actual && !mayorPorTs(sello, actual)) break
      const ev = clonar(op.event)
      const events = existe ? snapshot.events.map((e) => (e.id === id ? ev : e)) : [...snapshot.events, ev]
      snapshot = { ...snapshot, events }
      meta.evSello[id] = sello
      if (tomb) delete meta.tombstones[id]
      break
    }
    case 'evento_del': {
      const id = op.eventId
      const actual = meta.evSello[id]
      const existe = snapshot.events.some((e) => e.id === id)
      if (existe && actual && mayorPorTs(actual, sello)) break // edición posterior: el dato se conserva
      const prev = meta.tombstones[id]
      meta.tombstones[id] = !prev || mayorPorTs(sello, prev) ? sello : prev
      if (existe) snapshot = { ...snapshot, events: snapshot.events.filter((e) => e.id !== id) }
      delete meta.evSello[id]
      break
    }
    case 'reloj':
      if (secNueva('reloj', mayorPorRev)) snapshot = { ...snapshot, ...op.reloj }
      break
    case 'cierre':
      if (secNueva('cierre', mayorPorRev)) snapshot = { ...snapshot, closed: op.closed, closedAt: op.closedAt }
      break
    case 'alineacion':
      if (secNueva('alineacion', mayorPorTs)) snapshot = { ...snapshot, ...clonar(op.alineacion) }
      break
    case 'periodos':
      if (secNueva('periodos', mayorPorTs)) {
        const periods = clonar(op.periods)
        snapshot = { ...snapshot, periods, ...totalesDe(periods) }
      }
      break
    case 'dorsales': {
      const unidos = uniq([...(snapshot.rivalDorsals || []), ...op.rivalDorsals]).sort((a, b) => a - b)
      // Una edición explícita más reciente puede quitar dorsales; las demás solo suman.
      const lista = secNueva('dorsales', mayorPorTs) ? uniq(op.rivalDorsals).sort((a, b) => a - b) : unidos
      snapshot = { ...snapshot, rivalDorsals: lista }
      break
    }
    case 'config':
      if (secNueva('config', mayorPorTs)) snapshot = { ...snapshot, dirRight: op.dirRight, showDorsal: op.showDorsal }
      break
    case 'reflexion':
      if (secNueva('reflexion', mayorPorTs)) reflexion = op.texto
      break
    case 'nota': {
      const prev = meta.notasSello[op.convId]
      if (!prev || mayorPorTs(sello, prev)) {
        meta.notasSello[op.convId] = sello
        notas = { ...notas, [op.convId]: op.nota }
      }
      break
    }
    case 'hueco':
      if (!meta.huecos.some((h) => h.desde === op.desde && h.hasta === op.hasta)) meta.huecos.push({ desde: op.desde, hasta: op.hasta })
      break
    case 'snapshot': {
      const next = clonar(op.snapshot)
      const ids = new Set(next.events.map((e) => e.id))
      for (const e of snapshot.events) {
        if (!ids.has(e.id)) {
          const prev = meta.tombstones[e.id]
          meta.tombstones[e.id] = !prev || mayorPorTs(sello, prev) ? sello : prev
          delete meta.evSello[e.id]
        }
      }
      for (const e of next.events) {
        meta.evSello[e.id] = sello
        delete meta.tombstones[e.id]
      }
      for (const s of ['reloj', 'cierre', 'alineacion', 'periodos', 'dorsales', 'config'] as Seccion[]) meta.sec[s] = sello
      snapshot = { ...next, running: next.running }
      if (op.reflexion !== undefined) {
        reflexion = op.reflexion
        meta.sec.reflexion = sello
      }
      if (op.notas) {
        notas = { ...op.notas }
        for (const k of Object.keys(op.notas)) meta.notasSello[k] = sello
      }
      break
    }
  }
  return { snapshot, reflexion, notas, meta }
}

/** Reproduce operaciones (en orden de rev; da igual, es conmutativo) sobre un estado base. */
export function reproducir(base: EstadoPartido, ops: Op[]): EstadoPartido {
  const vistos = new Set<string>()
  let e = base
  for (const op of [...ops].sort((a, b) => a.rev - b.rev || a.ts - b.ts || a.opId.localeCompare(b.opId))) {
    if (vistos.has(op.opId)) continue
    vistos.add(op.opId)
    e = aplicarOp(e, op)
  }
  return e
}

// ------------------------------------------------------------------- fusión

function elegirSello(a: Sello | undefined, b: Sello | undefined, cmp: (x: Sello | undefined, y: Sello | undefined) => boolean): 'a' | 'b' | 'empate' {
  if (!a && !b) return 'empate'
  if (cmp(a, b)) return 'a'
  if (cmp(b, a)) return 'b'
  return 'empate'
}

/**
 * Fusiona el estado local con el del servidor (u otro dispositivo). Determinista:
 * `fusionarSnapshots(a, b)` y `fusionarSnapshots(b, a)` dan el mismo contenido.
 */
export function fusionarSnapshots(local: EstadoPartido, remoto: EstadoPartido): EstadoPartido {
  const ml = local.meta
  const mr = remoto.meta
  const meta: MetaSync = {
    v: VERSION_ESQUEMA,
    rev: Math.max(ml.rev, mr.rev),
    deviceId: ml.deviceId,
    tombstones: {},
    evSello: {},
    sec: {},
    notasSello: {},
    huecos: [],
  }

  // ---- eventos
  const evL = new Map(local.snapshot.events.map((e) => [e.id, e]))
  const evR = new Map(remoto.snapshot.events.map((e) => [e.id, e]))
  const eventos: AnotadorEvent[] = []
  for (const id of uniq([...Array.from(evL.keys()), ...Array.from(evR.keys()), ...Object.keys(ml.tombstones), ...Object.keys(mr.tombstones)])) {
    const l = evL.get(id)
    const r = evR.get(id)
    let ev: AnotadorEvent | undefined
    let sello: Sello | undefined
    if (l && r) {
      const w = elegirSello(ml.evSello[id], mr.evSello[id], mayorPorTs)
      if (w === 'a') [ev, sello] = [l, ml.evSello[id]]
      else if (w === 'b') [ev, sello] = [r, mr.evSello[id]]
      else {
        const gana = canon(l) >= canon(r) ? 'l' : 'r'
        ;[ev, sello] = gana === 'l' ? [l, ml.evSello[id]] : [r, mr.evSello[id]]
      }
    } else if (l) [ev, sello] = [l, ml.evSello[id]]
    else if (r) [ev, sello] = [r, mr.evSello[id]]
    const tl = ml.tombstones[id]
    const tr = mr.tombstones[id]
    const tomb = tl && tr ? (mayorPorTs(tl, tr) ? tl : tr) : tl || tr
    if (ev && tomb) {
      if (mayorPorTs(sello, tomb)) {
        eventos.push(ev)
        if (sello) meta.evSello[id] = sello
      } else meta.tombstones[id] = tomb
    } else if (ev) {
      eventos.push(ev)
      if (sello) meta.evSello[id] = sello
    } else if (tomb) meta.tombstones[id] = tomb
  }

  // ---- secciones
  const base = (elegirSello(ml.sec.reloj, mr.sec.reloj, mayorPorRev) === 'b' ? remoto : local).snapshot
  let snapshot: AnotadorSnapshot = { ...local.snapshot }
  const lado = <T,>(sec: Seccion, cmp: typeof mayorPorTs, valor: (s: EstadoPartido) => T): { gana: 'a' | 'b'; v: T } => {
    let w = elegirSello(ml.sec[sec], mr.sec[sec], cmp)
    if (w === 'empate') w = canon(valor(local)) >= canon(valor(remoto)) ? 'a' : 'b'
    const s = w === 'a' ? ml.sec[sec] : mr.sec[sec]
    if (s) meta.sec[sec] = s
    return { gana: w, v: valor(w === 'a' ? local : remoto) }
  }
  void base
  const reloj = lado('reloj', mayorPorRev, (s) => relojDe(s.snapshot))
  snapshot = { ...snapshot, ...reloj.v }
  const cierre = lado('cierre', mayorPorRev, (s) => ({ closed: Boolean(s.snapshot.closed), closedAt: s.snapshot.closedAt }))
  snapshot = { ...snapshot, closed: cierre.v.closed, closedAt: cierre.v.closedAt }
  const alin = lado('alineacion', mayorPorTs, (s) => alineacionDe(s.snapshot))
  snapshot = { ...snapshot, ...clonar(alin.v) }
  const conf = lado('config', mayorPorTs, (s) => ({ dirRight: s.snapshot.dirRight, showDorsal: s.snapshot.showDorsal }))
  snapshot = { ...snapshot, ...conf.v }

  // periodos
  const sl = ml.sec.periodos
  const sr = mr.sec.periodos
  let periods: Record<AnotadorHalf, PeriodState>
  if (!sl || !sr || sl.dev === sr.dev) {
    periods = clonar(lado('periodos', mayorPorTs, (s) => s.snapshot.periods).v)
  } else {
    periods = {
      1: combinarPeriodo(local.snapshot.periods[1], remoto.snapshot.periods[1]),
      2: combinarPeriodo(local.snapshot.periods[2], remoto.snapshot.periods[2]),
    }
    meta.sec.periodos = mayorPorTs(sl, sr) ? sl : sr
  }
  snapshot = { ...snapshot, periods, ...totalesDe(periods) }

  // dorsales: unión
  snapshot.rivalDorsals = uniq([...(local.snapshot.rivalDorsals || []), ...(remoto.snapshot.rivalDorsals || [])]).sort((a, b) => a - b)
  const sd = elegirSello(ml.sec.dorsales, mr.sec.dorsales, mayorPorTs)
  const selloD = sd === 'b' ? mr.sec.dorsales : ml.sec.dorsales || mr.sec.dorsales
  if (selloD) meta.sec.dorsales = selloD

  // reflexión
  let reflexion: string
  const tl = local.reflexion
  const tr = remoto.reflexion
  if (tl === tr) reflexion = tl
  else if (!tl) reflexion = tr
  else if (!tr) reflexion = tl
  else if (tl.includes(tr)) reflexion = tl
  else if (tr.includes(tl)) reflexion = tr
  else reflexion = [tl, tr].sort().join('\n\n')
  const sR = elegirSello(ml.sec.reflexion, mr.sec.reflexion, mayorPorTs)
  const selloR = sR === 'b' ? mr.sec.reflexion : ml.sec.reflexion || mr.sec.reflexion
  if (selloR) meta.sec.reflexion = selloR

  // valoraciones
  const notas: Record<string, number | null> = {}
  for (const id of uniq([...Object.keys(local.notas), ...Object.keys(remoto.notas)])) {
    const a = ml.notasSello[id]
    const b = mr.notasSello[id]
    const w = elegirSello(a, b, mayorPorTs)
    if (w === 'a' || (w === 'empate' && id in local.notas && !(id in remoto.notas))) {
      notas[id] = local.notas[id]
      if (a) meta.notasSello[id] = a
    } else if (w === 'b' || id in remoto.notas) {
      notas[id] = remoto.notas[id]
      if (b) meta.notasSello[id] = b
    } else notas[id] = local.notas[id]
  }

  // huecos: unión
  const hs = new Map<string, { desde: number; hasta: number }>()
  for (const h of [...ml.huecos, ...mr.huecos]) hs.set(`${h.desde}|${h.hasta}`, h)
  meta.huecos = Array.from(hs.values()).sort((a, b) => a.desde - b.desde)

  snapshot = { ...snapshot, events: ordenarEventos(eventos, meta.evSello), running: false }
  return { snapshot, reflexion, notas, meta }
}

// ------------------------------------------------------------------ huella

/** Contenido relevante del estado, sin metadatos de orden: sirve para saber si dos estados "dicen lo mismo". */
export function huella(e: EstadoPartido): string {
  const s = e.snapshot
  const eventos = [...s.events].sort((a, b) => a.id.localeCompare(b.id))
  return canon({
    eventos,
    tomb: Object.keys(e.meta.tombstones).sort(),
    reloj: { ...relojDe(s), running: false },
    cierre: { closed: Boolean(s.closed), closedAt: s.closedAt },
    alin: alineacionDe(s),
    periods: s.periods,
    dorsales: [...(s.rivalDorsals || [])].sort((a, b) => a - b),
    config: { dirRight: s.dirRight, showDorsal: s.showDorsal },
    reflexion: e.reflexion,
    notas: e.notas,
  })
}

export function tieneContenido(e: EstadoPartido | null | undefined): boolean {
  if (!e) return false
  const s = e.snapshot
  return s.started || Boolean(s.closed) || s.events.length > 0 || Object.keys(e.meta.tombstones).length > 0
    || Boolean(e.reflexion) || Object.values(e.notas).some((n) => n != null)
    || [s.periods[1], s.periods[2]].some((p) => p.foulMap.cometidas.length + p.foulMap.recibidas.length > 0
      || Object.values(p.teamStats).some((n) => n > 0))
}

export interface ResultadoDecision {
  decision: 'usarLocal' | 'usarServidor' | 'fusionar'
  /** Estado resultante de aplicar la decisión. */
  estado: EstadoPartido | null
}

/**
 * Decide qué hacer con el estado local frente al del servidor.
 *  - sin local → servidor; sin servidor (o vacío) → local;
 *  - si fusionar no añade nada al local → local; si no añade nada al servidor → servidor;
 *  - si cada lado tiene algo que el otro no → fusionar.
 */
export function decidirRecuperacion(local: EstadoPartido | null, remoto: EstadoPartido | null): ResultadoDecision {
  if (!local) return { decision: 'usarServidor', estado: remoto }
  if (!remoto) return { decision: 'usarLocal', estado: local }
  if (!tieneContenido(remoto) && tieneContenido(local)) return { decision: 'usarLocal', estado: local }
  if (!tieneContenido(local) && tieneContenido(remoto)) return { decision: 'usarServidor', estado: remoto }
  const m = fusionarSnapshots(local, remoto)
  const hm = huella(m)
  if (hm === huella(local)) return { decision: 'usarLocal', estado: { ...local, meta: { ...local.meta, rev: Math.max(local.meta.rev, remoto.meta.rev) } } }
  if (hm === huella(remoto)) return { decision: 'usarServidor', estado: { ...remoto, meta: { ...remoto.meta, deviceId: local.meta.deviceId } } }
  return { decision: 'fusionar', estado: m }
}

// -------------------------------------------------------------------- diff

/**
 * Convierte "antes → después" de la pantalla en operaciones semánticas.
 * Así la UI no tiene que construir cada operación a mano: llama a
 * `registrarCambio(prev, next)` y el diario recibe solo lo que cambió.
 * Los cambios de `elapsedMs` con el reloj en marcha NO generan operación
 * (los cubre el latido); sí los ajustes manuales con el reloj parado.
 */
export function opsDesdeDiff(prev: AnotadorSnapshot | null, next: AnotadorSnapshot): OpInput[] {
  if (!prev) return [{ kind: 'snapshot', snapshot: next }]
  const ops: OpInput[] = []
  const antes = new Map(prev.events.map((e) => [e.id, canon(e)]))
  const ahora = new Set<string>()
  for (const e of next.events) {
    ahora.add(e.id)
    const c = antes.get(e.id)
    if (c === undefined) ops.push({ kind: 'evento_add', event: e })
    else if (c !== canon(e)) ops.push({ kind: 'evento_edit', event: e })
  }
  for (const e of prev.events) if (!ahora.has(e.id)) ops.push({ kind: 'evento_del', eventId: e.id })

  const a = relojDe(prev)
  const b = relojDe(next)
  const relojCambia = a.half !== b.half || a.running !== b.running || a.started !== b.started
    || a.half1Ms !== b.half1Ms || a.half2Ms !== b.half2Ms
    || (!a.running && !b.running && a.elapsedMs !== b.elapsedMs)
  if (relojCambia) ops.push({ kind: 'reloj', reloj: b })
  if (Boolean(prev.closed) !== Boolean(next.closed) || prev.closedAt !== next.closedAt) {
    ops.push({ kind: 'cierre', closed: Boolean(next.closed), closedAt: next.closedAt })
  }
  if (canon(alineacionDe(prev)) !== canon(alineacionDe(next))) ops.push({ kind: 'alineacion', alineacion: alineacionDe(next) })
  if (canon(prev.periods) !== canon(next.periods)) ops.push({ kind: 'periodos', periods: next.periods })
  if (canon(prev.rivalDorsals || []) !== canon(next.rivalDorsals || [])) ops.push({ kind: 'dorsales', rivalDorsals: next.rivalDorsals || [] })
  if (prev.dirRight !== next.dirRight || prev.showDorsal !== next.showDorsal) {
    ops.push({ kind: 'config', dirRight: next.dirRight, showDorsal: next.showDorsal })
  }
  return ops
}
