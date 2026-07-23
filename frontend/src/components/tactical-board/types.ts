// Re-export shared diagram types from tarea-editor
export type {
  DiagramElement,
  DiagramArrow,
  DiagramZone,
  ElementType,
  ArrowType,
  Position,
} from '@/components/tarea-editor/types'

export {
  TEAM_COLORS,
  ELEMENT_SIZES,
  generateId,
} from '@/components/tarea-editor/types'

// Tactical board specific types

export type BoardTool =
  | 'select' | 'text'
  // Jugadores
  | 'player' | 'opponent' | 'player_gk'
  // Material
  | 'cone' | 'ball' | 'mini_goal'
  | 'marker_disc' | 'pole' | 'mannequin' | 'hurdle' | 'ladder' | 'flag' | 'goal_large' | 'ball_cart'
  // Movimientos
  | 'arrow_movement' | 'arrow_sprint' | 'arrow_pass' | 'arrow_dribble'
  | 'arrow_shot' | 'arrow_cross' | 'arrow_pressure' | 'arrow_block'
  // Zonas
  | 'zone_rect' | 'zone_circle'

/** Tiradores de redimensionado de una zona. */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
  se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
}

export type PitchType = 'full' | 'half'
export type BoardType = 'static' | 'animated'
export type TransitionType = 'linear' | 'ease' | 'ease-in-out'

export interface TeamConfig {
  formation?: string
  color?: string
  label?: string
}

export interface Keyframe {
  id: string
  orden: number
  nombre?: string
  duration_ms: number
  elements: any[]
  arrows: any[]
  zones: any[]
  transition_type: TransitionType
  notes?: string
}

export interface DiagramSnapshot {
  elements: any[]
  arrows: any[]
  zones: any[]
}

/**
 * Pizarra guardada dentro de una tarea (`tareas.grafico_data`).
 * Es una extensión retrocompatible de `DiagramData`: los diagramas antiguos
 * solo traen elements/arrows/zones/pitchType y siguen funcionando.
 */
export interface TareaPizarraData {
  elements: any[]
  arrows: any[]
  zones: any[]
  pitchType?: 'full' | 'half' | 'quarter' | 'custom'
  tipo?: BoardType
  frames?: Keyframe[]
}

export const emptyTareaPizarra: TareaPizarraData = {
  elements: [],
  arrows: [],
  zones: [],
  pitchType: 'full',
  tipo: 'static',
  frames: [],
}

export const ZONE_COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#EAB308',
  '#F97316', '#A855F7', '#06B6D4', '#FFFFFF',
]

export const PLAYER_COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#FFFFFF', '#1F2937',
]

export const MAX_HISTORY = 30
