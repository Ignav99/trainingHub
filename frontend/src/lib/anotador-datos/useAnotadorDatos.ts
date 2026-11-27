'use client'

/**
 * Hook de integración de la capa de datos del anotador.
 *
 * Contrato para la UI (ver docs/design/anotador-datos.md):
 *  1. Montar con `partidoId`, `convocados`, `nameOf` y, cuando se hayan cargado, `notasPreRemotas` + `remotoListo`.
 *  2. Esperar `recuperacion.cargando === false` y `remotoListo`; llamar `recuperacion.aplicar()` y
 *     arrancar la pantalla con el estado devuelto (pasado por `hydrateSnapshot`/`normalizeSnapshot`).
 *  3. Tras CADA cambio de pantalla: `await registrarCambio(snapNuevo)` (o `registrar(op)`); la promesa se
 *     resuelve cuando ya está en disco. Si RECHAZA: avisar "no se pudo guardar en la tablet".
 *  4. Mostrar `estadoSync` y `avisos`; botón "Enviar ahora" → `forzarSync()`.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { AnotadorSnapshot } from '../anotador'
import { apiSyncReal, pingServidor } from './apiReal'
import { guardarDescartado } from './descartar.ts'
import { decidirRecuperacion, desempaquetar, estadoVacio, fusionarSnapshots, opsDesdeDiff } from './estado.ts'
import type { Diario } from './journal.ts'
import { puenteAnotador } from './puente'
import { obtenerRuntime } from './runtime.ts'
import { crearMotorSync, ESTADO_SYNC_INICIAL, type ConvocadoSync, type MotorSync, type OpcionesRun, type ResultadoRun } from './sincronizar.ts'
import type { Aviso, Decision, EstadoPartido, EstadoSync, OpInput } from './tipos.ts'
import { validarPartido, type OpcionesValidacion } from './validacion.ts'

export interface OpcionesHook {
  partidoId: string
  convocados: ConvocadoSync[]
  nameOf: (id?: string) => string
  /** `partido.notas_pre` del servidor, cuando esté cargado. */
  notasPreRemotas?: unknown
  /** true cuando la consulta al servidor terminó (con datos o con error/offline). */
  remotoListo?: boolean
  habilitado?: boolean
  /** El servidor tenía datos que el dispositivo no y se fusionaron (la UI puede refrescar su estado). */
  alFusionar?: (estado: EstadoPartido) => void
  /** Sincronización completa terminada (p. ej. para `mutate` de SWR). */
  alSincronizar?: () => void
}

export interface Recuperacion {
  cargando: boolean
  hayDatosLocales: boolean
  local: EstadoPartido | null
  remoto: EstadoPartido | null
  /** Decisión propuesta; null mientras falte el estado local o el remoto. */
  decision: Decision | null
  decidir(): Decision | null
  /** Aplica la decisión propuesta (o la forzada) y arranca la sincronización. Devuelve el estado a mostrar. */
  aplicar(forzar?: Decision): Promise<EstadoPartido | null>
  /**
   * Descarte deliberado de la copia de la tablet: guarda una copia oculta 24 h en el diario (si no
   * se puede guardar, NO descarta y rechaza), parte del servidor (o de un acta vacía) y arranca el motor.
   */
  descartarLocal(): Promise<EstadoPartido | null>
  aplicada: boolean
}

export interface Diagnostico {
  deviceId: string
  almacen: string
  almacenDegradado: boolean
  rev: number
  estadoSync: EstadoSync
  diario: unknown
  motor: unknown
  errorLocal: string | null
}

export interface UseAnotadorDatos {
  estadoSync: EstadoSync
  /** Escritura anticipada de una operación. Rechaza si NO se pudo guardar en el dispositivo. */
  registrar(op: OpInput): Promise<void>
  /** Compara con el último estado registrado y guarda las operaciones que cambiaron. */
  registrarCambio(next: AnotadorSnapshot): Promise<void>
  registrarReflexion(texto: string): Promise<void>
  registrarNota(convId: string, nota: number | null): Promise<void>
  /** Latido del reloj (la UI puede llamarlo en cada tick; se limita a uno cada 5 s). */
  latido(r: { running: boolean; elapsedMs: number; half: 1 | 2 }): void
  forzarSync(opts?: Pick<OpcionesRun, 'resultado'>): Promise<ResultadoRun | undefined>
  /** Tras volver a iniciar sesión. */
  reanudarSync(): Promise<void>
  recuperacion: Recuperacion
  validar(snap: AnotadorSnapshot, opts?: OpcionesValidacion): Aviso[]
  diagnostico(): Promise<Diagnostico>
  /** Último fallo al escribir en el dispositivo (null si todo bien). */
  errorLocal: string | null
}

