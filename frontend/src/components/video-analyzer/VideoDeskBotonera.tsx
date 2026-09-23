'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { ButtonLayout, CodeButton, CodeCaptureMode } from './types'
import {
  DESK_FASE_OPTIONS,
  DESK_PRESET_COLORS,
  layoutMins,
  exposeLayouts,
  layoutsEqual,
  normalizeShortcut,
  placeButtonLayout,
  resolveButtonLayouts,
  sanitizeLayout,
  shiftLayout,
  shortcutTaken,
  timingsLabel,
} from './videoDesk'

export type BotoneraEditGate = { on: boolean; cancel: () => void }

type DragMode = 'move' | 'e' | 's' | 'se'

export function VideoDeskBotonera({
  buttons,
  activeButtonId,
  armedButtonId,
  onPress,
  onAdd,
  onUpdate,
  onRemove,
  editGateRef,
}: {
  buttons: CodeButton[]
  activeButtonId: string | null
  armedButtonId?: string | null
  onPress: (btn: CodeButton) => void
  onAdd: (btn: Omit<CodeButton, 'id'>) => void | CodeButton
  onUpdate: (id: string, patch: Partial<Omit<CodeButton, 'id'>>) => void
  onRemove: (id: string) => void
  editGateRef?: React.MutableRefObject<BotoneraEditGate>
}) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const editingIdRef = useRef(editingId)
  editingIdRef.current = editingId
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, ButtonLayout> | null>(null)
  const [raisedId, setRaisedId] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft

  const shown = exposeLayouts(resolveButtonLayouts(
    buttons.map((button) => (draft?.[button.id] ? { ...button, layout: draft[button.id] } : button)),
  ))

  const cancel = useCallback(() => {
    setEditing(false)
    setDraft(null)
    setRaisedId(null)
    setDragging(false)
  }, [])

  const dismissEdit = useCallback(() => {
    if (editingIdRef.current) {
      editingIdRef.current = null
      setEditingId(null)
      return
    }
    cancel()
  }, [cancel])

  const accept = useCallback(() => {
    const next = exposeLayouts(resolveButtonLayouts(
      buttons.map((button) => (
        draftRef.current?.[button.id] ? { ...button, layout: draftRef.current[button.id] } : button
      )),
    ))
    for (const button of buttons) {
      const layout = next[button.id]
      if (!layout) continue
      if (!layoutsEqual(sanitizeLayout(button.layout), layout)) onUpdate(button.id, { layout })
    }
    setEditing(false)
    setDraft(null)
    setRaisedId(null)
    setDragging(false)
  }, [buttons, onUpdate])

  const startEdit = useCallback(() => {
    setDraft(resolveButtonLayouts(buttons))
    setEditing(true)
  }, [buttons])

  useEffect(() => {
    if (!editGateRef) return
    editGateRef.current = { on: editing, cancel: dismissEdit }
  }, [dismissEdit, editGateRef, editing])

  useEffect(() => {
    if (!editing) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      dismissEdit()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [dismissEdit, editing])

  const beginDrag = (id: string, mode: DragMode, event: React.PointerEvent) => {
    const origin = draftRef.current?.[id] ?? shown[id]
    const canvas = canvasRef.current
    if (!origin || !canvas) return
    event.preventDefault()
    event.stopPropagation()
    const rect = canvas.getBoundingClientRect()
    if (rect.width < 8 || rect.height < 8) return
    const mins = layoutMins(rect.width, rect.height)
    const startX = event.clientX
    const startY = event.clientY
    const stack = Object.values(draftRef.current ?? shown)
    const maxZ = stack.reduce((max, item) => Math.max(max, item.z ?? 0), 0)
    const originFront = { ...origin, z: maxZ + 1 }
    setRaisedId(id)
    setDragging(true)
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture?.(event.pointerId)

    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100
      const dy = ((ev.clientY - startY) / rect.height) * 100
      const next = shiftLayout(
        originFront,
        mode === 'move' ? dx : 0,
        mode === 'move' ? dy : 0,
        mode === 'e' || mode === 'se' ? dx : 0,
        mode === 's' || mode === 'se' ? dy : 0,
        mins.minW,
        mins.minH,
      )
      setDraft((prev) => ({ ...(prev ?? shown), [id]: next }))
    }
    const up = () => {
      setDragging(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const nudge = (id: string, event: React.KeyboardEvent) => {
    if (!editing) return
    const step = event.shiftKey ? 4 : 1
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = delta[event.key]
    if (!move) {
      if (event.key === ' ' || event.key === 'Enter') event.preventDefault()
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const canvas = canvasRef.current?.getBoundingClientRect()
    const mins = canvas ? layoutMins(canvas.width, canvas.height) : { minW: 18, minH: 12 }
    setDraft((prev) => {
      const base = prev ?? shown
      const origin = base[id]
      if (!origin) return prev
      const grow = event.altKey
      return {
        ...base,
        [id]: shiftLayout(
          origin,
          grow ? 0 : move[0],
          grow ? 0 : move[1],
          grow ? move[0] : 0,
          grow ? move[1] : 0,
          mins.minW,
          mins.minH,
        ),
      }
    })
    setRaisedId(id)
  }

  return (
    <div className={`vd-botonera${editing ? ' is-editing' : ''}${dragging ? ' is-dragging' : ''}`}>
      <div className="vd-botonera-head">
        <div className="vd-botonera-heading">
          <div className="vd-botonera-title">Botonera</div>
          {editing ? (
            <p className="vd-botonera-hint">Arrastra para mover. Estira la esquina para el tamaño.</p>
          ) : null}
        </div>
        <div className="vd-botonera-tools">
          <button
            type="button"
            className={`vd-botonera-pencil${editing ? ' is-on' : ''}`}
            aria-label="Editar botonera"
            aria-pressed={editing}
            title="Editar posición y tamaño. No marca el vídeo."
            onClick={() => {
              if (!editing) startEdit()
            }}
          >
            <Pencil size={14} />
          </button>
          <button type="button" className="vd-botonera-add" onClick={() => setEditingId('new')}>
            <Plus size={13} />
            Momento
          </button>
          {editing ? (
            <>
              <button type="button" className="vd-btn vd-btn-ghost" onClick={cancel}>Cancelar</button>
              <button type="button" className="vd-btn vd-btn-accent" onClick={accept}>Aceptar</button>
            </>
          ) : null}
        </div>
      </div>

      <div
        ref={canvasRef}
        className="vd-botonera-canvas"
        aria-label={editing ? 'Zona de edición de la botonera' : 'Botonera'}
      >
        {editing ? (
          <p className="vd-sr">Con un botón enfocado, las flechas lo mueven. Alt y flechas cambian el tamaño.</p>
        ) : null}
        {buttons.map((btn, index) => {
          const layout = shown[btn.id]
          if (!layout) return null
          const armed = armedButtonId === btn.id
          return (
            <div
              key={btn.id}
              className={`vd-code-slot${raisedId === btn.id ? ' is-front' : ''}`}
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                width: `${layout.w}%`,
                height: `${layout.h}%`,
                zIndex: layout.z ?? index + 1,
              }}
            >
              <button
                type="button"
                className={`vd-code-btn${activeButtonId === btn.id ? ' is-active' : ''}${armed ? ' is-armed' : ''}`}
                style={{ background: btn.color }}
                aria-keyshortcuts={btn.shortcut}
                aria-grabbed={editing ? dragging && raisedId === btn.id : undefined}
                title={editing ? 'Arrastra para mover' : `${btn.label} · ${timingsLabel(btn)}${btn.shortcut ? ` · ${btn.shortcut}` : ''}`}
                onClick={editing ? undefined : () => onPress(btn)}
                onPointerDown={editing ? (event) => beginDrag(btn.id, 'move', event) : undefined}
                onKeyDown={editing ? (event) => nudge(btn.id, event) : undefined}
              >
                <span className="vd-code-btn-label">{btn.label}</span>
                <span className="vd-code-btn-meta">
                  {armed ? 'marca el final' : timingsLabel(btn)}
                  {btn.shortcut ? ` · ${btn.shortcut}` : ''}
                </span>
              </button>
              {editing ? (
                <>
                  <button
                    type="button"
                    className="vd-code-btn-edit"
                    aria-label={`Editar ${btn.label}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setEditingId(btn.id)}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    className="vd-resize vd-resize-e"
                    aria-label={`Ancho de ${btn.label}`}
                    onPointerDown={(event) => beginDrag(btn.id, 'e', event)}
                  />
                  <button
                    type="button"
                    className="vd-resize vd-resize-s"
                    aria-label={`Alto de ${btn.label}`}
                    onPointerDown={(event) => beginDrag(btn.id, 's', event)}
                  />
                  <button
                    type="button"
                    className="vd-resize vd-resize-se"
                    aria-label={`Tamaño de ${btn.label}`}
                    onPointerDown={(event) => beginDrag(btn.id, 'se', event)}
                  />
                </>
              ) : null}
            </div>
          )
        })}
        {buttons.length === 0 ? <p className="vd-botonera-empty">Añade un momento para marcar el vídeo.</p> : null}
      </div>

      {editingId ? (
        <VideoDeskButtonEditor
          initial={editingId === 'new' ? undefined : buttons.find((b) => b.id === editingId)}
          buttons={buttons}
          exceptId={editingId === 'new' ? undefined : editingId}
          onCancel={() => setEditingId(null)}
          onSave={(payload) => {
            if (editingId === 'new') {
              const occupied = Object.values(shown)
              const needsSpot = editing || buttons.some((button) => sanitizeLayout(button.layout))
              onAdd(needsSpot ? { ...payload, layout: placeButtonLayout(occupied) } : payload)
            } else {
              onUpdate(editingId, payload)
            }
            setEditingId(null)
          }}
          onDelete={
            editingId !== 'new'
              ? () => {
                  onRemove(editingId)
                  setEditingId(null)
                }
              : undefined
          }
        />
      ) : null}
    </div>
  )
}

function VideoDeskButtonEditor({
  initial,
  buttons,
  exceptId,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: CodeButton
  buttons: CodeButton[]
  exceptId?: string
  onSave: (btn: Omit<CodeButton, 'id'>) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [label, setLabel] = useState(initial?.label || '')
  const [color, setColor] = useState(initial?.color || DESK_PRESET_COLORS[0])
  const [shortcut, setShortcut] = useState(initial?.shortcut || '')
  const [preRoll, setPreRoll] = useState(String(initial?.preRoll ?? 5))
  const [postRoll, setPostRoll] = useState(String(initial?.postRoll ?? 8))
  const [fase, setFase] = useState(initial?.fase || '')
  const [captureMode, setCaptureMode] = useState<CodeCaptureMode>(initial?.captureMode === 'range' ? 'range' : 'window')
  const normalized = normalizeShortcut(shortcut)
  const taken = shortcutTaken(buttons, normalized, exceptId)
  const canSave = Boolean(label.trim()) && !taken

  return (
    <div className="vd-modal" role="dialog" aria-label="Editar botón">
      <button type="button" className="vd-modal-backdrop" aria-label="Cerrar" onClick={onCancel} />
      <div className="vd-editor vd-editor-modal">
        <p className="vd-editor-kicker">{initial ? 'Editar botón' : 'Nuevo botón'}</p>
        <label>
          Nombre
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="P. ej. Saque de esquina" />
        </label>
        <label>
          Color
          <div className="vd-color-row">
            {DESK_PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`vd-color-dot${color === c ? ' is-on' : ''}`}
                style={{ background: c }}
                aria-label={c}
                onClick={() => setColor(c)}
              />
            ))}
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(color) ? color : '#c45c4a'}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Color personalizado"
            />
          </div>
        </label>
        <label>
          Cómo recorta
          <div className="vd-size-row">
            <button type="button" className={captureMode === 'window' ? 'is-on' : ''} onClick={() => setCaptureMode('window')}>
              Ventana (s)
            </button>
            <button type="button" className={captureMode === 'range' ? 'is-on' : ''} onClick={() => setCaptureMode('range')}>
              Inicio / fin
            </button>
          </div>
        </label>
        {captureMode === 'window' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label>
              Antes (s)
              <input type="number" min={0} max={90} step={0.5} value={preRoll} onChange={(e) => setPreRoll(e.target.value)} />
            </label>
            <label>
              Después (s)
              <input type="number" min={0} max={90} step={0.5} value={postRoll} onChange={(e) => setPostRoll(e.target.value)} />
            </label>
          </div>
        ) : (
          <p className="vd-editor-hint">Primer clic marca el inicio; el segundo, el final. Sin tiempo fijo.</p>
        )}
        <label>
          Tecla
          <input
            maxLength={1}
            value={shortcut}
            onChange={(e) => setShortcut(e.target.value.slice(-1).toLowerCase())}
            placeholder="1"
          />
          {taken ? <span className="vd-editor-error">Esa tecla ya está en otro botón</span> : null}
        </label>
        <label>
          Carpeta en Revisión
          <select value={fase} onChange={(e) => setFase(e.target.value)}>
            {DESK_FASE_OPTIONS.map((opt) => (
              <option key={opt.fase || 'none'} value={opt.fase}>{opt.nombre}</option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="vd-btn vd-btn-accent"
            disabled={!canSave}
            onClick={() => onSave({
              label: label.trim(),
              color,
              shortcut: normalized,
              preRoll: Math.max(0, parseFloat(preRoll) || 0),
              postRoll: Math.max(0, parseFloat(postRoll) || 0),
              size: initial?.size || 'm',
              fase: fase || undefined,
              captureMode,
            })}
          >
            Guardar
          </button>
          <button type="button" className="vd-btn vd-btn-ghost" onClick={onCancel}>Cancelar</button>
          {onDelete ? (
            <button type="button" className="vd-btn vd-btn-ghost" onClick={onDelete}>
              <Trash2 size={12} />
              Quitar botón
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
