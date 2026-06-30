# Video Analyzer UX V2 — Botonera editable + Organizer vacío + Studio draw-on-pause

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar Botonera (botones editables con labels tipo Sportscode), Organizer (vacío por defecto, clips se añaden desde timeline, viewer de clip) y Studio (dibujar en pausa).

**Architecture:** Se extienden los tipos existentes (`CodeButton`, `CodeEvent`) con `labels[]` y un nuevo `OrganizerState`. Se reescriben las tres ventanas flotantes. El `ClipBar` recibe un callback `onAddToOrganizer`. El Studio captura el frame actual al pausar y permite dibujar encima.

**Tech Stack:** Next.js 14, React 18, Zustand, TypeScript, TailwindCSS, Canvas API

---

## File Map

| File | Acción | Qué cambia |
|------|--------|-----------|
| `types.ts` | Modify | Añadir `ButtonLabel`, `OrganizerClip`, `OrganizerRow`; extender `CodeButton` |
| `useCodeWindowStore.ts` | Modify | Añadir `labels` a `CodeButton`; añadir organizer state + actions |
| `windows/BotoneraWindow.tsx` | Rewrite | UI expandible, editor de botón completo, colores, labels |
| `windows/OrganizerWindow.tsx` | Rewrite | Estado vacío, clip viewer, filas renombrables, add desde timeline |
| `windows/StudioWindow.tsx` | Modify | Captura frame en pausa, toolbar de dibujo activa en pausa |
| `ClipBar.tsx` | Modify | Añadir botón "+" que llama `onAddToOrganizer(clipId)` |
| `Timeline.tsx` | Modify | Pasar `onAddToOrganizer` a `ClipBar` |
| `VideoAnalyzer.tsx` | Modify | Conectar `onAddToOrganizer` al store |

---

## Task 1: Extender tipos — `ButtonLabel`, `OrganizerClip`, `OrganizerRow`

**Files:**
- Modify: `src/components/video-analyzer/types.ts`

- [ ] **Step 1: Añadir los nuevos tipos después de `CodeEvent`**

```typescript
// ─── Button Labels (Sportscode-style sub-categorization) ───
export interface ButtonLabel {
  id: string
  text: string
  color: string      // hex, e.g. '#22c55e'
  shortcut?: string  // optional single key
}

// Extend CodeButton — añadir labels
// Cambiar la interfaz existente:
export interface CodeButton {
  id: string
  label: string
  color: string
  shortcut?: string
  preRoll: number
  postRoll: number
  description?: string
  labels: ButtonLabel[]   // ← NUEVO (inicializar como [] en el store)
}

// ─── Organizer ───
export interface OrganizerClip {
  id: string           // UUID propio del organizer item
  sourceId: string     // ID del clip original (de clips[]) o event original (CodeEvent.id)
  sourceType: 'clip' | 'code-event'
  title: string
  startTime: number
  endTime: number
  thumbnailUrl?: string  // data URL del primer frame
  notes?: string
}

export interface OrganizerRow {
  id: string
  name: string
  clips: OrganizerClip[]
}
```

- [ ] **Step 2: Verificar que TypeScript no rompe** (el compilador de Next.js lo dirá al guardar)

---

## Task 2: Extender `useCodeWindowStore` con organizer state

**Files:**
- Modify: `src/components/video-analyzer/useCodeWindowStore.ts`

- [ ] **Step 1: Importar los nuevos tipos al inicio del archivo**

```typescript
import type { CodeButton, CodeEvent, ButtonLabel, OrganizerRow, OrganizerClip } from './types'
```

- [ ] **Step 2: Añadir organizer al estado de Zustand**

Localizar el `interface` o `type` del store state y añadir:
```typescript
// Organizer
organizerRows: OrganizerRow[]

// Actions a añadir en el store:
addClipToOrganizer: (clip: OrganizerClip) => void
removeClipFromOrganizer: (rowId: string, clipId: string) => void
addOrganizerRow: (name: string) => OrganizerRow
renameOrganizerRow: (rowId: string, name: string) => void
removeOrganizerRow: (rowId: string) => void
moveClipBetweenRows: (clipId: string, fromRowId: string, toRowId: string) => void
reorderClipsInRow: (rowId: string, fromIdx: number, toIdx: number) => void
```

- [ ] **Step 3: Inicializar `organizerRows: []` en el estado inicial**

- [ ] **Step 4: Implementar las actions en `create(...)`**

