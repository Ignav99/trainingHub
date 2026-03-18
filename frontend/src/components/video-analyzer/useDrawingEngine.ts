'use client'

import { useCallback, useRef, useState } from 'react'
import type { DrawingElement } from '@/types'
import { getSvgPosition, generateId } from './utils'

export type DrawingTool = 'select' | 'arrow' | 'line' | 'circle' | 'rect' | 'freehand' | 'text'

interface UseDrawingEngineOptions {
  elements: DrawingElement[]
  setElements: (next: DrawingElement[]) => void
  color: string
  strokeWidth: number
  tool: DrawingTool
}

export function useDrawingEngine({
  elements,
  setElements,
  color,
  strokeWidth,
  tool,
}: UseDrawingEngineOptions) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [preview, setPreview] = useState<DrawingElement | null>(null)
  const drawingRef = useRef(false)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const pointsRef = useRef<{ x: number; y: number }[]>([])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget
      const pos = getSvgPosition(svg, e.clientX, e.clientY)

      if (tool === 'select') {
        // Check if clicked on an element
        const target = e.target as SVGElement
        const elId = target.closest('[data-element-id]')?.getAttribute('data-element-id')
        setSelectedId(elId || null)
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
    [tool, color, strokeWidth, elements, setElements]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!drawingRef.current || !startRef.current) return
      const svg = e.currentTarget
      const pos = getSvgPosition(svg, e.clientX, e.clientY)

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
        setPreview((prev) =>
          prev ? { ...prev, to: pos } : null
        )
      }
    },
    [tool, color, strokeWidth]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
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
        // Only create if there's some minimum drag distance
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
  }, [selectedId, elements, setElements])

  const clearAll = useCallback(() => {
    setElements([])
    setSelectedId(null)
  }, [setElements])

  return {
    selectedId,
    setSelectedId,
    preview,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    deleteSelected,
    clearAll,
  }
}
