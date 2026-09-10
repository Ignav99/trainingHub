'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Eraser,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Square,
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
import { VideoPlayer, type VideoPlayerHandle } from '@/components/video-analyzer/VideoPlayer'
import { DrawingOverlay } from '@/components/video-analyzer/DrawingOverlay'
import { useDrawingEngine } from '@/components/video-analyzer/useDrawingEngine'
import { useUndoRedo } from '@/components/video-analyzer/useUndoRedo'
import { DRAWING_COLORS, STROKE_WIDTHS, type DrawingTool } from '@/components/video-analyzer/types'
import type { DrawingElement } from '@/types'
import { Button } from '@/components/ui/button'
import { SalaClipTree } from './SalaClipTree'

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
  const skipOverlaySend = useRef(true)

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

  const togglePlay = () => {
    const v = playerRef.current?.getVideoElement()
    if (!v) return
    if (v.paused) v.play()?.catch(() => toast.error('Pulsa play en este dispositivo para desbloquear el audio'))
    else v.pause()
  }

  const pickClip = async (clip: RevisionClip) => {
    reset([])
    setMediaError(false)
    setSession((s) => (s ? { ...s, current_clip_id: clip.id, current_clip: clip } : s))
    try {
      await revisionApi.updateSession(code, { current_clip_id: clip.id, overlay_json: [], current_time_ms: 0, paused: true })
    } catch {
      // still sync over WS
    }
    sendSync({ clip_id: clip.id, t: 0, paused: true, overlay: [] })
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
        setTool={setTool}
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        fillOpacity={fillOpacity}
        setFillOpacity={setFillOpacity}
        canUndo={canUndo}
        onUndo={undo}
        onClearAll={clearAll}
        playing={playing}
        onPlay={togglePlay}
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
              <div className="absolute left-0 right-0 top-0 bottom-9">
                <DrawingOverlay
                  elements={elements}
                  preview={preview}
                  selectedId={selectedId}
                  interactive
                  tool={tool}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />
              </div>
            )}
            {mediaError && (
              <div className="absolute inset-x-4 top-4 rounded-md bg-black/80 text-amber-200 text-xs p-3">
                Este recorte no se pudo reproducir en este navegador. Prueba Safari en el iPad o sube el clip en MP4/WebM (H.264).
              </div>
            )}
          </div>
        </div>

        <aside className="w-60 shrink-0 border-l border-white/10 bg-zinc-950 overflow-y-auto p-2">
          <p className="text-[11px] text-zinc-500 px-1 mb-2">Carpetas y recortes</p>
          {session.pack ? (
            <SalaClipTree pack={session.pack} currentClipId={currentClip?.id} onPick={pickClip} />
          ) : (
            <p className="text-xs text-zinc-500">Sin librería</p>
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

function WhiteboardBar({
  tool,
  setTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  fillOpacity,
  setFillOpacity,
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
      <button className="px-2 py-1 rounded bg-white/10" onClick={onUndo} disabled={!canUndo}>Deshacer</button>
      <button className="px-2 py-1 rounded bg-white/10" onClick={onClearAll}>Borrar todo</button>
    </div>
  )
}
