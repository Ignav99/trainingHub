'use client'

/**
 * Render de una flecha/movimiento de la pizarra.
 * Compartido por el editor, la mini-pizarra y la preview animada.
 */

import React from 'react'
import type { DiagramArrow } from '@/components/tarea-editor/types'
import { arrowGeometry, arrowHeadPoints, arrowBarPoints } from './arrowPaths'

export interface BoardArrowProps {
  arrow: DiagramArrow
  selected?: boolean
  /** Muestra tiradores y responde al ratón */
  interactive?: boolean
  onSelect?: (e: React.MouseEvent) => void
  onEndpointMouseDown?: (e: React.MouseEvent, endpoint: 'from' | 'to') => void
}

export default function BoardArrow({
  arrow,
  selected = false,
  interactive = false,
  onSelect,
  onEndpointMouseDown,
}: BoardArrowProps) {
  const { d, tip, angle, style } = arrowGeometry(arrow)
  const color = arrow.color || style.color
  const width = selected ? style.strokeWidth + 1.5 : style.strokeWidth
  const headSize = style.strokeWidth * 3.2

  const midX = (arrow.from.x + arrow.to.x) / 2
  const midY = (arrow.from.y + arrow.to.y) / 2

  return (
    <g
      onClick={onSelect}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
    >
      {/* Zona de click ancha e invisible para poder seleccionar la flecha */}
      {interactive && (
        <path d={d} fill="none" stroke="transparent" strokeWidth={Math.max(12, width * 4)} strokeLinecap="round" />
      )}

      {/* Trazo */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeDasharray={style.dash}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Punta */}
      {style.head === 'arrow' && (
        <polygon points={arrowHeadPoints(tip, angle, headSize)} fill={color} />
      )}
      {style.head === 'double' && (
        <>
          <polygon points={arrowHeadPoints(tip, angle, headSize)} fill={color} />
          {/* Segunda punta separada: es lo que distingue el disparo de un pase */}
          <polygon
            points={arrowHeadPoints(
              { x: tip.x - Math.cos(angle) * headSize * 1.25, y: tip.y - Math.sin(angle) * headSize * 1.25 },
              angle,
              headSize,
            )}
            fill={color}
          />
        </>
      )}
      {style.head === 'bar' && (() => {
        const bar = arrowBarPoints(tip, angle, headSize * 0.8)
        return (
          <line
            x1={bar.x1} y1={bar.y1} x2={bar.x2} y2={bar.y2}
            stroke={color} strokeWidth={width + 1} strokeLinecap="round"
          />
        )
      })()}

      {/* Etiqueta cronológica */}
      {arrow.label && (
        <>
          <circle cx={midX} cy={midY} r="9.5" fill="rgba(0,0,0,0.72)" stroke={color} strokeWidth="1" />
          <text
            x={midX} y={midY + 0.5}
            textAnchor="middle" dominantBaseline="middle"
            fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="Arial"
            style={{ pointerEvents: 'none' }}
          >
            {arrow.label}
          </text>
        </>
      )}

      {/* Tiradores de los extremos */}
      {interactive && selected && (
        <>
          <circle
            cx={arrow.from.x} cy={arrow.from.y} r="6.5"
            fill="#FFE600" stroke="#000" strokeWidth="1.4" opacity="0.9"
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => onEndpointMouseDown?.(e, 'from')}
          />
          <circle
            cx={arrow.to.x} cy={arrow.to.y} r="6.5"
            fill="#FFE600" stroke="#000" strokeWidth="1.4" opacity="0.9"
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => onEndpointMouseDown?.(e, 'to')}
          />
        </>
      )}
    </g>
  )
}
