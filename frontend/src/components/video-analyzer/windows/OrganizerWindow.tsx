'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Pencil, X, Plus } from 'lucide-react'
import { useOrganizerStore } from '../useOrganizerStore'
import type { OrganizerClip, OrganizerRow } from '../useOrganizerStore'

interface OrganizerWindowProps {
  videoSrc: string
  onOpenInStudio: (eventId: string) => void
  onSeekTo: (time: number) => void
}

function formatTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface MiniPlayerProps {
  videoSrc: string
  clip: OrganizerClip | null
}

function MiniPlayer({ videoSrc, clip }: MiniPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Seek to clip start when selection changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !clip) return
    video.currentTime = clip.startTime
    video.pause()
    setIsPlaying(false)
  }, [clip])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video || !clip) return
    // Stop at clip end
    if (video.currentTime >= clip.endTime) {
      video.pause()
      video.currentTime = clip.endTime
    }
  }, [clip])

  const handleScrubClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current
      if (!video || !clip) return
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      const clipDur = clip.endTime - clip.startTime
      const newTime = clip.startTime + ratio * clipDur
      video.currentTime = Math.max(clip.startTime, Math.min(clip.endTime, newTime))
    },
    [clip]
  )

  // Compute scrub progress
  const [currentTime, setCurrentTime] = useState(clip?.startTime ?? 0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTime = () => setCurrentTime(video.currentTime)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    return () => {
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [])

  if (!clip) {
    return (
      <div className="flex items-center justify-center h-full text-white/20 text-xs text-center p-4">
        Seleccioná un clip para previsualizar
      </div>
    )
  }

  const clipDur = clip.endTime - clip.startTime
  const progressPct =
    clipDur > 0
      ? Math.max(0, Math.min(100, ((currentTime - clip.startTime) / clipDur) * 100))
      : 0

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Video */}
      <div className="flex-1 relative min-h-0 overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          playsInline
          preload="metadata"
        />
      </div>

      {/* Clip info */}
      <div className="px-3 py-1 bg-zinc-900 border-t border-zinc-800 shrink-0">
        <p
          className="text-[10px] font-medium truncate"
          style={{ color: clip.color }}
        >
          {clip.title}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-t border-zinc-800 shrink-0">
        <button
          className="text-white text-xs w-6 h-6 flex items-center justify-center bg-zinc-700 rounded hover:bg-zinc-600 shrink-0"
          onClick={togglePlay}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <span className="text-[10px] text-zinc-500 font-mono w-10 shrink-0">
          {formatTime(currentTime)}
        </span>

        {/* Scrub bar */}
        <div
          className="flex-1 relative h-3 bg-zinc-800 rounded cursor-pointer"
          onClick={handleScrubClick}
        >
          <div
            className="absolute top-0 left-0 h-full rounded transition-none"
            style={{
              width: `${progressPct}%`,
              backgroundColor: clip.color,
              opacity: 0.7,
            }}
          />
        </div>

        <span className="text-[10px] text-zinc-500 font-mono w-10 text-right shrink-0">
          {formatTime(clip.endTime)}
        </span>
      </div>
    </div>
  )
}

interface RowHeaderProps {
  row: OrganizerRow
  count: number
  onUpdateRow: (id: string, patch: Partial<Omit<OrganizerRow, 'id'>>) => void
}

function RowHeader({ row, count, onUpdateRow }: RowHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(row.name)

  const commitName = () => {
    setEditing(false)
    const trimmed = name.trim()
    if (trimmed && trimmed !== row.name) {
      onUpdateRow(row.id, { name: trimmed })
    } else {
      setName(row.name)
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/60 sticky top-0 z-10">
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: row.color }}
      />
      {editing ? (
        <input
          autoFocus
          className="flex-1 bg-transparent text-xs text-white border-b border-zinc-500 outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitName()
            if (e.key === 'Escape') { setEditing(false); setName(row.name) }
          }}
        />
      ) : (
        <button
          className="flex-1 text-left text-xs font-semibold text-zinc-300 hover:text-white truncate"
          onDoubleClick={() => setEditing(true)}
          title="Doble click para editar"
        >
          {row.name}
        </button>
      )}
      <span className="text-[10px] text-zinc-500 shrink-0">{count}</span>
    </div>
  )
}

interface ClipCardProps {
  clip: OrganizerClip
  isSelected: boolean
  onSelect: () => void
  onRemove: (id: string) => void
  onOpenInStudio: (sourceId: string) => void
  onSeekTo: (time: number) => void
}

