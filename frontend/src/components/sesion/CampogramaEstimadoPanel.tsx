'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { SISTEMAS_11 } from '@/lib/formaciones11'
import { playerLabel } from '@/lib/slotPlayerGroups'
import {
  addToPosicion,
  changeSistema,
  moveInPosicion,
  pitchRows,
  placeAllByPosition,
  placedIds,
  removeFromPosicion,
  type CampogramaEstimado,
} from '@/lib/campogramaEstimado'
import { SlotPlayerSelect } from './SlotPlayerSelect'
import type { PartidoJugador } from './PartidoOncePitch'

interface CampogramaEstimadoPanelProps {
  value: CampogramaEstimado
  jugadores: PartidoJugador[]
  onChange: (next: CampogramaEstimado) => void
}

export function CampogramaEstimadoPanel({ value, jugadores, onChange }: CampogramaEstimadoPanelProps) {
  const [openLabel, setOpenLabel] = useState<string | null>(null)
  const rows = pitchRows(value.sistema)
  const taken = new Set(placedIds(value))
  const byId = new Map(jugadores.map((j) => [j.id, j]))
  const bench = jugadores.filter((j) => !taken.has(j.id))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Campograma estimado</p>
          <p className="text-xs text-muted-foreground">
            Varios jugadores en la misma posición. Así ves si tienes 3 o 4 centrales, 2 o 3 extremos, y en qué orden entran.
          </p>
        </div>
        <button
          type="button"
          className="h-8 rounded-md border px-2.5 text-xs font-medium hover:bg-muted"
          onClick={() => onChange(placeAllByPosition(value, jugadores))}
          disabled={jugadores.length === 0}
        >
          Colocar por posición
        </button>
      </div>

      {jugadores.length === 0 ? (
        <p className="text-xs text-muted-foreground rounded-md border border-dashed px-3 py-2">
          Marca quién está en sesión para armar el campograma.
        </p>
      ) : (
        <div className="max-w-3xl rounded-lg border border-border overflow-visible">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5 bg-muted/40">
            <p className="text-xs font-semibold">Posiciones de la sesión</p>
            <select
              className="h-7 rounded-md border bg-background px-1.5 text-[11px]"
              value={value.sistema}
              onChange={(e) => onChange(changeSistema(value, e.target.value))}
              aria-label="Sistema del campograma"
            >
              {SISTEMAS_11.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div
            className="relative flex flex-col justify-between gap-3 px-3 py-4 min-h-[280px] overflow-visible"
            style={{ background: 'linear-gradient(180deg, #1a6b2e 0%, #155a26 50%, #1a6b2e 100%)' }}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15 -translate-x-px" />
              <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
            </div>
            {rows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="relative z-10 flex justify-center gap-2 flex-wrap"
                style={{ zIndex: openLabel && row.some((s) => s.label === openLabel) ? 30 : 10 }}
              >
                {row.map((station) => {
                  const ids = value.porPosicion[station.label] || []
                  const isLast = rowIndex === rows.length - 1
                  return (
                    <div
                      key={station.label}
                      className="flex w-[148px] flex-col gap-1 rounded-md bg-black/25 px-1.5 py-1.5"
                    >
                      <div className="flex items-baseline justify-between gap-1 px-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                          {station.label}
                        </span>
                        <span className="text-[10px] tabular-nums text-white/70">{ids.length}</span>
                      </div>
                      <ul className="space-y-0.5">
                        {ids.map((id, index) => {
                          const player = byId.get(id)
                          return (
                            <li key={id} className="flex items-center gap-0.5 rounded bg-white/95 pl-1 pr-0.5">
                              <span className="min-w-0 flex-1 truncate text-[10px] leading-4 text-slate-900">
                                {player ? playerLabel(player) : 'Jugador'}
                              </span>
                              <button
                                type="button"
                                className="text-slate-500 hover:text-slate-900 disabled:opacity-30"
                                aria-label={`Subir en ${station.label}`}
                                disabled={index === 0}
                                onClick={() => onChange(moveInPosicion(value, station.label, id, -1))}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                className="text-slate-500 hover:text-slate-900 disabled:opacity-30"
                                aria-label={`Bajar en ${station.label}`}
                                disabled={index === ids.length - 1}
                                onClick={() => onChange(moveInPosicion(value, station.label, id, 1))}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                className="text-slate-500 hover:text-slate-900"
                                aria-label={`Quitar de ${station.label}`}
                                onClick={() => onChange(removeFromPosicion(value, station.label, id))}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                      <SlotPlayerSelect
                        slotLabel={station.label}
                        selectedId=""
                        jugadores={jugadores}
                        takenIds={taken}
                        open={openLabel === station.label}
                        dropUp={isLast}
                        onToggle={() => setOpenLabel((cur) => (cur === station.label ? null : station.label))}
                        onClose={() => setOpenLabel(null)}
                        onSelect={(id) => {
                          if (id) onChange(addToPosicion(value, station.label, id))
                        }}
                        trigger={
                          <span className="block w-full rounded border border-dashed border-white/40 px-1 py-0.5 text-center text-[10px] text-white/80 hover:bg-white/10">
                            + Añadir
                          </span>
                        }
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {jugadores.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">
            Sin colocar
            {bench.length > 0 && <span className="ml-1 tabular-nums">({bench.length})</span>}
          </p>
          {bench.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Todos los de sesión están en una posición.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {bench.map((j) => (
                <span key={j.id} className="rounded-md border bg-background px-2 py-0.5 text-[11px]">
                  {playerLabel(j)}
                  {j.posicion_principal ? (
                    <span className="ml-1 text-muted-foreground">{j.posicion_principal}</span>
                  ) : null}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
