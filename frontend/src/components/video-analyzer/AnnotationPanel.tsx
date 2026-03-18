'use client'

import { useState } from 'react'
import type { VideoAnotacion } from '@/types'
import type { Clip } from './types'
import { Button } from '@/components/ui/button'
import { Trash2, Clock, Download, Film } from 'lucide-react'
import { formatTime } from './utils'

interface AnnotationPanelProps {
  // Moments
  anotaciones: VideoAnotacion[]
  activeAnotacionId: string | null
  onSelectAnotacion: (anotacion: VideoAnotacion) => void
  onDeleteAnotacion: (id: string) => void
  deletingAnotacionId: string | null
  // Clips
  clips: Clip[]
  activeClipId: string | null
  onSelectClip: (id: string) => void
  onDeleteClip: (id: string) => void
  onExportClip: (id: string) => void
  exportingClipId: string | null
  // Tab
  activeTab: 'moments' | 'clips'
  onTabChange: (tab: 'moments' | 'clips') => void
}

export function AnnotationPanel({
  anotaciones,
  activeAnotacionId,
  onSelectAnotacion,
  onDeleteAnotacion,
  deletingAnotacionId,
  clips,
  activeClipId,
  onSelectClip,
  onDeleteClip,
  onExportClip,
  exportingClipId,
  activeTab,
  onTabChange,
}: AnnotationPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'moments'
              ? 'text-white border-b-2 border-blue-400'
              : 'text-white/50 hover:text-white/70'
          }`}
          onClick={() => onTabChange('moments')}
        >
          Momentos ({anotaciones.length})
        </button>
        <button
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'clips'
              ? 'text-white border-b-2 border-blue-400'
              : 'text-white/50 hover:text-white/70'
          }`}
          onClick={() => onTabChange('clips')}
        >
          Clips ({clips.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'moments' ? (
          <MomentsTab
            anotaciones={anotaciones}
            activeId={activeAnotacionId}
            onSelect={onSelectAnotacion}
            onDelete={onDeleteAnotacion}
            deleting={deletingAnotacionId}
          />
        ) : (
          <ClipsTab
            clips={clips}
            activeId={activeClipId}
            onSelect={onSelectClip}
            onDelete={onDeleteClip}
            onExport={onExportClip}
            exportingId={exportingClipId}
          />
        )}
      </div>
    </div>
  )
}

function MomentsTab({
  anotaciones,
  activeId,
  onSelect,
  onDelete,
  deleting,
}: {
  anotaciones: VideoAnotacion[]
  activeId: string | null
  onSelect: (a: VideoAnotacion) => void
  onDelete: (id: string) => void
  deleting: string | null
}) {
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
    <div className="flex flex-col gap-1 p-2">
      {anotaciones.map((a) => (
        <button
          key={a.id}
          className={`flex items-start gap-2 p-2 rounded text-left hover:bg-white/10 transition-colors ${
            activeId === a.id ? 'bg-white/15 ring-1 ring-white/30' : ''
          }`}
          onClick={() => onSelect(a)}
        >
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
            <p className="text-[10px] text-white/50">{formatTime(a.timestamp_seconds)}</p>
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

function ClipsTab({
  clips,
  activeId,
  onSelect,
  onDelete,
  onExport,
  exportingId,
}: {
  clips: Clip[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onExport: (id: string) => void
  exportingId: string | null
}) {
  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/40 text-xs p-4 text-center">
        <Film className="h-8 w-8 mb-2 opacity-50" />
        <p>No hay clips</p>
        <p className="mt-1">Arrastra en el timeline para crear clips</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {clips.map((clip) => {
        const dur = clip.endTime - clip.startTime
        const isExporting = exportingId === clip.id
        return (
          <div
            key={clip.id}
            className={`flex items-center gap-2 p-2 rounded transition-colors cursor-pointer hover:bg-white/10 ${
              activeId === clip.id ? 'bg-white/15 ring-1 ring-white/30' : ''
            }`}
            onClick={() => onSelect(clip.id)}
          >
            {/* Color swatch */}
            <div
              className="w-3 h-8 rounded-sm shrink-0"
              style={{ backgroundColor: clip.color }}
            />

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{clip.title}</p>
              <p className="text-[10px] text-white/50">
                {formatTime(clip.startTime)} - {formatTime(clip.endTime)} ({formatTime(dur)})
              </p>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/40 hover:text-blue-400 hover:bg-blue-400/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onExport(clip.id)
                }}
                disabled={isExporting}
                title="Exportar clip"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/40 hover:text-red-400 hover:bg-red-400/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(clip.id)
                }}
                title="Eliminar clip"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
