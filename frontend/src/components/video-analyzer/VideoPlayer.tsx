'use client'

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
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
} from 'lucide-react'
import { formatTime } from './utils'

export interface VideoPlayerHandle {
  getVideoElement: () => HTMLVideoElement | null
  getCurrentTime: () => number
  seekTo: (time: number) => void
  pause: () => void
  play: () => void
}

interface VideoPlayerProps {
  src: string
  clipRange?: { start: number; end: number }
  onTimeUpdate?: (time: number) => void
  onPlayStateChange?: (playing: boolean) => void
  onDurationChange?: (duration: number) => void
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, clipRange, onTimeUpdate, onPlayStateChange, onDurationChange }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [playing, setPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [muted, setMuted] = useState(false)
    const [speed, setSpeed] = useState(1)

    useImperativeHandle(ref, () => ({
      getVideoElement: () => videoRef.current,
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      seekTo: (time: number) => {
        if (videoRef.current) {
          // Clamp to clip range if active
          if (clipRange) {
            time = Math.max(clipRange.start, Math.min(clipRange.end, time))
          }
          videoRef.current.currentTime = time
        }
      },
      pause: () => videoRef.current?.pause(),
      play: () => videoRef.current?.play(),
    }))

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

    const seek = useCallback((delta: number) => {
      const v = videoRef.current
      if (!v) return
      const min = clipRange?.start ?? 0
      const max = clipRange?.end ?? v.duration
      v.currentTime = Math.max(min, Math.min(max, v.currentTime + delta))
    }, [clipRange])

    const frameStep = useCallback((direction: 1 | -1) => {
      const v = videoRef.current
      if (!v || !v.paused) return
      const min = clipRange?.start ?? 0
      const max = clipRange?.end ?? v.duration
      v.currentTime = Math.max(min, Math.min(max, v.currentTime + direction / 30))
    }, [clipRange])

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

      v.addEventListener('timeupdate', handleTime)
      v.addEventListener('play', handlePlay)
      v.addEventListener('pause', handlePause)
      v.addEventListener('loadedmetadata', handleDuration)

      return () => {
        v.removeEventListener('timeupdate', handleTime)
        v.removeEventListener('play', handlePlay)
        v.removeEventListener('pause', handlePause)
        v.removeEventListener('loadedmetadata', handleDuration)
      }
    }, [clipRange, onTimeUpdate, onPlayStateChange, onDurationChange])

    // When clipRange changes, seek to clip start
    useEffect(() => {
      if (clipRange && videoRef.current) {
        videoRef.current.currentTime = clipRange.start
      }
    }, [clipRange?.start, clipRange?.end])

    // Time display: show relative time in clip mode
    const displayTime = clipRange ? currentTime - clipRange.start : currentTime
    const displayDuration = clipRange ? clipRange.end - clipRange.start : duration

    return (
      <div className="flex flex-col">
        <video
          ref={videoRef}
          src={src.includes('.m3u8') ? undefined : src}
          preload="metadata"
          muted={muted}
          className="w-full h-full object-contain bg-black"
          onClick={togglePlay}
        />

        {/* Compact controls: [Play] [-5] [<f] [f>] [+5] | time | [mute] [speed] */}
        <div className="flex items-center gap-1 px-2 py-1 bg-black/80 text-white text-xs">
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
            {formatTime(Math.max(0, displayTime))} / {formatTime(displayDuration)}
          </span>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
            onClick={() => setMuted(!muted)}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>

          <button
            className="px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-white/20 min-w-[32px] text-white/70"
            onClick={cycleSpeed}
          >
            {speed}x
          </button>
        </div>
      </div>
    )
  }
)
