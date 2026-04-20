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
  | 'select' | 'player' | 'opponent' | 'player_gk'
  | 'cone' | 'ball' | 'mini_goal'
  | 'arrow_movement' | 'arrow_pass'
  | 'zone_rect' | 'zone_circle'

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
}

export interface DiagramSnapshot {
  elements: any[]
  arrows: any[]
  zones: any[]
}

export const ZONE_COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#EAB308',
  '#F97316', '#A855F7', '#06B6D4', '#FFFFFF',
]

export const MAX_HISTORY = 30
