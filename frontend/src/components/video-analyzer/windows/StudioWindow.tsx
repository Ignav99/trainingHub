'use client'
import { useRef, useState } from 'react'
import { VideoPlayer, type VideoPlayerHandle } from '../VideoPlayer'
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
  const [currentTime, setCurrentTime] = useState(event?.startTime ?? 0)
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
          onTimeUpdate={setCurrentTime}
          onPlayStateChange={setIsPlaying}
        />
        <DrawingOverlay
          elements={elements}
          preview={preview}
          selectedId={selectedId}
          interactive={true}
          tool={tool}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      {/* Mini scrub bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-t border-zinc-800 shrink-0">
        <button
          className="text-white text-xs w-6 h-6 flex items-center justify-center bg-zinc-700 rounded hover:bg-zinc-600"
          onClick={() => isPlaying ? playerRef.current?.pause() : playerRef.current?.play()}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <span className="text-[10px] text-zinc-500 font-mono w-10">
          {formatTime(currentTime)}
        </span>
        <div
          className="flex-1 relative h-3 bg-zinc-800 rounded cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            const time = event.startTime + ratio * (event.endTime - event.startTime)
            playerRef.current?.seekTo(Math.max(event.startTime, Math.min(event.endTime, time)))
          }}
        >
          <div
            className="absolute top-0 left-0 h-full rounded"
            style={{
              width: `${Math.max(0, Math.min(100, ((currentTime - event.startTime) / (event.endTime - event.startTime)) * 100))}%`,
              backgroundColor: button?.color ?? '#3b82f6',
              opacity: 0.6,
            }}
          />
        </div>
        <span className="text-[10px] text-zinc-500 font-mono w-10 text-right">
          {formatTime(event.endTime)}
        </span>
      </div>
    </div>
  )
}
