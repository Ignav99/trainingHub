'use client'

import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { canonicalPosicion, posicionZonaClasses } from '@/lib/posiciones'
import { groupPlayersForSlot, playerLabel, type SlotPlayer } from '@/lib/slotPlayerGroups'
import { cn } from '@/lib/utils'

interface SlotPlayerSelectProps {
  slotLabel: string
  selectedId: string
  jugadores: SlotPlayer[]
  takenIds: Set<string>
  open: boolean
  onToggle: () => void
  onClose: () => void
  onSelect: (jugadorId: string) => void
  isPeto?: boolean
  dropUp?: boolean
  /** Compact overlay trigger (pitch dots). Default is the session select. */
  trigger?: ReactNode
}

export function SlotPlayerSelect({
  slotLabel,
  selectedId,
  jugadores,
  takenIds,
  open,
  onToggle,
  onClose,
  onSelect,
  isPeto = false,
  dropUp = false,
  trigger,
}: SlotPlayerSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = jugadores.find((j) => j.id === selectedId)
  const groups = useMemo(
    () => groupPlayersForSlot(jugadores, slotLabel, selectedId, takenIds),
    [jugadores, slotLabel, selectedId, takenIds]
  )

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const pick = (id: string) => {
    onSelect(id)
    onClose()
  }

  return (
    <div ref={rootRef} className={cn('relative', trigger ? 'w-auto' : 'w-full')}>
      {trigger ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={selected ? `Cambiar ${slotLabel}` : `Elegir ${slotLabel}`}
          className="flex flex-col items-center gap-0.5 focus:outline-none"
        >
          {trigger}
        </button>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            'w-full rounded px-1 py-0.5 border text-left flex items-center gap-0.5 min-h-[22px] focus:outline-none focus:ring-1',
            isPeto
              ? 'bg-amber-400/90 border-amber-200 text-amber-950 focus:ring-amber-200'
              : 'bg-white/90 border-white/40 text-slate-900 focus:ring-white/50'
          )}
        >
          <span className="min-w-0 flex-1 truncate text-[10px] leading-tight">
            {selected ? playerLabel(selected) : '—'}
          </span>
          {selected?.posicion_principal ? (
            <span
              className={cn(
                'shrink-0 rounded px-0.5 text-[8px] font-bold leading-4',
                posicionZonaClasses(selected.posicion_principal)
              )}
            >
              {canonicalPosicion(selected.posicion_principal)}
            </span>
          ) : null}
          <ChevronDown className="h-2.5 w-2.5 shrink-0 opacity-60" />
        </button>
      )}
      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 left-1/2 -translate-x-1/2 w-[220px] max-h-[240px] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg',
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          <button
            type="button"
            role="option"
            onClick={() => pick('')}
            className="w-full px-2 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-muted"
          >
            — Sin asignar
          </button>
          <OptionGroup
            title={slotLabel}
            hint="esta posición"
            players={groups.matching}
            selectedId={selectedId}
            onPick={pick}
          />
          <OptionGroup
            title="Misma línea"
            players={groups.related}
            selectedId={selectedId}
            onPick={pick}
          />
          <OptionGroup
            title="Otros"
            players={groups.others}
            selectedId={selectedId}
            onPick={pick}
          />
        </div>
      )}
    </div>
  )
}

function OptionGroup({
  title,
  hint,
  players,
  selectedId,
  onPick,
}: {
  title: string
  hint?: string
  players: SlotPlayer[]
  selectedId: string
  onPick: (id: string) => void
}) {
  if (players.length === 0) return null
  return (
    <div className="border-t">
      <p className="px-2 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
        {hint ? <span className="normal-case font-normal tracking-normal"> · {hint}</span> : null}
      </p>
      {players.map((j) => {
        const pos = canonicalPosicion(j.posicion_principal)
        const active = j.id === selectedId
        return (
          <button
            key={j.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onPick(j.id)}
            className={cn(
              'flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[11px] hover:bg-muted',
              active && 'bg-muted'
            )}
          >
            <span className="min-w-0 flex-1 truncate font-medium">{playerLabel(j)}</span>
            {pos ? (
              <span
                className={cn(
                  'shrink-0 rounded px-1 py-px text-[9px] font-bold tabular-nums',
                  posicionZonaClasses(j.posicion_principal)
                )}
              >
                {pos}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
