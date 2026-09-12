'use client'

import { useState } from 'react'
import { formacionSlotKeys, getFormacionLayout, SISTEMAS_11 } from '@/lib/formaciones11'
import { playerLabel, type SlotPlayer } from '@/lib/slotPlayerGroups'
import { cn } from '@/lib/utils'
import { SlotPlayerSelect } from './SlotPlayerSelect'

export type PartidoJugador = SlotPlayer
export { playerLabel }

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
  const [openSlot, setOpenSlot] = useState<string | null>(null)

  return (
    <div className="min-w-0 rounded-lg border border-border">
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-1.5 border-b rounded-t-lg',
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
        className="relative px-2 py-3 min-h-[220px] flex flex-col justify-between rounded-b-lg overflow-visible"
        style={{ background: 'linear-gradient(180deg, #1a6b2e 0%, #155a26 50%, #1a6b2e 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none rounded-b-lg overflow-hidden">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15 -translate-x-px" />
          <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
        </div>
        {layout.rows.map((row, i) => (
          <div
            key={i}
            className={cn(
              'relative flex justify-center gap-1.5 flex-wrap',
              row.some((s) => openSlot === s.slotKey) ? 'z-20' : 'z-10'
            )}
          >
            {row.map((slot) => {
              const selected = titulares[slot.slotKey] || ''
              const isLastRow = i === layout.rows.length - 1
              return (
                <div key={slot.slotKey} className="flex flex-col items-center gap-0.5 min-w-[76px] max-w-[110px]">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/70">
                    {slot.label}
                  </span>
                  <SlotPlayerSelect
                    slotLabel={slot.label}
                    selectedId={selected}
                    jugadores={jugadores}
                    takenIds={takenIds}
                    isPeto={isPeto}
                    dropUp={isLastRow}
                    open={openSlot === slot.slotKey}
                    onToggle={() => setOpenSlot((cur) => (cur === slot.slotKey ? null : slot.slotKey))}
                    onClose={() => setOpenSlot(null)}
                    onSelect={(id) => onSelect(slot.slotKey, id)}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