```typescript
addClipToOrganizer: (clip) => set((s) => {
  // Si no hay rows, crear una row "Por defecto"
  if (s.organizerRows.length === 0) {
    const newRow: OrganizerRow = { id: generateId(), name: 'Por defecto', clips: [clip] }
    return { organizerRows: [newRow] }
  }
  // Añadir a la primera row por defecto
  const rows = [...s.organizerRows]
  rows[0] = { ...rows[0], clips: [...rows[0].clips, clip] }
  return { organizerRows: rows }
}),

removeClipFromOrganizer: (rowId, clipId) => set((s) => ({
  organizerRows: s.organizerRows.map(r =>
    r.id === rowId ? { ...r, clips: r.clips.filter(c => c.id !== clipId) } : r
  )
})),

addOrganizerRow: (name) => {
  const newRow: OrganizerRow = { id: generateId(), name, clips: [] }
  set((s) => ({ organizerRows: [...s.organizerRows, newRow] }))
  return newRow
},

renameOrganizerRow: (rowId, name) => set((s) => ({
  organizerRows: s.organizerRows.map(r => r.id === rowId ? { ...r, name } : r)
})),

removeOrganizerRow: (rowId) => set((s) => ({
  organizerRows: s.organizerRows.filter(r => r.id !== rowId)
})),

moveClipBetweenRows: (clipId, fromRowId, toRowId) => set((s) => {
  const fromRow = s.organizerRows.find(r => r.id === fromRowId)
  const clip = fromRow?.clips.find(c => c.id === clipId)
  if (!clip) return s
  return {
    organizerRows: s.organizerRows.map(r => {
      if (r.id === fromRowId) return { ...r, clips: r.clips.filter(c => c.id !== clipId) }
      if (r.id === toRowId) return { ...r, clips: [...r.clips, clip] }
      return r
    })
  }
}),

reorderClipsInRow: (rowId, fromIdx, toIdx) => set((s) => ({
  organizerRows: s.organizerRows.map(r => {
    if (r.id !== rowId) return r
    const clips = [...r.clips]
    const [removed] = clips.splice(fromIdx, 1)
    clips.splice(toIdx, 0, removed)
    return { ...r, clips }
  })
})),
```

- [ ] **Step 5: Añadir `labels: []` como default en los `defaultButtons` hardcodeados**

Buscar los 4 botones default y añadir `labels: []` a cada uno.

- [ ] **Step 6: Añadir actions para gestionar labels de botones**

```typescript
addLabelToButton: (buttonId: string, label: ButtonLabel) => set((s) => ({
  buttons: s.buttons.map(b =>
    b.id === buttonId ? { ...b, labels: [...(b.labels ?? []), label] } : b
  )
})),
removeLabelFromButton: (buttonId: string, labelId: string) => set((s) => ({
  buttons: s.buttons.map(b =>
    b.id === buttonId ? { ...b, labels: (b.labels ?? []).filter(l => l.id !== labelId) } : b
  )
})),
updateLabelInButton: (buttonId: string, labelId: string, patch: Partial<ButtonLabel>) => set((s) => ({
  buttons: s.buttons.map(b =>
    b.id === buttonId
      ? { ...b, labels: (b.labels ?? []).map(l => l.id === labelId ? { ...l, ...patch } : l) }
      : b
  )
})),
```

- [ ] **Step 7: Asegurarse que `organizerRows` está en el array de `partialize` del persist middleware** (si existe — si no, por defecto ya se persiste todo)

---

## Task 3: Reescribir `BotoneraWindow.tsx`

**Files:**
- Rewrite: `src/components/video-analyzer/windows/BotoneraWindow.tsx`

**UX objetivo:**
- Ventana expandible (resize desde WindowChrome ya existente)
- Grid de botones con colores editables
- Botón → click = taggear, click derecho = abrir editor inline del botón
- Editor de botón: nombre, color, preRoll/postRoll, shortcut, gestión de labels
- Añadir/quitar botones
- Cada label tiene nombre + color + shortcut opcional

- [ ] **Step 1: Escribir el nuevo `BotoneraWindow.tsx` completo**

