'use client'

interface ZonePitchSelectorProps {
  value?: string
  onChange: (zona: string) => void
}

const ZONES = [
  { id: 'izquierda', label: 'Izq', path: 'M 0 0 L 30 0 L 30 100 L 0 100 Z', color: '#3B82F6' },
  { id: 'central', label: 'Centro', path: 'M 30 50 L 70 50 L 70 100 L 30 100 Z', color: '#10B981' },
  { id: 'central_lejana', label: 'Lejos', path: 'M 30 0 L 70 0 L 70 50 L 30 50 Z', color: '#8B5CF6' },
  { id: 'derecha', label: 'Der', path: 'M 70 0 L 100 0 L 100 100 L 70 100 Z', color: '#F59E0B' },
]

export function ZonePitchSelector({ value, onChange }: ZonePitchSelectorProps) {
  return (
    <div className="relative w-[120px] h-[80px] rounded border border-border overflow-hidden bg-emerald-700">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Pitch lines */}
        <rect x="0" y="0" width="100" height="100" fill="none" stroke="white" strokeWidth="1.5" opacity={0.3} />
        <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.8" opacity={0.2} />
        {/* Goal */}
        <rect x="35" y="95" width="30" height="5" fill="white" opacity={0.15} />
        {/* Penalty area */}
        <rect x="15" y="70" width="70" height="30" fill="none" stroke="white" strokeWidth="0.8" opacity={0.25} />

        {/* Clickable zones */}
        {ZONES.map((zone) => (
          <path
            key={zone.id}
            d={zone.path}
            fill={value === zone.id ? zone.color : 'transparent'}
            fillOpacity={value === zone.id ? 0.45 : 0}
            stroke={zone.color}
            strokeWidth={value === zone.id ? 1.5 : 0.5}
            strokeOpacity={value === zone.id ? 0.9 : 0.3}
            className="cursor-pointer hover:fill-opacity-25 transition-all"
            onClick={() => onChange(zone.id)}
          />
        ))}

        {/* Zone labels */}
        {ZONES.map((zone) => {
          const cx = zone.id === 'izquierda' ? 15 : zone.id === 'derecha' ? 85 : 50
          const cy = zone.id === 'central_lejana' ? 25 : zone.id === 'central' ? 75 : 50
          return (
            <text
              key={`label-${zone.id}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="7"
              fontWeight={value === zone.id ? 'bold' : 'normal'}
              opacity={value === zone.id ? 1 : 0.5}
              className="pointer-events-none select-none"
            >
              {zone.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
