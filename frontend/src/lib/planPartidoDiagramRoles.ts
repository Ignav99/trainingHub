import type { DiagramData, ElementType } from '@/components/tarea-editor/types'
import type { AsignacionRolTactico } from '@/types'

const TOKEN_TYPES: ElementType[] = ['player', 'player_gk', 'opponent']

export function deriveAsignacionesFromDiagram(diagram?: DiagramData): AsignacionRolTactico[] {
  return (diagram?.elements ?? [])
    .filter((e) => TOKEN_TYPES.includes(e.type) && e.rol && (e.jugador ?? e.label ?? '').trim())
    .map((e) => ({
      id: e.id,
      jugador: (e.jugador ?? e.label ?? '').trim(),
      rol: e.rol!,
    }))
}

export function diagramHasContent(diagram?: DiagramData): boolean {
  if (!diagram) return false
  return (
    (diagram.elements?.length ?? 0) > 0 ||
    (diagram.arrows?.length ?? 0) > 0 ||
    (diagram.zones?.length ?? 0) > 0
  )
}
