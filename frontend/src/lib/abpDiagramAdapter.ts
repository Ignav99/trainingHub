import type { ABPAsignacion, ABPJugada, TipoABP } from '@/types'
import type { DiagramElement } from '@/components/tarea-editor/types'
import { isPlayerToken, generateId } from '@/components/tarea-editor/types'
import type { Keyframe, TareaPizarraData } from '@/components/tactical-board/types'

function getPos(el: any): { x: number; y: number } {
  if (el?.position && typeof el.position.x === 'number') return el.position
  if (typeof el?.x === 'number' && typeof el?.y === 'number') return { x: el.x, y: el.y }
  return { x: 0, y: 0 }
}

function asignacionByElement(asignaciones?: ABPAsignacion[] | null): Map<string, ABPAsignacion> {
  const map = new Map<string, ABPAsignacion>()
  for (const a of asignaciones || []) {
    if (a.element_id) map.set(a.element_id, a)
  }
  return map
}

function applyRoles(elements: any[] | undefined, asignaciones?: ABPAsignacion[] | null): DiagramElement[] {
  const byEl = asignacionByElement(asignaciones)
  return (elements || []).map((el) => {
    const asig = byEl.get(el.id)
    const jugadorId =
      el.jugadorId
      || asig?.jugador_id
      || asig?.jugador_ids?.[0]
      || (Array.isArray(el.jugador_ids) && el.jugador_ids[0])
      || undefined
    return {
      ...el,
      position: getPos(el),
      rol: el.rol || asig?.rol || undefined,
      jugadorId: jugadorId || undefined,
    }
  })
}

export function pitchViewForTipo(tipo?: TipoABP): 'full' | 'half' {
  return tipo === 'falta_lejana' ? 'full' : 'half'
}

function normalizeFrames(
  raw: any[] | undefined,
  asignaciones?: ABPAsignacion[] | null,
): Keyframe[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw.map((f, i) => ({
    id: f.id || generateId(),
    orden: f.orden ?? i,
    nombre: f.nombre || `Fase ${i + 1}`,
    duration_ms: f.duration_ms || 2000,
    elements: applyRoles(f.elements, asignaciones),
    arrows: Array.isArray(f.arrows) ? f.arrows : [],
    zones: Array.isArray(f.zones) ? f.zones : [],
    transition_type: f.transition_type || 'linear',
    notes: f.notes,
  }))
}

/**
 * Convierte una jugada ABP (fases JSONB) al formato de la pizarra táctica,
 * incluyendo frames de animación y roles de jugador.
 */
export function jugadaToBoardData(
  jugada?: Partial<ABPJugada> | null,
): TareaPizarraData {
  const diagram = jugada?.fases?.[0]?.diagram
  const elements = applyRoles(diagram?.elements, jugada?.asignaciones)
  const arrows = Array.isArray(diagram?.arrows) ? diagram!.arrows : []
  const zones = Array.isArray(diagram?.zones) ? diagram!.zones : []
  const frames = normalizeFrames(diagram?.frames, jugada?.asignaciones)
  const pitchType = (diagram?.pitchType === 'full' || diagram?.pitchType === 'half')
    ? diagram.pitchType
    : pitchViewForTipo(jugada?.tipo)
  const tipo = diagram?.tipo === 'static' && frames.length < 2 ? 'static' : (diagram?.tipo || (frames.length >= 2 ? 'animated' : 'animated'))

  return {
    elements,
    arrows,
    zones,
    pitchType,
    tipo,
    ...(frames.length > 0 ? { frames } : {}),
    ...(diagram?.preview ? { preview: diagram.preview } : {}),
  }
}

export function asignacionesFromElements(elements: DiagramElement[]): ABPAsignacion[] {
  return elements
    .filter((el) => isPlayerToken(el.type) && (el.rol || el.jugadorId || el.jugador))
    .map((el) => ({
      element_id: el.id,
      rol: el.rol,
      jugador_id: el.jugadorId,
      jugador_ids: el.jugadorId ? [el.jugadorId] : undefined,
    }))
}
