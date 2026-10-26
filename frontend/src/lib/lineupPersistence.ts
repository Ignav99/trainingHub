import {
  assignTitularesToSlots,
  formacionSlotsForAnotadorSave,
  notasPreRecord,
  parseNotasPre,
  snapshotHasLineChanges,
} from './anotador'
import { FORMATIONS } from './formations'

export type LineupConvocado = {
  id: string
  titular?: boolean | null
  posicion_asignada?: string | null
}

export function lineupSlotsFilled(
  slots?: Record<string, string | null | undefined> | null,
): boolean {
  return Object.values(slots || {}).some(Boolean)
}

export function hydrateLineup(args: {
  notasPre?: unknown
  convocados?: LineupConvocado[]
}): { formation: string | null; slots: Record<string, string> } {
  const parsed = parseNotasPre(args.notasPre)
  const kickoff = args.notasPre != null && parsed.anotador && snapshotHasLineChanges(parsed.anotador)
    ? formacionSlotsForAnotadorSave(args.notasPre, parsed.anotador)
    : null
  const slotSource = kickoff && lineupSlotsFilled(kickoff) ? kickoff : parsed.formacion_slots
  const named = parsed.formacion && FORMATIONS.some((f) => f.name === parsed.formacion)
    ? parsed.formacion
    : null
  const titulares = (args.convocados || []).filter((c) => Boolean(c.titular && c.id))
  const formationName = named || (titulares.length > 0 ? '4-3-3' : null)
  const form = FORMATIONS.find((f) => f.name === formationName) || null

  if (form && lineupSlotsFilled(slotSource)) {
    const slots: Record<string, string> = {}
    for (const slot of form.slots) {
      const value = slotSource?.[slot.id]
      if (value) slots[slot.id] = value
    }
    if (Object.keys(slots).length === 0) {
      for (const [id, value] of Object.entries(slotSource || {})) {
        if (value) slots[id] = value
      }
    }
    return { formation: form.name, slots }
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
  if (!parsed.anotador || !snapshotHasLineChanges(parsed.anotador)) return null
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
