import type {
  FasePlanPartido,
  PlanPartidoData,
  PlanPartidoPhase,
  PlanPartidoSubfaseData,
  RivalSubfaseAtaque,
  RivalSubfaseDefensa,
} from '@/types'

const FASE_ORDER: FasePlanPartido[] = [
  'ataque_organizado',
  'defensa_organizada',
  'transicion_ofensiva',
  'transicion_defensiva',
  'abp_ofensiva',
  'abp_defensiva',
]

function mapSubfasePersistent(
  sub?: PlanPartidoSubfaseData
): PlanPartidoSubfaseData | undefined {
  if (!sub) return undefined
  return {
    sistema: sub.sistema,
    notas: sub.notas ?? '',
    roles: sub.roles,
    pizarra_tactica: sub.pizarra_tactica,
    pizarra_diagrama: sub.pizarra_diagrama,
  }
}

function mapPhasePersistent(f: PlanPartidoPhase): PlanPartidoPhase {
  const subfases = f.subfases
    ? Object.fromEntries(
        Object.entries(f.subfases).map(([k, v]) => [k, mapSubfasePersistent(v)!])
      )
    : undefined

  return {
    fase: f.fase,
    texto: f.texto,
    sistema: f.sistema,
    subfases,
    jugadas_abp: f.jugadas_abp,
    roles: f.roles,
    clips: f.clips ?? [],
    pizarra_tactica: f.pizarra_tactica,
    pizarra_diagrama: f.pizarra_diagrama,
  }
}

export function extractPersistentPlanPartido(
  plan: Partial<PlanPartidoData>
): Partial<PlanPartidoData> {
  return {
    fases: (plan.fases ?? []).map(mapPhasePersistent),
    nutricion_partido: plan.nutricion_partido,
  }
}

function phaseByFase(fases: PlanPartidoPhase[] | undefined): Map<FasePlanPartido, PlanPartidoPhase> {
  return new Map((fases ?? []).map((f) => [f.fase, f]))
}

function mergeSubfases(
  saved?: Partial<Record<RivalSubfaseAtaque | RivalSubfaseDefensa, PlanPartidoSubfaseData>>,
  local?: Partial<Record<RivalSubfaseAtaque | RivalSubfaseDefensa, PlanPartidoSubfaseData>>
): PlanPartidoPhase['subfases'] {
  const keys = new Set([
    ...Object.keys(saved ?? {}),
    ...Object.keys(local ?? {}),
  ]) as Set<RivalSubfaseAtaque | RivalSubfaseDefensa>

  if (keys.size === 0) return saved ?? local

  const merged: NonNullable<PlanPartidoPhase['subfases']> = {}
  for (const key of Array.from(keys)) {
    const s = saved?.[key]
    const l = local?.[key]
    merged[key] = {
      sistema: s?.sistema ?? l?.sistema ?? '',
      notas: s?.notas ?? l?.notas ?? '',
      roles: s?.roles?.length ? s.roles : l?.roles ?? [],
      pizarra_tactica: s?.pizarra_tactica ?? l?.pizarra_tactica,
      pizarra_diagrama: s?.pizarra_diagrama ?? l?.pizarra_diagrama,
    }
  }
  return merged
}

export function mergePlanPartidoOnLoad(
  persistent: Partial<PlanPartidoData> | null | undefined,
  localPlan: Partial<PlanPartidoData> | null | undefined
): Partial<PlanPartidoData> {
  const saved = persistent ?? {}
  const local = localPlan ?? {}
  const savedByFase = phaseByFase(saved.fases)
  const localByFase = phaseByFase(local.fases)

  const fases: PlanPartidoPhase[] = FASE_ORDER.map((fase) => {
    const s = savedByFase.get(fase)
    const l = localByFase.get(fase)
    return {
      fase,
      texto: s?.texto ?? l?.texto ?? '',
      sistema: s?.sistema ?? l?.sistema ?? '',
      subfases: mergeSubfases(s?.subfases, l?.subfases),
      jugadas_abp: s?.jugadas_abp?.length ? s.jugadas_abp : l?.jugadas_abp ?? [],
      roles: s?.roles?.length ? s.roles : l?.roles ?? [],
      clips: s?.clips?.length ? s.clips : l?.clips ?? [],
      pizarra_tactica: s?.pizarra_tactica ?? l?.pizarra_tactica,
      pizarra_diagrama: s?.pizarra_diagrama ?? l?.pizarra_diagrama,
    }
  })

  return { fases, nutricion_partido: local.nutricion_partido ?? saved.nutricion_partido }
}
