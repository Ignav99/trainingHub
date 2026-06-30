# Video Analyzer UX Redesign — Floating Windows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el Video Analyzer con layout limpio (video + timeline) y 3 tipos de ventanas flotantes: Botonera, Organizer, y Studio (editor de clips con dibujos).

**Architecture:** Eliminamos el sidebar fijo. Toda la UI secundaria vive en ventanas flotantes draggables con z-index gestionado por un FloatingWindowManager. El Timeline se convierte en multi-row (una fila por botón de botonera). Studio extrae el clip-editor existente a ventana flotante.

**Tech Stack:** Next.js 15, Zustand, React, Tailwind CSS, Framer Motion (drag), existing DrawingEngine/Timeline/CodeWindowPanel

---

## File Map

**Modified:**
- `src/app/local/video/page.tsx` — layout minimalista, sin sidebar
- `src/components/video-analyzer/VideoAnalyzer.tsx` — quitar sidebar, integrar FloatingWindowManager, barra de herramientas simplificada
- `src/components/video-analyzer/Timeline.tsx` — multi-row por botón, estilo Sportscode
- `src/components/video-analyzer/useVideoAnalyzerStore.ts` — agregar floatingWindows state
- `src/components/video-analyzer/types.ts` — agregar Botonera, FloatingWindow types

**Created:**
- `src/components/video-analyzer/FloatingWindowManager.tsx` — renderiza y gestiona todas las ventanas flotantes
- `src/components/video-analyzer/useFloatingWindows.ts` — hook: open/close/move/resize/focus windows
- `src/components/video-analyzer/windows/BotoneraWindow.tsx` — ventana flotante con botones de código
- `src/components/video-analyzer/windows/OrganizerWindow.tsx` — organizador de clips por filas
- `src/components/video-analyzer/windows/StudioWindow.tsx` — editor de clip con dibujos (float)
- `src/components/video-analyzer/WindowChrome.tsx` — shell reutilizable (drag handle, minimize, close)
- `src/components/video-analyzer/MainToolbar.tsx` — barra inferior simple (abrir botonera, organizer, studio)

---

## Task 1: Types — Botonera & FloatingWindow

**Files:**
- Modify: `src/components/video-analyzer/types.ts`

- [ ] **Step 1: Agregar types**

En `src/components/video-analyzer/types.ts`, agregar al final:

```typescript
export interface Botonera {
  id: string
  name: string                   // "Ataque", "Defensa", etc.
  buttons: CodeButton[]          // reusa el type existente
  color: string                  // color de la fila en el Timeline
}

export type WindowType = 'botonera' | 'organizer' | 'studio'

export interface FloatingWindow {
  id: string
  type: WindowType
  title: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  minimized: boolean
  // payload según type:
  botoneraId?: string            // para type='botonera'
  clipId?: string                // para type='studio'
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/video-analyzer/types.ts
git commit -m "feat(video): add Botonera and FloatingWindow types"
```

---

## Task 2: useFloatingWindows hook

**Files:**
- Create: `src/components/video-analyzer/useFloatingWindows.ts`

- [ ] **Step 1: Crear el hook**

