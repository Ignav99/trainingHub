'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { PlanPartido } from '@/components/microciclos/PlanPartido'
import { PlanTramoToggle } from '@/components/rivales/PlanTramoToggle'
import { rivalesApi, partidosApi } from '@/lib/api/partidos'
import { useEquipoStore } from '@/stores/equipoStore'
import type { PlanPartidoData } from '@/types'
import { extractPersistentPlanPartido } from '@/lib/rivalPlanPartidoSync'
import {
  inferPlanTramo,
  unwrapPlanTramos,
  wrapPlanTramos,
  tramoHasContent,
  type PlanTramo,
} from '@/lib/planPartidoTramos'
import { planMatchIdForTramo } from '@/lib/revisionDestino'
import { shouldPersistOwnedDoc } from '@/lib/ownedDocument'

interface RivalPlanPartidoTabProps {
  rivalId: string
  rivalNombre?: string
  rivalEscudoUrl?: string
  estadio?: string
}

type SaveStatus = 'idle' | 'pending' | 'saved' | 'error'

export function RivalPlanPartidoTab({ rivalId, rivalNombre, rivalEscudoUrl, estadio }: RivalPlanPartidoTabProps) {
  const { equipoActivo } = useEquipoStore()
  const [tramo, setTramo] = useState<PlanTramo>('ida')
  const [plans, setPlans] = useState<Record<PlanTramo, Partial<PlanPartidoData>>>({
    ida: {},
    vuelta: {},
  })
  const [partidos, setPartidos] = useState<Array<{ id: string; fecha?: string | null; competicion?: string | null }>>([])
  const [loaded, setLoaded] = useState(false)
  const [ownerId, setOwnerId] = useState(rivalId)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedOwnerRef = useRef<string | null>(null)
  const dirtyRef = useRef(false)
  const plansRef = useRef(plans)
  plansRef.current = plans

  if (ownerId !== rivalId) {
    setOwnerId(rivalId)
    setPlans({ ida: {}, vuelta: {} })
    setPartidos([])
    setLoaded(false)
    loadedOwnerRef.current = null
    dirtyRef.current = false
  }

  useEffect(() => {
    let cancelled = false
    loadedOwnerRef.current = null
    dirtyRef.current = false
    Promise.all([
      rivalesApi.getPlanPartidoManual(rivalId),
      equipoActivo?.id
        ? partidosApi.list({
            equipo_id: equipoActivo.id,
            rival_id: rivalId,
            limit: 50,
            orden: 'fecha',
            direccion: 'asc',
          })
        : Promise.resolve({ data: [] }),
    ])
      .then(([raw, partidos]) => {
        if (cancelled) return
        const store = unwrapPlanTramos(raw)
        loadedOwnerRef.current = rivalId
        setPlans(store)
        setPartidos(partidos.data || [])
        setTramo(inferPlanTramo(partidos.data || []))
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        loadedOwnerRef.current = rivalId
        setPlans({ ida: {}, vuelta: {} })
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [rivalId, equipoActivo?.id])

  useEffect(() => {
    if (!shouldPersistOwnedDoc(loadedOwnerRef.current, rivalId, dirtyRef.current)) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const owner = rivalId
    setSaveStatus('pending')

    saveTimerRef.current = setTimeout(async () => {
      if (!shouldPersistOwnedDoc(loadedOwnerRef.current, owner, dirtyRef.current)) return
      try {
        await rivalesApi.putPlanPartidoManual(
          owner,
          wrapPlanTramos({
            ida: extractPersistentPlanPartido(plansRef.current.ida),
            vuelta: extractPersistentPlanPartido(plansRef.current.vuelta),
          })
        )
        if (loadedOwnerRef.current === owner) {
          dirtyRef.current = false
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        }
      } catch (err: unknown) {
        if (loadedOwnerRef.current !== owner) return
        setSaveStatus('error')
        toast.error(err instanceof Error ? err.message : 'Error al guardar plan de partido')
      }
    }, 1500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [plans, rivalId, loaded])

  if (!loaded) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Cargando plan de partido...</p>
  }

  const plan = plans[tramo]

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PlanTramoToggle
          value={tramo}
          onChange={setTramo}
          idaHasContent={tramoHasContent(plans.ida)}
          vueltaHasContent={tramoHasContent(plans.vuelta)}
        />
        {saveStatus === 'pending' && (
          <p className="text-xs text-muted-foreground">Guardando...</p>
        )}
        {saveStatus === 'saved' && (
          <p className="text-xs text-green-600">Guardado en perfil del rival</p>
        )}
        {saveStatus === 'error' && (
          <p className="text-xs text-red-600">Error al guardar</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Ida y vuelta se guardan aparte. Pizarras, roles y jugadas ABP van con cada enfrentamiento.
      </p>
      <PlanPartido
        data={plan}
        rivalId={rivalId}
        partidoId={planMatchIdForTramo(partidos, tramo)}
        equipoId={equipoActivo?.id}
        rivalNombre={rivalNombre}
        rivalEscudoUrl={rivalEscudoUrl}
        campoPartido={estadio}
        tramo={tramo}
        onChange={(next) => {
          if (loadedOwnerRef.current !== rivalId) return
          dirtyRef.current = true
          setPlans((prev) => ({ ...prev, [tramo]: next }))
        }}
      />
    </div>
  )
}
