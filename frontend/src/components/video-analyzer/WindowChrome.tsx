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
  children: ReactNode
  className?: string
}

export function WindowChrome({
  id, title, x, y, width, height, minimized, zIndex,
  onFocus, onMove, onClose, onMinimize, children, className = ''
}: WindowChromeProps) {
  const dragOffset = useRef<{ ox: number; oy: number } | null>(null)

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
    </div>
  )
}
