'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Send, X } from 'lucide-react'
import { VideoPlayer, type VideoPlayerHandle } from './VideoPlayer'
import { useCodeWindowStore } from './useCodeWindowStore'
import { SendToRevisionDialog } from '@/components/revision/SendToRevisionDialog'
import { VideoDeskBotonera } from './VideoDeskBotonera'
import { VideoDeskFolders } from './VideoDeskFolders'
import { VideoDeskTimeline } from './VideoDeskTimeline'
import { VideoDeskDownloadMenu } from './VideoDeskDownloadMenu'
import { extractAndDownloadDeskClips, type DeskDownloadKind } from './videoDeskDownload'
import { clipDisplayTitle } from './videoDesk'
import type { CodeButton, CodeEvent } from './types'
import './video-desk.css'

interface VideoAnalyzerProps {
  localFile?: File
  videoUrl?: string
  videoTitle?: string
  partidoId: string
  equipoId: string
  videoId?: string
  rivalId?: string
  onClose: () => void
}

export function VideoAnalyzer({
  localFile,
  videoUrl,
  videoTitle,
  partidoId,
  equipoId,
  videoId,
  rivalId,
  onClose,
}: VideoAnalyzerProps) {
  const playerRef = useRef<VideoPlayerHandle>(null)
  const currentTimeRef = useRef(0)
  const clipHoldRef = useRef<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [railWidth, setRailWidth] = useState(360)
  const [cintaHeight, setCintaHeight] = useState(168)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [sendClipId, setSendClipId] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState('')

  const buttons = useCodeWindowStore((s) => s.buttons)
  const activeButtonId = useCodeWindowStore((s) => s.activeButtonId)
  const setCodeVideoKey = useCodeWindowStore((s) => s.setCurrentVideoKey)
  const recordEvent = useCodeWindowStore((s) => s.recordEvent)
  const updateEvent = useCodeWindowStore((s) => s.updateEvent)
  const removeEvent = useCodeWindowStore((s) => s.removeEvent)
  const addButton = useCodeWindowStore((s) => s.addButton)
  const updateButton = useCodeWindowStore((s) => s.updateButton)
  const removeButton = useCodeWindowStore((s) => s.removeButton)
  const setActiveButtonId = useCodeWindowStore((s) => s.setActiveButtonId)
  const events = useCodeWindowStore((s) => {
    const key = s.currentVideoKey || '_default'
    return s.events[key] || []
  })

  const videoKey = partidoId || (localFile?.name ?? '_local')

  useEffect(() => {
    setCodeVideoKey(videoKey)
  }, [videoKey, setCodeVideoKey])

  useEffect(() => {
    if (!localFile) {
      setObjectUrl('')
      return
    }
    const url = URL.createObjectURL(localFile)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [localFile])

  const src = localFile ? objectUrl : (videoUrl || '')
  const title = videoTitle || localFile?.name || 'Video local'
  const selectedClip = events.find((e) => e.id === selectedClipId) || null
  const sendClip = events.find((e) => e.id === sendClipId) || null
  const sendButton = sendClip ? buttons.find((b) => b.id === sendClip.buttonId) : null

  const seekTo = useCallback((time: number) => {
    playerRef.current?.seekTo(time)
    currentTimeRef.current = time
    setCurrentTime(time)
  }, [])

  const handleTimeUpdate = useCallback((time: number) => {
    currentTimeRef.current = time
    setCurrentTime(time)
    const hold = clipHoldRef.current
    if (hold != null && time >= hold) {
      clipHoldRef.current = null
      playerRef.current?.pause()
    }
  }, [])

  const playClip = useCallback((clip: CodeEvent) => {
    setSelectedClipId(clip.id)
    clipHoldRef.current = clip.endTime
    seekTo(clip.startTime)
    playerRef.current?.play()
  }, [seekTo])

  const pressButton = useCallback((btn: CodeButton) => {
    const videoDur = duration || playerRef.current?.getVideoElement()?.duration || 0
    const event = recordEvent(btn.id, currentTimeRef.current, videoDur)
    setSelectedClipId(event.id)
    toast.success(`${btn.label} · −${btn.preRoll}s / +${btn.postRoll}s`)
  }, [duration, recordEvent])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === ' ') {
        e.preventDefault()
        const video = playerRef.current?.getVideoElement()
        if (video?.paused) playerRef.current?.play()
        else playerRef.current?.pause()
        return
      }
      const btn = buttons.find((b) => b.shortcut === e.key.toLowerCase())
      if (btn) {
        e.preventDefault()
        pressButton(btn)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [buttons, onClose, pressButton])

  useEffect(() => {
    const el = playerRef.current?.getVideoElement()?.parentElement
    const stage = el?.closest('.vd-monitor-stage') as HTMLElement | null
    if (!stage) return
    const handler = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5 && Math.abs(e.deltaX) > 5) {
        e.preventDefault()
        const next = Math.max(0, Math.min(duration, currentTimeRef.current + (e.deltaX / 80) * 3))
        seekTo(next)
      }
    }
    stage.addEventListener('wheel', handler, { passive: false })
    return () => stage.removeEventListener('wheel', handler)
  }, [duration, seekTo])

  const patchClip = useCallback((clip: CodeEvent, startTime: number, endTime: number) => {
    updateEvent(videoKey, clip.id, { startTime, endTime }, duration)
  }, [duration, updateEvent, videoKey])

  const runDownload = useCallback(async (kind: DeskDownloadKind, clip?: CodeEvent) => {
    const video = playerRef.current?.getVideoElement()
    if (!video) {
      toast.error('No hay vídeo cargado')
      return
    }
    const target = clip || selectedClip
    try {
      setProgress('Recortando…')
      await extractAndDownloadDeskClips({
        video,
        kind,
        clips: events,
        buttons,
        selectedClipId: target?.id,
        selectedButtonId: target?.buttonId || activeButtonId,
        matchLabel: title.replace(/\.[^.]+$/, ''),
        onProgress: setProgress,
      })
      toast.success('Descarga lista. El partido no ha salido de este ordenador.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo descargar')
    } finally {
      setProgress(null)
    }
  }, [activeButtonId, buttons, events, selectedClip, title])

  const onVSplit = (e: React.PointerEvent) => {
    const startX = e.clientX
    const startW = railWidth
    const move = (ev: PointerEvent) => {
      setRailWidth(Math.max(280, Math.min(560, startW - (ev.clientX - startX))))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const onHSplit = (e: React.PointerEvent) => {
    const startY = e.clientY
    const startH = cintaHeight
    const move = (ev: PointerEvent) => {
      setCintaHeight(Math.max(96, Math.min(360, startH - (ev.clientY - startY))))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      className="vd-root"
      style={{ ['--vd-rail' as string]: `${railWidth}px`, ['--vd-cinta' as string]: `${cintaHeight}px` }}
    >
      <header className="vd-header">
        <button type="button" className="vd-btn vd-btn-ghost" onClick={onClose}>
          <X size={14} />
          Cerrar
        </button>
        <div style={{ minWidth: 0 }}>
          <div className="vd-header-title">{title}</div>
          <div className="vd-header-meta">{events.length} recortes · el partido se queda en el PC</div>
        </div>
        <div className="vd-header-actions">
          <VideoDeskDownloadMenu disabled={!events.length} onPick={(kind) => void runDownload(kind)} />
          <button
            type="button"
            className="vd-btn vd-btn-accent"
            disabled={!selectedClip}
            onClick={() => selectedClip && setSendClipId(selectedClip.id)}
          >
            <Send size={14} />
            A revisión
          </button>
        </div>
      </header>

      <div className="vd-body">
        <div className="vd-monitor">
          <div className="vd-monitor-stage">
            {src ? (
              <VideoPlayer
                ref={playerRef}
                src={src}
                fillFrame
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={setDuration}
                onSeeked={(t) => {
                  currentTimeRef.current = t
                  setCurrentTime(t)
                }}
              />
            ) : null}
            {progress ? <div className="vd-progress">{progress}</div> : null}
          </div>
        </div>

        <div className="vd-vsplit" onPointerDown={onVSplit} role="separator" aria-orientation="vertical" />

        <aside className="vd-rail">
          <div className="vd-section-label">Botonera</div>
          <VideoDeskBotonera
            buttons={buttons}
            activeButtonId={activeButtonId}
            onPress={pressButton}
            onAdd={addButton}
            onUpdate={updateButton}
            onRemove={removeButton}
          />
          <div className="vd-section-label">Carpetas</div>
          <VideoDeskFolders
            buttons={buttons}
            events={events}
            selectedClipId={selectedClipId}
            onSelect={(clip) => {
              setSelectedClipId(clip.id)
              setActiveButtonId(clip.buttonId)
              seekTo(clip.startTime)
            }}
            onPlay={playClip}
            onRename={(clip, title) => updateEvent(videoKey, clip.id, { title })}
            onNudge={(clip, edge, delta) => {
              if (edge === 'start') patchClip(clip, clip.startTime + delta, clip.endTime)
              else patchClip(clip, clip.startTime, clip.endTime + delta)
            }}
            onDownload={(clip) => void runDownload('clip', clip)}
            onSend={(clip) => setSendClipId(clip.id)}
            onDelete={(clip) => {
              removeEvent(videoKey, clip.id)
              if (selectedClipId === clip.id) setSelectedClipId(null)
            }}
          />
        </aside>
      </div>

      <div className="vd-hsplit" onPointerDown={onHSplit} role="separator" aria-orientation="horizontal" />

      <VideoDeskTimeline
        buttons={buttons}
        events={events}
        duration={duration}
        currentTime={currentTime}
        selectedClipId={selectedClipId}
        onSeek={seekTo}
        onSelect={(clip) => {
          setSelectedClipId(clip.id)
          setActiveButtonId(clip.buttonId)
        }}
        onTrim={patchClip}
      />

      {sendClip ? (
        <SendToRevisionDialog
          open
          onOpenChange={(v) => { if (!v) setSendClipId(null) }}
          equipoId={equipoId}
          partidoId={partidoId}
          rivalId={rivalId}
          videoElement={playerRef.current?.getVideoElement() || null}
          clipTitle={clipDisplayTitle(sendClip, sendButton)}
          startTime={sendClip.startTime}
          endTime={sendClip.endTime}
          sourceVideoId={videoId}
          preferredFase={sendButton?.fase}
        />
      ) : null}
    </div>
  )
}
