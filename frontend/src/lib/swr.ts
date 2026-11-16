import { api } from './api/client'
import { listaDescansosEnCache } from './api/descansos'
import { lecturaDescansosObsoleta } from './descansosSync'

/**
 * Global fetcher for SWR — delegates to api.get() which handles auth headers.
 * SWR keys are API paths with query strings: "/path?param=value&..."
 */
export async function apiFetcher<T>(key: string): Promise<T> {
  const inicio = Date.now()
  const [path, queryString] = key.split('?')
  const params: Record<string, string> = {}
  if (queryString) {
    new URLSearchParams(queryString).forEach((value, k) => {
      params[k] = value
    })
  }
  const data = await api.get<T>(path, Object.keys(params).length ? { params } : undefined)
  // Un GET de descansos pedido antes del clic no puede borrar el día que
  // acaba de pintarse. Se devuelve la lista que ya está en caché.
  if (path === '/descansos' && lecturaDescansosObsoleta(inicio)) {
    const vigente = listaDescansosEnCache(key)
    if (vigente) return vigente as T
  }
  return data
}

/**
 * Build SWR cache key from API path and params.
 * Returns null if any required param is missing (SWR skips fetch with null key).
 *
 * Usage:
 *   apiKey('/sesiones', { page: 1, limit: 10 })
 *   apiKey('/partidos', { equipo_id }, ['equipo_id'])  // null if equipo_id is falsy
 *   apiKey('/tareas/123')                               // simple path, no params
 */
export function apiKey(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  requiredParams?: string[]
): string | null {
  if (requiredParams?.length) {
    for (const key of requiredParams) {
      if (!params || params[key] === undefined || params[key] === null || params[key] === '') {
        return null
      }
    }
  }

  if (!params) return path

  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })

  const qs = searchParams.toString()
  return qs ? `${path}?${qs}` : path
}
