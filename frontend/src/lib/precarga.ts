import { preload } from 'swr'
import { SWRGlobalState, cache } from 'swr/_internal'
import { apiFetcher } from '@/lib/swr'
import { clavesDeRuta } from './precargaRutas'

const MIN_GAP_MS = 15_000
/**
 * preload() guarda la promesa hasta que un useSWR la consume; si nadie la
 * consume, una revalidación posterior (p. ej. tras guardar) recibiría datos
 * viejos. La soltamos a los pocos segundos.
 */
const PRELOAD_TTL_MS = 5_000
const lastRun = new Map<string, number>()

function ahorroDeDatos(): boolean {
  try {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    return conn?.saveData === true
  } catch {
    return false
  }
}

/** Calienta los datos de una ruta del menú al pasar el puntero, enfocar o tocar. */
export function precargarRuta(href: string, equipoId: string | null | undefined, rutaActual?: string) {
  if (typeof window === 'undefined' || href === rutaActual || ahorroDeDatos()) return
  const now = Date.now()
  for (const key of clavesDeRuta(href, equipoId)) {
    const prev = lastRun.get(key)
    if (prev !== undefined && now - prev < MIN_GAP_MS) continue
    lastRun.set(key, now)
    try {
      const req = preload(key, apiFetcher)
      Promise.resolve(req).catch(() => {})
      window.setTimeout(() => {
        try {
          const preloads = SWRGlobalState.get(cache)?.[3] as Record<string, unknown> | undefined
          if (preloads && preloads[key] === req) delete preloads[key]
        } catch {
          // ignorar
        }
      }, PRELOAD_TTL_MS)
    } catch {
      // la precarga nunca debe romper la navegación
    }
  }
}