```tsx
'use client'
import React, { useState } from 'react'
import { useCodeWindowStore } from '../useCodeWindowStore'
import type { CodeButton, ButtonLabel } from '../types'
import { generateId } from '../utils'

interface Props {
  videoKey: string
  currentTime: number
  videoDuration: number
  onTagCreated?: () => void
}

// ─── Editor de un botón ───
function ButtonEditor({
  button,
  onClose,
}: {
  button: CodeButton
  onClose: () => void
}) {
  const { updateButton, addLabelToButton, removeLabelFromButton, updateLabelInButton } =
    useCodeWindowStore()
  const [draft, setDraft] = useState({ ...button })
  const [newLabelText, setNewLabelText] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#22c55e')

  const save = () => {
    updateButton(button.id, draft)
    onClose()
  }

  const addLabel = () => {
    if (!newLabelText.trim()) return
    const label: ButtonLabel = {
      id: generateId(),
      text: newLabelText.trim(),
      color: newLabelColor,
    }
    addLabelToButton(button.id, label)
    setNewLabelText('')
  }

  return (
    <div className="absolute inset-0 z-10 bg-zinc-900 rounded-lg p-4 overflow-y-auto flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-semibold text-sm">Editar botón</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-white text-lg leading-none">✕</button>
      </div>

      {/* Nombre */}
      <label className="flex flex-col gap-1">
        <span className="text-zinc-400 text-xs">Nombre</span>
        <input
          value={draft.label}
          onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
          className="bg-zinc-800 text-white rounded px-2 py-1 text-sm border border-zinc-600 focus:border-blue-500 outline-none"
        />
      </label>

      {/* Color */}
      <label className="flex flex-col gap-1">
        <span className="text-zinc-400 text-xs">Color</span>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={draft.color}
            onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
          />
          <span className="text-zinc-300 text-xs font-mono">{draft.color}</span>
        </div>
      </label>

      {/* Shortcut */}
      <label className="flex flex-col gap-1">
        <span className="text-zinc-400 text-xs">Tecla rápida</span>
        <input
          value={draft.shortcut ?? ''}
          onChange={e => setDraft(d => ({ ...d, shortcut: e.target.value.slice(-1) }))}
          maxLength={1}
          className="bg-zinc-800 text-white rounded px-2 py-1 text-sm border border-zinc-600 focus:border-blue-500 outline-none w-16"
        />
      </label>

      {/* Pre/Post roll */}
      <div className="flex gap-3">
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-zinc-400 text-xs">Antes (s)</span>
          <input
            type="number" min={0} max={120} step={1}
            value={draft.preRoll}
            onChange={e => setDraft(d => ({ ...d, preRoll: Number(e.target.value) }))}
            className="bg-zinc-800 text-white rounded px-2 py-1 text-sm border border-zinc-600 focus:border-blue-500 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-zinc-400 text-xs">Después (s)</span>
          <input
            type="number" min={0} max={120} step={1}
            value={draft.postRoll}
            onChange={e => setDraft(d => ({ ...d, postRoll: Number(e.target.value) }))}
            className="bg-zinc-800 text-white rounded px-2 py-1 text-sm border border-zinc-600 focus:border-blue-500 outline-none"
          />
        </label>
      </div>

      {/* Labels */}
      <div className="flex flex-col gap-2">
        <span className="text-zinc-400 text-xs font-semibold">Labels</span>
        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
          {(button.labels ?? []).map(label => (
            <div key={label.id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: label.color }} />
              <span className="text-white text-xs flex-1">{label.text}</span>
              <button
                onClick={() => updateLabelInButton(button.id, label.id, {})}
                className="text-zinc-500 hover:text-red-400 text-xs"
                onClick={() => removeLabelFromButton(button.id, label.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {/* Añadir label */}
        <div className="flex gap-1 items-center">
          <input
            type="color"
            value={newLabelColor}
            onChange={e => setNewLabelColor(e.target.value)}
            className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer flex-shrink-0"
          />
          <input
            value={newLabelText}
            onChange={e => setNewLabelText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addLabel()}
            placeholder="Nuevo label..."
            className="bg-zinc-800 text-white rounded px-2 py-1 text-xs border border-zinc-600 focus:border-blue-500 outline-none flex-1"
          />
          <button
            onClick={addLabel}
            className="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-2 py-1 text-xs"
          >
            +
          </button>
        </div>
      </div>

      {/* Guardar */}
      <button
        onClick={save}
        className="mt-auto bg-blue-600 hover:bg-blue-500 text-white rounded py-1.5 text-sm font-semibold"
      >
        Guardar
      </button>
    </div>
  )
}

// ─── Componente principal ───
export function BotoneraWindow({ videoKey, currentTime, videoDuration, onTagCreated }: Props) {
  const { buttons, addButton, removeButton, recordEvent } = useCodeWindowStore()
  const [editingButtonId, setEditingButtonId] = useState<string | null>(null)

  const handleClick = (btn: CodeButton) => {
    recordEvent(btn.id, currentTime, videoDuration)
    onTagCreated?.()
  }

  const editingButton = editingButtonId ? buttons.find(b => b.id === editingButtonId) : null

  return (
    <div className="relative h-full flex flex-col gap-2 p-3 overflow-hidden">

      {/* Editor de botón (overlay) */}
      {editingButton && (
        <ButtonEditor
          button={editingButton}
          onClose={() => setEditingButtonId(null)}
        />
      )}

      {/* Grid de botones */}
      <div className="flex-1 grid gap-2 overflow-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
        {buttons.map(btn => (
          <div key={btn.id} className="relative group">
            <button
              onClick={() => handleClick(btn)}
              onContextMenu={e => { e.preventDefault(); setEditingButtonId(btn.id) }}
              className="w-full h-16 rounded-lg text-white text-sm font-bold shadow-md active:scale-95 transition-transform select-none"
              style={{ background: btn.color }}
            >
              <span className="block truncate px-1">{btn.label}</span>
              {btn.shortcut && (
                <span className="block text-xs opacity-70">[{btn.shortcut}]</span>
              )}
            </button>
            {/* Botón editar (hover) */}
            <button
              onClick={() => setEditingButtonId(btn.id)}
              className="absolute top-1 right-1 hidden group-hover:flex w-5 h-5 rounded bg-black/50 hover:bg-black/80 text-white items-center justify-center text-xs"
            >
              ✎
            </button>
          </div>
        ))}

        {/* Añadir botón */}
        <button
          onClick={() => addButton({
            id: generateId(),
            label: 'Nuevo',
            color: '#6366f1',
            preRoll: 5,
            postRoll: 5,
            labels: [],
          })}
          className="h-16 rounded-lg border-2 border-dashed border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-zinc-300 text-2xl transition-colors"
        >
          +
        </button>
      </div>

      <p className="text-zinc-600 text-xs text-center">
        Click = taggear · Click derecho = editar
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verificar que `addButton` acepta un objeto `CodeButton` completo en `useCodeWindowStore`**

Si `addButton` solo acepta un partial, ajustar la firma. Si no existe, añadirla:
```typescript
addButton: (btn: CodeButton) => set((s) => ({ buttons: [...s.buttons, btn] })),
```

- [ ] **Step 3: Fix el botón de editar duplicado en `ButtonEditor`** — hay dos `onClick` en el mismo elemento. Eliminar el duplicado:
```tsx
<button
  onClick={() => removeLabelFromButton(button.id, label.id)}
  className="text-zinc-500 hover:text-red-400 text-xs"