```typescript
// src/components/video-analyzer/useFloatingWindows.ts
import { useCallback } from 'react'
import { useVideoAnalyzerStore } from './useVideoAnalyzerStore'
import type { FloatingWindow, WindowType } from './types'

let zCounter = 100

export function useFloatingWindows() {
  const windows = useVideoAnalyzerStore(s => s.floatingWindows)
  const setWindows = useVideoAnalyzerStore(s => s.setFloatingWindows)

  const openWindow = useCallback((
    type: WindowType,
    payload: { botoneraId?: string; clipId?: string; title: string }
  ) => {
    // Si ya existe una ventana de este tipo+payload, solo la trae al frente
    const existing = windows.find(w =>
      w.type === type &&
      (type === 'organizer' || w.botoneraId === payload.botoneraId || w.clipId === payload.clipId)
    )
    if (existing) {
      setWindows(windows.map(w =>
        w.id === existing.id ? { ...w, zIndex: ++zCounter, minimized: false } : w
      ))
      return
    }

    const id = `win-${Date.now()}`
    const defaults: Record<WindowType, { width: number; height: number; x: number; y: number }> = {
      botonera: { width: 320, height: 240, x: 80 + windows.length * 20, y: 80 + windows.length * 20 },
      organizer: { width: 700, height: 500, x: 100, y: 60 },
      studio: { width: 860, height: 560, x: 60, y: 40 },
    }
    const d = defaults[type]
    const newWindow: FloatingWindow = {
      id,
      type,
      title: payload.title,
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
      zIndex: ++zCounter,
      minimized: false,
      botoneraId: payload.botoneraId,
      clipId: payload.clipId,
    }
    setWindows([...windows, newWindow])
  }, [windows, setWindows])

  const closeWindow = useCallback((id: string) => {
    setWindows(windows.filter(w => w.id !== id))
  }, [windows, setWindows])

  const focusWindow = useCallback((id: string) => {
    setWindows(windows.map(w =>
      w.id === id ? { ...w, zIndex: ++zCounter } : w
    ))
  }, [windows, setWindows])

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows(windows.map(w => w.id === id ? { ...w, x, y } : w))
  }, [windows, setWindows])

  const resizeWindow = useCallback((id: string, width: number, height: number) => {
    setWindows(windows.map(w => w.id === id ? { ...w, width, height } : w))
  }, [windows, setWindows])

  const toggleMinimize = useCallback((id: string) => {
    setWindows(windows.map(w => w.id === id ? { ...w, minimized: !w.minimized } : w))
  }, [windows, setWindows])

  return { windows, openWindow, closeWindow, focusWindow, moveWindow, resizeWindow, toggleMinimize }
}
```

- [ ] **Step 2: Agregar floatingWindows al store**

En `src/components/video-analyzer/useVideoAnalyzerStore.ts`, agregar al estado:

```typescript
// En el state interface:
floatingWindows: FloatingWindow[]

// En createStore / initialState:
floatingWindows: [],

// En las actions:
setFloatingWindows: (windows: FloatingWindow[]) => set({ floatingWindows: windows }),
```

Importar `FloatingWindow` desde `./types`.

- [ ] **Step 3: Commit**

```bash
git add src/components/video-analyzer/useFloatingWindows.ts src/components/video-analyzer/useVideoAnalyzerStore.ts
git commit -m "feat(video): add floating window management hook and store"
```

---

## Task 3: WindowChrome — shell reutilizable

**Files:**
- Create: `src/components/video-analyzer/WindowChrome.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
// src/components/video-analyzer/WindowChrome.tsx
'use client'
import { useRef, useCallback, ReactNode } from 'react'
import { X, Minus } from 'lucide-react'

interface WindowChromeProps {
  id: string
  title: string
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  zIndex: number
  onFocus: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onClose: (id: string) => void
  onMinimize: (id: string) => void
  children: ReactNode
  className?: string
}

export function WindowChrome({
  id, title, x, y, width, height, minimized, zIndex,
  onFocus, onMove, onClose, onMinimize, children, className = ''
}: WindowChromeProps) {
  const dragOffset = useRef<{ ox: number; oy: number } | null>(null)

  const handleMouseDownHeader = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onFocus(id)
    const rect = (e.currentTarget.closest('[data-window]') as HTMLElement).getBoundingClientRect()
    dragOffset.current = { ox: e.clientX - rect.left, oy: e.clientY - rect.top }

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragOffset.current) return
      onMove(id, ev.clientX - dragOffset.current.ox, ev.clientY - dragOffset.current.oy)
    }
    const handleMouseUp = () => {
      dragOffset.current = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [id, onFocus, onMove])

  return (
    <div
      data-window
      className={`absolute flex flex-col rounded-xl border border-white/10 shadow-2xl bg-zinc-900/95 backdrop-blur-sm overflow-hidden ${className}`}
      style={{ left: x, top: y, width, height: minimized ? 40 : height, zIndex }}
      onMouseDown={() => onFocus(id)}
    >
      {/* Header / drag handle */}
      <div
        className="flex items-center justify-between px-3 h-10 bg-zinc-800/90 cursor-grab active:cursor-grabbing select-none shrink-0"
        onMouseDown={handleMouseDownHeader}
      >
        <span className="text-xs font-semibold text-zinc-300 truncate">{title}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize(id) }}
            className="w-5 h-5 rounded-full bg-yellow-500/80 hover:bg-yellow-400 flex items-center justify-center"
          >
            <Minus className="w-2.5 h-2.5 text-yellow-900" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(id) }}
            className="w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-400 flex items-center justify-center"
          >
            <X className="w-2.5 h-2.5 text-red-900" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/video-analyzer/WindowChrome.tsx
git commit -m "feat(video): add WindowChrome shell component for floating windows"
```

