'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useClubStore } from '@/stores/clubStore'
import { Spinner } from '@/components/ui/spinner'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const initializeAuth = useAuthStore((s) => s.initializeAuth)
  const user = useAuthStore((s) => s.user)
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

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando TrainingHub Pro...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
