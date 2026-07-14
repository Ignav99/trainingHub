'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { PlanPartido } from '@/components/microciclos/PlanPartido'
import { rivalesApi } from '@/lib/api/partidos'
import { useEquipoStore } from '@/stores/equipoStore'
import type { PlanPartidoData } from '@/types'
import { extractPersistentPlanPartido } from '@/lib/rivalPlanPartidoSync'

interface RivalPlanPartidoTabProps {
  rivalId: string
}

type SaveStatus = 'idle' | 'pending' | 'saved' | 'error'

export function RivalPlanPartidoTab({ rivalId }: RivalPlanPartidoTabProps) {
  const { equipoActivo } = useEquipoStore()
  const [plan, setPlan] = useState<Partial<PlanPartidoData>>({})
  const [loaded, setLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    rivalesApi
      .getPlanPartidoManual(rivalId)
      .then((data) => {
        if (!cancelled) {
          setPlan(data ?? {})
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [rivalId])

  useEffect(() => {
    if (!loaded || !isMountedRef.current) {
      isMountedRef.current = true
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('pending')

    saveTimerRef.current = setTimeout(async () => {
      try {
        await rivalesApi.putPlanPartidoManual(rivalId, extractPersistentPlanPartido(plan))
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err: unknown) {
        setSaveStatus('error')
        toast.error(err instanceof Error ? err.message : 'Error al guardar plan de partido')
      }
    }, 1500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [plan, rivalId, loaded])

  if (!loaded) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Cargando plan de partido...</p>
  }

  return (
    <div className="space-y-2">
      {saveStatus === 'pending' && (
        <p className="text-xs text-muted-foreground">Guardando...</p>
      )}
      {saveStatus === 'saved' && (
        <p className="text-xs text-green-600">Guardado en perfil del rival</p>
      )}
      {saveStatus === 'error' && (
        <p className="text-xs text-red-600">Error al guardar</p>
      )}
      <p className="text-xs text-muted-foreground">
        Principios, pizarras y clips se guardan en el perfil del rival. Las consignas semanales se
        editan en el microciclo de la semana de partido.
      </p>
      <PlanPartido
        data={plan}
        rivalId={rivalId}
        equipoId={equipoActivo?.id}
        onChange={setPlan}
        weeklyMode={false}
      />
    </div>
  )
}
