'use client'

/**
 * Estado «jugar sin conexión» de cada partido del selector:
 *  - qué partidos están listos (datos + fotos + página en la caché del service worker),
 *  - cuáles tienen cambios sin enviar,
 *  - preparar uno (con progreso) y preparar solo el próximo partido cuando hay red.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  estadoOffline,
  prefetchPartido,
  prepararOffline,
  resumenLocal,
  type ResumenLocal,
} from '@/lib/register-sw'

export type FaseOffline =
  | { fase: 'desconocido' }
  | { fase: 'no' }
  | { fase: 'preparando'; hechos: number; total: number }
  | { fase: 'listo'; guardadoAt: number }
  | { fase: 'error'; mensaje: string }

export interface PartidoOffline {
  fase: FaseOffline
  /** Cambios del anotador que aún no han llegado al servidor (0 = al día). */
  sinEnviar: number
}

const urlPartido = (id: string) => `/anotador/${id}`

/** Recursos de la ruta del partido (JS/CSS) leyendo su HTML: sin esto, abrirla sin red por primera vez fallaría. */
async function recursosDeRuta(id: string): Promise<string[]> {
  try {
    const r = await fetch(urlPartido(id), { cache: 'no-store', credentials: 'same-origin' })
    if (!r.ok) return []
    const html = await r.text()
    const out = new Set<string>([urlPartido(id)])
    for (const m of Array.from(html.matchAll(/(?:src|href)="(\/_next\/static\/[^"?]+)(?:\?[^"]*)?"/g))) out.add(m[1])
    return Array.from(out)
  } catch {
    return []
  }
}

export function useOfflinePartidos(opts: { partidoIds: string[]; proximoId?: string | null; automatico?: boolean }) {
  const { partidoIds, proximoId, automatico = true } = opts
  const [resumen, setResumen] = useState<ResumenLocal>({ pendientes: {}, conDatos: [], preparados: {} })
  const [cacheadas, setCacheadas] = useState<Set<string>>(new Set())
  const [progreso, setProgreso] = useState<Record<string, FaseOffline>>({})
  const [cargado, setCargado] = useState(false)
  const intentado = useRef(new Set<string>())
  const ids = partidoIds.join(',')

  const refrescar = useCallback(async () => {
    try {
      const r = await resumenLocal()
      setResumen(r)
      const urls = Object.keys(r.preparados).concat(partidoIds).map(urlPartido)
      if (urls.length) {
        try {
          const e = await estadoOffline(Array.from(new Set(urls)))
          setCacheadas(new Set(e.cacheadas))
        } catch { /* sin service worker activo aún: nada está en caché */ }
      }
    } catch { /* sin almacén local: se muestra «sin descargar» */ }
    setCargado(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])

  useEffect(() => {
    void refrescar()
    const t = window.setInterval(() => void refrescar(), 8000)
    const alVolver = () => void refrescar()
    window.addEventListener('online', alVolver)
    return () => { window.clearInterval(t); window.removeEventListener('online', alVolver) }
  }, [refrescar])

  const preparar = useCallback(async (id: string) => {
    setProgreso((p) => ({ ...p, [id]: { fase: 'preparando', hechos: 0, total: 0 } }))
    try {
      await prefetchPartido(id) // partido + convocados + informe + fotos, en la tablet
      const extra = await recursosDeRuta(id)
      const r = await prepararOffline(extra, (d) => setProgreso((p) => ({ ...p, [id]: { fase: 'preparando', hechos: d.hechos, total: d.total } })))
      if (!r.ok && r.fallidas.length > Math.max(3, r.total / 4)) throw new Error('No se pudo guardar todo para jugar sin conexión. Inténtalo con mejor cobertura.')
      setProgreso((p) => { const n = { ...p }; delete n[id]; return n })
    } catch (e) {
      setProgreso((p) => ({ ...p, [id]: { fase: 'error', mensaje: e instanceof Error ? e.message : 'No se pudo preparar' } }))
    }
    await refrescar()
  }, [refrescar])

  // El próximo partido se prepara solo cuando hay red (una vez por sesión).
  useEffect(() => {
    if (!automatico || !proximoId || !cargado) return
    if (intentado.current.has(proximoId)) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    const listo = resumen.preparados[proximoId] && cacheadas.has(urlPartido(proximoId))
    if (listo) return
    intentado.current.add(proximoId)
    void preparar(proximoId)
  }, [automatico, proximoId, cargado, resumen, cacheadas, preparar])

  const de = useCallback((id: string): PartidoOffline => {
    const p = progreso[id]
    const pre = resumen.preparados[id]
    const fase: FaseOffline = p
      ? p
      : pre && cacheadas.has(urlPartido(id))
        ? { fase: 'listo', guardadoAt: pre.guardadoAt }
        : cargado ? { fase: 'no' } : { fase: 'desconocido' }
    return { fase, sinEnviar: resumen.pendientes[id] || 0 }
  }, [progreso, resumen, cacheadas, cargado])

  return { de, preparar, refrescar, pendientes: resumen.pendientes, preparados: resumen.preparados, cargado }
}
