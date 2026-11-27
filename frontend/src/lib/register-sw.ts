/**
 * Registro del service worker y utilidades de modo sin conexión.
 *
 * Reglas de actualización: una versión nueva NUNCA se activa ni recarga la página
 * mientras hay un anotador abierto. Tampoco se recarga ninguna pestaña por una actualización:
 * el service worker nuevo sirve las cargas siguientes y la página abierta sigue como está.
 */
import type { PartidoLocal } from './anotador-datos/prefetch'

export type { PartidoLocal }

type OnUpdate = (reg: ServiceWorkerRegistration, aplicar: () => void) => void

declare global {
  interface Window {
    __kabineAnotadorActivo?: boolean
  }
}

let registro: ServiceWorkerRegistration | null = null

/** ¿Hay un anotador abierto en esta pestaña? (ruta o marca explícita de la UI). */
export function anotadorActivo(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.__kabineAnotadorActivo) || window.location.pathname === '/anotador' || window.location.pathname.startsWith('/anotador/')
}

/** La UI del anotador la llama al montar (true) y desmontar (false). */
export function marcarAnotadorActivo(activo: boolean) {
  if (typeof window !== 'undefined') window.__kabineAnotadorActivo = activo
}

function pedirActivacion(sw: ServiceWorker | null | undefined) {
  sw?.postMessage({ type: 'SKIP_WAITING' })
}

export function registerServiceWorker(opts: { onUpdate?: OnUpdate } = {}) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  const registrar = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        registro = reg
        const nueva = () => {
          const espera = reg.waiting
          if (!espera || !navigator.serviceWorker.controller) return // primera instalación: nada que aplicar
          const aplicar = () => pedirActivacion(espera)
          if (opts.onUpdate) opts.onUpdate(reg, aplicar)
          // Con el anotador abierto no se toca nada: la versión nueva espera a que se cierre.
          else if (!anotadorActivo()) aplicar()
        }
        nueva()
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing
          sw?.addEventListener('statechange', () => { if (sw.state === 'installed') nueva() })
        })
      })
      .catch(() => {
        // El registro no es crítico.
      })
  }

  if (document.readyState === 'complete') registrar()
  else window.addEventListener('load', registrar)
}

// ------------------------------------------------------------ preparar offline

function mensajeSW<T>(msg: Record<string, unknown>, alProgreso?: (d: { hechos: number; total: number }) => void, finTipo = 'listo', timeoutMs = 120_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const sw = navigator.serviceWorker?.controller
    if (!sw) { reject(new Error('El modo sin conexión aún no está activo: recarga la página y vuelve a intentarlo')); return }
    const canal = new MessageChannel()
    const t = setTimeout(() => reject(new Error('Tiempo agotado preparando el modo sin conexión')), timeoutMs)
    canal.port1.onmessage = (e) => {
      const d = e.data || {}
      if (d.type === 'progreso') alProgreso?.(d)
      if (d.type === finTipo) { clearTimeout(t); resolve(d as T) }
    }
    sw.postMessage(msg, [canal.port2])
  })
}

/** Recursos que la página actual ya está usando (chunks, fuentes, marca) + la propia URL. */
export function recursosDeLaPagina(): string[] {
  if (typeof document === 'undefined') return []
  const urls = new Set<string>([window.location.pathname])
  const mismoOrigen = (u: string) => { try { return new URL(u, location.href).origin === location.origin } catch { return false } }
  const interesa = (u: string) => /\/_next\/static\/|\/fonts\/|\/brand\/|\/icons\//.test(u) || /\.(css|js|woff2?|svg|png)(\?|$)/.test(u)
  document.querySelectorAll<HTMLScriptElement>('script[src]').forEach((s) => { if (mismoOrigen(s.src) && interesa(s.src)) urls.add(new URL(s.src).pathname) })
  document.querySelectorAll<HTMLLinkElement>('link[href]').forEach((l) => { if (mismoOrigen(l.href) && interesa(l.href)) urls.add(new URL(l.href).pathname) })
  for (const e of performance.getEntriesByType('resource') as PerformanceResourceTiming[]) {
    if (mismoOrigen(e.name) && interesa(e.name)) urls.add(new URL(e.name).pathname)
  }
  return Array.from(urls)
}

