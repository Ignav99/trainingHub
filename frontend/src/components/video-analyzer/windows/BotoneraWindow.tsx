// src/components/video-analyzer/windows/BotoneraWindow.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil } from 'lucide-react'
import { useCodeWindowStore } from '../useCodeWindowStore'
import type { CodeButton } from '../types'

interface BotoneraWindowProps {
  videoKey: string
  currentTime: number
  videoDuration: number
  onTagCreated?: (event: { buttonId: string; startTime: number; endTime: number }) => void
}

// ──────────────────────────────────────────────────────────────────
// EditModal — rendered via React portal so it floats above everything
// ──────────────────────────────────────────────────────────────────
interface EditModalProps {
  btn: CodeButton
  anchor: { x: number; y: number }
  onClose: () => void
  onUpdate: (id: string, patch: Partial<Omit<CodeButton, 'id'>>) => void
  onRemove: (id: string) => void
}

function EditModal({ btn, anchor, onClose, onUpdate, onRemove }: EditModalProps) {
  const [label, setLabel] = useState(btn.label)
  const [color, setColor] = useState(btn.color)
  const [preRoll, setPreRoll] = useState(btn.preRoll)
  const [postRoll, setPostRoll] = useState(btn.postRoll)
  const [shortcut, setShortcut] = useState(btn.shortcut ?? '')

  const POPUP_W = 224
  const POPUP_H = 300
  const left = Math.min(anchor.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - POPUP_W - 12)
  const top = Math.min(anchor.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - POPUP_H - 12)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = () => {
    onUpdate(btn.id, {
      label: label.trim() || btn.label,
      color,
      preRoll,
      postRoll,
      shortcut,
    })
    onClose()
  }

  return createPortal(
    <>
      {/* Invisible backdrop — click outside closes */}
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />

      {/* Popup */}
      <div
        className="fixed z-[9999] flex flex-col gap-3 bg-[#1c1c1c] rounded-xl border border-white/15 p-4 shadow-2xl"
        style={{ left, top, width: POPUP_W }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white/80">Editar botón</span>
          <button
            className="text-white/30 hover:text-white/80 text-sm leading-none transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Label */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] uppercase tracking-wider text-white/40">Label</label>
          <input
            className="w-full bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-white/30"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
        </div>

        {/* Color */}
        <div className="flex items-center gap-2">
          <label className="text-[9px] uppercase tracking-wider text-white/40 flex-1">Color</label>
          <div className="w-6 h-6 rounded border border-white/10" style={{ backgroundColor: color }} />
          <input
            type="color"
            className="w-8 h-6 rounded cursor-pointer bg-transparent border border-white/10"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>

        {/* PreRoll / PostRoll */}
        <div className="flex gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[9px] uppercase tracking-wider text-white/40">Pre (s)</label>
            <input
              type="number" min={0} max={30}
              className="w-full bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-white/30"
              value={preRoll}
              onChange={(e) => setPreRoll(Math.max(0, Math.min(30, Number(e.target.value))))}
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[9px] uppercase tracking-wider text-white/40">Post (s)</label>
            <input
              type="number" min={0} max={30}
              className="w-full bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-white/30"
              value={postRoll}
              onChange={(e) => setPostRoll(Math.max(0, Math.min(30, Number(e.target.value))))}
            />
          </div>
        </div>

        {/* Shortcut */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] uppercase tracking-wider text-white/40">Atajo teclado</label>
          <input
            className="w-full bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-white/30 font-mono uppercase"
            value={shortcut}
            maxLength={1}
            onChange={(e) => setShortcut(e.target.value.toUpperCase())}
            placeholder="1 carácter"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            className="flex-1 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs text-white transition-colors"
            onClick={handleSave}
          >
            Guardar
          </button>
          <button
            className="flex-1 py-1.5 rounded bg-red-900/60 hover:bg-red-800/80 text-xs text-red-300 transition-colors"
            onClick={() => { onRemove(btn.id); onClose() }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

// ──────────────────────────────────────────────────────────────────
// BotoneraWindow
// ──────────────────────────────────────────────────────────────────
export function BotoneraWindow({
  videoKey,
  currentTime,
  videoDuration,
  onTagCreated,
}: BotoneraWindowProps) {
  const { buttons, recordEvent, addButton, updateButton, removeButton } = useCodeWindowStore()
  const [editState, setEditState] = useState<{ id: string; x: number; y: number } | null>(null)

  const handlePress = useCallback(
    (btn: CodeButton) => {
      useCodeWindowStore.getState().setCurrentVideoKey(videoKey)
      const event = recordEvent(btn.id, currentTime, videoDuration)
      onTagCreated?.({
        buttonId: btn.id,
        startTime: event.startTime,
        endTime: event.endTime,
      })
    },
    [videoKey, currentTime, videoDuration, recordEvent, onTagCreated]
  )

  const handlePencilClick = useCallback((e: React.MouseEvent, btn: CodeButton) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setEditState((prev) =>
      prev?.id === btn.id ? null : { id: btn.id, x: rect.right + 8, y: rect.top }
    )
  }, [])

  const editingBtn = editState ? buttons.find((b) => b.id === editState.id) : null

  return (
    <div className="flex flex-col h-full bg-[#111]">
      {/* Buttons grid */}
      <div
        className="flex-1 p-3 grid gap-2 overflow-auto"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}
      >
        {buttons.length === 0 && (
          <div className="col-span-full flex items-center justify-center text-white/25 text-xs py-4">
            Sin botones
          </div>
        )}

        {buttons.map((btn) => (
          <div key={btn.id} className="relative group">
            {/* Button */}
            <button
              onClick={() => handlePress(btn)}
              className="w-full flex flex-col items-center justify-center gap-1 rounded-lg p-2 h-16 text-white font-medium text-xs transition-all active:scale-95 hover:brightness-110 select-none"
              style={{
                backgroundColor: btn.color + 'cc',
                border: `1px solid ${btn.color}`,
              }}
            >
              {btn.shortcut && (
                <span className="text-[9px] opacity-60 font-mono">[{btn.shortcut}]</span>
              )}
              <span className="text-center leading-tight">{btn.label}</span>
              <span className="text-[9px] opacity-50">
                {btn.preRoll}s / {btn.postRoll}s
              </span>
            </button>

            {/* Pencil icon — shown on hover, opens portal modal */}
            <button
              className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded bg-black/60 text-white/50 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={(e) => handlePencilClick(e, btn)}
              title="Editar botón"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3 py-2 border-t border-white/10">
        <button
          className="w-full py-1.5 rounded bg-[#27272a] hover:bg-zinc-700 text-white/60 hover:text-white text-xs transition-colors"
          onClick={() =>
            addButton({
              label: 'Nuevo',
              color: '#6366f1',
              shortcut: '',
              preRoll: 5,
              postRoll: 5,
            })
          }
        >
          + Añadir botón
        </button>
      </div>

      {/* Portal edit modal */}
      {editingBtn && editState && (
        <EditModal
          btn={editingBtn}
          anchor={{ x: editState.x, y: editState.y }}
          onClose={() => setEditState(null)}
          onUpdate={updateButton}
          onRemove={removeButton}
        />
      )}
    </div>
  )
}
