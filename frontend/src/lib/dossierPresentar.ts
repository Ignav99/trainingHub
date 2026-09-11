import {
  revisionApi,
  type RevisionAmbito,
  type RevisionSession,
} from '@/lib/api/revision'
import { rivalesApi } from '@/lib/api/partidos'
import {
  attachRevisionPack,
  concatCharlaShow,
  type DossierShow,
} from '@/lib/dossierShow'
import { pickPlanForCharla, type PlanTramo } from '@/lib/planPartidoTramos'
import type { PlanPartidoData, RivalScoutData } from '@/types'

export async function prepareDossierSala(params: {
  show: DossierShow
  equipoId?: string
  ambito: RevisionAmbito
  rivalId?: string
  microcicloId?: string
  partidoId?: string
}): Promise<{ show: DossierShow; session: RevisionSession | null }> {
  let { show } = params
  if (!params.equipoId) return { show, session: null }

  try {
    const pack = await revisionApi.getOrCreatePack({
      equipo_id: params.equipoId,
      ambito: params.ambito,
      rival_id: params.rivalId,
      microciclo_id: params.microcicloId,
      partido_id: params.partidoId,
    })
    show = attachRevisionPack(show, pack)
    try {
      const session = await revisionApi.createSession({
        equipo_id: params.equipoId,
        pack_id: pack.id,
      })
      return { show, session }
    } catch {
      return { show, session: null }
    }
  } catch {
    return { show, session: null }
  }
}

export async function prepareCharlaSala(params: {
  informe: DossierShow
  plan: DossierShow
  equipoId?: string
  rivalId?: string
  microcicloId?: string
  partidoId?: string
}): Promise<{ show: DossierShow; session: RevisionSession | null }> {
  let informe = params.informe
  let plan = params.plan
  if (!params.equipoId) {
    return { show: concatCharlaShow(informe, plan), session: null }
  }

  const packParams = {
    equipo_id: params.equipoId,
    rival_id: params.rivalId,
    microciclo_id: params.microcicloId,
    partido_id: params.partidoId,
  }

  let packId: string | undefined
  try {
    const rivalPack = await revisionApi.getOrCreatePack({ ...packParams, ambito: 'rival' })
    informe = attachRevisionPack(informe, rivalPack)
    packId = rivalPack.id
  } catch {
    /* keep informe without revision clips */
  }

  try {
    const planPack = await revisionApi.getOrCreatePack({ ...packParams, ambito: 'partido_plan' })
    plan = attachRevisionPack(plan, planPack)
    packId = packId ?? planPack.id
  } catch {
    /* keep plan without revision clips */
  }

  const show = concatCharlaShow(informe, plan)
  if (!packId) return { show, session: null }
  try {
    const session = await revisionApi.createSession({
      equipo_id: params.equipoId,
      pack_id: packId,
    })
    return { show, session }
  } catch {
    return { show, session: null }
  }
}

export async function loadPlanDataForCharla(
  live: Partial<PlanPartidoData> | null | undefined,
  rivalId?: string,
  preferred?: PlanTramo,
): Promise<Partial<PlanPartidoData>> {
  if (live != null) return live
  if (!rivalId) return {}
  try {
    return pickPlanForCharla(await rivalesApi.getPlanPartidoManual(rivalId), preferred)
  } catch {
    return {}
  }
}

export async function loadInformeDataForCharla(
  live: Partial<RivalScoutData> | null | undefined,
  rivalId?: string,
): Promise<Partial<RivalScoutData>> {
  if (live != null) return live
  if (!rivalId) return {}
  try {
    return (await rivalesApi.getScoutManual(rivalId)) ?? {}
  } catch {
    return {}
  }
}
