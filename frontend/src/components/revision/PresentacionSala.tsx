'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Film, Loader2, VolumeX, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { revisionApi, type RevisionSession } from '@/lib/api/revision'
import { trainingHubWsUrl } from '@/lib/wsUrl'
import { VideoPlayer, VIDEO_PLAYER_CHROME_CLASS, type VideoPlayerHandle } from '@/components/video-analyzer/VideoPlayer'
import { DrawingOverlay } from '@/components/video-analyzer/DrawingOverlay'
import { useDrawingEngine } from '@/components/video-analyzer/useDrawingEngine'
import { useUndoRedo } from '@/components/video-analyzer/useUndoRedo'
import type { DrawingTool } from '@/components/video-analyzer/types'
import { ClubCrest, DISPLAY_FONT, StaticSlideBody } from '@/components/rivales/DossierSlides'
import { SalaFloatingChrome, SalaReviewBar, WhiteboardBar } from '@/components/revision/salaChrome'
import { SalaZoomCatcher } from '@/components/revision/SalaZoomCatcher'
import { useSalaVideoShare } from '@/components/revision/useSalaVideoShare'
import {
  chapterIndexForSlide,
  showChapters,
  showPresenterLabel,
  slimShowForSync,
  type DossierShow,
} from '@/lib/dossierShow'
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

interface PresentacionSalaProps {
  code: string
  role: 'host' | 'tablet'
  initialSession?: RevisionSession | null
  initialShow?: DossierShow | null
  onClose?: () => void
}

