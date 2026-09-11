'use client'

import { useCallback, useRef } from 'react'
import type { CodeButton, CodeEvent } from './types'
import { formatTime } from './utils'

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
  const dragRef = useRef<{
    clip: CodeEvent
    edge: 'start' | 'end' | 'body'
    originX: number
    start: number
    end: number
  } | null>(null)

  const pct = (t: number) => (duration > 0 ? `${(t / duration) * 100}%` : '0%')

  const timeFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current
    if (!el || duration <= 0) return 0
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return x * duration
  }, [duration])

  const handleTrackPointer = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) return
    onSeek(timeFromClientX(e.clientX))
  }, [onSeek, timeFromClientX])

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
    if (!drag || !el || duration <= 0) return
    const dt = ((e.clientX - drag.originX) / el.getBoundingClientRect().width) * duration
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

  const ticks: number[] = []
  if (duration > 0) {
    const step = duration > 3600 ? 300 : duration > 900 ? 60 : 30
    for (let t = 0; t <= duration; t += step) ticks.push(t)
  }

  const lanes = buttons.length ? buttons : [{ id: '_none', label: '—', color: '#94A3B8' } as CodeButton]
  const laneH = Math.max(22, Math.min(36, 140 / Math.max(lanes.length, 1)))

  return (
    <div className="vd-cinta" style={{ ['--vd-lane-h' as string]: `${laneH}px` }}>
      <div className="vd-cinta-gutter">
        <div className="vd-ruler" />
        {lanes.map((btn) => (
          <div key={btn.id} className="vd-lane-label" title={btn.label}>{btn.label}</div>
        ))}
      </div>
      <div
        className="vd-cinta-lanes"
        ref={trackRef}
        onPointerDown={handleTrackPointer}
      >
        <div className="vd-ruler">
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
                {clips.map((clip) => (
                  <div
                    key={clip.id}
                    className={`vd-block${selectedClipId === clip.id ? ' is-selected' : ''}`}
                    style={{
                      left: pct(clip.startTime),
                      width: `max(4px, calc(${pct(clip.endTime)} - ${pct(clip.startTime)}))`,
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
                ))}
              </div>
            </div>
          )
        })}
        <div className="vd-playhead" style={{ left: pct(currentTime) }} />
      </div>
    </div>
  )
}
