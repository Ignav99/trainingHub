import type { PlanPartidoData } from '@/types'

export const PLAN_TRAMOS = ['ida', 'vuelta'] as const
export type PlanTramo = (typeof PLAN_TRAMOS)[number]

export const PLAN_TRAMO_LABEL: Record<PlanTramo, string> = {
  ida: 'Ida',
  vuelta: 'Vuelta',
}

export interface PlanPartidoTramosStore {
  tramos: {
    ida?: Partial<PlanPartidoData>
    vuelta?: Partial<PlanPartidoData>
  }
}

export type PlanPartidoManualRaw = Partial<PlanPartidoData> | PlanPartidoTramosStore | null | undefined

export function isTramosStore(raw: unknown): raw is PlanPartidoTramosStore {
  if (!raw || typeof raw !== 'object') return false
  const tramos = (raw as PlanPartidoTramosStore).tramos
  return !!tramos && typeof tramos === 'object' && !Array.isArray(tramos)
}

export function unwrapPlanTramos(raw: PlanPartidoManualRaw): Record<PlanTramo, Partial<PlanPartidoData>> {
  if (isTramosStore(raw)) {
    return {
      ida: raw.tramos.ida ?? {},
      vuelta: raw.tramos.vuelta ?? {},
    }
  }
  return {
    ida: (raw as Partial<PlanPartidoData>) ?? {},
    vuelta: {},
  }
}

export function wrapPlanTramos(
  tramos: Record<PlanTramo, Partial<PlanPartidoData>>
): PlanPartidoTramosStore {
  return {
    tramos: {
      ida: tramos.ida ?? {},
      vuelta: tramos.vuelta ?? {},
    },
  }
}

export function planFromStore(
  raw: PlanPartidoManualRaw,
  tramo: PlanTramo
): Partial<PlanPartidoData> {
  return unwrapPlanTramos(raw)[tramo] ?? {}
}

export function mergeTramoIntoStore(
  raw: PlanPartidoManualRaw,
  tramo: PlanTramo,
  plan: Partial<PlanPartidoData>
): PlanPartidoTramosStore {
  const all = unwrapPlanTramos(raw)
  all[tramo] = plan
  return wrapPlanTramos(all)
}

export function tramoHasContent(plan: Partial<PlanPartidoData> | undefined | null): boolean {
  return (plan?.fases?.length ?? 0) > 0 || !!plan?.nutricion_partido
}

/** Prefer the current tramo if it has content; otherwise the first tramo with a plan. */
export function pickPlanForCharla(
  raw: PlanPartidoManualRaw,
  preferred?: PlanTramo,
): Partial<PlanPartidoData> {
  const tramos = unwrapPlanTramos(raw)
  if (preferred && tramoHasContent(tramos[preferred])) return tramos[preferred]
  if (tramoHasContent(tramos.ida)) return tramos.ida
  if (tramoHasContent(tramos.vuelta)) return tramos.vuelta
  return preferred ? (tramos[preferred] ?? {}) : (tramos.ida ?? {})
}

/** First official meeting vs this rival is ida; any later official match is vuelta. */
export function inferPlanTramo(
  matches: Array<{ fecha?: string | null; competicion?: string | null }>,
  currentFecha?: string | null
): PlanTramo {
  const oficiales = matches
    .filter((m) => m.competicion === 'liga' || m.competicion === 'copa' || m.competicion === 'torneo')
    .map((m) => (m.fecha || '').slice(0, 10))
    .filter(Boolean)
    .sort()

  const current = currentFecha?.slice(0, 10) || ''
  if (!current) {
    return oficiales.length <= 1 ? 'ida' : 'vuelta'
  }
  const earlier = oficiales.filter((fecha) => fecha < current)
  return earlier.length === 0 ? 'ida' : 'vuelta'
}
