/**
 * Diario local del anotador (escritura anticipada).
 *
 *   registrar(partidoId, op)  →  la promesa se resuelve cuando la operación YA está
 *   escrita de forma duradera; solo entonces la UI da la acción por hecha.
 *
 * Estado = último checkpoint + reproducción de las operaciones retenidas del diario
 * (reproducir es idempotente y conmutativo, ver estado.ts).
 */
import type { Almacen, NombreStore } from './almacen.ts'
import { aplicarOp, crearOp, estadoVacio, fusionarSnapshots, huella, reproducir, desempaquetar, empaquetar, uuid } from './estado.ts'
import type { EstadoPartido, Op, OpInput } from './tipos.ts'
import { VERSION_ESQUEMA } from './tipos.ts'

export const DEBOUNCE_CHECKPOINT_MS = 2_000
export const OPS_RETENIDAS = 200
export const RETENCION_TRAS_CIERRE_MS = 7 * 24 * 3600 * 1000
export const UMBRAL_HUECO_MS = 3 * 60_000

interface Registro<T> {
  v: number
  d: T
}

interface Checkpoint {
  estado: ReturnType<typeof empaquetar>
  reflexion: string
  notas: Record<string, number | null>
  lastRev: number
  savedAt: number
  deviceId: string
}

export interface Latido {
  ts: number
  running: boolean
  elapsedMs: number
  half: 1 | 2
}

export interface DiagnosticoDiario {
  almacen: string
  partidos: string[]
  opsRetenidas: number
  rev: number
  ultimoCheckpoint: number | null
  cuarentena: number
  sinPersistir: number
  ultimoErrorLocal?: string
}

export interface OpcionesDiario {
  almacen: Almacen
  /** Segunda copia del último checkpoint (localStorage) por si se pierde/corrompe el principal. */
  espejo?: Almacen | null
  deviceId: string
  now?: () => number
  setTimer?: (fn: () => void, ms: number) => unknown
  clearTimer?: (h: unknown) => void
  debounceMs?: number
  opsRetenidas?: number
  nuevoId?: () => string
}

const envolver = <T,>(d: T): Registro<T> => ({ v: VERSION_ESQUEMA, d })
const valido = (r: unknown): r is Registro<unknown> =>
  Boolean(r) && typeof r === 'object' && typeof (r as Registro<unknown>).v === 'number' && (r as Registro<unknown>).d !== undefined

const pad = (n: number) => String(n).padStart(10, '0')
const keyOp = (pid: string, rev: number, opId: string) => `${pid}:${pad(rev)}:${opId}`

