'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useClubStore } from '@/stores/clubStore'
import { SplashScreen } from '@/components/ui/splash-screen'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const initializeAuth = useAuthStore((s) => s.initializeAuth)
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setOrganizacion = useClubStore((s) => s.setOrganizacion)

  useEffect(() => {
    const init = async () => {
      await initializeAuth()
      setIsReady(true)
    }
    init()
  }, [initializeAuth])

  // Sync organization data to club store when user loads
  useEffect(() => {
    if (isAuthenticated && user?.organizacion) {
      setOrganizacion(user.organizacion as any)
    }
  }, [isAuthenticated, user?.organizacion, setOrganizacion])

  // If Zustand hydrated cached auth, render children immediately
  // while initializeAuth() validates the session in background
  if (!isReady && isAuthenticated && accessToken) {
    return <>{children}</>
  }

  if (!isReady) {
    return <SplashScreen />
  }

  return <>{children}</>
}
