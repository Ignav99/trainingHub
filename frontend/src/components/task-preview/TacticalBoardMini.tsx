'use client'

import React, { memo } from 'react'
import type { DiagramData, DiagramElement, DiagramArrow, DiagramZone } from '../tarea-editor/types'
import { ELEMENT_SIZES } from '../tarea-editor/types'

interface TacticalBoardMiniProps {
  data?: DiagramData | null
  width?: number | string
  height?: number | string
  className?: string
}

// Normalize element position: seed data uses {x, y} directly, frontend uses {position: {x, y}}
function getPos(el: any): { x: number; y: number } {
  if (el.position) return el.position
  if (typeof el.x === 'number' && typeof el.y === 'number') return { x: el.x, y: el.y }
  return { x: 0, y: 0 }
}

function renderElement(element: DiagramElement) {
  const pos = getPos(element)
  const { id, type, label, color } = element
  const size = ELEMENT_SIZES[type as keyof typeof ELEMENT_SIZES] || 24

  switch (type) {
    case 'player':
    case 'opponent':
    case 'player_gk':
      return (
        <g key={id} transform={`translate(${pos.x}, ${pos.y})`}>
          <circle cx="0" cy="0" r={size / 2} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
          <text
            x="0"
            y="1"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#FFFFFF"
            fontSize={type === 'player_gk' ? 7 : 9}
            fontWeight="bold"
            fontFamily="Arial"
          >
            {label}
          </text>
        </g>
      )

    case 'cone':
      return (
        <g key={id} transform={`translate(${pos.x}, ${pos.y})`}>
          <polygon points="0,-10 8,8 -8,8" fill={color || '#F59E0B'} stroke="#000" strokeWidth={0.5} />
        </g>
      )

    case 'ball':
      return (
        <g key={id} transform={`translate(${pos.x}, ${pos.y})`}>
          <circle cx="0" cy="0" r={size / 2} fill="#FFFFFF" stroke="#000000" strokeWidth="1" />
          <circle cx="-2" cy="-2" r="1.5" fill="#000000" />
          <circle cx="3" cy="0" r="1.5" fill="#000000" />
          <circle cx="0" cy="3" r="1.5" fill="#000000" />
        </g>
      )

    case 'mini_goal':
      return (
        <g key={id} transform={`translate(${pos.x}, ${pos.y}) rotate(${element.rotation || 0})`}>
          <rect x="-20" y="-12" width="40" height="24" fill="none" stroke="#FFFFFF" strokeWidth={2} />
          <line x1="-20" y1="-12" x2="-15" y2="12" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.5" />
          <line x1="20" y1="-12" x2="15" y2="12" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.5" />
        </g>
      )

    default:
      return null
  }
}

function renderArrow(arrow: DiagramArrow) {
  const { id, from, to, type, color } = arrow
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const arrowSize = 8

  const tipX = to.x - arrowSize * Math.cos(angle)
  const tipY = to.y - arrowSize * Math.sin(angle)

  return (
    <g key={id}>
      <line
        x1={from.x}
        y1={from.y}
        x2={tipX}
        y2={tipY}
        stroke={color || '#FFFFFF'}
        strokeWidth={2}
        strokeDasharray={type === 'pass' ? '8,4' : 'none'}
      />
      <polygon
        points={`
          ${to.x},${to.y}
          ${to.x - arrowSize * Math.cos(angle - Math.PI / 6)},${to.y - arrowSize * Math.sin(angle - Math.PI / 6)}
          ${to.x - arrowSize * Math.cos(angle + Math.PI / 6)},${to.y - arrowSize * Math.sin(angle + Math.PI / 6)}
        `}
        fill={color || '#FFFFFF'}
      />
    </g>
  )
}

function renderZone(zone: DiagramZone) {
  const { id, position, width, height, color, opacity, shape } = zone

  if (shape === 'ellipse') {
    return (
      <ellipse
        key={id}
        cx={position.x + width / 2}
        cy={position.y + height / 2}
        rx={width / 2}
        ry={height / 2}
        fill={color}
        opacity={opacity || 0.3}
      />
    )
  }

  return (
    <rect
      key={id}
      x={position.x}
      y={position.y}
      width={width}
      height={height}
      fill={color}
      opacity={opacity || 0.3}
      rx={4}
    />
  )
}

// Grass pitch background (inline, simplified version of FootballPitch for mini display)
function PitchBackground({ pitchType }: { pitchType: string }) {
  const grassColor = '#2D5016'
  const grassLight = '#3D6B1E'
  const lineColor = '#FFFFFF'
  const lineWidth = 1.5
  const isFull = pitchType === 'full'

  const viewWidth = isFull ? 1050 : 525

  return (
    <>
      <defs>
        <pattern id="miniGrass" patternUnits="userSpaceOnUse" width="60" height="680">
          <rect width="30" height="680" fill={grassColor} />
          <rect x="30" width="30" height="680" fill={grassLight} />
        </pattern>
      </defs>
      <rect width={viewWidth} height="680" fill="url(#miniGrass)" />
      <g stroke={lineColor} strokeWidth={lineWidth} fill="none" opacity={0.6}>
        <rect x="25" y="25" width={isFull ? 1000 : 475} height="630" />
        {isFull && (
          <>
            <line x1="525" y1="25" x2="525" y2="655" />
            <circle cx="525" cy="340" r="91.5" />
          </>
        )}
        <rect x="25" y="138" width="165" height="404" />
        <rect x="25" y="248" width="55" height="184" />
        <circle cx="135" cy="340" r="3" fill={lineColor} />
        <rect x="10" y="305" width="15" height="70" strokeWidth="2" />
        {isFull && (
          <>
            <rect x="860" y="138" width="165" height="404" />
            <rect x="970" y="248" width="55" height="184" />
            <circle cx="915" cy="340" r="3" fill={lineColor} />
            <rect x="1025" y="305" width="15" height="70" strokeWidth="2" />
          </>
        )}
        {!isFull && (
          <line x1="500" y1="25" x2="500" y2="655" strokeDasharray="10,5" opacity="0.4" />
        )}
      </g>
    </>
  )
}

function TacticalBoardMiniInner({ data, width = '100%', height, className = '' }: TacticalBoardMiniProps) {
  // Empty state
  if (!data || (!data.elements?.length && !data.arrows?.length && !data.zones?.length)) {
    return (
      <div className={`relative bg-[#2D5016] rounded-lg flex items-center justify-center ${className}`} style={{ width, height: height || 'auto', aspectRatio: height ? undefined : '525/680' }}>
        <span className="text-white/40 text-[10px] font-medium">Sin diagrama</span>
      </div>
    )
  }

  const pitchType = data.pitchType || 'half'
  const viewBox = pitchType === 'full' ? '0 0 1050 680' : '0 0 525 680'

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={`rounded-lg ${className}`}
      style={{ display: 'block' }}
    >
      <PitchBackground pitchType={pitchType} />
      {/* Zones first (background layer) */}
      {data.zones?.map(renderZone)}
      {/* Arrows */}
      {data.arrows?.map(renderArrow)}
      {/* Elements on top */}
      {data.elements?.map(renderElement)}
    </svg>
  )
}

const TacticalBoardMini = memo(TacticalBoardMiniInner, (prev, next) => {
  return prev.data === next.data && prev.width === next.width && prev.height === next.height && prev.className === next.className
})

TacticalBoardMini.displayName = 'TacticalBoardMini'

export default TacticalBoardMini
