'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, VolumeX } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { revisionApi, type RevisionClip, type RevisionSession } from '@/lib/api/revision'
import { VideoPlayer, type VideoPlayerHandle } from '@/components/video-analyzer/VideoPlayer'
import { DrawingOverlay } from '@/components/video-analyzer/DrawingOverlay'
import { useDrawingEngine } from '@/components/video-analyzer/useDrawingEngine'
import { useUndoRedo } from '@/components/video-analyzer/useUndoRedo'
import type { DrawingTool } from '@/components/video-analyzer/types'
import { Button } from '@/components/ui/button'

function RevisionSalaInner() {
  const params = useParams<{ code: string }>()
  const search = useSearchParams()
  const code = (params.code || '').toUpperCase()
  const isHost = search.get('role') === 'host'
  const equipoActivo = useEquipoStore((s) => s.equipoActivo)
  const accessToken = useAuthStore((s) => s.accessToken)

  const [session, setSession] = useState<RevisionSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [tool, setTool] = useState<DrawingTool>('arrow')
  const [color, setColor] = useState('#f97316')
  const [strokeWidth, setStrokeWidth] = useState(5)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const playerRef = useRef<VideoPlayerHandle>(null)
  const applyingRemote = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)

  const { elements, setElements: pushElements, undo, canUndo, reset } = useUndoRedo([])
  const { preview, handlePointerDown, handlePointerMove, handlePointerUp, clearAll } = useDrawingEngine({
    elements,
    setElements: pushElements,
    color,
    strokeWidth,
    tool,
    selectedId,
    setSelectedId,
  })

  useEffect(() => {
    let cancelled = false
    revisionApi.getSession(code)
      .then((s) => { if (!cancelled) setSession(s) })
      .catch(() => { if (!cancelled) toast.error('Sala no encontrada') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [code])

  const currentClip: RevisionClip | null = session?.current_clip || session?.pack?.clips.find((c) => c.id === session.current_clip_id) || null

  const sendSync = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'sala_sync', session_code: code, role: isHost ? 'host' : 'tablet', ...payload }))
    }
  }, [code, isHost])

  useEffect(() => {
    if (!accessToken || !equipoActivo?.id || !session) return
    const isSecure = window.location.protocol === 'https:'
    const wsUrl = `${isSecure ? 'wss' : 'ws'}://${window.location.host}/v1/ws?token=${encodeURIComponent(accessToken)}&equipo_id=${encodeURIComponent(equipoActivo.id)}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'sala_join', session_code: code }))
    }
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type !== 'sala_sync' || msg.session_code !== code) return
        applyingRemote.current = true
        if (typeof msg.t === 'number') playerRef.current?.seekTo(msg.t)
        if (typeof msg.paused === 'boolean') {
          if (msg.paused) playerRef.current?.pause()
          else playerRef.current?.play()
        }
        if (Array.isArray(msg.overlay)) pushElements(msg.overlay)
        if (msg.clip_id && session.current_clip_id !== msg.clip_id) {
          const next = session.pack?.clips.find((c) => c.id === msg.clip_id)
          if (next) setSession((s) => (s ? { ...s, current_clip_id: msg.clip_id, current_clip: next } : s))
          reset()
        }
        window.setTimeout(() => { applyingRemote.current = false }, 80)
      } catch {
        // ignore
      }
    }
    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [accessToken, equipoActivo?.id, session, code, pushElements])

  // Overlay live from tablet
  useEffect(() => {
    if (isHost || applyingRemote.current) return
    sendSync({ overlay: elements, clip_id: currentClip?.id })
  }, [elements, isHost, sendSync, currentClip?.id])

  const handleTime = useCallback((t: number) => {
    if (isHost || applyingRemote.current) return
    sendSync({ t, clip_id: currentClip?.id, paused: false })
  }, [isHost, sendSync, currentClip?.id])

  const pickClip = async (clip: RevisionClip) => {
    reset()
    setSession((s) => (s ? { ...s, current_clip_id: clip.id, current_clip: clip } : s))
    try {
      await revisionApi.updateSession(code, { current_clip_id: clip.id, overlay_json: [], current_time_ms: 0, paused: true })
    } catch {
      // still sync over WS
    }
    sendSync({ clip_id: clip.id, t: 0, paused: true, overlay: [] })
  }

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

  const clips = session.pack?.clips.filter((c) => c.status === 'hot' && c.url) || []

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-950 border-b border-white/10">
        <div className="text-sm font-medium">
          Sala {session.code} · {isHost ? 'TV / portátil' : 'Tablet'}
        </div>
        {!isHost && (
          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
            <VolumeX className="h-3 w-3" /> Silenciada · el audio sale del PC
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 relative bg-black flex items-center justify-center">
          <div className="relative w-full" style={{ maxHeight: '100%', aspectRatio: '16/9' }}>
            {currentClip?.url ? (
              <VideoPlayer
                ref={playerRef}
                src={currentClip.url}
                standalonePreview={isHost}
                defaultMuted={!isHost}
                onTimeUpdate={handleTime}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
                Elige un recorte
              </div>
            )}
            <DrawingOverlay
              elements={elements}
              preview={isHost ? null : preview}
              selectedId={isHost ? null : selectedId}
              interactive={!isHost}
              tool={isHost ? 'select' : tool}
              onPointerDown={isHost ? undefined : handlePointerDown}
              onPointerMove={isHost ? undefined : handlePointerMove}
              onPointerUp={isHost ? undefined : handlePointerUp}
            />
          </div>
        </div>

        <aside className="w-56 shrink-0 border-l border-white/10 bg-zinc-950 overflow-y-auto p-2 space-y-2">
          {!isHost && (
            <div className="flex flex-wrap gap-1 pb-2 border-b border-white/10">
              {(['arrow', 'line', 'circle', 'freehand'] as DrawingTool[]).map((t) => (
                <button
                  key={t}
                  className={`px-2 py-1 rounded text-[10px] ${tool === t ? 'bg-orange-500 text-black' : 'bg-white/10'}`}
                  onClick={() => setTool(t)}
                >
                  {t}
                </button>
              ))}
              <button className="px-2 py-1 rounded text-[10px] bg-white/10" onClick={undo} disabled={!canUndo}>Deshacer</button>
              <button className="px-2 py-1 rounded text-[10px] bg-white/10" onClick={clearAll}>Borrar</button>
            </div>
          )}
          <p className="text-[11px] text-zinc-500 px-1">Recortes</p>
          {clips.map((c) => (
            <button
              key={c.id}
              onClick={() => pickClip(c)}
              className={`w-full text-left rounded-md px-2 py-2 text-xs ${c.id === currentClip?.id ? 'bg-white/15' : 'hover:bg-white/5'}`}
            >
              <div className="font-medium truncate">{c.titulo}</div>
              {c.frase && <div className="text-[10px] text-zinc-400 line-clamp-2">{c.frase}</div>}
            </button>
          ))}
          {isHost && (
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => {
                playerRef.current?.getVideoElement()?.requestFullscreen?.()
              }}
            >
              Pantalla completa
            </Button>
          )}
        </aside>
      </div>
    </div>
  )
}

export default function RevisionSalaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Cargando sala…</div>}>
      <RevisionSalaInner />
    </Suspense>
  )
}
