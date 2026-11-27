/** Utilidades para tests (no se importan desde código de la app). */
import type { AnotadorSnapshot } from '../anotador'
import { crearAlmacenMemoria, type AlmacenMemoria } from './almacen.ts'
import { crearDiario, type Diario } from './journal.ts'
import { crearMotorSync, type ApiSync, type ConvocadoSync, type FilaJugador, type Puente } from './sincronizar.ts'

export class ErrHttp extends Error {
  statusCode?: number
  sinRespuesta: boolean
  retryAfterMs?: number
  constructor(status: number | undefined, msg = `HTTP ${status}`) {
    super(msg)
    this.statusCode = status
    this.sinRespuesta = status === undefined
  }
}
export const errRed = () => new ErrHttp(undefined, 'Sin conexión con el servidor')

export interface ServidorFalso {
  notasPre: string
  llamadas: Record<string, number>
  log: { fn: string; args: unknown[] }[]
  /** Si devuelve un error, la llamada falla con él. */
  fallo: (fn: string, n: number) => Error | null | undefined
  /** Gancho antes de cada llamada (para simular a otro dispositivo escribiendo). */
  antes?: (fn: string) => void
  colgar?: (fn: string) => boolean
  api: ApiSync
  convStats: Record<string, Record<string, unknown>>
  estadisticas: Record<string, unknown>[]
  resultados: { gf: number; gc: number }[]
  rendimientos: Record<string, number[]>
}

export function crearServidorFalso(): ServidorFalso {
  const s: ServidorFalso = {
    notasPre: '',
    llamadas: {},
    log: [],
    fallo: () => null,
    convStats: {},
    estadisticas: [],
    resultados: [],
    rendimientos: {},
    api: null as unknown as ApiSync,
  }
  const entrar = async (fn: string, ...args: unknown[]) => {
    s.llamadas[fn] = (s.llamadas[fn] || 0) + 1
    s.log.push({ fn, args })
    s.antes?.(fn)
    if (s.colgar?.(fn)) await new Promise(() => undefined)
    const e = s.fallo(fn, s.llamadas[fn])
    if (e) throw e
  }
  s.api = {
    async obtenerNotasPre() { await entrar('obtenerNotasPre'); return s.notasPre || null },
    async guardarNotasPre(_id, notas) { await entrar('guardarNotasPre', notas); s.notasPre = notas },
    async actualizarConvocatorias(filas: FilaJugador[]) {
      await entrar('actualizarConvocatorias', filas)
      for (const f of filas) s.convStats[f.id] = { ...(s.convStats[f.id] || {}), ...f }
    },
    async registrarResultado(_id, gf, gc) { await entrar('registrarResultado', gf, gc); s.resultados.push({ gf, gc }) },
    async upsertEstadisticas(_id, p) { await entrar('upsertEstadisticas', p); s.estadisticas.push(p) },
    async upsertRendimiento(id, nota) { await entrar('upsertRendimiento', id, nota); (s.rendimientos[id] = s.rendimientos[id] || []).push(nota) },
  }
  return s
}

export const puenteFalso: Puente = {
  anotadorDeNotas(notas) {
    try {
      const o = typeof notas === 'string' ? JSON.parse(notas) : notas
      return o?.anotador
    } catch { return undefined }
  },
  notasPre(existente, snapshot) {
    let rest: Record<string, unknown> = {}
    try { rest = typeof existente === 'string' ? JSON.parse(existente) : (existente as Record<string, unknown>) || {} } catch { /* */ }
    return JSON.stringify({ ...rest, anotador: { ...snapshot, running: false } })
  },
  titulares(_ex, snap, convocados, escritos) {
    const enCampo = new Set(Object.values(snap.slots).filter(Boolean))
    return convocados
      .filter((c) => enCampo.has(c.id) && !escritos[c.id])
      .map((c) => ({ id: c.id, titular: true }))
  },
  hayDatos: (snap, reflexion) => snap.started || snap.events.length > 0 || Boolean(reflexion.trim()),
  informe(snap, reflexion, ids) {
    let gf = 0
    let gc = 0
    const playerRows: Record<string, Record<string, unknown>> = {}
    for (const id of ids) playerRows[id] = { goles: 0 }
    for (const e of snap.events) {
      if (e.type === 'gol') { gf++; if (e.convId && playerRows[e.convId]) (playerRows[e.convId].goles as number)++ }
      if (e.type === 'gol_contra') gc++
    }
    const payload = { goles_favor: gf, reflexion_entrenador: reflexion, n_eventos: snap.events.length }
    return { score: { gf, gc }, playerRows, payload, payloadPeriodos: { ...payload, stats_periodos: { ok: 1 } } }
  },
}

