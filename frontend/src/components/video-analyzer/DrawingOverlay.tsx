'use client'

import { forwardRef, useMemo } from 'react'
import type { DrawingElement } from '@/types'

interface DrawingOverlayProps {
  elements: DrawingElement[]
  preview: DrawingElement | null
  selectedId: string | null
  interactive: boolean
  tool: string
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseUp: (e: React.MouseEvent<SVGSVGElement>) => void
}

export const DrawingOverlay = forwardRef<SVGSVGElement, DrawingOverlayProps>(
  function DrawingOverlay(
    { elements, preview, selectedId, interactive, tool, onMouseDown, onMouseMove, onMouseUp },
    ref
  ) {
    const allElements = preview ? [...elements, preview] : elements

    // Collect unique colors for arrow markers
    const arrowColors = useMemo(() => {
      const colors = new Set<string>()
      allElements.forEach((el) => {
        if (el.type === 'arrow') colors.add(el.color)
      })
      return Array.from(colors)
    }, [allElements])

    // Allow pointer events for select tool (to click/drag elements) OR drawing tools
    const enablePointer = interactive || tool === 'select'

    return (
      <svg
        ref={ref}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: enablePointer ? 'all' : 'none', zIndex: 3 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        <defs>
          {arrowColors.map((c) => (
            <marker
              key={c}
              id={`arrowhead-${c.replace('#', '')}`}
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={c} />
            </marker>
          ))}
        </defs>

        {allElements.map((el) => (
          <g
            key={el.id}
            data-element-id={el.id}
            style={{
              cursor: tool === 'select' ? 'pointer' : 'crosshair',
            }}
          >
            {/* Hit area: wide invisible stroke for thin elements */}
            {tool === 'select' && el.id !== 'preview' && (
              <HitArea element={el} />
            )}
            <RenderElement element={el} />
            {el.id === selectedId && el.id !== 'preview' && (
              <SelectionHighlight element={el} />
            )}
          </g>
        ))}
      </svg>
    )
  }
)

function HitArea({ element: el }: { element: DrawingElement }) {
  const hitWidth = 16

  if ((el.type === 'arrow' || el.type === 'line') && el.from && el.to) {
    return (
      <line
        x1={el.from.x}
        y1={el.from.y}
        x2={el.to.x}
        y2={el.to.y}
        stroke="transparent"
        strokeWidth={hitWidth}
        fill="none"
      />
    )
  }

  if (el.type === 'freehand' && el.points && el.points.length >= 2) {
    const d = el.points.reduce(
      (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
      ''
    )
    return (
      <path d={d} stroke="transparent" strokeWidth={hitWidth} fill="none" />
    )
  }

  return null
}

function RenderElement({ element: el }: { element: DrawingElement }) {
  switch (el.type) {
    case 'arrow':
      return el.from && el.to ? (
        <line
          x1={el.from.x}
          y1={el.from.y}
          x2={el.to.x}
          y2={el.to.y}
          stroke={el.color}
          strokeWidth={el.strokeWidth}
          markerEnd={`url(#arrowhead-${el.color.replace('#', '')})`}
        />
      ) : null

    case 'line':
      return el.from && el.to ? (
        <line
          x1={el.from.x}
          y1={el.from.y}
          x2={el.to.x}
          y2={el.to.y}
          stroke={el.color}
          strokeWidth={el.strokeWidth}
        />
      ) : null

    case 'circle':
      if (!el.from || !el.to) return null
      return (
        <ellipse
          cx={(el.from.x + el.to.x) / 2}
          cy={(el.from.y + el.to.y) / 2}
          rx={Math.abs(el.to.x - el.from.x) / 2}
          ry={Math.abs(el.to.y - el.from.y) / 2}
          stroke={el.color}
          strokeWidth={el.strokeWidth}
          fill="none"
        />
      )

    case 'rect':
      if (!el.from || !el.to) return null
      return (
        <rect
          x={Math.min(el.from.x, el.to.x)}
          y={Math.min(el.from.y, el.to.y)}
          width={Math.abs(el.to.x - el.from.x)}
          height={Math.abs(el.to.y - el.from.y)}
          stroke={el.color}
          strokeWidth={el.strokeWidth}
          fill="none"
        />
      )

    case 'freehand':
      if (!el.points || el.points.length < 2) return null
      return (
        <path
          d={el.points.reduce(
            (acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`),
            ''
          )}
          stroke={el.color}
          strokeWidth={el.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )

    case 'text':
      return el.from ? (
        <text
          x={el.from.x}
          y={el.from.y}
          fill={el.color}
          fontSize={el.fontSize || 32}
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          {el.text}
        </text>
      ) : null

    default:
      return null
  }
}

function SelectionHighlight({ element: el }: { element: DrawingElement }) {
  const pad = 8

  if (el.type === 'freehand' && el.points?.length) {
    const xs = el.points.map((p) => p.x)
    const ys = el.points.map((p) => p.y)
    return (
      <rect
        x={Math.min(...xs) - pad}
        y={Math.min(...ys) - pad}
        width={Math.max(...xs) - Math.min(...xs) + pad * 2}
        height={Math.max(...ys) - Math.min(...ys) + pad * 2}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="6 3"
        pointerEvents="none"
      />
    )
  }

  if (el.type === 'text' && el.from) {
    return (
      <rect
        x={el.from.x - pad}
        y={el.from.y - (el.fontSize || 32) - pad}
        width={(el.text?.length || 1) * (el.fontSize || 32) * 0.6 + pad * 2}
        height={(el.fontSize || 32) + pad * 2}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="6 3"
        pointerEvents="none"
      />
    )
  }

  if (el.from && el.to) {
    return (
      <rect
        x={Math.min(el.from.x, el.to.x) - pad}
        y={Math.min(el.from.y, el.to.y) - pad}
        width={Math.abs(el.to.x - el.from.x) + pad * 2}
        height={Math.abs(el.to.y - el.from.y) + pad * 2}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="6 3"
        pointerEvents="none"
      />
    )
  }

  return null
}
