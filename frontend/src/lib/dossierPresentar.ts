import {
  revisionApi,
  type RevisionAmbito,
  type RevisionSession,
} from '@/lib/api/revision'
import { rivalesApi } from '@/lib/api/partidos'
import { api } from '@/lib/api/client'
import { collectIntelVisual, type IntelVisual } from '@/lib/pdf/informeRivalPdfBlocks'
import { abpApi } from '@/lib/api/abp'
import {
  attachRevisionPack,
  concatCharlaShow,
  type AbpShowJugada,
  type DossierShow,
} from '@/lib/dossierShow'
import { pickPlanForCharla, type PlanTramo } from '@/lib/planPartidoTramos'
import { revisionPackLookup } from '@/lib/revisionDestino'
import type { PlanPartidoData, RivalScoutData } from '@/types'

export async function loadAbpShowJugadas(equipoId?: string): Promise<AbpShowJugada[]> {
  if (!equipoId) return []
  try {
    const res = await abpApi.list(equipoId)
    return (res.data ?? []).map((jugada) => ({
      id: jugada.id,
      nombre: jugada.nombre,
      tipo: jugada.tipo,
      fases: jugada.fases,
      asignaciones: jugada.asignaciones,
    }))
  } catch {
    return []
  }
}

export async function loadShowIntel(equipoId?: string, rivalId?: string): Promise<IntelVisual | undefined> {
  if (!equipoId || !rivalId) return undefined
  try {
    const res = await api.get<{ data: Array<{ id: string; mi_equipo_nombre?: string | null }> }>(
      '/rfef/competiciones',
      { params: { equipo_id: equipoId } },
    )
    const competicionId = res.data?.find((item) => item.mi_equipo_nombre)?.id
    if (!competicionId) return undefined
    const intel = await rivalesApi.getIntel(rivalId, competicionId)
    return collectIntelVisual(intel)
  } catch {
    return undefined
  }
}

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
    const pack = await revisionApi.getOrCreatePack(
      revisionPackLookup({
        equipoId: params.equipoId,
        ambito: params.ambito,
        rivalId: params.rivalId,
        microcicloId: params.microcicloId,
        partidoId: params.partidoId,
      }),
    )
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

  let packId: string | undefined
  try {
    const rivalPack = await revisionApi.getOrCreatePack(
      revisionPackLookup({
        equipoId: params.equipoId,
        ambito: 'rival',
        rivalId: params.rivalId,
        microcicloId: params.microcicloId,
      }),
    )
    informe = attachRevisionPack(informe, rivalPack)
    packId = rivalPack.id
  } catch {
    /* keep informe without revision clips */
  }

  try {
    const planPack = await revisionApi.getOrCreatePack(
      revisionPackLookup({
        equipoId: params.equipoId,
        ambito: 'partido_plan',
        partidoId: params.partidoId,
        rivalId: params.rivalId,
        microcicloId: params.microcicloId,
      }),
    )
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