---

## Task 4: BotoneraWindow

**Files:**
- Create: `src/components/video-analyzer/windows/BotoneraWindow.tsx`

- [ ] **Step 1: Crear el directorio y componente**

```bash
mkdir -p src/components/video-analyzer/windows
```

```typescript
// src/components/video-analyzer/windows/BotoneraWindow.tsx
'use client'
import { useCallback } from 'react'
import { useCodeWindowStore } from '../useCodeWindowStore'
import type { CodeButton } from '../types'

interface BotoneraWindowProps {
  botoneraId: string
  videoKey: string
  currentTime: number
  onTagCreated?: (event: { buttonId: string; startTime: number; endTime: number }) => void
}

export function BotoneraWindow({ botoneraId, videoKey, currentTime, onTagCreated }: BotoneraWindowProps) {
  const { buttons, recordEvent } = useCodeWindowStore()

  // Filtra los botones de esta botonera (por convención, si botoneraId='default' usa todos)
  // En el futuro, cada Botonera tendrá su propio subset; por ahora usamos todos
  const visibleButtons = buttons

  const handlePress = useCallback((btn: CodeButton) => {
    const event = recordEvent(videoKey, btn.id, currentTime)
    onTagCreated?.({
      buttonId: btn.id,
      startTime: currentTime - btn.preRoll,
      endTime: currentTime + btn.postRoll,
    })
  }, [videoKey, currentTime, recordEvent, onTagCreated])

  if (visibleButtons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
        <p className="text-sm">Sin botones</p>
        <p className="text-xs">Configura botones desde el panel de Codes</p>
      </div>
    )
  }

  return (
    <div className="p-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
      {visibleButtons.map(btn => (
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
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/video-analyzer/windows/BotoneraWindow.tsx
git commit -m "feat(video): add BotoneraWindow floating component"
```

---

## Task 5: OrganizerWindow

