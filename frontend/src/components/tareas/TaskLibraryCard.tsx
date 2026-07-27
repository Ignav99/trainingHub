'use client'

import { Clock, Users, Play } from 'lucide-react'
import { TacticalBoardMini, boardHasAnimation } from '@/components/task-preview'
import { MODALIDADES_TAREA, FASES_JUEGO } from '@/lib/catalogos/canonico'
import { cn } from '@/lib/utils'
import type { Tarea } from '@/types'

const DENSITY: Record<string, { bg: string; text: string; label: string }> = {
  alta: { bg: 'bg-red-100', text: 'text-red-700', label: 'Alta' },
  media: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Media' },
  baja: { bg: 'bg-green-100', text: 'text-green-700', label: 'Baja' },
}

function faseLabel(codigo?: string) {
  if (!codigo) return null
  return FASES_JUEGO.find((f) => f.codigo === codigo)?.nombre || codigo.replace(/_/g, ' ')
}

function modalidadLabel(codigo?: string) {
  if (!codigo) return null
  return MODALIDADES_TAREA.find((m) => m.codigo === codigo)?.nombre || codigo
}

export interface TaskLibraryCardProps {
  tarea: Tarea
  selected?: boolean
  onClick?: () => void
  onSelect?: () => void
  selectLabel?: string
  compact?: boolean
  className?: string
}

export function TaskLibraryCard({
  tarea,
  selected,
  onClick,
  onSelect,
  selectLabel = 'Añadir',
  compact = false,
  className,
}: TaskLibraryCardProps) {
  const hasAnim = boardHasAnimation(tarea.grafico_data as any)
  const density = tarea.densidad ? DENSITY[tarea.densidad] : null
  const fase = faseLabel(tarea.fase_juego)
  const modalidad = modalidadLabel(tarea.modalidad)

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-2xl border bg-card transition-all',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Pizarra grande — elemento principal */}
      <div
        className={cn('relative w-full bg-[#1a3a0a]', compact ? 'aspect-[16/10]' : 'aspect-[16/9]')}
      >
        <TacticalBoardMini
          data={tarea.grafico_data as any}
          width="100%"
          height="100%"
          className="absolute inset-0 w-full h-full"
          animate
          autoplay={false}
          showPlayBadge={hasAnim}
        />
        {hasAnim && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
            <Play className="h-3 w-3 fill-current" />
            Animación
          </span>
        )}
        {tarea.categoria && (
          <span className="absolute top-2 left-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
            {tarea.categoria.nombre_corto || tarea.categoria.nombre || tarea.categoria.codigo}
          </span>
        )}
      </div>

      <div className={cn('space-y-2', compact ? 'p-3' : 'p-4')}>
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn('font-semibold text-foreground leading-snug', compact ? 'text-sm line-clamp-2' : 'text-base line-clamp-2')}>
            {tarea.titulo}
          </h3>
          {onSelect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelect()
              }}
              className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {selectLabel}
            </button>
          )}
        </div>

        {tarea.descripcion && !compact && (
          <p className="text-sm text-muted-foreground line-clamp-2">{tarea.descripcion}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {tarea.duracion_total}′
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            {tarea.num_jugadores_min}
            {tarea.num_jugadores_max && tarea.num_jugadores_max !== tarea.num_jugadores_min
              ? `-${tarea.num_jugadores_max}`
              : ''}
          </span>
          {tarea.estructura_equipos && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground/80">
              {tarea.estructura_equipos}
            </span>
          )}
          {density && (
            <span className={cn('rounded-md px-1.5 py-0.5 font-medium', density.bg, density.text)}>
              {density.label}
            </span>
          )}
          {modalidad && (
            <span className="rounded-md bg-sky-50 px-1.5 py-0.5 font-medium text-sky-800">
              {modalidad}
            </span>
          )}
          {fase && (
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-800 line-clamp-1">
              {fase}
            </span>
          )}
        </div>

        {!compact && (tarea.principio_tactico || (tarea.consignas_ofensivas?.length ?? 0) > 0 || (tarea.consignas_defensivas?.length ?? 0) > 0) && (
          <div className="pt-1 border-t border-border/60 space-y-1">
            {tarea.principio_tactico && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                <span className="font-medium text-foreground/80">Principio:</span> {tarea.principio_tactico}
              </p>
            )}
            {(tarea.consignas_ofensivas?.length ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                <span className="font-medium text-foreground/80">Of.:</span>{' '}
                {tarea.consignas_ofensivas!.slice(0, 3).join(' · ')}
              </p>
            )}
            {(tarea.consignas_defensivas?.length ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                <span className="font-medium text-foreground/80">Def.:</span>{' '}
                {tarea.consignas_defensivas!.slice(0, 3).join(' · ')}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
