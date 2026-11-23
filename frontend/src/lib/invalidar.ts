import { mutate } from 'swr'
import {
  claveAfectada,
  objetivosDePrefijos,
  objetivosDeEscritura,
  unirObjetivos,
  type Objetivos,
} from './invalidacion'

/**
 * Revalida en segundo plano las claves SWR de esas colecciones (listas) y de
 * esos agregados (subárbol). NO vacía la caché: la pantalla sigue mostrando lo
 * que tenía hasta que llega lo nuevo (ojo: `mutate(filtro, undefined, …)` sí
 * la vacía; por eso aquí se llama con un solo argumento).
 *
 *   invalidar(['/sesiones', '/microciclos'])
 *   invalidar(['/rpe'], ['/carga', '/dashboard'])
 */
export function invalidar(prefijos: string[], agregados: string[] = []): Promise<unknown> {
  const o = objetivosDePrefijos(prefijos, agregados)
  return mutate((key: unknown) => claveAfectada(key, o)).catch(() => undefined)
}

const ESPERA_MS = 600
const HUECO_MIN_MS = 2_500

let pendiente: Objetivos | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let ultimo = 0

function vaciar() {
  timer = null
  const o = pendiente
  pendiente = null
  if (!o || (!o.listas.length && !o.agregados.length)) return
  ultimo = Date.now()
  void mutate((key: unknown) => claveAfectada(key, o)).catch(() => undefined)
}

/**
 * Tras un guardado: agrupa las invalidaciones de varios guardados seguidos
 * (autoguardado, lotes) en una sola tanda, como mucho cada 2,5 s, para no
 * disparar el rate limit del servidor.
 */
export function invalidarTrasEscritura(path: string) {
  if (typeof window === 'undefined') return
  const o = objetivosDeEscritura(path)
  if (!o.listas.length && !o.agregados.length) return
  pendiente = pendiente ? unirObjetivos(pendiente, o) : o
  if (timer) return
  const espera = Math.max(ESPERA_MS, ultimo + HUECO_MIN_MS - Date.now())
  timer = setTimeout(vaciar, espera)
}
