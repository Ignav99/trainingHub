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
  PLAYBACK_SPEEDS,
  PLAYER_SKIP_SECONDS,
  holdFrameInterval,
  nextPlaybackSpeed,
  assignSkipKey,
  isSkipRebindActive,
  loadSkipKeys,
  saveSkipKeys,
  setSkipRebindActive,
  skipDeltaForKey,
  SKIP_DELTAS,
  type SkipDelta,
  playOnePresentedFrame,
  playForwardToTime,
  PresentedFrameCache,
  seekSnappedAway,
  snapshotVideoFrame,
  frameDuration,
  type ArrowJog,
} from './videoJog'

const HOLD_REWIND_INTERVAL_MS = 70

function skipKeyLabel(key: string) {
  if (!key) return '·'
  return key === 'ñ' ? 'Ñ' : key.toUpperCase()
}

function SkipChip({
  delta,
  shortcut,
  rebinding,
  onSeek,
  onRebind,
}: {
  delta: SkipDelta
  shortcut: string
  rebinding: boolean
  onSeek: () => void
  onRebind: () => void
}) {
  const sign = delta > 0 ? '+' : '−'
  return (
    <span className={`inline-flex h-5 overflow-hidden rounded border text-[10px] tabular-nums ${rebinding ? 'border-orange-300' : 'border-white/15'}`}>
      <button
        type="button"
        className="bg-white/10 px-1 font-mono text-white hover:bg-white/20"
        title={rebinding ? 'Pulsa la nueva tecla. Escape cancela.' : 'Cambiar atajo'}
        onClick={onRebind}
      >
        {skipKeyLabel(shortcut)}
      </button>
      <button
        type="button"
        className="px-1 text-white/80 hover:bg-white/15"
        title={delta < 0 ? `Retroceder ${Math.abs(delta)} s` : `Avanzar ${delta} s`}
        onClick={onSeek}
      >
        {sign}{Math.abs(delta)}s
      </button>
    </span>
  )
}

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
   * jog as the coding desk (two-finger trackpad + arrow skip).
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
  /**
   * Window-level ←/→ frame jog. Defaults to fillFrame. Set false when another
   * player (clip stage) is the one that should receive the arrows.
   */
  keyboardJog?: boolean
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
    keyboardJog,
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
    const [speedOpen, setSpeedOpen] = useState(false)
    const [skipKeys, setSkipKeys] = useState(loadSkipKeys)
    const [rebinding, setRebinding] = useState<SkipDelta | null>(null)
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
    const holdStartedAtRef = useRef(0)
    const jogSilentRef = useRef(false)
    const padActiveRef = useRef(false)
    const catchupRef = useRef<number | null>(null)
    const padIdleTimerRef = useRef<number | null>(null)
    const frameCacheRef = useRef(new PresentedFrameCache(16))
    const overlayRef = useRef<HTMLCanvasElement | null>(null)
    const jogLockRef = useRef(false)
    const reverseHoldRef = useRef(false)
    const jogTokenRef = useRef(0)
    const pendingShuttleRef = useRef<number | null>(null)
    const snapBusyRef = useRef(false)
    const speedRef = useRef(1)
    const onTimeUpdateRef = useRef(onTimeUpdate)
    onTimeUpdateRef.current = onTimeUpdate
    speedRef.current = speed
    const jogPointer = (standalonePreview || fillFrame) && !presenterEmbed
    const jogKeysWindow = (keyboardJog ?? !!fillFrame) && !presenterEmbed
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
        const clock = currentTimeRef.current
        if (clipRange && clock >= clipRange.end - 0.05) {
          v.currentTime = clipRange.start
          currentTimeRef.current = clipRange.start
        }
        if (reverseHoldRef.current && seekSnappedAway(currentTimeRef.current, v.currentTime, fpsRef.current)) {
          const resumeAt = currentTimeRef.current
          jogLockRef.current = true
          v.currentTime = resumeAt
          void waitUntilSeeked(v).finally(() => {
            jogLockRef.current = false
            reverseHoldRef.current = false
            v.style.opacity = ''
            if (overlayRef.current) overlayRef.current.style.opacity = '0'
            void v.play()?.catch(() => undefined)
          })
          return
        }
        reverseHoldRef.current = false
        v.style.opacity = ''
        if (overlayRef.current) overlayRef.current.style.opacity = '0'
        void v.play()?.catch(() => undefined)
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

    const publishTime = useCallback((time: number) => {
      const { min, max } = rangeBounds()
      const next = clampTime(time, min, max)
      currentTimeRef.current = next
      setCurrentTime(next)
      onTimeUpdateRef.current?.(next)
      return next
    }, [rangeBounds])

    const showCached = useCallback((frame: { mediaTime: number; bitmap: ImageBitmap }, opts?: { hideVideo?: boolean }) => {
      const canvas = overlayRef.current
      if (!canvas) return
      canvas.width = frame.bitmap.width
      canvas.height = frame.bitmap.height
      canvas.getContext('2d')?.drawImage(frame.bitmap, 0, 0)
      canvas.style.opacity = '1'
      if (opts?.hideVideo) {
        reverseHoldRef.current = true
        const v = videoRef.current
        if (v) v.style.opacity = '0'
      }
    }, [])

    /** Keep the last good frame on top of the video so a pause, a tag, or a seek cannot flash black. */
    const holdPoster = useCallback(() => {
      const v = videoRef.current
      const canvas = overlayRef.current
      if (!v || !canvas) return
      if (canvas.style.opacity === '1') return
      const hit = frameCacheRef.current.closest(currentTimeRef.current)
      if (!hit) return
      showCached(hit)
    }, [showCached])

    const hideOverlay = useCallback(() => {
      reverseHoldRef.current = false
      const canvas = overlayRef.current
      if (canvas) canvas.style.opacity = '0'
      const v = videoRef.current
      if (v) v.style.opacity = ''
    }, [])

    const rememberFrame = useCallback((mediaTime: number) => {
      const v = videoRef.current
      if (!v || snapBusyRef.current) return
      snapBusyRef.current = true
      void snapshotVideoFrame(v).then((bmp) => {
        snapBusyRef.current = false
        if (bmp) frameCacheRef.current.push(mediaTime, bmp)
      })
    }, [])

    const releaseJogHold = useCallback((opts?: { keepPoster?: boolean }) => {
      jogTokenRef.current += 1
      jogLockRef.current = false
      jogSilentRef.current = false
      pendingShuttleRef.current = null
      if (!opts?.keepPoster) hideOverlay()
      else reverseHoldRef.current = false
    }, [hideOverlay])

    const seekToTime = useCallback((time: number) => {
      const v = videoRef.current
      if (!v) return
      hideOverlay()
      releaseJogHold()
      const { min, max } = rangeBounds()
      const next = clampTime(time, min, max)
      currentTimeRef.current = next
      setCurrentTime(next)
      if (Math.abs((v.currentTime || 0) - next) > 0.04) v.currentTime = next
      else hideOverlay()
      onTimeUpdateRef.current?.(next)
    }, [hideOverlay, rangeBounds, releaseJogHold])

    const seek = useCallback((delta: number) => {
      seekToTime(currentTimeRef.current + delta)
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

    // Seek to `target`, then play through the GOP until that instant.
    // The keyframe Chrome lands on is never published as the playhead.
    const decodeOnce = useCallback(async (target: number) => {
      const v = videoRef.current
      if (!v) return
      const token = jogTokenRef.current
      const { min, max } = rangeBounds()
      const goal = clampTime(target, min, max)
      const from = currentTimeRef.current
      if (Math.abs(goal - from) < 0.0004 && !seekSnappedAway(goal, v.currentTime, fpsRef.current)) {
        hideOverlay()
        return
      }
      const cached = frameCacheRef.current.frameForJog(from, goal, fpsRef.current)
      if (cached && Math.abs(v.currentTime - cached.mediaTime) <= frameDuration(fpsRef.current) * 0.6) {
        publishTime(v.currentTime)
        hideOverlay()
        return
      }
      jogLockRef.current = true
      jogSilentRef.current = true
      try {
        if (!v.paused) v.pause()
        if (token !== jogTokenRef.current) return
        v.playbackRate = 1
        v.style.opacity = ''
        v.currentTime = goal
        if (v.seeking) await waitUntilSeeked(v)
        if (token !== jogTokenRef.current) return
        const landed = await playForwardToTime(v, goal, {
          cancelled: () => token !== jogTokenRef.current,
          onPresented: (mediaTime) => {
            void snapshotVideoFrame(v).then((bmp) => {
              if (bmp && token === jogTokenRef.current) frameCacheRef.current.push(mediaTime, bmp)
            })
          },
        })
        if (token !== jogTokenRef.current) return
        const bmp = await snapshotVideoFrame(v)
        if (bmp) frameCacheRef.current.push(Number.isFinite(landed) ? landed : goal, bmp)
        publishTime(Math.abs(landed - goal) <= frameDuration(fpsRef.current) * 0.6 ? landed : goal)
        hideOverlay()
      } finally {
        if (token === jogTokenRef.current) {
          jogLockRef.current = false
          jogSilentRef.current = false
          reverseHoldRef.current = false
          v.style.opacity = ''
          v.pause()
          v.playbackRate = speedRef.current
          if (overlayRef.current) overlayRef.current.style.opacity = '0'
        }
      }
    }, [hideOverlay, publishTime, rangeBounds, showCached])

    const shuttleToRef = useRef<(time: number) => void>(() => {})

    // One paused frame per call. Never pump from the hold flag — that stacked
    // GOP seeks and jumped to the start of the action. Hold cadence is the timer.
    const runFrameQueue = useCallback(async () => {
      const v = videoRef.current
      if (!v || frameBusyRef.current) return
      if (pendingFramesRef.current === 0) return
      frameBusyRef.current = true
      const dir: 1 | -1 = pendingFramesRef.current > 0 ? 1 : -1
      pendingFramesRef.current -= dir
      try {
        if (!v.paused) v.pause()
        const { min, max } = rangeBounds()
        const clock = currentTimeRef.current
        if (dir === 1) {
          jogSilentRef.current = true
          const next = await playOnePresentedFrame(v)
          jogSilentRef.current = false
          v.pause()
          v.style.opacity = ''
          publishTime(next)
          hideOverlay()
          rememberFrame(currentTimeRef.current)
        } else {
          await decodeOnce(nextFrameTime(clock, -1, fpsRef.current, min, max))
        }
      } finally {
        v.pause()
        frameBusyRef.current = false
        if (pendingShuttleRef.current != null) {
          const target = pendingShuttleRef.current
          pendingShuttleRef.current = null
          shuttleToRef.current(target)
        } else if (pendingFramesRef.current !== 0) {
          void runFrameQueue()
        }
      }
    }, [decodeOnce, hideOverlay, publishTime, rangeBounds, rememberFrame])

    const shuttleTo = useCallback((time: number) => {
      const { min, max } = rangeBounds()
      pendingShuttleRef.current = clampTime(time, min, max)
      if (frameBusyRef.current) {
        jogTokenRef.current += 1
        return
      }
      frameBusyRef.current = true
      void (async () => {
        try {
          while (pendingShuttleRef.current != null) {
            const goal = pendingShuttleRef.current
            pendingShuttleRef.current = null
            await decodeOnce(goal)
          }
        } finally {
          frameBusyRef.current = false
          if (pendingFramesRef.current !== 0) void runFrameQueue()
        }
      })()
    }, [decodeOnce, rangeBounds, runFrameQueue])
    shuttleToRef.current = shuttleTo

    const frameStep = useCallback((direction: 1 | -1) => {
      const v = videoRef.current
      if (v && !v.paused) v.pause()
      pendingFramesRef.current = Math.max(-2, Math.min(2, pendingFramesRef.current + direction))
      void runFrameQueue()
    }, [runFrameQueue])

    useImperativeHandle(ref, () => ({
      getVideoElement: () => videoRef.current,
      getCurrentTime: () => (
        Number.isFinite(currentTimeRef.current) ? currentTimeRef.current : (videoRef.current?.currentTime || 0)
      ),
      seekTo: (time: number) => {
        seekToTime(time)
      },
      seekBy: (delta: number) => {
        seek(delta)
      },
      frameStep,
      pause: () => videoRef.current?.pause(),
      play: () => {
        const v = videoRef.current
        if (!v) return
        if (reverseHoldRef.current && seekSnappedAway(currentTimeRef.current, v.currentTime, fpsRef.current)) {
          const resumeAt = currentTimeRef.current
          jogLockRef.current = true
          v.currentTime = resumeAt
          void waitUntilSeeked(v).finally(() => {
            jogLockRef.current = false
            reverseHoldRef.current = false
            v.style.opacity = ''
            if (overlayRef.current) overlayRef.current.style.opacity = '0'
            void v.play()?.catch(() => undefined)
          })
          return
        }
        hideOverlay()
        void v.play()?.catch(() => undefined)
      },
      setMuted: (next) => {
        setInternalMuted(next)
        if (videoRef.current && !playbackMuted) videoRef.current.muted = next
        onMutedChange?.(next)
      },
    }), [frameStep, hideOverlay, seek, seekToTime, playbackMuted, onMutedChange])

    const cycleSpeed = useCallback(() => {
      const next = nextPlaybackSpeed(speed)
      setSpeed(next)
      if (videoRef.current) videoRef.current.playbackRate = next
    }, [speed])

    const applySpeed = useCallback((next: number) => {
      setSpeed(next)
      setSpeedOpen(false)
      if (videoRef.current) videoRef.current.playbackRate = next
    }, [])

    useEffect(() => {
      const v = videoRef.current
      if (!v) return

      const handleTime = () => {
        if (jogLockRef.current || jogSilentRef.current || reverseHoldRef.current) return
        if (clipRange && v.currentTime >= clipRange.end) {
          v.currentTime = clipRange.end
          v.pause()
        }
        currentTimeRef.current = v.currentTime
        setCurrentTime(v.currentTime)
        onTimeUpdate?.(v.currentTime)
      }
      const handlePlay = () => {
        if (jogSilentRef.current) return
        if (padActiveRef.current || heldJogRef.current) {
          v.pause()
          return
        }
        setPlaying(true)
        onPlayStateChange?.(true)
      }
      const handlePause = () => {
        if (jogSilentRef.current) return
        setPlaying(false)
        onPlayStateChange?.(false)
        if (!reverseHoldRef.current) hideOverlay()
      }
      const handleDuration = () => {
        setDuration(v.duration)
        onDurationChange?.(v.duration)
      }
      const handleSeeked = () => {
        if (jogLockRef.current || jogSilentRef.current || reverseHoldRef.current) return
        if (v.readyState >= 2) hideOverlay()
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
        if (!snapBusyRef.current) {
          snapBusyRef.current = true
          void snapshotVideoFrame(v).then((bmp) => {
            snapBusyRef.current = false
            if (bmp) frameCacheRef.current.push(meta.mediaTime, bmp)
          })
        }
        const canvas = overlayRef.current
        if (reverseHoldRef.current && !jogLockRef.current && meta.mediaTime + 0.04 >= currentTimeRef.current) {
          reverseHoldRef.current = false
          if (canvas) canvas.style.opacity = '0'
          v.style.opacity = ''
          currentTimeRef.current = meta.mediaTime
          setCurrentTime(meta.mediaTime)
          onTimeUpdateRef.current?.(meta.mediaTime)
        } else if (!jogLockRef.current && !reverseHoldRef.current && canvas) {
          canvas.style.opacity = '0'
        }
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

    useEffect(() => {
      frameCacheRef.current.clear()
      reverseHoldRef.current = false
      jogLockRef.current = false
      const canvas = overlayRef.current
      if (canvas) canvas.style.opacity = '0'
      if (videoRef.current) videoRef.current.style.opacity = ''
    }, [src])

    // Trackpad like QuickTime / Sportscode: the <video> element is the picture.
    // One currentTime at a time, latest position wins. No canvas, no second decoder,
    // no play-through of the GOP (that is what made the swipe stutter and look soft).
    useEffect(() => {
      if (!jogPointer) return
      const el = containerRef.current
      if (!el) return

      let pendingPx = 0
      let rafId: number | null = null

      const markPadActive = () => {
        padActiveRef.current = true
        const video = videoRef.current
        if (video && !video.paused && !jogSilentRef.current) video.pause()
        if (video) {
          video.style.opacity = ''
          if (video.playbackRate !== speedRef.current) video.playbackRate = speedRef.current
        }
        reverseHoldRef.current = false
        if (overlayRef.current) overlayRef.current.style.opacity = '0'
        if (padIdleTimerRef.current != null) window.clearTimeout(padIdleTimerRef.current)
        padIdleTimerRef.current = window.setTimeout(() => {
          padActiveRef.current = false
          padIdleTimerRef.current = null
          videoRef.current?.pause()
        }, 120)
      }

      const bounds = () => {
        const v = videoRef.current
        const min = clipRange?.start ?? 0
        const rawMax = clipRange?.end ?? v?.duration ?? 0
        return { min, max: Number.isFinite(rawMax) ? rawMax : min }
      }

      const flush = () => {
        rafId = null
        const v = videoRef.current
        if (!v) return
        if (pendingPx !== 0) {
          const px = pendingPx
          pendingPx = 0
          const { min, max } = bounds()
          const base = v.seeking
            ? currentTimeRef.current
            : (Number.isFinite(v.currentTime) ? v.currentTime : currentTimeRef.current)
          const next = clampTime(base + wheelPixelsToSeconds(px, fpsRef.current), min, max)
          currentTimeRef.current = next
          setCurrentTime(next)
          onTimeUpdateRef.current?.(next)
          if (!v.seeking) v.currentTime = next
          else catchupRef.current = next
        }
      }

      const onSeeked = () => {
        const video = videoRef.current
        const pending = catchupRef.current
        if (!video || pending == null) {
          if (pendingPx !== 0 && rafId === null) rafId = requestAnimationFrame(flush)
          return
        }
        catchupRef.current = null
        if (Math.abs(video.currentTime - pending) > 0.03) video.currentTime = pending
        else if (pendingPx !== 0 && rafId === null) rafId = requestAnimationFrame(flush)
      }

      const handler = (e: WheelEvent) => {
        if (!isScrubGesture(e.deltaX, e.deltaY)) return
        e.preventDefault()
        markPadActive()
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
        if (padIdleTimerRef.current != null) window.clearTimeout(padIdleTimerRef.current)
        padActiveRef.current = false
      }
    }, [jogPointer, clipRange])

    const stopHoldJog = useCallback(() => {
      heldJogRef.current = null
      jogSilentRef.current = false
      pendingFramesRef.current = 0
      videoRef.current?.pause()
      if (holdTimerRef.current != null) {
        window.clearTimeout(holdTimerRef.current)
        holdTimerRef.current = null
      }
    }, [])

    const applyArrowJog = useCallback((jog: ArrowJog) => {
      const v = videoRef.current
      if (v && !v.paused) v.pause()
      frameStep(jog.direction)
    }, [frameStep])

    const onJogKeyDown = useCallback((e: KeyboardEvent | React.KeyboardEvent) => {
      if (presenterEmbed) return false
      if (isTypingTarget(e.target)) return false
      if (e.defaultPrevented || isSkipRebindActive()) return false
      if (e.metaKey || e.ctrlKey || e.altKey) return false
      const skip = skipDeltaForKey(e.key, skipKeys)
      if (skip != null) {
        e.preventDefault()
        if ('repeat' in e && e.repeat) return true
        seek(skip)
        return true
      }
      const jog = arrowJog(e.key, e.shiftKey)
      if (!jog) return false
      e.preventDefault()
      if ('repeat' in e && e.repeat) return true
      const v = videoRef.current
      if (v && !v.paused) v.pause()
      applyArrowJog(jog)
      if (holdTimerRef.current != null) window.clearTimeout(holdTimerRef.current)
      holdStartedAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now()
      holdTimerRef.current = window.setTimeout(() => {
        heldJogRef.current = jog
        const tick = () => {
          if (!heldJogRef.current) return
          applyArrowJog(heldJogRef.current)
          const held = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - holdStartedAtRef.current
          holdTimerRef.current = window.setTimeout(tick, holdFrameInterval(held))
        }
        tick()
      }, ARROW_HOLD_MS)
      return true
    }, [applyArrowJog, presenterEmbed, seek, skipKeys])

    useEffect(() => {
      setSkipRebindActive(rebinding != null)
      if (rebinding == null) return
      const onKey = (e: KeyboardEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.key === 'Escape') {
          setRebinding(null)
          return
        }
        const next = assignSkipKey(skipKeys, rebinding, e.key)
        if (!next) return
        setSkipKeys(next)
        saveSkipKeys(next)
        setRebinding(null)
      }
      window.addEventListener('keydown', onKey, true)
      return () => {
        window.removeEventListener('keydown', onKey, true)
        setSkipRebindActive(false)
      }
    }, [rebinding, skipKeys])

    const onJogKeyUp = useCallback((e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') stopHoldJog()
    }, [stopHoldJog])

    // Left/Right: one frame while paused. Hold starts slow, then faster.
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
        <div className={fillVideo ? 'relative flex-1 min-h-0 w-full bg-black' : 'relative w-full bg-black'}>
          <video
            ref={videoRef}
            src={src.includes('.m3u8') ? undefined : src}
            preload="auto"
            muted={elementMuted}
            playsInline
            className={
              fillVideo
                ? 'h-full w-full object-contain bg-black'
                : 'w-full h-full object-contain bg-black'
            }
            style={contentTransform}
            onClick={togglePlay}
          />
          <canvas
            ref={overlayRef}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-0"
            aria-hidden
          />
        </div>

        {/* Controls: skip bar + seek bar + [Play] [Rewind] [-5] [<f] [f>] [+5] | time | mute | speed */}
        <div className="bg-black/80 text-white text-xs relative z-10 shrink-0">
          <div className="flex items-center justify-between gap-2 px-2 pt-1" aria-label="Saltos de tiempo">
            <div className="flex items-center gap-1">
              {SKIP_DELTAS.filter((delta) => delta < 0).map((delta) => (
                <SkipChip
                  key={delta}
                  delta={delta}
                  shortcut={skipKeys[delta]}
                  rebinding={rebinding === delta}
                  onSeek={() => seek(delta)}
                  onRebind={() => setRebinding(delta)}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              {SKIP_DELTAS.filter((delta) => delta > 0).map((delta) => (
                <SkipChip
                  key={delta}
                  delta={delta}
                  shortcut={skipKeys[delta]}
                  rebinding={rebinding === delta}
                  onSeek={() => seek(delta)}
                  onRebind={() => setRebinding(delta)}
                />
              ))}
            </div>
          </div>
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
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.stopPropagation()
                onJogKeyDown(e)
                return
              }
              if (e.key === 'Home') {
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
            onClick={() => seek(-PLAYER_SKIP_SECONDS)}
            title={`-${PLAYER_SKIP_SECONDS}s`}
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
            onClick={() => seek(PLAYER_SKIP_SECONDS)}
            title={`+${PLAYER_SKIP_SECONDS}s`}
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

          <div className="relative">
            <button
              type="button"
              className="px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-white/20 min-w-[36px] text-white/70"
              onClick={() => setSpeedOpen((v) => !v)}
              onContextMenu={(e) => {
                e.preventDefault()
                cycleSpeed()
              }}
              title="Velocidad. Clic para elegir, derecho para ciclar"
            >
              {speed}×
            </button>
            {speedOpen ? (
              <div className="absolute bottom-8 right-0 z-20 min-w-[72px] overflow-hidden rounded border border-white/15 bg-black/95 py-1">
                {PLAYBACK_SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`block w-full px-3 py-1 text-left font-mono text-[11px] hover:bg-white/15 ${Math.abs(s - speed) < 0.001 ? 'text-orange-400' : 'text-white/80'}`}
                    onClick={() => applySpeed(s)}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            ) : null}
          </div>

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
