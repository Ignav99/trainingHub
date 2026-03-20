'use client'

import type { Clip, FreezeFrame } from './types'
import { Button } from '@/components/ui/button'
import { Trash2, Download, Film, ArrowLeft, Pencil, Image, Snowflake } from 'lucide-react'
import { formatTime } from './utils'

interface AnnotationPanelProps {
  clips: Clip[]
  activeClipId: string | null
  onSelectClip: (id: string) => void
  onDeleteClip: (id: string) => void
  onExportClip: (id: string) => void
  exportingClipId: string | null
  // Clip editor mode
  viewMode: 'general' | 'clip-editor'
  editingClip: Clip | null
  onEnterClipEditor: (id: string) => void
  onExitClipEditor: () => void
  // Freeze frames
  onSelectFreezeFrame?: (frame: FreezeFrame) => void
  onDeleteFreezeFrame?: (clipId: string, frameId: string) => void
  onUpdateFreezeFrameDuration?: (clipId: string, frameId: string, duration: number) => void
}

export function AnnotationPanel({
  clips,
  activeClipId,
  onSelectClip,
  onDeleteClip,
  onExportClip,
  exportingClipId,
  viewMode,
  editingClip,
  onEnterClipEditor,
  onExitClipEditor,
  onSelectFreezeFrame,
  onDeleteFreezeFrame,
  onUpdateFreezeFrameDuration,
}: AnnotationPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        {viewMode === 'clip-editor' && editingClip ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-white/70 hover:text-white hover:bg-white/20 px-2"
              onClick={onExitClipEditor}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              General
            </Button>
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: editingClip.color }}
            />
            <span className="text-xs text-white font-medium truncate">{editingClip.title}</span>
          </>
        ) : (
          <span className="text-xs text-white font-medium">Clips ({clips.length})</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'clip-editor' && editingClip ? (
          <FreezeFramesView
            clip={editingClip}
            onSelectFreezeFrame={onSelectFreezeFrame}
            onDeleteFreezeFrame={onDeleteFreezeFrame}
            onUpdateFreezeFrameDuration={onUpdateFreezeFrameDuration}
          />
        ) : (
          <ClipsList
            clips={clips}
            activeId={activeClipId}
            onSelect={onSelectClip}
            onDelete={onDeleteClip}
            onExport={onExportClip}
            onEdit={onEnterClipEditor}
            exportingId={exportingClipId}
          />
        )}
      </div>
    </div>
  )
}

function ClipsList({
  clips,
  activeId,
  onSelect,
  onDelete,
  onExport,
  onEdit,
  exportingId,
}: {
  clips: Clip[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onExport: (id: string) => void
  onEdit: (id: string) => void
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
        const freezeCount = clip.freezeFrames.length
        return (
          <div
            key={clip.id}
            className={`flex items-center gap-2 p-2 rounded transition-colors cursor-pointer hover:bg-white/10 ${
              activeId === clip.id ? 'bg-white/15 ring-1 ring-white/30' : ''
            }`}
            onClick={() => onSelect(clip.id)}
            onDoubleClick={() => onEdit(clip.id)}
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
              {freezeCount > 0 && (
                <p className="text-[10px] text-blue-400/70 flex items-center gap-0.5 mt-0.5">
                  <Snowflake className="h-2.5 w-2.5" />
                  {freezeCount} freeze frame{freezeCount > 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/40 hover:text-green-400 hover:bg-green-400/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(clip.id)
                }}
                title="Editar clip"
              >
                <Pencil className="h-3 w-3" />
              </Button>
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

function FreezeFramesView({
  clip,
  onSelectFreezeFrame,
  onDeleteFreezeFrame,
  onUpdateFreezeFrameDuration,
}: {
  clip: Clip
  onSelectFreezeFrame?: (frame: FreezeFrame) => void
  onDeleteFreezeFrame?: (clipId: string, frameId: string) => void
  onUpdateFreezeFrameDuration?: (clipId: string, frameId: string, duration: number) => void
}) {
  const { freezeFrames } = clip

  if (freezeFrames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/40 text-xs p-4 text-center">
        <Image className="h-8 w-8 mb-2 opacity-50" />
        <p>No hay freeze frames</p>
        <p className="mt-1">Pausa el video y pulsa Captura</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {freezeFrames.map((frame) => {
        const relativeTs = frame.timestamp - clip.startTime
        return (
          <div
            key={frame.id}
            className="flex items-start gap-2 p-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
            onClick={() => onSelectFreezeFrame?.(frame)}
          >
            {/* Thumbnail */}
            <img
              src={frame.imageData}
              alt=""
              className="w-16 h-9 rounded object-cover shrink-0 bg-black"
            />

            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-white/50">
                @ {formatTime(relativeTs)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-white/40">Duración:</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  step={0.5}
                  value={frame.duration}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (val >= 1 && val <= 30) {
                      onUpdateFreezeFrameDuration?.(clip.id, frame.id, val)
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-12 h-5 text-[10px] text-white bg-white/10 border border-white/20 rounded px-1 text-center"
                />
                <span className="text-[10px] text-white/40">s</span>
              </div>
              {frame.drawings.length > 0 && (
                <p className="text-[10px] text-blue-400/70 mt-0.5">
                  {frame.drawings.length} dibujo{frame.drawings.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-white/40 hover:text-red-400 hover:bg-red-400/10"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteFreezeFrame?.(clip.id, frame.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
