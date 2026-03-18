'use client'

import { useCallback, useRef, useState } from 'react'
import type { Clip, ClipDragEdge } from './types'

interface ClipBarProps {
  clip: Clip
  isActive: boolean
  timeToPercent: (t: number) => number
  percentToTime: (pct: number) => number
  containerWidth: number
  duration: number
  onUpdate: (id: string, patch: Partial<Omit<Clip, 'id'>>) => void
  onSelect: (id: string) => void
}

const MIN_CLIP_DURATION = 0.5

export function ClipBar({
  clip,
  isActive,
  timeToPercent,
  percentToTime,
  containerWidth,
  duration,
  onUpdate,
  onSelect,
}: ClipBarProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(clip.title)
  const dragRef = useRef<{
    edge: ClipDragEdge
    startX: number
    startStart: number
    startEnd: number
  } | null>(null)

  const leftPct = timeToPercent(clip.startTime)
  const widthPct = timeToPercent(clip.endTime) - leftPct

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, edge: ClipDragEdge) => {
      e.stopPropagation()
      e.preventDefault()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

      dragRef.current = {
        edge,
        startX: e.clientX,
        startStart: clip.startTime,
        startEnd: clip.endTime,
      }
      onSelect(clip.id)
    },
    [clip, onSelect]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return
      const { edge, startX, startStart, startEnd } = dragRef.current
      const dx = e.clientX - startX
      const dt = (dx / containerWidth) * duration

      if (edge === 'start') {
        const newStart = Math.max(0, Math.min(startEnd - MIN_CLIP_DURATION, startStart + dt))
        onUpdate(clip.id, { startTime: newStart })
      } else if (edge === 'end') {
        const newEnd = Math.min(duration, Math.max(startStart + MIN_CLIP_DURATION, startEnd + dt))
        onUpdate(clip.id, { endTime: newEnd })
      } else {
        // body drag
        const clipDur = startEnd - startStart
        let newStart = startStart + dt
        newStart = Math.max(0, Math.min(duration - clipDur, newStart))
        onUpdate(clip.id, { startTime: newStart, endTime: newStart + clipDur })
      }
    },
    [clip.id, containerWidth, duration, onUpdate]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    dragRef.current = null
  }, [])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditTitle(clip.title)
    setEditing(true)
  }, [clip.title])

  const commitTitle = useCallback(() => {
    setEditing(false)
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== clip.title) {
      onUpdate(clip.id, { title: trimmed })
    }
  }, [editTitle, clip.id, clip.title, onUpdate])

  return (
    <div
      className="absolute top-0 h-full group"
      style={{
        left: `${leftPct}%`,
        width: `${Math.max(widthPct, 0.5)}%`,
      }}
    >
      {/* Main bar */}
      <div
        className={`absolute inset-0 rounded-sm cursor-grab active:cursor-grabbing flex items-center overflow-hidden select-none ${
          isActive ? 'ring-1 ring-white' : ''
        }`}
        style={{
          backgroundColor: `${clip.color}30`,
          borderLeft: `2px solid ${clip.color}`,
          borderRight: `2px solid ${clip.color}`,
        }}
        onPointerDown={(e) => handlePointerDown(e, 'body')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(clip.id)
        }}
      >
        {editing ? (
          <input
            className="w-full h-full bg-transparent text-white text-[10px] px-1 outline-none"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle()
              if (e.key === 'Escape') setEditing(false)
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-[10px] text-white truncate px-1 pointer-events-none">
            {clip.title}
          </span>
        )}
      </div>

      {/* Left handle */}
      <div
        className="absolute left-0 top-0 w-[6px] h-full cursor-ew-resize z-10 hover:bg-white/30"
        onPointerDown={(e) => handlePointerDown(e, 'start')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Right handle */}
      <div
        className="absolute right-0 top-0 w-[6px] h-full cursor-ew-resize z-10 hover:bg-white/30"
        onPointerDown={(e) => handlePointerDown(e, 'end')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  )
}
