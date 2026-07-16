import type { PlanEspecialJugadorSemana, NutricionPartidoPlan } from '@/types'
import { nutricionApi } from '@/lib/api/nutricion'

const MICROCICLO_TAG = (microcicloId: string) => `[microciclo:${microcicloId}]`
const PLAN_ESPECIAL_TAG = (entryId: string) => `plan_especial:${entryId}`

function eachDayInRange(fechaInicio: string, fechaFin: string): string[] {
  const dates: string[] = []
  const cur = new Date(`${fechaInicio.slice(0, 10)}T12:00:00`)
  const end = new Date(`${fechaFin.slice(0, 10)}T12:00:00`)
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function buildPlanNotas(microcicloId: string, entry: PlanEspecialJugadorSemana): string {
  const lines = [
    `${MICROCICLO_TAG(microcicloId)} ${PLAN_ESPECIAL_TAG(entry.id)}`,
    entry.descripcion.trim(),
  ]
  if (entry.notas?.trim()) lines.push(entry.notas.trim())
  return lines.join('\n')
}

function isMicrocicloPlan(notas: string | undefined, microcicloId: string, entryId: string): boolean {
  if (!notas) return false
  return notas.includes(MICROCICLO_TAG(microcicloId)) && notas.includes(PLAN_ESPECIAL_TAG(entryId))
}

/** Sincroniza un plan especial de jugador con planes_nutricionales_dia (ficha del jugador). */
export async function syncPlanEspecialJugador(
  equipoId: string,
  microcicloId: string,
  fechaInicio: string,
  fechaFin: string,
  entry: PlanEspecialJugadorSemana
): Promise<PlanEspecialJugadorSemana> {
  if (!entry.jugador_id || !entry.descripcion.trim()) {
    return { ...entry, sincronizado: false, plan_nutricional_ids: [] }
  }

  const dates = eachDayInRange(fechaInicio, fechaFin)
  const existingWeek = await nutricionApi.getPlanesSemana(equipoId, fechaInicio.slice(0, 10), entry.jugador_id)
  const linked = existingWeek.filter((p) => isMicrocicloPlan(p.notas, microcicloId, entry.id))

  const planIds: string[] = []
  const notas = buildPlanNotas(microcicloId, entry)

  for (const fecha of dates) {
    const dayPlan = linked.find((p) => p.fecha.slice(0, 10) === fecha)
    const payload = {
      equipo_id: equipoId,
      jugador_id: entry.jugador_id,
      fecha,
      contexto: 'dia_normal' as const,
      comidas: [],
      notas,
    }

    if (dayPlan) {
      const updated = await nutricionApi.updatePlan(dayPlan.id, payload)
      planIds.push(updated.id)
    } else {
      const created = await nutricionApi.createPlan(payload)
      planIds.push(created.id)
    }
  }

  // Eliminar días huérfanos de este plan especial
  const orphanIds = linked
    .filter((p) => !dates.includes(p.fecha.slice(0, 10)))
    .map((p) => p.id)
  await Promise.all(orphanIds.map((id) => nutricionApi.deletePlan(id)))

  return { ...entry, plan_nutricional_ids: planIds, sincronizado: true }
}

/** Elimina planes nutricionales vinculados a un plan especial de microciclo. */
export async function deletePlanEspecialJugador(
  equipoId: string,
  microcicloId: string,
  fechaInicio: string,
  entry: PlanEspecialJugadorSemana
): Promise<void> {
  const ids = entry.plan_nutricional_ids ?? []
  if (ids.length > 0) {
    await Promise.all(ids.map((id) => nutricionApi.deletePlan(id).catch(() => undefined)))
    return
  }

  const existingWeek = await nutricionApi.getPlanesSemana(equipoId, fechaInicio.slice(0, 10), entry.jugador_id)
  const linked = existingWeek.filter((p) => isMicrocicloPlan(p.notas, microcicloId, entry.id))
  await Promise.all(linked.map((p) => nutricionApi.deletePlan(p.id).catch(() => undefined)))
}

/** Sincroniza todos los planes especiales de la semana. */
export async function syncAllPlanesEspeciales(
  equipoId: string,
  microcicloId: string,
  fechaInicio: string,
  fechaFin: string,
  entries: PlanEspecialJugadorSemana[]
): Promise<PlanEspecialJugadorSemana[]> {
  const valid = entries.filter((e) => e.jugador_id && e.descripcion.trim())
  return Promise.all(
    valid.map((entry) => syncPlanEspecialJugador(equipoId, microcicloId, fechaInicio, fechaFin, entry))
  )
}

export function defaultNutricionPartidoPlan(): NutricionPartidoPlan {
  return {
    clima_fecha: '',
    clima_hora: '',
    clima_lugar: 'Madrid',
    clima_estimacion: '',
    argumento_suplementacion: '',
    etiquetas: [],
    comida_recomendada: '',
    notas: '',
  }
}
