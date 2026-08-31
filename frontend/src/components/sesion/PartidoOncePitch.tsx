'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formacionSlotKeys, getFormacionLayout, SISTEMAS_11 } from '@/lib/formaciones11'
import { canonicalPosicion, posicionMeta, posicionZonaClasses } from '@/lib/api/jugadores'
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

function sortByLabel(a: PartidoJugador, b: PartidoJugador) {
  return playerLabel(a).localeCompare(playerLabel(b), 'es')
}

function groupPlayersForSlot(
  jugadores: PartidoJugador[],
  slotLabel: string,
  selectedId: string,
  takenIds: Set<string>
) {
  const available = jugadores.filter((j) => j.id === selectedId || !takenIds.has(j.id))
  const slotPos = canonicalPosicion(slotLabel)
  const slotZona = posicionMeta(slotLabel)?.zona
  const matching: PartidoJugador[] = []
  const related: PartidoJugador[] = []
  const others: PartidoJugador[] = []

  for (const j of available) {
    const pos = canonicalPosicion(j.posicion_principal)
    if (slotPos && pos === slotPos) matching.push(j)
    else if (slotZona && posicionMeta(j.posicion_principal)?.zona === slotZona) related.push(j)
    else others.push(j)
  }

  matching.sort(sortByLabel)
  related.sort(sortByLabel)
  others.sort(sortByLabel)
  return { matching, related, others }
}

interface SlotPlayerSelectProps {
  slotLabel: string
  selectedId: string
  jugadores: PartidoJugador[]
  takenIds: Set<string>
  isPeto: boolean
  open: boolean
  onToggle: () => void
  onClose: () => void
  onSelect: (jugadorId: string) => void
}

function SlotPlayerSelect({
  slotLabel,
  selectedId,
  jugadores,
  takenIds,
  isPeto,
  open,
  onToggle,
  onClose,
  onSelect,
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
    <div ref={rootRef} className="relative w-full">
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
      {open && (
        <div
          role="listbox"
          className="absolute z-40 left-1/2 -translate-x-1/2 top-full mt-1 w-[220px] max-h-[240px] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg"
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
  players: PartidoJugador[]
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
