'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Loader2 } from 'lucide-react'

const publicRoutes = ['/login', '/register', '/forgot-password']

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, refreshUser, isLoading } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      // Verificar sesión actual
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        await refreshUser()
      }

      setChecking(false)
    }

    checkAuth()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await refreshUser()
        } else if (event === 'SIGNED_OUT') {
          useAuthStore.getState().setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [refreshUser])

  useEffect(() => {
    if (checking) return

    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login')
    } else if (isAuthenticated && isPublicRoute) {
      router.push('/')
    }
  }, [isAuthenticated, pathname, checking, router])

  if (checking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
