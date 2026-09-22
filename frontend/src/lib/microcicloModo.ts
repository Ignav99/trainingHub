import type { FaseTemporada, Microciclo, ModoPartidoMicrociclo, Partido, PlanCT, Rival, TipoMicrociclo } from '@/types'

export function resolveFaseTemporada(plan?: Partial<PlanCT> | null): FaseTemporada {
  if (plan?.fase_temporada) return plan.fase_temporada
  if (plan?.tipo_microciclo === 'pretemporada') return 'pretemporada'
  return 'competicion'
}

export function resolveModoPartido(plan?: Partial<PlanCT> | null): ModoPartidoMicrociclo {
  if (plan?.modo_partido) return plan.modo_partido
  if (resolveFaseTemporada(plan) === 'pretemporada') return 'none'
  return 'oficial'
}

export function isPretemporada(plan?: Partial<PlanCT> | null): boolean {
  return resolveFaseTemporada(plan) === 'pretemporada'
}

/** Mostrar bloque Informe rival + Plan partido completo */
export function showRivalPlanBlocks(plan?: Partial<PlanCT> | null, hasRival?: boolean): boolean {
  const modo = resolveModoPartido(plan)
  if (modo === 'none' || modo === 'amistoso_interno') return false
  if (modo === 'amistoso_externo') return !!hasRival
  return true
}

/** Usar morfociclo por días de calendario en vez de MD+/- */
export function useMorfocicloCalendario(plan?: Partial<PlanCT> | null): boolean {
  return isPretemporada(plan) || resolveModoPartido(plan) === 'none'
}

type PartidoWithRivalJoin = Partido & { rivales?: Rival }

/** PostgREST may nest the opponent as `rival` or `rivales`. */
export function rivalFromPartido(partido?: Partido | null): Rival | undefined {
  if (!partido) return undefined
  if (partido.rival) return partido.rival
  return (partido as PartidoWithRivalJoin).rivales
}

export function microcicloLinkedRival(
  micro?: Pick<Microciclo, 'rivales' | 'partidos'> | null
): Rival | undefined {
  if (!micro) return undefined
  return micro.rivales ?? rivalFromPartido(micro.partidos)
}

export function microcicloHasLinkedMatch(
  micro?: Pick<Microciclo, 'partido_id' | 'rival_id' | 'rivales' | 'partidos'> | null
): boolean {
  if (!micro) return false
  return Boolean(micro.partido_id || micro.rival_id || micro.rivales || micro.partidos)
}

export function defaultPlanForFase(fase: FaseTemporada): Partial<PlanCT> {
  if (fase === 'pretemporada') {
    return {
      fase_temporada: 'pretemporada',
      tipo_microciclo: 'pretemporada' as TipoMicrociclo,
      modo_partido: 'none',
      auto_link_partido: false,
    }
  }
  return {
    fase_temporada: fase,
    tipo_microciclo: 'competicion',
    modo_partido: 'oficial',
    auto_link_partido: true,
  }
}
