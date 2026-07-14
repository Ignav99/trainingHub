import type { RivalJugadorEvaluacion, RivalScoutData, RivalScoutStrategy } from '@/types'

/**
 * Partes del informe rival que viven en rivales.scout_manual (perfil persistente del rival).
 * Se sincronizan entre la ficha del rival y cualquier microciclo que enfrente a ese rival.
 */
export function extractPersistentScout(scout: Partial<RivalScoutData>): Partial<RivalScoutData> {
  const estrategia = scout.estrategia
  let onceOverlay: RivalScoutStrategy['once_probable'] | undefined

  if (estrategia?.once_probable) {
    onceOverlay = {
      actas_analizadas: estrategia.once_probable.actas_analizadas,
      colocacion: estrategia.once_probable.colocacion ?? {},
      jugadores: (estrategia.once_probable.jugadores ?? []).map((j) => ({
        nombre: j.nombre,
        dorsal: j.dorsal,
        apariciones: j.apariciones,
        sancionado: j.sancionado,
        rol: j.rol,
        comentario: j.comentario,
        atributos: j.atributos,
        puntuacion: j.puntuacion,
        posicion: j.posicion,
      })),
    }
  }

  return {
    fases: scout.fases ?? [],
    estrategia: estrategia
      ? {
          sistema: estrategia.sistema,
          once_probable: onceOverlay,
        }
      : undefined,
  }
}

/** Contexto de la semana de partido — solo en plan_ct del microciclo. */
export function extractWeeklyContext(scout: Partial<RivalScoutData>): Partial<RivalScoutStrategy> {
  return {
    notas: scout.estrategia?.notas,
    dimensiones_campo: scout.estrategia?.dimensiones_campo,
  }
}

/** Combina perfil persistente del rival con contexto semanal del microciclo. */
export function mergeScoutOnLoad(
  persistent: Partial<RivalScoutData> | null | undefined,
  localScout: Partial<RivalScoutData> | null | undefined
): Partial<RivalScoutData> {
  const local = localScout ?? {}
  const saved = persistent ?? {}
  const weekly = extractWeeklyContext(local)

  return {
    fases: saved.fases?.length ? saved.fases : local.fases ?? [],
    estrategia: {
      sistema: local.estrategia?.sistema ?? saved.estrategia?.sistema,
      notas: weekly.notas ?? '',
      dimensiones_campo: weekly.dimensiones_campo ?? '',
      once_probable: local.estrategia?.once_probable ?? saved.estrategia?.once_probable,
    },
  }
}

/** Fusiona jugadores RFEF frescos con anotaciones guardadas (comentarios, emojis, colocación). */
export function mergeOnceProbableAnnotations(
  fresh: RivalJugadorEvaluacion[],
  saved: RivalJugadorEvaluacion[] | undefined,
  colocacion: Record<string, string> | undefined,
  actas: number
): RivalScoutStrategy['once_probable'] {
  const byName = new Map((saved ?? []).map((j) => [j.nombre, j]))

  const jugadores = fresh.map((j) => {
    const prev = byName.get(j.nombre)
    return {
      ...j,
      rol: prev?.rol ?? '',
      comentario: prev?.comentario ?? '',
      atributos: prev?.atributos,
      puntuacion: prev?.puntuacion,
      posicion: prev?.posicion ?? '',
    }
  })

  return {
    actas_analizadas: actas,
    jugadores,
    colocacion: colocacion ?? {},
  }
}
