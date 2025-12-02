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
  const { isAuthenticated, setUser } = useAuthStore()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session && mounted) {
          // Get user data
          const { data: userData } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (userData && mounted) {
            let organizacion = null
            if (userData.organizacion_id) {
              const { data: orgData } = await supabase
                .from('organizaciones')
                .select('*')
                .eq('id', userData.organizacion_id)
                .single()
              organizacion = orgData
            }

            useAuthStore.setState({
              user: { ...userData, organizacion },
              accessToken: session.access_token,
              isAuthenticated: true,
              isLoading: false,
            })
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        if (mounted) {
          setIsReady(true)
        }
      }
    }

    checkAuth()

    return () => {
      mounted = false
    }
  }, [])

  // Handle redirects only after ready
  useEffect(() => {
    if (!isReady) return

    const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))

    if (!isAuthenticated && !isPublicRoute && pathname !== '/') {
      router.replace('/login')
    } else if (isAuthenticated && isPublicRoute) {
      router.replace('/')
    }
  }, [isAuthenticated, pathname, isReady, router])

  if (!isReady) {
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
