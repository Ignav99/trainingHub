'use client'

import { useCallback, useRef, useState } from 'react'
import type { DrawingElement } from '@/types'

export function useUndoRedo(initial: DrawingElement[] = []) {
  const [elements, setElements] = useState<DrawingElement[]>(initial)
  const undoStack = useRef<DrawingElement[][]>([])
  const redoStack = useRef<DrawingElement[][]>([])

  const pushState = useCallback((next: DrawingElement[]) => {
    undoStack.current.push(elements)
    redoStack.current = []
    setElements(next)
  }, [elements])

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return
    const prev = undoStack.current.pop()!
    redoStack.current.push(elements)
    setElements(prev)
  }, [elements])

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return
    const next = redoStack.current.pop()!
    undoStack.current.push(elements)
    setElements(next)
  }, [elements])

  const reset = useCallback((next: DrawingElement[] = []) => {
    undoStack.current = []
    redoStack.current = []
    setElements(next)
  }, [])

  return {
    elements,
    setElements: pushState,
    undo,
    redo,
    reset,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  }
}
