import type { FasePlanPartido, PlanPartidoData, PlanPartidoPhase } from '@/types'

const FASE_ORDER: FasePlanPartido[] = [
  'ataque_organizado',
  'defensa_organizada',
  'transicion_ofensiva',
  'transicion_defensiva',
  'abp_ofensiva',
  'abp_defensiva',
]

/**
 * Partes del plan de partido que viven en rivales.plan_partido_manual (perfil persistente).
 * Se sincronizan entre la ficha del rival y cualquier microciclo que enfrente a ese rival.
 */
export function extractPersistentPlanPartido(
  plan: Partial<PlanPartidoData>
): Partial<PlanPartidoData> {
  return {
    fases: (plan.fases ?? []).map((f) => ({
      fase: f.fase,
      texto: f.texto ?? '',
      principios_modelo: f.principios_modelo ?? [],
      clips: f.clips ?? [],
      pizarra_tactica: f.pizarra_tactica,
      formacion: f.formacion,
      espacios: f.espacios,
    })),
  }
}

/** Consignas de la semana — solo en plan_ct del microciclo. */
export function extractWeeklyPlanPartido(plan: Partial<PlanPartidoData>): Partial<PlanPartidoData> {
  return {
    consignas_clave: plan.consignas_clave ?? [],
    fases: (plan.fases ?? []).map((f) => ({
      fase: f.fase,
      consignas: f.consignas ?? [],
    })) as PlanPartidoPhase[],
  }
}

function phaseByFase(fases: PlanPartidoPhase[] | undefined): Map<FasePlanPartido, PlanPartidoPhase> {
  return new Map((fases ?? []).map((f) => [f.fase, f]))
}

/** Combina perfil persistente del rival con consignas semanales del microciclo. */
export function mergePlanPartidoOnLoad(
  persistent: Partial<PlanPartidoData> | null | undefined,
  localPlan: Partial<PlanPartidoData> | null | undefined
): Partial<PlanPartidoData> {
  const saved = persistent ?? {}
  const local = localPlan ?? {}
  const weekly = extractWeeklyPlanPartido(local)
  const savedByFase = phaseByFase(saved.fases)
  const localByFase = phaseByFase(local.fases)
  const weeklyByFase = phaseByFase(weekly.fases)

  const fases: PlanPartidoPhase[] = FASE_ORDER.map((fase) => {
    const s = savedByFase.get(fase)
    const l = localByFase.get(fase)
    const w = weeklyByFase.get(fase)
    return {
      fase,
      texto: s?.texto ?? l?.texto ?? '',
      principios_modelo: s?.principios_modelo?.length
        ? s.principios_modelo
        : l?.principios_modelo ?? [],
      consignas: w?.consignas?.length ? w.consignas : l?.consignas ?? [],
      clips: s?.clips?.length ? s.clips : l?.clips ?? [],
      pizarra_tactica: s?.pizarra_tactica ?? l?.pizarra_tactica,
      formacion: s?.formacion ?? l?.formacion,
      espacios: s?.espacios ?? l?.espacios,
    }
  })

  return {
    fases,
    consignas_clave: weekly.consignas_clave ?? local.consignas_clave ?? [],
  }
}
