// Tipos para el editor de graficos de tareas

export type ElementType = 'player' | 'player_gk' | 'opponent' | 'cone' | 'ball' | 'mini_goal' | 'zone'

export type ArrowType = 'movement' | 'pass' | 'dribble' | 'shot'

export interface Position {
  x: number
  y: number
}

export interface DiagramElement {
  id: string
  type: ElementType
  position: Position
  label?: string // Numero o texto del jugador
  color?: string // Color personalizado
  size?: number // Tamano (para zonas)
  rotation?: number // Rotacion en grados
}

export interface DiagramArrow {
  id: string
  type: ArrowType
  from: Position
  to: Position
  curved?: boolean // Flecha curva
  color?: string
}

export interface DiagramZone {
  id: string
  position: Position
  width: number
  height: number
  color: string
  opacity?: number
  label?: string
}

export interface DiagramData {
  elements: DiagramElement[]
  arrows: DiagramArrow[]
  zones: DiagramZone[]
  pitchType: 'full' | 'half' | 'quarter' | 'custom'
  customDimensions?: { width: number; height: number }
}

// Colores predefinidos para equipos
export const TEAM_COLORS = {
  team1: '#3B82F6', // Azul
  team2: '#EF4444', // Rojo
  neutral: '#F59E0B', // Amarillo/Naranja
  goalkeeper: '#22C55E', // Verde
}

// Tamanos de elementos
export const ELEMENT_SIZES = {
  player: 24,
  cone: 16,
  ball: 14,
  mini_goal: 40,
}

// Crear ID unico
export const generateId = () => Math.random().toString(36).substr(2, 9)

// Datos vacios por defecto
export const emptyDiagramData: DiagramData = {
  elements: [],
  arrows: [],
  zones: [],
  pitchType: 'half',
}
