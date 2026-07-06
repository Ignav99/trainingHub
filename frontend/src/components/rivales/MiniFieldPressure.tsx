'use client'

/**
 * MiniFieldPressure — Mini-campo de fútbol con visualización de zonas de presión rival.
 * Muestra altura de bloque, tipo de pressing, y zonas calientes en un SVG simplificado.
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { MapaPresion } from '@/types'

interface MiniFieldPressureProps {
  mapaPresion: MapaPresion
  className?: string
  size?: 'sm' | 'md'
}

const DIMENSIONS = {
  sm: { width: 200, height: 120 },
  md: { width: 280, height: 170 },
}

export function MiniFieldPressure({ mapaPresion, className, size = 'sm' }: MiniFieldPressureProps) {
  const dims = DIMENSIONS[size]

  const paddingX = dims.width * 0.05
  const paddingY = dims.height * 0.05
  const fieldW = dims.width - paddingX * 2
  const fieldH = dims.height - paddingY * 2

  // Convert zona objects to SVG rects
  const zones = useMemo(() => {
    if (!mapaPresion?.zonas) return []
    return mapaPresion.zonas.map((z, i) => ({
      id: i,
      x: paddingX + (z.x ?? 0) * fieldW,
      y: paddingY + (z.y ?? 0) * fieldH,
      width: (z.width ?? 0.1) * fieldW,
      height: (z.height ?? 0.1) * fieldH,
      label: z.label,
      color: z.intensidad === 'alta' ? 'rgba(239, 68, 68, 0.45)'
           : z.intensidad === 'media' ? 'rgba(245, 158, 11, 0.4)'
           : 'rgba(59, 130, 246, 0.3)',
      stroke: z.intensidad === 'alta' ? '#ef4444'
            : z.intensidad === 'media' ? '#f59e0b'
            : '#3b82f6',
    }))
  }, [mapaPresion, fieldW, fieldH, paddingX, paddingY])

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox={`0 0 ${dims.width} ${dims.height}`}
        width={dims.width}
        height={dims.height}
        className="rounded-lg bg-green-900/80 border border-green-700/50"
      >
        {/* Grass pattern */}
        <defs>
          <pattern id="grassMini" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="#15803d" />
            <rect width="2" height="2" fill="#16a34a" />
          </pattern>
        </defs>
        <rect x={paddingX} y={paddingY} width={fieldW} height={fieldH} fill="url(#grassMini)" stroke="#22c55e" strokeWidth="1" />

        {/* Center line */}
        <line x1={dims.width / 2} y1={paddingY} x2={dims.width / 2} y2={dims.height - paddingY} stroke="#4ade80" strokeWidth="0.5" />
        {/* Center circle */}
        <circle cx={dims.width / 2} cy={dims.height / 2} r={fieldH * 0.18} fill="none" stroke="#4ade80" strokeWidth="0.5" />

        {/* Penalty areas */}
        <rect x={paddingX} y={dims.height * 0.28} width={fieldW * 0.16} height={fieldH * 0.44} fill="none" stroke="#4ade80" strokeWidth="0.5" />
        <rect x={dims.width - paddingX - fieldW * 0.16} y={dims.height * 0.28} width={fieldW * 0.16} height={fieldH * 0.44} fill="none" stroke="#4ade80" strokeWidth="0.5" />

        {/* Goal areas */}
        <rect x={paddingX} y={dims.height * 0.36} width={fieldW * 0.06} height={fieldH * 0.28} fill="none" stroke="#4ade80" strokeWidth="0.3" />
        <rect x={dims.width - paddingX - fieldW * 0.06} y={dims.height * 0.36} width={fieldW * 0.06} height={fieldH * 0.28} fill="none" stroke="#4ade80" strokeWidth="0.3" />

        {/* Pressure zones */}
        {zones.map((z) => (
          <g key={z.id}>
            <rect
              x={z.x}
              y={z.y}
              width={z.width}
              height={z.height}
              fill={z.color}
              stroke={z.stroke}
              strokeWidth="1.5"
              rx="2"
            />
            {z.label && (
              <text
                x={z.x + z.width / 2}
                y={z.y + z.height / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize={size === 'sm' ? '7' : '8'}
                fontWeight="600"
                className="pointer-events-none select-none"
              >
                {z.label}
              </text>
            )}
          </g>
        ))}

        {/* Dirección de ataque arrow — small indicator */}
        <text
          x={dims.width / 2}
          y={paddingY - 2}
          textAnchor="middle"
          fill="#4ade80"
          fontSize="7"
          className="select-none"
        >
          ⬆ ATAQUE
        </text>
      </svg>

      {/* Leyenda */}
      {mapaPresion?.altura_bloque && (
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
          <span className="font-medium">Bloque:</span>
          <span className={cn(
            'px-1.5 py-0.5 rounded text-white font-semibold',
            mapaPresion.altura_bloque === 'alto' && 'bg-red-600',
            mapaPresion.altura_bloque === 'medio' && 'bg-amber-600',
            mapaPresion.altura_bloque === 'bajo' && 'bg-blue-600',
          )}>
            {mapaPresion.altura_bloque.toUpperCase()}
          </span>
          {mapaPresion.tipo_presion && (
            <>
              <span className="font-medium ml-1">· Presión:</span>
              <span className="bg-slate-700 px-1.5 py-0.5 rounded text-white">
                {mapaPresion.tipo_presion === 'hombre' ? 'Individual'
               : mapaPresion.tipo_presion === 'zona' ? 'Zonal'
               : 'Mixta'}
              </span>
            </>
          )}
          {mapaPresion.primera_linea_presion && (
            <>
              <span className="font-medium ml-1">· 1ª línea:</span>
              <span className="text-foreground">{mapaPresion.primera_linea_presion}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
