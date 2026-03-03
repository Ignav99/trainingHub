'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { CalendarDays, Loader2 } from 'lucide-react'
import { apiKey } from '@/lib/swr'
import { useEquipoStore } from '@/stores/equipoStore'
import type { Microciclo, PaginatedResponse } from '@/types'

export default function MicrociclosRedirectPage() {
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()

  // Fetch active (en_curso) microciclo
  const { data: activoRes, error: activoError } = useSWR<PaginatedResponse<Microciclo>>(
    equipoActivo?.id
      ? apiKey('/microciclos', { equipo_id: equipoActivo.id, estado: 'en_curso', limit: 1 })
      : null
  )

  // Fetch latest microciclo (fallback if no en_curso)
  const hasNoActivo = activoRes && (activoRes.data?.length === 0)
  const { data: latestRes, error: latestError } = useSWR<PaginatedResponse<Microciclo>>(
    hasNoActivo
      ? apiKey('/microciclos', { equipo_id: equipoActivo?.id, limit: 1 })
      : null
  )

  useEffect(() => {
    if (!equipoActivo?.id) {
      router.replace('/')
      return
    }

    // Wait for active microciclo response
    if (!activoRes && !activoError) return

    // If active found, redirect
    const activo = activoRes?.data?.[0]
    if (activo) {
      router.replace(`/microciclos/${activo.id}`)
      return
    }

    // Wait for latest microciclo response
    if (!latestRes && !latestError) return

    // If latest found, redirect
    const latest = latestRes?.data?.[0]
    if (latest) {
      router.replace(`/microciclos/${latest.id}`)
    } else {
      router.replace('/')
    }
  }, [equipoActivo?.id, router, activoRes, activoError, latestRes, latestError])

  // On error, redirect home
  useEffect(() => {
    if (activoError) {
      router.replace('/')
    }
  }, [activoError, router])

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <CalendarDays className="h-8 w-8 text-muted-foreground animate-pulse" />
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Buscando microciclo activo...</span>
      </div>
    </div>
  )
}
