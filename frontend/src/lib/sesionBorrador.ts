/** Marca de una sesión que se empezó a crear y aún no se cerró el asistente. */

export const CREACION_PASO_KEY = 'creacion_paso'
export const CREACION_ASISTIDA_KEY = 'creacion_asistida'

export type CreacionPaso = 'definir' | 'ia' | 'tareas' | 'convocatoria'
export type FaseNotas = Record<string, string> | null | undefined
export type SesionPhaseId = 'definir' | 'convocatoria' | 'diseno' | 'cierre'

const PASOS = new Set<string>(['definir', 'ia', 'tareas', 'convocatoria'])

export const PASO_LABEL: Record<CreacionPaso, string> = {
  definir: 'Definir',
  ia: 'Recomendación',
  tareas: 'Partes de la sesión',
  convocatoria: 'Convocatoria',
}

export function readCreacionPaso(faseNotas: FaseNotas): CreacionPaso | null {
  const raw = faseNotas?.[CREACION_PASO_KEY]
  if (raw && PASOS.has(raw)) return raw as CreacionPaso
  return null
}

export function creacionAsistida(faseNotas: FaseNotas): boolean {
  return faseNotas?.[CREACION_ASISTIDA_KEY] === '1' || readCreacionPaso(faseNotas) === 'ia'
}

export function markCreacion(
  faseNotas: FaseNotas,
  paso: CreacionPaso,
  assisted: boolean,
): Record<string, string> {
  return {
    ...(faseNotas || {}),
    [CREACION_PASO_KEY]: paso,
    [CREACION_ASISTIDA_KEY]: assisted ? '1' : '0',
  }
}

export function clearCreacion(faseNotas: FaseNotas): Record<string, string> {
  const next = { ...(faseNotas || {}) }
  delete next[CREACION_PASO_KEY]
  delete next[CREACION_ASISTIDA_KEY]
  return next
}

export function wizardStepToPaso(step: number, isAssisted: boolean): CreacionPaso {
  if (step <= 0) return 'definir'
  if (isAssisted) {
    if (step === 1) return 'ia'
    if (step === 2) return 'tareas'
    return 'convocatoria'
  }
  if (step === 1) return 'tareas'
  return 'convocatoria'
}

export function pasoToWizardStep(paso: CreacionPaso | null, isAssisted: boolean): number {
  if (!paso || paso === 'definir') return 0
  if (isAssisted) {
    if (paso === 'ia') return 1
    if (paso === 'tareas') return 2
    return 3
  }
  if (paso === 'ia' || paso === 'tareas') return 1
  return 2
}

export function pasoToPhase(paso: CreacionPaso | null): SesionPhaseId {
  if (paso === 'tareas' || paso === 'ia') return 'diseno'
  if (paso === 'convocatoria') return 'convocatoria'
  return 'definir'
}

export function canPersistDraft(input: {
  titulo?: string | null
  fecha?: string | null
  match_day?: string | null
}): boolean {
  return (input.titulo || '').trim().length >= 3 && !!input.fecha && !!input.match_day
}

export function continueHref(id: string, faseNotas: FaseNotas, estado?: string | null): string {
  const paso = readCreacionPaso(faseNotas)
  if (!paso || (estado && estado !== 'borrador')) return `/sesiones/${id}`
  return `/sesiones/${id}?fase=${pasoToPhase(paso)}`
}

export function continuarWizardHref(id: string, faseNotas: FaseNotas): string {
  const params = new URLSearchParams({ continuar: id })
  if (creacionAsistida(faseNotas)) params.set('mode', 'assisted')
  return `/sesiones/nueva?${params.toString()}`
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function persistedTaskRows(
  tareas: { tarea?: { id?: string } | null; fase: string; orden: number }[],
): { tarea_id: string; orden: number; fase_sesion: string }[] {
  const rows: { tarea_id: string; orden: number; fase_sesion: string }[] = []
  for (const t of tareas) {
    const id = t.tarea?.id
    if (!id || !UUID_RE.test(id)) continue
    rows.push({ tarea_id: id, orden: t.orden, fase_sesion: t.fase })
  }
  return rows
}

export function taskSyncKey(
  rows: { tarea_id: string; orden: number; fase_sesion: string }[],
): string {
  return rows.map((r) => `${r.tarea_id}|${r.fase_sesion}|${r.orden}`).join('\n')
}
