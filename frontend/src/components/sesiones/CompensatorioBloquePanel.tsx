'use client'

import { Plus, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CompensatorioLane, FaseSesion, Jugador, SesionBloque } from '@/types'
import { FASE_LABELS } from '@/lib/sesionEstructura'
import { COMPENSATORIO_FASES, lanesFromBloque } from '@/lib/duracionEfectiva'
import { cn } from '@/lib/utils'

type LanePlayer = Pick<Jugador, 'id' | 'nombre' | 'apellidos' | 'apodo' | 'dorsal'>

const LANE_ACCENT = [
  'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20',
  'border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20',
  'border-sky-200 bg-sky-50/40 dark:border-sky-900/50 dark:bg-sky-950/20',
]

function playerLabel(j: LanePlayer) {
  const name = j.apodo || [j.nombre, j.apellidos].filter(Boolean).join(' ').trim()
  return j.dorsal != null ? `${j.dorsal} ${name}` : name
}

export function CompensatorioBloquePanel({
  bloque,
  jugadores = [],
  onChange,
  onOpenTaskPicker,
  renderLaneTasks,
  laneDurations,
}: {
  bloque: SesionBloque
  jugadores?: LanePlayer[]
  onChange: (compensatorio: NonNullable<SesionBloque['compensatorio']>) => void
  onOpenTaskPicker: (fase: FaseSesion) => void
  renderLaneTasks: (fase: FaseSesion, laneIndex: number) => React.ReactNode
  laneDurations?: number[]
}) {
  const lanes = lanesFromBloque(bloque)
  const byId = new Map(jugadores.map((j) => [String(j.id), j]))

  const patchLane = (index: number, patch: Partial<CompensatorioLane>) => {
    const next = lanes.map((lane, i) => (i === index ? { ...lane, ...patch } : lane))
    onChange({ lanes: next })
  }

  const togglePlayer = (index: number, jugadorId: string) => {
    const id = String(jugadorId)
    const inThis = lanes[index].jugador_ids.includes(id)
    const next = lanes.map((lane, i) => {
      const ids = lane.jugador_ids.filter((x) => x !== id)
      if (i === index && !inThis) ids.push(id)
      return { ...lane, jugador_ids: ids }
    })
    onChange({ lanes: next })
  }

  return (
    <div className="p-3 space-y-3">
      <p className="text-xs text-muted-foreground">
        Tres grupos en paralelo. El reloj de la sesión usa el más largo; cada jugador solo acumula
        la carga de su grupo.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {lanes.map((lane, i) => {
          const fase = COMPENSATORIO_FASES[i]
          const assigned = lane.jugador_ids
            .map((id) => byId.get(String(id)))
            .filter((j): j is LanePlayer => Boolean(j))
          const takenElsewhere = new Set(
            lanes.flatMap((l, li) => (li === i ? [] : l.jugador_ids)),
          )
          return (
            <section
              key={lane.id}
              className={cn('rounded-xl border overflow-hidden flex flex-col min-h-[12rem]', LANE_ACCENT[i])}
            >
              <header className="px-3 py-2 border-b bg-background/70 flex items-center gap-2">
                <input
                  className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-muted-foreground/40 focus:border-primary focus:outline-none min-w-0 flex-1"
                  value={lane.label}
                  onChange={(e) => patchLane(i, { label: e.target.value })}
                  aria-label={`Nombre del grupo ${i + 1}`}
                />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                  {FASE_LABELS[fase]}
                </span>
                {laneDurations?.[i] ? (
                  <span className="text-xs tabular-nums text-muted-foreground">{laneDurations[i]}′</span>
                ) : null}
              </header>

              <div className="px-3 py-2 space-y-2 flex-1">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Users className="h-3 w-3" /> Jugadores
                </div>
                <div className="flex flex-wrap gap-1 min-h-[2rem]">
                  {assigned.length === 0 && (
                    <span className="text-xs text-muted-foreground">Sin asignar</span>
                  )}
                  {assigned.map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => togglePlayer(i, j.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-background border px-2 py-0.5 text-xs hover:border-destructive/50"
                      title="Quitar del grupo"
                    >
                      {playerLabel(j)}
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  ))}
                </div>
                {jugadores.length > 0 && (
                  <select
                    className="w-full h-9 rounded-md border bg-background px-2 text-xs"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) togglePlayer(i, e.target.value)
                    }}
                    aria-label={`Añadir jugador a ${lane.label}`}
                  >
                    <option value="">Añadir jugador…</option>
                    {jugadores
                      .filter((j) => !lane.jugador_ids.includes(String(j.id)))
                      .map((j) => (
                        <option key={j.id} value={j.id}>
                          {playerLabel(j)}
                          {takenElsewhere.has(String(j.id)) ? ' (otro grupo)' : ''}
                        </option>
                      ))}
                  </select>
                )}

                <div className="pt-1 border-t space-y-2">
                  {renderLaneTasks(fase, i)}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => onOpenTaskPicker(fase)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Tarea del grupo
                  </Button>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
