import { formacionSlotKeys, getFormacionLayout } from './formaciones11'
import { canonicalPosicion } from './posiciones'
import { isPortero, type SlotPlayer } from './slotPlayerGroups'

export const CAMPOGRAMA_ESTIMADO_KEY = '_campograma_estimado'

export interface CampogramaEstimado {
  sistema: string
  titulares: Record<string, string>
}

export const EMPTY_CAMPOGRAMA: CampogramaEstimado = {
  sistema: '4-3-3',
  titulares: {},
}

/** Familias que el cuerpo técnico mira al armar el once de la sesión. */
export const ROLES_SESION = [
  { id: 'POR', label: 'Porteros', codes: ['POR'] },
  { id: 'DFC', label: 'Centrales', codes: ['DFC'] },
  { id: 'LAT', label: 'Laterales', codes: ['LTD', 'LTI'] },
  { id: 'CAR', label: 'Carrileros', codes: ['CAD', 'CAI'] },
  { id: 'MED', label: 'Medios', codes: ['MCD', 'MC', 'MCO', 'MID', 'MII'] },
  { id: 'EXT', label: 'Extremos', codes: ['EXD', 'EXI'] },
  { id: 'DEL', label: 'Delanteros', codes: ['DC', 'SD', 'MP'] },
] as const

export function parseCampograma(raw: string | undefined | null): CampogramaEstimado {
  if (!raw) return { ...EMPTY_CAMPOGRAMA, titulares: {} }
  try {
    const parsed = JSON.parse(raw) as Partial<CampogramaEstimado>
    const sistema = typeof parsed.sistema === 'string' && parsed.sistema ? parsed.sistema : '4-3-3'
    const titulares: Record<string, string> = {}
    if (parsed.titulares && typeof parsed.titulares === 'object') {
      for (const [slot, id] of Object.entries(parsed.titulares)) {
        if (typeof id === 'string' && id) titulares[slot] = id
      }
    }
    return { sistema, titulares }
  } catch {
    return { ...EMPTY_CAMPOGRAMA, titulares: {} }
  }
}

export function serializeCampograma(value: CampogramaEstimado): string {
  return JSON.stringify({ sistema: value.sistema, titulares: value.titulares })
}

function playerCodes(j: SlotPlayer): Set<string> {
  const set = new Set<string>()
  const principal = canonicalPosicion(j.posicion_principal)
  if (principal) set.add(principal)
  for (const raw of j.posiciones_secundarias || []) {
    const code = canonicalPosicion(raw)
    if (code) set.add(code)
  }
  if (isPortero(j)) set.add('POR')
  return set
}

export function roleOfPlayer(j: SlotPlayer): (typeof ROLES_SESION)[number]['id'] | null {
  const principal = isPortero(j) ? 'POR' : canonicalPosicion(j.posicion_principal)
  if (!principal) return null
  const role = ROLES_SESION.find((r) => (r.codes as readonly string[]).includes(principal))
  return role?.id ?? null
}

export function countByRole(jugadores: SlotPlayer[]): { id: string; label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const role of ROLES_SESION) counts.set(role.id, 0)
  for (const j of jugadores) {
    const id = roleOfPlayer(j)
    if (!id) continue
    counts.set(id, (counts.get(id) || 0) + 1)
  }
  return ROLES_SESION.map((role) => ({
    id: role.id,
    label: role.label,
    count: counts.get(role.id) || 0,
  })).filter((row) => row.count > 0)
}

export function slotsAsked(sistema: string): { label: string; count: number }[] {
  const layout = getFormacionLayout(sistema)
  const counts = new Map<string, number>()
  for (const row of layout.rows) {
    for (const slot of row) {
      counts.set(slot.label, (counts.get(slot.label) || 0) + 1)
    }
  }
  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }))
}

export function assignSlot(
  current: CampogramaEstimado,
  slotKey: string,
  jugadorId: string
): CampogramaEstimado {
  const titulares = { ...current.titulares }
  if (!jugadorId) {
    delete titulares[slotKey]
    return { ...current, titulares }
  }
  for (const key of Object.keys(titulares)) {
    if (titulares[key] === jugadorId && key !== slotKey) delete titulares[key]
  }
  titulares[slotKey] = jugadorId
  return { ...current, titulares }
}

export function changeSistema(current: CampogramaEstimado, sistema: string): CampogramaEstimado {
  const valid = new Set(formacionSlotKeys(sistema))
  const titulares: Record<string, string> = {}
  for (const [slot, id] of Object.entries(current.titulares)) {
    if (valid.has(slot) && id) titulares[slot] = id
  }
  return { sistema, titulares }
}

/** Rellena huecos vacíos con quien tiene esa posición como habitual. No pisa lo ya colocado. */
export function suggestEmptySlots(current: CampogramaEstimado, jugadores: SlotPlayer[]): CampogramaEstimado {
  const taken = new Set(Object.values(current.titulares))
  const titulares = { ...current.titulares }
  const layout = getFormacionLayout(current.sistema)
  for (const row of layout.rows) {
    for (const slot of row) {
      if (titulares[slot.slotKey]) continue
      const want = canonicalPosicion(slot.label)
      const pick = jugadores.find((j) => !taken.has(j.id) && playerCodes(j).has(want))
      if (!pick) continue
      titulares[slot.slotKey] = pick.id
      taken.add(pick.id)
    }
  }
  return { ...current, titulares }
}
