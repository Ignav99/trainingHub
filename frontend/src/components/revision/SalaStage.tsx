'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  Hand,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Repeat,
  Rewind,
  Square,
  Undo2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
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
import { DRAWING_COLORS, STROKE_WIDTHS, type DrawingTool } from '@/components/video-analyzer/types'
import type { DrawingElement } from '@/types'
import { Button } from '@/components/ui/button'
import { SalaClipTree } from './SalaClipTree'
import { SalaZoomCatcher } from './SalaZoomCatcher'
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

const TOOLS: { tool: DrawingTool; label: string }[] = [
  { tool: 'arrow', label: 'Flecha' },
  { tool: 'line', label: 'Línea' },
  { tool: 'circle', label: 'Círculo' },
  { tool: 'rect', label: 'Rectángulo' },
  { tool: 'freehand', label: 'Lápiz' },
  { tool: 'eraser', label: 'Goma' },
]

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
  }, [accessToken, equipoActivo?.id, code, role, reset])

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
      sendSync({ t: v.currentTime, paused: false, clip_id: currentClip?.id })
    }, 2500)
    return () => clearInterval(tick)
  }, [sendSync, currentClip?.id])

  const handlePlayState = useCallback((nextPlaying: boolean) => {
    setPlaying(nextPlaying)
    if (applyingRemote.current) return
    leaderRef.current = nextPlaying
    sendSync({
      paused: !nextPlaying,
      t: playerRef.current?.getCurrentTime() ?? 0,
      clip_id: currentClip?.id,
    })
  }, [sendSync, currentClip?.id])

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
          <VolumeX className="h-3 w-3" /> Silenciada · el audio sale del PC. Play y pausa salen de aquí o del portátil.
        </div>
      )}

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
      />

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 relative bg-black flex items-center justify-center min-w-0">
          <div className="relative w-full h-full flex flex-col">
            {playSrc ? (
              <VideoPlayer
                key={playSrc}
                ref={playerRef}
                src={playSrc}
                standalonePreview={isHost}
                defaultMuted={!isHost}
                contentTransform={zoomCss(zoom)}
                onPlayStateChange={handlePlayState}
                onSeeked={handleSeeked}
                onError={() => setMediaError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
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
            {mediaError && (
              <div className="absolute inset-x-4 top-4 rounded-md bg-black/80 text-amber-200 text-xs p-3">
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

function SalaReviewBar({
  zoomMode,
  zoomed,
  onEnterZoom,
  onExitZoom,
  onZoomIn,
  onZoomOut,
  onRestore,
  onFrameBack,
  onFrameFwd,
  onJogBack,
  onRepeat,
  onRewindDown,
  onRewindUp,
}: {
  zoomMode: boolean
  zoomed: boolean
  onEnterZoom: () => void
  onExitZoom: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onRestore: () => void
  onFrameBack: () => void
  onFrameFwd: () => void
  onJogBack: () => void
  onRepeat: () => void
  onRewindDown: () => void
  onRewindUp: () => void
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-zinc-950 border-b border-white/10 text-xs flex-wrap">
      <button
        type="button"
        className="h-10 px-3 rounded-md bg-white/10 active:bg-white/20"
        onClick={onJogBack}
        title="Medio segundo atrás"
      >
        −0,5s
      </button>
      <button
        type="button"
        className="h-10 px-3 rounded-md bg-white/10 active:bg-white/20"
        onClick={onFrameBack}
        title="Fotograma anterior"
      >
        −1 fot.
      </button>
      <button
        type="button"
        className="h-10 px-3 rounded-md bg-white/10 active:bg-white/20 inline-flex items-center gap-1 touch-none"
        onPointerDown={(e) => {
          e.preventDefault()
          try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
          onRewindDown()
        }}
        onPointerUp={onRewindUp}
        onPointerCancel={onRewindUp}
        title="Mantén pulsado para rebobinar"
      >
        <Rewind className="h-3.5 w-3.5" />
        Rebobinar
      </button>
      <button
        type="button"
        className="h-10 px-3 rounded-md bg-orange-500 text-black font-medium inline-flex items-center gap-1"
        onClick={onRepeat}
        title={`Repite los últimos ${REPEAT_SECONDS} segundos`}
      >
        <Repeat className="h-3.5 w-3.5" />
        Repetir {REPEAT_SECONDS}s
      </button>
      <button
        type="button"
        className="h-10 px-3 rounded-md bg-white/10 active:bg-white/20"
        onClick={onFrameFwd}
        title="Fotograma siguiente"
      >
        +1 fot.
      </button>
      <div className="w-px h-6 bg-white/15 mx-0.5" />
      <button
        type="button"
        className={`h-10 px-3 rounded-md inline-flex items-center gap-1 ${zoomMode ? 'bg-orange-500 text-black' : 'bg-white/10'}`}
        onClick={zoomMode ? onExitZoom : onEnterZoom}
        title="Pellizca con dos dedos. No pinta mientras está activo."
      >
        <ZoomIn className="h-3.5 w-3.5" />
        {zoomMode ? 'Acercar ON' : 'Acercar'}
      </button>
      {zoomMode && (
        <span className="text-[10px] text-amber-200 hidden sm:inline">
          Pellizca con dos dedos · un dedo arrastra
        </span>
      )}
      <button
        type="button"
        className="h-10 w-10 rounded-md bg-white/10 inline-flex items-center justify-center"
        onClick={onZoomIn}
        title="Acercar"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="h-10 w-10 rounded-md bg-white/10 inline-flex items-center justify-center"
        onClick={onZoomOut}
        title="Alejar"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="h-10 px-3 rounded-md bg-white/10 inline-flex items-center gap-1 disabled:opacity-40"
        onClick={onRestore}
        disabled={!zoomed}
        title="Tamaño original"
      >
        <Undo2 className="h-3.5 w-3.5" />
        Original
      </button>
    </div>
  )
}

function WhiteboardBar({
  tool,
  setTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  fillOpacity,
  setFillOpacity,
  selectedForMove,
  onMoveTool,
  canUndo,
  onUndo,
  onClearAll,
  playing,
  onPlay,
}: {
  tool: DrawingTool
  setTool: (t: DrawingTool) => void
  color: string
  setColor: (c: string) => void
  strokeWidth: number
  setStrokeWidth: (w: number) => void
  fillOpacity: number
  setFillOpacity: (n: number) => void
  selectedForMove: boolean
  onMoveTool: () => void
  canUndo: boolean
  onUndo: () => void
  onClearAll: () => void
  playing: boolean
  onPlay: () => void
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900 border-b border-white/10 text-xs flex-wrap">
      <Button variant="ghost" size="sm" className="h-7 text-white hover:bg-white/15" onClick={onPlay}>
        {playing ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
        Play / pausa
      </Button>
      <div className="w-px h-5 bg-white/15" />
      {TOOLS.map(({ tool: t, label }) => (
        <button
          key={t}
          className={`px-2 py-1 rounded ${tool === t ? 'bg-orange-500 text-black' : 'bg-white/10'}`}
          onClick={() => setTool(t)}
        >
          {t === 'rect' ? <Square className="h-3 w-3 inline mr-1" /> : null}
          {t === 'eraser' ? <Eraser className="h-3 w-3 inline mr-1" /> : null}
          {label}
        </button>
      ))}
      <div className="w-px h-5 bg-white/15" />
      {DRAWING_COLORS.map((c) => (
        <button
          key={c}
          className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-white/30'}`}
          style={{ backgroundColor: c }}
          onClick={() => setColor(c)}
          title={c}
        />
      ))}
      <div className="w-px h-5 bg-white/15" />
      {STROKE_WIDTHS.map((w) => (
        <button
          key={w}
          className={`w-6 h-6 rounded ${strokeWidth === w ? 'bg-white/30' : 'hover:bg-white/15'}`}
          onClick={() => setStrokeWidth(w)}
          title={`Grosor ${w}`}
        >
          <span className="mx-auto block rounded-full bg-white" style={{ width: w + 2, height: w + 2 }} />
        </button>
      ))}
      <label className="flex items-center gap-1 text-[10px] text-zinc-400">
        Opacidad
        <input
          type="range"
          min={8}
          max={70}
          value={Math.round(fillOpacity * 100)}
          onChange={(e) => setFillOpacity(Number(e.target.value) / 100)}
          className="w-20"
        />
      </label>
      <button
        type="button"
        className={`px-2 py-1 rounded inline-flex items-center gap-1 ${selectedForMove ? 'bg-orange-500 text-black' : 'bg-white/10'}`}
        onClick={onMoveTool}
        title="Mover la forma seleccionada"
      >
        <Hand className="h-3.5 w-3.5" />
        Mover
      </button>
      <button className="px-2 py-1 rounded bg-white/10" onClick={onUndo} disabled={!canUndo}>Deshacer</button>
      <button className="px-2 py-1 rounded bg-white/10" onClick={onClearAll}>Borrar todo</button>
    </div>
  )
}
