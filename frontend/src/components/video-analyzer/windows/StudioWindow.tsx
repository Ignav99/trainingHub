'use client'
import { useRef, useState } from 'react'
import { VideoPlayer, VIDEO_PLAYER_CHROME_CLASS, type VideoPlayerHandle } from '../VideoPlayer'
import { DrawingOverlay } from '../DrawingOverlay'
import { DrawingToolbar } from '../DrawingToolbar'
import { useDrawingEngine } from '../useDrawingEngine'
import { useUndoRedo } from '../useUndoRedo'
import { useCodeWindowStore } from '../useCodeWindowStore'
import type { DrawingTool } from '../types'

interface StudioWindowProps {
  videoSrc: string
  eventId: string
}

function formatTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function StudioWindow({ videoSrc, eventId }: StudioWindowProps) {
  const { getEventsForVideo, buttons } = useCodeWindowStore()
  const event = getEventsForVideo().find(e => e.id === eventId)
  const button = event ? buttons.find(b => b.id === event.buttonId) : null

  const playerRef = useRef<VideoPlayerHandle | null>(null)
  const [tool, setTool] = useState<DrawingTool>('select')
  const [color, setColor] = useState('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const { elements, setElements: pushElements, undo, redo, canUndo, canRedo } = useUndoRedo()

  const { preview, handleMouseDown, handleMouseMove, handleMouseUp, deleteSelected, clearAll } = useDrawingEngine({
    elements,
    setElements: pushElements,
    color,
    strokeWidth,
    tool,
    selectedId,
    setSelectedId,
  })

  if (!event) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm p-4">
        Evento no encontrado
      </div>
    )
  }

  const clipRange = { start: event.startTime, end: event.endTime }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Info bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-xs shrink-0">
        {button && (
          <span className="font-semibold" style={{ color: button.color }}>
            {button.label}
          </span>
        )}
        <span className="text-zinc-400 font-mono">
          {formatTime(event.startTime)} → {formatTime(event.endTime)}
        </span>
        <span className="text-zinc-600">
          ({(event.endTime - event.startTime).toFixed(1)}s)
        </span>
      </div>

      {/* Drawing toolbar */}
      <DrawingToolbar
        activeTool={tool}
        onToolChange={setTool}
        color={color}
        onColorChange={setColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onDeleteSelected={deleteSelected}
        onClearAll={clearAll}
        selectedId={selectedId}
        elements={elements}
        onUpdateSelectedProps={(patch) => {
          pushElements(elements.map(el => el.id === selectedId ? { ...el, ...patch } : el))
        }}
      />

      {/* Video + drawing */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        <VideoPlayer
          ref={playerRef}
          src={videoSrc}
          clipRange={clipRange}
          onPlayStateChange={setIsPlaying}
        />
        <div className={`absolute left-0 right-0 top-0 ${VIDEO_PLAYER_CHROME_CLASS}`}>
          <DrawingOverlay
            elements={elements}
            preview={preview}
            selectedId={selectedId}
            interactive={!isPlaying}
            tool={tool}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>
      </div>
    </div>
  )
}
