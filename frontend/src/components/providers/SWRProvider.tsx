'use client'

import { SWRConfig } from 'swr'
import { apiFetcher } from '@/lib/swr'

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
        fetcher: apiFetcher,
        revalidateOnFocus: false,
        dedupingInterval: 30000,
        focusThrottleInterval: 30000,
        errorRetryCount: 2,
        errorRetryInterval: 3000,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  )
}
