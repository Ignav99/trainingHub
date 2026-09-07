'use client'

import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Play, Pause, RotateCcw, Repeat } from 'lucide-react'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import { sampleAnimation, totalDuration, compactKeyframes, type AnimationState } from './interpolate'

export type { AnimationState }

interface AnimationPlayerProps {
  onFrame: (state: AnimationState) => void
}

export default function AnimationPlayer({ onFrame }: AnimationPlayerProps) {
  const keyframes = useTacticalBoardStore((s) => s.keyframes)
  const isPlaying = useTacticalBoardStore((s) => s.isPlaying)
  const setIsPlaying = useTacticalBoardStore((s) => s.setIsPlaying)
  const selectKeyframe = useTacticalBoardStore((s) => s.selectKeyframe)
  const saveCurrentToKeyframe = useTacticalBoardStore((s) => s.saveCurrentToKeyframe)

  const [speed, setSpeed] = useState(1)
  const [loop, setLoop] = useState(false)
  const [progress, setProgress] = useState(0) // 0 to 1 across all keyframes

  const rafRef = useRef<number>(0)
  const startTimeRef = useRef(0)

  const playable = compactKeyframes(keyframes)

  const animate = useCallback(() => {
    const frames = compactKeyframes(useTacticalBoardStore.getState().keyframes)
    if (frames.length < 2) return

    const elapsed = (performance.now() - startTimeRef.current) * speed
    const totalMs = Math.max(1, totalDuration(frames))
    let t = elapsed / totalMs

    if (t >= 1) {
      if (loop) {
        startTimeRef.current = performance.now()
        t = 0
      } else {
        t = 1
        setIsPlaying(false)
        setProgress(1)
        const last = frames[frames.length - 1]
        onFrame({ elements: last.elements, arrows: last.arrows, zones: last.zones })
        return
      }
    }

    setProgress(t)
    const sampled = sampleAnimation(frames, t)
    if (sampled) onFrame(sampled)

    rafRef.current = requestAnimationFrame(animate)
  }, [speed, loop, onFrame, setIsPlaying])

  useEffect(() => {
    if (isPlaying && playable.length >= 2) {
      startTimeRef.current = performance.now()
      rafRef.current = requestAnimationFrame(animate)
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying, animate, playable.length])

  const handlePlay = () => {
    if (compactKeyframes(keyframes).length < 2) return
    // Save current edits to keyframe before playing
    saveCurrentToKeyframe()
    setProgress(0)
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setProgress(0)
    if (keyframes.length > 0) {
      selectKeyframe(0)
    }
  }

  if (playable.length < 2) {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 text-[11px] text-gray-400">
        Añade al menos 2 frames para reproducir la animacion
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 border-t border-gray-100 bg-white flex-shrink-0">
      {/* Play/Pause */}
      <button
        onClick={isPlaying ? handlePause : handlePlay}
        className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        title={isPlaying ? 'Pausar' : 'Reproducir'}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      {/* Reset */}
      <button
        onClick={handleReset}
        className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
        title="Reiniciar"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-[width] duration-75"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Speed */}
      <select
        value={speed}
        onChange={(e) => setSpeed(parseFloat(e.target.value))}
        className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white"
      >
        <option value={0.5}>0.5x</option>
        <option value={1}>1x</option>
        <option value={2}>2x</option>
      </select>

      {/* Loop */}
      <button
        onClick={() => setLoop(!loop)}
        className={`p-1.5 rounded-lg transition-colors ${loop ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}
        title="Loop"
      >
        <Repeat className="h-4 w-4" />
      </button>
    </div>
  )
}
