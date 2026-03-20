'use client'

import { useCallback, useRef } from 'react'
import type { DrawingElement } from '@/types'

interface DrawingBarProps {
  element: DrawingElement
  timeToPercent: (t: number) => number
  xToTime: (clientX: number) => number
  totalDuration: number
  onUpdate: (id: string, startTime: number, endTime: number) => void
}

const MIN_DURATION = 0.3

/**
 * A thin temporal bar in the timeline for a drawing element.
 * Supports drag to move body and resize start/end handles.
 */
export function DrawingBar({
  element,
  timeToPercent,
  xToTime,
  totalDuration,
  onUpdate,
}: DrawingBarProps) {
  const dragRef = useRef<{
    edge: 'start' | 'end' | 'body'
    grabTime: number
    origStart: number
    origEnd: number
  } | null>(null)

  const st = element.startTime ?? 0
  const et = element.endTime ?? totalDuration
  const leftPct = timeToPercent(st)
  const widthPct = timeToPercent(et) - leftPct

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, edge: 'start' | 'end' | 'body') => {
      e.stopPropagation()
      e.preventDefault()
      dragRef.current = { edge, grabTime: xToTime(e.clientX), origStart: st, origEnd: et }

      const handleMove = (ev: PointerEvent) => {
        if (!dragRef.current) return
        const { edge: de, grabTime, origStart, origEnd } = dragRef.current
        const dt = xToTime(ev.clientX) - grabTime

        if (de === 'start') {
          const ns = Math.max(0, Math.min(origEnd - MIN_DURATION, origStart + dt))
          onUpdate(element.id, ns, origEnd)
        } else if (de === 'end') {
          const ne = Math.min(totalDuration, Math.max(origStart + MIN_DURATION, origEnd + dt))
          onUpdate(element.id, origStart, ne)
        } else {
          const dur = origEnd - origStart
          let ns = origStart + dt
          ns = Math.max(0, Math.min(totalDuration - dur, ns))
          onUpdate(element.id, ns, ns + dur)
        }
      }

      const handleUp = () => {
        document.removeEventListener('pointermove', handleMove)
        document.removeEventListener('pointerup', handleUp)
        dragRef.current = null
      }

      document.addEventListener('pointermove', handleMove)
      document.addEventListener('pointerup', handleUp)
    },
    [element.id, st, et, xToTime, totalDuration, onUpdate]
  )

  // Icon per type
  const icon =
    element.type === 'arrow' ? '→' :
    element.type === 'line' ? '—' :
    element.type === 'circle' ? '○' :
    element.type === 'rect' ? '□' :
    element.type === 'freehand' ? '~' :
    element.type === 'text' ? 'T' : '•'

  return (
    <div
      className="absolute top-0.5 bottom-0.5 group"
      style={{
        left: `${leftPct}%`,
        width: `${Math.max(widthPct, 0.4)}%`,
      }}
    >
      {/* Bar body */}
      <div
        className="absolute inset-0 rounded-sm cursor-grab active:cursor-grabbing flex items-center overflow-hidden"
        style={{
          backgroundColor: element.color + '50',
          borderLeft: `1px solid ${element.color}`,
          borderRight: `1px solid ${element.color}`,
        }}
        onPointerDown={(e) => handlePointerDown(e, 'body')}
      >
        <span className="text-[8px] text-white/70 px-0.5 pointer-events-none select-none">
          {icon}
        </span>
      </div>

      {/* Left handle */}
      <div
        className="absolute left-0 top-0 w-[5px] h-full cursor-ew-resize z-10 hover:bg-white/30"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => handlePointerDown(e, 'start')}
      />

      {/* Right handle */}
      <div
        className="absolute right-0 top-0 w-[5px] h-full cursor-ew-resize z-10 hover:bg-white/30"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => handlePointerDown(e, 'end')}
      />
    </div>
  )
}