**Files:**
- Create: `src/components/video-analyzer/windows/OrganizerWindow.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
// src/components/video-analyzer/windows/OrganizerWindow.tsx
'use client'
import { useState, useCallback } from 'react'
import { useCodeWindowStore } from '../useCodeWindowStore'
import { Play, Edit2, Check } from 'lucide-react'
import type { Clip } from '../types'

interface OrganizerWindowProps {
  clips: Clip[]
  videoKey: string
  onOpenClipInStudio: (clipId: string) => void
  onSeekTo: (time: number) => void
}

export function OrganizerWindow({ clips, videoKey, onOpenClipInStudio, onSeekTo }: OrganizerWindowProps) {
  const { buttons, events: allEvents } = useCodeWindowStore()
  const events = allEvents[videoKey] ?? []

  // Agrupa los CodeEvents por buttonId para mostrar en filas
  const rows = buttons.map(btn => ({
    btn,
    events: events.filter(e => e.buttonId === btn.id)
      .sort((a, b) => a.startTime - b.startTime),
  })).filter(row => row.events.length > 0)

  // Fila extra con clips manuales (sin botón)
  const manualClips = clips.filter(clip =>
    !events.some(e => e.startTime === clip.startTime && e.endTime === clip.endTime)
  )

  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [rowNames, setRowNames] = useState<Record<string, string>>({})

  const getRowName = (btnId: string, btnLabel: string) =>
    rowNames[btnId] ?? btnLabel

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {rows.length === 0 && manualClips.length === 0 && (
        <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
          No hay clips. Usá la Botonera durante la reproducción.
        </div>
      )}

      {rows.map(({ btn, events: rowEvents }) => (
        <div key={btn.id} className="border-b border-white/5">
          {/* Row header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/60 sticky top-0">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: btn.color }} />
            {editingRowId === btn.id ? (
              <input
                autoFocus
                className="flex-1 bg-transparent text-xs text-white border-b border-zinc-500 outline-none"
                defaultValue={getRowName(btn.id, btn.label)}
                onBlur={(e) => {
                  setRowNames(p => ({ ...p, [btn.id]: e.target.value }))
                  setEditingRowId(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
              />
            ) : (
              <span className="flex-1 text-xs font-semibold text-zinc-300">
                {getRowName(btn.id, btn.label)}
              </span>
            )}
            <span className="text-[10px] text-zinc-500">{rowEvents.length} clips</span>
            <button
              onClick={() => setEditingRowId(btn.id)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>

          {/* Clips */}
          <div className="flex flex-wrap gap-2 p-2">
            {rowEvents.map(ev => (
              <div
                key={ev.id}
                className="flex items-center gap-2 rounded-lg px-3 py-2 bg-zinc-800 hover:bg-zinc-700 cursor-pointer transition-colors text-xs"
                onClick={() => onSeekTo(ev.startTime)}
              >
                <span className="text-zinc-400 font-mono">
                  {formatTime(ev.startTime)}–{formatTime(ev.endTime)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenClipInStudio(ev.id) }}
                  className="text-zinc-400 hover:text-white"
                  title="Abrir en Studio"
                >
                  <Play className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {manualClips.length > 0 && (
        <div className="border-b border-white/5">
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/60">
            <div className="w-3 h-3 rounded-full bg-zinc-500" />
            <span className="text-xs font-semibold text-zinc-300">Clips Manuales</span>
            <span className="text-[10px] text-zinc-500">{manualClips.length} clips</span>
          </div>
          <div className="flex flex-wrap gap-2 p-2">
            {manualClips.map(clip => (
              <div
                key={clip.id}
                className="flex items-center gap-2 rounded-lg px-3 py-2 bg-zinc-800 hover:bg-zinc-700 cursor-pointer transition-colors text-xs"
                onClick={() => onSeekTo(clip.startTime)}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: clip.color }} />
                <span className="text-zinc-300">{clip.title}</span>
                <span className="text-zinc-400 font-mono">
                  {formatTime(clip.startTime)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenClipInStudio(clip.id) }}
                  className="text-zinc-400 hover:text-white"
                  title="Abrir en Studio"
                >
                  <Play className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/video-analyzer/windows/OrganizerWindow.tsx
git commit -m "feat(video): add OrganizerWindow for clip management by rows"
```

---

## Task 6: StudioWindow — editor de clips con dibujos

**Files:**
- Create: `src/components/video-analyzer/windows/StudioWindow.tsx`

- [ ] **Step 1: Crear el componente**

StudioWindow es el clip editor existente extraído como ventana flotante. Reutiliza VideoPlayer, DrawingOverlay, DrawingToolbar, y useVirtualTimeline.

