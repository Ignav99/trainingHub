'use client'

import type { ReactNode } from 'react'
import {
  Eraser,
  Hand,
  Pause,
  Play,
  Repeat,
  Rewind,
  Square,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DRAWING_COLORS, STROKE_WIDTHS, type DrawingTool } from '@/components/video-analyzer/types'
import { REPEAT_SECONDS } from '@/lib/videoZoom'

/** Barras de dibujo/zoom encima del vídeo: no se las come el pellizco. */
export function SalaFloatingChrome({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="sala-floating-chrome"
      className="pointer-events-none absolute inset-x-0 top-0 z-50"
    >
      <div className="pointer-events-auto bg-zinc-950/95 shadow-[0_10px_28px_rgba(0,0,0,0.55)] backdrop-blur-sm">
        {children}
      </div>
    </div>
  )
}

export const SALA_DRAW_TOOLS: { tool: DrawingTool; label: string }[] = [
  { tool: 'arrow', label: 'Flecha' },
  { tool: 'line', label: 'Línea' },
  { tool: 'circle', label: 'Círculo' },
  { tool: 'rect', label: 'Rectángulo' },
  { tool: 'freehand', label: 'Lápiz' },
  { tool: 'eraser', label: 'Goma' },
]

export function SalaReviewBar({
  zoomMode,
  zoomed,
  onEnterZoom,
  onExitZoom,
  onZoomIn,
  onZoomOut,
  onRestore,
  onFrameBack,
  onFrameFwd,
  onJogBack,
  onRepeat,
  onRewindDown,
  onRewindUp,
}: {
  zoomMode: boolean
  zoomed: boolean
  onEnterZoom: () => void
  onExitZoom: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onRestore: () => void
  onFrameBack: () => void
  onFrameFwd: () => void
  onJogBack: () => void
  onRepeat: () => void
  onRewindDown: () => void
  onRewindUp: () => void
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-zinc-950 border-b border-white/10 text-xs flex-wrap">
      <button
        type="button"
        className="h-10 px-3 rounded-md bg-white/10 active:bg-white/20"
        onClick={onJogBack}
        title="Medio segundo atrás"
      >
        −0,5s
      </button>
      <button
        type="button"
        className="h-10 px-3 rounded-md bg-white/10 active:bg-white/20"
        onClick={onFrameBack}
        title="Fotograma anterior"
      >
        −1 fot.
      </button>
      <button
        type="button"
        className="h-10 px-3 rounded-md bg-white/10 active:bg-white/20 inline-flex items-center gap-1 touch-none"
        onPointerDown={(e) => {
          e.preventDefault()
          try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
          onRewindDown()
        }}
        onPointerUp={onRewindUp}
        onPointerCancel={onRewindUp}
        title="Mantén pulsado para rebobinar"
      >
        <Rewind className="h-3.5 w-3.5" />
        Rebobinar
      </button>
      <button
        type="button"
        className="h-10 px-3 rounded-md bg-orange-500 text-black font-medium inline-flex items-center gap-1"
        onClick={onRepeat}
        title={`Repite los últimos ${REPEAT_SECONDS} segundos`}
      >
        <Repeat className="h-3.5 w-3.5" />
        Repetir {REPEAT_SECONDS}s
      </button>
      <button
        type="button"
        className="h-10 px-3 rounded-md bg-white/10 active:bg-white/20"
        onClick={onFrameFwd}
        title="Fotograma siguiente"
      >
        +1 fot.
      </button>
      <div className="w-px h-6 bg-white/15 mx-0.5" />
      <button
        type="button"
        className={`h-10 px-3 rounded-md inline-flex items-center gap-1 ${zoomMode ? 'bg-orange-500 text-black' : 'bg-white/10'}`}
        onClick={zoomMode ? onExitZoom : onEnterZoom}
        title="Pellizca con dos dedos. No pinta mientras está activo."
      >
        <ZoomIn className="h-3.5 w-3.5" />
        {zoomMode ? 'Acercar ON' : 'Acercar'}
      </button>
      {zoomMode && (
        <span className="text-[10px] text-amber-200 hidden sm:inline">
          Pellizca con dos dedos · un dedo arrastra
        </span>
      )}
      <button
        type="button"
        className="h-10 w-10 rounded-md bg-white/10 inline-flex items-center justify-center"
        onClick={onZoomIn}
        title="Acercar"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="h-10 w-10 rounded-md bg-white/10 inline-flex items-center justify-center"
        onClick={onZoomOut}
        title="Alejar"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="h-10 px-3 rounded-md bg-white/10 inline-flex items-center gap-1 disabled:opacity-40"
        onClick={onRestore}
        disabled={!zoomed}
        title="Tamaño original"
      >
        <Undo2 className="h-3.5 w-3.5" />
        Original
      </button>
    </div>
  )
}

