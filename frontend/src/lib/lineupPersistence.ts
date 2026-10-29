import {
  EXTRA_SLOT_PREFIX,
  assignTitularesToSlots,
  formacionForAnotadorSave,
  formacionSlotsForAnotadorSave,
  notasPreRecord,
  parseNotasPre,
  remapFormationSlots,
  snapshotHasLineChanges,
} from './anotador'
import { FORMATIONS } from './formations'

export type LineupConvocado = {
  id: string
  titular?: boolean | null
  posicion_asignada?: string | null
}

const ALL_SLOT_DEFS = Array.from(
  new Map(FORMATIONS.flatMap((f) => f.slots.map((slot) => [slot.id, { id: slot.id, position: slot.position }] as const))).values(),
)

export function lineupSlotsFilled(
  slots?: Record<string, string | null | undefined> | null,
): boolean {
  return Object.values(slots || {}).some(Boolean)
}

function anotadorKickoff(notasPre: unknown): { formation?: string; slots: Record<string, string> } | null {
  const parsed = parseNotasPre(notasPre)
  const snap = parsed.anotador
  if (!snap || !(snap.started || snapshotHasLineChanges(snap))) return null
  const slots = formacionSlotsForAnotadorSave(notasPre, snap)
  if (!lineupSlotsFilled(slots)) return null
  return { formation: formacionForAnotadorSave(notasPre, snap), slots }
}

export function hydrateLineup(args: {
  notasPre?: unknown
  convocados?: LineupConvocado[]
}): { formation: string | null; slots: Record<string, string> } {
  const parsed = parseNotasPre(args.notasPre)
  const kickoff = args.notasPre != null ? anotadorKickoff(args.notasPre) : null
  const slotSource = kickoff ? kickoff.slots : parsed.formacion_slots
  const savedForm = kickoff?.formation || parsed.formacion
  const named = savedForm && FORMATIONS.some((f) => f.name === savedForm)
    ? savedForm
    : null
  const titulares = (args.convocados || []).filter((c) => Boolean(c.titular && c.id))
  const formationName = named || (titulares.length > 0 ? '4-3-3' : null)
  const form = FORMATIONS.find((f) => f.name === formationName) || null

  if (form && lineupSlotsFilled(slotSource)) {
    const filled = Object.fromEntries(
      Object.entries(slotSource || {}).filter(([, value]) => Boolean(value)),
    ) as Record<string, string>
    return {
      formation: form.name,
      slots: remapFormationSlots(
        filled,
        ALL_SLOT_DEFS,
        form.slots.map((slot) => ({ id: slot.id, position: slot.position })),
      ),
    }
  }

  if (form && titulares.length > 0) {
    return {
      formation: form.name,
      slots: assignTitularesToSlots(
        form.slots.map((slot) => ({ id: slot.id, position: slot.position })),
        titulares.map((c) => ({ id: c.id, posicion: c.posicion_asignada })),
      ),
    }
  }

  if (lineupSlotsFilled(slotSource)) {
    const slots: Record<string, string> = {}
    for (const [id, value] of Object.entries(slotSource || {})) {
      if (value) slots[id] = value
    }
    return { formation: named, slots }
  }

  return { formation: named, slots: {} }
}

export function mergeLineupIntoNotasPre(
  existingRaw: unknown,
  formation: string | null,
  slots: Record<string, string>,
): string {
  const data = notasPreRecord(existingRaw)
  if (formation) data.formacion = formation
  data.formacion_slots = slots
  const anotador = parseNotasPre(existingRaw).anotador
  if (anotador?.started) data.formacion_manual = true
  return JSON.stringify(data)
}

function samePlayers(slots: Record<string, string>, ids: Set<string>): boolean {
  const values = Object.values(slots).filter(Boolean)
  if (values.length !== ids.size) return false
  return values.every((id) => ids.has(id))
}

/**
 * El acta del anotador sigue teniendo los cambios. Si el 11 guardado
 * es quien acabó en el campo, hay que volver a escribir el saque.
 */
export function lineupNeedsKickoffRepair(args: {
  notasPre?: unknown
  convocados?: LineupConvocado[]
}): { formation: string | null; slots: Record<string, string> } | null {
  if (args.notasPre == null) return null
  const parsed = parseNotasPre(args.notasPre)
  if (!anotadorKickoff(args.notasPre)) return null
  const next = hydrateLineup(args)
  if (!lineupSlotsFilled(next.slots)) return null
  const stored = parsed.formacion_slots || {}
  const storedKeys = Object.keys(stored)
  const storedDiffers = storedKeys.length !== Object.keys(next.slots).length
    || storedKeys.some((key) => stored[key] !== next.slots[key])
  const titularIds = new Set(
    (args.convocados || []).filter((c) => c.titular && c.id).map((c) => c.id),
  )
  const titularesDiffer = !samePlayers(next.slots, titularIds)
  if (!storedDiffers && !titularesDiffer) return null
  return next
}

export function shouldPersistLineup(
  nextSlots: Record<string, string>,
  existingSlots?: Record<string, string | null | undefined> | null,
): boolean {
  if (lineupSlotsFilled(nextSlots)) return true
  return !lineupSlotsFilled(existingSlots)
}

export type TitularidadFix = {
  /** Once del saque: convocatoria → hueco (null si no tiene puesto en el sistema). */
  starters: Map<string, string | null>
  toTitular: string[]
  toSuplente: string[]
  source: 'anotador' | 'alineacion'
}

/**
 * Titulares que la convocatoria tiene mal frente al once del saque.
 * Manda el anotador si el partido se pitó en él; si no, la alineación guardada.
 */
export function titularidadFix(args: {
  notasPre?: unknown
  convocados: LineupConvocado[]
}): TitularidadFix | null {
  const kickoff = anotadorKickoff(args.notasPre)
  const source: TitularidadFix['source'] = kickoff ? 'anotador' : 'alineacion'
  const slots = kickoff?.slots || parseNotasPre(args.notasPre).formacion_slots
  if (!lineupSlotsFilled(slots)) return null
  const known = new Set(args.convocados.map((c) => c.id))
  const starters = new Map<string, string | null>()
  for (const [slot, convId] of Object.entries(slots || {})) {
    if (convId && known.has(convId)) starters.set(convId, slot.startsWith(EXTRA_SLOT_PREFIX) ? null : slot)
  }
  if (starters.size === 0) return null
  const toTitular = args.convocados.filter((c) => starters.has(c.id) && !c.titular).map((c) => c.id)
  const toSuplente = args.convocados.filter((c) => !starters.has(c.id) && c.titular).map((c) => c.id)
  return { starters, toTitular, toSuplente, source }
}

/** Filas para `batchUpdateStats` que dejan la convocatoria como el once del saque. */
export function titularidadUpdates(
  fix: TitularidadFix,
  convocados: LineupConvocado[],
): Array<{ id: string; titular: boolean; posicion_asignada?: string }> {
  const out: Array<{ id: string; titular: boolean; posicion_asignada?: string }> = []
  for (const c of convocados) {
    const slot = fix.starters.get(c.id)
    const titular = fix.starters.has(c.id)
    const posChanges = titular && slot != null && slot !== c.posicion_asignada
    if (Boolean(c.titular) === titular && !posChanges) continue
    out.push(titular && slot ? { id: c.id, titular, posicion_asignada: slot } : { id: c.id, titular })
  }
  return out
}