```typescript
// src/components/video-analyzer/windows/StudioWindow.tsx
'use client'
import { useRef, useCallback, useState } from 'react'
import { VideoPlayer } from '../VideoPlayer'
import { DrawingOverlay } from '../DrawingOverlay'
import { DrawingToolbar } from '../DrawingToolbar'
import { useUndoRedo } from '../useUndoRedo'
import { useDrawingEngine } from '../useDrawingEngine'
import { useVirtualTimeline } from '../useVirtualTimeline'
import { useVideoAnalyzerStore } from '../useVideoAnalyzerStore'
import type { Clip } from '../types'
import type { DrawingElement } from '@/types'

interface StudioWindowProps {
  clip: Clip
  videoSrc: string
}

export function StudioWindow({ clip, videoSrc }: StudioWindowProps) {
  const store = useVideoAnalyzerStore()
  const { elements, setElements, undo, redo, canUndo, canRedo } = useUndoRedo()
  const [tool, setTool] = useState<string>('select')
  const [color, setColor] = useState('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(clip.startTime)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeFreezeId, setActiveFreezeId] = useState<string | null>(null)

  const playerRef = useRef<{ seekTo: (t: number) => void; play: () => void; pause: () => void }>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const { segments, virtualDuration, virtualToReal, realToVirtual } = useVirtualTimeline(clip)

  const { preview, handleMouseDown, handleMouseMove, handleMouseUp, deleteSelected } = useDrawingEngine({
    elements, setElements, color, strokeWidth, tool, selectedId, setSelectedId
  })

  const visibleElements = elements.filter((el: DrawingElement) => {
    if (activeFreezeId) return el.freezeFrameId === activeFreezeId
    if (el.freezeFrameId) return false
    if (el.startTime !== undefined) {
      return currentTime >= el.startTime && currentTime <= (el.endTime ?? Infinity)
    }
    return true
  })

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Video area */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        <VideoPlayer
          ref={playerRef}
          src={videoSrc}
          initialTime={clip.startTime}
          endTime={clip.endTime}
          onTimeUpdate={setCurrentTime}
          onPlayStateChange={setIsPlaying}
        />
        <DrawingOverlay
          svgRef={svgRef}
          elements={visibleElements}
          preview={preview}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          tool={tool}
        />
      </div>

      {/* Drawing toolbar */}
      <DrawingToolbar
        tool={tool}
        color={color}
        strokeWidth={strokeWidth}
        canUndo={canUndo}
        canRedo={canRedo}
        onToolChange={setTool}
        onColorChange={setColor}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={undo}
        onRedo={redo}
        onDelete={deleteSelected}
      />

      {/* Mini timeline within studio */}
      <div className="h-12 bg-zinc-900 border-t border-white/10 flex items-center px-3 gap-2">
        <span className="text-[10px] text-zinc-500 font-mono">
          {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
        </span>
        <div className="flex-1 relative h-4 bg-zinc-800 rounded cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            const time = clip.startTime + ratio * (clip.endTime - clip.startTime)
            playerRef.current?.seekTo(time)
          }}
        >
          <div
            className="absolute top-0 left-0 h-full bg-blue-500/30 rounded"
            style={{ width: `${((currentTime - clip.startTime) / (clip.endTime - clip.startTime)) * 100}%` }}
          />
          {/* Freeze frame markers */}
          {clip.freezeFrames.map(ff => (
            <div
              key={ff.id}
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 cursor-pointer"
              style={{ left: `${((ff.timestamp - clip.startTime) / (clip.endTime - clip.startTime)) * 100}%` }}
              onClick={(e) => { e.stopPropagation(); setActiveFreezeId(ff.id) }}
            />
          ))}
        </div>
        <button
          onClick={() => isPlaying ? playerRef.current?.pause() : playerRef.current?.play()}
          className="text-white text-xs px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/video-analyzer/windows/StudioWindow.tsx
git commit -m "feat(video): add StudioWindow clip editor as floating window"
```

---

## Task 7: FloatingWindowManager

**Files:**
- Create: `src/components/video-analyzer/FloatingWindowManager.tsx`

- [ ] **Step 1: Crear el manager**

