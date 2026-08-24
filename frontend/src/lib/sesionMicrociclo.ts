import type { PlanCT } from '@/types'

const MD_POR_DELTA: Record<number, string> = {
  0: 'MD',
  1: 'MD-1',
  2: 'MD-2',
  3: 'MD-3',
  4: 'MD-4',
  [-1]: 'MD+1',
  [-2]: 'MD+2',
}

export function matchDayDesdePartido(
  fechaSesion?: string | null,
  fechaPartido?: string | null
): string | null {
  const ses = (fechaSesion || '').slice(0, 10)
  const par = (fechaPartido || '').slice(0, 10)
  if (!ses || !par) return null
  const a = new Date(`${ses}T12:00:00`)
  const b = new Date(`${par}T12:00:00`)
  const days = Math.round((b.getTime() - a.getTime()) / 86400000)
  return MD_POR_DELTA[days] ?? null
}

export function tipoDesdePlan(plan?: Partial<PlanCT> | null): string {
  const tipo = String(plan?.tipo_microciclo || '').trim()
  const fase = String(plan?.fase_temporada || '').trim()
  if (tipo === 'pretemporada' || fase === 'pretemporada') return 'pretemporada'
  if (fase === 'transicion' || tipo === 'transicion') return 'transicion'
  return tipo || 'competicion'
}

export function contextoDesdePlan(plan?: Partial<PlanCT> | null): {
  contexto_periodo: 'pretemporada' | 'competicion' | 'transicion'
  es_pretemporada: boolean
  tipo: string
} {
  const tipo = tipoDesdePlan(plan)
  if (tipo === 'pretemporada') {
    return { contexto_periodo: 'pretemporada', es_pretemporada: true, tipo }
  }
  if (tipo === 'transicion') {
    return { contexto_periodo: 'transicion', es_pretemporada: false, tipo }
  }
  return { contexto_periodo: 'competicion', es_pretemporada: false, tipo }
}

export function microcicloCubreFecha(
  m: { fecha_inicio?: string | null; fecha_fin?: string | null },
  fecha: string
): boolean {
  const ini = (m.fecha_inicio || '').slice(0, 10)
  const fin = (m.fecha_fin || '').slice(0, 10)
  const f = fecha.slice(0, 10)
  return !!ini && !!fin && ini <= f && f <= fin
}

export const TIPO_MICROCICLO_LABEL: Record<string, string> = {
  pretemporada: 'Pretemporada',
  competicion: 'Competición',
  carga: 'Carga',
  choque: 'Choque',
  aproximacion: 'Aproximación',
  recuperacion: 'Recuperación',
  transicion: 'Transición',
}
