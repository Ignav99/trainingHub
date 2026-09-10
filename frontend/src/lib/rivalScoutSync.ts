import type { RivalJugadorEvaluacion, RivalScoutData, RivalScoutStrategy } from '@/types'

/**
 * Perfil persistente del rival (`rivales.scout_manual`).
 *
 * Incluye el olfato del entrenador: Comentarios Rival (`estrategia.notas`),
 * dimensiones y actitud. No es intel de actas. Se guarda al autosave de
 * Informe Rival y Sala del Lunes; al reabrir la ficha tiene que seguir ahí.
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
          notas: estrategia.notas,
          dimensiones_campo: estrategia.dimensiones_campo,
          actitud_estilo: estrategia.actitud_estilo,
        }
      : undefined,
  }
}

/** Contexto local del microciclo (`plan_ct`). Solo como respaldo si el perfil aún no tiene olfato. */
export function extractWeeklyContext(scout: Partial<RivalScoutData>): Partial<RivalScoutStrategy> {
  return {
    notas: scout.estrategia?.notas,
    dimensiones_campo: scout.estrategia?.dimensiones_campo,
    actitud_estilo: scout.estrategia?.actitud_estilo,
  }
}

function pickText(saved: string | undefined, weekly: string | undefined): string {
  if (typeof saved === 'string') return saved
  return weekly || ''
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
      ...saved.estrategia,
      sistema: local.estrategia?.sistema ?? saved.estrategia?.sistema,
      once_probable: local.estrategia?.once_probable ?? saved.estrategia?.once_probable,
      // Comentarios Rival: el perfil gana. El plan semanal vacío no puede borrarlos.
      notas: pickText(saved.estrategia?.notas, weekly.notas),
      dimensiones_campo: pickText(saved.estrategia?.dimensiones_campo, weekly.dimensiones_campo),
      actitud_estilo: pickText(saved.estrategia?.actitud_estilo, weekly.actitud_estilo),
    },
  }
}

export type RivalOnceProbable = NonNullable<RivalScoutStrategy['once_probable']>

export function emptyJugadorEvaluacion(
  partial: Partial<RivalJugadorEvaluacion> & { nombre: string }
): RivalJugadorEvaluacion {
  return {
    nombre: partial.nombre.trim(),
    dorsal: partial.dorsal ?? null,
    apariciones: partial.apariciones ?? 0,
    sancionado: partial.sancionado,
    posicion: partial.posicion ?? '',
    rol: partial.rol ?? '',
    comentario: partial.comentario ?? '',
    puntuacion: partial.puntuacion,
    atributos: partial.atributos,
  }
}

export function ensureOnceProbable(
  once: RivalScoutStrategy['once_probable'] | undefined
): RivalOnceProbable {
  return {
    actas_analizadas: once?.actas_analizadas ?? 0,
    jugadores: [...(once?.jugadores ?? [])],
    colocacion: { ...(once?.colocacion ?? {}) },
  }
}

function nameKey(nombre: string): string {
  return nombre.trim().toLowerCase()
}

export function upsertRivalJugador(
  once: RivalScoutStrategy['once_probable'] | undefined,
  nombre: string,
  extras?: { dorsal?: number | null; posicion?: string }
): RivalOnceProbable {
  const next = ensureOnceProbable(once)
  const trimmed = nombre.trim()
  if (!trimmed) return next
  const idx = next.jugadores.findIndex((j) => nameKey(j.nombre) === nameKey(trimmed))
  if (idx >= 0) {
    next.jugadores[idx] = {
      ...next.jugadores[idx],
      nombre: trimmed,
      ...(extras?.dorsal !== undefined ? { dorsal: extras.dorsal } : {}),
      ...(extras?.posicion ? { posicion: extras.posicion } : {}),
    }
  } else {
    next.jugadores.push(emptyJugadorEvaluacion({ nombre: trimmed, ...extras }))
  }
  return next
}

export function renameRivalJugador(
  once: RivalScoutStrategy['once_probable'] | undefined,
  oldName: string,
  newName: string
): RivalOnceProbable {
  const next = ensureOnceProbable(once)
  const trimmed = newName.trim()
  if (!trimmed || nameKey(oldName) === nameKey(trimmed)) {
    if (trimmed && trimmed !== oldName) {
      next.jugadores = next.jugadores.map((j) =>
        j.nombre === oldName ? { ...j, nombre: trimmed } : j
      )
    }
    return next
  }
  next.jugadores = next.jugadores.map((j) =>
    j.nombre === oldName ? { ...j, nombre: trimmed } : j
  )
  const colocacion: Record<string, string> = {}
  for (const [slot, name] of Object.entries(next.colocacion ?? {})) {
    colocacion[slot] = name === oldName ? trimmed : name
  }
  next.colocacion = colocacion
  return next
}

export function removeRivalJugador(
  once: RivalScoutStrategy['once_probable'] | undefined,
  nombre: string
): RivalOnceProbable {
  const next = ensureOnceProbable(once)
  next.jugadores = next.jugadores.filter((j) => j.nombre !== nombre)
  const colocacion: Record<string, string> = {}
  for (const [slot, name] of Object.entries(next.colocacion ?? {})) {
    if (name !== nombre) colocacion[slot] = name
  }
  next.colocacion = colocacion
  return next
}

export function assignRivalSlot(
  once: RivalScoutStrategy['once_probable'] | undefined,
  slotId: string,
  playerName: string | null
): RivalOnceProbable {
  const next = ensureOnceProbable(once)
  const trimmed = playerName?.trim() ?? ''
  const colocacion: Record<string, string> = { ...(next.colocacion ?? {}) }
  for (const k of Object.keys(colocacion)) {
    if (colocacion[k] === trimmed || k === slotId) delete colocacion[k]
  }
  if (!trimmed) {
    next.colocacion = colocacion
    return next
  }
  const withPlayer = upsertRivalJugador(next, trimmed)
  withPlayer.colocacion = { ...colocacion, [slotId]: trimmed }
  return withPlayer
}

/** Fusiona jugadores RFEF frescos con anotaciones guardadas (comentarios, emojis, colocación).
 *  Conserva jugadores añadidos a mano que no salen en las actas. */
export function mergeOnceProbableAnnotations(
  fresh: RivalJugadorEvaluacion[],
  saved: RivalJugadorEvaluacion[] | undefined,
  colocacion: Record<string, string> | undefined,
  actas: number
): RivalOnceProbable {
  const byName = new Map((saved ?? []).map((j) => [nameKey(j.nombre), j]))

  const jugadores: RivalJugadorEvaluacion[] = fresh.map((j) => {
    const prev = byName.get(nameKey(j.nombre))
    return {
      ...j,
      rol: prev?.rol ?? '',
      comentario: prev?.comentario ?? '',
      atributos: prev?.atributos,
      puntuacion: prev?.puntuacion,
      posicion: prev?.posicion ?? '',
    }
  })

  const seen = new Set(jugadores.map((j) => nameKey(j.nombre)))
  for (const prev of saved ?? []) {
    if (!seen.has(nameKey(prev.nombre))) {
      jugadores.push(prev)
      seen.add(nameKey(prev.nombre))
    }
  }

  return {
    actas_analizadas: actas,
    jugadores,
    colocacion: colocacion ?? {},
  }
}
