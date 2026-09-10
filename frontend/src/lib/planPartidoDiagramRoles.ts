import type { DiagramData, ElementType } from '@/components/tarea-editor/types'
import type { TareaPizarraData } from '@/components/tactical-board/types'
import type { AsignacionRolTactico } from '@/types'

const TOKEN_TYPES: ElementType[] = ['player', 'player_gk', 'opponent', 'player_joker']

export function deriveAsignacionesFromDiagram(diagram?: DiagramData | TareaPizarraData): AsignacionRolTactico[] {
  return (diagram?.elements ?? [])
    .filter((e) => TOKEN_TYPES.includes(e.type) && e.rol && (e.jugador ?? e.label ?? '').trim())
    .map((e) => ({
      id: e.id,
      jugador: (e.jugador ?? e.label ?? '').trim(),
      rol: e.rol!,
    }))
}

export function diagramHasContent(diagram?: DiagramData | TareaPizarraData): boolean {
  if (!diagram) return false
  if (
    (diagram.elements?.length ?? 0) > 0 ||
    (diagram.arrows?.length ?? 0) > 0 ||
    (diagram.zones?.length ?? 0) > 0
  ) {
    return true
  }
  const frames = (diagram as TareaPizarraData).frames
  if (!Array.isArray(frames)) return false
  return frames.some(
    (frame) =>
      (frame.elements?.length ?? 0) > 0 ||
      (frame.arrows?.length ?? 0) > 0 ||
      (frame.zones?.length ?? 0) > 0
  )
}
