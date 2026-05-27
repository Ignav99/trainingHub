// src/components/video-analyzer/windows/BotoneraWindow.tsx
'use client'
import { useCallback } from 'react'
import { useCodeWindowStore } from '../useCodeWindowStore'
import type { CodeButton } from '../types'

interface BotoneraWindowProps {
  videoKey: string
  currentTime: number
  videoDuration: number
  onTagCreated?: (event: { buttonId: string; startTime: number; endTime: number }) => void
}

export function BotoneraWindow({ videoKey, currentTime, videoDuration, onTagCreated }: BotoneraWindowProps) {
  const { buttons, recordEvent, isEditMode, setEditMode, addButton, updateButton, removeButton } = useCodeWindowStore()

  const handlePress = useCallback((btn: CodeButton) => {
    useCodeWindowStore.getState().setCurrentVideoKey(videoKey)
    const event = recordEvent(btn.id, currentTime, videoDuration)
    onTagCreated?.({
      buttonId: btn.id,
      startTime: event.startTime,
      endTime: event.endTime,
    })
  }, [videoKey, currentTime, videoDuration, recordEvent, onTagCreated])

  if (buttons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-zinc-500 text-sm">
        <p>Sin botones</p>
        <button
          className="px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs"
          onClick={() => addButton({ label: 'Nuevo', color: '#6366f1', shortcut: '', preRoll: 5, postRoll: 5 })}
        >
          + Agregar botón
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Buttons grid */}
      <div className="flex-1 p-3 grid gap-2 overflow-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
        {buttons.map(btn => (
          <button
            key={btn.id}
            onClick={() => handlePress(btn)}
            className="flex flex-col items-center justify-center gap-1 rounded-lg p-2 h-16 text-white font-medium text-xs transition-all active:scale-95 hover:brightness-110 select-none"
            style={{ backgroundColor: btn.color + 'cc', border: `1px solid ${btn.color}` }}
          >
            {btn.shortcut && (
              <span className="text-[9px] opacity-60 font-mono">[{btn.shortcut}]</span>
            )}
            <span className="text-center leading-tight">{btn.label}</span>
            <span className="text-[9px] opacity-50">{btn.preRoll}s / {btn.postRoll}s</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-white/10">
        <button
          className={`px-2 py-1 rounded text-[10px] transition-colors ${isEditMode ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          onClick={() => setEditMode(!isEditMode)}
        >
          {isEditMode ? 'Listo' : 'Editar'}
        </button>
        {isEditMode && (
          <button
            className="px-2 py-1 rounded text-[10px] bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            onClick={() => addButton({ label: 'Nuevo', color: '#6366f1', shortcut: '', preRoll: 5, postRoll: 5 })}
          >
            + Botón
          </button>
        )}
      </div>

      {/* Edit mode: button list */}
      {isEditMode && (
        <div className="border-t border-zinc-700 p-2 space-y-1 max-h-48 overflow-y-auto">
          {buttons.map(btn => (
            <div key={btn.id} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: btn.color }} />
              <input
                className="flex-1 bg-zinc-800 rounded px-2 py-1 text-white text-xs border border-zinc-700 focus:border-indigo-500 outline-none"
                value={btn.label}
                onChange={(e) => updateButton(btn.id, { label: e.target.value })}
              />
              <input
                className="w-10 bg-zinc-800 rounded px-2 py-1 text-white text-xs border border-zinc-700 focus:border-indigo-500 outline-none text-center font-mono"
                value={btn.shortcut ?? ''}
                maxLength={1}
                placeholder="Key"
                onChange={(e) => updateButton(btn.id, { shortcut: e.target.value.toUpperCase() })}
              />
              <button
                className="text-red-400 hover:text-red-300 p-1"
                onClick={() => removeButton(btn.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
