'use client'

import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import type { CodeButton, CodeButtonSize } from './types'
import {
  BUTTON_SIZE_LABELS,
  BUTTON_SIZE_ORDER,
  DESK_FASE_OPTIONS,
  DESK_PRESET_COLORS,
} from './videoDesk'

function timingsLabel(btn: CodeButton) {
  return `−${btn.preRoll}s / +${btn.postRoll}s`
}

export function VideoDeskBotonera({
  buttons,
  activeButtonId,
  onPress,
  onAdd,
  onUpdate,
  onRemove,
}: {
  buttons: CodeButton[]
  activeButtonId: string | null
  onPress: (btn: CodeButton) => void
  onAdd: (btn: Omit<CodeButton, 'id'>) => void
  onUpdate: (id: string, patch: Partial<Omit<CodeButton, 'id'>>) => void
  onRemove: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)

  return (
    <div className="vd-botonera">
      <div className="vd-botonera-grid">
        {buttons.map((btn) => {
          const size = btn.size || 'm'
          return (
            <div key={btn.id} style={{ gridColumn: size === 'l' ? 'span 2' : 'span 1', position: 'relative' }}>
              <button
                type="button"
                className={`vd-code-btn is-${size}${activeButtonId === btn.id ? ' is-active' : ''}`}
                style={{ background: btn.color, width: '100%' }}
                onClick={() => onPress(btn)}
                title={`${btn.label} · ${timingsLabel(btn)}${btn.shortcut ? ` · ${btn.shortcut}` : ''}`}
              >
                {btn.label}
                <span className="vd-code-btn-meta">
                  {timingsLabel(btn)}
                  {btn.shortcut ? ` · ${btn.shortcut}` : ''}
                </span>
              </button>
              <button
                type="button"
                className="vd-code-btn-edit"
                aria-label={`Editar ${btn.label}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingId(btn.id)
                }}
              >
                <Pencil size={12} />
              </button>
            </div>
          )
        })}
        <button type="button" className="vd-add-btn" onClick={() => setEditingId('new')}>
          <Plus size={14} style={{ display: 'inline', marginRight: 6 }} />
          Momento
        </button>
      </div>

      {editingId ? (
        <VideoDeskButtonEditor
          initial={editingId === 'new' ? undefined : buttons.find((b) => b.id === editingId)}
          onCancel={() => setEditingId(null)}
          onSave={(payload) => {
            if (editingId === 'new') onAdd(payload)
            else onUpdate(editingId, payload)
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
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: CodeButton
  onSave: (btn: Omit<CodeButton, 'id'>) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [label, setLabel] = useState(initial?.label || '')
  const [color, setColor] = useState(initial?.color || DESK_PRESET_COLORS[0])
  const [shortcut, setShortcut] = useState(initial?.shortcut || '')
  const [preRoll, setPreRoll] = useState(String(initial?.preRoll ?? 5))
  const [postRoll, setPostRoll] = useState(String(initial?.postRoll ?? 8))
  const [size, setSize] = useState<CodeButtonSize>(initial?.size || 'm')
  const [fase, setFase] = useState(initial?.fase || '')

  return (
    <div className="vd-editor">
      <label>
        Nombre
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="P. ej. Saque de esquina" />
      </label>
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
      </div>
      <label>
        Tamaño del botón
        <div className="vd-size-row">
          {BUTTON_SIZE_ORDER.map((s) => (
            <button key={s} type="button" className={size === s ? 'is-on' : ''} onClick={() => setSize(s)}>
              {BUTTON_SIZE_LABELS[s]}
            </button>
          ))}
        </div>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 72px', gap: 8 }}>
        <label>
          Antes (s)
          <input type="number" min={0} max={60} step={0.5} value={preRoll} onChange={(e) => setPreRoll(e.target.value)} />
        </label>
        <label>
          Después (s)
          <input type="number" min={0} max={60} step={0.5} value={postRoll} onChange={(e) => setPostRoll(e.target.value)} />
        </label>
        <label>
          Atajo
          <input maxLength={1} value={shortcut} onChange={(e) => setShortcut(e.target.value.slice(-1).toLowerCase())} />
        </label>
      </div>
      <label>
        Carpeta en Revisión
        <select value={fase} onChange={(e) => setFase(e.target.value)}>
          {DESK_FASE_OPTIONS.map((opt) => (
            <option key={opt.fase || 'none'} value={opt.fase}>{opt.nombre}</option>
          ))}
        </select>
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          className="vd-btn vd-btn-accent"
          disabled={!label.trim()}
          onClick={() => onSave({
            label: label.trim(),
            color,
            shortcut: shortcut.trim() || undefined,
            preRoll: Math.max(0, parseFloat(preRoll) || 0),
            postRoll: Math.max(0, parseFloat(postRoll) || 0),
            size,
            fase: fase || undefined,
          })}
        >
          Guardar
        </button>
        <button type="button" className="vd-btn vd-btn-ghost" onClick={onCancel}>Cancelar</button>
        {onDelete ? (
          <button type="button" className="vd-btn vd-btn-ghost" onClick={onDelete}>Quitar botón</button>
        ) : null}
      </div>
    </div>
  )
}