export function crearDiario(opts: OpcionesDiario) {
  const { almacen, espejo = null, deviceId } = opts
  const now = opts.now ?? (() => Date.now())
  const setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms))
  const clearTimer = opts.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>))
  const debounceMs = opts.debounceMs ?? DEBOUNCE_CHECKPOINT_MS
  const retenidas = opts.opsRetenidas ?? OPS_RETENIDAS
  const nuevoId = opts.nuevoId ?? uuid

  const cache = new Map<string, EstadoPartido>()
  const cargando = new Map<string, Promise<EstadoPartido | null>>()
  const colas = new Map<string, Promise<unknown>>()
  const sucios = new Set<string>()
  const timers = new Map<string, unknown>()
  const sinPersistir = new Map<string, Op[]>()
  const oyentes = new Set<(pid: string, op: Op | null) => void>()
  let cuarentena = 0
  let ultimoErrorLocal: string | undefined
  let ultimoGuardadoLocal = 0

  const encolar = <T,>(pid: string, fn: () => Promise<T>): Promise<T> => {
    const prev = colas.get(pid) || Promise.resolve()
    const p = prev.then(fn, fn)
    colas.set(pid, p.catch(() => undefined))
    return p
  }

  const avisar = (pid: string, op: Op | null) => {
    oyentes.forEach((o) => {
      try { o(pid, op) } catch { /* un oyente roto no tumba al diario */ }
    })
  }

  /** Lee un registro; si está roto lo aparta a cuarentena y devuelve undefined. */
  async function leerSeguro(a: Almacen, store: NombreStore, key: string, raw?: unknown): Promise<unknown> {
    let v: unknown
    try {
      v = raw !== undefined ? raw : await a.get(store, key)
    } catch {
      return undefined
    }
    if (v === undefined) return undefined
    if (valido(v)) return v.d
    cuarentena++
    try {
      await a.put('meta', `cuarentena:${store}:${key}:${now()}`, envolver({ raw: typeof v === 'string' ? v : JSON.stringify(v ?? null) }))
      await a.delete(store, key)
    } catch { /* si ni eso se puede, al menos no rompemos */ }
    return undefined
  }

  async function leerCheckpoint(a: Almacen, key: string, store: NombreStore = 'partidos'): Promise<Checkpoint | null> {
    const d = (await leerSeguro(a, store, key)) as Checkpoint | undefined
    if (!d || typeof d !== 'object' || !d.estado || typeof d.lastRev !== 'number') return null
    return d
  }

  async function opsRetenidasDe(pid: string): Promise<Op[]> {
    let filas: { key: string; value: unknown }[] = []
    try {
      filas = await almacen.listar('journal', `${pid}:`)
    } catch { return [] }
    const out: Op[] = []
    for (const f of filas) {
      const d = await leerSeguro(almacen, 'journal', f.key, f.value)
      if (d && typeof d === 'object' && typeof (d as Op).opId === 'string' && typeof (d as Op).rev === 'number' && (d as Op).partidoId === pid) out.push(d as Op)
    }
    // operaciones del espejo (si el principal falló al escribirlas)
    if (espejo) {
      try {
        for (const f of await espejo.listar('journal', `${pid}:`)) {
          const d = await leerSeguro(espejo, 'journal', f.key, f.value)
          if (d && typeof d === 'object' && typeof (d as Op).opId === 'string' && (d as Op).partidoId === pid) out.push(d as Op)
        }
      } catch { /* ignore */ }
    }
    return out
  }

  async function cargarDeDisco(pid: string): Promise<EstadoPartido | null> {
    const principal = await leerCheckpoint(almacen, pid)
    const copia = espejo ? await leerCheckpoint(espejo, pid) : null
    const cp = principal && copia ? (copia.lastRev > principal.lastRev ? copia : principal) : principal || copia
    const ops = await opsRetenidasDe(pid)
    if (!cp && ops.length === 0) return null
    let base: EstadoPartido
    if (cp) {
      const d = desempaquetar(cp.estado, cp.deviceId || deviceId)
      base = d
        ? { ...d, reflexion: cp.reflexion ?? d.reflexion, notas: cp.notas ?? d.notas, meta: { ...d.meta, deviceId } }
        : estadoVacio(deviceId)
    } else base = estadoVacio(deviceId)
    return reproducir(base, ops)
  }

  async function cargar(pid: string): Promise<EstadoPartido | null> {
    const c = cache.get(pid)
    if (c) return c
    let p = cargando.get(pid)
    if (!p) {
      p = cargarDeDisco(pid).then((e) => {
        if (e) cache.set(pid, e)
        return e
      }).finally(() => cargando.delete(pid))
      cargando.set(pid, p)
    }
    return p
  }

  async function escribirOp(op: Op): Promise<void> {
    const key = keyOp(op.partidoId, op.rev, op.opId)
    try {
      await almacen.put('journal', key, envolver(op))
    } catch (e1) {
      try {
        await almacen.put('journal', key, envolver(op))
      } catch (e2) {
        if (espejo) {
          await espejo.put('journal', key, envolver(op)) // último recurso: lanza si también falla
        } else throw e2 || e1
      }
    }
  }

  async function checkpointInterno(pid: string): Promise<void> {
    const estado = cache.get(pid)
    if (!estado) return
    const cp: Checkpoint = {
      estado: empaquetar(estado),
      reflexion: estado.reflexion,
      notas: estado.notas,
      lastRev: estado.meta.rev,
      savedAt: now(),
      deviceId,
    }
    sucios.delete(pid)
    let ok = false
    try {
      await almacen.put('partidos', pid, envolver(cp))
      ok = true
    } catch (e) {
      ultimoErrorLocal = e instanceof Error ? e.message : String(e)
      sucios.add(pid)
    }
    if (espejo) {
      try { await espejo.put('partidos', pid, envolver(cp)) ; ok = true } catch { /* cuota de localStorage */ }
    }
    if (!ok) return
    ultimoGuardadoLocal = now()
    // recorte: se conservan las últimas `retenidas` operaciones
    try {
      const filas = await almacen.listar('journal', `${pid}:`)
      const sobran = filas.length - retenidas
      for (let i = 0; i < sobran; i++) await almacen.delete('journal', filas[i].key)
      if (espejo) for (const f of await espejo.listar('journal', `${pid}:`)) await espejo.delete('journal', f.key)
    } catch { /* recortar es opcional */ }
  }

  function programarCheckpoint(pid: string) {
    sucios.add(pid)
    if (timers.has(pid)) return
    timers.set(pid, setTimer(() => {
      timers.delete(pid)
      void encolar(pid, () => checkpointInterno(pid)).catch(() => undefined)
    }, debounceMs))
  }

  async function reintentarPendientes(pid: string) {
    const lista = sinPersistir.get(pid)
    if (!lista?.length) return
    const resto: Op[] = []
    for (const op of lista) {
      try { await escribirOp(op) } catch { resto.push(op) }
    }
    if (resto.length) sinPersistir.set(pid, resto)
    else sinPersistir.delete(pid)
  }

  return {
    deviceId,
    almacen,
    cargar,
    estado: (pid: string) => cache.get(pid) || null,

    /** Crea el estado local de un partido si no existe (primer arranque o servidor sin datos). */
    async iniciar(pid: string, inicial?: EstadoPartido): Promise<EstadoPartido> {
      const ya = await cargar(pid)
      if (ya) return ya
      const e = inicial ?? estadoVacio(deviceId)
      cache.set(pid, e)
      await encolar(pid, () => checkpointInterno(pid))
      return e
    },

    /** Escritura anticipada: resuelve cuando la operación es duradera. Rechaza si NO se pudo guardar. */
    registrar(pid: string, input: OpInput): Promise<Op> {
      return encolar(pid, async () => {
        const actual = (await cargar(pid)) || (() => { const e = estadoVacio(deviceId); cache.set(pid, e); return e })()
        const op = crearOp(actual, pid, input, { deviceId, now: now(), opId: nuevoId() })
        cache.set(pid, aplicarOp(actual, op)) // la memoria va por delante, pero la promesa espera al disco
        programarCheckpoint(pid)
        avisar(pid, op)
        try {
          await reintentarPendientes(pid)
          await escribirOp(op)
          ultimoGuardadoLocal = now()
        } catch (e) {
          ultimoErrorLocal = e instanceof Error ? e.message : String(e)
          sinPersistir.set(pid, [...(sinPersistir.get(pid) || []), op])
          throw e
        }
        return op
      })
    },

    /** Sustituye el estado local (decisión de recuperación o fusión con el servidor) y lo deja guardado. */
    reemplazar(pid: string, estado: EstadoPartido, opts2: { silencioso?: boolean } = {}): Promise<void> {
      return encolar(pid, async () => {
        const rev = Math.max(estado.meta.rev, cache.get(pid)?.meta.rev || 0)
        cache.set(pid, { ...estado, meta: { ...estado.meta, rev, deviceId } })
        await checkpointInterno(pid)
        if (!opts2.silencioso) avisar(pid, null)
      })
    },

    /**
     * Fusiona el estado del servidor con el local DENTRO de la cola de escritura
     * (así ninguna operación registrada a la vez se pierde). Si cambia algo, sube `rev`.
     */
    fusionar(pid: string, remoto: EstadoPartido): Promise<{ estado: EstadoPartido; cambio: boolean }> {
      return encolar(pid, async () => {
        const local = (await cargar(pid)) || (() => { const e = estadoVacio(deviceId); cache.set(pid, e); return e })()
        const m = fusionarSnapshots(local, remoto)
        const cambio = huella(m) !== huella(local)
        const rev = Math.max(local.meta.rev, remoto.meta.rev) + (cambio ? 1 : 0)
        const nuevo = { ...m, meta: { ...m.meta, rev, deviceId } }
        if (cambio || rev !== local.meta.rev) {
          cache.set(pid, nuevo)
          await checkpointInterno(pid)
          if (cambio) avisar(pid, null)
        }
        return { estado: cache.get(pid)!, cambio }
      })
    },

    /** Latido del reloj: tiempo transcurrido entre operaciones, y detección de huecos con la app dormida. */
    async latido(pid: string, l: Omit<Latido, 'ts'>): Promise<void> {
      const t = now()
      const prev = (await leerSeguro(almacen, 'meta', `latido:${pid}`)) as Latido | undefined
      try { await almacen.put('meta', `latido:${pid}`, envolver({ ...l, ts: t })) } catch { /* no crítico */ }
      const estado = cache.get(pid)
      if (estado && (estado.snapshot.elapsedMs !== l.elapsedMs || estado.snapshot.half !== l.half)) {
        cache.set(pid, { ...estado, snapshot: { ...estado.snapshot, elapsedMs: l.elapsedMs, half: l.half, running: l.running } })
        programarCheckpoint(pid)
      }
      if (prev && prev.running && l.running && t - prev.ts > UMBRAL_HUECO_MS) {
        await this.registrar(pid, { kind: 'hueco', desde: prev.ts, hasta: t })
      }
    },
    async ultimoLatido(pid: string): Promise<Latido | null> {
      return ((await leerSeguro(almacen, 'meta', `latido:${pid}`)) as Latido | undefined) || null
    },

    /** Guarda ya (pagehide / visibilitychange / freeze). */
    async flush(pid?: string): Promise<void> {
      const ids = pid ? [pid] : Array.from(sucios)
      await Promise.all(ids.map(async (id) => {
        const h = timers.get(id)
        if (h !== undefined) { clearTimer(h); timers.delete(id) }
        await encolar(id, async () => { await reintentarPendientes(id); await checkpointInterno(id) })
      }))
    },

    onCambio(fn: (pid: string, op: Op | null) => void): () => void {
      oyentes.add(fn)
      return () => { oyentes.delete(fn) }
    },

    async contarOpsDesde(pid: string, rev: number): Promise<number> {
      const ops = await opsRetenidasDe(pid)
      return new Set(ops.filter((o) => o.rev > rev).map((o) => o.opId)).size
    },

    /** Hora de la última escritura local duradera (0 si ninguna). */
    ultimoGuardadoLocal: () => ultimoGuardadoLocal,
    sinPersistir: (pid: string) => (sinPersistir.get(pid) || []).length,

    async listarPartidos(): Promise<string[]> {
      return (await almacen.listar('partidos')).map((f) => f.key)
    },

    /** Marca que el servidor confirmó el cierre final: arranca la cuenta de 7 días de retención. */
    async marcarCierreConfirmado(pid: string): Promise<void> {
      const prev = (await leerSeguro(almacen, 'meta', `cierre:${pid}`)) as { ts: number } | undefined
      if (!prev) await almacen.put('meta', `cierre:${pid}`, envolver({ ts: now() }))
    },
    async anularCierreConfirmado(pid: string): Promise<void> {
      await almacen.delete('meta', `cierre:${pid}`)
    },

    /** Borra los partidos confirmados hace más de 7 días. Nunca toca un partido sin confirmar. */
    async limpiar(): Promise<string[]> {
      const borrados: string[] = []
      for (const f of await almacen.listar('meta', 'cierre:')) {
        const d = await leerSeguro(almacen, 'meta', f.key, f.value) as { ts: number } | undefined
        if (!d || now() - d.ts < RETENCION_TRAS_CIERRE_MS) continue
        const pid = f.key.slice('cierre:'.length)
        for (const s of ['journal', 'outbox'] as NombreStore[]) {
          for (const r of await almacen.listar(s, `${pid}:`)) await almacen.delete(s, r.key)
        }
        for (const [s, k] of [['partidos', pid], ['meta', f.key], ['meta', `latido:${pid}`], ['meta', `prefetch:${pid}`]] as [NombreStore, string][]) {
          await almacen.delete(s, k)
        }
        if (espejo) { await espejo.delete('partidos', pid).catch(() => undefined) }
        cache.delete(pid)
        borrados.push(pid)
      }
      return borrados
    },

    async diagnostico(pid: string): Promise<DiagnosticoDiario> {
      const ops = await opsRetenidasDe(pid)
      const cp = await leerCheckpoint(almacen, pid)
      return {
        almacen: almacen.tipo,
        partidos: await this.listarPartidos(),
        opsRetenidas: ops.length,
        rev: cache.get(pid)?.meta.rev || 0,
        ultimoCheckpoint: cp?.savedAt ?? null,
        cuarentena,
        sinPersistir: (sinPersistir.get(pid) || []).length,
        ultimoErrorLocal,
      }
    },

    /** Para tests y el hook: acceso al almacén de meta con el mismo formato. */
    async leerMeta<T>(key: string): Promise<T | undefined> {
      return (await leerSeguro(almacen, 'meta', key)) as T | undefined
    },
    async escribirMeta<T>(key: string, valor: T): Promise<void> {
      await almacen.put('meta', key, envolver(valor))
    },
    async leerStore<T>(store: NombreStore, key: string): Promise<T | undefined> {
      return (await leerSeguro(almacen, store, key)) as T | undefined
    },
    async escribirStore<T>(store: NombreStore, key: string, valor: T): Promise<void> {
      await almacen.put(store, key, envolver(valor))
    },
    async listarStore<T>(store: NombreStore, prefix: string): Promise<{ key: string; value: T }[]> {
      const out: { key: string; value: T }[] = []
      for (const f of await almacen.listar(store, prefix)) {
        const d = await leerSeguro(almacen, store, f.key, f.value)
        if (d !== undefined) out.push({ key: f.key, value: d as T })
      }
      return out
    },
  }
}

export type Diario = ReturnType<typeof crearDiario>

/** Guarda al ocultar la pestaña, cerrar la página o congelarla. Devuelve la función que lo desengancha. */
export function instalarCicloDeVida(
  diario: Pick<Diario, 'flush'>,
  doc: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'> | null = typeof document !== 'undefined' ? document : null,
  win: Pick<Window, 'addEventListener' | 'removeEventListener'> | null = typeof window !== 'undefined' ? window : null,
): () => void {
  const volcar = () => { void diario.flush().catch(() => undefined) }
  const onVis = () => { if (doc && doc.visibilityState === 'hidden') volcar() }
  doc?.addEventListener('visibilitychange', onVis)
  doc?.addEventListener('freeze', volcar)
  win?.addEventListener('pagehide', volcar)
  return () => {
    doc?.removeEventListener('visibilitychange', onVis)
    doc?.removeEventListener('freeze', volcar)
    win?.removeEventListener('pagehide', volcar)
  }
}
