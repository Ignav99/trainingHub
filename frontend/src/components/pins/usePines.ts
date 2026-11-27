'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import useSWR, { mutate as mutateGlobal } from 'swr'
import { apiKey } from '@/lib/swr'
import { normalizarRuta, parsearAncla, type Ancla, type Punto } from '@/lib/pins/ancla'
import { ATTR_UI, resolverAncla } from '@/lib/pins/ancla-dom'
import { entidadDeRuta, paginaDeRuta } from '@/lib/pins/entidad'
import type { PinesRespuesta } from '@/lib/api/tablero'
import type { StaffHilo } from '@/types'

export interface Pin {
  hilo: StaffHilo
  ancla: Ancla
  numero: number
}

/** Vista actual (ruta + claves de query que cambian lo que se ve). */
export function useRutaVista(): { ruta: string; path: string } {
  const pathname = usePathname() || '/'
  const search = useSearchParams()
  const ruta = normalizarRuta(pathname, search ?? '')
  return { ruta, path: ruta.split('?')[0] }
}

export function clavePines(equipoId: string | undefined | null, path: string): string | null {
  return apiKey('/tablero/pines', { equipo_id: equipoId || undefined, ruta: path }, ['equipo_id', 'ruta'])
}

/** Comentarios anclados de la página actual, numerados por orden de creación. */
export function usePines(equipoId: string | undefined | null, activo: boolean) {
  const { ruta, path } = useRutaVista()
  const key = activo ? clavePines(equipoId, path) : null
  const { data, error, mutate } = useSWR<PinesRespuesta>(key, {
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
    refreshInterval: 60_000,
  })

  const todos = useMemo<Pin[]>(() => {
    const lista: Pin[] = []
    for (const h of data?.data ?? []) {
      const ancla = parsearAncla(h.ancla)
      if (ancla) lista.push({ hilo: h, ancla, numero: 0 })
    }
    return lista
  }, [data])

  // Todos los de la página (para enlaces profundos) y solo los de esta vista.
  const pines = useMemo(
    () =>
      todos
        .filter((p) => p.ancla.ruta === ruta)
        .map((p, i) => ({ ...p, numero: i + 1 })),
    [todos, ruta]
  )

  return {
    key,
    ruta,
    path,
    todos,
    pines,
    mutate,
    cargando: Boolean(key) && !data && !error,
    /** undefined mientras no se sabe; false = falta aplicar la migración. */
    disponible: data ? data.disponible !== false : undefined,
  }
}

export function pinesSinResolver(pines: Pin[]): number {
  return pines.filter((p) => p.hilo.estado !== 'resuelta').length
}

export function refrescarPines() {
  return mutateGlobal((k) => typeof k === 'string' && k.startsWith('/tablero/pines'))
}

export interface Posicion {
  punto: Punto
  origen: 'elemento' | 'pagina'
  visible: boolean
}

/**
 * Posición en ventana de cada marcador. Se recalcula al hacer scroll (también
 * en contenedores internos), al cambiar el tamaño y cuando el DOM de la página
 * se mueve; siempre agrupado en un frame y solo si algo ha cambiado.
 */
export function usePosiciones(pines: Pin[], forzar?: string | null): Record<string, Posicion> {
  const [pos, setPos] = useState<Record<string, Posicion>>({})
  const cache = useRef(new Map<string, Element | null>())
  const pinesRef = useRef(pines)
  const raf = useRef(0)

  const calcular = useCallback(() => {
    raf.current = 0
    const vw = window.innerWidth
    const vh = window.innerHeight
    const sig: Record<string, Posicion> = {}
    for (const p of pinesRef.current) {
      const r = resolverAncla(p.ancla, cache.current.get(p.hilo.id))
      cache.current.set(p.hilo.id, r.el)
      const { x, y } = r.punto
      sig[p.hilo.id] = {
        punto: { x: Math.round(x), y: Math.round(y) },
        origen: r.origen,
        visible: x >= -4 && y >= -4 && x <= vw + 4 && y <= vh + 4,
      }
    }
    setPos((prev) => {
      const ks = Object.keys(sig)
      if (ks.length === Object.keys(prev).length && ks.every((k) => {
        const a = prev[k]
        const b = sig[k]
        return a && a.punto.x === b.punto.x && a.punto.y === b.punto.y && a.visible === b.visible && a.origen === b.origen
      })) return prev
      return sig
    })
  }, [])

  const pedir = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(calcular)
  }, [calcular])

  useLayoutEffect(() => {
    pinesRef.current = pines
    cache.current.clear()
    calcular()
  }, [pines, calcular, forzar])

  useEffect(() => {
    const onScroll = () => pedir()
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onScroll)
    const ro = new ResizeObserver(onScroll)
    ro.observe(document.body)
    const mo = new MutationObserver((registros) => {
      if (registros.every((r) => r.target instanceof Element && r.target.closest(`[${ATTR_UI}]`))) return
      pedir()
    })
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', onScroll)
      ro.disconnect()
      mo.disconnect()
      if (raf.current) cancelAnimationFrame(raf.current)
      raf.current = 0
    }
  }, [pedir])

  return pos
}

export interface ListaHilos {
  data: StaffHilo[]
  siguiente: string | null
}

/** Hilos del staff sobre lo que se está viendo: la entidad (sesión, partido…) o, si no hay, la página. */
export function useHilosPagina(equipoId: string | undefined | null, activo: boolean) {
  const pathname = usePathname() || '/'
  const search = useSearchParams()
  const entidad = entidadDeRuta(pathname, search ?? '')
  const pagina = paginaDeRuta(pathname)
  const key = activo
    ? apiKey(
        '/tablero',
        entidad
          ? { equipo_id: equipoId || undefined, entidad_tipo: entidad.tipo, entidad_id: entidad.id, limit: 50 }
          : { equipo_id: equipoId || undefined, pagina, limit: 50 },
        ['equipo_id']
      )
    : null
  const { data, error, mutate } = useSWR<ListaHilos>(key, {
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
    refreshInterval: 60_000,
  })
  const hilos = useMemo(() => (data?.data ?? []).filter((h) => !h.ancla), [data])
  return {
    key,
    entidad,
    pagina,
    hilos,
    mutate,
    sinResolver: hilos.filter((h) => h.estado !== 'resuelta').length,
    cargando: Boolean(key) && !data && !error,
  }
}
