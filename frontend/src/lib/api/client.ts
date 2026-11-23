import { getSupabaseClient } from '@/lib/supabase/client'
import { conexion } from '@/lib/conexion'
import { esperaReintento, parseRetryAfter, reintentableGet, tokenVigente } from './reintento'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1'

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
  timeout?: number
  /** Solo GET: reintentos ante red/timeout/429/502-504 (por defecto 2; 0 = ninguno). */
  retries?: number
}

/**
 * Error del cliente API. Mantiene el `message` de siempre (las pantallas lo
 * enseñan tal cual) y añade el estado HTTP para decidir reintentos.
 */
export class ApiError extends Error {
  statusCode?: number
  retryAfterMs?: number
  /** Sin respuesta del servidor (red caída o timeout). */
  sinRespuesta: boolean
  constructor(message: string, opts: { statusCode?: number; retryAfterMs?: number | null; sinRespuesta?: boolean; name?: string } = {}) {
    super(message)
    this.name = opts.name ?? 'ApiError'
    this.statusCode = opts.statusCode
    if (opts.retryAfterMs != null) this.retryAfterMs = opts.retryAfterMs
    this.sinRespuesta = opts.sinRespuesta === true
  }
}

// Helper to get token from localStorage (zustand persist)
function getPersistedToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('traininghub-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.accessToken || null
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

function extractErrorMessage(error: any, status: number): string {
  if (!error?.detail) {
    if (status === 429) return 'Demasiadas peticiones seguidas. Reintentando en unos segundos…'
    if (status === 502 || status === 503 || status === 504) return 'El servidor no responde ahora mismo. Reintentando…'
    return `Error del servidor (${status})`
  }
  if (typeof error.detail === 'string') return error.detail
  if (Array.isArray(error.detail)) {
    return error.detail.map((e: any) => e.msg || JSON.stringify(e)).join('; ')
  }
  if (typeof error.detail === 'object') {
    const detail = error.detail as Record<string, unknown>
    if (detail.error === 'permission_denied') {
      return 'No tenés permiso para realizar esta acción'
    }
    if (detail.error === 'feature_not_available') {
      return 'Esta funcionalidad no está disponible en tu plan actual'
    }
    if (detail.error === 'subscription_required') {
      return 'Tu suscripción no permite esta acción. Contactá al administrador'
    }
    if (typeof detail.message === 'string') return detail.message
    if (typeof detail.detail === 'string') return detail.detail
  }
  return `Error del servidor (${status})`
}

/** Convierte una respuesta no-OK en ApiError (mismo texto que antes para cada estado). */
async function errorDeRespuesta(response: Response, conAuth = true): Promise<ApiError> {
  const error = await response.json().catch(() => ({}))
  const status = response.status
  const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'))
  let message: string
  if (conAuth && status === 401) message = 'Error de autenticación: ' + (typeof error?.detail === 'string' ? error.detail : 'Sesión expirada')
  else message = extractErrorMessage(error, status)
  return new ApiError(message, { statusCode: status, retryAfterMs })
}

/** Error de fetch sin respuesta (timeout o red). */
function errorDeRed(err: unknown, porTimeout: boolean): ApiError {
  if (porTimeout) {
    return new ApiError('El servidor tardó demasiado en responder', { sinRespuesta: true, name: 'TimeoutError' })
  }
  const msg = err instanceof Error ? err.message : ''
  return new ApiError(msg && !/fetch|network|load failed/i.test(msg) ? msg : 'Sin conexión con el servidor', {
    sinRespuesta: true,
    name: 'NetworkError',
  })
}

function falloDeServidor(status: number | undefined): boolean {
  return status === undefined || status === 502 || status === 503 || status === 504
}

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export type InstantWriteOp = {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  result?: unknown
}

type InstantReflector = {
  start(op: InstantWriteOp): { rollback(): void }
  commit(op: InstantWriteOp): void
}

let instantReflector: InstantReflector | null = null

/** Registered once from the instant cache. Kept here so the client does not import SWR. */
export function registerInstantCache(reflector: InstantReflector) {
  instantReflector = reflector
}

const noopInstant = { rollback() {} }

type Timer = { signal: AbortSignal; clear: () => void; expirado: () => boolean }

class ApiClient {
  private baseUrl: string
  private defaultTimeout: number
  private cachedToken: string | null = null
  private tokenExpiry = 0
  /** Una sola lectura/refresco de sesión a la vez: 20 peticiones con token caducado no lanzan 20 refrescos. */
  private sesionEnCurso: Promise<string | null> | null = null
  private refrescoEnCurso: Promise<string | null> | null = null
  /** GET idénticos en vuelo comparten la misma petición. */
  private getsEnVuelo = new Map<string, Promise<unknown>>()

  constructor(baseUrl: string, defaultTimeout = 30000) {
    this.baseUrl = baseUrl
    this.defaultTimeout = defaultTimeout

    // Invalidate cache on auth state changes
    if (typeof window !== 'undefined') {
      getSupabaseClient().auth.onAuthStateChange((_event, session) => {
        this.cachedToken = session?.access_token ?? null
        this.tokenExpiry = session?.access_token ? Date.now() + 30_000 : 0
      })
    }
  }

  private recordarToken(token: string | null) {
    this.cachedToken = token
    this.tokenExpiry = token ? Date.now() + 30_000 : 0
  }

  private leerSesion(): Promise<string | null> {
    if (!this.sesionEnCurso) {
      this.sesionEnCurso = getSupabaseClient()
        .auth.getSession()
        .then(({ data: { session } }) => session?.access_token || null)
        .catch(() => null)
        .finally(() => {
          this.sesionEnCurso = null
        })
    }
    return this.sesionEnCurso
  }

  /** Refresco compartido tras un 401. */
  private refrescarSesion(): Promise<string | null> {
    if (!this.refrescoEnCurso) {
      this.refrescoEnCurso = getSupabaseClient()
        .auth.refreshSession()
        .then(({ data }) => data.session?.access_token || null)
        .catch(() => null)
        .then((token) => {
          this.recordarToken(token)
          return token
        })
        .finally(() => {
          // Se suelta un poco después: las peticiones que fallaron a la vez
          // reutilizan este mismo refresco.
          setTimeout(() => {
            this.refrescoEnCurso = null
          }, 2_000)
        })
    }
    return this.refrescoEnCurso
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const now = Date.now()
    if (this.cachedToken && now < this.tokenExpiry && tokenVigente(this.cachedToken, now)) {
      return { Authorization: `Bearer ${this.cachedToken}` }
    }

    // Persisted token first (synchronous), but only while it is still valid:
    // a token from a sleeping tab would answer 401 on every request.
    const persisted = getPersistedToken()
    if (persisted && tokenVigente(persisted, now)) {
      this.recordarToken(persisted)
      return { Authorization: `Bearer ${persisted}` }
    }

    // Supabase refreshes the session if needed. Shared between parallel calls.
    const token = await this.leerSesion()
    if (token) {
      this.recordarToken(token)
      return { Authorization: `Bearer ${token}` }
    }
    return persisted ? { Authorization: `Bearer ${persisted}` } : {}
  }

  private instantStart(
    method: InstantWriteOp['method'],
    path: string,
    body?: unknown,
    params?: InstantWriteOp['params'],
  ) {
    if (!instantReflector) return noopInstant
    return instantReflector.start({ method, path, body, params })
  }

  private instantCommit(
    method: InstantWriteOp['method'],
    path: string,
    body: unknown,
    params: InstantWriteOp['params'],
    result: unknown,
  ) {
    instantReflector?.commit({ method, path, body, params, result })
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value))
        }
      })
    }
    return url.toString()
  }

  private createAbortSignal(timeoutMs?: number): Timer {
    const controller = new AbortController()
    let expired = false
    const timeout = setTimeout(() => {
      expired = true
      controller.abort()
    }, timeoutMs ?? this.defaultTimeout)
    return { signal: controller.signal, clear: () => clearTimeout(timeout), expirado: () => expired }
  }

  /**
   * Un intento: fetch + lectura del cuerpo bajo el mismo timeout (un cuerpo
   * que no termina de llegar también cuenta). Con 401 refresca la sesión una
   * vez (compartido) y repite: el servidor no llegó a procesar la petición.
   */
  private async intento<T>(
    url: string,
    init: RequestInit,
    opts: { timeout?: number; auth: boolean; leer: (r: Response) => Promise<T>; keepalive?: boolean },
  ): Promise<T> {
    for (let auth401 = 0; ; auth401++) {
      const authHeaders = opts.auth ? (auth401 > 0 ? await this.headersTrasRefresco() : await this.getAuthHeaders()) : {}
      const timer = opts.keepalive ? null : this.createAbortSignal(opts.timeout)
      let response: Response
      try {
        response = await fetch(url, {
          ...init,
          headers: { ...authHeaders, ...(init.headers as Record<string, string> | undefined) },
          signal: timer?.signal,
        })
      } catch (err) {
        timer?.clear()
        conexion.fallo()
        throw errorDeRed(err, !!timer?.expirado())
      }

      if (!response.ok) {
        if (response.status === 401 && opts.auth && auth401 === 0) {
          timer?.clear()
          // Sesión caducada: un solo refresco compartido y otro intento.
          await response.body?.cancel().catch(() => {})
          continue
        }
        try {
          const e = await errorDeRespuesta(response, opts.auth)
          if (falloDeServidor(e.statusCode)) conexion.fallo()
          else conexion.exito()
          throw e
        } finally {
          timer?.clear()
        }
      }

      try {
        const out = await opts.leer(response)
        conexion.exito()
        return out
      } catch (err) {
        if (timer?.expirado()) {
          conexion.fallo()
          throw errorDeRed(err, true)
        }
        throw err
      } finally {
        timer?.clear()
      }
    }
  }

  private async headersTrasRefresco(): Promise<HeadersInit> {
    const token = await this.refrescarSesion()
    return token ? { Authorization: `Bearer ${token}` } : await this.getAuthHeaders()
  }

  async get<T>(path: string, options?: FetchOptions & { public?: boolean }): Promise<T> {
    const url = this.buildUrl(path, options?.params)
    const compartible = !options?.headers && !options?.signal
    const clave = `${options?.public ? 'p' : 'a'}|${url}`
    if (compartible) {
      const enVuelo = this.getsEnVuelo.get(clave)
      if (enVuelo) return enVuelo as Promise<T>
    }
    const p = this.getConReintentos<T>(url, options)
    if (compartible) {
      this.getsEnVuelo.set(clave, p)
      // Se suelta al terminar, bien o mal: nada se queda colgado.
      p.then(
        () => this.getsEnVuelo.delete(clave),
        () => this.getsEnVuelo.delete(clave),
      )
    }
    return p
  }

  private async getConReintentos<T>(url: string, options?: FetchOptions & { public?: boolean }): Promise<T> {
    const max = Math.max(0, options?.retries ?? 2)
    for (let n = 0; ; n++) {
      try {
        return await this.intento<T>(
          url,
          { method: 'GET', headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string> | undefined) } },
          { timeout: options?.timeout, auth: !options?.public, leer: (r) => r.json() as Promise<T> },
        )
      } catch (err) {
        const e = err as ApiError
        const status = e instanceof ApiError ? e.statusCode : undefined
        const sinRespuesta = e instanceof ApiError ? e.sinRespuesta : true
        // Un timeout ya costó mucho: como mucho un reintento.
        const tope = e instanceof ApiError && e.name === 'TimeoutError' ? Math.min(max, 1) : max
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false
        if (n >= tope || offline || !(sinRespuesta || reintentableGet(status))) throw err
        await dormir(esperaReintento(n, { retryAfterMs: e instanceof ApiError ? e.retryAfterMs : null }))
      }
    }
  }

  async post<T>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params)
    const pending = this.instantStart('POST', path, data, options?.params)
    let result: T
    try {
      result = await this.intento<T>(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string> | undefined) },
          body: data ? JSON.stringify(data) : undefined,
        },
        { timeout: options?.timeout, auth: true, leer: (r) => r.json() as Promise<T> },
      )
    } catch (err) {
      pending.rollback()
      throw err
    }
    this.instantCommit('POST', path, data, options?.params, result)
    return result
  }

  async *postStream<T>(path: string, data?: unknown): AsyncGenerator<T, void, unknown> {
    const url = this.buildUrl(path)
    const authHeaders = await this.getAuthHeaders()

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeaders as Record<string, string>),
      },
      body: data ? JSON.stringify(data) : undefined,
      // No AbortSignal — SSE connections are long-lived by design
    })

    if (!response.ok) {
      throw await errorDeRespuesta(response)
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ') && line.length > 6) {
            try {
              yield JSON.parse(line.slice(6)) as T
            } catch {
              // skip malformed SSE line
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async put<T>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
    return this.sendJson<T>('PUT', path, data, options)
  }

  async patch<T>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
    return this.sendJson<T>('PATCH', path, data, options)
  }

  private async sendJson<T>(
    method: 'PUT' | 'PATCH',
    path: string,
    data?: unknown,
    options?: FetchOptions,
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params)
    const body = data ? JSON.stringify(data) : undefined
    // keepalive sobrevive a cerrar la pestaña, pero el navegador lo rechaza
    // por encima de 64 KB y no admite AbortSignal a la vez.
    const keepalive = options?.keepalive === true && (!body || body.length < 60_000)
    const pending = this.instantStart(method, path, data, options?.params)
    let result: T
    try {
      result = await this.intento<T>(
        url,
        {
          method,
          headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string> | undefined) },
          body,
          keepalive,
        },
        { timeout: options?.timeout, auth: true, keepalive, leer: (r) => r.json() as Promise<T> },
      )
    } catch (err) {
      pending.rollback()
      throw err
    }
    this.instantCommit(method, path, data, options?.params, result)
    return result
  }

  async upload<T>(path: string, formData: FormData, options?: FetchOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params)
    // Don't set Content-Type for FormData - browser sets it with boundary
    // Use longer timeout for file uploads (60s)
    const result = await this.intento<T>(
      url,
      { method: 'POST', headers: { ...(options?.headers as Record<string, string> | undefined) }, body: formData },
      { timeout: options?.timeout ?? 60000, auth: true, leer: (r) => r.json() as Promise<T> },
    )
    this.instantCommit('POST', path, undefined, options?.params, result)
    return result
  }

  async getBlob(path: string, options?: FetchOptions): Promise<Blob> {
    const url = this.buildUrl(path, options?.params)
    return this.intento<Blob>(
      url,
      { method: 'GET', headers: { ...(options?.headers as Record<string, string> | undefined) } },
      { timeout: options?.timeout ?? 30000, auth: true, leer: (r) => r.blob() },
    )
  }

  async postBlob(path: string, data?: unknown, options?: FetchOptions): Promise<Blob> {
    const url = this.buildUrl(path, options?.params)
    return this.intento<Blob>(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string> | undefined) },
        body: data ? JSON.stringify(data) : undefined,
      },
      { timeout: options?.timeout ?? 120000, auth: true, leer: (r) => r.blob() },
    )
  }

  async delete(path: string, options?: FetchOptions): Promise<void> {
    const url = this.buildUrl(path, options?.params)
    const pending = this.instantStart('DELETE', path, undefined, options?.params)
    try {
      await this.intento<void>(
        url,
        { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string> | undefined) } },
        { timeout: options?.timeout, auth: true, leer: async () => undefined },
      )
    } catch (err) {
      pending.rollback()
      throw err
    }
    this.instantCommit('DELETE', path, undefined, options?.params, undefined)
  }
}

export const api = new ApiClient(API_URL)
