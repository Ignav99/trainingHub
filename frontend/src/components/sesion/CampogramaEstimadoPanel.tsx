'use client'

import { PartidoOncePitch, type PartidoJugador } from './PartidoOncePitch'
import { playerLabel } from '@/lib/slotPlayerGroups'
import {
  assignSlot,
  changeSistema,
  countByRole,
  slotsAsked,
  suggestEmptySlots,
  type CampogramaEstimado,
} from '@/lib/campogramaEstimado'
import { cn } from '@/lib/utils'

interface CampogramaEstimadoPanelProps {
  value: CampogramaEstimado
  jugadores: PartidoJugador[]
  onChange: (next: CampogramaEstimado) => void
}

export function CampogramaEstimadoPanel({ value, jugadores, onChange }: CampogramaEstimadoPanelProps) {
  const takenIds = new Set(Object.values(value.titulares).filter(Boolean))
  const placed = jugadores.filter((j) => takenIds.has(j.id))
  const bench = jugadores.filter((j) => !takenIds.has(j.id))
  const roster = countByRole(jugadores)
  const asked = slotsAsked(value.sistema)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Once estimado de la sesión</p>
          <p className="text-xs text-muted-foreground">
            Un solo once. Coloca por posición para ver cuántos extremos, centrales o laterales tienes y en qué línea entran.
          </p>
        </div>
        <button
          type="button"
          className="h-8 rounded-md border px-2.5 text-xs font-medium hover:bg-muted"
          onClick={() => onChange(suggestEmptySlots(value, jugadores))}
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
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-3 items-start">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                En convocatoria
              </p>
              <ul className="mt-1.5 space-y-1">
                {roster.map((row) => (
                  <li key={row.id} className="flex items-baseline justify-between gap-2 text-sm">
                    <span>{row.label}</span>
                    <span className="tabular-nums font-semibold">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Pide el {value.sistema}
              </p>
              <ul className="mt-1.5 space-y-1">
                {asked.map((row) => (
                  <li key={row.label} className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                    <span>{row.label}</span>
                    <span className="tabular-nums">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className={cn('text-xs tabular-nums', placed.length === 11 ? 'text-foreground' : 'text-muted-foreground')}>
              {placed.length}/11 colocados
            </p>
          </div>

          <PartidoOncePitch
            title="Campograma estimado"
            bib="sin_peto"
            sistema={value.sistema}
            titulares={value.titulares}
            jugadores={jugadores}
            takenIds={takenIds}
            onSistemaChange={(sistema) => onChange(changeSistema(value, sistema))}
            onSelect={(slot, id) => onChange(assignSlot(value, slot, id))}
          />
        </div>
      )}

      {jugadores.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">
            Fuera del once
            {bench.length > 0 && <span className="ml-1 tabular-nums">({bench.length})</span>}
          </p>
          {bench.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Todos los de sesión están en el once.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {bench.map((j) => (
                <span
                  key={j.id}
                  className="rounded-md border bg-background px-2 py-0.5 text-[11px]"
                >
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
