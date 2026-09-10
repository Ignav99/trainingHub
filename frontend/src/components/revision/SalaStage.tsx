'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  VolumeX,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import {
  clipPlaySrc,
  revisionApi,
  type RevisionClip,
  type RevisionSession,
} from '@/lib/api/revision'
import { trainingHubWsUrl } from '@/lib/wsUrl'
import { VideoPlayer, VIDEO_PLAYER_CHROME_CLASS, type VideoPlayerHandle } from '@/components/video-analyzer/VideoPlayer'
import { DrawingOverlay } from '@/components/video-analyzer/DrawingOverlay'
import { useDrawingEngine } from '@/components/video-analyzer/useDrawingEngine'
import { useUndoRedo } from '@/components/video-analyzer/useUndoRedo'
import type { DrawingTool } from '@/components/video-analyzer/types'
import type { DrawingElement } from '@/types'
import { Button } from '@/components/ui/button'
import { SalaClipTree } from './SalaClipTree'
import { SalaZoomCatcher } from './SalaZoomCatcher'
import { SalaFloatingChrome, SalaReviewBar, WhiteboardBar } from './salaChrome'
import { useSalaVideoShare } from './useSalaVideoShare'
import {
  IDENTITY_ZOOM,
  JOG_SECONDS,
  REPEAT_SECONDS,
  clampZoom,
  isIdentityZoom,
  zoomAt,
  zoomCss,
  type ZoomState,
} from '@/lib/videoZoom'

interface SalaStageProps {
  code: string
  role: 'host' | 'tablet'
  initialSession?: RevisionSession | null
  onClose?: () => void
}

