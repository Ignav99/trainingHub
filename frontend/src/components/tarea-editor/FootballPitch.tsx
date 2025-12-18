'use client'

import React from 'react'

interface FootballPitchProps {
  type: 'full' | 'half' | 'quarter' | 'custom'
  width?: number
  height?: number
  className?: string
  children?: React.ReactNode
  onClick?: (e: React.MouseEvent<SVGSVGElement>) => void
}

// Dimensiones del campo en metros (proporcionales)
// Campo completo: 105m x 68m
// Usamos escala 1m = 4px para un campo de 420x272

export default function FootballPitch({
  type = 'half',
  width = 600,
  height = 400,
  className = '',
  children,
  onClick,
}: FootballPitchProps) {
  // Dimensiones del viewBox segun tipo
  const getViewBox = () => {
    switch (type) {
      case 'full':
        return '0 0 1050 680'
      case 'half':
        return '0 0 525 680'
      case 'quarter':
        return '0 0 525 340'
      case 'custom':
      default:
        return '0 0 525 680'
    }
  }

  // Color del cesped
  const grassColor = '#2D5016'
  const grassLight = '#3D6B1E'
  const lineColor = '#FFFFFF'
  const lineWidth = 2

  return (
    <svg
      width={width}
      height={height}
      viewBox={getViewBox()}
      className={`rounded-lg ${className}`}
      onClick={onClick}
      style={{ cursor: 'crosshair' }}
    >
      {/* Fondo de cesped con franjas */}
      <defs>
        <pattern id="grassStripes" patternUnits="userSpaceOnUse" width="60" height="680">
          <rect width="30" height="680" fill={grassColor} />
          <rect x="30" width="30" height="680" fill={grassLight} />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#grassStripes)" />

      {/* Lineas del campo */}
      <g stroke={lineColor} strokeWidth={lineWidth} fill="none">
        {/* Borde exterior */}
        <rect x="25" y="25" width={type === 'full' ? 1000 : 475} height="630" />

        {/* Linea central (solo campo completo) */}
        {type === 'full' && (
          <>
            <line x1="525" y1="25" x2="525" y2="655" />
            <circle cx="525" cy="340" r="91.5" />
            <circle cx="525" cy="340" r="3" fill={lineColor} />
          </>
        )}

        {/* Area grande */}
        <rect x="25" y="138" width="165" height="404" />

        {/* Area pequena */}
        <rect x="25" y="248" width="55" height="184" />

        {/* Punto de penalti */}
        <circle cx="135" cy="340" r="3" fill={lineColor} />

        {/* Semicirculo del area */}
        <path d="M 190 248 A 91.5 91.5 0 0 1 190 432" />

        {/* Porteria */}
        <rect x="10" y="305" width="15" height="70" strokeWidth="3" />

        {/* Area de meta (goal area) pequeño cuadrado */}
        <rect x="25" y="292" width="8" height="96" fill={lineColor} opacity="0.3" />

        {/* Esquineros */}
        <path d="M 25 25 A 10 10 0 0 0 35 35" />
        <path d="M 25 655 A 10 10 0 0 1 35 645" />

        {/* Si es campo completo, agregar el otro lado */}
        {type === 'full' && (
          <>
            {/* Area grande derecha */}
            <rect x="860" y="138" width="165" height="404" />

            {/* Area pequena derecha */}
            <rect x="970" y="248" width="55" height="184" />

            {/* Punto de penalti derecho */}
            <circle cx="915" cy="340" r="3" fill={lineColor} />

            {/* Semicirculo del area derecho */}
            <path d="M 860 248 A 91.5 91.5 0 0 0 860 432" />

            {/* Porteria derecha */}
            <rect x="1025" y="305" width="15" height="70" strokeWidth="3" />

            {/* Esquineros derechos */}
            <path d="M 1025 25 A 10 10 0 0 1 1015 35" />
            <path d="M 1025 655 A 10 10 0 0 0 1015 645" />
          </>
        )}

        {/* Si es medio campo, agregar linea de fondo con centro */}
        {type === 'half' && (
          <>
            <line x1="500" y1="25" x2="500" y2="655" strokeDasharray="10,5" opacity="0.5" />
            <circle cx="500" cy="340" r="91.5" strokeDasharray="10,5" opacity="0.5" />
          </>
        )}
      </g>

      {/* Zona para elementos del diagrama */}
      {children}
    </svg>
  )
}
