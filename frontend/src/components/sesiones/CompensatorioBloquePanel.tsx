'use client'

import { Minus, Plus, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CompensatorioLane, FaseSesion, Jugador, SesionBloque } from '@/types'
import {
  COMPENSATORIO_MAX_LANES,
  COMPENSATORIO_MIN_LANES,
  emptyCompensatorioLane,
  faseForLane,
  lanesFromBloque,
} from '@/lib/duracionEfectiva'
import { cn } from '@/lib/utils'

type LanePlayer = Pick<Jugador, 'id' | 'nombre' | 'apellidos' | 'apodo' | 'dorsal'>

const LANE_ACCENT = [
  'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20',
  'border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20',
  'border-sky-200 bg-sky-50/40 dark:border-sky-900/50 dark:bg-sky-950/20',
  'border-violet-200 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-950/20',
  'border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20',
  'border-teal-200 bg-teal-50/40 dark:border-teal-900/50 dark:bg-teal-950/20',
  'border-orange-200 bg-orange-50/40 dark:border-orange-900/50 dark:bg-orange-950/20',
  'border-lime-200 bg-lime-50/40 dark:border-lime-900/50 dark:bg-lime-950/20',
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
  laneTaskCounts,
}: {
  bloque: SesionBloque
  jugadores?: LanePlayer[]
  onChange: (compensatorio: NonNullable<SesionBloque['compensatorio']>) => void
  onOpenTaskPicker: (fase: FaseSesion) => void
  renderLaneTasks: (fase: FaseSesion, laneIndex: number) => React.ReactNode
  laneDurations?: number[]
  laneTaskCounts?: number[]
}) {
  const lanes = lanesFromBloque(bloque)
  const byId = new Map(jugadores.map((j) => [String(j.id), j]))
  const lastHasTasks = (laneTaskCounts?.[lanes.length - 1] || 0) > 0
  const canRemove = lanes.length > COMPENSATORIO_MIN_LANES && !lastHasTasks
  const canAdd = lanes.length < COMPENSATORIO_MAX_LANES

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

  const addGroup = () => {
    if (!canAdd) return
    onChange({ lanes: [...lanes, emptyCompensatorioLane(lanes.length)] })
  }

  const removeLastGroup = () => {
    if (!canRemove) return
    onChange({ lanes: lanes.slice(0, -1) })
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground min-w-0 flex-1">
          Grupos en paralelo. El reloj de la sesión usa el más largo; cada jugador solo acumula
          la carga de su grupo.
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] tabular-nums text-muted-foreground mr-1">
            {lanes.length} {lanes.length === 1 ? 'grupo' : 'grupos'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={removeLastGroup}
            disabled={!canRemove}
            title={
              lastHasTasks
                ? 'Quita primero la tarea del último grupo'
                : lanes.length <= COMPENSATORIO_MIN_LANES
                  ? 'Mínimo 2 grupos'
                  : 'Quitar último grupo'
            }
            aria-label="Quitar último grupo"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={addGroup}
            disabled={!canAdd}
            title={canAdd ? 'Añadir grupo' : `Máximo ${COMPENSATORIO_MAX_LANES} grupos`}
            aria-label="Añadir grupo"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div
        className="grid grid-cols-1 gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))' }}
      >
        {lanes.map((lane, i) => {
          const fase = faseForLane(i)
          const assigned = lane.jugador_ids
            .map((id) => byId.get(String(id)))
            .filter((j): j is LanePlayer => Boolean(j))
          const takenElsewhere = new Set(
            lanes.flatMap((l, li) => (li === i ? [] : l.jugador_ids)),
          )
          return (
            <section
              key={lane.id}
              className={cn('rounded-xl border overflow-hidden flex flex-col min-h-[12rem]', LANE_ACCENT[i % LANE_ACCENT.length])}
            >
              <header className="px-3 py-2 border-b bg-background/70 flex items-center gap-2">
                <input
                  className="font-semibold text-sm bg-transparent border-b border-transparent hover:border-muted-foreground/40 focus:border-primary focus:outline-none min-w-0 flex-1"
                  value={lane.label}
                  onChange={(e) => patchLane(i, { label: e.target.value })}
                  aria-label={`Nombre del grupo ${i + 1}`}
                />
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
