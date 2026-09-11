'use client'

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'
import Hls from 'hls.js'
import { Button } from '@/components/ui/button'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Expand,
  Shrink,
  Maximize,
  Minimize,
  Rewind,
} from 'lucide-react'
import { formatTime } from './utils'
import { JOG_SECONDS } from '@/lib/videoZoom'

const HOLD_REWIND_INTERVAL_MS = 70

/** Alto de la barra de controles (seek + botones). La sala deja este hueco para pintar encima del vídeo. */
export const VIDEO_PLAYER_CHROME_CLASS = 'bottom-16'

export interface VideoPlayerHandle {
  getVideoElement: () => HTMLVideoElement | null
  getCurrentTime: () => number
  seekTo: (time: number) => void
  seekBy: (delta: number) => void
  frameStep: (direction: 1 | -1) => void
  pause: () => void
  play: () => void
  setMuted: (muted: boolean) => void
}

interface VideoPlayerProps {
  src: string
  clipRange?: { start: number; end: number }
  onTimeUpdate?: (time: number) => void
  onPlayStateChange?: (playing: boolean) => void
  onDurationChange?: (duration: number) => void
  onSeeked?: (time: number) => void
  onError?: () => void
  /**
   * Enables extra controls meant for standalone/embedded previews (e.g. rival clips
   * list) that are NOT active by default so the full Video Analyzer tool (which
   * already implements its own page-level trackpad/keyboard scrubbing) keeps
   * working exactly as before:
   *  - Two-finger trackpad horizontal scrub (scoped to this player only)
   *  - Left/Right arrow seek (only while this player has focus)
   *  - A real OS fullscreen toggle button
   *  - A "expand" toggle that enlarges this same instance in place (no reload,
   *    keeps play position) for a bigger, popup-like viewing area
   */
  standalonePreview?: boolean
  /**
   * Live dossier presenter: same player, already in a large window.
   * Hides the nested expand overlay and leaves ←/→ to change slides.
   */
  presenterEmbed?: boolean
  /**
   * Fill a sized parent (coding desk). Same object-contain layout as sala,
   * without hiding standalone controls or stealing arrow keys.
   */
  fillFrame?: boolean
  defaultMuted?: boolean
  /** Tablet: el altavoz local se queda mudo; el botón mute controla el PC. */
  playbackMuted?: boolean
  muted?: boolean
  onMutedChange?: (muted: boolean) => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  /** Zoom del recuadro de vídeo (sala). No afecta a la barra de controles. */
  contentTransform?: { transform: string; transformOrigin: string }
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({
    src,
    clipRange,
    onTimeUpdate,
    onPlayStateChange,
    onDurationChange,
    onSeeked,
    onError,
    standalonePreview,
    presenterEmbed,
    fillFrame,
    defaultMuted,
    playbackMuted,
    muted: mutedProp,
    onMutedChange,
    isFullscreen: fullscreenProp,
    onToggleFullscreen,
    contentTransform,
  }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null as unknown as HTMLVideoElement)
    const containerRef = useRef<HTMLDivElement>(null)
    const [playing, setPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [internalMuted, setInternalMuted] = useState(!!defaultMuted)
    const [speed, setSpeed] = useState(1)
    const [internalFullscreen, setIsFullscreen] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const currentTimeRef = useRef(0)
    const seekBarRef = useRef<HTMLDivElement>(null)
    const uiMuted = mutedProp ?? internalMuted
    const elementMuted = !!playbackMuted || uiMuted
    const showFullscreen = fullscreenProp ?? internalFullscreen
    const rewindIntervalRef = useRef<number | null>(null)

    // HLS.js support for .m3u8 streams
    const hlsRef = useRef<Hls | null>(null)

    useEffect(() => {
      const v = videoRef.current
      if (!v || !src) return

      const isHls = src.includes('.m3u8')

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 })
        hls.loadSource(src)
        hls.attachMedia(v)
        hlsRef.current = hls
        return () => {
          hls.destroy()
          hlsRef.current = null
        }
      } else if (isHls && v.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        v.src = src
      }
      // For non-HLS, the src attribute on <video> handles it
    }, [src])

    const togglePlay = useCallback(() => {
      const v = videoRef.current
      if (!v) return
      if (v.paused) {
        // If at clip end, loop back to start
        if (clipRange && v.currentTime >= clipRange.end - 0.05) {
          v.currentTime = clipRange.start
        }
        v.play()
      } else {
        v.pause()
      }
    }, [clipRange])

    const rangeBounds = useCallback(() => {
      const v = videoRef.current
      const min = clipRange?.start ?? 0
      const rawMax = clipRange?.end ?? v?.duration ?? duration
      const max = Number.isFinite(rawMax) ? rawMax : min
      return { min, max }
    }, [clipRange, duration])

    const seekToTime = useCallback((time: number) => {
      const v = videoRef.current
      if (!v) return
      const { min, max } = rangeBounds()
      const next = Math.max(min, Math.min(max, time))
      currentTimeRef.current = next
      setCurrentTime(next)
      v.currentTime = next
    }, [rangeBounds])

    const seek = useCallback((delta: number) => {
      const v = videoRef.current
      if (!v) return
      seekToTime(v.currentTime + delta)
    }, [seekToTime])

    const stopHoldRewind = useCallback(() => {
      if (rewindIntervalRef.current != null) {
        window.clearInterval(rewindIntervalRef.current)
        rewindIntervalRef.current = null
      }
    }, [])

    const startHoldRewind = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
      const v = videoRef.current
      if (v && !v.paused) v.pause()
      stopHoldRewind()
      const tick = () => seek(-JOG_SECONDS)
      tick()
      rewindIntervalRef.current = window.setInterval(tick, HOLD_REWIND_INTERVAL_MS)
    }, [seek, stopHoldRewind])

    useEffect(() => () => stopHoldRewind(), [stopHoldRewind])

    const seekFromClientX = useCallback((clientX: number) => {
      const el = seekBarRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0) return
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const { min, max } = rangeBounds()
      seekToTime(min + ratio * Math.max(0, max - min))
    }, [rangeBounds, seekToTime])

    // Frame-accurate stepping using requestVideoFrameCallback: nudges currentTime
    // in small increments and watches the *actual presented frame* (metadata.mediaTime)
    // instead of assuming a fixed fps. This works correctly regardless of the
    // clip's real frame rate (24/25/30/50/60fps...) and codec GOP structure.
    // Falls back to a fixed 1/30s step on browsers without rVFC support.
    const frameStepRef = useRef(false)
    const frameStep = useCallback((direction: 1 | -1) => {
      const v = videoRef.current as (HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: (now: number, metadata: { mediaTime: number }) => void) => number
      }) | null
      if (!v || !v.paused || frameStepRef.current) return
      const min = clipRange?.start ?? 0
      const max = clipRange?.end ?? v.duration

      if (typeof v.requestVideoFrameCallback !== 'function') {
        // Fallback for browsers without rVFC (older Safari/Firefox)
        v.currentTime = Math.max(min, Math.min(max, v.currentTime + direction / 30))
        return
      }

      frameStepRef.current = true
      const STEP = 1 / 120 // ~8.3ms nudge — fine enough for up to ~120fps footage
      const MAX_ATTEMPTS = 24 // covers down to ~5fps within a bounded, snappy time

      const getMediaTime = () => new Promise<number>((resolve) => {
        v.requestVideoFrameCallback!((_now, metadata) => resolve(metadata.mediaTime))
      })

      ;(async () => {
        try {
          const baseline = await getMediaTime()
          let attempts = 0
          let lastTime = v.currentTime
          while (attempts < MAX_ATTEMPTS) {
            const next = direction === 1
              ? Math.min(max, lastTime + STEP)
              : Math.max(min, lastTime - STEP)
            if (next === lastTime) break // hit clip/video bounds
            v.currentTime = next
            lastTime = next
            const t = await getMediaTime()
            if (t !== baseline) break
            attempts++
          }
        } finally {
          frameStepRef.current = false
        }
      })()
    }, [clipRange])

    useImperativeHandle(ref, () => ({
      getVideoElement: () => videoRef.current,
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      seekTo: (time: number) => {
        seekToTime(time)
      },
      seekBy: (delta: number) => {
        seek(delta)
      },
      frameStep,
      pause: () => videoRef.current?.pause(),
      play: () => { void videoRef.current?.play()?.catch(() => undefined) },
      setMuted: (next) => {
        setInternalMuted(next)
        if (videoRef.current && !playbackMuted) videoRef.current.muted = next
        onMutedChange?.(next)
      },
    }), [frameStep, seek, seekToTime, playbackMuted, onMutedChange])

    const cycleSpeed = useCallback(() => {
      const speeds = [0.25, 0.5, 1, 1.5, 2]
      const idx = speeds.indexOf(speed)
      const next = speeds[(idx + 1) % speeds.length]
      setSpeed(next)
      if (videoRef.current) videoRef.current.playbackRate = next
    }, [speed])

    useEffect(() => {
      const v = videoRef.current
      if (!v) return

      const handleTime = () => {
        // Auto-pause at clip end
        if (clipRange && v.currentTime >= clipRange.end) {
          v.currentTime = clipRange.end
          v.pause()
        }
        currentTimeRef.current = v.currentTime
        setCurrentTime(v.currentTime)
        onTimeUpdate?.(v.currentTime)
      }
      const handlePlay = () => {
        setPlaying(true)
        onPlayStateChange?.(true)
      }
      const handlePause = () => {
        setPlaying(false)
        onPlayStateChange?.(false)
      }
      const handleDuration = () => {
        setDuration(v.duration)
        onDurationChange?.(v.duration)
      }
      const handleSeeked = () => {
        onSeeked?.(v.currentTime)
      }
      const handleError = () => {
        onError?.()
      }

      v.addEventListener('timeupdate', handleTime)
      v.addEventListener('play', handlePlay)
      v.addEventListener('pause', handlePause)
      v.addEventListener('loadedmetadata', handleDuration)
      v.addEventListener('seeked', handleSeeked)
      v.addEventListener('error', handleError)

      return () => {
        v.removeEventListener('timeupdate', handleTime)
        v.removeEventListener('play', handlePlay)
        v.removeEventListener('pause', handlePause)
        v.removeEventListener('loadedmetadata', handleDuration)
        v.removeEventListener('seeked', handleSeeked)
        v.removeEventListener('error', handleError)
      }
    }, [clipRange, onTimeUpdate, onPlayStateChange, onDurationChange, onSeeked, onError])

    // When clipRange changes, seek to clip start
    useEffect(() => {
      if (clipRange && videoRef.current) {
        videoRef.current.currentTime = clipRange.start
      }
    }, [clipRange?.start, clipRange?.end])

    useEffect(() => {
      if (videoRef.current) videoRef.current.muted = elementMuted
    }, [elementMuted])

    // Two-finger trackpad horizontal swipe — scoped to this player only.
    // Only active when standalonePreview is enabled to avoid double-handling
    // when this component is embedded inside a tool that already implements
    // its own page-level scrubbing (e.g. the full Video Analyzer).
    //
    // Rapid trackpad gestures can fire dozens of wheel events per second —
    // issuing a seek() on every single one overwhelms the decoder and feels
    // "stuck"/choppy. Instead we accumulate the deltas and apply a single
    // coalesced seek per rendered frame (via requestAnimationFrame), using
    // fastSeek() (nearest-keyframe) for low-latency scrubbing feedback, and
    // skip a frame entirely if the previous seek hasn't resolved yet.
    useEffect(() => {
      if (!standalonePreview) return
      const el = containerRef.current
      if (!el) return

      let pendingDelta = 0
      let rafId: number | null = null

      const applyScrub = () => {
        rafId = null
        const v = videoRef.current
        if (!v || pendingDelta === 0) return
        if (v.seeking) {
          // Decoder still catching up — try again next frame instead of
          // dropping the gesture (this is what keeps fast swipes smooth).
          rafId = requestAnimationFrame(applyScrub)
          return
        }
        const min = clipRange?.start ?? 0
        const max = clipRange?.end ?? v.duration
        const deltaSeconds = (pendingDelta / 80) * 3
        pendingDelta = 0
        const target = Math.max(min, Math.min(max, currentTimeRef.current + deltaSeconds))
        const videoEl = v as HTMLVideoElement & { fastSeek?: (time: number) => void }
        if (videoEl.fastSeek) videoEl.fastSeek(target)
        else v.currentTime = target
      }

      const handler = (e: WheelEvent) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5 && Math.abs(e.deltaX) > 5) {
          e.preventDefault()
          pendingDelta += e.deltaX
          if (rafId === null) rafId = requestAnimationFrame(applyScrub)
        }
      }
      el.addEventListener('wheel', handler, { passive: false })
      return () => {
        el.removeEventListener('wheel', handler)
        if (rafId !== null) cancelAnimationFrame(rafId)
      }
    }, [standalonePreview, clipRange])

    // Left/Right arrow: single-frame step for detailed play review.
    // Shift+Left/Right: bigger ±5s jump. Space: play/pause.
    const handleContainerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!standalonePreview) return
      const v = videoRef.current
      if (!v) return
      if (e.key === 'ArrowLeft') {
        if (presenterEmbed) return
        e.preventDefault()
        if (e.shiftKey) {
          const min = clipRange?.start ?? 0
          v.currentTime = Math.max(min, currentTimeRef.current - 5)
        } else {
          frameStep(-1)
        }
      } else if (e.key === 'ArrowRight') {
        if (presenterEmbed) return
        e.preventDefault()
        if (e.shiftKey) {
          const max = clipRange?.end ?? v.duration
          v.currentTime = Math.min(max, currentTimeRef.current + 5)
        } else {
          frameStep(1)
        }
      } else if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      }
    }, [standalonePreview, presenterEmbed, clipRange, togglePlay, isExpanded, frameStep])

    // Auto-focus the container when entering the expanded overlay so arrow
    // keys work immediately without an extra click.
    useEffect(() => {
      if (standalonePreview && (isExpanded || presenterEmbed)) {
        containerRef.current?.focus()
      }
    }, [standalonePreview, isExpanded, presenterEmbed])

    // Real OS fullscreen toggle
    useEffect(() => {
      const handleFsChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current)
      document.addEventListener('fullscreenchange', handleFsChange)
      return () => document.removeEventListener('fullscreenchange', handleFsChange)
    }, [])

    const toggleFullscreen = useCallback(() => {
      const el = containerRef.current
      if (!el) return
      if (document.fullscreenElement === el) {
        document.exitFullscreen()
      } else {
        el.requestFullscreen?.()
      }
    }, [])

    // Time display: show relative time in clip mode
    const displayTime = clipRange ? currentTime - clipRange.start : currentTime
    const displayDuration = clipRange ? clipRange.end - clipRange.start : duration
    const seekProgress = displayDuration > 0
      ? Math.max(0, Math.min(1, displayTime / displayDuration))
      : 0

    const isPortalExpanded = standalonePreview && isExpanded
    const fillVideo = isPortalExpanded || presenterEmbed || fillFrame

    const player = (
      <div
        ref={containerRef}
        className={
          isPortalExpanded
            ? 'fixed inset-4 z-[100] flex flex-col bg-black outline-none rounded-lg overflow-hidden shadow-2xl'
            : fillVideo
              ? 'flex h-full min-h-0 flex-col overflow-hidden outline-none'
              : 'flex flex-col outline-none'
        }
        tabIndex={standalonePreview ? 0 : undefined}
        onKeyDown={handleContainerKeyDown}
      >
        <video
          ref={videoRef}
          src={src.includes('.m3u8') ? undefined : src}
          preload="auto"
          muted={elementMuted}
          playsInline
          className={
            fillVideo
              ? 'flex-1 min-h-0 w-full object-contain bg-black'
              : 'w-full h-full object-contain bg-black'
          }
          style={contentTransform}
          onClick={togglePlay}
        />

        {/* Controls: seek bar + [Play] [Rewind] [-5] [<f] [f>] [+5] | time | mute | speed */}
        <div className="bg-black/80 text-white text-xs relative z-10 shrink-0">
          <div
            ref={seekBarRef}
            role="slider"
            data-testid="video-seek-bar"
            aria-label="Posición del vídeo"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, Math.round(displayDuration))}
            aria-valuenow={Math.round(Math.max(0, displayTime))}
            aria-valuetext={`${formatTime(Math.max(0, displayTime))} de ${formatTime(displayDuration)}`}
            tabIndex={0}
            className="group relative mx-2 h-5 cursor-pointer touch-none outline-none"
            onPointerDown={(e) => {
              e.preventDefault()
              try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
              seekFromClientX(e.clientX)
            }}
            onPointerMove={(e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
              seekFromClientX(e.clientX)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault()
                e.stopPropagation()
                seek(e.shiftKey ? -5 : -1)
              } else if (e.key === 'ArrowRight') {
                e.preventDefault()
                e.stopPropagation()
                seek(e.shiftKey ? 5 : 1)
              } else if (e.key === 'Home') {
                e.preventDefault()
                e.stopPropagation()
                seekToTime(rangeBounds().min)
              } else if (e.key === 'End') {
                e.preventDefault()
                e.stopPropagation()
                seekToTime(rangeBounds().max)
              }
            }}
          >
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-orange-500"
                style={{ width: `${seekProgress * 100}%` }}
              />
              <div
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow group-hover:h-3.5 group-hover:w-3.5"
                style={{ left: `${seekProgress * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1 px-2 pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
            onClick={togglePlay}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20 touch-none"
            title="Mantén pulsado para rebobinar"
            onPointerDown={startHoldRewind}
            onPointerUp={stopHoldRewind}
            onPointerCancel={stopHoldRewind}
            onLostPointerCapture={stopHoldRewind}
          >
            <Rewind className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
            onClick={() => seek(-5)}
            title="-5s"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
            onClick={() => frameStep(-1)}
            title="Frame anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
            onClick={() => frameStep(1)}
            title="Frame siguiente"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
            onClick={() => seek(5)}
            title="+5s"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-4 bg-white/20 mx-0.5" />

          <span className="tabular-nums text-white/80">
            {formatTime(Math.max(0, Number.isFinite(displayTime) ? displayTime : 0))} / {formatTime(Number.isFinite(displayDuration) ? displayDuration : 0)}
          </span>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            data-testid="video-mute-toggle"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
            onClick={() => {
              const next = !uiMuted
              if (mutedProp === undefined) setInternalMuted(next)
              onMutedChange?.(next)
            }}
            title={uiMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {uiMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>

          <button
            className="px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-white/20 min-w-[32px] text-white/70"
            onClick={cycleSpeed}
          >
            {speed}x
          </button>

          {(standalonePreview || presenterEmbed) && (
            <>
              <div className="w-px h-4 bg-white/20 mx-0.5" />
              {!presenterEmbed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
                  onClick={() => setIsExpanded((v) => !v)}
                  title={isExpanded ? 'Contraer' : 'Ampliar ventana'}
                >
                  {isExpanded ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                data-testid="video-fullscreen-toggle"
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
                onClick={() => (onToggleFullscreen ? onToggleFullscreen() : toggleFullscreen())}
                title={showFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {showFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
          </div>
        </div>
      </div>
    )

    if (isPortalExpanded && typeof document !== 'undefined') {
      return createPortal(
        <>
          <div className="fixed inset-0 z-[99] bg-black/70" onClick={() => setIsExpanded(false)} />
          {player}
        </>,
        document.body
      )
    }

    return player
  }
)
