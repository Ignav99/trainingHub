'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Create-session AI flow removed.
 * IA vive solo en diseño de tareas / boceto desde biblioteca.
 */
export default function NuevaSesionAiRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const fecha = searchParams.get('fecha')
    const qs = fecha ? `?fecha=${encodeURIComponent(fecha)}` : ''
    router.replace(`/sesiones/nueva${qs}`)
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
      Redirigiendo a nueva sesión…
    </div>
  )
}
