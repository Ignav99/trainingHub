'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useClubStore } from '@/stores/clubStore'
import { SplashScreen } from '@/components/ui/splash-screen'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Skip auth initialization entirely for /local/* routes — no login, no Supabase
  const isLocalRoute = pathname?.startsWith('/local')

  const [isReady, setIsReady] = useState(isLocalRoute)
  const initializeAuth = useAuthStore((s) => s.initializeAuth)
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setOrganizacion = useClubStore((s) => s.setOrganizacion)

  useEffect(() => {
    if (isLocalRoute) return
    const init = async () => {
      await initializeAuth()
      setIsReady(true)
    }
    init()
  }, [initializeAuth, isLocalRoute])

  // Sync organization data to club store when user loads
  useEffect(() => {
    if (isAuthenticated && user?.organizacion) {
      setOrganizacion(user.organizacion as any)
    }
  }, [isAuthenticated, user?.organizacion, setOrganizacion])

  // Always wait for auth initialization to complete before rendering children.
  // This ensures all JS chunks (dashboard layout, etc.) are loaded while
  // the SplashScreen is visible, preventing ChunkLoadError on slow connections.
  if (!isReady) {
    return <SplashScreen />
  }

  return <>{children}</>
}
