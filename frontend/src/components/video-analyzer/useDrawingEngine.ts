'use client'

import { useCallback, useRef, useState } from 'react'
import type { DrawingElement } from '@/types'
import type { DrawingTool } from './types'
import { getSvgPosition, generateId } from './utils'

interface UseDrawingEngineOptions {
  elements: DrawingElement[]
  setElements: (next: DrawingElement[]) => void
  color: string
  strokeWidth: number
  tool: DrawingTool
  selectedId: string | null
  setSelectedId: (id: string | null) => void
}

export function useDrawingEngine({
  elements,
  setElements,
  color,
  strokeWidth,
  tool,
  selectedId,
  setSelectedId,
}: UseDrawingEngineOptions) {
  const [preview, setPreview] = useState<DrawingElement | null>(null)
  const drawingRef = useRef(false)
  const draggingRef = useRef(false)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const pointsRef = useRef<{ x: number; y: number }[]>([])
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null)
  const dragElementSnapshotRef = useRef<DrawingElement | null>(null)

  const findElementAtPoint = useCallback(
    (target: EventTarget) => {
      const el = (target as SVGElement).closest('[data-element-id]')
      return el?.getAttribute('data-element-id') || null
    },
    []
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget
      const pos = getSvgPosition(svg, e.clientX, e.clientY)

      if (tool === 'select') {
        const hitId = findElementAtPoint(e.target)
        if (hitId) {
          setSelectedId(hitId)
          // Start drag if clicking on already-selected or newly-selected element
          draggingRef.current = true
          dragOriginRef.current = pos
          const el = elements.find((el) => el.id === hitId)
          if (el) dragElementSnapshotRef.current = { ...el }
        } else {
          setSelectedId(null)
        }
        return
      }

      if (tool === 'text') {
        const text = prompt('Texto:')
        if (!text) return
        const el: DrawingElement = {
          id: generateId(),
          type: 'text',
          color,
          strokeWidth,
          from: pos,
          text,
          fontSize: Math.max(24, strokeWidth * 8),
        }
        setElements([...elements, el])
        return
      }

      drawingRef.current = true
      startRef.current = pos

      if (tool === 'freehand') {
        pointsRef.current = [pos]
        setPreview({
          id: 'preview',
          type: 'freehand',
          color,
          strokeWidth,
          points: [pos],
        })
      } else {
        setPreview({
          id: 'preview',
          type: tool as DrawingElement['type'],
          color,
          strokeWidth,
          from: pos,
          to: pos,
        })
      }
    },
    [tool, color, strokeWidth, elements, setElements, findElementAtPoint, setSelectedId]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget
      const pos = getSvgPosition(svg, e.clientX, e.clientY)

      // Dragging selected element
      if (draggingRef.current && dragOriginRef.current && dragElementSnapshotRef.current && selectedId) {
        const dx = pos.x - dragOriginRef.current.x
        const dy = pos.y - dragOriginRef.current.y
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return

        const snap = dragElementSnapshotRef.current
        const moved = moveElement(snap, dx, dy)

        setElements(elements.map((el) => (el.id === selectedId ? moved : el)))
        return
      }

      // Drawing
      if (!drawingRef.current || !startRef.current) return

      if (tool === 'freehand') {
        pointsRef.current.push(pos)
        setPreview({
          id: 'preview',
          type: 'freehand',
          color,
          strokeWidth,
          points: [...pointsRef.current],
        })
      } else {
        setPreview((prev) => (prev ? { ...prev, to: pos } : null))
      }
    },
    [tool, color, strokeWidth, selectedId, elements, setElements]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // End drag
      if (draggingRef.current) {
        draggingRef.current = false
        dragOriginRef.current = null
        dragElementSnapshotRef.current = null
        return
      }

      // End draw
      if (!drawingRef.current || !startRef.current) return
      drawingRef.current = false
      const svg = e.currentTarget
      const pos = getSvgPosition(svg, e.clientX, e.clientY)

      let el: DrawingElement | null = null

      if (tool === 'freehand') {
        pointsRef.current.push(pos)
        if (pointsRef.current.length > 1) {
          el = {
            id: generateId(),
            type: 'freehand',
            color,
            strokeWidth,
            points: [...pointsRef.current],
          }
        }
        pointsRef.current = []
      } else {
        const start = startRef.current
        const dx = pos.x - start.x
        const dy = pos.y - start.y
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          el = {
            id: generateId(),
            type: tool as DrawingElement['type'],
            color,
            strokeWidth,
            from: start,
            to: pos,
          }
        }
      }

      setPreview(null)
      startRef.current = null

      if (el) {
        setElements([...elements, el])
      }
    },
    [tool, color, strokeWidth, elements, setElements]
  )

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setElements(elements.filter((el) => el.id !== selectedId))
    setSelectedId(null)
  }, [selectedId, elements, setElements, setSelectedId])

  const clearAll = useCallback(() => {
    setElements([])
    setSelectedId(null)
  }, [setElements, setSelectedId])

  return {
    preview,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    deleteSelected,
    clearAll,
  }
}

function moveElement(el: DrawingElement, dx: number, dy: number): DrawingElement {
  const moved = { ...el }
  if (moved.from) {
    moved.from = { x: moved.from.x + dx, y: moved.from.y + dy }
  }
  if (moved.to) {
    moved.to = { x: moved.to.x + dx, y: moved.to.y + dy }
  }
  if (moved.points) {
    moved.points = moved.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
  }
  return moved
}
