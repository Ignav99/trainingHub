'use client'

import type { VideoAnotacion } from '@/types'
import { Button } from '@/components/ui/button'
import { Trash2, Clock } from 'lucide-react'
import { formatTime } from './utils'

interface AnnotationPanelProps {
  anotaciones: VideoAnotacion[]
  activeId: string | null
  onSelect: (anotacion: VideoAnotacion) => void
  onDelete: (id: string) => void
  deleting: string | null
}

export function AnnotationPanel({
  anotaciones,
  activeId,
  onSelect,
  onDelete,
  deleting,
}: AnnotationPanelProps) {
  if (anotaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/40 text-xs p-4 text-center">
        <Clock className="h-8 w-8 mb-2 opacity-50" />
        <p>No hay momentos guardados</p>
        <p className="mt-1">Pausa el video, dibuja y guarda</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-2 overflow-y-auto">
      {anotaciones.map((a) => (
        <button
          key={a.id}
          className={`flex items-start gap-2 p-2 rounded text-left hover:bg-white/10 transition-colors ${
            activeId === a.id ? 'bg-white/15 ring-1 ring-white/30' : ''
          }`}
          onClick={() => onSelect(a)}
        >
          {/* Thumbnail */}
          {a.thumbnail_data ? (
            <img
              src={a.thumbnail_data}
              alt=""
              className="w-16 h-9 rounded object-cover shrink-0 bg-black"
            />
          ) : (
            <div className="w-16 h-9 rounded bg-white/10 shrink-0 flex items-center justify-center text-[10px] text-white/30">
              {formatTime(a.timestamp_seconds)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{a.titulo}</p>
            <p className="text-[10px] text-white/50">
              {formatTime(a.timestamp_seconds)}
            </p>
            {a.descripcion && (
              <p className="text-[10px] text-white/40 line-clamp-1 mt-0.5">{a.descripcion}</p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-white/40 hover:text-red-400 hover:bg-red-400/10"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(a.id)
            }}
            disabled={deleting === a.id}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </button>
      ))}
    </div>
  )
}
