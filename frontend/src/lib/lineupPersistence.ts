import { assignTitularesToSlots, notasPreRecord, parseNotasPre } from './anotador'
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
  const named = parsed.formacion && FORMATIONS.some((f) => f.name === parsed.formacion)
    ? parsed.formacion
    : null
  const titulares = (args.convocados || []).filter((c) => Boolean(c.titular && c.id))
  const formationName = named || (titulares.length > 0 ? '4-3-3' : null)
  const form = FORMATIONS.find((f) => f.name === formationName) || null

  if (form && lineupSlotsFilled(parsed.formacion_slots)) {
    const slots: Record<string, string> = {}
    for (const slot of form.slots) {
      const value = parsed.formacion_slots?.[slot.id]
      if (value) slots[slot.id] = value
    }
    if (Object.keys(slots).length === 0) {
      for (const [id, value] of Object.entries(parsed.formacion_slots || {})) {
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

  if (lineupSlotsFilled(parsed.formacion_slots)) {
    const slots: Record<string, string> = {}
    for (const [id, value] of Object.entries(parsed.formacion_slots || {})) {
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

export function shouldPersistLineup(
  nextSlots: Record<string, string>,
  existingSlots?: Record<string, string | null | undefined> | null,
): boolean {
  if (lineupSlotsFilled(nextSlots)) return true
  return !lineupSlotsFilled(existingSlots)
}
