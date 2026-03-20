'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Clip, FreezeFrame } from './types'
import type { DrawingElement } from '@/types'
import { useFilmstrip } from './useFilmstrip'
import { ClipBar } from './ClipBar'
import { DrawingBar } from './DrawingBar'
import { useVirtualTimeline, virtualToReal, realToVirtual } from './useVirtualTimeline'
import type { TimeSegment } from './useVirtualTimeline'

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
  // Virtual time for playhead in clip mode
  getVirtualTime?: () => number
  // Freeze frame interaction
  onFreezeFrameClick?: (frame: FreezeFrame) => void
  activeFreezeFrameId?: string | null
  // Drawing temporal bars
  drawingElements?: DrawingElement[]
  onDrawingTimeUpdate?: (id: string, startTime: number, endTime: number) => void
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
  getVirtualTime,
  onFreezeFrameClick,
  activeFreezeFrameId,
  drawingElements,
  onDrawingTimeUpdate,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const filmstripCanvasRef = useRef<HTMLCanvasElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const rafRef = useRef<number>(0)
  const dragCreateRef = useRef<{ startX: number; startTime: number } | null>(null)
  const [dragPreview, setDragPreview] = useState<{ left: number; width: number } | null>(null)

  const isClipMode = viewMode === 'clip-editor' && editingClip

  // Virtual timeline for clip editor mode
  const { segments, totalDuration: virtualDuration } = useVirtualTimeline(
    isClipMode ? editingClip : null
  )

  // Range: in clip mode use virtual timeline, in general mode use full duration
  const rangeStart = 0
  const rangeEnd = isClipMode ? virtualDuration : duration
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
    if (!canvas || !containerWidth || !rangeDuration || thumbCount === 0) return

    canvas.width = containerWidth
    canvas.height = 48
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, containerWidth, 48)

    const entries = Array.from(thumbnails.entries()).sort((a, b) => a[0] - b[0])

    if (isClipMode && segments.length > 0) {
      // Virtual timeline filmstrip: draw video segments and freeze bars
      for (const seg of segments) {
        const startX = (seg.virtualStart / rangeDuration) * containerWidth
        const segWidth = ((seg.virtualEnd - seg.virtualStart) / rangeDuration) * containerWidth

        if (seg.type === 'freeze') {
          // Cyan tinted freeze bar
          ctx.fillStyle = '#0e7490'
          ctx.fillRect(startX, 0, segWidth, 48)

          // Draw freeze image if available
          if (seg.freezeFrame?.imageData) {
            const img = new Image()
            img.onload = () => {
              ctx.globalAlpha = 0.4
              ctx.drawImage(img, startX, 0, segWidth, 48)
              ctx.globalAlpha = 1
              // Tint overlay
              ctx.fillStyle = '#0e749060'
              ctx.fillRect(startX, 0, segWidth, 48)
              // Snowflake icon
              ctx.fillStyle = '#22d3ee'
              ctx.font = 'bold 14px sans-serif'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              if (segWidth > 20) {
                ctx.fillText('❄', startX + segWidth / 2, 24)
              }
            }
            img.src = seg.freezeFrame.imageData
          }
        } else {
          // Video segment: draw relevant thumbnails
          const realStart = seg.realStart!
          const realEnd = seg.realEnd!
          const thumbW = containerWidth / thumbCount
          for (const [thumbTime, thumbUrl] of entries) {
            if (thumbTime >= realStart - duration / thumbCount && thumbTime <= realEnd + duration / thumbCount) {
              const relPct = (thumbTime - realStart) / (realEnd - realStart)
              const x = startX + relPct * segWidth
              const img = new Image()
              img.onload = () => {
                ctx.drawImage(img, x, 0, Math.max(thumbW, segWidth / 8), 48)
              }
              img.src = thumbUrl
            }
          }
        }
      }
    } else {
      // General mode filmstrip
      const thumbW = containerWidth / thumbCount
      entries.forEach((entry, i) => {
        const img = new Image()
        img.onload = () => {
          const x = i * thumbW
          ctx.drawImage(img, x, 0, thumbW, 48)
        }
        img.src = entry[1]
      })
    }
  }, [thumbnails, thumbCount, containerWidth, duration, rangeDuration, isClipMode, segments])

  // Playhead animation
  useEffect(() => {
    if (!rangeDuration) return

    const tick = () => {
      const playhead = playheadRef.current
      if (!playhead) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      let pct = 0
      if (isClipMode && getVirtualTime) {
        pct = (getVirtualTime() / rangeDuration) * 100
      } else {
        const video = getVideoElement()
        if (video) {
          pct = ((video.currentTime - rangeStart) / rangeDuration) * 100
        }
      }

      playhead.style.left = `${Math.max(0, Math.min(100, pct))}%`
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [rangeDuration, rangeStart, getVideoElement, isClipMode, getVirtualTime])

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
      const t = xToTime(e.clientX)
      onSeek(t)
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

  // Drawing elements with temporal info
  const temporalDrawings = (drawingElements || []).filter(
    (el) => el.startTime !== undefined && el.endTime !== undefined
  )
  const showDrawingBars = isClipMode && temporalDrawings.length > 0

  return (
    <div ref={containerRef} className="relative w-full select-none bg-[#111]">
      {/* Filmstrip row — 48px */}
      <canvas
        ref={filmstripCanvasRef}
        className="w-full cursor-pointer"
        style={{ height: 48 }}
        onClick={handleFilmstripClick}
      />

      {/* Clips / Segments row — 32px */}
      <div
        className="relative w-full bg-white/5 border-t border-white/10"
        style={{ height: 32 }}
        onPointerDown={handleClipZonePointerDown}
        onPointerMove={handleClipZonePointerMove}
        onPointerUp={handleClipZonePointerUp}
      >
        {isClipMode ? (
          <>
            {/* Virtual timeline segments */}
            {segments.map((seg, i) => {
              const leftPct = (seg.virtualStart / rangeDuration) * 100
              const widthPct = ((seg.virtualEnd - seg.virtualStart) / rangeDuration) * 100

              if (seg.type === 'freeze') {
                const isActive = activeFreezeFrameId === seg.freezeFrame?.id
                return (
                  <div
                    key={`seg-${i}`}
                    className={`absolute top-0 h-full cursor-pointer transition-all ${
                      isActive ? 'ring-1 ring-cyan-400 z-10' : 'hover:brightness-125'
                    }`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(widthPct, 0.5)}%`,
                      backgroundColor: isActive ? '#0e7490' : '#0891b260',
                      borderLeft: '1px solid #22d3ee',
                      borderRight: '1px solid #22d3ee',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (seg.freezeFrame) onFreezeFrameClick?.(seg.freezeFrame)
                    }}
                  >
                    <span className="text-[8px] text-cyan-300 truncate px-0.5 pointer-events-none flex items-center gap-0.5 h-full select-none">
                      ❄ {seg.freezeFrame!.duration}s
                    </span>
                  </div>
                )
              }

              return (
                <div
                  key={`seg-${i}`}
                  className="absolute top-0 h-full"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    // Click on video segment — deselect freeze frame
                    onFreezeFrameClick?.(null as any)
                  }}
                />
              )
            })}

            {/* Empty state hint */}
            {freezeFrames.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] text-white/20">
                  Pulsa Captura para añadir freeze frames
                </span>
              </div>
            )}
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
                  xToTime={xToTime}
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

      {/* Drawing temporal bars row (clip-editor only) */}
      {showDrawingBars && (
        <div
          className="relative w-full bg-white/3 border-t border-white/5"
          style={{ height: 18 }}
        >
          {temporalDrawings.map((el) => (
            <DrawingBar
              key={el.id}
              element={el}
              timeToPercent={timeToPercent}
              xToTime={xToTime}
              totalDuration={rangeDuration}
              onUpdate={(id, st, et) => onDrawingTimeUpdate?.(id, st, et)}
            />
          ))}
        </div>
      )}

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
