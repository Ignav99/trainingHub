'use client'

import { useState, useCallback } from 'react'
import type { FaltaPosicion } from '@/types'

interface FoulMapEditorProps {
  cometidas: FaltaPosicion[]
  recibidas: FaltaPosicion[]
  onCometidasChange: (dots: FaltaPosicion[]) => void
  onRecibidasChange: (dots: FaltaPosicion[]) => void
}

type FoulMode = 'cometidas' | 'recibidas'

export function FoulMapEditor({ cometidas, recibidas, onCometidasChange, onRecibidasChange }: FoulMapEditorProps) {
  const [mode, setMode] = useState<FoulMode>('cometidas')
  const dots = mode === 'cometidas' ? cometidas : recibidas
  const setDots = mode === 'cometidas' ? onCometidasChange : onRecibidasChange
  const dotColor = mode === 'cometidas' ? '#EF4444' : '#3B82F6'
  const otherDots = mode === 'cometidas' ? recibidas : cometidas
  const otherColor = mode === 'cometidas' ? '#3B82F6' : '#EF4444'

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    setDots([...dots, { x: Math.round(svgPt.x * 10) / 10, y: Math.round(svgPt.y * 10) / 10 }])
  }, [dots, setDots])

  const handleDotClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setDots(dots.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Mapa de faltas</h4>
        <div className="flex gap-1 rounded-lg bg-muted p-0.5">
          <button
            onClick={() => setMode('cometidas')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === 'cometidas' ? 'bg-red-500 text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cometidas ({cometidas.length})
          </button>
          <button
            onClick={() => setMode('recibidas')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === 'recibidas' ? 'bg-blue-500 text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Recibidas ({recibidas.length})
          </button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Click en el campo para colocar una falta. Click en un punto para eliminarlo.
      </p>
      <div className="relative rounded-xl overflow-hidden border border-border">
        <svg
          viewBox="0 0 150 100"
          className="w-full cursor-crosshair"
          onClick={handleClick}
        >
          {/* Pitch background */}
          <rect x="0" y="0" width="150" height="100" fill="#2D5016" />
          {/* Grass stripes */}
          {[0, 20, 40, 60, 80, 100, 120, 140].map((x) => (
            <rect key={x} x={x} y="0" width="10" height="100" fill="#3D6B1E" opacity={0.3} />
          ))}
          {/* Field outline */}
          <rect x="5" y="5" width="140" height="90" fill="none" stroke="white" strokeWidth="0.5" opacity={0.4} />
          {/* Center line */}
          <line x1="75" y1="5" x2="75" y2="95" stroke="white" strokeWidth="0.4" opacity={0.3} />
          {/* Center circle */}
          <circle cx="75" cy="50" r="10" fill="none" stroke="white" strokeWidth="0.4" opacity={0.3} />
          {/* Left penalty area */}
          <rect x="5" y="20" width="18" height="60" fill="none" stroke="white" strokeWidth="0.4" opacity={0.3} />
          {/* Right penalty area */}
          <rect x="127" y="20" width="18" height="60" fill="none" stroke="white" strokeWidth="0.4" opacity={0.3} />
          {/* Left goal area */}
          <rect x="5" y="32" width="8" height="36" fill="none" stroke="white" strokeWidth="0.3" opacity={0.25} />
          {/* Right goal area */}
          <rect x="137" y="32" width="8" height="36" fill="none" stroke="white" strokeWidth="0.3" opacity={0.25} />
          {/* Left goal */}
          <rect x="2" y="38" width="3" height="24" fill="white" opacity={0.1} />
          {/* Right goal */}
          <rect x="145" y="38" width="3" height="24" fill="white" opacity={0.1} />
          {/* Penalty spots */}
          <circle cx="17" cy="50" r="0.6" fill="white" opacity={0.3} />
          <circle cx="133" cy="50" r="0.6" fill="white" opacity={0.3} />
          {/* Center spot */}
          <circle cx="75" cy="50" r="0.6" fill="white" opacity={0.3} />
          {/* Corner arcs */}
          <path d="M 5 8 A 3 3 0 0 1 8 5" fill="none" stroke="white" strokeWidth="0.3" opacity={0.25} />
          <path d="M 142 5 A 3 3 0 0 1 145 8" fill="none" stroke="white" strokeWidth="0.3" opacity={0.25} />
          <path d="M 8 95 A 3 3 0 0 1 5 92" fill="none" stroke="white" strokeWidth="0.3" opacity={0.25} />
          <path d="M 145 92 A 3 3 0 0 1 142 95" fill="none" stroke="white" strokeWidth="0.3" opacity={0.25} />

          {/* Other mode dots (dimmed) */}
          {otherDots.map((dot, i) => (
            <circle
              key={`other-${i}`}
              cx={dot.x}
              cy={dot.y}
              r="1.5"
              fill={otherColor}
              opacity={0.2}
              className="pointer-events-none"
            />
          ))}

          {/* Active dots */}
          {dots.map((dot, i) => (
            <g key={i} onClick={(e) => handleDotClick(i, e)} className="cursor-pointer">
              <circle cx={dot.x} cy={dot.y} r="3" fill={dotColor} opacity={0.15} />
              <circle cx={dot.x} cy={dot.y} r="1.8" fill={dotColor} opacity={0.85} />
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