export function PresentacionSala({
  code,
  role,
  initialSession,
  initialShow,
  onClose,
}: PresentacionSalaProps) {
  const isHost = role === 'host'
  const equipoActivo = useEquipoStore((s) => s.equipoActivo)
  const accessToken = useAuthStore((s) => s.accessToken)

  const [session, setSession] = useState<RevisionSession | null>(initialSession || null)
  const [show, setShow] = useState<DossierShow | null>(initialShow || null)
  const [loading, setLoading] = useState(!initialSession)
  const [index, setIndex] = useState(0)
  const [peerReady, setPeerReady] = useState(!isHost)
  const [wsOk, setWsOk] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tool, setTool] = useState<DrawingTool>('freehand')
  const [color, setColor] = useState('#f97316')
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [fillOpacity, setFillOpacity] = useState(0.22)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mediaError, setMediaError] = useState(false)
  const [playing, setPlaying] = useState(false)
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
  const showRef = useRef<DossierShow | null>(show)
  showRef.current = show
  const indexRef = useRef(index)
  indexRef.current = index
  const touchStartX = useRef<number | null>(null)

  const { elements, setElements: pushElements, undo, canUndo, reset } = useUndoRedo([])
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

  const slides = show?.slides ?? []
  const slide = slides[index] ?? slides[0]
  const chapters = useMemo(() => showChapters(slides), [slides])
  const chapterIdx = chapterIndexForSlide(chapters, index)
  const isVideo = slide?.kind === 'video'
  const playSrc = slide?.kind === 'video' ? slide.src : null
  const clipId = slide?.kind === 'video' ? slide.clipId : undefined

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (initialSession) return
    let cancelled = false
    revisionApi.getSession(code)
      .then((s) => { if (!cancelled) setSession(s) })
      .catch(() => { if (!cancelled) toast.error('Sala no encontrada') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [code, initialSession])

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

  const broadcastShow = useCallback((slideIndex: number) => {
    const current = showRef.current
    if (!current) return
    const next = current.slides[slideIndex]
    sendSync({
      show: slimShowForSync(current),
      slide: slideIndex,
      clip_id: next?.kind === 'video' ? next.clipId : null,
      t: 0,
      paused: true,
      overlay: [],
      zoom: IDENTITY_ZOOM,
    })
  }, [sendSync])

  const goTo = useCallback((to: number, broadcast = true) => {
    if (!showRef.current) return
    const last = showRef.current.slides.length - 1
    if (to < 0 || to > last) return
    setIndex(to)
    setMediaError(false)
    setPlaying(false)
    setZoom(IDENTITY_ZOOM)
    setZoomMode(false)
    reset([])
    if (broadcast && isHost) {
      const next = showRef.current.slides[to]
      sendSync({
        slide: to,
        clip_id: next?.kind === 'video' ? next.clipId : null,
        t: 0,
        paused: true,
        overlay: [],
        zoom: IDENTITY_ZOOM,
      })
    }
  }, [isHost, reset, sendSync])

  const go = useCallback((delta: number) => {
    goTo(indexRef.current + delta)
  }, [goTo])

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
          if (typeof msg.peers === 'number' && msg.peers > 1) {
            setPeerReady(true)
            if (isHost) broadcastShow(indexRef.current)
          }
          return
        }
        if (msg.type === 'sala_peer_joined') {
          setPeerReady(true)
          if (isHost) broadcastShow(indexRef.current)
          return
        }

        if (msg.type !== 'sala_sync') return
        applyingRemote.current = true
        leaderRef.current = false
        if (msg.show && Array.isArray(msg.show.slides)) {
          setShow(msg.show)
        }
        if (typeof msg.slide === 'number') {
          setIndex(msg.slide)
          setMediaError(false)
        }
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
  }, [accessToken, equipoActivo?.id, code, role, reset, isHost, broadcastShow, applyRemoteShare])

  useEffect(() => {
    if (skipOverlaySend.current) {
      skipOverlaySend.current = false
      return
    }
    if (applyingRemote.current) {
      applyingRemote.current = false
      return
    }
    if (!isVideo) return
    sendSync({ overlay: elements, clip_id: clipId, slide: indexRef.current })
  }, [elements, sendSync, clipId, isVideo])

  useEffect(() => {
    const tick = window.setInterval(() => {
      if (!leaderRef.current || applyingRemote.current || !isVideo) return
      const v = playerRef.current?.getVideoElement()
      if (!v || v.paused) return
      sendSync({ t: v.currentTime, paused: false, clip_id: clipId, slide: indexRef.current, muted: audioMuted })
    }, 2500)
    return () => clearInterval(tick)
  }, [sendSync, clipId, isVideo, audioMuted])

  const handlePlayState = useCallback((nextPlaying: boolean) => {
    setPlaying(nextPlaying)
    if (applyingRemote.current) return
    leaderRef.current = nextPlaying
    sendSync({
      paused: !nextPlaying,
      t: playerRef.current?.getCurrentTime() ?? 0,
      clip_id: clipId,
      slide: indexRef.current,
      muted: audioMuted,
    })
  }, [sendSync, clipId, audioMuted])

  const handleSeeked = useCallback((t: number) => {
    if (applyingRemote.current) return
    sendSync({ t, clip_id: clipId, slide: indexRef.current })
  }, [sendSync, clipId])

  const sendZoom = useCallback((next: ZoomState) => {
    sendSync({ zoom: next, clip_id: clipId, slide: indexRef.current })
  }, [sendSync, clipId])

  const applyZoom = useCallback((next: ZoomState) => {
    setZoom(next)
  }, [])

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
    sendSync({ t, paused: false, clip_id: clipId, slide: indexRef.current })
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

  useEffect(() => {
    if (!mounted) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    rootRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [mounted])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        go(1)
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(-1)
        return
      }
      if (e.key === 'Home') {
        e.preventDefault()
        goTo(0)
        return
      }
      if (e.key === 'End') {
        e.preventDefault()
        goTo(Math.max(0, (showRef.current?.slides.length ?? 1) - 1))
        return
      }
      if (e.key === ' ' && slide?.kind !== 'video') {
        e.preventDefault()
        go(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, goTo, onClose, slide?.kind])

  const salaUrl = typeof window !== 'undefined' ? `${window.location.origin}/revision/${code}` : ''
  const qrSrc = salaUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(salaUrl)}`
    : ''

  if (!mounted || typeof document === 'undefined') return null

  if (loading && !session) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center text-zinc-300" style={{ background: '#08110F' }}>
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Conectando sala {code}…
      </div>,
      document.body,
    )
  }

  if (!session) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center text-zinc-400" style={{ background: '#08110F' }}>
        No hay sala con el código {code}.
      </div>,
      document.body,
    )
  }

  const total = slides.length
  const hint = isVideo
    ? 'Espacio reproduce · ← → pasa diapositiva · Esc cierra'
    : '← → pasa diapositiva · Espacio siguiente · Esc cierra'

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={showPresenterLabel(show?.kind ?? 'informe')}
      data-testid="presentacion-sala"
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col outline-none"
      style={{ background: '#08110F', color: '#F3EFE6' }}
      onTouchStart={(e) => {
        touchStartX.current = e.changedTouches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current
        touchStartX.current = null
        const end = e.changedTouches[0]?.clientX
        if (start == null || end == null) return
        const delta = end - start
        if (Math.abs(delta) < 60) return
        go(delta < 0 ? 1 : -1)
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@600;700;800&display=swap');
      `}</style>

      <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <ClubCrest src={show?.clubEscudoUrl} size={32} />
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.28em]"
          style={{ color: '#F0C35A', fontFamily: DISPLAY_FONT }}
        >
          {slide?.kicker || 'Presentación'}
        </p>
        <span className={`text-[10px] ${wsOk ? 'text-emerald-400' : 'text-amber-400'}`}>
          {wsOk ? 'en vivo' : 'conectando…'}
        </span>
        <div className="h-px flex-1" style={{ background: '#2A3A34' }} />
        {total > 0 && (
          <p className="tabular-nums text-xs" style={{ color: '#9AA59B' }}>
            {index + 1} / {total}
          </p>
        )}
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0 || total === 0}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#F3EFE6] hover:bg-white/10 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C35A]"
          aria-label="Diapositiva anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index >= total - 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#F3EFE6] hover:bg-white/10 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C35A]"
          aria-label="Diapositiva siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#F3EFE6] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C35A]"
            aria-label="Cerrar presentación"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </header>

      {!isHost && (
        <div className="px-4 py-1 text-[11px] flex items-center gap-1" style={{ color: '#9AA59B' }}>
          <VolumeX className="h-3 w-3" /> Audio en el PC · mute aquí también lo corta allí
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {!show ? (
          <div className="flex h-full items-center justify-center text-sm" style={{ color: '#9AA59B' }}>
            Esperando al presentador…
          </div>
        ) : (
          <div className="dossier-slide flex h-full min-h-0 flex-col px-6 pb-2 sm:px-12">
            {slide && slide.kind !== 'video' && <StaticSlideBody slide={slide} />}
            {slide?.kind === 'video' && (
              <div data-testid="dossier-slide-video" className="flex h-full min-h-0 flex-col">
                <div className="mb-2 flex items-end justify-between gap-3">
                  <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ fontFamily: DISPLAY_FONT }}>
                    {slide.title}
                  </h2>
                  <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#9AA59B' }}>
                    {slide.kicker}
                  </span>
                </div>
                <div
                  ref={videoPaneRef}
                  data-testid="sala-video-pane"
                  className={
                    videoTheater
                      ? 'fixed inset-0 z-[120] isolate overflow-hidden bg-black'
                      : 'relative min-h-0 flex-1 isolate overflow-hidden rounded-md'
                  }
                  style={{ background: '#000' }}
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
                      onMutedChange={(next) => handleMutedChange(next, { clip_id: clipId, slide: indexRef.current })}
                      isFullscreen={videoFullscreen}
                      onToggleFullscreen={() => toggleVideoFullscreen({ clip_id: clipId, slide: indexRef.current })}
                      contentTransform={zoomCss(zoom)}
                      onPlayStateChange={handlePlayState}
                      onSeeked={handleSeeked}
                      onError={() => setMediaError(true)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm" style={{ color: '#9AA59B' }}>
                      Clip no disponible
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
                      onToggleFullscreen={() => toggleVideoFullscreen({ clip_id: clipId, slide: indexRef.current })}
                    />
                  </SalaFloatingChrome>
                  {mediaError && (
                    <div className="absolute inset-x-4 top-24 z-[60] rounded-md bg-black/80 text-amber-200 text-xs p-3">
                      Este recorte no se pudo reproducir. Pasa a la siguiente diapositiva.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="shrink-0 px-3 pb-3 pt-1 sm:px-5">
        <div
          className="flex items-center gap-1 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Fases de la charla"
        >
          {chapters.map((chapter, i) => {
            const active = i === chapterIdx
            return (
              <button
                key={chapter.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => goTo(chapter.startIndex)}
                className="flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C35A]"
                style={{
                  background: active ? '#F0C35A' : '#12201B',
                  color: active ? '#08110F' : '#C5CDC7',
                  fontFamily: DISPLAY_FONT,
                }}
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.12em]">{chapter.label}</span>
                {chapter.videoCount > 0 && <Film className="h-3 w-3" aria-hidden />}
              </button>
            )
          })}
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 text-[11px]" style={{ color: '#9AA59B' }}>
          <span>{hint}</span>
          <span className="flex items-center gap-2">
            <ChevronLeft className="h-3 w-3" />
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </footer>

      {isHost && !peerReady && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center p-6" style={{ background: 'rgba(8,17,15,0.92)' }}>
          <div className="max-w-sm w-full text-center space-y-4">
            <p className="text-sm" style={{ color: '#C5CDC7' }}>
              Escanea el QR con la tablet. En cuanto entre, las dos pantallas muestran la misma diapositiva.
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
    </div>,
    document.body,
  )
}
