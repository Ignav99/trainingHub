'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { VideoAnotacion } from '@/types'
import type { Clip } from './types'
import { useFilmstrip } from './useFilmstrip'
import { ClipBar } from './ClipBar'

interface TimelineProps {
  videoSrc: string
  duration: number
  currentTime: number
  isPlaying: boolean
  clips: Clip[]
  activeClipId: string | null
  anotaciones: VideoAnotacion[]
  activeAnotacionId: string | null
  onSeek: (time: number) => void
  onClipUpdate: (id: string, patch: Partial<Omit<Clip, 'id'>>) => void
  onClipSelect: (id: string) => void
  onClipCreate: (start: number, end: number) => void
  onAnotacionSelect: (a: VideoAnotacion) => void
}

export function Timeline({
  videoSrc,
  duration,
  currentTime,
  isPlaying,
  clips,
  activeClipId,
  anotaciones,
  activeAnotacionId,
  onSeek,
  onClipUpdate,
  onClipSelect,
  onClipCreate,
  onAnotacionSelect,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const filmstripCanvasRef = useRef<HTMLCanvasElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const rafRef = useRef<number>(0)
  const dragCreateRef = useRef<{ startX: number; startTime: number } | null>(null)
  const [dragPreview, setDragPreview] = useState<{ left: number; width: number } | null>(null)

  // Measure container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Filmstrip
  const { thumbnails, thumbCount } = useFilmstrip({
    videoSrc,
    duration,
    timelineWidth: containerWidth,
  })

  // Draw filmstrip on canvas
  useEffect(() => {
    const canvas = filmstripCanvasRef.current
    if (!canvas || !containerWidth || !duration || thumbCount === 0) return

    canvas.width = containerWidth
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, containerWidth, 60)

    const thumbW = containerWidth / thumbCount
    const entries = Array.from(thumbnails.entries()).sort((a, b) => a[0] - b[0])

    entries.forEach((entry, i) => {
      const img = new Image()
      img.onload = () => {
        const x = i * thumbW
        ctx.drawImage(img, x, 0, thumbW, 60)
      }
      img.src = entry[1]
    })
  }, [thumbnails, thumbCount, containerWidth, duration])

  // Playhead animation
  useEffect(() => {
    const playhead = playheadRef.current
    const container = containerRef.current
    if (!playhead || !container || !duration) return

    const updatePlayhead = () => {
      const pct = (currentTime / duration) * 100
      playhead.style.left = `${pct}%`
      if (isPlaying) {
        rafRef.current = requestAnimationFrame(updatePlayhead)
      }
    }

    updatePlayhead()
    return () => cancelAnimationFrame(rafRef.current)
  }, [currentTime, duration, isPlaying])

  const timeToPercent = useCallback(
    (t: number) => (duration > 0 ? (t / duration) * 100 : 0),
    [duration]
  )

  const percentToTime = useCallback(
    (pct: number) => (pct / 100) * duration,
    [duration]
  )

  const xToTime = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || !duration) return 0
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return pct * duration
    },
    [duration]
  )

  // Click filmstrip to seek
  const handleFilmstripClick = useCallback(
    (e: React.MouseEvent) => {
      onSeek(xToTime(e.clientX))
    },
    [xToTime, onSeek]
  )

  // Drag in clips zone to create clip
  const handleClipZonePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only on empty area (not on a clip bar)
      if ((e.target as HTMLElement).closest('[data-clip-bar]')) return
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      const time = xToTime(e.clientX)
      dragCreateRef.current = { startX: e.clientX, startTime: time }
    },
    [xToTime]
  )

  const handleClipZonePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragCreateRef.current) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const startPx = dragCreateRef.current.startX - rect.left
      const currentPx = e.clientX - rect.left
      const left = Math.max(0, Math.min(startPx, currentPx))
      const right = Math.min(rect.width, Math.max(startPx, currentPx))

      if (right - left > 5) {
        setDragPreview({ left, width: right - left })
      }
    },
    []
  )

  const handleClipZonePointerUp = useCallback(
    (e: React.PointerEvent) => {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      setDragPreview(null)

      if (!dragCreateRef.current || !duration) {
        dragCreateRef.current = null
        return
      }

      const endTime = xToTime(e.clientX)
      const startTime = dragCreateRef.current.startTime
      const s = Math.min(startTime, endTime)
      const end = Math.max(startTime, endTime)

      dragCreateRef.current = null

      if (end - s >= 0.5) {
        onClipCreate(s, end)
      }
    },
    [xToTime, duration, onClipCreate]
  )

  if (!duration) return null

  return (
    <div ref={containerRef} className="relative w-full select-none bg-[#111]">
      {/* Filmstrip row — 60px */}
      <canvas
        ref={filmstripCanvasRef}
        className="w-full cursor-pointer"
        style={{ height: 60 }}
        onClick={handleFilmstripClick}
      />

      {/* Clips row — 30px */}
      <div
        className="relative w-full bg-white/5 border-t border-white/10"
        style={{ height: 30 }}
        onPointerDown={handleClipZonePointerDown}
        onPointerMove={handleClipZonePointerMove}
        onPointerUp={handleClipZonePointerUp}
      >
        {clips.map((clip) => (
          <div key={clip.id} data-clip-bar>
            <ClipBar
              clip={clip}
              isActive={activeClipId === clip.id}
              timeToPercent={timeToPercent}
              percentToTime={percentToTime}
              containerWidth={containerWidth}
              duration={duration}
              onUpdate={onClipUpdate}
              onSelect={onClipSelect}
            />
          </div>
        ))}

        {/* Drag create preview */}
        {dragPreview && (
          <div
            className="absolute top-0 h-full bg-white/15 border border-white/30 rounded-sm pointer-events-none"
            style={{
              left: dragPreview.left,
              width: dragPreview.width,
            }}
          />
        )}
      </div>

      {/* Markers row — 12px */}
      <div
        className="relative w-full bg-white/5 border-t border-white/10"
        style={{ height: 12 }}
      >
        {anotaciones.map((a) => {
          const pct = timeToPercent(a.timestamp_seconds)
          const isActive = activeAnotacionId === a.id
          return (
            <button
              key={a.id}
              className={`absolute top-1 -translate-x-1/2 w-2 h-2 rounded-full transition-transform hover:scale-150 ${
                isActive
                  ? 'bg-blue-400 scale-125'
                  : 'bg-amber-400'
              }`}
              style={{ left: `${Math.max(0.5, Math.min(99.5, pct))}%` }}
              onClick={() => onAnotacionSelect(a)}
              title={a.titulo}
            />
          )
        })}
      </div>

      {/* Playhead — spans all rows */}
      <div
        ref={playheadRef}
        className="absolute top-0 bottom-0 w-px bg-white pointer-events-none z-20"
        style={{ left: `${timeToPercent(currentTime)}%` }}
      >
        {/* Playhead top triangle */}
        <div className="absolute -top-0.5 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-white" />
      </div>
    </div>
  )
}