```typescript
// src/components/video-analyzer/FloatingWindowManager.tsx
'use client'
import { WindowChrome } from './WindowChrome'
import { BotoneraWindow } from './windows/BotoneraWindow'
import { OrganizerWindow } from './windows/OrganizerWindow'
import { StudioWindow } from './windows/StudioWindow'
import { useFloatingWindows } from './useFloatingWindows'
import type { Clip } from './types'

interface FloatingWindowManagerProps {
  clips: Clip[]
  videoKey: string
  videoSrc: string
  currentTime: number
  onTagCreated: (ev: { buttonId: string; startTime: number; endTime: number }) => void
  onSeekTo: (time: number) => void
  onOpenStudio: (clipId: string) => void
}

export function FloatingWindowManager({
  clips, videoKey, videoSrc, currentTime, onTagCreated, onSeekTo, onOpenStudio
}: FloatingWindowManagerProps) {
  const { windows, closeWindow, focusWindow, moveWindow, toggleMinimize } = useFloatingWindows()

  return (
    <>
      {windows.map(win => (
        <WindowChrome
          key={win.id}
          id={win.id}
          title={win.title}
          x={win.x}
          y={win.y}
          width={win.width}
          height={win.height}
          minimized={win.minimized}
          zIndex={win.zIndex}
          onFocus={focusWindow}
          onMove={moveWindow}
          onClose={closeWindow}
          onMinimize={toggleMinimize}
        >
          {win.type === 'botonera' && (
            <BotoneraWindow
              botoneraId={win.botoneraId ?? 'default'}
              videoKey={videoKey}
              currentTime={currentTime}
              onTagCreated={onTagCreated}
            />
          )}
          {win.type === 'organizer' && (
            <OrganizerWindow
              clips={clips}
              videoKey={videoKey}
              onOpenClipInStudio={onOpenStudio}
              onSeekTo={onSeekTo}
            />
          )}
          {win.type === 'studio' && win.clipId && (() => {
            const clip = clips.find(c => c.id === win.clipId)
            if (!clip) return <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Clip no encontrado</div>
            return <StudioWindow clip={clip} videoSrc={videoSrc} />
          })()}
        </WindowChrome>
      ))}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/video-analyzer/FloatingWindowManager.tsx
git commit -m "feat(video): add FloatingWindowManager orchestrator"
```

---

## Task 8: MainToolbar — barra de herramientas inferior

**Files:**
- Create: `src/components/video-analyzer/MainToolbar.tsx`

- [ ] **Step 1: Crear el toolbar**

```typescript
// src/components/video-analyzer/MainToolbar.tsx
'use client'
import { LayoutGrid, List, Video, Plus } from 'lucide-react'
import { useFloatingWindows } from './useFloatingWindows'

interface MainToolbarProps {
  onOpenBotonera: () => void
  onOpenOrganizer: () => void
  clipCount: number
}

export function MainToolbar({ onOpenBotonera, onOpenOrganizer, clipCount }: MainToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-t border-white/10">
      {/* Left: clip count info */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Video className="w-3.5 h-3.5" />
        <span>{clipCount} clips</span>
      </div>

      {/* Center: main actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenBotonera}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Botonera
        </button>
        <button
          onClick={onOpenOrganizer}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium transition-colors"
        >
          <List className="w-3.5 h-3.5" />
          Organizer
        </button>
      </div>

      {/* Right: keyboard shortcut hint */}
      <div className="text-[10px] text-zinc-600">
        B · Botonera · O · Organizer
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/video-analyzer/MainToolbar.tsx
git commit -m "feat(video): add MainToolbar for opening floating windows"
```

---

## Task 9: Timeline multi-row por botón

**Files:**
- Modify: `src/components/video-analyzer/Timeline.tsx`

- [ ] **Step 1: Agregar props para code events con rows**

En `Timeline.tsx`, localizar la sección donde renderiza `codeButtons` y `codeEvents`. Reemplazar la lógica de lanes actuales para que cada fila tenga más altura y los clips aparezcan como bloques clickeables más grandes.

El cambio clave es que cada CodeButton genera una fila en el timeline con:
- Header izquierdo (nombre del botón, color)
- Bloques de eventos (startTime..endTime) como rectángulos coloreados

Buscar la sección de code lanes en Timeline.tsx y reemplazar el render de cada lane con:

