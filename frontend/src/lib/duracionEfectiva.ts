import { normalizeDescansoSeconds } from '@/lib/tareaDescanso'
import type { FaseSesion, SesionBloque, SesionTarea, Tarea } from '@/types'

export const COMPENSATORIO_FASES: FaseSesion[] = [
  'compensatorio_1',
  'compensatorio_2',
  'compensatorio_3',
]

export function minutosEfectivosCatalogo(
  duracionTotal: number | null | undefined,
  tiempoDescanso?: number | null,
  numSeries?: number | null,
): number {
  const clock = Math.max(0, Math.round(Number(duracionTotal) || 0))
  if (clock <= 0) return 0
  const restMin = normalizeDescansoSeconds(tiempoDescanso) / 60
  const series = Math.max(1, Math.round(Number(numSeries) || 1))
  const totalRest = series > 1 ? restMin * (series - 1) : restMin
  return Math.max(0, Math.round(clock - totalRest))
}

export function clockMinutosSesionTarea(st: Pick<SesionTarea, 'duracion_override' | 'tarea'>): number {
  return Math.max(0, Math.round(Number(st.duracion_override || st.tarea?.duracion_total || 0)))
}

export function minutosCargaSesionTarea(st: SesionTarea): number {
  if (st.minutos_efectivos != null && Number.isFinite(st.minutos_efectivos)) {
    return Math.max(0, Math.round(st.minutos_efectivos))
  }
  const tarea = st.tarea
  return minutosEfectivosCatalogo(
    clockMinutosSesionTarea(st),
    tarea?.tiempo_descanso,
    tarea?.num_series,
  )
}

export function isCompensatorioFase(fase?: string | null): boolean {
  return COMPENSATORIO_FASES.includes(fase as FaseSesion)
}

export function emptyCompensatorioLanes(): NonNullable<SesionBloque['compensatorio']>['lanes'] {
  return [
    { id: 'lane-1', label: 'Grupo A', jugador_ids: [] },
    { id: 'lane-2', label: 'Grupo B', jugador_ids: [] },
    { id: 'lane-3', label: 'Grupo C', jugador_ids: [] },
  ]
}

export function lanesFromBloque(bloque: SesionBloque) {
  const lanes = bloque.compensatorio?.lanes
  const base = emptyCompensatorioLanes()
  if (!lanes?.length) return base
  return base.map((fallback, i) => {
    const lane = lanes[i]
    if (!lane) return fallback
    return {
      id: lane.id || fallback.id,
      label: lane.label || fallback.label,
      jugador_ids: Array.isArray(lane.jugador_ids) ? lane.jugador_ids.map(String) : [],
    }
  })
}

export function faseForLane(index: number): FaseSesion {
  return COMPENSATORIO_FASES[index] || 'compensatorio_1'
}

export function defaultEfectivosForTarea(tarea?: Pick<Tarea, 'duracion_total' | 'tiempo_descanso' | 'num_series'> | null, clockOverride?: number | null) {
  return minutosEfectivosCatalogo(
    clockOverride ?? tarea?.duracion_total,
    tarea?.tiempo_descanso,
    tarea?.num_series,
  )
}
