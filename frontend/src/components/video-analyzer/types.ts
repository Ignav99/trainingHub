import type { DrawingElement } from '@/types'

export type DrawingTool = 'select' | 'arrow' | 'line' | 'circle' | 'rect' | 'freehand' | 'text'

export type ViewMode = 'general' | 'clip-editor'

export interface FreezeFrame {
  id: string
  timestamp: number       // second within the clip where the freeze is inserted
  duration: number        // how long the freeze lasts in seconds (default 3)
  imageData: string       // data URL of the captured frame
  drawings: DrawingElement[]  // drawings on top of the frame
}

export interface Clip {
  id: string
  title: string
  startTime: number
  endTime: number
  color: string
  freezeFrames: FreezeFrame[]
}

export type ClipDragEdge = 'start' | 'end' | 'body'

export interface ClipDragState {
  clipId: string
  edge: ClipDragEdge
  initialMouseX: number
  initialStartTime: number
  initialEndTime: number
}

export const CLIP_COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]

export const DRAWING_COLORS = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#22c55e', // green
  '#3b82f6', // blue
  '#ffffff', // white
  '#000000', // black
]

export const STROKE_WIDTHS = [2, 4, 6]