```typescript
// Dentro del map de codeButtons, reemplazar el lane existente:
<div key={btn.id} className="relative flex items-center" style={{ height: 36 }}>
  {/* Label fijo a la izquierda */}
  <div
    className="absolute left-0 z-10 flex items-center gap-1.5 px-2 h-full text-[10px] font-medium select-none"
    style={{ backgroundColor: btn.color + '22', borderRight: `2px solid ${btn.color}`, minWidth: 80 }}
  >
    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: btn.color }} />
    <span className="text-zinc-300 truncate">{btn.label}</span>
  </div>

  {/* Eventos como clips */}
  <div className="absolute inset-0" style={{ marginLeft: 80 }}>
    {(codeEvents ?? [])
      .filter(ev => ev.buttonId === btn.id)
      .map(ev => {
        const leftPct = (ev.startTime / duration) * 100
        const widthPct = ((ev.endTime - ev.startTime) / duration) * 100
        return (
          <div
            key={ev.id}
            className="absolute top-1 bottom-1 rounded cursor-pointer hover:brightness-125 transition-all"
            style={{
              left: `${leftPct}%`,
              width: `${Math.max(widthPct, 0.5)}%`,
              backgroundColor: btn.color + 'bb',
              border: `1px solid ${btn.color}`,
            }}
            onClick={() => onSeek(ev.startTime)}
            title={`${formatTime(ev.startTime)} → ${formatTime(ev.endTime)}`}
          />
        )
      })
    }
  </div>
</div>
```

También agregar `onCodeEventDoubleClick?: (eventId: string) => void` a los props del Timeline para abrir Studio desde ahí.

- [ ] **Step 2: Commit**

```bash
git add src/components/video-analyzer/Timeline.tsx
git commit -m "feat(video): timeline multi-row with larger code event blocks"
```

---

## Task 10: VideoAnalyzer — integrar todo, quitar sidebar

**Files:**
- Modify: `src/components/video-analyzer/VideoAnalyzer.tsx`

Este es el cambio más grande — refactoriza el layout principal.

- [ ] **Step 1: Nuevo layout**

El nuevo layout de VideoAnalyzer:

```
┌──────────────────────────────────────────┐
│  Header (título + cerrar)                │
├──────────────────────────────────────────┤
│                                          │
│         VIDEO  (flex-1)                  │
│       + Drawing Overlay SVG              │
│                                          │
├──────────────────────────────────────────┤
│  Timeline multi-row (h-48)               │
├──────────────────────────────────────────┤
│  MainToolbar (abrir Botonera/Organizer)  │
└──────────────────────────────────────────┘
│  FloatingWindowManager (position:abs)    │
```

Modificar VideoAnalyzer.tsx:
1. Quitar el panel de sidebar (tabs: Codes/Tags/Clips/Eventos)
2. Quitar `DrawingToolbar` del layout fijo — moverla a StudioWindow
3. Agregar `<MainToolbar>` debajo del Timeline
4. Agregar `<FloatingWindowManager>` como overlay absoluto
5. Conectar `openWindow` del `useFloatingWindows` para que MainToolbar abra ventanas
6. Conectar `handleOpenStudio(clipId)` → `openWindow('studio', { clipId, title: 'Studio' })`

Pasos específicos en el código de VideoAnalyzer.tsx:

**a) Agregar imports:**
```typescript
import { FloatingWindowManager } from './FloatingWindowManager'
import { MainToolbar } from './MainToolbar'
import { useFloatingWindows } from './useFloatingWindows'
```

**b) Agregar en el body del componente:**
```typescript
const { openWindow } = useFloatingWindows()

const handleOpenBotonera = useCallback(() => {
  openWindow('botonera', { title: 'Botonera', botoneraId: 'default' })
}, [openWindow])

const handleOpenOrganizer = useCallback(() => {
  openWindow('organizer', { title: 'Organizer' })
}, [openWindow])

const handleOpenStudio = useCallback((clipId: string) => {
  const clip = clips.find(c => c.id === clipId)
  openWindow('studio', { clipId, title: clip?.title ?? 'Studio' })
}, [openWindow, clips])
```

**c) Reemplazar el layout JSX:**

