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
import {
  ARROW_HOLD_MS,
  BROADCAST_FPS,
  arrowJog,
  clampTime,
  estimateFps,
  isScrubGesture,
  isTypingTarget,
  nextFrameTime,
  scrubPixels,
  waitUntilSeeked,
  wheelPixelsToSeconds,
  type ArrowJog,
} from './videoJog'

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
   * list): OS fullscreen, expand overlay, and (unless presenterEmbed) the same
   * frame jog as the coding desk (two-finger trackpad + arrow keys).
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
    const fpsRef = useRef(BROADCAST_FPS)
    const frameBusyRef = useRef(false)
    const pendingFramesRef = useRef(0)
    const heldJogRef = useRef<ArrowJog | null>(null)
    const holdTimerRef = useRef<number | null>(null)
    const onTimeUpdateRef = useRef(onTimeUpdate)
    onTimeUpdateRef.current = onTimeUpdate
    const jogPointer = (standalonePreview || fillFrame) && !presenterEmbed
    const jogKeysWindow = !!fillFrame && !presenterEmbed
    const jogKeysContainer = !!standalonePreview && !presenterEmbed

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
      const next = clampTime(time, min, max)
      currentTimeRef.current = next
      setCurrentTime(next)
      v.currentTime = next
      onTimeUpdateRef.current?.(next)
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

    // Frame step: pause, nudge by 1/fps, wait for seeked so long-GOP H.264
    // match files stay in lockstep with the keys (web.dev rVFC + MDN currentTime).
    const runFrameQueue = useCallback(async () => {
      const v = videoRef.current
      if (!v || frameBusyRef.current) return
      frameBusyRef.current = true
      try {
        while (true) {
          let dir: 1 | -1 | 0 = 0
          if (pendingFramesRef.current !== 0) {
            dir = pendingFramesRef.current > 0 ? 1 : -1
            pendingFramesRef.current -= dir
          } else if (heldJogRef.current?.kind === 'frame') {
            dir = heldJogRef.current.direction
          }
          if (dir === 0) break
          if (!v.paused) v.pause()
          const { min, max } = rangeBounds()
          const from = v.currentTime
          const next = nextFrameTime(from, dir, fpsRef.current, min, max)
          if (Math.abs(next - from) < 0.0004) break
          currentTimeRef.current = next
          setCurrentTime(next)
          v.currentTime = next
          onTimeUpdateRef.current?.(next)
          if (v.seeking) await waitUntilSeeked(v)
          else await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        }
      } finally {
        frameBusyRef.current = false
        if (pendingFramesRef.current !== 0 || heldJogRef.current?.kind === 'frame') {
          void runFrameQueue()
        }
      }
    }, [rangeBounds])

    const frameStep = useCallback((direction: 1 | -1) => {
      pendingFramesRef.current = Math.max(-8, Math.min(8, pendingFramesRef.current + direction))
      void runFrameQueue()
    }, [runFrameQueue])

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

    useEffect(() => {
      const v = videoRef.current as (HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: (now: number, metadata: { presentedFrames: number; mediaTime: number }) => void) => number
      }) | null
      if (!v || typeof v.requestVideoFrameCallback !== 'function') return
      let last: { frames: number; mediaTime: number } | null = null
      let active = true
      const sample = (_now: number, meta: { presentedFrames: number; mediaTime: number }) => {
        if (!active) return
        if (last) {
          const fps = estimateFps(meta.presentedFrames - last.frames, meta.mediaTime - last.mediaTime)
          if (fps) fpsRef.current = fps
        }
        last = { frames: meta.presentedFrames, mediaTime: meta.mediaTime }
        if (!v.paused) v.requestVideoFrameCallback!(sample)
      }
      const onPlay = () => {
        last = null
        v.requestVideoFrameCallback!(sample)
      }
      v.addEventListener('play', onPlay)
      return () => {
        active = false
        v.removeEventListener('play', onPlay)
      }
    }, [src])

    // When clipRange changes, seek to clip start
    useEffect(() => {
      if (clipRange && videoRef.current) {
        videoRef.current.currentTime = clipRange.start
      }
    }, [clipRange?.start, clipRange?.end])

    useEffect(() => {
      if (videoRef.current) videoRef.current.muted = elementMuted
    }, [elementMuted])

    // Two-finger trackpad jog. One decoder seek in flight; playhead is optimistic
    // so a 90-minute file stays fluid instead of queueing dozens of GOP decodes.
    useEffect(() => {
      if (!jogPointer) return
      const el = containerRef.current
      if (!el) return

      let pendingPx = 0
      let pendingTarget: number | null = null
      let rafId: number | null = null

      const bounds = () => {
        const v = videoRef.current
        const min = clipRange?.start ?? 0
        const rawMax = clipRange?.end ?? v?.duration ?? 0
        return { min, max: Number.isFinite(rawMax) ? rawMax : min }
      }

      const commitDecoder = (time: number) => {
        const v = videoRef.current
        if (!v) return
        if (!v.paused) v.pause()
        if (v.seeking) {
          pendingTarget = time
          return
        }
        pendingTarget = null
        if (Math.abs(v.currentTime - time) < 0.0008) return
        v.currentTime = time
      }

      const flush = () => {
        rafId = null
        const v = videoRef.current
        if (!v) return
        if (pendingPx !== 0) {
          const { min, max } = bounds()
          const next = clampTime(
            currentTimeRef.current + wheelPixelsToSeconds(pendingPx, fpsRef.current),
            min,
            max
          )
          pendingPx = 0
          currentTimeRef.current = next
          setCurrentTime(next)
          onTimeUpdateRef.current?.(next)
          commitDecoder(next)
        }
      }

      const onSeeked = () => {
        if (pendingTarget != null) {
          const t = pendingTarget
          pendingTarget = null
          commitDecoder(t)
        } else if (pendingPx !== 0 && rafId === null) {
          rafId = requestAnimationFrame(flush)
        }
      }

      const handler = (e: WheelEvent) => {
        if (!isScrubGesture(e.deltaX, e.deltaY)) return
        e.preventDefault()
        pendingPx += scrubPixels(e.deltaX, e.deltaY)
        if (rafId === null) rafId = requestAnimationFrame(flush)
      }

      const v = videoRef.current
      v?.addEventListener('seeked', onSeeked)
      el.addEventListener('wheel', handler, { passive: false })
      return () => {
        v?.removeEventListener('seeked', onSeeked)
        el.removeEventListener('wheel', handler)
        if (rafId !== null) cancelAnimationFrame(rafId)
      }
    }, [jogPointer, clipRange])

    const stopHoldJog = useCallback(() => {
      heldJogRef.current = null
      if (holdTimerRef.current != null) {
        window.clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
    }, [])

    const applyArrowJog = useCallback((jog: ArrowJog) => {
      if (jog.kind === 'frame') {
        frameStep(jog.direction)
        return
      }
      const v = videoRef.current
      if (!v) return
      if (!v.paused) v.pause()
      seekToTime(v.currentTime + jog.direction)
    }, [frameStep, seekToTime])

    const onJogKeyDown = useCallback((e: KeyboardEvent | React.KeyboardEvent) => {
      if (presenterEmbed) return false
      if (isTypingTarget(e.target)) return false
      const jog = arrowJog(e.key, e.shiftKey)
      if (!jog) return false
      e.preventDefault()
      if ('repeat' in e && e.repeat) return true
      applyArrowJog(jog)
      if (holdTimerRef.current != null) window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = window.setTimeout(() => {
        heldJogRef.current = jog
        if (jog.kind === 'frame') {
          void runFrameQueue()
          return
        }
        const tick = () => {
          if (heldJogRef.current?.kind !== 'second') return
          applyArrowJog(heldJogRef.current)
          holdTimerRef.current = window.setTimeout(tick, 90)
        }
        tick()
      }, ARROW_HOLD_MS)
      return true
    }, [applyArrowJog, presenterEmbed, runFrameQueue])

    const onJogKeyUp = useCallback((e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') stopHoldJog()
    }, [stopHoldJog])

    // Left/Right: one frame. Shift+Left/Right: 1s. Hold keeps stepping at decoder pace.
    const handleContainerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!jogKeysContainer) return
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
        return
      }
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
        return
      }
      onJogKeyDown(e)
    }, [jogKeysContainer, togglePlay, isExpanded, onJogKeyDown])

    useEffect(() => {
      if (!jogKeysWindow) return
      const down = (e: KeyboardEvent) => { onJogKeyDown(e) }
      const up = (e: KeyboardEvent) => { onJogKeyUp(e) }
      window.addEventListener('keydown', down)
      window.addEventListener('keyup', up)
      return () => {
        window.removeEventListener('keydown', down)
        window.removeEventListener('keyup', up)
        stopHoldJog()
      }
    }, [jogKeysWindow, onJogKeyDown, onJogKeyUp, stopHoldJog])

    // Auto-focus the container when entering the expanded overlay so arrow
    // keys work immediately without an extra click.
    useEffect(() => {
      if (fillFrame && !presenterEmbed) containerRef.current?.focus()
      if (standalonePreview && (isExpanded || presenterEmbed)) {
        containerRef.current?.focus()
      }
    }, [standalonePreview, isExpanded, presenterEmbed, fillFrame, src])

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
        tabIndex={jogPointer ? 0 : undefined}
        onKeyDown={handleContainerKeyDown}
        onKeyUp={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') stopHoldJog()
        }}
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
                if (e.shiftKey) seek(-1)
                else frameStep(-1)
              } else if (e.key === 'ArrowRight') {
                e.preventDefault()
                e.stopPropagation()
                if (e.shiftKey) seek(1)
                else frameStep(1)
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
            title="Frame anterior (←)"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
            onClick={() => frameStep(1)}
            title="Frame siguiente (→)"
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
