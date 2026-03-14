'use client'

import { SWRConfig } from 'swr'
import { apiFetcher } from '@/lib/swr'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1').replace('/v1', '')

// Module-level warm-up: fires immediately on JS load (before React mounts)
// to wake backend from Render cold start as early as possible
if (typeof window !== 'undefined') {
  fetch(`${API_BASE}/`, { method: 'HEAD' }).catch(() => {})
}

export function SWRProvider({ children }: { children: React.ReactNode }) {

  return (
    <SWRConfig
      value={{
        fetcher: apiFetcher,
        revalidateOnFocus: false,
        dedupingInterval: 10000,
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
