'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, User } from 'lucide-react'

interface PlayerQuickAssignProps {
  jugadores: Array<{ id: string; nombre: string; apellidos: string; dorsal?: number }>
  onSelect: (jugadorId: string) => void
  onSkip: () => void
}

export function PlayerQuickAssign({ jugadores, onSelect, onSkip }: PlayerQuickAssignProps) {
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = jugadores.filter((j) => {
    if (!search) return true
    const q = search.toLowerCase()
    const fullName = `${j.nombre} ${j.apellidos}`.toLowerCase()
    // Match by dorsal number or name
    if (j.dorsal && j.dorsal.toString().startsWith(q)) return true
    return fullName.includes(q)
  })

  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="px-2 py-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5 px-1.5 py-1 bg-white/5 rounded text-xs">
          <Search className="h-3 w-3 text-white/30 shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dorsal o nombre..."
            className="bg-transparent text-white/80 placeholder:text-white/30 outline-none w-full text-[11px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length === 1) {
                onSelect(filtered[0].id)
              }
            }}
          />
        </div>
      </div>

      {/* Player list */}
      <div className="max-h-36 overflow-y-auto p-1">
        {filtered.slice(0, 15).map((j) => (
          <button
            key={j.id}
            className="flex items-center gap-2 w-full px-2 py-1 rounded text-[11px] text-white/70 hover:bg-white/10 transition-colors"
            onClick={() => onSelect(j.id)}
          >
            {j.dorsal !== undefined && j.dorsal !== null ? (
              <span className="w-5 text-right text-white/40 font-mono text-[10px]">{j.dorsal}</span>
            ) : (
              <User className="h-3 w-3 text-white/30" />
            )}
            <span className="truncate">{j.nombre} {j.apellidos}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-[10px] text-white/30 text-center py-2">Sin resultados</p>
        )}
      </div>

      {/* Skip */}
      <button
        className="px-2 py-1.5 border-t border-white/10 text-[10px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
        onClick={onSkip}
      >
        Sin jugador →
      </button>
    </div>
  )
}
