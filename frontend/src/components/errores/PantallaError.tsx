'use client'

import { startTransition, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { mutate } from 'swr'
import * as Sentry from '@sentry/nextjs'

function esErrorDeChunk(error: Error): boolean {
  const m = error?.message || ''
  return (
    error?.name === 'ChunkLoadError' ||
    m.includes('ChunkLoadError') ||
    m.includes('Loading chunk') ||
    m.includes('Failed to fetch dynamically imported module')
  )
}

/** Reintento automático como mucho una vez cada 30 s (el error.tsx se remonta en cada fallo). */
let ultimoAuto = 0
/** Fallos recientes (el estado local se pierde en cada remontaje). */
const fallosRecientes: number[] = []

/**
 * Contenido de los `error.tsx` de rutas. "Reintentar" vuelve a pintar el
 * segmento sin recargar la página: refresca los datos del servidor
 * (router.refresh), revalida SWR y llama a reset(). Solo si el mismo error
 * vuelve tres veces se ofrece recargar del todo.
 *
 * Un chunk de un deploy anterior (pestaña vieja) sí necesita recarga: se hace
 * sola una vez por minuto.
 */
export function PantallaError({
  error,
  reset,
  titulo = 'Error en esta sección',
  texto = 'Ha ocurrido un error inesperado. El resto de la aplicación sigue funcionando.',
  etiqueta,
}: {
  error: Error & { digest?: string }
  reset: () => void
  titulo?: string
  texto?: string
  etiqueta?: string
}) {
  const router = useRouter()
  const [intentos, setIntentos] = useState(0)

  useEffect(() => {
    const ahora = Date.now()
    fallosRecientes.push(ahora)
    while (fallosRecientes.length && ahora - fallosRecientes[0] > 120_000) fallosRecientes.shift()
    setIntentos(fallosRecientes.length)
  }, [])

  useEffect(() => {
    if (esErrorDeChunk(error)) {
      try {
        const k = 'kabine-chunk-reload'
        const last = Number(sessionStorage.getItem(k) || '0')
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem(k, String(Date.now()))
          window.location.reload()
          return
        }
      } catch {
        // sin sessionStorage: seguimos con el aviso
      }
    }
    Sentry.captureException(error, etiqueta ? { tags: { seccion: etiqueta } } : undefined)
    console.error(`${etiqueta ?? 'Route'} error:`, error)
  }, [error, etiqueta])

  const reintentar = () => {
    void mutate(() => true).catch(() => undefined)
    startTransition(() => {
      router.refresh()
      reset()
    })
  }

  // Un primer reintento automático: muchos fallos son un dato a medio llegar.
  useEffect(() => {
    if (esErrorDeChunk(error) || Date.now() - ultimoAuto < 30_000) return
    ultimoAuto = Date.now()
    const t = setTimeout(reintentar, 1_200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{titulo}</h2>
        <p className="mb-6 text-sm text-muted-foreground">{texto}</p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={reintentar}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          {intentos >= 3 && (
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Recargar página
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
