'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, ExternalLink, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { PlanPartido } from '@/components/microciclos/PlanPartido'
import type { Partido, PlanPartidoData } from '@/types'
import {
  loadPartidoPlan,
  savePartidoPlan,
  type PartidoPlanContext,
} from '@/lib/partidoPlanContext'
import { PLAN_TRAMO_LABEL } from '@/lib/planPartidoTramos'
import { shouldPersistOwnedDoc } from '@/lib/ownedDocument'

interface PartidoPlanTabProps {
  partido: Partido
  equipoId: string
}

type SaveStatus = 'idle' | 'pending' | 'saved' | 'error'

export function PartidoPlanTab({ partido, equipoId }: PartidoPlanTabProps) {
  const [plan, setPlan] = useState<Partial<PlanPartidoData>>({})
  const [context, setContext] = useState<PartidoPlanContext>({ microcicloId: null, source: 'empty', tramo: 'ida' })
  const [loading, setLoading] = useState(true)
  const [ownerId, setOwnerId] = useState(partido.id)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contextRef = useRef(context)
  const planRef = useRef(plan)
  const loadedOwnerRef = useRef<string | null>(null)
  const dirtyRef = useRef(false)
  contextRef.current = context
  planRef.current = plan

  if (ownerId !== partido.id) {
    setOwnerId(partido.id)
    setPlan({})
    setLoading(true)
    loadedOwnerRef.current = null
    dirtyRef.current = false
  }

  useEffect(() => {
    let cancelled = false
    loadedOwnerRef.current = null
    dirtyRef.current = false
    setLoading(true)
    loadPartidoPlan(partido.id, equipoId, partido.rival_id, partido.fecha)
      .then(({ plan: loaded, context: ctx }) => {
        if (cancelled) return
        loadedOwnerRef.current = partido.id
        setPlan(loaded)
        setContext(ctx)
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Error al cargar plan de partido')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [partido.id, partido.rival_id, equipoId, partido.fecha])

  useEffect(() => {
    if (loading || !shouldPersistOwnedDoc(loadedOwnerRef.current, partido.id, dirtyRef.current)) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    const matchId = partido.id
    const rivalId = partido.rival_id
    setSaveStatus('pending')
    saveTimerRef.current = setTimeout(async () => {
      if (!shouldPersistOwnedDoc(loadedOwnerRef.current, matchId, dirtyRef.current)) return
      try {
        await savePartidoPlan(planRef.current, contextRef.current, rivalId)
        if (loadedOwnerRef.current !== matchId) return
        dirtyRef.current = false
        setSaveStatus('saved')
        idleTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err) {
        if (loadedOwnerRef.current !== matchId) return
        setSaveStatus('error')
        toast.error(err instanceof Error ? err.message : 'Error al guardar plan de partido')
      }
    }, 1500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [plan, loading, partido.id, partido.rival_id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando plan de partido...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ClipboardList className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{PLAN_TRAMO_LABEL[context.tramo]}</span>
          {context.source === 'microciclo' && context.microcicloId ? (
            <span>
              Vinculado al microciclo — los cambios se sincronizan con la Sala del Lunes
            </span>
          ) : context.source === 'rival' ? (
            <span>Plan de Partido (perfil persistente) — vincula un microciclo para sincronizar semana</span>
          ) : (
            <span>Plan nuevo — se guardará en el perfil del rival</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'pending' && (
            <span className="text-[10px] text-muted-foreground">Guardando...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-[10px] text-green-600">Guardado</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-[10px] text-red-600">Error al guardar</span>
          )}
          {context.microcicloId && (
            <Link
              href={`/microciclos/${context.microcicloId}`}
              className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Abrir Sala del Lunes
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      <PlanPartido
        data={plan}
        onChange={(next) => {
          if (loadedOwnerRef.current !== partido.id) return
          dirtyRef.current = true
          setPlan(next)
        }}
        rivalId={partido.rival_id}
        microcicloId={context.microcicloId ?? undefined}
        partidoId={partido.id}
        equipoId={equipoId}
        horaPartido={partido.hora}
        fechaPartido={partido.fecha}
        ciudadPartido={partido.rival?.ciudad || undefined}
        rivalNombre={partido.rival?.nombre}
        rivalEscudoUrl={partido.rival?.escudo_url}
        campoPartido={partido.rival?.estadio || partido.ubicacion}
        localia={partido.localia}
        tramo={context.tramo}
      />
    </div>
  )
}
