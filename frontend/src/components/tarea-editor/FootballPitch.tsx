'use client'

import React, { forwardRef } from 'react'

interface FootballPitchProps {
  type: 'full' | 'half' | 'quarter' | 'custom'
  width?: number | string
  height?: number | string
  className?: string
  children?: React.ReactNode
  onClick?: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseDown?: (e: React.MouseEvent<SVGSVGElement>) => void
}

// Dimensiones del campo en metros (proporcionales)
// Campo completo: 105m x 68m
// Usamos escala 1m = 10px para viewBox

const FootballPitch = forwardRef<SVGSVGElement, FootballPitchProps>(function FootballPitch({
  type = 'half',
  width,
  height,
  className = '',
  children,
  onClick,
  onMouseDown,
}, ref) {
  // Dimensiones del viewBox segun tipo
  // half/quarter: coordenadas ABPPitch (portería abajo) — 680×525 landscape
  // full: 1050×680 landscape, porterías en los laterales
  const getViewBox = () => {
    switch (type) {
      case 'full':
        return '0 0 1050 680'
      case 'half':
        return '0 0 680 525'
      case 'quarter':
        return '0 0 680 262'
      case 'custom':
      default:
        return '0 0 680 525'
    }
  }

  // Color del cesped
  const grassColor = '#2D5016'
  const grassLight = '#3D6B1E'
  const lineColor = '#FFFFFF'
  const lineWidth = 2

  // Unique pattern ID to avoid conflicts with multiple pitch instances
  const patternId = `grassStripes_${type}`

  return (
    <svg
      ref={ref}
      width={width ?? '100%'}
      height={height}
      viewBox={getViewBox()}
      preserveAspectRatio="xMidYMid meet"
      className={`rounded-lg ${className}`}
      onClick={onClick}
      onMouseDown={onMouseDown}
      style={{ cursor: 'crosshair', display: 'block', userSelect: 'none', WebkitUserSelect: 'none' }}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Fondo de cesped con franjas */}
      <defs>
        {type === 'full' ? (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="60" height="680">
            <rect width="30" height="680" fill={grassColor} />
            <rect x="30" width="30" height="680" fill={grassLight} />
          </pattern>
        ) : (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="680" height="60">
            <rect width="680" height="30" fill={grassColor} />
            <rect y="30" width="680" height="30" fill={grassLight} />
          </pattern>
        )}
      </defs>

      <rect width="100%" height="100%" fill={`url(#${patternId})`} />

      {/* Lineas del campo completo (1050×680, porterías en laterales) */}
      {type === 'full' && (
        <g stroke={lineColor} strokeWidth={lineWidth} fill="none">
          <rect x="25" y="25" width="1000" height="630" />
          <line x1="525" y1="25" x2="525" y2="655" />
          <circle cx="525" cy="340" r="91.5" />
          <circle cx="525" cy="340" r="3" fill={lineColor} />
          {/* Area grande izquierda */}
          <rect x="25" y="138" width="165" height="404" />
          <rect x="25" y="248" width="55" height="184" />
          <circle cx="135" cy="340" r="3" fill={lineColor} />
          <path d="M 190 248 A 91.5 91.5 0 0 1 190 432" />
          <rect x="10" y="305" width="15" height="70" strokeWidth="3" />
          <path d="M 25 25 A 10 10 0 0 0 35 35" />
          <path d="M 25 655 A 10 10 0 0 1 35 645" />
          {/* Area grande derecha */}
          <rect x="860" y="138" width="165" height="404" />
          <rect x="970" y="248" width="55" height="184" />
          <circle cx="915" cy="340" r="3" fill={lineColor} />
          <path d="M 860 248 A 91.5 91.5 0 0 0 860 432" />
          <rect x="1025" y="305" width="15" height="70" strokeWidth="3" />
          <path d="M 1025 25 A 10 10 0 0 1 1015 35" />
          <path d="M 1025 655 A 10 10 0 0 0 1015 645" />
        </g>
      )}

      {/* Lineas de medio campo (680×525, portería abajo) — coordenadas ABPPitch */}
      {(type === 'half' || type === 'quarter' || type === 'custom') && (
        <g stroke={lineColor} strokeWidth={lineWidth} fill="none">
          {/* Borde exterior */}
          <rect x="25" y="25" width="630" height="475" />
          {/* Línea de medio campo (top, discontinua) */}
          <line x1="25" y1="25" x2="655" y2="25" strokeDasharray="10,5" opacity="0.5" />
          <circle cx="340" cy="25" r="91.5" strokeDasharray="10,5" opacity="0.5" />
          {/* Area grande (portería abajo) */}
          <rect x="138.5" y="335" width="403" height="165" />
          {/* Area pequeña */}
          <rect x="248.5" y="445" width="183" height="55" />
          {/* Punto de penalti */}
          <circle cx="340" cy="390" r="3" fill={lineColor} />
          {/* Arco de penalti */}
          <path d="M 266.9 335 A 91.5 91.5 0 0 1 413.1 335" />
          {/* Portería */}
          <rect x="303.5" y="500" width="73" height="15" strokeWidth="3" />
          <rect x="305.5" y="500" width="69" height="12" fill={lineColor} opacity="0.15" />
          {/* Esquineros */}
          <path d="M 25 490 A 10 10 0 0 0 35 500" />
          <path d="M 645 500 A 10 10 0 0 0 655 490" />
          <path d="M 35 25 A 10 10 0 0 0 25 35" />
          <path d="M 655 35 A 10 10 0 0 0 645 25" />
        </g>
      )}


      {/* Zona para elementos del diagrama */}
      {children}
    </svg>
  )
})

export default FootballPitch
