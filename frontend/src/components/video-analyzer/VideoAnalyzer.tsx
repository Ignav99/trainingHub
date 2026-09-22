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
import { VideoDeskClipStage, type ClipStagePlaylist } from './VideoDeskClipStage'
import { extractAndDownloadDeskClips, type DeskDownloadKind } from './videoDeskDownload'
import {
  clipDisplayTitle,
  clipsOnLane,
  idsForKeyboardClipDelete,
  removeClipsFromPlaylist,
  timingsLabel,
} from './videoDesk'
import { isClipDeleteKey, isTypingTarget } from './videoJog'
import type { CodeButton, CodeEvent } from './types'
import './video-desk.css'

interface VideoAnalyzerProps {
  localFile?: File
  videoUrl?: string
  videoTitle?: string
  partidoId?: string
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
  const rangeArmRef = useRef<{ buttonId: string; startTime: number } | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [railWidth, setRailWidth] = useState(360)
  const [cintaHeight, setCintaHeight] = useState(168)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([])
  const [selectedLaneId, setSelectedLaneId] = useState<string | null>(null)
  const [sendClipId, setSendClipId] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState('')
  const [armedButtonId, setArmedButtonId] = useState<string | null>(null)
  const [stage, setStage] = useState<ClipStagePlaylist | null>(null)

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
  const canSendToRevision = Boolean(partidoId || rivalId)

  const seekTo = useCallback((time: number) => {
    playerRef.current?.seekTo(time)
    currentTimeRef.current = time
    setCurrentTime(time)
  }, [])

  const handleTimeUpdate = useCallback((time: number) => {
    currentTimeRef.current = time
    setCurrentTime(time)
  }, [])

  const openClipStage = useCallback((clips: CodeEvent[], title: string, startId?: string) => {
    if (!clips.length) {
      toast.message(`No hay recortes en ${title}`)
      return
    }
    setSelectedClipId(startId || clips[0].id)
    setSelectedClipIds(clips.map((c) => c.id))
    setStage({ title, clips, startId: startId || clips[0].id })
  }, [])

  const playClip = useCallback((clip: CodeEvent) => {
    const btn = buttons.find((b) => b.id === clip.buttonId)
    setSelectedLaneId(null)
    openClipStage([clip], clipDisplayTitle(clip, btn), clip.id)
  }, [buttons, openClipStage])

  const selectClip = useCallback((clip: CodeEvent) => {
    setSelectedClipId(clip.id)
    setSelectedClipIds([clip.id])
    setSelectedLaneId(null)
    setActiveButtonId(clip.buttonId)
  }, [setActiveButtonId])

  const deleteClips = useCallback((clipIds: string[]) => {
    const unique = Array.from(new Set(clipIds.filter(Boolean)))
    if (!unique.length) {
      toast.message('Clica un recorte y pulsa Supr para borrarlo')
      return
    }
    for (const id of unique) removeEvent(videoKey, id)
    const nextStage = stage ? removeClipsFromPlaylist(stage, unique) : null
    setStage(nextStage)
    if (nextStage) {
      const nextId = nextStage.startId || nextStage.clips[0].id
      setSelectedClipId(nextId)
      setSelectedClipIds(nextStage.clips.map((c) => c.id))
    } else {
      setSelectedClipId((curr) => (curr && unique.includes(curr) ? null : curr))
      setSelectedClipIds((ids) => ids.filter((id) => !unique.includes(id)))
    }
    toast.success(unique.length > 1 ? `${unique.length} recortes eliminados` : 'Recorte eliminado')
  }, [removeEvent, stage, videoKey])

  const handleStageSelect = useCallback((clip: CodeEvent) => {
    selectClip(clip)
    setStage((prev) => (prev && prev.startId !== clip.id ? { ...prev, startId: clip.id } : prev))
  }, [selectClip])

  const deleteSelectedClips = useCallback(() => {
    deleteClips(idsForKeyboardClipDelete(selectedClipId, selectedClipIds))
  }, [deleteClips, selectedClipId, selectedClipIds])

  const playLane = useCallback((buttonId: string) => {
    const clips = clipsOnLane(events, buttonId)
    const btn = buttons.find((b) => b.id === buttonId)
    setSelectedLaneId(buttonId)
    setActiveButtonId(buttonId)
    openClipStage(clips, btn?.label || 'Esta línea')
  }, [buttons, events, openClipStage, setActiveButtonId])

