'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { CodeButton, CodeButtonSize, CodeCaptureMode } from './types'
import {
  BUTTON_SIZE_LABELS,
  BUTTON_SIZE_ORDER,
  DESK_FASE_OPTIONS,
  DESK_PRESET_COLORS,
  normalizeShortcut,
  shortcutTaken,
  timingsLabel,
} from './videoDesk'

export function VideoDeskBotonera({
  buttons,
  activeButtonId,
  armedButtonId,
  onPress,
  onAdd,
  onUpdate,
  onRemove,
}: {
  buttons: CodeButton[]
  activeButtonId: string | null
  armedButtonId?: string | null
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
          const armed = armedButtonId === btn.id
          return (
            <div key={btn.id} style={{ gridColumn: size === 'l' ? 'span 2' : 'span 1', position: 'relative' }}>
              <button
                type="button"
                className={`vd-code-btn is-${size}${activeButtonId === btn.id ? ' is-active' : ''}${armed ? ' is-armed' : ''}`}
                style={{ background: btn.color, width: '100%' }}
                onClick={() => onPress(btn)}
                title={`${btn.label} · ${timingsLabel(btn)}${btn.shortcut ? ` · ${btn.shortcut}` : ''}`}
              >
                {btn.label}
                <span className="vd-code-btn-meta">
                  {armed ? 'marca el final' : timingsLabel(btn)}
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
          buttons={buttons}
          exceptId={editingId === 'new' ? undefined : editingId}
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
  const [size, setSize] = useState<CodeButtonSize>(initial?.size || 'm')
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
          Tamaño del botón
          <div className="vd-size-row">
            {BUTTON_SIZE_ORDER.map((s) => (
              <button key={s} type="button" className={size === s ? 'is-on' : ''} onClick={() => setSize(s)}>
                {BUTTON_SIZE_LABELS[s]}
              </button>
            ))}
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
              size,
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