export function SalaStage({ code, role, initialSession, onClose }: SalaStageProps) {
  const isHost = role === 'host'
  const equipoActivo = useEquipoStore((s) => s.equipoActivo)
  const accessToken = useAuthStore((s) => s.accessToken)

  const [session, setSession] = useState<RevisionSession | null>(initialSession || null)
  const [loading, setLoading] = useState(!initialSession)
  const [peerReady, setPeerReady] = useState(!isHost)
  const [wsOk, setWsOk] = useState(false)
  const [tool, setTool] = useState<DrawingTool>('freehand')
  const [color, setColor] = useState('#f97316')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [fillOpacity, setFillOpacity] = useState(0.22)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mediaError, setMediaError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [foldersOpen, setFoldersOpen] = useState(false)
  const [zoomMode, setZoomMode] = useState(false)
  const [zoom, setZoom] = useState<ZoomState>(IDENTITY_ZOOM)
  const skipOverlaySend = useRef(true)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  const rootRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<VideoPlayerHandle>(null)
  const applyingRemote = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)
  const leaderRef = useRef(false)
  const sessionRef = useRef<RevisionSession | null>(session)
  sessionRef.current = session

  const { elements, setElements: pushElements, undo, canUndo, reset } = useUndoRedo(
    Array.isArray(initialSession?.overlay_json) ? (initialSession.overlay_json as DrawingElement[]) : [],
  )
  const { preview, handlePointerDown, handlePointerMove, handlePointerUp, clearAll } = useDrawingEngine({
    elements,
    setElements: pushElements,
    color,
    strokeWidth,
    fillOpacity,
    tool,
    selectedId,
    setSelectedId,
  })

  useEffect(() => {
    if (initialSession) return
    let cancelled = false
    revisionApi.getSession(code)
      .then((s) => { if (!cancelled) setSession(s) })
      .catch(() => { if (!cancelled) toast.error('Sala no encontrada') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [code, initialSession])

  const currentClip: RevisionClip | null =
    session?.current_clip
    || session?.pack?.clips.find((c) => c.id === session.current_clip_id)
    || null
  const playSrc = clipPlaySrc(currentClip)

  const sendSync = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'sala_sync',
        session_code: code,
        role,
        ...payload,
      }))
    }
  }, [code, role])

  const {
    paneRef: videoPaneRef,
    audioMuted,
    fullscreen: videoFullscreen,
    theater: videoTheater,
    toggleFullscreen: toggleVideoFullscreen,
    handleMutedChange,
    applyRemoteShare,
  } = useSalaVideoShare(sendSync)

  useEffect(() => {
    if (!accessToken || !equipoActivo?.id) return
    const ws = new WebSocket(trainingHubWsUrl(accessToken, equipoActivo.id))
    wsRef.current = ws
    ws.onopen = () => {
      setWsOk(true)
      ws.send(JSON.stringify({ type: 'sala_join', session_code: code, role }))
    }
    ws.onclose = () => setWsOk(false)
    ws.onerror = () => setWsOk(false)
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.session_code && msg.session_code !== code) return

        if (msg.type === 'sala_joined') {
          if (typeof msg.peers === 'number' && msg.peers > 1) setPeerReady(true)
          return
        }
        if (msg.type === 'sala_peer_joined') {
          setPeerReady(true)
          return
        }

        if (msg.type !== 'sala_sync') return
        applyingRemote.current = true
        leaderRef.current = false
        if (typeof msg.t === 'number') playerRef.current?.seekTo(msg.t)
        if (typeof msg.paused === 'boolean') {
          if (msg.paused) playerRef.current?.pause()
          else playerRef.current?.play()
          setPlaying(!msg.paused)
        }
        if (Array.isArray(msg.overlay)) {
          reset(msg.overlay)
        }
        if (msg.zoom && typeof msg.zoom.scale === 'number') {
          setZoom({
            scale: clampZoom(msg.zoom.scale),
            x: Number(msg.zoom.x) || 0,
            y: Number(msg.zoom.y) || 0,
          })
        }
        applyRemoteShare(msg)
        if (msg.clip_id) {
          const cur = sessionRef.current
          if (cur && cur.current_clip_id !== msg.clip_id) {
            const next = cur.pack?.clips.find((c) => c.id === msg.clip_id)
            if (next) {
              setSession((s) => (s ? { ...s, current_clip_id: msg.clip_id, current_clip: next } : s))
              setMediaError(false)
              if (!Array.isArray(msg.overlay)) reset([])
            }
          }
        }
        window.setTimeout(() => { applyingRemote.current = false }, 280)
      } catch {
        // ignore
      }
    }
    const ping = window.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
    }, 25000)
    return () => {
      clearInterval(ping)
      ws.close()
      wsRef.current = null
    }
  }, [accessToken, equipoActivo?.id, code, role, reset, applyRemoteShare])

  useEffect(() => {
    if (skipOverlaySend.current) {
      skipOverlaySend.current = false
      return
    }
    if (applyingRemote.current) {
      applyingRemote.current = false
      return
    }
    sendSync({ overlay: elements, clip_id: currentClip?.id })
  }, [elements, sendSync, currentClip?.id])

  useEffect(() => {
    const tick = window.setInterval(() => {
      if (!leaderRef.current || applyingRemote.current) return
      const v = playerRef.current?.getVideoElement()
      if (!v || v.paused) return
      sendSync({ t: v.currentTime, paused: false, clip_id: currentClip?.id, muted: audioMuted })
    }, 2500)
    return () => clearInterval(tick)
  }, [sendSync, currentClip?.id, audioMuted])

  const handlePlayState = useCallback((nextPlaying: boolean) => {
    setPlaying(nextPlaying)
    if (applyingRemote.current) return
    leaderRef.current = nextPlaying
    sendSync({
      paused: !nextPlaying,
      t: playerRef.current?.getCurrentTime() ?? 0,
      clip_id: currentClip?.id,
      muted: audioMuted,
    })
  }, [sendSync, currentClip?.id, audioMuted])

  const handleSeeked = useCallback((t: number) => {
    if (applyingRemote.current) return
    sendSync({ t, clip_id: currentClip?.id })
  }, [sendSync, currentClip?.id])

  const sendZoom = useCallback((next: ZoomState) => {
    sendSync({ zoom: next, clip_id: currentClip?.id })
  }, [sendSync, currentClip?.id])

  const applyZoom = useCallback((next: ZoomState, broadcast = false) => {
    setZoom(next)
    if (broadcast) sendZoom(next)
  }, [sendZoom])

  const restoreZoom = useCallback(() => {
    setZoom(IDENTITY_ZOOM)
    sendZoom(IDENTITY_ZOOM)
  }, [sendZoom])

  const bumpZoom = useCallback((factor: number) => {
    const next = zoomAt(zoomRef.current, zoomRef.current.scale * factor, 0, 0, 800, 450)
    setZoom(next)
    sendZoom(next)
    setZoomMode(true)
  }, [sendZoom])

  const enterZoomMode = () => {
    setZoomMode(true)
    setSelectedId(null)
  }

  const stepFrame = (direction: 1 | -1) => {
    const v = playerRef.current?.getVideoElement()
    if (!v) return
    if (!v.paused) v.pause()
    playerRef.current?.frameStep(direction)
  }

  const jogBy = (delta: number) => {
    const v = playerRef.current?.getVideoElement()
    if (!v) return
    if (!v.paused) v.pause()
    playerRef.current?.seekBy(delta)
  }

  const repeatAction = () => {
    const v = playerRef.current?.getVideoElement()
    if (!v) return
    const t = Math.max(0, v.currentTime - REPEAT_SECONDS)
    v.currentTime = t
    v.play()?.catch(() => toast.error('Pulsa play en este dispositivo para desbloquear el audio'))
    sendSync({ t, paused: false, clip_id: currentClip?.id })
  }

  const rewindHoldRef = useRef<number | null>(null)
  const startHoldRewind = () => {
    const v = playerRef.current?.getVideoElement()
    if (!v) return
    if (!v.paused) v.pause()
    const tick = () => playerRef.current?.seekBy(-JOG_SECONDS)
    tick()
    if (rewindHoldRef.current) window.clearInterval(rewindHoldRef.current)
    rewindHoldRef.current = window.setInterval(tick, 70)
  }
  const stopHoldRewind = () => {
    if (rewindHoldRef.current) {
      window.clearInterval(rewindHoldRef.current)
      rewindHoldRef.current = null
    }
  }

  useEffect(() => () => {
    if (rewindHoldRef.current) window.clearInterval(rewindHoldRef.current)
  }, [])

  const togglePlay = () => {
    const v = playerRef.current?.getVideoElement()
    if (!v) return
    if (v.paused) v.play()?.catch(() => toast.error('Pulsa play en este dispositivo para desbloquear el audio'))
    else v.pause()
  }

  const pickClip = async (clip: RevisionClip) => {
    reset([])
    setMediaError(false)
    setZoom(IDENTITY_ZOOM)
    setZoomMode(false)
    setSession((s) => (s ? { ...s, current_clip_id: clip.id, current_clip: clip } : s))
    try {
      await revisionApi.updateSession(code, { current_clip_id: clip.id, overlay_json: [], current_time_ms: 0, paused: true })
    } catch {
      // still sync over WS
    }
    sendSync({ clip_id: clip.id, t: 0, paused: true, overlay: [], zoom: IDENTITY_ZOOM })
  }

  useEffect(() => {
    const onFs = () => setIsFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const toggleFullscreen = () => {
    const el = rootRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen?.()
  }

  const salaUrl = typeof window !== 'undefined' ? `${window.location.origin}/revision/${code}` : ''
  const qrSrc = salaUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(salaUrl)}`
    : ''

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Conectando sala {code}…
      </div>
    )
  }

  if (!session) {
    return <div className="p-8 text-center text-muted-foreground">No hay sala con el código {code}.</div>
  }

  return (
    <div ref={rootRef} className="fixed inset-0 z-[80] bg-black text-white flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-950 border-b border-white/10 gap-2">
        <div className="text-sm font-medium truncate">
          Sala {session.code} · {isHost ? 'TV / portátil' : 'Tablet'}
          <span className={`ml-2 text-[10px] ${wsOk ? 'text-emerald-400' : 'text-amber-400'}`}>
            {wsOk ? 'en vivo' : 'conectando…'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={togglePlay} title="Play / pausa">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          {isHost && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={toggleFullscreen} title="Pantalla completa">
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={onClose} title="Cerrar sala">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {!isHost && (
        <div className="px-3 py-1 text-[11px] text-zinc-400 flex items-center gap-1 bg-zinc-950">
          <VolumeX className="h-3 w-3" /> Audio en el PC · mute aquí también lo corta allí. Play y pausa salen de aquí o del portátil.
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden bg-black">
          <div
            ref={videoPaneRef}
            data-testid="sala-video-pane"
            className={
              videoTheater
                ? 'fixed inset-0 z-[120] isolate overflow-hidden bg-black'
                : 'relative h-full w-full min-h-0 overflow-hidden isolate'
            }
          >
            {playSrc ? (
              <VideoPlayer
                key={playSrc}
                ref={playerRef}
                src={playSrc}
                standalonePreview={isHost}
                presenterEmbed
                playbackMuted={!isHost}
                muted={audioMuted}
                onMutedChange={(next) => handleMutedChange(next, { clip_id: currentClip?.id })}
                isFullscreen={videoFullscreen}
                onToggleFullscreen={() => toggleVideoFullscreen({ clip_id: currentClip?.id })}
                contentTransform={zoomCss(zoom)}
                onPlayStateChange={handlePlayState}
                onSeeked={handleSeeked}
                onError={() => setMediaError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-500 text-sm">
                Elige un recorte en la barra de la derecha
              </div>
            )}
            {playSrc && (
              <div className={`absolute left-0 right-0 top-0 ${VIDEO_PLAYER_CHROME_CLASS} overflow-hidden`}>
                <div className="absolute inset-0" style={zoomCss(zoom)}>
                  <DrawingOverlay
                    elements={elements}
                    preview={preview}
                    selectedId={selectedId}
                    interactive={!zoomMode}
                    tool={tool}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                  />
                </div>
                {zoomMode && (
                  <SalaZoomCatcher
                    zoom={zoom}
                    onChange={(next) => applyZoom(next)}
                    onCommit={() => sendZoom(zoomRef.current)}
                  />
                )}
              </div>
            )}
            <SalaFloatingChrome>
              <WhiteboardBar
                tool={tool}
                setTool={(t) => { setZoomMode(false); setTool(t) }}
                color={color}
                setColor={setColor}
                strokeWidth={strokeWidth}
                setStrokeWidth={setStrokeWidth}
                fillOpacity={fillOpacity}
                setFillOpacity={setFillOpacity}
                selectedForMove={tool === 'select' && !zoomMode}
                onMoveTool={() => { setZoomMode(false); setTool('select') }}
                canUndo={canUndo}
                onUndo={undo}
                onClearAll={clearAll}
                playing={playing}
                onPlay={togglePlay}
              />
              <SalaReviewBar
                zoomMode={zoomMode}
                zoomed={!isIdentityZoom(zoom)}
                onEnterZoom={enterZoomMode}
                onExitZoom={() => setZoomMode(false)}
                onZoomIn={() => bumpZoom(1.25)}
                onZoomOut={() => bumpZoom(1 / 1.25)}
                onRestore={restoreZoom}
                onFrameBack={() => stepFrame(-1)}
                onFrameFwd={() => stepFrame(1)}
                onJogBack={() => jogBy(-0.5)}
                onRepeat={repeatAction}
                onRewindDown={startHoldRewind}
                onRewindUp={stopHoldRewind}
                fullscreen={videoFullscreen}
                onToggleFullscreen={() => toggleVideoFullscreen({ clip_id: currentClip?.id })}
              />
            </SalaFloatingChrome>
            {mediaError && (
              <div className="absolute inset-x-4 top-24 z-[60] rounded-md bg-black/80 text-amber-200 text-xs p-3">
                Este recorte no se pudo reproducir en este navegador. Prueba Safari en el iPad o sube el clip en MP4/WebM (H.264).
              </div>
            )}
          </div>
        </div>

        <aside className={`${foldersOpen ? 'w-60' : 'w-9'} shrink-0 border-l border-white/10 bg-zinc-950 flex flex-col transition-[width] duration-200`}>
          <button
            type="button"
            className="h-8 w-full flex items-center justify-center text-zinc-300 hover:bg-white/10"
            onClick={() => setFoldersOpen((open) => !open)}
            title={foldersOpen ? 'Ocultar carpetas' : 'Mostrar carpetas'}
          >
            {foldersOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          {foldersOpen ? (
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              <p className="text-[11px] text-zinc-500 px-1 mb-2">Carpetas y recortes</p>
              {session.pack ? (
                <SalaClipTree pack={session.pack} currentClipId={currentClip?.id} onPick={pickClip} />
              ) : (
                <p className="text-xs text-zinc-500">Sin librería</p>
              )}
            </div>
          ) : (
            <p className="flex-1 [writing-mode:vertical-rl] text-[10px] text-zinc-500 tracking-widest px-2 py-3 rotate-180">
              Carpetas
            </p>
          )}
        </aside>
      </div>

      {isHost && !peerReady && (
        <div className="absolute inset-0 z-[90] bg-black/85 flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center space-y-4">
            <p className="text-sm text-zinc-300">
              Escanea el QR con la tablet. En cuanto entre, esta pantalla pasa sola a la revisión y las dos se sincronizan.
            </p>
            <p className="text-4xl font-mono tracking-[0.3em] font-semibold">{session.code}</p>
            {qrSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrSrc} alt={`QR sala ${session.code}`} width={240} height={240} className="mx-auto rounded-md bg-white p-2" />
            ) : null}
            <p className={`text-xs ${wsOk ? 'text-emerald-400' : 'text-amber-400'}`}>
              {wsOk ? 'Esperando a la tablet…' : 'Conectando la sala…'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