  const pressButton = useCallback((btn: CodeButton) => {
    const videoDur = duration || playerRef.current?.getVideoElement()?.duration || 0
    const now = currentTimeRef.current
    if (btn.captureMode === 'range') {
      const armed = rangeArmRef.current
      if (!armed || armed.buttonId !== btn.id) {
        rangeArmRef.current = { buttonId: btn.id, startTime: now }
        setArmedButtonId(btn.id)
        setActiveButtonId(btn.id)
        toast.message(`${btn.label}: marca el final`)
        return
      }
      const start = Math.min(armed.startTime, now)
      const end = Math.max(armed.startTime, now)
      rangeArmRef.current = null
      setArmedButtonId(null)
      const event = recordEvent(btn.id, now, videoDur, { startTime: start, endTime: end })
      setSelectedClipId(event.id)
      setSelectedClipIds([event.id])
      setSelectedLaneId(null)
      toast.success(`${btn.label} · inicio/fin`)
      return
    }
    rangeArmRef.current = null
    setArmedButtonId(null)
    const event = recordEvent(btn.id, now, videoDur)
    setSelectedClipId(event.id)
    setSelectedClipIds([event.id])
    setSelectedLaneId(null)
    toast.success(`${btn.label} · ${timingsLabel(btn)}`)
  }, [duration, recordEvent, setActiveButtonId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (e.key === 'Escape') {
        e.preventDefault()
        if (stage) {
          setStage(null)
          return
        }
        if (armedButtonId) {
          rangeArmRef.current = null
          setArmedButtonId(null)
          return
        }
        onClose()
        return
      }
      if (isClipDeleteKey(e.key)) {
        e.preventDefault()
        deleteSelectedClips()
        return
      }
      if (e.key === ' ') {
        if (stage) return
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
  }, [armedButtonId, buttons, deleteSelectedClips, onClose, pressButton, stage])

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
        selectedButtonId: selectedLaneId || target?.buttonId || activeButtonId,
        matchLabel: title.replace(/\.[^.]+$/, ''),
        sourceFile: localFile,
        onProgress: setProgress,
      })
      toast.success('Descarga lista. El partido no ha salido de este ordenador.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo descargar')
    } finally {
      setProgress(null)
    }
  }, [activeButtonId, buttons, events, localFile, selectedClip, selectedLaneId, title])

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
          <div className="vd-header-meta">{events.length} recortes · ←/→ 5 s · Mayús fotograma · Supr borra el recorte · el archivo se queda en el PC</div>
        </div>
        <div className="vd-header-actions">
          <VideoDeskDownloadMenu disabled={!events.length} onPick={(kind) => void runDownload(kind)} />
          <button
            type="button"
            className="vd-btn vd-btn-accent"
            disabled={!selectedClip || !canSendToRevision}
            title={!canSendToRevision ? 'Asocia un partido para enviar a Revisión' : 'Enviar recorte'}
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
                keyboardJog={!stage}
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
            armedButtonId={armedButtonId}
            onPress={pressButton}
            onAdd={addButton}
            onUpdate={updateButton}
            onRemove={removeButton}
          />
          <div className="vd-section-label">Líneas</div>
          <VideoDeskFolders
            buttons={buttons}
            events={events}
            selectedClipId={selectedClipId}
            selectedLaneId={selectedLaneId}
            onSelectClip={selectClip}
            onPlayClip={playClip}
            onPlayLane={playLane}
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
        selectedClipIds={selectedClipIds}
        selectedLaneId={selectedLaneId}
        onSeek={seekTo}
        onSelect={selectClip}
        onSelectLane={playLane}
        onPlayClip={playClip}
        onTrim={patchClip}
      />

      {stage && src ? (
        <VideoDeskClipStage
          src={src}
          buttons={buttons}
          playlist={stage}
          onClose={() => setStage(null)}
          onSelect={handleStageSelect}
          onDelete={(clip) => deleteClips([clip.id])}
        />
      ) : null}

      {sendClip && canSendToRevision ? (
        <SendToRevisionDialog
          open
          onOpenChange={(v) => { if (!v) setSendClipId(null) }}
          equipoId={equipoId}
          partidoId={partidoId}
          rivalId={rivalId}
          videoElement={playerRef.current?.getVideoElement() || null}
          sourceFile={localFile}
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
