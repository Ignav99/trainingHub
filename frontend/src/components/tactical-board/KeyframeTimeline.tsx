'use client'

import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import { TransitionType } from './types'

export default function KeyframeTimeline() {
  const keyframes = useTacticalBoardStore((s) => s.keyframes)
  const activeKeyframeIndex = useTacticalBoardStore((s) => s.activeKeyframeIndex)
  const isPlaying = useTacticalBoardStore((s) => s.isPlaying)
  const addKeyframe = useTacticalBoardStore((s) => s.addKeyframe)
  const deleteKeyframe = useTacticalBoardStore((s) => s.deleteKeyframe)
  const selectKeyframe = useTacticalBoardStore((s) => s.selectKeyframe)
  const updateKeyframeDuration = useTacticalBoardStore((s) => s.updateKeyframeDuration)
  const updateKeyframeTransition = useTacticalBoardStore((s) => s.updateKeyframeTransition)
  const updateKeyframeNotes = useTacticalBoardStore((s) => s.updateKeyframeNotes)

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0 overflow-x-auto">
      {/* Keyframe boxes */}
      {keyframes.map((kf, idx) => (
        <div
          key={kf.id}
          onClick={() => !isPlaying && selectKeyframe(idx)}
          className={`flex-shrink-0 rounded-lg border-2 px-3 py-2 cursor-pointer transition-colors ${
            idx === activeKeyframeIndex
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          } ${isPlaying ? 'pointer-events-none opacity-60' : ''}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-gray-700">
              {idx + 1}
            </span>
            {keyframes.length > 1 && !isPlaying && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteKeyframe(idx) }}
                className="p-0.5 text-gray-400 hover:text-red-500"
                title="Eliminar frame"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={kf.duration_ms}
              onChange={(e) => updateKeyframeDuration(idx, Math.max(100, parseInt(e.target.value) || 2000))}
              onClick={(e) => e.stopPropagation()}
              className="w-14 text-[10px] px-1 py-0.5 border border-gray-200 rounded text-center bg-white"
              title="Duracion (ms)"
              min={100}
              step={100}
              disabled={isPlaying}
            />
            <span className="text-[9px] text-gray-400">ms</span>
          </div>
          <select
            value={kf.transition_type}
            onChange={(e) => updateKeyframeTransition(idx, e.target.value as TransitionType)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 w-full text-[10px] px-1 py-0.5 border border-gray-200 rounded bg-white"
            disabled={isPlaying}
          >
            <option value="linear">Linear</option>
            <option value="ease">Ease</option>
            <option value="ease-in-out">Ease In-Out</option>
          </select>
          <input
            type="text"
            value={kf.notes || ''}
            onChange={(e) => updateKeyframeNotes(idx, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Nota..."
            className="mt-1 w-full text-[10px] px-1 py-0.5 border border-gray-200 rounded bg-white placeholder-gray-300"
            disabled={isPlaying}
          />
        </div>
      ))}

      {/* Add keyframe button */}
      {!isPlaying && (
        <button
          onClick={addKeyframe}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          title="Añadir keyframe"
        >
          <Plus className="h-4 w-4" />
          Frame
        </button>
      )}
    </div>
  )
}
