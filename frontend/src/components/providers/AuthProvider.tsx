'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Loader2 } from 'lucide-react'

// MODO DEMO - Usuario de prueba
const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@traininghub.com',
  nombre: 'Usuario',
  apellidos: 'Demo',
  rol: 'admin',
  organizacion_id: 'demo-org-id',
  organizacion: {
    id: 'demo-org-id',
    nombre: 'Club Demo FC',
  },
  activo: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Modo demo: establecer usuario de prueba inmediatamente
    useAuthStore.setState({
      user: DEMO_USER as any,
      accessToken: 'demo-token',
      isAuthenticated: true,
      isLoading: false,
    })
    setIsReady(true)
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
