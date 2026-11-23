/**
 * Política de reintentos de la app (cliente API y SWR). Pura: sin fetch, sin
 * alias `@/`, se prueba con `node --test`.
 *
 * Se reintenta solo lo que puede salir bien al repetir: caídas de red,
 * timeouts, 408, 429 (respetando Retry-After) y 502/503/504 (servidor
 * despertando o saturado). Nunca 4xx de validación, permisos o auth.
 */

/** Estados HTTP que merecen otro intento. */
const REINTENTABLES = new Set([408, 425, 429, 500, 502, 503, 504])

/** Para GET idempotente (cliente): 500 se deja fuera, suele ser un error real. */
const REINTENTABLES_GET = new Set([408, 425, 429, 502, 503, 504])

export const MAX_ESPERA_MS = 8_000
/** Tope a lo que pida el servidor en Retry-After, para no dejar la pantalla colgada. */
export const MAX_RETRY_AFTER_MS = 15_000

/** ¿Merece la pena repetir un GET con este estado? (`undefined` = sin respuesta: red/timeout). */
export function reintentableGet(status: number | undefined): boolean {
  return status === undefined || REINTENTABLES_GET.has(status)
}

/** ¿Merece la pena que SWR vuelva a pedir esta clave? */
export function reintentableSWR(status: number | undefined): boolean {
  return status === undefined || REINTENTABLES.has(status)
}

/**
 * Retry-After en ms. Admite segundos ("3") o fecha HTTP. Null si no hay o es
 * ilegible. Se acota a [0, MAX_RETRY_AFTER_MS].
 */
export function parseRetryAfter(valor: string | null | undefined, ahora: number = Date.now()): number | null {
  if (!valor) return null
  const v = valor.trim()
  if (/^\d+(\.\d+)?$/.test(v)) return Math.min(MAX_RETRY_AFTER_MS, Math.max(0, Math.round(Number(v) * 1000)))
  const t = Date.parse(v)
  if (Number.isNaN(t)) return null
  return Math.min(MAX_RETRY_AFTER_MS, Math.max(0, t - ahora))
}

/**
 * Espera antes del intento `intento` (0 = primer reintento): backoff
 * exponencial con jitter ("equal jitter": mitad fija, mitad aleatoria), para
 * que muchas pestañas o claves no reintenten a la vez. Si el servidor dio
 * Retry-After, se espera al menos eso.
 */
export function esperaReintento(
  intento: number,
  opts: { baseMs?: number; maxMs?: number; retryAfterMs?: number | null; azar?: () => number } = {}
): number {
  const base = opts.baseMs ?? 600
  const max = opts.maxMs ?? MAX_ESPERA_MS
  const azar = opts.azar ?? Math.random
  const techo = Math.min(max, base * 2 ** Math.max(0, intento))
  const espera = Math.round(techo / 2 + azar() * (techo / 2))
  const ra = opts.retryAfterMs
  if (typeof ra === 'number' && ra > 0) return Math.max(espera, Math.min(ra, MAX_RETRY_AFTER_MS))
  return espera
}

/** Estado HTTP de un error lanzado por el cliente API (o undefined si fue de red). */
export function estadoDeError(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined
  const e = err as { statusCode?: unknown; status?: unknown }
  const s = typeof e.statusCode === 'number' ? e.statusCode : typeof e.status === 'number' ? e.status : undefined
  return s
}

export function retryAfterDeError(err: unknown): number | null {
  if (!err || typeof err !== 'object') return null
  const v = (err as { retryAfterMs?: unknown }).retryAfterMs
  return typeof v === 'number' && v > 0 ? v : null
}

/**
 * Decisión de SWR (onErrorRetry): devuelve la espera en ms o null si no se
 * reintenta. Sin conexión no se gasta el presupuesto: SWR revalida al volver
 * la red (revalidateOnReconnect).
 */
export function decisionReintentoSWR(
  err: unknown,
  intento: number,
  opts: { maxIntentos?: number; online?: boolean; azar?: () => number } = {}
): number | null {
  const max = opts.maxIntentos ?? 4
  if (intento > max) return null
  if (opts.online === false) return null
  const status = estadoDeError(err)
  if (!reintentableSWR(status)) return null
  // SWR cuenta desde 1; el primer reintento usa la espera base.
  return esperaReintento(intento - 1, { baseMs: 1_000, maxMs: 15_000, retryAfterMs: retryAfterDeError(err), azar: opts.azar })
}

/** Caducidad (ms epoch) de un JWT, o null si no se puede leer. */
export function caducidadJwt(token: string | null | undefined): number | null {
  if (!token) return null
  const partes = token.split('.')
  if (partes.length < 2) return null
  try {
    const b64 = partes[1].replace(/-/g, '+').replace(/_/g, '/')
    const relleno = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const json =
      typeof atob === 'function'
        ? atob(relleno)
        : (globalThis as { Buffer?: { from(s: string, e: string): { toString(e: string): string } } }).Buffer?.from(relleno, 'base64').toString('utf8') ?? ''
    const exp = (JSON.parse(json) as { exp?: unknown }).exp
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

/** ¿El token sigue valiendo al menos `margenMs` más? Sin `exp` legible se da por bueno. */
export function tokenVigente(token: string | null | undefined, ahora: number = Date.now(), margenMs = 30_000): boolean {
  if (!token) return false
  const exp = caducidadJwt(token)
  return exp === null || exp - ahora > margenMs
}
