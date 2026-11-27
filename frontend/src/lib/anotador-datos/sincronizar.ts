/**
 * Motor de sincronización: vuelca el estado local al servidor en pasos
 * independientes, idempotentes y reanudables (outbox). Nunca bloquea la UI,
 * nunca descarta datos locales.
 *
 *  - una sola ejecución a la vez (single-flight); si llega otro aviso mientras corre, repite al terminar;
 *  - red caída / 5xx / timeout → reintento con backoff exponencial + jitter;
 *  - 401 → pausa y señal `login` (los datos siguen en el dispositivo);
 *  - 409/412 → se vuelve a leer, se fusiona y se reintenta;
 *  - otros 4xx → el paso se aparca y se muestra el error, el resto sigue.
 */
import type { AnotadorSnapshot } from '../anotador'
import { esperaReintento } from '../api/reintento.ts'
import { canon, desempaquetar, empaquetar } from './estado.ts'
import type { Diario } from './journal.ts'
import { guardarRegistro, hayPasosPendientes, leerOutbox, revEntregadaMinima, type RegistrosOutbox } from './outbox.ts'
import { PASOS, type EstadoPartido, type EstadoSync, type PasoSync, type RegistroOutbox } from './tipos.ts'

// --------------------------------------------------------------- contratos

export interface ConvocadoSync {
  id: string
  titular?: boolean
  posicion_asignada?: string | null
}

export interface TitularRow {
  id: string
  titular: boolean
  posicion_asignada?: string
}

export type FilaJugador = { id: string } & Record<string, unknown>

/** Llamadas al servidor que necesita el volcado (inyectables: en tests, un falso). */
export interface ApiSync {
  obtenerNotasPre(partidoId: string): Promise<unknown>
  guardarNotasPre(partidoId: string, notasPre: string): Promise<void>
  actualizarConvocatorias(filas: FilaJugador[]): Promise<void>
  registrarResultado(partidoId: string, gf: number, gc: number): Promise<void>
  upsertEstadisticas(partidoId: string, payload: Record<string, unknown>): Promise<void>
  upsertRendimiento(convocatoriaId: string, nota: number): Promise<void>
}

/** Construye los datos a enviar a partir del snapshot (envuelve la lógica de `anotador.ts`). */
export interface Puente {
  anotadorDeNotas(notasPre: unknown): unknown
  notasPre(existente: unknown, snapshot: AnotadorSnapshot): string
  titulares(
    existente: unknown,
    snap: AnotadorSnapshot,
    convocados: ConvocadoSync[],
    escritos: Record<string, { titular: boolean; pos: string | null }>,
  ): TitularRow[]
  hayDatos(snap: AnotadorSnapshot, reflexion: string): boolean
  informe(
    snap: AnotadorSnapshot,
    reflexion: string,
    convIds: string[],
    nameOf: (id?: string) => string,
  ): {
    score: { gf: number; gc: number }
    playerRows: Record<string, Record<string, unknown>>
    payload: Record<string, unknown>
    payloadPeriodos: Record<string, unknown>
  }
}

export type ClaseError = 'red' | 'auth' | 'conflicto' | 'servidor' | 'validacion'

/** Clasifica un error del cliente API (ApiError) o de fetch. */
export function clasificarError(err: unknown): ClaseError {
  const e = (err || {}) as { statusCode?: number; sinRespuesta?: boolean; name?: string }
  const s = e.statusCode
  if (s === undefined) return e.sinRespuesta || e.name === 'NetworkError' || e.name === 'TimeoutError' || e.name === 'TypeError' ? 'red' : 'servidor'
  if (s === 401) return 'auth'
  if (s === 409 || s === 412) return 'conflicto'
  if (s === 408 || s === 425 || s === 429 || s >= 500) return 'servidor'
  return 'validacion'
}

const mensaje = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'string' ? e : 'Error desconocido')

// ------------------------------------------------------------------ store