export function WhiteboardBar({
  tool,
  setTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  fillOpacity,
  setFillOpacity,
  selectedForMove,
  onMoveTool,
  canUndo,
  onUndo,
  onClearAll,
  playing,
  onPlay,
}: {
  tool: DrawingTool
  setTool: (t: DrawingTool) => void
  color: string
  setColor: (c: string) => void
  strokeWidth: number
  setStrokeWidth: (w: number) => void
  fillOpacity: number
  setFillOpacity: (n: number) => void
  selectedForMove: boolean
  onMoveTool: () => void
  canUndo: boolean
  onUndo: () => void
  onClearAll: () => void
  playing: boolean
  onPlay: () => void
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900 border-b border-white/10 text-xs flex-wrap">
      <Button variant="ghost" size="sm" className="h-7 text-white hover:bg-white/15" onClick={onPlay}>
        {playing ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
        Play / pausa
      </Button>
      <div className="w-px h-5 bg-white/15" />
      {SALA_DRAW_TOOLS.map(({ tool: t, label }) => (
        <button
          key={t}
          className={`px-2 py-1 rounded ${tool === t ? 'bg-orange-500 text-black' : 'bg-white/10'}`}
          onClick={() => setTool(t)}
        >
          {t === 'rect' ? <Square className="h-3 w-3 inline mr-1" /> : null}
          {t === 'eraser' ? <Eraser className="h-3 w-3 inline mr-1" /> : null}
          {label}
        </button>
      ))}
      <div className="w-px h-5 bg-white/15" />
      {DRAWING_COLORS.map((c) => (
        <button
          key={c}
          className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-white/30'}`}
          style={{ backgroundColor: c }}
          onClick={() => setColor(c)}
          title={c}
        />
      ))}
      <div className="w-px h-5 bg-white/15" />
      {STROKE_WIDTHS.map((w) => (
        <button
          key={w}
          className={`w-6 h-6 rounded ${strokeWidth === w ? 'bg-white/30' : 'hover:bg-white/15'}`}
          onClick={() => setStrokeWidth(w)}
          title={`Grosor ${w}`}
        >
          <span className="mx-auto block rounded-full bg-white" style={{ width: w + 2, height: w + 2 }} />
        </button>
      ))}
      <label className="flex items-center gap-1 text-[10px] text-zinc-400">
        Opacidad
        <input
          type="range"
          min={8}
          max={70}
          value={Math.round(fillOpacity * 100)}
          onChange={(e) => setFillOpacity(Number(e.target.value) / 100)}
          className="w-20"
        />
      </label>
      <button
        type="button"
        className={`px-2 py-1 rounded inline-flex items-center gap-1 ${selectedForMove ? 'bg-orange-500 text-black' : 'bg-white/10'}`}
        onClick={onMoveTool}
        title="Mover la forma seleccionada"
      >
        <Hand className="h-3.5 w-3.5" />
        Mover
      </button>
      <button className="px-2 py-1 rounded bg-white/10" onClick={onUndo} disabled={!canUndo}>Deshacer</button>
      <button className="px-2 py-1 rounded bg-white/10" onClick={onClearAll}>Borrar todo</button>
    </div>
  )
}
