import { getFormacionLayout, SISTEMAS_11 } from './formaciones11'
import { canonicalPosicion } from './posiciones'
import { isPortero, type SlotPlayer } from './slotPlayerGroups'

export const CAMPOGRAMA_ESTIMADO_KEY = '_campograma_estimado'

/** Varios jugadores por código de posición (DFC, EXI, POR…). El orden del array es el orden de la sesión. */
export interface CampogramaEstimado {
  sistema: string
  porPosicion: Record<string, string[]>
}

export const EMPTY_CAMPOGRAMA: CampogramaEstimado = {
  sistema: '4-3-3',
  porPosicion: {},
}

export function pitchRows(sistema: string): { label: string }[][] {
  const layout = getFormacionLayout(sistema)
  return layout.rows.map((row) => {
    const seen = new Set<string>()
    const stations: { label: string }[] = []
    for (const slot of row) {
      const label = canonicalPosicion(slot.label) || slot.label
      if (seen.has(label)) continue
      seen.add(label)
      stations.push({ label })
    }
    return stations
  })
}

export function labelsOnPitch(sistema: string): string[] {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const row of pitchRows(sistema)) {
    for (const station of row) {
      if (seen.has(station.label)) continue
      seen.add(station.label)
      labels.push(station.label)
    }
  }
  return labels
}

function asIdList(value: unknown): string[] {
  if (typeof value === 'string' && value) return [value]
  if (!Array.isArray(value)) return []
  const ids: string[] = []
  for (const item of value) {
    if (typeof item === 'string' && item && !ids.includes(item)) ids.push(item)
  }
  return ids
}

export function parseCampograma(raw: string | undefined | null): CampogramaEstimado {
  if (!raw) return { sistema: '4-3-3', porPosicion: {} }
  try {
    const parsed = JSON.parse(raw) as {
      sistema?: unknown
      porPosicion?: unknown
      titulares?: unknown
    }
    const sistema = typeof parsed.sistema === 'string' && SISTEMAS_11.includes(parsed.sistema)
      ? parsed.sistema
      : '4-3-3'
    const porPosicion: Record<string, string[]> = {}
    if (parsed.porPosicion && typeof parsed.porPosicion === 'object') {
      for (const [label, ids] of Object.entries(parsed.porPosicion as Record<string, unknown>)) {
        const list = asIdList(ids)
        if (list.length) porPosicion[canonicalPosicion(label) || label] = list
      }
    } else if (parsed.titulares && typeof parsed.titulares === 'object') {
      const layout = getFormacionLayout(sistema)
      const slotLabel = new Map<string, string>()
      for (const row of layout.rows) {
        for (const slot of row) slotLabel.set(slot.slotKey, canonicalPosicion(slot.label) || slot.label)
      }
      for (const [slot, id] of Object.entries(parsed.titulares as Record<string, unknown>)) {
        const playerId = typeof id === 'string' ? id : ''
        const label = slotLabel.get(slot)
        if (!playerId || !label) continue
        const list = porPosicion[label] || []
        if (!list.includes(playerId)) list.push(playerId)
        porPosicion[label] = list
      }
    }
    return { sistema, porPosicion }
  } catch {
    return { sistema: '4-3-3', porPosicion: {} }
  }
}

export function serializeCampograma(value: CampogramaEstimado): string {
  return JSON.stringify({ sistema: value.sistema, porPosicion: value.porPosicion })
}

export function placedIds(value: CampogramaEstimado): string[] {
  const ids: string[] = []
  for (const list of Object.values(value.porPosicion)) {
    for (const id of list) {
      if (id && !ids.includes(id)) ids.push(id)
    }
  }
  return ids
}

function withoutPlayer(porPosicion: Record<string, string[]>, jugadorId: string): Record<string, string[]> {
  const next: Record<string, string[]> = {}
  for (const [label, list] of Object.entries(porPosicion)) {
    const kept = list.filter((id) => id !== jugadorId)
    if (kept.length) next[label] = kept
  }
  return next
}

export function addToPosicion(
  current: CampogramaEstimado,
  label: string,
  jugadorId: string
): CampogramaEstimado {
  const code = canonicalPosicion(label) || label
  if (!jugadorId) return current
  const porPosicion = withoutPlayer(current.porPosicion, jugadorId)
  const list = porPosicion[code] ? [...porPosicion[code]] : []
  list.push(jugadorId)
  porPosicion[code] = list
  return { ...current, porPosicion }
}

export function removeFromPosicion(
  current: CampogramaEstimado,
  label: string,
  jugadorId: string
): CampogramaEstimado {
  const code = canonicalPosicion(label) || label
  const list = (current.porPosicion[code] || []).filter((id) => id !== jugadorId)
  const porPosicion = { ...current.porPosicion }
  if (list.length) porPosicion[code] = list
  else delete porPosicion[code]
  return { ...current, porPosicion }
}

export function moveInPosicion(
  current: CampogramaEstimado,
  label: string,
  jugadorId: string,
  direction: -1 | 1
): CampogramaEstimado {
  const code = canonicalPosicion(label) || label
  const list = [...(current.porPosicion[code] || [])]
  const index = list.indexOf(jugadorId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= list.length) return current
  const swap = list[target]
  list[target] = list[index]
  list[index] = swap
  return { ...current, porPosicion: { ...current.porPosicion, [code]: list } }
}

export function changeSistema(current: CampogramaEstimado, sistema: string): CampogramaEstimado {
  const valid = new Set(labelsOnPitch(sistema))
  const porPosicion: Record<string, string[]> = {}
  for (const [label, ids] of Object.entries(current.porPosicion)) {
    if (valid.has(label) && ids.length) porPosicion[label] = ids
  }
  return { sistema, porPosicion }
}

function playerCodes(j: SlotPlayer): string[] {
  const codes: string[] = []
  const principal = isPortero(j) ? 'POR' : canonicalPosicion(j.posicion_principal)
  if (principal) codes.push(principal)
  for (const raw of j.posiciones_secundarias || []) {
    const code = canonicalPosicion(raw)
    if (code && !codes.includes(code)) codes.push(code)
  }
  if (isPortero(j) && !codes.includes('POR')) codes.unshift('POR')
  return codes
}

/** Mete en cada posición a todos los que la tienen como habitual. No pisa el orden de quien ya está. */
export function placeAllByPosition(current: CampogramaEstimado, jugadores: SlotPlayer[]): CampogramaEstimado {
  const valid = new Set(labelsOnPitch(current.sistema))
  let next = current
  const taken = new Set(placedIds(current))
  for (const jugador of jugadores) {
    if (taken.has(jugador.id)) continue
    const label = playerCodes(jugador).find((code) => valid.has(code))
    if (!label) continue
    next = addToPosicion(next, label, jugador.id)
    taken.add(jugador.id)
  }
  return next
}
