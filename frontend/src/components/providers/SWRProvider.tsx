'use client'

import { SWRConfig } from 'swr'
import { apiFetcher } from '@/lib/swr'
import { installInstantCache } from '@/lib/instantCache'
import { persistentCacheProvider } from '@/lib/swrPersist'
import { decisionReintentoSWR } from '@/lib/api/reintento'
import { AvisoConexion } from './AvisoConexion'

installInstantCache()

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1').replace('/v1', '')

// Module-level warm-up: fires immediately on JS load (before React mounts)
// to wake backend from Render cold start as early as possible.
// Uses GET instead of HEAD because FastAPI doesn't auto-handle HEAD.
if (typeof window !== 'undefined') {
  fetch(`${API_BASE}/`, { method: 'GET' }).catch(() => {})
}

// Chunk loading error recovery: when a deploy changes chunk hashes,
// stale tabs may request chunks that no longer exist → 404 → crash.
// Auto-reload once to pick up the new HTML with correct chunk references.
if (typeof window !== 'undefined') {
  const RELOAD_KEY = 'kabine-chunk-reload'

  window.addEventListener('error', (event) => {
    const msg = event.message || ''
    if (msg.includes('ChunkLoadError') || msg.includes('Loading chunk')) {
      // Prevent infinite reload loop — only retry once per 60 seconds
      const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || '0')
      if (Date.now() - lastReload > 60_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
        window.location.reload()
      }
    }
  })
}

export function SWRProvider({ children }: { children: React.ReactNode }) {

  return (
    <SWRConfig
      value={{
        // Same default cache, hydrated from localStorage (per account, wiped on
        // logout). To disable: remove this line.
        provider: persistentCacheProvider,
        fetcher: apiFetcher,
        // Revalidar al volver a la pestaña pisaría formularios que copian los
        // datos al montar; cada pantalla que lo necesita lo activa en su clave.
        revalidateOnFocus: false,
        // Al volver la red se refresca lo que haya en pantalla.
        revalidateOnReconnect: true,
        // 30s deduping made every list look stale for up to 30s after a
        // mutation + navigation; 5s still absorbs request bursts on preload.
        dedupingInterval: 5000,
        focusThrottleInterval: 30000,
        // Nunca vaciar la pantalla al cambiar de clave o al fallar.
        keepPreviousData: true,
        // Aviso de "lento" para pantallas que lo quieran (onLoadingSlow).
        loadingTimeout: 4000,
        // Reintentos con backoff exponencial + jitter solo para red/5xx/429
        // (respetando Retry-After). 4xx de validación o permisos: nunca.
        // El cliente API ya reintenta los GET un par de veces; esto cubre
        // caídas más largas sin martillear el servidor.
        onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
          const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false
          const espera = decisionReintentoSWR(error, retryCount, { maxIntentos: 4, online })
          if (espera === null) return
          setTimeout(() => {
            void revalidate({ retryCount })
          }, espera)
        },
      }}
    >
      {children}
      <AvisoConexion />
    </SWRConfig>
  )
}
