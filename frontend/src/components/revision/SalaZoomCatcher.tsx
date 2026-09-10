'use client'

import { useRef } from 'react'
import {
  clampPan,
  pinchDistance,
  zoomAt,
  type ZoomState,
} from '@/lib/videoZoom'

interface SalaZoomCatcherProps {
  zoom: ZoomState
  onChange: (zoom: ZoomState) => void
  onCommit: () => void
}

export function SalaZoomCatcher({ zoom, onChange, onCommit }: SalaZoomCatcherProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom: ZoomState } | null>(null)
  const panLast = useRef<{ x: number; y: number } | null>(null)

  const boxSize = () => {
    const r = boxRef.current?.getBoundingClientRect()
    return { w: r?.width || 1, h: r?.height || 1, left: r?.left || 0, top: r?.top || 0 }
  }

  const toCentered = (clientX: number, clientY: number) => {
    const { w, h, left, top } = boxSize()
    return { x: clientX - left - w / 2, y: clientY - top - h / 2 }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size === 2) {
      const pair = Array.from(pts.current.values())
      const a = pair[0]
      const b = pair[1]
      pinch.current = { dist: Math.max(pinchDistance(a, b), 1), zoom: zoomRef.current }
      panLast.current = null
    } else if (pts.current.size === 1 && zoomRef.current.scale > 1.001) {
      panLast.current = { x: e.clientX, y: e.clientY }
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pts.current.has(e.pointerId)) return
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const { w, h } = boxSize()
    if (pts.current.size >= 2 && pinch.current) {
      const pair = Array.from(pts.current.values())
      const a = pair[0]
      const b = pair[1]
      const dist = Math.max(pinchDistance(a, b), 1)
      const mid = toCentered((a.x + b.x) / 2, (a.y + b.y) / 2)
      const nextScale = pinch.current.zoom.scale * (dist / pinch.current.dist)
      onChange(zoomAt(pinch.current.zoom, nextScale, mid.x, mid.y, w, h))
      return
    }
    if (pts.current.size === 1 && panLast.current && zoomRef.current.scale > 1.001) {
      const dx = e.clientX - panLast.current.x
      const dy = e.clientY - panLast.current.y
      panLast.current = { x: e.clientX, y: e.clientY }
      const z = zoomRef.current
      onChange(clampPan({ scale: z.scale, x: z.x + dx, y: z.y + dy }, w, h))
    }
  }

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    pts.current.delete(e.pointerId)
    if (pts.current.size < 2) pinch.current = null
    if (pts.current.size === 0) {
      panLast.current = null
      onCommit()
    } else if (pts.current.size === 1) {
      const remaining = Array.from(pts.current.values())[0]
      panLast.current = remaining
    }
  }

  return (
    <div
      ref={boxRef}
      className="absolute inset-0 z-[4] touch-none"
      style={{ touchAction: 'none', cursor: 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    />
  )
}
