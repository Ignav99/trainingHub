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
import { PLAN_TRAMO_LABEL, wrapPlanTramos } from '@/lib/planPartidoTramos'
import { extractPersistentPlanPartido, mergePlanPartidoOnLoad } from '@/lib/rivalPlanPartidoSync'
import { readDraft } from '@/lib/durableDraft'
import { useDurableAutosave } from '@/hooks/useDurableAutosave'
import { microciclosApi } from '@/lib/api/microciclos'
import { rivalesApi } from '@/lib/api/partidos'

interface PartidoPlanTabProps {
  partido: Partido
  equipoId: string
}

type SaveStatus = 'idle' | 'pending' | 'saved' | 'error'

export function PartidoPlanTab({ partido, equipoId }: PartidoPlanTabProps) {
  const [plan, setPlan] = useState<Partial<PlanPartidoData>>({})
  const [context, setContext] = useState<PartidoPlanContext>({ microcicloId: null, source: 'empty', tramo: 'ida' })
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const contextRef = useRef(context)
  contextRef.current = context
  const draftKey = `th-draft:v1:partido-plan:${partido.id}`

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadPartidoPlan(partido.id, equipoId, partido.rival_id, partido.fecha)
      .then(({ plan: loaded, context: ctx }) => {
        if (cancelled) return
        const draft = readDraft<Partial<PlanPartidoData>>(draftKey)
        setPlan(mergePlanPartidoOnLoad(loaded, draft))
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

  useDurableAutosave({
    enabled: !loading,
    storageKey: draftKey,
    value: plan,
    save: async (next) => {
      await savePartidoPlan(next, contextRef.current, partido.rival_id)
    },
    keepaliveSave: (next) => {
      const ctx = contextRef.current
      const persistent = extractPersistentPlanPartido(next)
      if (ctx.microcicloId) {
        microciclosApi.putPlanCTKeepalive(ctx.microcicloId, { plan_partido: next })
      }
      if (partido.rival_id) {
        rivalesApi.putPlanPartidoManualKeepalive(
          partido.rival_id,
          wrapPlanTramos({
            ida: ctx.tramo === 'ida' ? persistent : {},
            vuelta: ctx.tramo === 'vuelta' ? persistent : {},
          })
        )
      }
    },
    onStatus: setSaveStatus,
  })

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
        onChange={setPlan}
        rivalId={partido.rival_id}
        microcicloId={context.microcicloId ?? undefined}
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
