import { normalizeDescansoSeconds } from '@/lib/tareaDescanso'
import type { FaseSesion, SesionBloque, SesionTarea, Tarea } from '@/types'

export const COMPENSATORIO_MIN_LANES = 2
export const COMPENSATORIO_MAX_LANES = 8
export const COMPENSATORIO_DEFAULT_LANES = 2

const COMPENSATORIO_FASE_RE = /^compensatorio_(\d+)$/

export function grupoLetter(index: number): string {
  return String.fromCharCode(65 + index)
}

export function faseForLane(index: number): FaseSesion {
  const n = Math.max(1, Math.min(COMPENSATORIO_MAX_LANES, index + 1))
  return `compensatorio_${n}` as FaseSesion
}

export const COMPENSATORIO_FASES: FaseSesion[] = Array.from(
  { length: COMPENSATORIO_MAX_LANES },
  (_, i) => faseForLane(i),
)

export function isCompensatorioFase(fase?: string | null): boolean {
  const match = COMPENSATORIO_FASE_RE.exec(String(fase || ''))
  if (!match) return false
  const n = Number(match[1])
  return n >= 1 && n <= COMPENSATORIO_MAX_LANES
}

export function compensatorioLaneIndex(fase?: string | null): number | null {
  const match = COMPENSATORIO_FASE_RE.exec(String(fase || ''))
  if (!match) return null
  const n = Number(match[1])
  if (n < 1 || n > COMPENSATORIO_MAX_LANES) return null
  return n - 1
}

export function clampLaneCount(n: number): number {
  return Math.max(COMPENSATORIO_MIN_LANES, Math.min(COMPENSATORIO_MAX_LANES, Math.round(n) || COMPENSATORIO_DEFAULT_LANES))
}

export function emptyCompensatorioLane(index: number) {
  return {
    id: `lane-${index + 1}`,
    label: `Grupo ${grupoLetter(index)}`,
    jugador_ids: [] as string[],
  }
}

export function emptyCompensatorioLanes(count = COMPENSATORIO_DEFAULT_LANES) {
  const n = clampLaneCount(count)
  return Array.from({ length: n }, (_, i) => emptyCompensatorioLane(i))
}

function normalizeLane(lane: unknown, index: number) {
  const fallback = emptyCompensatorioLane(index)
  if (!lane || typeof lane !== 'object') return fallback
  const raw = lane as { id?: string; label?: string; jugador_ids?: unknown }
  return {
    id: raw.id || fallback.id,
    label: raw.label || fallback.label,
    jugador_ids: Array.isArray(raw.jugador_ids) ? raw.jugador_ids.map(String) : [],
  }
}

export function lanesFromBloque(bloque: SesionBloque | null | undefined) {
  const lanes = bloque?.compensatorio?.lanes
  if (!lanes?.length) return emptyCompensatorioLanes()
  const n = clampLaneCount(lanes.length)
  return Array.from({ length: n }, (_, i) => normalizeLane(lanes[i], i))
}

export function fasesForLanes(count: number): FaseSesion[] {
  return Array.from({ length: clampLaneCount(count) }, (_, i) => faseForLane(i))
}

export function laneCountFromTareas(tareas: { fase_sesion?: string | null; fase?: string | null }[] | undefined): number {
  let max = 0
  for (const t of tareas || []) {
    const idx = compensatorioLaneIndex(t.fase_sesion || t.fase)
    if (idx != null) max = Math.max(max, idx + 1)
  }
  return max > 0 ? clampLaneCount(max) : COMPENSATORIO_DEFAULT_LANES
}

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

export function defaultEfectivosForTarea(tarea?: Pick<Tarea, 'duracion_total' | 'tiempo_descanso' | 'num_series'> | null, clockOverride?: number | null) {
  return minutosEfectivosCatalogo(
    clockOverride ?? tarea?.duracion_total,
    tarea?.tiempo_descanso,
    tarea?.num_series,
  )
}
