'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Edit3, Check, X, GripVertical, LayoutGrid, ListIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCodeWindowStore } from './useCodeWindowStore'
import type { CodeButton } from './types'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  '#ffffff', '#94a3b8',
]

interface CodeWindowPanelProps {
  getCurrentTime: () => number     // current video time in seconds
  videoDuration: number
  onEventRecorded?: (buttonId: string) => void
}

// ─── Button editor (inline form) ─────────────────────────────────────────────

interface ButtonEditorProps {
  initial?: Partial<CodeButton>
  onSave: (btn: Omit<CodeButton, 'id'>) => void
  onCancel: () => void
}

function ButtonEditor({ initial, onSave, onCancel }: ButtonEditorProps) {
  const [label, setLabel] = useState(initial?.label || '')
  const [color, setColor] = useState(initial?.color || PRESET_COLORS[0])
  const [shortcut, setShortcut] = useState(initial?.shortcut || '')
  const [preRoll, setPreRoll] = useState(String(initial?.preRoll ?? 5))
  const [postRoll, setPostRoll] = useState(String(initial?.postRoll ?? 5))

  const handleSave = () => {
    if (!label.trim()) return
    onSave({
      label: label.trim(),
      color,
      shortcut: shortcut.trim().toLowerCase().slice(0, 1) || undefined,
      preRoll: Math.max(0, parseFloat(preRoll) || 5),
      postRoll: Math.max(0, parseFloat(postRoll) || 5),
    })
  }

  return (
    <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/10">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Nombre del botón (ej: Ataque)"
        className="h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/30"
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
        autoFocus
      />

      {/* Color picker */}
      <div className="flex gap-1 flex-wrap">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            className={`w-6 h-6 rounded-full border-2 transition-transform ${
              color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>

      {/* Shortcut + pre/post roll */}
      <div className="flex gap-2">
        <div className="flex-none">
          <label className="text-[9px] text-white/40 block mb-0.5">Atajo</label>
          <Input
            value={shortcut}
            onChange={(e) => setShortcut(e.target.value.slice(-1))}
            placeholder="1"
            maxLength={1}
            className="h-7 w-10 text-center text-xs bg-white/10 border-white/20 text-white"
          />
        </div>
        <div>
          <label className="text-[9px] text-white/40 block mb-0.5">Pre-roll (s)</label>
          <Input
            value={preRoll}
            onChange={(e) => setPreRoll(e.target.value)}
            type="number"
            min={0}
            max={60}
            className="h-7 w-16 text-xs bg-white/10 border-white/20 text-white"
          />
        </div>
        <div>
          <label className="text-[9px] text-white/40 block mb-0.5">Post-roll (s)</label>
          <Input
            value={postRoll}
            onChange={(e) => setPostRoll(e.target.value)}
            type="number"
            min={0}
            max={60}
            className="h-7 w-16 text-xs bg-white/10 border-white/20 text-white"
          />
        </div>
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-1 pt-1">
        <Button
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={handleSave}
          disabled={!label.trim()}
        >
          <Check className="h-3 w-3 mr-1" />
          Guardar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-white/60 hover:text-white"
          onClick={onCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── Main Code Window Panel ───────────────────────────────────────────────────

export function CodeWindowPanel({ getCurrentTime, videoDuration, onEventRecorded }: CodeWindowPanelProps) {
  const buttons = useCodeWindowStore((s) => s.buttons)
  const isEditMode = useCodeWindowStore((s) => s.isEditMode)
  const activeButtonId = useCodeWindowStore((s) => s.activeButtonId)
  const currentVideoKey = useCodeWindowStore((s) => s.currentVideoKey)
  const events = useCodeWindowStore((s) => s.events)
  const setEditMode = useCodeWindowStore((s) => s.setEditMode)
  const setActiveButtonId = useCodeWindowStore((s) => s.setActiveButtonId)
  const addButton = useCodeWindowStore((s) => s.addButton)
  const updateButton = useCodeWindowStore((s) => s.updateButton)
  const removeButton = useCodeWindowStore((s) => s.removeButton)
  const recordEvent = useCodeWindowStore((s) => s.recordEvent)
  const removeEvent = useCodeWindowStore((s) => s.removeEvent)

  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const videoKey = currentVideoKey || '_default'
  const videoEvents = events[videoKey] || []

  // Press a code button → record event
  const handlePress = useCallback((btn: CodeButton) => {
    const t = getCurrentTime()
    recordEvent(btn.id, t, videoDuration)
    onEventRecorded?.(btn.id)

    // Flash feedback
    setFlashId(btn.id)
    setActiveButtonId(btn.id)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => {
      setFlashId(null)
      setActiveButtonId(null)
    }, 600)
  }, [getCurrentTime, videoDuration, recordEvent, onEventRecorded, setActiveButtonId])

  // Keyboard shortcuts
  useEffect(() => {
    if (isEditMode) return
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      const btn = buttons.find((b) => b.shortcut === e.key.toLowerCase())
      if (btn) {
        e.preventDefault()
        handlePress(btn)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [buttons, isEditMode, handlePress])

  const eventsForButton = (btnId: string) =>
    videoEvents.filter((ev) => ev.buttonId === btnId).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10 shrink-0">
        <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">
          Code Window
        </span>
        <div className="flex items-center gap-1">
          <button
            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
              isEditMode
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-white/40 hover:text-white/70'
            }`}
            onClick={() => { setEditMode(!isEditMode); setEditingId(null) }}
          >
            {isEditMode ? <LayoutGrid className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isEditMode ? (
          // ── Edit mode: manage buttons ──────────────────────────────────────
          <>
            {buttons.map((btn) =>
              editingId === btn.id ? (
                <ButtonEditor
                  key={btn.id}
                  initial={btn}
                  onSave={(patch) => { updateButton(btn.id, patch); setEditingId(null) }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div
                  key={btn.id}
                  className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5 group"
                >
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: btn.color }}
                  />
                  <span className="flex-1 text-xs text-white truncate">{btn.label}</span>
                  {btn.shortcut && (
                    <span className="text-[9px] text-white/40 font-mono border border-white/20 rounded px-1">
                      {btn.shortcut}
                    </span>
                  )}
                  <span className="text-[9px] text-white/30">
                    {eventsForButton(btn.id)} eventos
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition-opacity"
                    onClick={() => setEditingId(btn.id)}
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-opacity"
                    onClick={() => removeButton(btn.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )
            )}

            {editingId === 'new' ? (
              <ButtonEditor
                onSave={(btn) => { addButton(btn); setEditingId(null) }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <button
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/20 text-white/40 hover:text-white/70 hover:border-white/40 transition-colors text-xs"
                onClick={() => setEditingId('new')}
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo botón
              </button>
            )}
          </>
        ) : (
          // ── Tag mode: press buttons to create events ───────────────────────
          <>
            <div className="grid grid-cols-2 gap-2">
              {buttons.map((btn) => {
                const count = eventsForButton(btn.id)
                const isFlashing = flashId === btn.id
                return (
                  <button
                    key={btn.id}
                    className={`relative rounded-xl p-3 text-left transition-all active:scale-95 ${
                      isFlashing
                        ? 'ring-2 ring-white ring-offset-1 ring-offset-black scale-105'
                        : 'hover:brightness-110 hover:scale-102'
                    }`}
                    style={{
                      backgroundColor: btn.color + '33',
                      borderLeft: `4px solid ${btn.color}`,
                    }}
                    onClick={() => handlePress(btn)}
                    title={`${btn.label} — Pre: ${btn.preRoll}s · Post: ${btn.postRoll}s`}
                  >
                    {/* Shortcut badge */}
                    {btn.shortcut && (
                      <span
                        className="absolute top-1.5 right-1.5 text-[9px] font-mono rounded px-1 leading-tight"
                        style={{ backgroundColor: btn.color + '60', color: '#fff' }}
                      >
                        {btn.shortcut}
                      </span>
                    )}

                    {/* Label */}
                    <div
                      className="text-sm font-semibold leading-tight truncate"
                      style={{ color: btn.color }}
                    >
                      {btn.label}
                    </div>

                    {/* Event count */}
                    <div className="text-[9px] text-white/40 mt-0.5">
                      {count > 0 ? `${count} evento${count !== 1 ? 's' : ''}` : 'Sin eventos'}
                    </div>

                    {/* Flash overlay */}
                    {isFlashing && (
                      <div
                        className="absolute inset-0 rounded-xl animate-ping opacity-30"
                        style={{ backgroundColor: btn.color }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {buttons.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-white/30">
                <LayoutGrid className="h-8 w-8" />
                <p className="text-xs text-center">Sin botones configurados</p>
                <button
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                  onClick={() => setEditMode(true)}
                >
                  Crear botones
                </button>
              </div>
            )}

            {/* Recent events for this video */}
            {videoEvents.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-[9px] text-white/30 uppercase tracking-wide font-semibold px-1">
                  Eventos recientes
                </div>
                {[...videoEvents].reverse().slice(0, 10).map((ev) => {
                  const btn = buttons.find((b) => b.id === ev.buttonId)
                  if (!btn) return null
                  const mm = Math.floor(ev.timestamp / 60).toString().padStart(2, '0')
                  const ss = Math.floor(ev.timestamp % 60).toString().padStart(2, '0')
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/3 group"
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: btn.color }}
                      />
                      <span className="text-[10px] text-white/70 flex-1 truncate">{btn.label}</span>
                      <span className="text-[10px] text-white/40 font-mono tabular-nums">
                        {mm}:{ss}
                      </span>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400"
                        onClick={() => removeEvent(videoKey, ev.id)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer hint */}
      {!isEditMode && buttons.some((b) => b.shortcut) && (
        <div className="shrink-0 px-3 py-1.5 border-t border-white/10">
          <p className="text-[9px] text-white/25">
            Pulsa los atajos de teclado para marcar eventos
          </p>
        </div>
      )}
    </div>
  )
}
