'use client'

import { Clock, Users, Play, GitBranch, Plus } from 'lucide-react'
import { TacticalBoardMini, boardHasAnimation } from '@/components/task-preview'
import {
  METODOLOGIAS_TAREA,
  FASES_JUEGO,
  nombreTipoVariante,
  nombreSubfase,
  nombreObjetivoTactico,
  nombreObjetivoTecnico,
  nombreOrientacionFisica,
} from '@/lib/catalogos/canonico'
import { cn } from '@/lib/utils'
import type { Tarea } from '@/types'

function faseLabel(codigo?: string) {
  if (!codigo) return null
  return FASES_JUEGO.find((f) => f.codigo === codigo)?.nombre || codigo.replace(/_/g, ' ')
}

function metodologiaLabel(codigo?: string) {
  if (!codigo) return null
  return METODOLOGIAS_TAREA.find((m) => m.codigo === codigo)?.nombre || codigo
}

function variantesLabel(n: number) {
  if (n === 1) return '1 variante creada'
  return `${n} variantes creadas`
}

export interface TaskLibraryCardProps {
  tarea: Tarea
  selected?: boolean
  onClick?: () => void
  onSelect?: () => void
  selectLabel?: string
  compact?: boolean
  className?: string
  /** Ver pestaña variantes de la ficha */
  onViewVariantes?: () => void
  /** Abrir diálogo crear variante */
  onCreateVariante?: () => void
}

export function TaskLibraryCard({
  tarea,
  selected,
  onClick,
  onSelect,
  selectLabel = 'Añadir',
  compact = false,
  className,
  onViewVariantes,
  onCreateVariante,
}: TaskLibraryCardProps) {
  const hasAnim = boardHasAnimation(tarea.grafico_data as any)
  const fase = faseLabel(tarea.fase_juego)
  const metodologia = metodologiaLabel(tarea.modalidad)
  const subfase = nombreSubfase(tarea.fase_juego, tarea.principio_tactico)
  const orientacion = (tarea.orientaciones_fisicas || [])[0]
  const objTac = (tarea.objetivos_tacticos || [])[0]
  const objTec = (tarea.objetivos_tecnicos || [])[0]
  const esVariante = !!tarea.tarea_origen_id
  const nVar = tarea.num_variantes ?? 0
  const showFamilia = !esVariante && (onViewVariantes || onCreateVariante)

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
        {esVariante ? (
          <span className="absolute top-2 right-2 rounded-md bg-violet-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            {nombreTipoVariante(tarea.tipo_variante)}
          </span>
        ) : nVar > 0 ? (
          <span className="absolute top-2 right-2 rounded-md bg-sky-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            Madre · {nVar}
          </span>
        ) : null}
      </div>

      <div className={cn('space-y-2', compact ? 'p-3' : 'p-4')}>
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              'font-semibold text-foreground leading-snug',
              compact ? 'text-sm line-clamp-2' : 'text-base line-clamp-2'
            )}
          >
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

        {(tarea.desarrollo || tarea.descripcion) && !compact && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {tarea.desarrollo || tarea.descripcion}
          </p>
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
          {metodologia && (
            <span className="rounded-md bg-sky-50 px-1.5 py-0.5 font-medium text-sky-800">
              {metodologia}
            </span>
          )}
          {fase && (
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-800 line-clamp-1">
              {fase}
              {subfase ? ` · ${subfase}` : ''}
            </span>
          )}
          {orientacion && (
            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800">
              {nombreOrientacionFisica(orientacion)}
            </span>
          )}
        </div>

        {!compact && (objTac || objTec) && (
          <div className="pt-1 border-t border-border/60 space-y-1">
            {objTac && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                <span className="font-medium text-foreground/80">Táctico:</span>{' '}
                {nombreObjetivoTactico(objTac)}
                {(tarea.objetivos_tacticos?.length || 0) > 1
                  ? ` +${(tarea.objetivos_tacticos!.length - 1)}`
                  : ''}
              </p>
            )}
            {objTec && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                <span className="font-medium text-foreground/80">Técnico:</span>{' '}
                {nombreObjetivoTecnico(objTec)}
                {(tarea.objetivos_tecnicos?.length || 0) > 1
                  ? ` +${(tarea.objetivos_tecnicos!.length - 1)}`
                  : ''}
              </p>
            )}
          </div>
        )}

        {showFamilia && (
          <div
            className={cn(
              'border-t border-border/60 flex flex-wrap gap-2',
              compact ? 'pt-1.5' : 'pt-2'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {nVar > 0 && onViewVariantes ? (
              <button
                type="button"
                onClick={onViewVariantes}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
              >
                <GitBranch className="h-3.5 w-3.5" />
                {compact ? `${nVar} var.` : `Tiene ${variantesLabel(nVar)}`}
              </button>
            ) : null}
            {onCreateVariante && (
              <button
                type="button"
                onClick={onCreateVariante}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" />
                {compact ? 'Variante' : 'Crear variante'}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
