'use client'

import { SWRConfig } from 'swr'
import { apiFetcher } from '@/lib/swr'
import { useEffect } from 'react'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1').replace('/v1', '')

export function SWRProvider({ children }: { children: React.ReactNode }) {
  // Warm-up: ping backend on mount to wake it from Render cold start
  useEffect(() => {
    fetch(`${API_BASE}/`, { method: 'HEAD' }).catch(() => {})
  }, [])

  return (
    <SWRConfig
      value={{
        fetcher: apiFetcher,
        revalidateOnFocus: false,
        dedupingInterval: 5000,
        errorRetryCount: 2,
        errorRetryInterval: 3000,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  )
}
