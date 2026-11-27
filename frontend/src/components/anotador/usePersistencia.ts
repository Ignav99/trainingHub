'use client'

/**
 * INTEGRACIÓN con la capa de datos del anotador (`lib/anotador-datos/**`, ver docs/design/anotador-datos.md).
 * Es el ÚNICO sitio de la UI que conoce el hook `useAnotadorDatos`. La pantalla solo llama a
 * `guardar(next)`, `guardarReflexion`, `guardarNota`, `latido`, `forzarSync` y lee `estadoSync` / `recuperacion`.
 *
 * Garantías que NO se tocan aquí:
 *  - la acción se escribe en la tablet (IndexedDB) antes de darla por guardada: mientras la escritura esté
 *    en vuelo la insignia dice «Guardando…»; si falla, toast + insignia en error + reintento automático;
 *  - nada bloquea la interfaz esperando a la red (el motor sube en segundo plano);
 *  - `persist()`/`mergeNotasPre` ya no se llaman a mano: el motor es el único que sube al servidor.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mutate } from 'swr'
import { toast } from 'sonner'
import { scoreFromEvents, type AnotadorSnapshot } from '@/lib/anotador'
import { huella, tieneContenido } from '@/lib/anotador-datos/estado'
import type { DiagnosticoDiario } from '@/lib/anotador-datos/journal'
import type { EstadoPartido } from '@/lib/anotador-datos/tipos'
import { useAnotadorDatos } from '@/lib/anotador-datos/useAnotadorDatos'
import type { Convocatoria } from '@/types'
import { mapearAvisos, type Aviso, type DatosSync, type Recuperacion } from './adaptadores'
import { EVENTO_PEDIR_LOGIN, EVENTO_SESION_RESTAURADA } from './sesion'


/** Apertura: leyendo la tablet, preguntando al delegado, o partido listo. */
export type FaseRecuperacion = 'cargando' | 'preguntar' | 'lista'

interface Args {
  partidoId: string
  convocados: Convocatoria[]
  nameOf: (id?: string) => string
  /** `notas_pre` del servidor; undefined si la consulta falló o aún no llegó. */
  notasPreRemotas: unknown
  /** Ya se sabe qué dice el servidor (con datos, con error o sin red) y hay partido+convocados con los que arrancar. */
  remotoListo: boolean
  habilitado?: boolean
}

function maxTs(e: EstadoPartido): number {
  const t: number[] = []
  for (const s of Object.values(e.meta.evSello)) t.push(s.ts)
  for (const s of Object.values(e.meta.tombstones)) t.push(s.ts)
  for (const s of Object.values(e.meta.sec)) if (s) t.push(s.ts)
  return t.length ? Math.max(...t) : 0
}

function detalleLocal(e: EstadoPartido): string {
  const s = e.snapshot
  const { gf, gc } = scoreFromEvents(s.events)
  const n = s.events.length
  const parte = s.closed ? 'cerrado' : s.half === 2 ? '2ª parte' : '1ª parte'
  return `${n} ${n === 1 ? 'evento' : 'eventos'} · ${gf}–${gc} · ${parte}`
}

/** Snapshot con el que arranca la pantalla: el recuperado si tiene algo, o el acta de siempre. */
export function usaEstadoRecuperado(e: EstadoPartido | null): boolean {
  return Boolean(e && (tieneContenido(e) || Object.values(e.snapshot.slots).some(Boolean)))
}

