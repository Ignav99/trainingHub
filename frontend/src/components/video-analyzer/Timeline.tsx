'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Clip, FreezeFrame, CodeButton, CodeEvent } from './types'
import type { DrawingElement } from '@/types'
import { useFilmstrip } from './useFilmstrip'
import { ClipBar } from './ClipBar'
import { DrawingBar } from './DrawingBar'
import { TagLanes } from '../video/TagLanes'
import { useTaggingStore } from '@/stores/useTaggingStore'
import { useVirtualTimeline, virtualToReal, realToVirtual } from './useVirtualTimeline'
import type { TimeSegment } from './useVirtualTimeline'
import { formatTime } from './utils'

const LABEL_WIDTH = 68  // left label column width (px)

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
  // Code Window events (Sportscode-style)
  codeButtons?: CodeButton[]
  codeEvents?: CodeEvent[]
  onCodeLaneClick?: (buttonId: string) => void
  onCodeEventDoubleClick?: (eventId: string) => void
  // Scrub lifecycle — lets parent skip React setState during scrub
  onScrubStart?: () => void
  onScrubEnd?: () => void
  // Organizer integration
  onAddClipToOrganizer?: (clipId: string) => void
  onAddCodeEventToOrganizer?: (eventId: string) => void
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
  codeButtons = [],
  codeEvents = [],
  onCodeLaneClick,
  onCodeEventDoubleClick,
  onScrubStart,
  onScrubEnd,
  onAddClipToOrganizer,
  onAddCodeEventToOrganizer,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const filmstripCanvasRef = useRef<HTMLCanvasElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const rafRef = useRef<number>(0)
  const dragCreateRef = useRef<{ startX: number; startTime: number } | null>(null)
  const [dragPreview, setDragPreview] = useState<{ left: number; width: number } | null>(null)
  // Scrub drag state (filmstrip + ruler)
  const scrubActiveRef = useRef(false)
  const pendingSeekTimeRef = useRef<number | null>(null)
  const scrubRafRef = useRef<number>(0)
  const scrubCachedRectRef = useRef<DOMRect | null>(null)

  // Content width = visual width × zoom
  const contentWidth = Math.max(containerWidth - LABEL_WIDTH, 0) * zoomLevel

  const zoomIn = useCallback(() => setZoomLevel((z) => Math.min(8, parseFloat((z * 1.5).toFixed(2)))), [])
  const zoomOut = useCallback(() => setZoomLevel((z) => Math.max(1, parseFloat((z / 1.5).toFixed(2)))), [])

  const tags = useTaggingStore((s) => s.tags)
  const setSelectedTagId = useTaggingStore((s) => s.setSelectedTagId)

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
    if (!canvas || !contentWidth || !rangeDuration || thumbCount === 0) return

    canvas.width = contentWidth
    canvas.height = 68
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, contentWidth, 68)

    const entries = Array.from(thumbnails.entries()).sort((a, b) => a[0] - b[0])

    if (isClipMode && segments.length > 0) {
      for (const seg of segments) {
        const startX = (seg.virtualStart / rangeDuration) * contentWidth
        const segWidth = ((seg.virtualEnd - seg.virtualStart) / rangeDuration) * contentWidth

        if (seg.type === 'freeze') {
          ctx.fillStyle = '#0e7490'
          ctx.fillRect(startX, 0, segWidth, 68)

          if (seg.freezeFrame?.imageData) {
            const img = new Image()
            img.onload = () => {
              ctx.globalAlpha = 0.4
              ctx.drawImage(img, startX, 0, segWidth, 68)
              ctx.globalAlpha = 1
              ctx.fillStyle = '#0e749060'
              ctx.fillRect(startX, 0, segWidth, 68)
              ctx.fillStyle = '#22d3ee'
              ctx.font = 'bold 14px sans-serif'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              if (segWidth > 20) ctx.fillText('❄', startX + segWidth / 2, 34)
            }
            img.src = seg.freezeFrame.imageData
          }
        } else {
          const realStart = seg.realStart!
          const realEnd = seg.realEnd!
          const thumbW = contentWidth / thumbCount
          for (const [thumbTime, thumbUrl] of entries) {
            if (thumbTime >= realStart - duration / thumbCount && thumbTime <= realEnd + duration / thumbCount) {
              const relPct = (thumbTime - realStart) / (realEnd - realStart)
              const x = startX + relPct * segWidth
              const img = new Image()
              img.onload = () => {
                ctx.drawImage(img, x, 0, Math.max(thumbW, segWidth / 8), 68)
              }
              img.src = thumbUrl
            }
          }
        }
      }
    } else {
      const thumbW = contentWidth / thumbCount
      entries.forEach((entry, i) => {
        const img = new Image()
        img.onload = () => {
          const x = i * thumbW
          ctx.drawImage(img, x, 0, thumbW, 68)
        }
        img.src = entry[1]
      })
    }
  }, [thumbnails, thumbCount, contentWidth, duration, rangeDuration, isClipMode, segments])

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

      const clampedPct = Math.max(0, Math.min(100, pct))
      playhead.style.left = `${clampedPct}%`

      // Auto-scroll to keep playhead visible when zoomed
      const scrollEl = scrollContainerRef.current
      if (scrollEl && contentWidth > 0) {
        const playheadPx = (clampedPct / 100) * contentWidth
        const visW = scrollEl.clientWidth
        const sl = scrollEl.scrollLeft
        if (playheadPx < sl + 20 || playheadPx > sl + visW - 20) {
          scrollEl.scrollLeft = Math.max(0, playheadPx - visW / 2)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [rangeDuration, rangeStart, getVideoElement, isClipMode, getVirtualTime, contentWidth])

  const timeToPercent = useCallback(
    (t: number) => (rangeDuration > 0 ? ((t - rangeStart) / rangeDuration) * 100 : 0),
    [rangeDuration, rangeStart]
  )

  const percentToTime = useCallback(
    (pct: number) => (pct / 100) * rangeDuration + rangeStart,
    [rangeDuration, rangeStart]
  )

  // xToTime accounts for the label column offset, zoom, and scroll position
  const xToTime = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || !rangeDuration || !contentWidth) return rangeStart
      const scrollLeft = scrollContainerRef.current?.scrollLeft ?? 0
      const px = clientX - rect.left - LABEL_WIDTH + scrollLeft
      const pct = Math.max(0, Math.min(1, px / contentWidth))
      return pct * rangeDuration + rangeStart
    },
    [rangeDuration, rangeStart, contentWidth]
  )

  // Filmstrip / ruler scrub — RAF-throttled for smooth touch scrubbing
  const handleScrubStart = useCallback(
    (e: React.PointerEvent) => {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      scrubActiveRef.current = true
      onScrubStart?.()
      // Cache rect once at drag start — avoid getBoundingClientRect on every move
      scrubCachedRectRef.current = containerRef.current?.getBoundingClientRect() ?? null
      const t = xToTime(e.clientX)
      onSeek(t)
    },
    [xToTime, onSeek, onScrubStart]
  )

  const handleScrubMove = useCallback(
    (e: React.PointerEvent) => {
      if (!scrubActiveRef.current) return
      if (!rangeDuration) return
      const t = xToTime(e.clientX)
      // Store pending time and let RAF flush it — throttles to ~60fps max
      pendingSeekTimeRef.current = t
      if (!scrubRafRef.current) {
        scrubRafRef.current = requestAnimationFrame(() => {
          scrubRafRef.current = 0
          if (pendingSeekTimeRef.current !== null) {
            onSeek(pendingSeekTimeRef.current)
            pendingSeekTimeRef.current = null
          }
        })
      }
    },
    [rangeDuration, xToTime, onSeek]
  )

  const handleScrubEnd = useCallback(
    (e: React.PointerEvent) => {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      scrubActiveRef.current = false
      scrubCachedRectRef.current = null
      cancelAnimationFrame(scrubRafRef.current)
      scrubRafRef.current = 0
      // Flush final seek position before notifying parent
      if (pendingSeekTimeRef.current !== null) {
        onSeek(pendingSeekTimeRef.current)
        pendingSeekTimeRef.current = null
      }
      onScrubEnd?.()
    },
    [onSeek, onScrubEnd]
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

      const offsetLeft = LABEL_WIDTH
      const startPx = dragCreateRef.current.startX - rect.left - offsetLeft
      const currentPx = e.clientX - rect.left - offsetLeft
      const left = Math.max(0, Math.min(startPx, currentPx))
      const right = Math.min(rect.width - offsetLeft, Math.max(startPx, currentPx))

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

  const freezeFrames: FreezeFrame[] = isClipMode ? editingClip.freezeFrames : []

  const temporalDrawings = (drawingElements || []).filter(
    (el) => el.startTime !== undefined && el.endTime !== undefined
  )
  const showDrawingBars = isClipMode && temporalDrawings.length > 0

  // Code event lanes: only show buttons that have events
  const activeLanes = codeButtons.filter((btn) =>
    codeEvents.some((ev) => ev.buttonId === btn.id)
  )
  const hasCodeLanes = !isClipMode && activeLanes.length > 0

  // Time ruler markers (adaptive step)
  const rulerStep = rangeDuration < 60 ? 10 : rangeDuration < 300 ? 30 : rangeDuration < 600 ? 60 : 120
  const rulerMarkers: number[] = []
  for (let t = 0; t <= rangeDuration; t += rulerStep) {
    rulerMarkers.push(t)
  }

  return (
    <div ref={containerRef} className="relative w-full h-full select-none bg-[#111] flex flex-col touch-none">
      {/* ── Zoom controls bar ─────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1.5 px-2 bg-[#0a0a0a] border-b border-white/10 z-30" style={{ height: 26 }}>
        <span className="text-[9px] text-white/30 uppercase tracking-wider mr-0.5">Zoom</span>
        <button
          className="w-5 h-5 flex items-center justify-center rounded bg-white/10 hover:bg-white/25 text-white/80 hover:text-white text-sm font-bold transition-colors"
          onClick={zoomOut}
          title="Alejar (zoom out)"
        >−</button>
        <span className="text-[10px] text-white/50 tabular-nums w-7 text-center font-mono">{zoomLevel.toFixed(1)}×</span>
        <button
          className="w-5 h-5 flex items-center justify-center rounded bg-white/10 hover:bg-white/25 text-white/80 hover:text-white text-sm font-bold transition-colors"
          onClick={zoomIn}
          title="Acercar (zoom in)"
        >+</button>
      </div>
      {/* ── Main row: label + scroll ───────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
      {/* ── Left label column ───────────────────────────────────────────── */}
      <div
        className="shrink-0 flex flex-col bg-[#0d0d0d] border-r border-white/5 z-10"
        style={{ width: LABEL_WIDTH }}
      >
        {/* Ruler row placeholder */}
        <div style={{ height: 16 }} />
        {/* Filmstrip row placeholder */}
        <div style={{ height: 68 }} />
        {/* Tag lanes placeholder (we don't show labels for those) */}
        {!isClipMode && tags.length > 0 && (
          <div style={{ height: Math.max(20, tags.length * 20) }} />
        )}
        {/* Drawing rows placeholder (one per temporal drawing) */}
        {showDrawingBars && temporalDrawings.map((el) => (
          <div key={el.id} style={{ height: 20 }} className="flex items-center px-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: el.color || '#fff' }}
            />
          </div>
        ))}
        {/* Code event lane labels */}
        {hasCodeLanes && activeLanes.map((btn) => (
          <button
            key={btn.id}
            style={{ height: 40, borderLeft: `3px solid ${btn.color}` }}
            className="flex items-center px-1.5 hover:bg-white/5 transition-colors w-full text-left group"
            onClick={() => onCodeLaneClick?.(btn.id)}
            title={`Ver todos los eventos: ${btn.label}`}
          >
            <span
              className="text-[8px] font-medium truncate leading-none"
              style={{ color: btn.color }}
            >
              {btn.label}
            </span>
            <span className="text-[7px] text-white/25 ml-auto shrink-0 group-hover:text-white/50">
              {codeEvents.filter((ev) => ev.buttonId === btn.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Main timeline content ────────────────────────────────────────── */}
      <div ref={scrollContainerRef} className="flex-1 relative min-w-0 overflow-x-auto">
        <div style={{ width: contentWidth > 0 ? contentWidth : undefined, minWidth: '100%', position: 'relative' }}>
        {/* Time ruler */}
        <div
          className="relative bg-[#0d0d0d] border-b border-white/5 overflow-hidden"
          style={{ height: 16, touchAction: 'none', width: '100%' }}
          onPointerDown={handleScrubStart}
          onPointerMove={handleScrubMove}
          onPointerUp={handleScrubEnd}
          onPointerCancel={handleScrubEnd}
        >
          {rulerMarkers.map((t) => {
            const pct = (t / rangeDuration) * 100
            return (
              <div
                key={t}
                className="absolute top-0 h-full flex flex-col items-start pointer-events-none"
                style={{ left: `${pct}%` }}
              >
                <div className="w-px h-2 bg-white/20 mt-0.5" />
                {t > 0 && (
                  <span className="text-[7px] text-white/30 pl-0.5 leading-none tabular-nums">
                    {formatTime(t)}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Filmstrip canvas */}
        <canvas
          ref={filmstripCanvasRef}
          className="cursor-pointer block touch-none"
          style={{ height: 68, width: '100%' }}
          onPointerDown={handleScrubStart}
          onPointerMove={handleScrubMove}
          onPointerUp={handleScrubEnd}
          onPointerCancel={handleScrubEnd}
        />

        {/* Tag lanes */}
        {!isClipMode && tags.length > 0 && (
          <TagLanes
            duration={duration}
            onSeek={(ms) => onSeek(ms / 1000)}
            onTagSelect={setSelectedTagId}
            timeToPercent={timeToPercent}
          />
        )}

        {/* Drawing temporal bars (one row per element) */}
        {showDrawingBars && temporalDrawings.map((el) => (
          <div
            key={el.id}
            className="relative w-full bg-white/2 border-t border-white/5"
            style={{ height: 20 }}
          >
            <DrawingBar
              element={el}
              timeToPercent={timeToPercent}
              xToTime={xToTime}
              totalDuration={rangeDuration}
              onUpdate={(id, st, et) => onDrawingTimeUpdate?.(id, st, et)}
            />
          </div>
        ))}

        {/* Code event lanes (general mode only) */}
        {hasCodeLanes && activeLanes.map((btn) => {
          const btnEvents = codeEvents.filter((ev) => ev.buttonId === btn.id)
          return (
            <div
              key={btn.id}
              className="relative w-full border-t border-white/5 cursor-pointer hover:bg-white/3 transition-colors"
              style={{ height: 40, backgroundColor: btn.color + '08' }}
              onClick={() => onCodeLaneClick?.(btn.id)}
            >
              {btnEvents.map((ev) => {
                const startPct = timeToPercent(ev.startTime)
                const endPct = timeToPercent(ev.endTime)
                const widthPct = Math.max(endPct - startPct, 0.3)
                const centerPct = timeToPercent(ev.timestamp)
                return (
                  <div key={ev.id} className="group/ev">
                    {/* Event clip block */}
                    <div
                      className="absolute top-2 bottom-2 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                      style={{
                        left: `${startPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: btn.color + '60',
                        borderLeft: `2px solid ${btn.color}`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSeek(ev.startTime)
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        onCodeEventDoubleClick?.(ev.id)
                      }}
                    >
                      {/* + Add to organizer — visible on hover */}
                      {onAddCodeEventToOrganizer && (
                        <button
                          className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded bg-black/60 text-white text-[9px] leading-none z-10 opacity-0 group-hover/ev:opacity-100 transition-opacity hover:bg-white/30"
                          title="Añadir al Organizer"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddCodeEventToOrganizer(ev.id)
                          }}
                        >
                          +
                        </button>
                      )}
                    </div>
                    {/* Press point marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 z-10"
                      style={{
                        left: `${centerPct}%`,
                        backgroundColor: btn.color,
                      }}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* Playhead — spans all rows */}
        <div
          ref={playheadRef}
          className="absolute top-0 bottom-0 w-px bg-white pointer-events-none z-20"
        >
          <div className="absolute -top-0.5 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-white" />
        </div>
        </div>{/* end zoomed content div */}
      </div>
      </div>{/* end main row */}
    </div>
  )
}