export function crearStoreSync(inicial: EstadoSync) {
  let actual = inicial
  const oyentes = new Set<() => void>()
  return {
    subscribe(fn: () => void): () => void {
      oyentes.add(fn)
      return () => { oyentes.delete(fn) }
    },
    getSnapshot: () => actual,
    set(parcial: Partial<EstadoSync>) {
      const siguiente = { ...actual, ...parcial }
      if (canon({ ...siguiente, ultimaSync: siguiente.ultimaSync?.getTime(), ultimoGuardadoLocal: siguiente.ultimoGuardadoLocal?.getTime() })
        === canon({ ...actual, ultimaSync: actual.ultimaSync?.getTime(), ultimoGuardadoLocal: actual.ultimoGuardadoLocal?.getTime() })) return
      actual = siguiente
      oyentes.forEach((o) => { try { o() } catch { /* ignore */ } })
    },
  }
}

export const ESTADO_SYNC_INICIAL: EstadoSync = {
  estado: 'guardado',
  pendientes: 0,
  ultimoGuardadoLocal: null,
  ultimaSync: null,
  pasosConError: [],
  almacenDegradado: false,
}

// ------------------------------------------------------------------ motor

export interface OpcionesMotor {
  partidoId: string
  diario: Diario
  api: ApiSync
  puente: Puente
  contexto: () => { convocados: ConvocadoSync[]; nameOf: (id?: string) => string }
  online?: () => boolean
  /** Sonda ligera de alcance al servidor (solo se usa tras un fallo de red). */
  ping?: () => Promise<boolean>
  now?: () => number
  setTimer?: (fn: () => void, ms: number) => unknown
  clearTimer?: (h: unknown) => void
  azar?: () => number
  intervaloMs?: number
  debounceMs?: number
  baseBackoffMs?: number
  maxBackoffMs?: number
  almacenDegradado?: boolean
  /** Se llama cuando el servidor tenía datos que el dispositivo no y se han fusionado. */
  alFusionar?: (estado: EstadoPartido) => void
  /** Se llama tras una sincronización completa (para invalidar cachés SWR). */
  alSincronizar?: () => void
  /** Exclusión entre pestañas (Web Locks). Por defecto, ninguna. */
  conBloqueo?: <T>(fn: () => Promise<T>) => Promise<T | undefined>
}

export interface OpcionesRun {
  /** Ignora backoff y desaparca pasos (acción explícita del usuario). */
  forzar?: boolean
  /** Incluye el paso `resultado` aunque el partido no esté cerrado ("Guardar" explícito). */
  resultado?: boolean
}

export interface ResultadoRun {
  ok: boolean
  /** 'completo' | 'parcial' | 'offline' | 'login' | 'vacio' */
  fin: 'completo' | 'parcial' | 'offline' | 'login' | 'vacio'
  pasosOk: PasoSync[]
}

