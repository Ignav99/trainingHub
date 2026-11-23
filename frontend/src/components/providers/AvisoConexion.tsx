'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { mutate } from 'swr'
import { CloudOff, WifiOff } from 'lucide-react'
import { conexion, type EstadoConexion } from '@/lib/conexion'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1').replace('/v1', '')

/** No se avisa de parpadeos: el aviso aparece si el problema dura más que esto. */
const RETARDO_AVISO_MS = 1_500
const SONDEO_MS = 8_000

function suscribir(cb: () => void) {
  return conexion.suscribir(cb)
}

/** Revalida todo lo montado (sin vaciar la caché). */
function revalidarTodo() {
  void mutate(() => true).catch(() => undefined)
}

/**
 * Aviso discreto de conexión (abajo, centrado). Sin red: lo dice el navegador.
 * Servidor sin responder: lo detecta el cliente API tras varios fallos
 * seguidos; mientras dure, se sondea el servidor y, en cuanto responde, se
 * revalidan los datos de la pantalla sin recargar.
 */
export function AvisoConexion() {
  const estado = useSyncExternalStore<EstadoConexion>(suscribir, conexion.estado, () => 'ok')
  const [visible, setVisible] = useState(false)

  // Eventos del navegador.
  useEffect(() => {
    const off = () => conexion.sinRed()
    const on = () => {
      conexion.conRed()
      revalidarTodo()
    }
    if (navigator.onLine === false) conexion.sinRed()
    window.addEventListener('offline', off)
    window.addEventListener('online', on)
    return () => {
      window.removeEventListener('offline', off)
      window.removeEventListener('online', on)
    }
  }, [])

  // Retardo antes de mostrar; se oculta al instante al recuperarse.
  useEffect(() => {
    if (estado === 'ok') {
      setVisible(false)
      return
    }
    const t = setTimeout(() => setVisible(true), RETARDO_AVISO_MS)
    return () => clearTimeout(t)
  }, [estado])

  // Servidor caído: sondeo ligero hasta que vuelva.
  useEffect(() => {
    if (estado !== 'servidor') return
    let vivo = true
    const sondear = async () => {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 6_000)
      try {
        const r = await fetch(`${API_BASE}/`, { method: 'GET', signal: ctrl.signal, cache: 'no-store' })
        if (vivo && r.status < 500) {
          conexion.exito()
          revalidarTodo()
        }
      } catch {
        // sigue caído
      } finally {
        clearTimeout(t)
      }
    }
    const id = setInterval(sondear, SONDEO_MS)
    return () => {
      vivo = false
      clearInterval(id)
    }
  }, [estado])

  if (!visible || estado === 'ok') return null

  const sinRed = estado === 'sin-red'
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4"
    >
      <div className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full border border-border bg-card/95 px-3.5 py-1.5 text-xs text-foreground shadow-md backdrop-blur">
        {sinRed ? (
          <WifiOff aria-hidden className="h-3.5 w-3.5 flex-none text-muted-foreground" />
        ) : (
          <CloudOff aria-hidden className="h-3.5 w-3.5 flex-none text-muted-foreground" />
        )}
        <span>
          {sinRed
            ? 'Sin conexión. Ves los últimos datos guardados; se actualizará al volver la red.'
            : 'El servidor tarda en responder. Ves los últimos datos; reintentando…'}
        </span>
        {!sinRed && (
          <button
            type="button"
            onClick={() => {
              conexion.exito()
              revalidarTodo()
            }}
            className="ml-1 flex-none rounded-full px-2 py-0.5 font-medium text-primary hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  )
}
