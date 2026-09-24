'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BookmarkPlus, ChevronLeft, ChevronRight, Send, Trash2, X } from 'lucide-react'
import { VideoPlayer, type VideoPlayerHandle } from './VideoPlayer'
import type { CodeButton, CodeEvent } from './types'
import { clipDisplayTitle, type DeskPlaylist } from './videoDesk'
import { formatTime } from './utils'
import { isTypingTarget } from './videoJog'

export type ClipStagePlaylist = DeskPlaylist

function StageNameField({
  clip,
  button,
  onRename,
}: {
  clip: CodeEvent
  button?: CodeButton | null
  onRename?: (clip: CodeEvent, title: string) => void
}) {
  const shown = clipDisplayTitle(clip, button)
  const [draft, setDraft] = useState(shown)
  useEffect(() => { setDraft(shown) }, [clip.id, shown])
  const commit = () => {
    const next = draft.trim()
    if (next && next !== shown) onRename?.(clip, next)
    else setDraft(shown)
  }
  return (
    <input
      className="vd-stage-name"
      aria-label="Nombre del recorte"
      value={draft}
      title="Este nombre es el que verás en el organizador"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          ;(e.target as HTMLInputElement).blur()
        }
      }}
    />
  )
}

export function VideoDeskClipStage({
  src,
  buttons,
  playlist,
  onClose,
  revisionIds = [],
  onSelect,
  onRename,
  onToggleRevision,
  onSendRevision,
  onDelete,
}: {
  src: string
  buttons: CodeButton[]
  playlist: ClipStagePlaylist
  revisionIds?: string[]
  onClose: () => void
  onSelect?: (clip: CodeEvent) => void
  onRename?: (clip: CodeEvent, title: string) => void
  onToggleRevision?: (clip: CodeEvent) => void
  onSendRevision?: () => void
  onDelete?: (clip: CodeEvent) => void
}) {
  const playerRef = useRef<VideoPlayerHandle>(null)
  const clips = playlist.clips
  const startIndex = Math.max(0, clips.findIndex((c) => c.id === playlist.startId))
  const [index, setIndex] = useState(startIndex < 0 ? 0 : startIndex)
  const clip = clips[index]
  const button = clip ? buttons.find((b) => b.id === clip.buttonId) : null
  const marked = clip ? revisionIds.includes(clip.id) : false
  const markedCount = clips.filter((c) => revisionIds.includes(c.id)).length
  const holdRef = useRef<number | null>(null)

  const range = useMemo(
    () => (clip ? { start: clip.startTime, end: clip.endTime } : undefined),
    [clip]
  )

  useEffect(() => {
    const next = clips.findIndex((c) => c.id === playlist.startId)
    setIndex((curr) => {
      if (next >= 0) return next
      if (curr >= clips.length) return Math.max(0, clips.length - 1)
      return curr
    })
  }, [clips, playlist.startId])

  useEffect(() => {
    if (!clip) return
    onSelect?.(clip)
    holdRef.current = clip.endTime
    playerRef.current?.seekTo(clip.startTime)
    playerRef.current?.play()
  }, [clip, onSelect])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (e.key !== ' ') return
      e.preventDefault()
      const video = playerRef.current?.getVideoElement()
      if (video?.paused) playerRef.current?.play()
      else playerRef.current?.pause()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const playAt = (next: number) => {
    if (!clips.length) return
    setIndex((next + clips.length) % clips.length)
  }

  if (!clip) {
    return (
      <div className="vd-modal" role="dialog" aria-label="Reproductor de recortes">
        <button type="button" className="vd-modal-backdrop" aria-label="Cerrar" onClick={onClose} />
        <div className="vd-stage">
          <p className="vd-empty">No hay recortes en esta línea</p>
        </div>
      </div>
    )
  }

  return (
    <div className="vd-modal" role="dialog" aria-label="Reproductor de recortes">
      <button type="button" className="vd-modal-backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className="vd-stage">
        <header className="vd-stage-head">
          <div className="vd-stage-head-copy">
            <StageNameField clip={clip} button={button} onRename={onRename} />
            <div className="vd-header-meta">
              {playlist.title} · {index + 1}/{clips.length} · {formatTime(clip.startTime)}–{formatTime(clip.endTime)} · ←/→ fotograma
            </div>
          </div>
          <div className="vd-stage-head-actions">
            {onToggleRevision ? (
              <button
                type="button"
                className={`vd-btn${marked ? ' vd-btn-accent' : ''}`}
                aria-pressed={marked}
                title={marked ? 'Quitar este recorte de la lista de revisión' : 'Marcar este recorte para enviarlo a revisión'}
                onClick={() => onToggleRevision(clip)}
              >
                <BookmarkPlus size={14} />
                {marked ? 'Quitar de revisión' : 'Marcar a revisión'}
              </button>
            ) : null}
            <button
              type="button"
              className="vd-btn vd-btn-accent"
              disabled={!onSendRevision || markedCount === 0}
              title={markedCount === 0 ? 'Marca recortes mientras los ves' : onSendRevision ? `Enviar ${markedCount} recortes marcados` : 'Asocia un partido para enviar a Revisión'}
              onClick={() => onSendRevision?.()}
            >
              <Send size={14} />
              {markedCount > 0 ? `Enviar marcados (${markedCount})` : 'Enviar marcados'}
            </button>
            {onDelete ? (
              <button
                type="button"
                className="vd-btn vd-btn-danger"
                title="Eliminar recorte (⌫ en Mac, Supr en Windows)"
                onClick={() => onDelete(clip)}
              >
                <Trash2 size={14} />
                Eliminar recorte
              </button>
            ) : null}
            <button type="button" className="vd-btn vd-btn-ghost" onClick={onClose}>
              <X size={14} />
              Cerrar
            </button>
          </div>
        </header>
        <div className="vd-stage-player">
          <VideoPlayer
            ref={playerRef}
            src={src}
            clipRange={range}
            fillFrame
            onTimeUpdate={(time) => {
              const end = holdRef.current
              if (end != null && time >= end - 0.05) {
                if (index + 1 < clips.length) playAt(index + 1)
                else playerRef.current?.pause()
              }
            }}
          />
        </div>
        <div className="vd-stage-nav">
          <button type="button" className="vd-btn" onClick={() => playAt(index - 1)} disabled={clips.length < 2}>
            <ChevronLeft size={14} />
            Anterior
          </button>
          <ol className="vd-stage-list">
            {clips.map((c, i) => {
              const btn = buttons.find((b) => b.id === c.buttonId)
              return (
                <li key={c.id} className={`vd-stage-item${revisionIds.includes(c.id) ? ' is-revision' : ''}`}>
                  <button
                    type="button"
                    className={`${i === index ? 'is-on' : ''}${revisionIds.includes(c.id) ? ' is-revision' : ''}`}
                    onClick={() => setIndex(i)}
                  >
                    {clipDisplayTitle(c, btn)}
                  </button>
                  {onDelete ? (
                    <button
                      type="button"
                      className="vd-clip-delete"
                      aria-label={`Eliminar ${clipDisplayTitle(c, btn)}`}
                      title="Eliminar recorte"
                      onClick={() => onDelete(c)}
                    >
                      <Trash2 size={12} />
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ol>
          <button type="button" className="vd-btn" onClick={() => playAt(index + 1)} disabled={clips.length < 2}>
            Siguiente
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
