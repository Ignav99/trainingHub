'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react'
import { VideoPlayer, type VideoPlayerHandle } from './VideoPlayer'
import type { CodeButton, CodeEvent } from './types'
import { clipDisplayTitle } from './videoDesk'
import { formatTime } from './utils'
import { isTypingTarget } from './videoJog'

export type ClipStagePlaylist = {
  title: string
  clips: CodeEvent[]
  startId?: string
}

export function VideoDeskClipStage({
  src,
  buttons,
  playlist,
  onClose,
  onSelect,
  onDelete,
}: {
  src: string
  buttons: CodeButton[]
  playlist: ClipStagePlaylist
  onClose: () => void
  onSelect?: (clip: CodeEvent) => void
  onDelete?: (clip: CodeEvent) => void
}) {
  const playerRef = useRef<VideoPlayerHandle>(null)
  const clips = playlist.clips
  const startIndex = Math.max(0, clips.findIndex((c) => c.id === playlist.startId))
  const [index, setIndex] = useState(startIndex < 0 ? 0 : startIndex)
  const clip = clips[index]
  const button = clip ? buttons.find((b) => b.id === clip.buttonId) : null
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
          <div>
            <div className="vd-header-title">{clipDisplayTitle(clip, button)}</div>
            <div className="vd-header-meta">
              {playlist.title} · {index + 1}/{clips.length} · {formatTime(clip.startTime)}–{formatTime(clip.endTime)} · ←/→ 5 s · Supr borra
            </div>
          </div>
          {onDelete ? (
            <button
              type="button"
              className="vd-btn vd-btn-ghost"
              title="Eliminar recorte (Supr)"
              onClick={() => onDelete(clip)}
            >
              <Trash2 size={14} />
              Eliminar
            </button>
          ) : null}
          <button type="button" className="vd-btn vd-btn-ghost" onClick={onClose}>
            <X size={14} />
            Cerrar
          </button>
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
                <li key={c.id}>
                  <button
                    type="button"
                    className={i === index ? 'is-on' : ''}
                    onClick={() => setIndex(i)}
                  >
                    {clipDisplayTitle(c, btn)}
                  </button>
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