Buscar el `<div className=...>` que contiene el sidebar y eliminarlo. Dejar solo:
```jsx
<div className="relative flex flex-col h-full bg-black overflow-hidden">
  {/* Header */}
  <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-white/10 shrink-0">
    <span className="text-sm font-semibold text-white truncate">{videoTitle}</span>
    <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
  </div>

  {/* Video + Drawing */}
  <div ref={videoContainerRef} className="flex-1 relative min-h-0 overflow-hidden">
    <VideoPlayer ref={playerRef} ... />
    <DrawingOverlay ... />
    {activeFreezeFrameId && <img ... />}
  </div>

  {/* Timeline */}
  <Timeline
    duration={duration}
    clips={clips}
    codeButtons={codeButtons}
    codeEvents={currentCodeEvents}
    onSeek={handleSeek}
    onClipUpdate={updateClip}
    onClipDoubleClick={handleOpenStudio}
    onCodeEventDoubleClick={handleOpenStudio}
    ...
  />

  {/* Main Toolbar */}
  <MainToolbar
    onOpenBotonera={handleOpenBotonera}
    onOpenOrganizer={handleOpenOrganizer}
    clipCount={clips.length}
  />

  {/* Floating Windows */}
  <FloatingWindowManager
    clips={clips}
    videoKey={currentVideoKey}
    videoSrc={src ?? ''}
    currentTime={currentTimeRef.current}
    onTagCreated={handleCodeEventCreated}
    onSeekTo={handleSeek}
    onOpenStudio={handleOpenStudio}
  />
</div>
```

- [ ] **Step 2: Agregar keyboard shortcuts para ventanas**

En el `useEffect` del keyboard handler:
```typescript
case 'b': handleOpenBotonera(); break
case 'o': handleOpenOrganizer(); break
```

- [ ] **Step 3: Commit**

```bash
git add src/components/video-analyzer/VideoAnalyzer.tsx
git commit -m "feat(video): redesign layout - floating windows, remove sidebar"
```

---

## Task 11: Verificación manual

- [ ] **Abrir** `http://localhost:3001/local/video`
- [ ] Cargar un video — el video ocupa toda la pantalla con timeline abajo
- [ ] No hay sidebar visible
- [ ] Hacer clic en **Botonera** en el toolbar → ventana flotante aparece con los botones
- [ ] Arrastrar la ventana de Botonera → se mueve
- [ ] Minimizar la Botonera → se colapsa al header
- [ ] Reproducir el video + presionar un botón en la Botonera → aparece un bloque en la fila del Timeline
- [ ] Hacer clic en **Organizer** → ventana con lista de clips organizados por fila
- [ ] Hacer clic en el ícono ▶ de un clip → abre Studio
- [ ] En Studio: reproducir el clip, dibujar una flecha sobre el video
- [ ] Cerrar ventana de Studio (×) → desaparece
- [ ] Presionar `B` → abre Botonera, `O` → abre Organizer

---

## Self-Review

**Spec coverage:**
- ✅ Video como elemento principal del layout
- ✅ Ventana Botonera flotante, draggable, múltiples pueden abrirse
- ✅ Ventana Organizer con clips por filas, renombrar filas
- ✅ Ventana Studio (editor con dibujos) para clips
- ✅ Timeline con una fila por tipo de botón
- ✅ Clips creados desde Botonera aparecen en Timeline

**Gaps identificados y cubiertos:**
- La creación de CodeEvents ya existe en `useCodeWindowStore.recordEvent` — usada por BotoneraWindow
- El Studio reutiliza VideoPlayer + DrawingOverlay existentes — sin reescritura
- La OrganizerWindow usa CodeEvents de `useCodeWindowStore` — sin nueva lógica de estado

**Notas importantes:**
- StudioWindow necesita que `VideoPlayer` soporte `endTime` prop para limitar reproducción al clip
- El `handleCodeEventCreated` en VideoAnalyzer necesita mapear `{ buttonId, startTime, endTime }` al `recordEvent` existente (ya lo hace implícitamente via BotoneraWindow → useCodeWindowStore)