>
  ✕
</button>
```

---

## Task 4: Reescribir `OrganizerWindow.tsx`

**Files:**
- Rewrite: `src/components/video-analyzer/windows/OrganizerWindow.tsx`

**UX objetivo:**
- Estado vacío con mensaje claro
- Clips añadidos desde timeline aparecen aquí (en la row "Por defecto")
- Filas: renombrables (doble click), añadir nueva fila, eliminar fila
- Clips: thumbnail (si tiene), título, rango de tiempo
- Botón play → seek al inicio del clip
- Botón Studio → abrir en Studio
- Panel lateral: cuando se selecciona un clip, mostrar preview (mini video)

- [ ] **Step 1: Escribir el nuevo `OrganizerWindow.tsx` completo**

```tsx
'use client'
import React, { useState, useRef } from 'react'
import { useCodeWindowStore } from '../useCodeWindowStore'
import type { OrganizerRow, OrganizerClip } from '../types'
import { generateId, formatTime } from '../utils'

interface Props {
  videoSrc: string
  onOpenInStudio: (clipId: string, sourceType: 'clip' | 'code-event') => void
  onSeekTo: (time: number) => void
}

function ClipCard({
  clip,
  isSelected,
  onSelect,
  onSeek,
  onStudio,
  onRemove,
}: {
  clip: OrganizerClip
  isSelected: boolean
  onSelect: () => void
  onSeek: (t: number) => void
  onStudio: () => void
  onRemove: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col gap-1 p-2 rounded-lg cursor-pointer border transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-950/40'
          : 'border-zinc-700 bg-zinc-800 hover:border-zinc-500'
      }`}
    >
      {/* Thumbnail placeholder */}
      <div className="w-full h-14 rounded bg-zinc-700 overflow-hidden flex items-center justify-center">
        {clip.thumbnailUrl ? (
          <img src={clip.thumbnailUrl} className="w-full h-full object-cover" alt="" />
        ) : (
          <span className="text-zinc-500 text-xs">Sin preview</span>
        )}
      </div>

      {/* Title */}
      <span className="text-white text-xs font-medium truncate">{clip.title}</span>

      {/* Duration */}
      <span className="text-zinc-400 text-xs">
        {formatTime(clip.startTime)} – {formatTime(clip.endTime)}
      </span>

      {/* Actions (hover) */}
      <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
        <button
          onClick={e => { e.stopPropagation(); onSeek(clip.startTime) }}
          className="w-6 h-6 rounded bg-zinc-700 hover:bg-zinc-600 text-white flex items-center justify-center text-xs"
          title="Ver en timeline"
        >
          ▶
        </button>
        <button
          onClick={e => { e.stopPropagation(); onStudio() }}
          className="w-6 h-6 rounded bg-blue-700 hover:bg-blue-600 text-white flex items-center justify-center text-xs"
          title="Abrir en Studio"
        >
          ✎
        </button>
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="w-6 h-6 rounded bg-zinc-700 hover:bg-red-700 text-white flex items-center justify-center text-xs"
          title="Eliminar"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function OrganizerRowComponent({
  row,
  selectedClipId,
  onSelectClip,
  onSeek,
  onStudio,
  onRename,
  onRemoveClip,
  onRemoveRow,
  onAddRow,
  videoSrc,
}: {
  row: OrganizerRow
  selectedClipId: string | null
  onSelectClip: (id: string) => void
  onSeek: (t: number) => void
  onStudio: (clip: OrganizerClip) => void
  onRename: (rowId: string, name: string) => void
  onRemoveClip: (rowId: string, clipId: string) => void
  onRemoveRow: (rowId: string) => void
  onAddRow: () => void
  videoSrc: string
}) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(row.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const commitRename = () => {
    setEditing(false)
    if (draftName.trim()) onRename(row.id, draftName.trim())
    else setDraftName(row.name)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Row header */}
      <div className="flex items-center gap-2 px-1">
        {editing ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditing(false); setDraftName(row.name) } }}
            autoFocus
            className="bg-zinc-800 text-white rounded px-2 py-0.5 text-xs border border-blue-500 outline-none flex-1"
          />
        ) : (
          <span
            onDoubleClick={() => { setEditing(true); setTimeout(() => inputRef.current?.select(), 10) }}
            className="text-zinc-300 text-xs font-semibold uppercase tracking-wide cursor-pointer hover:text-white flex-1"
            title="Doble click para renombrar"
          >
            {row.name}
          </span>
        )}
        <span className="text-zinc-600 text-xs">{row.clips.length} clip{row.clips.length !== 1 ? 's' : ''}</span>
        <button
          onClick={() => onRemoveRow(row.id)}
          className="text-zinc-600 hover:text-red-400 text-xs"
          title="Eliminar fila"
        >
          ✕
        </button>
      </div>

      {/* Clips grid */}
      {row.clips.length === 0 ? (
        <div className="text-zinc-600 text-xs italic px-1 py-2">Sin clips en esta fila</div>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
          {row.clips.map(clip => (
            <ClipCard
              key={clip.id}
              clip={clip}
              isSelected={selectedClipId === clip.id}
              onSelect={() => onSelectClip(clip.id)}
              onSeek={onSeek}
              onStudio={() => onStudio(clip)}
              onRemove={() => onRemoveClip(row.id, clip.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function OrganizerWindow({ videoSrc, onOpenInStudio, onSeekTo }: Props) {
  const {
    organizerRows,
    addOrganizerRow,
    renameOrganizerRow,
    removeOrganizerRow,
    removeClipFromOrganizer,
  } = useCodeWindowStore()

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [previewClip, setPreviewClip] = useState<OrganizerClip | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)

  const handleSelectClip = (id: string) => {
    setSelectedClipId(id)
    const clip = organizerRows.flatMap(r => r.clips).find(c => c.id === id)
    if (clip) {
      setPreviewClip(clip)
      // Seek preview video to clip start
      if (videoPreviewRef.current) {
        videoPreviewRef.current.currentTime = clip.startTime
      }
    }
  }

  const totalClips = organizerRows.reduce((sum, r) => sum + r.clips.length, 0)

  return (
    <div className="h-full flex flex-col gap-0 overflow-hidden">

      {/* Estado vacío */}
      {totalClips === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
          <div className="text-4xl">📋</div>
          <p className="text-zinc-300 text-sm font-medium">Organizador vacío</p>
          <p className="text-zinc-500 text-xs leading-relaxed">
            Hover sobre un clip en el timeline principal<br />y presioná <span className="text-blue-400 font-mono">+</span> para añadirlo aquí.
          </p>
        </div>
      )}

      {/* Con clips: split view (lista + preview) */}
      {totalClips > 0 && (
        <div className="flex-1 flex overflow-hidden">

          {/* Lista de filas */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
            {organizerRows.map(row => (
              <OrganizerRowComponent
                key={row.id}
                row={row}
                selectedClipId={selectedClipId}
                onSelectClip={handleSelectClip}
                onSeek={onSeekTo}
                onStudio={clip => onOpenInStudio(clip.sourceId, clip.sourceType)}
                onRename={renameOrganizerRow}
                onRemoveClip={removeClipFromOrganizer}
                onRemoveRow={removeOrganizerRow}
                onAddRow={() => addOrganizerRow('Nueva fila')}
                videoSrc={videoSrc}
              />
            ))}
          </div>

          {/* Preview panel (lateral, solo si hay clip seleccionado) */}
          {previewClip && (
            <div className="w-56 border-l border-zinc-700 flex flex-col bg-zinc-900">
              <video
                ref={videoPreviewRef}
                src={videoSrc}
                className="w-full aspect-video object-cover"
                controls={false}
                muted
                onLoadedMetadata={() => {
                  if (videoPreviewRef.current && previewClip) {
                    videoPreviewRef.current.currentTime = previewClip.startTime
                  }
                }}
              />
              <div className="p-2 flex flex-col gap-1">
                <span className="text-white text-xs font-medium truncate">{previewClip.title}</span>
                <span className="text-zinc-400 text-xs">
                  {formatTime(previewClip.startTime)} – {formatTime(previewClip.endTime)}
                </span>
                <span className="text-zinc-500 text-xs">
                  {(previewClip.endTime - previewClip.startTime).toFixed(1)}s
                </span>
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={() => onSeekTo(previewClip.startTime)}
                    className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded px-2 py-1 text-xs"
                  >
                    ▶ Ver
                  </button>
                  <button
                    onClick={() => onOpenInStudio(previewClip.sourceId, previewClip.sourceType)}
                    className="flex-1 bg-blue-700 hover:bg-blue-600 text-white rounded px-2 py-1 text-xs"
                  >
                    ✎ Studio
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer: añadir fila */}
      {totalClips > 0 && (
        <div className="border-t border-zinc-700 p-2 flex justify-end">
          <button
            onClick={() => addOrganizerRow('Nueva fila')}
            className="text-zinc-400 hover:text-white text-xs flex items-center gap-1"
          >
            + Añadir fila
          </button>
        </div>
      )}
    </div>
  )
}
```

---

## Task 5: Añadir botón "+" en `ClipBar.tsx`

**Files:**
- Modify: `src/components/video-analyzer/ClipBar.tsx`

**Objetivo:** Un botón `+` que aparece al hover en cada clip del timeline para añadirlo al Organizer.

- [ ] **Step 1: Añadir prop `onAddToOrganizer` a `ClipBar`**

Localizar la interfaz de props de `ClipBar` y añadir:
```typescript
onAddToOrganizer?: (clipId: string) => void
```

- [ ] **Step 2: Añadir el botón visible al hover**

Dentro del render de `ClipBar`, antes del cierre del contenedor principal, añadir:
```tsx
{props.onAddToOrganizer && (
  <button
    onMouseDown={e => e.stopPropagation()}
    onClick={e => {
      e.stopPropagation()
      props.onAddToOrganizer!(props.clip.id)
    }}
    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full bg-black/60 hover:bg-blue-600 text-white flex items-center justify-center text-xs transition-opacity z-10"
    title="Añadir al Organizer"
  >
    +
  </button>
)}
```

Asegurarse de que el contenedor del ClipBar tiene `relative` y `group` en sus clases.

---

## Task 6: Conectar `onAddToOrganizer` en `Timeline.tsx`

**Files:**
- Modify: `src/components/video-analyzer/Timeline.tsx`

- [ ] **Step 1: Añadir prop `onAddToOrganizer` a `Timeline`**

```typescript
onAddToOrganizer?: (clipId: string) => void
```

- [ ] **Step 2: Pasar la prop a cada `<ClipBar>`**

Localizar el render de `<ClipBar>` dentro de Timeline y añadir:
```tsx
onAddToOrganizer={props.onAddToOrganizer}
```

---

## Task 7: Conectar en `VideoAnalyzer.tsx`

**Files:**
- Modify: `src/components/video-analyzer/VideoAnalyzer.tsx`

- [ ] **Step 1: Importar `OrganizerClip` desde types**

```typescript
import type { OrganizerClip } from './types'
```

- [ ] **Step 2: Importar `addClipToOrganizer` desde `useCodeWindowStore`**

En la desestructuración existente de `useCodeWindowStore()`, añadir:
```typescript
const { ..., addClipToOrganizer } = useCodeWindowStore()
```

- [ ] **Step 3: Crear el handler `handleAddToOrganizer`**

```typescript
const handleAddToOrganizer = useCallback((clipId: string) => {
  const clip = clips.find(c => c.id === clipId)
  if (!clip) return

  // Capturar thumbnail del frame actual del video
  let thumbnailUrl: string | undefined
  const video = playerRef.current?.getVideoElement?.()
  if (video) {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = 90
      const ctx = canvas.getContext('2d')
      // Seek video to clip startTime, capture
      const prevTime = video.currentTime
      video.currentTime = clip.startTime
      ctx?.drawImage(video, 0, 0, 160, 90)
      thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7)
      video.currentTime = prevTime
    } catch {
      // Canvas tainted or other error — skip thumbnail
    }
  }

  const organizerClip: OrganizerClip = {
    id: generateId(),
    sourceId: clip.id,
    sourceType: 'clip',
    title: clip.title || `Clip ${formatTime(clip.startTime)}`,
    startTime: clip.startTime,
    endTime: clip.endTime,
    thumbnailUrl,
  }
  addClipToOrganizer(organizerClip)

  // Abrir Organizer si no está abierto
  openWindow('organizer', {})
}, [clips, playerRef, addClipToOrganizer, openWindow])
```

- [ ] **Step 4: Pasar `onAddToOrganizer` al `<Timeline>`**

```tsx
<Timeline
  ...
  onAddToOrganizer={handleAddToOrganizer}
/>
```

- [ ] **Step 5: Nota sobre `getVideoElement`** — si `VideoPlayer` no expone ese método via ref, usar `videoContainerRef.current?.querySelector('video')` como fallback:

```typescript
const video = (playerRef.current as any)?.getVideoElement?.()
  ?? videoContainerRef.current?.querySelector('video') as HTMLVideoElement | null
```

---

## Task 8: Mejora de Studio — dibujar en pausa

**Files:**
- Modify: `src/components/video-analyzer/windows/StudioWindow.tsx`

**Objetivo:** Cuando el video está pausado, el usuario puede dibujar encima del frame actual. El dibujo se guarda como anotación del evento.

- [ ] **Step 1: Leer el archivo completo primero**

Abrir `StudioWindow.tsx` y entender la estructura actual.

- [ ] **Step 2: Añadir estado `isPaused` y ref del canvas**

```typescript
const [isPaused, setIsPaused] = useState(true)  // Studio arranca pausado
const canvasRef = useRef<HTMLCanvasElement>(null)
const [isDrawing, setIsDrawing] = useState(false)
const [drawTool, setDrawTool] = useState<'arrow' | 'line' | 'circle' | 'rect' | 'freehand'>('arrow')
const [drawColor, setDrawColor] = useState('#ef4444')
const [strokeWidth, setStrokeWidth] = useState(3)
```

- [ ] **Step 3: Asegurarse de que el video arranca pausado y en `startTime`**

```typescript
useEffect(() => {
  if (videoRef.current && event) {
    videoRef.current.currentTime = event.startTime
    videoRef.current.pause()
    setIsPaused(true)
  }
}, [event?.id])
```

- [ ] **Step 4: Mostrar canvas de dibujo solo cuando está pausado**

```tsx
{/* Canvas overlay para dibujar en pausa */}
{isPaused && (
  <canvas
    ref={canvasRef}
    className="absolute inset-0 w-full h-full cursor-crosshair z-10"
    style={{ touchAction: 'none' }}
    onPointerDown={startDraw}
    onPointerMove={continueDraw}
    onPointerUp={endDraw}
  />
)}
```

- [ ] **Step 5: Implementar handlers básicos de dibujo en canvas**

```typescript
const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
  setIsDrawing(true)
  const { x, y } = getCanvasPos(e)
  // Guardar punto de inicio en un ref
  drawStartRef.current = { x, y }
  e.currentTarget.setPointerCapture(e.pointerId)
}

const continueDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
  if (!isDrawing) return
  const ctx = canvasRef.current?.getContext('2d')
  if (!ctx || !drawStartRef.current) return
  const { x, y } = getCanvasPos(e)

  // Redibujar todo (clear + previous drawings + current)
  redrawCanvas(ctx)
  drawCurrentShape(ctx, drawStartRef.current, { x, y })
}

const endDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
  if (!isDrawing) return
  setIsDrawing(false)
  // Finalizar forma y guardarla en el estado de anotaciones del evento
  const { x, y } = getCanvasPos(e)
  if (drawStartRef.current) {
    finalizeShape(drawStartRef.current, { x, y })
  }
}

const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
  const rect = e.currentTarget.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) / rect.width,  // normalizado 0-1
    y: (e.clientY - rect.top) / rect.height,
  }
}
```

- [ ] **Step 6: Añadir toolbar de dibujo visible solo en pausa**

```tsx
{isPaused && (
  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1 bg-zinc-900/90 rounded-lg p-1.5 z-20">
    {(['arrow', 'line', 'circle', 'rect', 'freehand'] as const).map(tool => (
      <button
        key={tool}
        onClick={() => setDrawTool(tool)}
        className={`w-7 h-7 rounded text-xs ${drawTool === tool ? 'bg-blue-600' : 'bg-zinc-700 hover:bg-zinc-600'} text-white`}
        title={tool}
      >
        {tool === 'arrow' ? '↗' : tool === 'line' ? '/' : tool === 'circle' ? '○' : tool === 'rect' ? '□' : '~'}
      </button>
    ))}
    <div className="w-px bg-zinc-600 mx-0.5" />
    <input
      type="color"
      value={drawColor}
      onChange={e => setDrawColor(e.target.value)}
      className="w-7 h-7 rounded border-0 cursor-pointer"
    />
  </div>
)}
```

---

## Task 9: Actualizar `OrganizerWindow` en `FloatingWindowManager.tsx`

**Files:**
- Modify: `src/components/video-analyzer/FloatingWindowManager.tsx`

- [ ] **Step 1: Pasar `videoSrc` a `OrganizerWindow`**

La ventana del Organizer necesita `videoSrc` para el preview. Verificar que `FloatingWindowManager` recibe `videoSrc` y lo pasa a `OrganizerWindow`.

Si no lo recibe, añadirlo a las props de `FloatingWindowManager`:
```typescript
interface Props {
  videoSrc: string
  currentTime: number
  videoDuration: number
  videoKey: string
  onTagCreated?: () => void
  onSeekTo: (time: number) => void
}
```

Y en el render de `OrganizerWindow`:
```tsx
<OrganizerWindow
  videoSrc={videoSrc}
  onOpenInStudio={(id, type) => { /* openWindow studio con ese clip */ }}
  onSeekTo={onSeekTo}
/>
```

---

## Self-Review: Cobertura del Spec

| Requisito | Task |
|-----------|------|
| Organizer con viewer de clip | Task 4 (preview panel lateral) |
| Más clips visibles | Task 4 (grid auto-fill) |
| Botonera: editar duración pre/post | Task 3 (ButtonEditor) |
| Botonera: editar color | Task 3 (color picker) |
| Botonera: labels asociados | Tasks 1 + 2 + 3 |
| Botonera: ventana expandible | WindowChrome ya soporta resize — no hay cambio extra |
| Organizer vacío por defecto | Task 4 (empty state) |
| Añadir desde timeline al Organizer | Tasks 5 + 6 + 7 |
| Studio: dibujar en pausa | Task 8 |
| Studio: sin dibujo dinámico (solo en pausa) | Task 8 (canvas solo visible en isPaused) |

---

**Plan guardado. Dos opciones de ejecución:**

**1. Subagente por tarea (recomendado)** — Dispatcher lanza agente fresco por task, revisa entre tasks
**2. Inline en esta sesión** — Ejecuto task a task con checkpoints

¿Cuál preferís?
