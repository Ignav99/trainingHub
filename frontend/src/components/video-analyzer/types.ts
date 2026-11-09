export type DrawingTool = 'select' | 'arrow' | 'line' | 'circle' | 'rect' | 'freehand' | 'text' | 'eraser'

export const DRAWING_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#22c55e', // green
  '#3b82f6', // blue
  '#ffffff', // white
  '#000000', // black
]

export const STROKE_WIDTHS = [2, 4, 6, 10]

// ─── Code Window (Sportscode-style event coding) ───────────────────────────

export type CodeButtonSize = 's' | 'm' | 'l'
export type CodeCaptureMode = 'window' | 'range'

/** Free position inside the botonera canvas, in percent (0–100). */
export interface ButtonLayout {
  x: number
  y: number
  w: number
  h: number
  /** Stacking order. The button you last moved stays in front. */
  z?: number
}

export interface CodeButton {
  id: string
  label: string
  color: string
  shortcut?: string   // single char: '1'..'9', 'a'..'z'
  preRoll: number     // seconds before press included in clip (default 5)
  postRoll: number    // seconds after press included in clip (default 5)
  description?: string
  size?: CodeButtonSize
  /** window = pre/post around the press. range = click in, click out. */
  captureMode?: CodeCaptureMode
  /** Maps the folder to Revisión (ataque_organizado, abp_ofensiva, …). */
  fase?: string
  /** Saved zone. Absent until the coach accepts a layout edit. */
  layout?: ButtonLayout
}

export interface CodeEvent {
  id: string
  buttonId: string
  timestamp: number   // exact moment button was pressed (seconds)
  startTime: number   // timestamp - preRoll
  endTime: number     // timestamp + postRoll
  notes?: string
  /** Override the button name for this clip. */
  title?: string
}