function ClipCard({
  clip,
  isSelected,
  onSelect,
  onRemove,
  onOpenInStudio,
  onSeekTo,
}: ClipCardProps) {
  return (
    <div
      className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors text-xs ${
        isSelected
          ? 'bg-zinc-700 ring-1 ring-white/20'
          : 'bg-zinc-800 hover:bg-zinc-700'
      }`}
      onClick={() => { onSelect(); onSeekTo(clip.startTime) }}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: clip.color }}
      />
      <span className="flex-1 truncate text-zinc-200">{clip.title}</span>
      <span className="text-zinc-500 font-mono shrink-0 text-[10px]">
        {formatTime(clip.startTime)}–{formatTime(clip.endTime)}
      </span>

      {/* Hover actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          className="text-zinc-400 hover:text-white p-0.5 rounded"
          title="Abrir en Studio"
          onClick={(e) => {
            e.stopPropagation()
            onOpenInStudio(clip.sourceId)
          }}
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          className="text-zinc-400 hover:text-red-400 p-0.5 rounded"
          title="Eliminar"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(clip.id)
          }}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

export function OrganizerWindow({
  videoSrc,
  onOpenInStudio,
  onSeekTo,
}: OrganizerWindowProps) {
  const { clips, rows, addRow, updateRow, removeClip } = useOrganizerStore()
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)

  const selectedClip = clips.find((c) => c.id === selectedClipId) ?? null

  if (clips.length === 0 && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <p className="text-zinc-500 text-sm">
          No hay clips. Añadí clips desde la línea de tiempo.
        </p>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
          onClick={() => addRow('Sin categoría', '#6366f1')}
        >
          <Plus className="w-3 h-3" />
          Añadir fila
        </button>
      </div>
    )
  }

  // Group clips by row (ordered by row order, then by addedAt)
  const clipsWithoutRow = clips.filter(
    (c) => !rows.some((r) => r.id === c.rowId)
  )

  return (
    <div className="flex h-full bg-[#111] overflow-hidden">
      {/* Left panel: clip list */}
      <div className="flex flex-col w-1/2 min-w-0 border-r border-white/10 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 && clipsWithoutRow.length === 0 && (
            <div className="flex items-center justify-center h-full text-zinc-500 text-xs p-4 text-center">
              No hay clips. Añadí clips desde la línea de tiempo.
            </div>
          )}

          {/* Rows */}
          {rows.map((row) => {
            const rowClips = clips
              .filter((c) => c.rowId === row.id)
              .sort((a, b) => a.addedAt - b.addedAt)

            return (
              <div key={row.id} className="border-b border-white/5 last:border-b-0">
                <RowHeader row={row} count={rowClips.length} onUpdateRow={updateRow} />
                <div className="flex flex-col gap-1 p-2">
                  {rowClips.length === 0 ? (
                    <p className="text-zinc-600 text-[10px] text-center py-2">
                      Sin clips en esta fila
                    </p>
                  ) : (
                    rowClips.map((clip) => (
                      <ClipCard
                        key={clip.id}
                        clip={clip}
                        isSelected={selectedClipId === clip.id}
                        onSelect={() => setSelectedClipId(clip.id)}
                        onRemove={removeClip}
                        onOpenInStudio={onOpenInStudio}
                        onSeekTo={onSeekTo}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}

          {/* Orphan clips (rowId not matching any row) */}
          {clipsWithoutRow.length > 0 && (
            <div className="border-b border-white/5">
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/40">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-500 shrink-0" />
                <span className="text-xs text-zinc-400">Sin categoría</span>
                <span className="text-[10px] text-zinc-500">{clipsWithoutRow.length}</span>
              </div>
              <div className="flex flex-col gap-1 p-2">
                {clipsWithoutRow.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    isSelected={selectedClipId === clip.id}
                    onSelect={() => setSelectedClipId(clip.id)}
                    onRemove={removeClip}
                    onOpenInStudio={onOpenInStudio}
                    onSeekTo={onSeekTo}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer: add row */}
        <div className="shrink-0 px-3 py-2 border-t border-white/10">
          <button
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-[#27272a] hover:bg-zinc-700 text-white/60 hover:text-white text-xs transition-colors"
            onClick={() => addRow('Nueva fila', '#6366f1')}
          >
            <Plus className="w-3 h-3" />
            Añadir fila
          </button>
        </div>
      </div>

      {/* Right panel: mini video preview */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <MiniPlayer videoSrc={videoSrc} clip={selectedClip} />
      </div>
    </div>
  )
}
