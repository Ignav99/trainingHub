'use client'

import { useState } from 'react'
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

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setDots([...dots, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }])
  }

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
          viewBox="0 0 100 150"
          className="w-full cursor-crosshair"
          style={{ maxHeight: 360 }}
          onClick={handleClick}
        >
          {/* Pitch background */}
          <rect x="0" y="0" width="100" height="150" fill="#2D5016" />
          {/* Grass stripes */}
          {[0, 20, 40, 60, 80, 100, 120, 140].map((y) => (
            <rect key={y} x="0" y={y} width="100" height="10" fill="#3D6B1E" opacity={0.3} />
          ))}
          {/* Field outline */}
          <rect x="5" y="5" width="90" height="140" fill="none" stroke="white" strokeWidth="0.5" opacity={0.4} />
          {/* Center line */}
          <line x1="5" y1="75" x2="95" y2="75" stroke="white" strokeWidth="0.4" opacity={0.3} />
          {/* Center circle */}
          <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="0.4" opacity={0.3} />
          {/* Top penalty area */}
          <rect x="20" y="5" width="60" height="18" fill="none" stroke="white" strokeWidth="0.4" opacity={0.3} />
          {/* Bottom penalty area */}
          <rect x="20" y="127" width="60" height="18" fill="none" stroke="white" strokeWidth="0.4" opacity={0.3} />
          {/* Top goal */}
          <rect x="38" y="2" width="24" height="3" fill="white" opacity={0.1} />
          {/* Bottom goal */}
          <rect x="38" y="145" width="24" height="3" fill="white" opacity={0.1} />

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
