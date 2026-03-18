'use client'

import type { VideoAnotacion } from '@/types'

interface AnnotationTimelineProps {
  anotaciones: VideoAnotacion[]
  duration: number
  currentTime: number
  activeId: string | null
  onSelect: (anotacion: VideoAnotacion) => void
}

export function AnnotationTimeline({
  anotaciones,
  duration,
  currentTime,
  activeId,
  onSelect,
}: AnnotationTimelineProps) {
  if (!duration || anotaciones.length === 0) return null

  return (
    <div className="relative h-4 bg-white/10 mx-2 rounded-full">
      {/* Current time indicator */}
      <div
        className="absolute top-0 h-full w-0.5 bg-white/40 z-10"
        style={{ left: `${(currentTime / duration) * 100}%` }}
      />

      {/* Markers */}
      {anotaciones.map((a) => {
        const pct = (a.timestamp_seconds / duration) * 100
        const isActive = activeId === a.id
        return (
          <button
            key={a.id}
            className={`absolute top-0.5 -translate-x-1/2 w-3 h-3 rounded-full border transition-transform hover:scale-125 ${
              isActive
                ? 'bg-blue-400 border-blue-300 scale-110'
                : 'bg-amber-400 border-amber-300'
            }`}
            style={{ left: `${Math.max(1, Math.min(99, pct))}%` }}
            onClick={() => onSelect(a)}
            title={a.titulo}
          />
        )
      })}
    </div>
  )
}
