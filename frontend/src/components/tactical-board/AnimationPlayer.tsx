'use client'

import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Play, Pause, RotateCcw, Repeat } from 'lucide-react'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import { DiagramElement, DiagramArrow, DiagramZone, Keyframe } from './types'

// Easing functions
function easeLinear(t: number) { return t }
function easeQuad(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 }
function easeCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }

function getEasing(type: string): (t: number) => number {
  switch (type) {
    case 'ease': return easeQuad
    case 'ease-in-out': return easeCubic
    default: return easeLinear
  }
}

// Interpolate element positions between two keyframes
function lerpElements(from: DiagramElement[], to: DiagramElement[], t: number): DiagramElement[] {
  return to.map((toEl) => {
    const fromEl = from.find((e) => e.id === toEl.id)
    if (!fromEl) {
      // Element only in target: fade in
      return { ...toEl, color: toEl.color }
    }
    return {
      ...toEl,
      position: {
        x: fromEl.position.x + (toEl.position.x - fromEl.position.x) * t,
        y: fromEl.position.y + (toEl.position.y - fromEl.position.y) * t,
      },
    }
  })
}

// Arrows/zones snap at halfway point
function snapItems<T>(from: T[], to: T[], t: number): T[] {
  return t < 0.5 ? from : to
}

export interface AnimationState {
  elements: DiagramElement[]
  arrows: DiagramArrow[]
  zones: DiagramZone[]
}

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

  const totalDuration = keyframes.reduce((sum, kf) => sum + kf.duration_ms, 0)

  const animate = useCallback(() => {
    if (keyframes.length < 2) return

    const elapsed = (performance.now() - startTimeRef.current) * speed
    const totalMs = totalDuration
    let t = elapsed / totalMs

    if (t >= 1) {
      if (loop) {
        startTimeRef.current = performance.now()
        t = 0
      } else {
        t = 1
        setIsPlaying(false)
        setProgress(1)
        // Show last keyframe
        const last = keyframes[keyframes.length - 1]
        onFrame({ elements: last.elements, arrows: last.arrows, zones: last.zones })
        return
      }
    }

    setProgress(t)

    // Find which segment we're in
    let accMs = 0
    let segIdx = 0
    const currentMs = t * totalMs
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (currentMs < accMs + keyframes[i].duration_ms) {
        segIdx = i
        break
      }
      accMs += keyframes[i].duration_ms
      segIdx = i + 1
    }
    segIdx = Math.min(segIdx, keyframes.length - 2)

    const segStart = accMs
    const segDuration = keyframes[segIdx].duration_ms
    const segProgress = Math.min(1, (currentMs - segStart) / segDuration)
    const easing = getEasing(keyframes[segIdx].transition_type)
    const easedT = easing(segProgress)

    const from = keyframes[segIdx]
    const to = keyframes[segIdx + 1]

    onFrame({
      elements: lerpElements(from.elements, to.elements, easedT),
      arrows: snapItems(from.arrows, to.arrows, easedT),
      zones: snapItems(from.zones, to.zones, easedT),
    })

    rafRef.current = requestAnimationFrame(animate)
  }, [keyframes, speed, loop, totalDuration, onFrame, setIsPlaying])

  useEffect(() => {
    if (isPlaying && keyframes.length >= 2) {
      startTimeRef.current = performance.now()
      rafRef.current = requestAnimationFrame(animate)
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying, animate, keyframes.length])

  const handlePlay = () => {
    if (keyframes.length < 2) return
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

  if (keyframes.length < 2) {
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