const noop = () => () => undefined
const inicial = () => ESTADO_SYNC_INICIAL

export function useAnotadorDatos(o: OpcionesHook): UseAnotadorDatos {
  const { partidoId, habilitado = true } = o
  const [diario, setDiario] = useState<Diario | null>(null)
  const [degradado, setDegradado] = useState(false)
  const [local, setLocal] = useState<EstadoPartido | null>(null)
  const [cargando, setCargando] = useState(true)
  const [aplicada, setAplicada] = useState(false)
  const [motor, setMotor] = useState<MotorSync | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const ultimo = useRef<AnotadorSnapshot | null>(null)
  const ctx = useRef(o)
  ctx.current = o
  const ultimoLatido = useRef(0)
  const pendienteDesde = useRef<number | null>(null)

  // 1) abrir almacén y leer el estado local (sin esperar a la red)
  useEffect(() => {
    if (!habilitado) return
    let vivo = true
    setCargando(true)
    setAplicada(false)
    obtenerRuntime()
      .then(async (rt) => {
        const e = await rt.diario.cargar(partidoId)
        if (!vivo) return
        setDiario(rt.diario)
        setDegradado(rt.degradado)
        setLocal(e)
        setCargando(false)
      })
      .catch(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [partidoId, habilitado])

  const remoto = useMemo(() => {
    if (!o.remotoListo) return null
    return desempaquetar(puenteAnotador.anotadorDeNotas(o.notasPreRemotas), 'remoto')
  }, [o.remotoListo, o.notasPreRemotas])

  const listoParaDecidir = !cargando && Boolean(o.remotoListo)
  const decision = useMemo<Decision | null>(
    () => (listoParaDecidir ? decidirRecuperacion(local, remoto).decision : null),
    [listoParaDecidir, local, remoto],
  )

  // 2) aplicar la decisión y arrancar la sincronización
  const arrancar = useCallback(async (estado: EstadoPartido | null): Promise<EstadoPartido | null> => {
    if (!diario) return null
    if (estado) await diario.reemplazar(partidoId, estado, { silencioso: true })
    else await diario.iniciar(partidoId, estadoVacio(diario.deviceId))
    ultimo.current = estado ? estado.snapshot : null
    const m = crearMotorSync({
      partidoId,
      diario,
      api: apiSyncReal,
      puente: puenteAnotador,
      contexto: () => ({ convocados: ctx.current.convocados, nameOf: ctx.current.nameOf }),
      ping: () => pingServidor(),
      almacenDegradado: degradado,
      alFusionar: (e) => ctx.current.alFusionar?.(e),
      alSincronizar: () => ctx.current.alSincronizar?.(),
      conBloqueo: async (fn) => {
        const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined
        if (!locks) return fn()
        return locks.request(`kabine-sync-${partidoId}`, { ifAvailable: true }, async (lock) => (lock ? fn() : undefined))
      },
    })
    setMotor((prev) => { prev?.detener(); return m })
    m.iniciar()
    setAplicada(true)
    return estado
  }, [diario, partidoId, degradado])

  const aplicar = useCallback(async (forzar?: Decision): Promise<EstadoPartido | null> => {
    if (!diario) return null
    const d = forzar ?? decidirRecuperacion(local, remoto).decision
    let estado: EstadoPartido | null
    if (d === 'usarLocal') estado = local
    else if (d === 'usarServidor') estado = remoto ? { ...remoto, meta: { ...remoto.meta, deviceId: diario.deviceId } } : local
    else estado = local && remoto ? fusionarSnapshots(local, remoto) : local || remoto
    return arrancar(estado)
  }, [diario, local, remoto, arrancar])

  const descartarLocal = useCallback(async (): Promise<EstadoPartido | null> => {
    if (!diario) return null
    if (local) await guardarDescartado(diario, partidoId, local) // si falla, no se descarta nada
    const base = remoto ? { ...remoto, meta: { ...remoto.meta, deviceId: diario.deviceId } } : estadoVacio(diario.deviceId)
    return arrancar(base)
  }, [diario, local, remoto, partidoId, arrancar])

  useEffect(() => () => { motor?.detener() }, [motor])

  const estadoSync = useSyncExternalStore(
    motor ? motor.store.subscribe : noop,
    motor ? motor.store.getSnapshot : inicial,
    inicial,
  )

  // «pendiente desde»: para la alarma de sincronización atascada
  useEffect(() => {
    if (estadoSync.pendientes > 0) pendienteDesde.current = pendienteDesde.current ?? Date.now()
    else pendienteDesde.current = null
  }, [estadoSync.pendientes])

  const registrar = useCallback(async (op: OpInput) => {
    if (!diario) throw new Error('El almacenamiento local aún no está listo')
    try {
      await diario.registrar(partidoId, op)
      setErrorLocal(null)
    } catch (e) {
      setErrorLocal(e instanceof Error ? e.message : 'No se pudo guardar en el dispositivo')
      throw e
    }
  }, [diario, partidoId])

  const registrarCambio = useCallback(async (next: AnotadorSnapshot) => {
    const ops = opsDesdeDiff(ultimo.current, next)
    ultimo.current = next // síncrono: dos cambios seguidos no se pisan
    for (const op of ops) await registrar(op)
  }, [registrar])

  const registrarReflexion = useCallback((texto: string) => registrar({ kind: 'reflexion', texto }), [registrar])
  const registrarNota = useCallback((convId: string, nota: number | null) => registrar({ kind: 'nota', convId, nota }), [registrar])

  const latido = useCallback((r: { running: boolean; elapsedMs: number; half: 1 | 2 }) => {
    const t = Date.now()
    if (!diario || t - ultimoLatido.current < 5_000) return
    ultimoLatido.current = t
    void diario.latido(partidoId, r).catch(() => undefined)
  }, [diario, partidoId])

  const forzarSync = useCallback(async (opts?: Pick<OpcionesRun, 'resultado'>) => {
    if (diario) await diario.flush(partidoId)
    return motor?.sincronizar({ forzar: true, resultado: opts?.resultado })
  }, [motor, diario, partidoId])

  const reanudarSync = useCallback(async () => { await motor?.reanudar() }, [motor])

  const validar = useCallback((snap: AnotadorSnapshot, opts: OpcionesValidacion = {}): Aviso[] => {
    const meta = diario?.estado(partidoId)?.meta
    return validarPartido(
      snap,
      ctx.current.convocados.map((c) => ({ id: c.id, nombre: ctx.current.nameOf(c.id) })),
      {
        huecos: meta?.huecos,
        pendienteDesdeTs: pendienteDesde.current,
        evTs: meta ? Object.fromEntries(Object.entries(meta.evSello).map(([k, v]) => [k, v.ts])) : undefined,
        ...opts,
      },
    )
  }, [diario, partidoId])

  const diagnostico = useCallback(async (): Promise<Diagnostico> => ({
    deviceId: diario?.deviceId || '',
    almacen: diario?.almacen.tipo || 'ninguno',
    almacenDegradado: degradado,
    rev: diario?.estado(partidoId)?.meta.rev || 0,
    estadoSync,
    diario: diario ? await diario.diagnostico(partidoId) : null,
    motor: motor ? await motor.diagnostico() : null,
    errorLocal,
  }), [diario, degradado, partidoId, estadoSync, motor, errorLocal])

  const recuperacion: Recuperacion = {
    cargando: cargando || !o.remotoListo,
    hayDatosLocales: Boolean(local),
    local,
    remoto,
    decision,
    decidir: () => decision,
    aplicar,
    descartarLocal,
    aplicada,
  }

  return { estadoSync, registrar, registrarCambio, registrarReflexion, registrarNota, latido, forzarSync, reanudarSync, recuperacion, validar, diagnostico, errorLocal }
}
