'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Loader2 } from 'lucide-react'
import { usePageReady } from '@/components/providers/PageReadyProvider'
import { useEquipoStore } from '@/stores/equipoStore'
import { microciclosApi } from '@/lib/api/microciclos'

export default function MicrociclosRedirectPage() {
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()
  const [checked, setChecked] = useState(false)

  usePageReady()

  useEffect(() => {
    if (!equipoActivo?.id) {
      router.replace('/')
      return
    }

    microciclosApi
      .list({ equipo_id: equipoActivo.id, estado: 'en_curso', limit: 1 })
      .then((res) => {
        const activo = res.data?.[0]
        if (activo) {
          router.replace(`/microciclos/${activo.id}`)
        } else {
          // Try planificado
          return microciclosApi.list({ equipo_id: equipoActivo.id, limit: 1 })
        }
      })
      .then((res) => {
        if (res) {
          const latest = res.data?.[0]
          if (latest) {
            router.replace(`/microciclos/${latest.id}`)
          } else {
            router.replace('/')
          }
        }
      })
      .catch(() => {
        router.replace('/')
      })
      .finally(() => setChecked(true))
  }, [equipoActivo?.id, router])

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