export interface ResultadoPreparar {
  ok: boolean
  total: number
  fallidas: string[]
}

/**
 * "Preparar para jugar sin conexión": guarda la página actual, sus recursos y las URLs extra
 * (p. ej. otras rutas del anotador o fotos de jugadores) en la caché del service worker.
 */
export async function prepararOffline(
  urls: string[] = [],
  alProgreso?: (d: { hechos: number; total: number }) => void,
): Promise<ResultadoPreparar> {
  const todas = Array.from(new Set([...recursosDeLaPagina(), ...urls]))
  const r = await mensajeSW<{ ok: boolean; total: number; fallidas: string[] }>({ type: 'PREPARAR_OFFLINE', urls: todas }, alProgreso)
  return { ok: r.ok, total: r.total, fallidas: r.fallidas }
}

/** ¿Cuántas de estas URLs están ya guardadas? (para mostrar "listo para jugar sin conexión") */
export async function estadoOffline(urls: string[]): Promise<{ cacheadas: string[]; total: number }> {
  return mensajeSW({ type: 'ESTADO_OFFLINE', urls }, undefined, 'estado', 10_000)
}

// -------------------------------------------------------- datos del partido local

async function prefetchRuntime() {
  const [{ crearPrefetch }, { obtenerRuntime }, { partidosApi }, { convocatoriasApi }, { estadisticasPartidoApi }, { useEquipoStore }] = await Promise.all([
    import('./anotador-datos/prefetch'),
    import('./anotador-datos/runtime'),
    import('./api/partidos'),
    import('./api/convocatorias'),
    import('./api/estadisticasPartido'),
    import('@/stores/equipoStore'),
  ])
  const rt = await obtenerRuntime()
  return crearPrefetch({
    almacen: rt.almacen,
    caches: typeof caches !== 'undefined' ? (caches as unknown as Parameters<typeof crearPrefetch>[0]['caches']) : null,
    cargadores: {
      partido: (id) => partidosApi.get(id),
      convocados: (id) => convocatoriasApi.listByPartido(id),
      informe: (id) => estadisticasPartidoApi.get(id),
      equipo: () => useEquipoStore.getState().equipoActivo ?? null,
    },
  })
}

/** Guarda partido + convocados (con foto) + informe en el dispositivo y precalienta las fotos. */
export async function prefetchPartido(partidoId: string): Promise<PartidoLocal> {
  return (await prefetchRuntime()).prefetchPartido(partidoId)
}

/** Datos del partido guardados por `prefetchPartido` (null si nunca se precargó). */
export async function cargarPartidoLocal(partidoId: string): Promise<PartidoLocal | null> {
  try {
    return await (await prefetchRuntime()).cargarPartidoLocal(partidoId)
  } catch {
    return null
  }
}

// -------------------------------------------------- resumen de lo que hay en la tablet

export interface ResumenLocal {
  /** Partido → cambios que aún no han llegado al servidor (0 = al día). */
  pendientes: Record<string, number>
  /** Partidos con datos del anotador guardados en la tablet. */
  conDatos: string[]
  /** Partidos preparados para jugar sin conexión (precarga hecha). */
  preparados: Record<string, { guardadoAt: number; partido: unknown }>
}

/** Lee el almacén local (sin red): qué partidos están preparados y cuáles tienen cambios sin enviar. */
export async function resumenLocal(): Promise<ResumenLocal> {
  const [{ obtenerRuntime }, { resumirAlmacen }] = await Promise.all([
    import('./anotador-datos/runtime'),
    import('./anotador-datos/resumen'),
  ])
  const rt = await obtenerRuntime()
  return resumirAlmacen(rt.diario)
}

/** ¿Hay algún partido del anotador guardado en la tablet? (decide si se muestra la app sin sesión) */
export async function hayDatosLocalesAnotador(): Promise<boolean> {
  try {
    const r = await resumenLocal()
    return r.conDatos.length > 0 || Object.keys(r.preparados).length > 0
  } catch {
    return false
  }
}
