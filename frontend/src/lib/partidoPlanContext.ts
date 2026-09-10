import { microciclosApi } from '@/lib/api/microciclos'
import { rivalesApi, partidosApi } from '@/lib/api/partidos'
import {
  extractPersistentPlanPartido,
  mergePlanPartidoOnLoad,
} from '@/lib/rivalPlanPartidoSync'
import {
  inferPlanTramo,
  mergeTramoIntoStore,
  planFromStore,
  type PlanTramo,
} from '@/lib/planPartidoTramos'
import type { PlanPartidoData } from '@/types'

export interface PartidoPlanContext {
  microcicloId: string | null
  source: 'microciclo' | 'rival' | 'empty'
  tramo: PlanTramo
}

export async function findMicrocicloForPartido(
  equipoId: string,
  partidoId: string
): Promise<string | null> {
  const list = await microciclosApi.list({ equipo_id: equipoId, limit: 100 })
  const match = list.data?.find((m) => m.partido_id === partidoId)
  return match?.id ?? null
}

export async function inferTramoForPartido(
  equipoId: string,
  rivalId: string,
  fecha?: string | null
): Promise<PlanTramo> {
  try {
    const res = await partidosApi.list({
      equipo_id: equipoId,
      rival_id: rivalId,
      limit: 50,
      orden: 'fecha',
      direccion: 'asc',
    })
    return inferPlanTramo(res.data || [], fecha)
  } catch {
    return 'ida'
  }
}

export async function loadPartidoPlan(
  partidoId: string,
  equipoId: string,
  rivalId: string,
  fecha?: string | null
): Promise<{ plan: Partial<PlanPartidoData>; context: PartidoPlanContext }> {
  const [microcicloId, tramo] = await Promise.all([
    findMicrocicloForPartido(equipoId, partidoId),
    inferTramoForPartido(equipoId, rivalId, fecha),
  ])

  let rivalStore = null
  try {
    rivalStore = (await rivalesApi.getPlanPartidoManual(rivalId)) ?? {}
  } catch {
    rivalStore = {}
  }
  const rivalPlan = planFromStore(rivalStore, tramo)

  if (microcicloId) {
    const micro = await microciclosApi.get(microcicloId)
    const localPlan = micro.plan_ct?.plan_partido ?? {}
    const plan = mergePlanPartidoOnLoad(rivalPlan, localPlan)
    return { plan, context: { microcicloId, source: 'microciclo', tramo } }
  }

  if (rivalPlan.fases?.length) {
    return { plan: rivalPlan, context: { microcicloId: null, source: 'rival', tramo } }
  }

  return { plan: {}, context: { microcicloId: null, source: 'empty', tramo } }
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
    let current = {}
    try {
      current = (await rivalesApi.getPlanPartidoManual(rivalId)) ?? {}
    } catch {
      current = {}
    }
    await rivalesApi.putPlanPartidoManual(
      rivalId,
      mergeTramoIntoStore(current, context.tramo, persistent)
    )
  }
}
