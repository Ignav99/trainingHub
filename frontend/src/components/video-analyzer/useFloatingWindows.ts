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
    // If a window of this type+payload already exists, bring it to front
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