export const CONVOCADOS: ConvocadoSync[] = [
  { id: 'c1', titular: false }, { id: 'c2', titular: false }, { id: 'c3', titular: false },
]

export interface Entorno {
  almacen: AlmacenMemoria
  espejo: AlmacenMemoria
  reloj: { t: number }
  diario: Diario
  nuevoDiario(deviceId?: string): Diario
  timers: { fn: () => void; en: number }[]
  avanzar(ms: number): void
}

export function crearEntorno(deviceId = 'dev-A', t0 = 1_700_000_000_000): Entorno {
  const almacen = crearAlmacenMemoria()
  const espejo = crearAlmacenMemoria()
  const reloj = { t: t0 }
  const timers: { fn: () => void; en: number }[] = []
  let n = 0
  const mk = (dev: string) => crearDiario({
    almacen,
    espejo,
    deviceId: dev,
    now: () => reloj.t,
    setTimer: (fn, ms) => { const h = { fn, en: reloj.t + ms }; timers.push(h); return h },
    clearTimer: (h) => { const i = timers.indexOf(h as { fn: () => void; en: number }); if (i >= 0) timers.splice(i, 1) },
    nuevoId: () => `op-${dev}-${++n}`,
  })
  const env: Entorno = {
    almacen, espejo, reloj, timers,
    diario: mk(deviceId),
    nuevoDiario: (d = deviceId) => mk(d),
    avanzar(ms) {
      reloj.t += ms
      for (const h of timers.filter((x) => x.en <= reloj.t)) { timers.splice(timers.indexOf(h), 1); h.fn() }
    },
  }
  return env
}

export function crearMotorDePrueba(env: Entorno, srv: ServidorFalso, opts: { diario?: Diario; online?: () => boolean; pid?: string; ping?: () => Promise<boolean> } = {}) {
  return crearMotorSync({
    partidoId: opts.pid ?? 'p1',
    diario: opts.diario ?? env.diario,
    api: srv.api,
    puente: puenteFalso,
    contexto: () => ({ convocados: CONVOCADOS, nameOf: (id) => id || '' }),
    online: opts.online ?? (() => true),
    ping: opts.ping,
    now: () => env.reloj.t,
    setTimer: (fn, ms) => { const h = { fn, en: env.reloj.t + ms }; env.timers.push(h); return h },
    clearTimer: (h) => { const i = env.timers.indexOf(h as { fn: () => void; en: number }); if (i >= 0) env.timers.splice(i, 1) },
    azar: () => 0.5,
    baseBackoffMs: 1000,
    maxBackoffMs: 60_000,
  })
}

export const ev = (id: string, minute: number, type = 'gol', extra: Record<string, unknown> = {}) =>
  ({ id, minute, half: minute > 45 ? 2 : 1, type, side: 'us', convId: 'c1', ...extra }) as unknown as AnotadorSnapshot['events'][number]

export function eventosEnServidor(srv: ServidorFalso): string[] {
  if (!srv.notasPre) return []
  return (JSON.parse(srv.notasPre).anotador.events as { id: string }[]).map((e) => e.id).sort()
}
