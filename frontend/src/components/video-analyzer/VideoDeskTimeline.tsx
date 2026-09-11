'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CodeButton, CodeEvent } from './types'
import { formatTime } from './utils'
import {
  cintaTickStep,
  cintaWindow,
  panCinta,
  timeToViewPct,
  zoomCinta,
} from './videoDesk'

export function VideoDeskTimeline({
  buttons,
  events,
  duration,
  currentTime,
  selectedClipId,
  onSeek,
  onSelect,
  onTrim,
}: {
  buttons: CodeButton[]
  events: CodeEvent[]
  duration: number
  currentTime: number
  selectedClipId: string | null
  onSeek: (time: number) => void
  onSelect: (clip: CodeEvent) => void
  onTrim: (clip: CodeEvent, startTime: number, endTime: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [viewStart, setViewStart] = useState(0)
  const dragRef = useRef<{
    clip: CodeEvent
    edge: 'start' | 'end' | 'body'
    originX: number
    start: number
    end: number
  } | null>(null)
  const panRef = useRef<{ originX: number; startView: number } | null>(null)

  const view = cintaWindow(duration, zoom, viewStart)

  useEffect(() => {
    const next = cintaWindow(duration, zoom, viewStart)
    if (next.viewStart !== viewStart) setViewStart(next.viewStart)
  }, [duration, zoom, viewStart])

  const pct = (t: number) => `${timeToViewPct(t, view.viewStart, view.visible)}%`

  const timeFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current
    if (!el || view.visible <= 0) return 0
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return view.viewStart + x * view.visible
  }, [view.viewStart, view.visible])

  const applyView = (next: ReturnType<typeof cintaWindow>) => {
    setZoom(next.zoom)
    setViewStart(next.viewStart)
  }

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.shiftKey) {
        const delta = (e.deltaY / Math.max(1, el.getBoundingClientRect().width)) * view.visible
        applyView(panCinta(duration, zoom, viewStart, delta))
        return
      }
      const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18
      applyView(zoomCinta(duration, zoom, viewStart, timeFromClientX(e.clientX), factor))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [duration, zoom, viewStart, timeFromClientX, view.visible])

  const handleTrackPointer = useCallback((e: React.PointerEvent) => {
    if (dragRef.current || panRef.current) return
    onSeek(timeFromClientX(e.clientX))
  }, [onSeek, timeFromClientX])

  const onRulerPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    if (zoom <= 1.01) {
      onSeek(timeFromClientX(e.clientX))
      return
    }
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    panRef.current = { originX: e.clientX, startView: viewStart }
  }

  const onRulerPointerMove = (e: React.PointerEvent) => {
    const pan = panRef.current
    const el = trackRef.current
    if (!pan || !el || view.visible <= 0) return
    const dt = -((e.clientX - pan.originX) / el.getBoundingClientRect().width) * view.visible
    applyView(panCinta(duration, zoom, pan.startView, dt))
  }

  const onRulerPointerUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    panRef.current = null
  }

  const onBlockPointerDown = (e: React.PointerEvent, clip: CodeEvent, edge: 'start' | 'end' | 'body') => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      clip,
      edge,
      originX: e.clientX,
      start: clip.startTime,
      end: clip.endTime,
    }
    onSelect(clip)
  }

  const onBlockPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    const el = trackRef.current
    if (!drag || !el || view.visible <= 0) return
    const dt = ((e.clientX - drag.originX) / el.getBoundingClientRect().width) * view.visible
    if (drag.edge === 'start') {
      onTrim(drag.clip, drag.start + dt, drag.end)
    } else if (drag.edge === 'end') {
      onTrim(drag.clip, drag.start, drag.end + dt)
    } else {
      const span = drag.end - drag.start
      const start = Math.max(0, Math.min(drag.start + dt, Math.max(0, duration - span)))
      onTrim(drag.clip, start, start + span)
    }
  }

  const onBlockPointerUp = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    dragRef.current = null
  }

  const step = cintaTickStep(view.visible)
  const ticks: number[] = []
  if (view.visible > 0) {
    const first = Math.ceil(view.viewStart / step) * step
    for (let t = first; t <= view.viewEnd + 0.001; t += step) ticks.push(t)
  }

  const lanes = buttons.length ? buttons : [{ id: '_none', label: '—', color: '#94A3B8' } as CodeButton]
  const laneH = Math.max(22, Math.min(36, 140 / Math.max(lanes.length, 1)))
  const playheadInView = currentTime >= view.viewStart && currentTime <= view.viewEnd
  const zoomLabel = zoom <= 1.05 ? 'partido' : `${Math.round(zoom)}×`

  return (
    <div className="vd-cinta" style={{ ['--vd-lane-h' as string]: `${laneH}px` }}>
      <div className="vd-cinta-gutter">
        <div className="vd-ruler vd-cinta-zoom">
          <button type="button" aria-label="Alejar" onClick={() => applyView(zoomCinta(duration, zoom, viewStart, currentTime, 1 / 1.35))}>−</button>
          <span>{zoomLabel}</span>
          <button type="button" aria-label="Acercar" onClick={() => applyView(zoomCinta(duration, zoom, viewStart, currentTime, 1.35))}>+</button>
        </div>
        {lanes.map((btn) => (
          <div key={btn.id} className="vd-lane-label" title={btn.label}>{btn.label}</div>
        ))}
      </div>
      <div
        className="vd-cinta-lanes"
        ref={trackRef}
        onPointerDown={handleTrackPointer}
      >
        <div
          className="vd-ruler"
          onPointerDown={onRulerPointerDown}
          onPointerMove={onRulerPointerMove}
          onPointerUp={onRulerPointerUp}
          title="Rueda: zoom. Mayús + rueda o arrastrar la regla: desplazar"
        >
          {ticks.map((t) => (
            <span
              key={t}
              style={{ position: 'absolute', left: pct(t), transform: 'translateX(-50%)', top: 3 }}
            >
              {formatTime(t)}
            </span>
          ))}
        </div>
        {lanes.map((btn) => {
          const clips = events.filter((e) => e.buttonId === btn.id)
          return (
            <div key={btn.id} className="vd-lane">
              <div className="vd-lane-track">
                {clips.map((clip) => {
                  if (clip.endTime < view.viewStart || clip.startTime > view.viewEnd) return null
                  const left = Math.max(0, timeToViewPct(clip.startTime, view.viewStart, view.visible))
                  const right = Math.min(100, timeToViewPct(clip.endTime, view.viewStart, view.visible))
                  return (
                    <div
                      key={clip.id}
                      className={`vd-block${selectedClipId === clip.id ? ' is-selected' : ''}`}
                      style={{
                        left: `${left}%`,
                        width: `max(4px, ${Math.max(0.3, right - left)}%)`,
                        background: btn.color,
                      }}
                      title={btn.label}
                      onPointerDown={(e) => onBlockPointerDown(e, clip, 'body')}
                      onPointerMove={onBlockPointerMove}
                      onPointerUp={onBlockPointerUp}
                    >
                      <span
                        className="vd-block-handle is-start"
                        onPointerDown={(e) => onBlockPointerDown(e, clip, 'start')}
                      />
                      <span
                        className="vd-block-handle is-end"
                        onPointerDown={(e) => onBlockPointerDown(e, clip, 'end')}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {playheadInView ? <div className="vd-playhead" style={{ left: pct(currentTime) }} /> : null}
      </div>
    </div>
  )
}
