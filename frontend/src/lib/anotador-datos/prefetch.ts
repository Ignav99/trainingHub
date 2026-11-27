/**
 * Precarga del partido para poder abrir el anotador sin conexión:
 * guarda partido + convocados (con fotos) + informe en nuestro propio
 * IndexedDB (no depende de la caché de API del service worker) y calienta
 * las fotos en la Cache API. Sin dependencias de la app: los cargadores se inyectan.
 */
import type { Almacen } from './almacen.ts'

export const CACHE_FOTOS = 'kabine-anotador-fotos'

export interface PartidoLocal {
  partidoId: string
  guardadoAt: number
  partido: unknown
  convocados: unknown[]
  informe: unknown | null
  equipo: unknown | null
  /** URLs de foto precargadas. */
  fotos: string[]
}

export interface CargadoresPrefetch {
  partido(id: string): Promise<unknown>
  convocados(id: string): Promise<{ data: unknown[] } | unknown[]>
  informe?(id: string): Promise<unknown>
  equipo?(): unknown
}

export interface CacheApiLike {
  open(name: string): Promise<{ match(u: string): Promise<unknown>; put(u: string, r: unknown): Promise<void> }>
}

const clave = (id: string) => `prefetch:${id}`

function fotoDe(c: unknown): string | null {
  const o = c as { jugador?: { foto_url?: string | null }; jugadores?: { foto_url?: string | null } }
  const u = o?.jugador?.foto_url || o?.jugadores?.foto_url
  return typeof u === 'string' && /^https?:\/\//.test(u) ? u : null
}

export function crearPrefetch(opts: {
  almacen: Almacen
  cargadores: CargadoresPrefetch
  caches?: CacheApiLike | null
  fetchFn?: (u: string, init?: RequestInit) => Promise<unknown>
  now?: () => number
}) {
  const now = opts.now ?? (() => Date.now())
  const fetchFn = opts.fetchFn ?? ((u: string, init?: RequestInit) => fetch(u, init))

  async function precalentarFotos(urls: string[]): Promise<string[]> {
    if (!opts.caches) return []
    const ok: string[] = []
    try {
      const cache = await opts.caches.open(CACHE_FOTOS)
      await Promise.all(urls.map(async (u) => {
        try {
          if (await cache.match(u)) { ok.push(u); return }
          const r = await fetchFn(u, { mode: 'no-cors' } as RequestInit)
          await cache.put(u, r) // respuesta opaca válida para <img>
          ok.push(u)
        } catch { /* una foto que falla no tumba la precarga */ }
      }))
    } catch { /* sin Cache API */ }
    return ok
  }

  return {
    /** Descarga y guarda todo lo necesario. Devuelve lo guardado (o lanza si no pudo leer el partido). */
    async prefetchPartido(partidoId: string): Promise<PartidoLocal> {
      const [partido, conv, informe] = await Promise.all([
        opts.cargadores.partido(partidoId),
        opts.cargadores.convocados(partidoId),
        (opts.cargadores.informe ? opts.cargadores.informe(partidoId) : Promise.resolve(null)).catch(() => null),
      ])
      const convocados = Array.isArray(conv) ? conv : (conv as { data: unknown[] }).data || []
      const urls = Array.from(new Set(convocados.map(fotoDe).filter((u): u is string => Boolean(u))))
      const fotos = await precalentarFotos(urls)
      const reg: PartidoLocal = {
        partidoId,
        guardadoAt: now(),
        partido,
        convocados,
        informe: informe ?? null,
        equipo: opts.cargadores.equipo?.() ?? null,
        fotos,
      }
      await opts.almacen.put('meta', clave(partidoId), { v: 1, d: reg })
      return reg
    },
    async cargarPartidoLocal(partidoId: string): Promise<PartidoLocal | null> {
      try {
        const r = (await opts.almacen.get('meta', clave(partidoId))) as { v?: number; d?: PartidoLocal } | undefined
        return r && typeof r === 'object' && r.d && Array.isArray(r.d.convocados) ? r.d : null
      } catch {
        return null
      }
    },
    precalentarFotos,
  }
}
