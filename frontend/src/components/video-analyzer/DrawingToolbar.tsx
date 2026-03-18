'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  MousePointer2,
  MoveUpRight,
  Minus,
  Circle,
  Square,
  Pencil,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Eraser,
} from 'lucide-react'
import type { DrawingTool } from './types'
import type { DrawingElement } from '@/types'
import { DRAWING_COLORS, STROKE_WIDTHS } from './types'

const TOOLS: { tool: DrawingTool; icon: React.ElementType; label: string }[] = [
  { tool: 'select', icon: MousePointer2, label: 'Seleccionar (V)' },
  { tool: 'arrow', icon: MoveUpRight, label: 'Flecha' },
  { tool: 'line', icon: Minus, label: 'Línea' },
  { tool: 'circle', icon: Circle, label: 'Círculo' },
  { tool: 'rect', icon: Square, label: 'Rectángulo' },
  { tool: 'freehand', icon: Pencil, label: 'Dibujo libre' },
  { tool: 'text', icon: Type, label: 'Texto' },
]

const TOOL_LABELS: Record<string, string> = {
  arrow: 'Flecha',
  line: 'Línea',
  circle: 'Círculo',
  rect: 'Rectángulo',
  freehand: 'Trazo',
  text: 'Texto',
}

interface DrawingToolbarProps {
  activeTool: DrawingTool
  onToolChange: (tool: DrawingTool) => void
  color: string
  onColorChange: (color: string) => void
  strokeWidth: number
  onStrokeWidthChange: (w: number) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onDeleteSelected: () => void
  onClearAll: () => void
  selectedId: string | null
  elements: DrawingElement[]
  onUpdateSelectedProps: (patch: Partial<Pick<DrawingElement, 'color' | 'strokeWidth'>>) => void
}

export function DrawingToolbar({
  activeTool,
  onToolChange,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDeleteSelected,
  onClearAll,
  selectedId,
  elements,
  onUpdateSelectedProps,
}: DrawingToolbarProps) {
  const selectedElement = useMemo(
    () => (selectedId ? elements.find((el) => el.id === selectedId) : null),
    [selectedId, elements]
  )

  const activeColor = selectedElement ? selectedElement.color : color
  const activeStrokeWidth = selectedElement ? selectedElement.strokeWidth : strokeWidth

  const handleColorClick = (c: string) => {
    if (selectedElement) {
      onUpdateSelectedProps({ color: c })
    } else {
      onColorChange(c)
    }
  }

  const handleStrokeClick = (w: number) => {
    if (selectedElement) {
      onUpdateSelectedProps({ strokeWidth: w })
    } else {
      onStrokeWidthChange(w)
    }
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-black/80 text-white text-xs flex-wrap">
      {/* Tools */}
      <div className="flex items-center gap-0.5">
        {TOOLS.map(({ tool, icon: Icon, label }) => (
          <Button
            key={tool}
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${
              activeTool === tool
                ? 'bg-white/30 text-white'
                : 'text-white/70 hover:text-white hover:bg-white/20'
            }`}
            onClick={() => onToolChange(tool)}
            title={label}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>

      <div className="w-px h-5 bg-white/20" />

      {/* Colors */}
      <div className="flex items-center gap-1">
        {DRAWING_COLORS.map((c) => (
          <button
            key={c}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${
              activeColor === c ? 'border-white scale-110' : 'border-white/30'
            }`}
            style={{ backgroundColor: c }}
            onClick={() => handleColorClick(c)}
          />
        ))}
      </div>

      <div className="w-px h-5 bg-white/20" />

      {/* Stroke width */}
      <div className="flex items-center gap-1">
        {STROKE_WIDTHS.map((w) => (
          <button
            key={w}
            className={`flex items-center justify-center w-6 h-6 rounded ${
              activeStrokeWidth === w ? 'bg-white/30' : 'hover:bg-white/20'
            }`}
            onClick={() => handleStrokeClick(w)}
            title={`Grosor ${w}`}
          >
            <div
              className="rounded-full bg-white"
              style={{ width: w + 2, height: w + 2 }}
            />
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-white/20" />

      {/* Undo / Redo / Delete / Clear */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
          onClick={onUndo}
          disabled={!canUndo}
          title="Deshacer (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
          onClick={onRedo}
          disabled={!canRedo}
          title="Rehacer (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
          onClick={onDeleteSelected}
          disabled={!selectedId}
          title="Eliminar selección (Delete)"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
          onClick={onClearAll}
          title="Borrar todo"
        >
          <Eraser className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Selection info */}
      {selectedElement && (
        <>
          <div className="w-px h-5 bg-white/20" />
          <span className="text-[10px] text-blue-300">
            Editando: {TOOL_LABELS[selectedElement.type] || selectedElement.type}
          </span>
        </>
      )}
    </div>
  )
}
