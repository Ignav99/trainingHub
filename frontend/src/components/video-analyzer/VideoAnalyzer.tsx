'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Send, Trash2, X } from 'lucide-react'
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
import { isClipDeleteKey, isSkipRebindActive, isTypingTarget, loadSkipKeys, skipDeltaForKey } from './videoJog'
import type { BotoneraEditGate } from './VideoDeskBotonera'
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
  const botoneraEditRef = useRef<BotoneraEditGate>({ on: false, cancel: () => {} })
  const currentTimeRef = useRef(0)
  const rangeArmRef = useRef<{ buttonId: string; startTime: number } | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [railWidth, setRailWidth] = useState(360)
  const [cintaHeight, setCintaHeight] = useState(168)
  const [botoneraPct, setBotoneraPct] = useState(46)
  const railRef = useRef<HTMLElement | null>(null)
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
  const reorderLanes = useCodeWindowStore((s) => s.reorderLanes)
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
  const selectedClipIdRef = useRef<string | null>(null)
  const selectedClipIdsRef = useRef<string[]>([])
  const stageRef = useRef<ClipStagePlaylist | null>(null)
  selectedClipIdRef.current = selectedClipId
  selectedClipIdsRef.current = selectedClipIds
  stageRef.current = stage
  const selectedClip = events.find((e) => e.id === selectedClipId) || null
  const sendClip = events.find((e) => e.id === sendClipId) || null
  const sendButton = sendClip ? buttons.find((b) => b.id === sendClip.buttonId) : null
  const revisionClips = (selectedClipIds.length ? selectedClipIds : (selectedClipId ? [selectedClipId] : []))
    .map((id) => events.find((e) => e.id === id))
    .filter((e): e is CodeEvent => !!e)
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
    setStage({ title, clips, startId: startId || clips[0].id })
  }, [])

  const playClip = useCallback((clip: CodeEvent) => {
    const btn = buttons.find((b) => b.id === clip.buttonId)
    setSelectedLaneId(null)
    openClipStage([clip], clipDisplayTitle(clip, btn), clip.id)
  }, [buttons, openClipStage])

  const selectClip = useCallback((clip: CodeEvent, opts?: { toggle?: boolean }) => {
    setSelectedLaneId(null)
    setActiveButtonId(clip.buttonId)
    if (opts?.toggle) {
      setSelectedClipIds((prev) => {
        const base = prev.length ? prev : []
        const next = base.includes(clip.id) ? base.filter((id) => id !== clip.id) : [...base, clip.id]
        setSelectedClipId(next.includes(clip.id) ? clip.id : (next[next.length - 1] ?? null))
        return next
      })
      return
    }
    setSelectedClipId(clip.id)
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
    setSelectedClipIds((ids) => ids.filter((id) => !unique.includes(id)))
    if (nextStage) {
      const nextId = nextStage.startId || nextStage.clips[0].id
      setSelectedClipId(nextId)
    } else {
      setSelectedClipId((curr) => (curr && unique.includes(curr) ? null : curr))
    }
    toast.success(unique.length > 1 ? `${unique.length} recortes eliminados` : 'Recorte eliminado')
  }, [removeEvent, stage, videoKey])

  const toggleRevision = useCallback((clip: CodeEvent) => {
    setSelectedClipIds((prev) => (
      prev.includes(clip.id) ? prev.filter((id) => id !== clip.id) : [...prev, clip.id]
    ))
  }, [])

  const handleStageSelect = useCallback((clip: CodeEvent) => {
    setSelectedClipId(clip.id)
    setActiveButtonId(clip.buttonId)
    setStage((prev) => (prev && prev.startId !== clip.id ? { ...prev, startId: clip.id } : prev))
  }, [setActiveButtonId])

  const deleteSelectedClips = useCallback(() => {
    const playingId = stageRef.current?.startId || selectedClipIdRef.current
    deleteClips(idsForKeyboardClipDelete(playingId, playingId ? [] : selectedClipIdsRef.current))
  }, [deleteClips])

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
      setSelectedLaneId(null)
      toast.success(`${btn.label} · inicio/fin`)
      return
    }
    rangeArmRef.current = null
    setArmedButtonId(null)
    const event = recordEvent(btn.id, now, videoDur)
    setSelectedClipId(event.id)
    setSelectedLaneId(null)
    toast.success(`${btn.label} · ${timingsLabel(btn)}`)
  }, [duration, recordEvent, setActiveButtonId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (botoneraEditRef.current.on) {
        e.preventDefault()
        return
      }
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
      if (isClipDeleteKey(e)) {
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
      if (isSkipRebindActive()) return
      const skip = skipDeltaForKey(e.key, loadSkipKeys())
      if (skip != null) {
        e.preventDefault()
        if (!e.repeat) playerRef.current?.seekBy(skip)
        return
      }
      const btn = buttons.find((b) => b.shortcut === e.key.toLowerCase())
      if (btn) {
        e.preventDefault()
        pressButton(btn)
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [armedButtonId, buttons, deleteSelectedClips, onClose, pressButton, stage])

  const patchClip = useCallback((clip: CodeEvent, startTime: number, endTime: number) => {
    updateEvent(videoKey, clip.id, { startTime, endTime }, duration)
  }, [duration, updateEvent, videoKey])

  const renameClip = useCallback((clip: CodeEvent, title: string) => {
    const next = title.trim()
    if (!next) return
    updateEvent(videoKey, clip.id, { title: next }, duration)
    setStage((prev) => (
      prev
        ? { ...prev, clips: prev.clips.map((c) => (c.id === clip.id ? { ...c, title: next } : c)) }
        : prev
    ))
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

  const onRailSplit = (e: React.PointerEvent) => {
    const rail = railRef.current
    if (!rail) return
    const rect = rail.getBoundingClientRect()
    const move = (ev: PointerEvent) => {
      const y = ev.clientY - rect.top
      const pct = (y / Math.max(1, rect.height)) * 100
      setBotoneraPct(Math.max(22, Math.min(78, pct)))
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
      style={{
        ['--vd-rail' as string]: `${railWidth}px`,
        ['--vd-cinta' as string]: `${cintaHeight}px`,
        ['--vd-botonera' as string]: `${botoneraPct}%`,
      }}
    >
      <header className="vd-header">
        <button type="button" className="vd-btn vd-btn-ghost" onClick={onClose}>
          <X size={14} />
          Cerrar
        </button>
        <div style={{ minWidth: 0 }}>
          <div className="vd-header-title">{title}</div>
          <div className="vd-header-meta">{events.length} recortes · ←/→ fotograma · mantén para acelerar · ⌫ borra · el archivo se queda en el PC</div>
        </div>
        <div className="vd-header-actions">
          <VideoDeskDownloadMenu disabled={!events.length} onPick={(kind) => void runDownload(kind)} />
          <button
            type="button"
            className="vd-btn vd-btn-danger"
            disabled={!selectedClip}
            title="Eliminar recorte (⌫ o Supr)"
            onClick={() => selectedClip && deleteClips([selectedClip.id])}
          >
            <Trash2 size={14} />
            Eliminar
          </button>
          <button
            type="button"
            className="vd-btn vd-btn-accent"
            disabled={revisionClips.length === 0 || !canSendToRevision}
            title={!canSendToRevision ? 'Asocia un partido para enviar a Revisión' : 'Enviar los recortes marcados en el previsualizador o con ⌘+clic.'}
            onClick={() => revisionClips[0] && setSendClipId(revisionClips[0].id)}
          >
            <Send size={14} />
            {revisionClips.length > 1 ? `A revisión (${revisionClips.length})` : 'A revisión'}
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

        <aside ref={railRef} className="vd-rail">
          <div className="vd-rail-botonera">
            <VideoDeskBotonera
              buttons={buttons}
              activeButtonId={activeButtonId}
              armedButtonId={armedButtonId}
              onPress={pressButton}
              onAdd={addButton}
              onUpdate={updateButton}
              onRemove={removeButton}
              editGateRef={botoneraEditRef}
            />
          </div>
          <div
            className="vd-rail-split"
            onPointerDown={onRailSplit}
            role="separator"
            aria-orientation="horizontal"
            aria-label="Repartir botonera y organizador"
            title="Arrastra para variar el espacio"
          />
          <div className="vd-rail-organizer">
            <div className="vd-section-label">Organizador</div>
            <VideoDeskFolders
              buttons={buttons}
              events={events}
              selectedClipId={selectedClipId}
              selectedClipIds={selectedClipIds}
              selectedLaneId={selectedLaneId}
              onSelectClip={selectClip}
              onPlayClip={playClip}
              onPlayLane={playLane}
              onDeleteClip={(clip) => deleteClips([clip.id])}
              onRenameClip={renameClip}
            />
          </div>
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
        onReorderLanes={(laneIds) => reorderLanes(videoKey, laneIds)}
        onPlayClip={playClip}
        onTrim={patchClip}
      />

      {stage && src ? (
        <VideoDeskClipStage
          src={src}
          buttons={buttons}
          playlist={stage}
          onClose={() => setStage(null)}
          revisionIds={selectedClipIds}
          onSelect={handleStageSelect}
          onRename={renameClip}
          onToggleRevision={toggleRevision}
          onSendRevision={canSendToRevision && selectedClipIds.length > 0 ? () => setSendClipId(selectedClipIds[0]) : undefined}
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
          clips={revisionClips.map((clip) => ({
            title: clipDisplayTitle(clip, buttons.find((b) => b.id === clip.buttonId)),
            startTime: clip.startTime,
            endTime: clip.endTime,
          }))}
          sourceVideoId={videoId}
          preferredFase={sendButton?.fase}
        />
      ) : null}
    </div>
  )
}
