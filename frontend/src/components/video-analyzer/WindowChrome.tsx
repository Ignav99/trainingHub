// src/components/video-analyzer/WindowChrome.tsx
'use client'
import { useRef, useCallback, type ReactNode } from 'react'
import { X, Minus } from 'lucide-react'

interface WindowChromeProps {
  id: string
  title: string
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  zIndex: number
  onFocus: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onClose: (id: string) => void
  onMinimize: (id: string) => void
  onResize?: (id: string, width: number, height: number) => void
  children: ReactNode
  className?: string
}

export function WindowChrome({
  id, title, x, y, width, height, minimized, zIndex,
  onFocus, onMove, onClose, onMinimize, onResize, children, className = ''
}: WindowChromeProps) {
  const dragOffset = useRef<{ ox: number; oy: number } | null>(null)

  // ── Drag to move ────────────────────────────────────────────────
  const handleMouseDownHeader = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onFocus(id)
    const rect = (e.currentTarget.closest('[data-window]') as HTMLElement).getBoundingClientRect()
    dragOffset.current = { ox: e.clientX - rect.left, oy: e.clientY - rect.top }

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragOffset.current) return
      onMove(id, ev.clientX - dragOffset.current.ox, ev.clientY - dragOffset.current.oy)
    }
    const handleMouseUp = () => {
      dragOffset.current = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [id, onFocus, onMove])

  // ── Resize handles ───────────────────────────────────────────────
  // edge: 'e' = right edge (width only), 's' = bottom edge (height only), 'se' = corner (both)
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, edge: 'e' | 's' | 'se') => {
      if (!onResize) return
      e.preventDefault()
      e.stopPropagation()
      onFocus(id)

      const startX = e.clientX
      const startY = e.clientY
      const startW = width
      const startH = height

      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

      const handleMove = (ev: PointerEvent) => {
        const dw = edge === 's' ? 0 : ev.clientX - startX
        const dh = edge === 'e' ? 0 : ev.clientY - startY
        const newW = Math.max(200, startW + dw)
        const newH = Math.max(120, startH + dh)
        onResize(id, newW, newH)
      }
      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
      }
      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
    },
    [id, width, height, onFocus, onResize]
  )

  return (
    <div
      data-window
      className={`absolute flex flex-col rounded-xl border border-white/10 shadow-2xl bg-zinc-900/95 backdrop-blur-sm overflow-hidden ${className}`}
      style={{ left: x, top: y, width, height: minimized ? 40 : height, zIndex }}
      onMouseDown={() => onFocus(id)}
    >
      {/* Header / drag handle */}
      <div
        className="flex items-center justify-between px-3 h-10 bg-zinc-800/90 cursor-grab active:cursor-grabbing select-none shrink-0"
        onMouseDown={handleMouseDownHeader}
      >
        <span className="text-xs font-semibold text-zinc-300 truncate">{title}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize(id) }}
            className="w-5 h-5 rounded-full bg-yellow-500/80 hover:bg-yellow-400 flex items-center justify-center"
          >
            <Minus className="w-2.5 h-2.5 text-yellow-900" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(id) }}
            className="w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-400 flex items-center justify-center"
          >
            <X className="w-2.5 h-2.5 text-red-900" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      )}

      {/* ── Resize handles ── */}
      {!minimized && onResize && (
        <>
          {/* Right edge */}
          <div
            className="absolute top-10 right-0 w-1.5 bottom-4 cursor-ew-resize z-20 hover:bg-white/10 transition-colors"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'e')}
          />
          {/* Bottom edge */}
          <div
            className="absolute bottom-0 left-4 right-4 h-1.5 cursor-ns-resize z-20 hover:bg-white/10 transition-colors"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResizePointerDown(e, 's')}
          />
          {/* Bottom-right corner (SE) — most commonly used */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-30 flex items-end justify-end pb-0.5 pr-0.5"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'se')}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-white/25 pointer-events-none">
              <line x1="10" y1="3" x2="3" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="10" y1="6" x2="6" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="10" y1="9" x2="9" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </>
      )}
    </div>
  )
}
