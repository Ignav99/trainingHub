'use client'

import { formacionSlotKeys, getFormacionLayout, SISTEMAS_11 } from '@/lib/formaciones11'
import { cn } from '@/lib/utils'

export type PartidoJugador = {
  id: string
  nombre: string
  apellidos: string
  apodo?: string
  dorsal?: number
  posicion_principal?: string
}

export function playerLabel(j: PartidoJugador): string {
  const name = j.apodo || `${j.nombre} ${j.apellidos}`.trim()
  return j.dorsal ? `${j.dorsal}. ${name}` : name
}

interface PartidoOncePitchProps {
  title: string
  bib: 'peto' | 'sin_peto'
  sistema: string
  titulares: Record<string, string>
  jugadores: PartidoJugador[]
  takenIds: Set<string>
  onSistemaChange: (sistema: string) => void
  onSelect: (slotKey: string, jugadorId: string) => void
}

export function PartidoOncePitch({
  title,
  bib,
  sistema,
  titulares,
  jugadores,
  takenIds,
  onSistemaChange,
  onSelect,
}: PartidoOncePitchProps) {
  const layout = getFormacionLayout(sistema)
  const isPeto = bib === 'peto'
  const filled = formacionSlotKeys(sistema).filter((k) => titulares[k]).length

  return (
    <div className="min-w-0 rounded-lg border border-border overflow-hidden">
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-1.5 border-b',
          isPeto ? 'bg-amber-50' : 'bg-sky-50'
        )}
      >
        <div className="min-w-0">
          <p className={cn('text-xs font-semibold', isPeto ? 'text-amber-900' : 'text-sky-900')}>
            {title}
          </p>
          <p className="text-[10px] text-muted-foreground tabular-nums">{filled}/11</p>
        </div>
        <select
          className="h-7 rounded-md border bg-background px-1.5 text-[11px]"
          value={sistema}
          onChange={(e) => onSistemaChange(e.target.value)}
          aria-label={`Sistema ${title}`}
        >
          {SISTEMAS_11.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div
        className="relative px-2 py-3 min-h-[220px] flex flex-col justify-between"
        style={{ background: 'linear-gradient(180deg, #1a6b2e 0%, #155a26 50%, #1a6b2e 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15 -translate-x-px" />
          <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
        </div>
        {layout.rows.map((row, i) => (
          <div key={i} className="relative z-10 flex justify-center gap-1.5 flex-wrap">
            {row.map((slot) => {
              const selected = titulares[slot.slotKey] || ''
              const options = jugadores.filter((j) => j.id === selected || !takenIds.has(j.id))
              return (
                <div key={slot.slotKey} className="flex flex-col items-center gap-0.5 min-w-[68px] max-w-[92px]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/70">
                    {slot.label}
                  </span>
                  <select
                    value={selected}
                    onChange={(e) => onSelect(slot.slotKey, e.target.value)}
                    className={cn(
                      'w-full text-[10px] rounded px-1 py-0.5 border focus:outline-none focus:ring-1',
                      isPeto
                        ? 'bg-amber-400/90 border-amber-200 text-amber-950'
                        : 'bg-white/90 border-white/40 text-slate-900'
                    )}
                  >
                    <option value="">—</option>
                    {options.map((j) => (
                      <option key={j.id} value={j.id}>
                        {playerLabel(j)}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
