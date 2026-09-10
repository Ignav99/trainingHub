import { FORMATIONS, type Formation } from './formations'

const SLOT_COLORS: Record<string, string> = {
  POR: '#F59E0B',
  LTD: '#3B82F6',
  CAD: '#3B82F6',
  DFC: '#3B82F6',
  LTI: '#3B82F6',
  CAI: '#3B82F6',
  MID: '#10B981',
  MCD: '#10B981',
  MC: '#10B981',
  MCO: '#10B981',
  MII: '#10B981',
  EXD: '#EF4444',
  SD: '#EF4444',
  MP: '#EF4444',
  DC: '#EF4444',
  EXI: '#EF4444',
}

export interface OncePitchPlayer {
  nombre?: string | null
  dorsal?: number | null
}

export interface OncePitchToken {
  id: string
  label: string
  topPct: number
  leftPct: number
  nombre?: string
  dorsal?: string
  color: string
}

export function toHorizontalPos(top: string, left: string): { topPct: number; leftPct: number } {
  const t = Number.parseFloat(top)
  const l = Number.parseFloat(left)
  return {
    topPct: Number.isFinite(l) ? l : 50,
    leftPct: Number.isFinite(t) ? 100 - t : 50,
  }
}

export function formationForSistema(sistema?: string): Formation {
  const name = (sistema || '').trim()
  return FORMATIONS.find((item) => item.name === name) ?? FORMATIONS[0]
}

export function shortPlayerName(nombre?: string): string {
  const raw = (nombre || '').split(',')[0].trim()
  return raw
}

export function buildOncePitchTokens(
  sistema?: string,
  colocacion?: Record<string, string>,
  jugadores?: OncePitchPlayer[],
): OncePitchToken[] {
  const formation = formationForSistema(sistema)
  const placed = colocacion ?? {}
  const byName = new Map(
    (jugadores ?? [])
      .filter((j) => (j.nombre || '').trim())
      .map((j) => [(j.nombre || '').trim(), j]),
  )
  return formation.slots.map((slot) => {
    const pos = toHorizontalPos(slot.top, slot.left)
    const rawName = (placed[slot.id] || '').trim()
    const jugador = rawName ? byName.get(rawName) : undefined
    const dorsal =
      jugador?.dorsal != null && Number.isFinite(jugador.dorsal) ? String(jugador.dorsal) : undefined
    return {
      id: slot.id,
      label: slot.label,
      topPct: pos.topPct,
      leftPct: pos.leftPct,
      nombre: rawName ? shortPlayerName(rawName) : undefined,
      dorsal,
      color: SLOT_COLORS[slot.position] || '#9CA3AF',
    }
  })
}