export function crearMotorSync(o: OpcionesMotor) {
  const pid = o.partidoId
  const diario = o.diario
  const now = o.now ?? (() => Date.now())
  const online = o.online ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false))
  const setTimer = o.setTimer ?? ((fn, ms) => setTimeout(fn, ms))
  const clearTimer = o.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>))
  const azar = o.azar ?? Math.random
  const base = o.baseBackoffMs ?? 1_500
  const tope = o.maxBackoffMs ?? 60_000
  const store = crearStoreSync({ ...ESTADO_SYNC_INICIAL, almacenDegradado: Boolean(o.almacenDegradado) })

  let enCurso: Promise<ResultadoRun> | null = null
  let repetir: OpcionesRun | null = null
  let auth = false
  let redFallida = false
  let ultimaSync: Date | null = null
  let ultimoError: string | undefined
  let ultimoNotas: unknown
  let iniciado = false
  let timerTick: unknown
  let timerDeb: unknown
  let timerEspera: unknown
  let desenganchar: (() => void)[] = []
  let regsCache: RegistrosOutbox | null = null

  async function refrescar(corriendo = false) {
    const estado = diario.estado(pid)
    const regs = regsCache || (regsCache = await leerOutbox(diario, pid))
    const rev = estado?.meta.rev ?? 0
    const pendiente = hayPasosPendientes(regs, rev)
    let pendientes = 0
    if (pendiente) pendientes = Math.max(1, await diario.contarOpsDesde(pid, revEntregadaMinima(regs)).catch(() => 1))
    const conError = PASOS.filter((p) => regs[p].parqueado)
    const sinRed = !online() || redFallida
    const e: EstadoSync['estado'] = auth ? 'login'
      : corriendo ? 'sincronizando'
        : conError.length ? 'error'
          : pendiente ? (sinRed ? 'sin_conexion' : 'pendiente')
            : 'guardado'
    const g = diario.ultimoGuardadoLocal()
    store.set({
      estado: e,
      pendientes,
      pasosConError: conError,
      ultimaSync,
      ultimoError: conError.length || auth || pendiente ? ultimoError : undefined,
      ultimoGuardadoLocal: g ? new Date(g) : null,
    })
  }

  async function persistir(reg: RegistroOutbox) {
    try { await guardarRegistro(diario, reg) } catch { /* el paso se repetirá: es idempotente */ }
  }

  // ----------------------------------------------------------- pasos

  async function pasoActa(): Promise<number> {
    for (let intento = 0; ; intento++) {
      const fuente = await o.api.obtenerNotasPre(pid)
      ultimoNotas = fuente
      const remoto = desempaquetar(o.puente.anotadorDeNotas(fuente), 'remoto')
      let local = diario.estado(pid)!
      if (remoto) {
        const r = await diario.fusionar(pid, remoto)
        local = r.estado
        if (r.cambio) o.alFusionar?.(local)
      }
      try {
        await o.api.guardarNotasPre(pid, o.puente.notasPre(fuente, empaquetar(local) as unknown as AnotadorSnapshot))
        return local.meta.rev
      } catch (e) {
        if (clasificarError(e) === 'conflicto' && intento < 2) continue
        throw e
      }
    }
  }

  async function ejecutarPaso(paso: PasoSync, reg: RegistroOutbox, opts: OpcionesRun): Promise<number> {
    const estado = diario.estado(pid)!
    const rev = estado.meta.rev
    const { convocados, nameOf } = o.contexto()
    const snap = estado.snapshot
    const datos = (reg.datos = reg.datos || {})
    const vivo = o.puente.hayDatos(snap, estado.reflexion)
    const informe = () => o.puente.informe(snap, estado.reflexion, convocados.map((c) => c.id), nameOf)

    switch (paso) {
      case 'acta':
        return pasoActa()
      case 'titulares': {
        const escritos = (datos.escritos || {}) as Record<string, { titular: boolean; pos: string | null }>
        const filas = o.puente.titulares(ultimoNotas, snap, convocados, escritos)
        if (filas.length) {
          await o.api.actualizarConvocatorias(filas.map((f) => ({ ...f })))
          for (const f of filas) escritos[f.id] = { titular: f.titular, pos: f.posicion_asignada ?? escritos[f.id]?.pos ?? null }
          datos.escritos = escritos
        }
        return rev
      }
      case 'resultado': {
        const elegible = (snap.closed || opts.resultado) && (snap.started || snap.events.length > 0 || snap.closed)
        if (!elegible) return rev
        const { gf, gc } = informe().score
        const ultimo = datos.ultimo as { gf: number; gc: number } | undefined
        if (ultimo && ultimo.gf === gf && ultimo.gc === gc) return rev
        await o.api.registrarResultado(pid, gf, gc) // el servidor notifica al staff: solo si cambia
        datos.ultimo = { gf, gc }
        return rev
      }
      case 'jugadores': {
        if (!vivo) return rev
        const filas = informe().playerRows
        const previas = (datos.filas || {}) as Record<string, string>
        const cambiadas = Object.entries(filas).filter(([id, f]) => previas[id] !== canon(f))
        if (cambiadas.length) {
          await o.api.actualizarConvocatorias(cambiadas.map(([id, f]) => ({ id, ...f })))
          for (const [id, f] of cambiadas) previas[id] = canon(f)
          datos.filas = previas
        }
        return rev
      }
      case 'estadisticas': {
        if (!vivo) return rev
        const { payload, payloadPeriodos } = informe()
        const h = canon(payloadPeriodos)
        if (datos.huella === h) return rev
        try {
          await o.api.upsertEstadisticas(pid, payloadPeriodos)
        } catch (e) {
          // Solo un rechazo de validación justifica el payload sin `stats_periodos` (servidor antiguo).
          if (clasificarError(e) !== 'validacion') throw e
          await o.api.upsertEstadisticas(pid, payload)
        }
        datos.huella = h
        return rev
      }
      case 'valoraciones': {
        const enviadas = (datos.enviadas || {}) as Record<string, number>
        let primero: unknown = null
        for (const [id, nota] of Object.entries(estado.notas)) {
          if (nota == null || enviadas[id] === nota) continue
          try {
            await o.api.upsertRendimiento(id, nota)
            enviadas[id] = nota
            datos.enviadas = enviadas
          } catch (e) {
            const c = clasificarError(e)
            if (c === 'red' || c === 'auth' || c === 'servidor') { primero = e; break }
            primero = primero || e
          }
        }
        if (primero) throw primero
        return rev
      }
    }
  }

  // ------------------------------------------------------------- run

  async function run(opts: OpcionesRun): Promise<ResultadoRun> {
    const estado = diario.estado(pid)
    if (!estado) return { ok: true, fin: 'vacio', pasosOk: [] }
    const regs = (regsCache = await leerOutbox(diario, pid))
    const rev = estado.meta.rev
    if (opts.forzar) auth = false
    const hayTrabajo = hayPasosPendientes(regs, rev) || (opts.resultado && estado.snapshot.closed)
    // un cierre reabierto deja de contar como confirmado
    if (!estado.snapshot.closed) void diario.anularCierreConfirmado(pid).catch(() => undefined)
    if (!hayTrabajo) { await refrescar(); return { ok: true, fin: 'completo', pasosOk: [] } }
    if (auth && !opts.forzar) { await refrescar(); return { ok: false, fin: 'login', pasosOk: [] } }
    if (!online()) { await refrescar(); return { ok: false, fin: 'offline', pasosOk: [] } }
    if (redFallida && o.ping && !opts.forzar) {
      let vivo = false
      try { vivo = await o.ping() } catch { vivo = false }
      if (!vivo) { await refrescar(); return { ok: false, fin: 'offline', pasosOk: [] } }
    }

    await refrescar(true)
    const pasosOk: PasoSync[] = []
    let corte: ResultadoRun['fin'] | null = null
    let proximo = Infinity

    for (const paso of PASOS) {
      const reg = regs[paso]
      const revAhora = diario.estado(pid)!.meta.rev
      const forzarResultado = paso === 'resultado' && opts.resultado
      if (reg.revEntregado >= revAhora && !forzarResultado) continue
      if (reg.parqueado && !opts.forzar) {
        if (reg.revObjetivo >= revAhora) continue // sigue siendo el mismo dato rechazado
        reg.parqueado = false // el usuario cambió algo: se vuelve a intentar
      }
      if (!opts.forzar && reg.proximoIntento > now()) { proximo = Math.min(proximo, reg.proximoIntento); continue }
      reg.parqueado = false
      try {
        reg.revEntregado = await ejecutarPaso(paso, reg, opts)
        reg.revObjetivo = reg.revEntregado
        reg.intentos = 0
        reg.proximoIntento = 0
        reg.error = undefined
        pasosOk.push(paso)
        redFallida = false
        await persistir(reg)
      } catch (e) {
        const clase = clasificarError(e)
        reg.error = mensaje(e)
        ultimoError = reg.error
        if (clase === 'auth') {
          auth = true
          await persistir(reg)
          corte = 'login'
          break
        }
        if (clase === 'validacion' || clase === 'conflicto') {
          reg.parqueado = true
          reg.revObjetivo = diario.estado(pid)!.meta.rev
          await persistir(reg)
          continue
        }
        // red / servidor: backoff y se corta la ejecución (el resto fallaría igual)
        reg.intentos += 1
        const espera = esperaReintento(reg.intentos - 1, {
          baseMs: base,
          maxMs: tope,
          retryAfterMs: (e as { retryAfterMs?: number }).retryAfterMs ?? null,
          azar,
        })
        reg.proximoIntento = now() + espera
        proximo = Math.min(proximo, reg.proximoIntento)
        redFallida = clase === 'red'
        await persistir(reg)
        corte = 'offline'
        break
      }
    }

    if (proximo !== Infinity) programarEspera(Math.max(0, proximo - now()))
    const completo = !corte && !hayPasosPendientes(regs, diario.estado(pid)!.meta.rev)
    const parqueados = PASOS.some((p) => regs[p].parqueado)
    if (!corte) ultimaSync = new Date(now())
    if (completo && !parqueados) {
      ultimoError = undefined
      const e = diario.estado(pid)!
      if (e.snapshot.closed && PASOS.every((p) => regs[p].revEntregado >= e.meta.rev)) {
        await diario.marcarCierreConfirmado(pid).catch(() => undefined)
      }
      o.alSincronizar?.()
    }
    await refrescar(false)
    return { ok: completo && !parqueados, fin: corte ?? (completo ? 'completo' : 'parcial'), pasosOk }
  }

  function sincronizar(opts: OpcionesRun = {}): Promise<ResultadoRun> {
    if (enCurso) {
      // Un aviso durante la ejecución: se repite una vez al terminar (acumulando opciones).
      repetir = { forzar: repetir?.forzar || opts.forzar, resultado: repetir?.resultado || opts.resultado }
      return enCurso
    }
    const lanzar = async (op: OpcionesRun): Promise<ResultadoRun> => {
      let r: ResultadoRun
      try {
        const bloqueado = o.conBloqueo ? await o.conBloqueo(() => run(op)) : await run(op)
        r = bloqueado ?? { ok: false, fin: 'parcial', pasosOk: [] }
      } catch (e) {
        ultimoError = mensaje(e)
        await refrescar(false).catch(() => undefined)
        r = { ok: false, fin: 'parcial', pasosOk: [] }
      }
      if (repetir) {
        const sig = repetir
        repetir = null
        return lanzar(sig)
      }
      return r
    }
    enCurso = lanzar(opts).finally(() => { enCurso = null })
    return enCurso
  }

  function programarEspera(ms: number) {
    if (!iniciado) return
    if (timerEspera !== undefined) clearTimer(timerEspera)
    timerEspera = setTimer(() => { timerEspera = undefined; void sincronizar() }, Math.max(250, ms))
  }

  function programarDebounce() {
    if (!iniciado) return
    if (timerDeb !== undefined) clearTimer(timerDeb)
    timerDeb = setTimer(() => { timerDeb = undefined; void sincronizar() }, o.debounceMs ?? 1_500)
  }

  return {
    store,
    sincronizar,
    /** Tras volver a iniciar sesión: reanuda y envía lo pendiente. */
    reanudar() { auth = false; return sincronizar({ forzar: true }) },
    iniciar() {
      if (iniciado) return
      iniciado = true
      desenganchar.push(diario.onCambio((id) => {
        if (id !== pid) return
        void refrescar().catch(() => undefined)
        programarDebounce()
      }))
      const w = typeof window !== 'undefined' ? window : null
      const d = typeof document !== 'undefined' ? document : null
      const alVolver = () => { redFallida = false; void sincronizar() }
      const alIrse = () => { void refrescar().catch(() => undefined) }
      const alVisible = () => { if (d && d.visibilityState === 'visible') alVolver() }
      w?.addEventListener('online', alVolver)
      w?.addEventListener('offline', alIrse)
      d?.addEventListener('visibilitychange', alVisible)
      desenganchar.push(() => {
        w?.removeEventListener('online', alVolver)
        w?.removeEventListener('offline', alIrse)
        d?.removeEventListener('visibilitychange', alVisible)
      })
      const tick = () => {
        void sincronizar()
        timerTick = setTimer(tick, o.intervaloMs ?? 10_000)
      }
      timerTick = setTimer(tick, o.intervaloMs ?? 10_000)
      void refrescar().catch(() => undefined)
      void sincronizar()
    },
    detener() {
      iniciado = false
      desenganchar.forEach((f) => f())
      desenganchar = []
      for (const t of [timerTick, timerDeb, timerEspera]) if (t !== undefined) clearTimer(t)
      timerTick = timerDeb = timerEspera = undefined
    },
    refrescar: () => refrescar(false),
    async diagnostico() {
      return { auth, redFallida, outbox: await leerOutbox(diario, pid), enCurso: Boolean(enCurso) }
    },
  }
}

export type MotorSync = ReturnType<typeof crearMotorSync>
