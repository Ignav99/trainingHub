import type { NutricionPartidoPlan, PlanEstructuraRivalABP, PlanPartidoData, PlanPartidoPhase } from '@/types'
import { diagramHasContent } from './planPartidoDiagramRoles'

function nutricionTieneContenido(plan?: NutricionPartidoPlan | null): boolean {
  if (!plan) return false
  if (plan.argumento_suplementacion?.trim() || plan.comida_recomendada?.trim()) return true
  if (plan.notas?.trim() || plan.clima_estimacion?.trim()) return true
  if ((plan.etiquetas ?? []).some((tag) => tag.trim())) return true
  return (plan.suplementaciones ?? []).length > 0
}

export function estructuraTieneContenido(item?: PlanEstructuraRivalABP | null): boolean {
  if (!item) return false
  return Boolean(
    item.titulo?.trim() ||
      item.notas?.trim() ||
      item.pizarra_tactica ||
      diagramHasContent(item.pizarra_diagrama)
  )
}

export function fasePlanTieneContenido(phase?: PlanPartidoPhase | null): boolean {
  if (!phase) return false
  if (phase.comentario_general?.trim() || phase.texto?.trim() || phase.sistema?.trim()) return true
  if ((phase.jugadas_abp?.length ?? 0) > 0 || (phase.clips?.length ?? 0) > 0) return true
  if (phase.pizarra_tactica || diagramHasContent(phase.pizarra_diagrama)) return true
  if (phase.roles?.length) return true
  if (phase.subfases && Object.values(phase.subfases).some((sub) =>
    Boolean(sub?.notas?.trim() || sub?.sistema?.trim() || sub?.pizarra_tactica || diagramHasContent(sub?.pizarra_diagrama))
  )) return true
  return (phase.estructuras_rival ?? []).some((item) => estructuraTieneContenido(item))
}

/** Interruptor explícito. Si aún no se ha pulsado, se mantiene lo que ya estaba relleno. */
export function seccionOpcionalActiva(flag: boolean | undefined, yaTieneContenido: boolean): boolean {
  if (typeof flag === 'boolean') return flag
  return yaTieneContenido
}

export function abpDefensivaEnInforme(plan?: Partial<PlanPartidoData> | null): boolean {
  const phase = plan?.fases?.find((item) => item.fase === 'abp_defensiva')
  return seccionOpcionalActiva(plan?.incluir_abp_defensiva, fasePlanTieneContenido(phase))
}

export function nutricionEnInforme(plan?: Partial<PlanPartidoData> | null): boolean {
  return seccionOpcionalActiva(plan?.incluir_nutricion, nutricionTieneContenido(plan?.nutricion_partido))
}

export function nutricionLineas(plan?: NutricionPartidoPlan | null): string[] {
  if (!plan) return []
  const out: string[] = []
  if (plan.argumento_suplementacion?.trim()) out.push(plan.argumento_suplementacion.trim())
  const tags = (plan.etiquetas ?? []).map((tag) => tag.trim()).filter(Boolean)
  if (tags.length > 0) out.push(tags.join(' · '))
  if (plan.comida_recomendada?.trim()) out.push(plan.comida_recomendada.trim())
  if (plan.notas?.trim()) out.push(plan.notas.trim())
  if (plan.clima_estimacion?.trim()) out.push(plan.clima_estimacion.trim())
  return out
}
