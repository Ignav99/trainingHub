import { microciclosApi } from '@/lib/api/microciclos'
import { rivalesApi } from '@/lib/api/partidos'
import {
  extractPersistentPlanPartido,
  mergePlanPartidoOnLoad,
} from '@/lib/rivalPlanPartidoSync'
import type { PlanPartidoData } from '@/types'

export interface PartidoPlanContext {
  microcicloId: string | null
  source: 'microciclo' | 'rival' | 'empty'
}

export async function findMicrocicloForPartido(
  equipoId: string,
  partidoId: string
): Promise<string | null> {
  const list = await microciclosApi.list({ equipo_id: equipoId, limit: 100 })
  const match = list.data?.find((m) => m.partido_id === partidoId)
  return match?.id ?? null
}

export async function loadPartidoPlan(
  partidoId: string,
  equipoId: string,
  rivalId: string
): Promise<{ plan: Partial<PlanPartidoData>; context: PartidoPlanContext }> {
  const microcicloId = await findMicrocicloForPartido(equipoId, partidoId)

  let rivalPlan: Partial<PlanPartidoData> = {}
  try {
    rivalPlan = (await rivalesApi.getPlanPartidoManual(rivalId)) ?? {}
  } catch {
    rivalPlan = {}
  }

  if (microcicloId) {
    const micro = await microciclosApi.get(microcicloId)
    const localPlan = micro.plan_ct?.plan_partido ?? {}
    const plan = mergePlanPartidoOnLoad(rivalPlan, localPlan)
    return { plan, context: { microcicloId, source: 'microciclo' } }
  }

  if (rivalPlan.fases?.length) {
    return { plan: rivalPlan, context: { microcicloId: null, source: 'rival' } }
  }

  return { plan: {}, context: { microcicloId: null, source: 'empty' } }
}

export async function savePartidoPlan(
  plan: Partial<PlanPartidoData>,
  context: PartidoPlanContext,
  rivalId: string
): Promise<void> {
  const persistent = extractPersistentPlanPartido(plan)

  if (context.microcicloId) {
    const micro = await microciclosApi.get(context.microcicloId)
    const planCt = micro.plan_ct ?? {}
    await microciclosApi.patchPlanCT(context.microcicloId, {
      ...planCt,
      plan_partido: plan,
    })
  }

  if (rivalId) {
    await rivalesApi.putPlanPartidoManual(rivalId, persistent)
  }
}
