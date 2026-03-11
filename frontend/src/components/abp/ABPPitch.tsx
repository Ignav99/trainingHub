'use client'

import React, { useId } from 'react'

interface ABPPitchProps {
  /** 'half' = medio campo (goal bottom), 'full' = campo completo */
  type?: 'half' | 'full'
  className?: string
  children?: React.ReactNode
  onClick?: (e: React.MouseEvent<SVGSVGElement>) => void
}

/**
 * Football pitch optimised for set-piece diagrams.
 * Goal is at the BOTTOM — the standard ABP diagram orientation.
 *
 * Coordinate system (half-field):
 *   Width  = 680 units (≈ 68 m, full field width)
 *   Height = 525 units (≈ 52.5 m, half field length)
 *   Origin (0,0) at top-left → half-way line at top, goal line at bottom.
 *
 * Key landmarks:
 *   Goal line:      y = 500
 *   Penalty area:   x 139–541, y 335–500
 *   Goal area:      x 249–431, y 445–500
 *   Penalty spot:   (340, 390)
 *   Goal net:       x 304–376, y 500–515
 */
export default function ABPPitch({
  type = 'half',
  className = '',
  children,
  onClick,
}: ABPPitchProps) {
  const uid = useId().replace(/:/g, '')
  const grassId = `abpGrass${uid}`
  const isHalf = type === 'half'
  const vbW = 680
  const vbH = isHalf ? 525 : 1050

  const grassColor = '#2D5016'
  const grassLight = '#3D6B1E'
  const lineColor = '#FFFFFF'
  const lw = 2 // line-width

  // Field boundaries (25-unit padding all around)
  const L = 25       // left
  const R = vbW - 25 // right = 655
  const T = 25       // top
  const B = isHalf ? 500 : 1025 // bottom (goal line)
  const FW = R - L   // field width = 630
  const CX = vbW / 2 // center x = 340

  // Penalty area: 16.5 m each side of goal → 165 units each side of center
  const paL = CX - 201.5 // ~138.5
  const paR = CX + 201.5 // ~541.5
  const paT = B - 165     // 335

  // Goal area (small box): 5.5 m each side → 55 units from goal
  const gaL = CX - 91.5
  const gaR = CX + 91.5
  const gaT = B - 55

  // Penalty spot
  const penX = CX
  const penY = B - 110

  // Goal posts: 7.32 m = ~73 units, centered
  const gpL = CX - 36.5
  const gpR = CX + 36.5

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className={`w-full h-full ${className}`}
      onClick={onClick}
      style={{ cursor: 'crosshair' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grass stripes (horizontal for this orientation) */}
      <defs>
        <pattern id={grassId} patternUnits="userSpaceOnUse" width="680" height="60">
          <rect width="680" height="30" fill={grassColor} />
          <rect y="30" width="680" height="30" fill={grassLight} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${grassId})`} />

      <g stroke={lineColor} strokeWidth={lw} fill="none">
        {/* Field outline */}
        <rect x={L} y={T} width={FW} height={B - T} />

        {/* Centre line (top edge for half-field) */}
        {isHalf ? (
          <>
            <line x1={L} y1={T} x2={R} y2={T} strokeDasharray="10,5" opacity="0.5" />
            <circle cx={CX} cy={T} r="91.5" strokeDasharray="10,5" opacity="0.5" />
          </>
        ) : (
          <>
            <line x1={L} y1={vbH / 2} x2={R} y2={vbH / 2} />
            <circle cx={CX} cy={vbH / 2} r="91.5" />
            <circle cx={CX} cy={vbH / 2} r="3" fill={lineColor} />
          </>
        )}

        {/* Penalty area */}
        <rect x={paL} y={paT} width={paR - paL} height={B - paT} />

        {/* Goal area */}
        <rect x={gaL} y={gaT} width={gaR - gaL} height={B - gaT} />

        {/* Penalty spot */}
        <circle cx={penX} cy={penY} r="3" fill={lineColor} />

        {/* Penalty arc (outside box) */}
        <path d={`M ${paL} ${paT} A 91.5 91.5 0 0 1 ${paR} ${paT}`} />

        {/* Goal (net drawn below goal line) */}
        <rect x={gpL} y={B} width={gpR - gpL} height="15" strokeWidth="3" />
        <rect x={gpL + 2} y={B} width={gpR - gpL - 4} height="12" fill={lineColor} opacity="0.15" />

        {/* Corner arcs */}
        <path d={`M ${L} ${B - 10} A 10 10 0 0 0 ${L + 10} ${B}`} />
        <path d={`M ${R - 10} ${B} A 10 10 0 0 0 ${R} ${B - 10}`} />
        <path d={`M ${L + 10} ${T} A 10 10 0 0 0 ${L} ${T + 10}`} />
        <path d={`M ${R} ${T + 10} A 10 10 0 0 0 ${R - 10} ${T}`} />

        {/* Full-field extras */}
        {!isHalf && (
          <>
            {/* Top penalty area */}
            <rect x={paL} y={T} width={paR - paL} height={165} />
            <rect x={gaL} y={T} width={gaR - gaL} height={55} />
            <circle cx={penX} cy={T + 110} r="3" fill={lineColor} />
            <path d={`M ${paL} ${T + 165} A 91.5 91.5 0 0 0 ${paR} ${T + 165}`} />
            <rect x={gpL} y={T - 15} width={gpR - gpL} height="15" strokeWidth="3" />
          </>
        )}
      </g>

      {/* Diagram overlay */}
      {children}
    </svg>
  )
}
