'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Clip, FreezeFrame } from './types'
import { useFilmstrip } from './useFilmstrip'
import { ClipBar } from './ClipBar'

interface TimelineProps {
  videoSrc: string
  duration: number
  getVideoElement: () => HTMLVideoElement | null
  clips: Clip[]
  activeClipId: string | null
  onSeek: (time: number) => void
  onClipUpdate: (id: string, patch: Partial<Omit<Clip, 'id'>>) => void
  onClipSelect: (id: string) => void
  onClipCreate: (start: number, end: number) => void
  onClipDoubleClick?: (id: string) => void
  // Clip editor mode
  viewMode: 'general' | 'clip-editor'
  editingClip?: Clip | null
}

export function Timeline({
  videoSrc,
  duration,
  getVideoElement,
  clips,
  activeClipId,
  onSeek,
  onClipUpdate,
  onClipSelect,
  onClipCreate,
  onClipDoubleClick,
  viewMode,
  editingClip,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const filmstripCanvasRef = useRef<HTMLCanvasElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const rafRef = useRef<number>(0)
  const dragCreateRef = useRef<{ startX: number; startTime: number } | null>(null)
  const [dragPreview, setDragPreview] = useState<{ left: number; width: number } | null>(null)

  const isClipMode = viewMode === 'clip-editor' && editingClip
  const rangeStart = isClipMode ? editingClip.startTime : 0
  const rangeEnd = isClipMode ? editingClip.endTime : duration
  const rangeDuration = rangeEnd - rangeStart

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

    if (isClipMode) {
      // In clip mode, only show the clip range portion of the filmstrip
      const totalDuration = duration
      entries.forEach((entry, i) => {
        const thumbTime = entry[0]
        // Only draw thumbs within the clip range
        if (thumbTime >= rangeStart - totalDuration / thumbCount && thumbTime <= rangeEnd + totalDuration / thumbCount) {
          const img = new Image()
          img.onload = () => {
            // Map thumb position relative to clip range
            const relPct = (thumbTime - rangeStart) / rangeDuration
            const x = relPct * containerWidth
            ctx.drawImage(img, x - thumbW / 2, 0, thumbW, 60)
          }
          img.src = entry[1]
        }
      })
    } else {
      entries.forEach((entry, i) => {
        const img = new Image()
        img.onload = () => {
          const x = i * thumbW
          ctx.drawImage(img, x, 0, thumbW, 60)
        }
        img.src = entry[1]
      })
    }
  }, [thumbnails, thumbCount, containerWidth, duration, isClipMode, rangeStart, rangeEnd, rangeDuration])

  // Playhead animation
  useEffect(() => {
    if (!rangeDuration) return

    const tick = () => {
      const video = getVideoElement()
      const playhead = playheadRef.current
      if (video && playhead) {
        const pct = ((video.currentTime - rangeStart) / rangeDuration) * 100
        playhead.style.left = `${Math.max(0, Math.min(100, pct))}%`
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [rangeDuration, rangeStart, getVideoElement])

  const timeToPercent = useCallback(
    (t: number) => (rangeDuration > 0 ? ((t - rangeStart) / rangeDuration) * 100 : 0),
    [rangeDuration, rangeStart]
  )

  const percentToTime = useCallback(
    (pct: number) => (pct / 100) * rangeDuration + rangeStart,
    [rangeDuration, rangeStart]
  )

  const xToTime = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || !rangeDuration) return rangeStart
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return pct * rangeDuration + rangeStart
    },
    [rangeDuration, rangeStart]
  )

  // Click filmstrip to seek
  const handleFilmstripClick = useCallback(
    (e: React.MouseEvent) => {
      onSeek(xToTime(e.clientX))
    },
    [xToTime, onSeek]
  )

  // Drag in clips zone to create clip (only in general mode)
  const handleClipZonePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isClipMode) return
      if ((e.target as HTMLElement).closest('[data-clip-bar]')) return
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      const time = xToTime(e.clientX)
      dragCreateRef.current = { startX: e.clientX, startTime: time }
    },
    [xToTime, isClipMode]
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

  // In clip mode, show freeze frame markers instead of clips
  const freezeFrames: FreezeFrame[] = isClipMode ? editingClip.freezeFrames : []

  return (
    <div ref={containerRef} className="relative w-full select-none bg-[#111]">
      {/* Filmstrip row — 60px */}
      <canvas
        ref={filmstripCanvasRef}
        className="w-full cursor-pointer"
        style={{ height: 60 }}
        onClick={handleFilmstripClick}
      />

      {/* Clips row — 36px (general) or freeze frame markers (clip-editor) */}
      <div
        className="relative w-full bg-white/5 border-t border-white/10"
        style={{ height: 36 }}
        onPointerDown={handleClipZonePointerDown}
        onPointerMove={handleClipZonePointerMove}
        onPointerUp={handleClipZonePointerUp}
      >
        {isClipMode ? (
          <>
            {/* Freeze frame markers */}
            {freezeFrames.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] text-white/20">Freeze frames del clip</span>
              </div>
            )}
            {freezeFrames.map((ff) => {
              const pct = timeToPercent(ff.timestamp)
              return (
                <div
                  key={ff.id}
                  className="absolute top-1 bottom-1 w-1 bg-cyan-400/70 rounded-full hover:bg-cyan-400 cursor-pointer z-10"
                  style={{ left: `${Math.max(0.5, Math.min(99.5, pct))}%`, transform: 'translateX(-50%)' }}
                  title={`Freeze @ ${Math.floor(ff.timestamp - rangeStart)}s (${ff.duration}s)`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSeek(ff.timestamp)
                  }}
                />
              )
            })}
          </>
        ) : (
          <>
            {/* Empty state hint */}
            {clips.length === 0 && !dragPreview && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] text-white/20">Arrastra aqui para crear clips</span>
              </div>
            )}

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
                  onDoubleClick={onClipDoubleClick}
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
          </>
        )}
      </div>

      {/* Playhead — spans all rows */}
      <div
        ref={playheadRef}
        className="absolute top-0 bottom-0 w-px bg-white pointer-events-none z-20"
      >
        <div className="absolute -top-0.5 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-white" />
      </div>
    </div>
  )
}
