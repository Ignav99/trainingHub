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

interface PartidoPlanTabProps {
  partido: Partido
  equipoId: string
}

type SaveStatus = 'idle' | 'pending' | 'saved' | 'error'

export function PartidoPlanTab({ partido, equipoId }: PartidoPlanTabProps) {
  const [plan, setPlan] = useState<Partial<PlanPartidoData>>({})
  const [context, setContext] = useState<PartidoPlanContext>({ microcicloId: null, source: 'empty' })
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contextRef = useRef(context)
  const isMountedRef = useRef(false)
  contextRef.current = context

  useEffect(() => {
    isMountedRef.current = false
    let cancelled = false
    setLoading(true)
    loadPartidoPlan(partido.id, equipoId, partido.rival_id)
      .then(({ plan: loaded, context: ctx }) => {
        if (cancelled) return
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
  }, [partido.id, partido.rival_id, equipoId])

  useEffect(() => {
    if (loading) return
    if (!isMountedRef.current) {
      isMountedRef.current = true
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    setSaveStatus('pending')
    saveTimerRef.current = setTimeout(async () => {
      try {
        await savePartidoPlan(plan, contextRef.current, partido.rival_id)
        setSaveStatus('saved')
        idleTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err) {
        setSaveStatus('error')
        toast.error(err instanceof Error ? err.message : 'Error al guardar plan de partido')
      }
    }, 1500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [plan, loading, partido.rival_id])

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
          {context.source === 'microciclo' && context.microcicloId ? (
            <span>
              Vinculado al microciclo — los cambios se sincronizan con la Sala del Lunes
            </span>
          ) : context.source === 'rival' ? (
            <span>Plan del rival (perfil persistente) — vincula un microciclo para sincronizar semana</span>
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
        onChange={setPlan}
        rivalId={partido.rival_id}
        microcicloId={context.microcicloId ?? undefined}
        equipoId={equipoId}
        horaPartido={partido.hora}
        fechaPartido={partido.fecha}
        ciudadPartido={partido.rival?.ciudad || undefined}
      />
    </div>
  )
}
