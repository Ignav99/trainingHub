'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Loader2 } from 'lucide-react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session && mounted) {
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