export function usePersistencia({ partidoId, convocados, nameOf, notasPreRemotas, remotoListo, habilitado = true }: Args) {
  const convSync = useMemo(
    () => convocados.map((c) => ({ id: c.id, titular: Boolean(c.titular), posicion_asignada: c.posicion_asignada ?? null })),
    [convocados],
  )
  const datos = useAnotadorDatos({
    partidoId,
    convocados: convSync,
    nameOf,
    notasPreRemotas,
    remotoListo,
    habilitado,
    alSincronizar: () => {
      void mutate(
        (key: unknown) => typeof key === 'string' && (
          key.includes('/partidos') || key.includes('/convocatorias') || key.includes('/estadisticas-partido')
        ),
      )
    },
  })
  const dRef = useRef(datos)
  dRef.current = datos

  const [fase, setFase] = useState<FaseRecuperacion>('cargando')
  const [estadoInicial, setEstadoInicial] = useState<EstadoPartido | null>(null)
  const [info, setInfo] = useState<Recuperacion | null>(null)
  const [enVuelo, setEnVuelo] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const arrancado = useRef(false)

  // ---- recuperación: preguntar solo si hay copia local con algo que el servidor no tiene tal cual
  const rec = datos.recuperacion
  useEffect(() => {
    if (!habilitado || arrancado.current || rec.cargando) return
    arrancado.current = true
    const { local, remoto } = rec
    const preguntar = Boolean(
      local && tieneContenido(local) && rec.decision !== 'usarServidor' && !(remoto && huella(local) === huella(remoto)),
    )
    if (!preguntar || !local) {
      void dRef.current.recuperacion.aplicar()
        .then((e) => { setEstadoInicial(e); setFase('lista') })
        .catch((err) => { arrancado.current = false; toast.error(`No se pudo abrir el partido: ${err instanceof Error ? err.message : 'error local'}`) })
      return
    }
    void (async () => {
      let guardadoEn = maxTs(local)
      try {
        const d = (await dRef.current.diagnostico()).diario as DiagnosticoDiario | null
        if (d?.ultimoCheckpoint) guardadoEn = Math.max(guardadoEn, d.ultimoCheckpoint)
      } catch { /* la hora es solo informativa */ }
      setInfo({ guardadoEn: guardadoEn || Date.now(), detalle: detalleLocal(local) })
      setFase('preguntar')
    })()
  }, [habilitado, rec.cargando, rec.decision, rec.local, rec.remoto, rec])

  const continuar = useCallback(async () => {
    try {
      const e = await dRef.current.recuperacion.aplicar()
      setEstadoInicial(e)
      setFase('lista')
    } catch (err) {
      toast.error(`No se pudo recuperar: ${err instanceof Error ? err.message : 'error local'}`)
    }
  }, [])

  const descartar = useCallback(async () => {
    try {
      const e = await dRef.current.recuperacion.descartarLocal()
      setEstadoInicial(e)
      setFase('lista')
      toast.message('Copia de la tablet descartada. Queda una copia oculta 24 h por si fue un error.')
    } catch (err) {
      toast.error(`No se descartó nada: ${err instanceof Error ? err.message : 'no se pudo guardar la copia de seguridad'}`)
    }
  }, [])

  // ---- guardar tras cada cambio de pantalla (en orden, avisando si falla)
  const cola = useRef<Promise<void>>(Promise.resolve())
  const ultimoToast = useRef(0)
  const fallo = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : 'error desconocido'
    setAviso(`No se pudo guardar en la tablet: ${msg}`)
    const t = Date.now()
    if (t - ultimoToast.current > 4000) {
      ultimoToast.current = t
      toast.error('No se pudo guardar en la tablet. Sigue anotando: se reintenta solo.', { duration: 9000 })
    }
  }, [])
  /** Resuelve `true` si quedó escrito en la tablet, `false` si no (el aviso ya se mostró). */
  const encolar = useCallback((fn: () => Promise<void>): Promise<boolean> => {
    setEnVuelo((n) => n + 1)
    const p = cola.current.then(fn).then(
      () => { setAviso(null); return true },
      (err) => { fallo(err); return false },
    ).finally(() => setEnVuelo((n) => n - 1))
    cola.current = p.then(() => undefined)
    return p
  }, [fallo])

  const guardar = useCallback((next: AnotadorSnapshot) => encolar(() => dRef.current.registrarCambio(next)), [encolar])
  const guardarNota = useCallback((convId: string, nota: number | null) => encolar(() => dRef.current.registrarNota(convId, nota)), [encolar])

  // Reflexión: se escribe tecla a tecla; se guarda a los 400 ms y SIEMPRE al cerrar la hoja / ocultar la página.
  const reflexionPendiente = useRef<string | null>(null)
  const reflexionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const volcarReflexion = useCallback(() => {
    if (reflexionTimer.current) { clearTimeout(reflexionTimer.current); reflexionTimer.current = null }
    const t = reflexionPendiente.current
    if (t == null) return Promise.resolve(true)
    reflexionPendiente.current = null
    return encolar(() => dRef.current.registrarReflexion(t))
  }, [encolar])
  const guardarReflexion = useCallback((texto: string) => {
    reflexionPendiente.current = texto
    if (reflexionTimer.current) clearTimeout(reflexionTimer.current)
    reflexionTimer.current = setTimeout(() => { void volcarReflexion() }, 400)
  }, [volcarReflexion])
  useEffect(() => {
    const alOcultar = () => { if (document.visibilityState === 'hidden') void volcarReflexion() }
    document.addEventListener('visibilitychange', alOcultar)
    window.addEventListener('pagehide', alOcultar)
    return () => {
      document.removeEventListener('visibilitychange', alOcultar)
      window.removeEventListener('pagehide', alOcultar)
      void volcarReflexion()
    }
  }, [volcarReflexion])

  // ---- sesión: tras volver a iniciar sesión se reanuda el envío
  useEffect(() => {
    const alRestaurar = () => { void dRef.current.reanudarSync() }
    window.addEventListener(EVENTO_SESION_RESTAURADA, alRestaurar)
    return () => window.removeEventListener(EVENTO_SESION_RESTAURADA, alRestaurar)
  }, [])

  const pedirInicioSesion = useCallback(() => { window.dispatchEvent(new Event(EVENTO_PEDIR_LOGIN)) }, [])

  const forzarSync = useCallback(async (opts?: { resultado?: boolean }) => {
    await volcarReflexion()
    try {
      return await dRef.current.forzarSync(opts)
    } catch (err) {
      fallo(err)
      return undefined
    }
  }, [volcarReflexion, fallo])

  const validar = useCallback((snap: AnotadorSnapshot): Aviso[] => mapearAvisos(dRef.current.validar(snap)), [])

  const motor = datos.estadoSync
  const errorLocal = aviso || datos.errorLocal
  const estadoSync: DatosSync = {
    estado: errorLocal ? 'error' : motor.estado === 'guardado' && enVuelo > 0 ? 'pendiente' : motor.estado,
    pendientes: motor.pendientes + enVuelo,
    ultimoGuardadoLocal: motor.ultimoGuardadoLocal,
    ultimaSync: motor.ultimaSync,
    ultimoError: errorLocal || motor.ultimoError || null,
    almacenDegradado: motor.almacenDegradado,
  }

  return {
    estadoSync,
    guardar,
    guardarNota,
    guardarReflexion,
    volcarReflexion,
    latido: datos.latido,
    forzarSync,
    pedirInicioSesion,
    validar,
    errorLocal,
    recuperacion: { fase, info, estado: estadoInicial, continuar, descartar },
  }
}
