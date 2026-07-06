'use client'

import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Swords, Plus } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { SesionDraggableCard } from './SesionDraggableCard'
import { MATCH_DAY_COLORS } from './SessionCard'
import type { SesionTimeline, Partido } from '@/types'

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function dateToWeekday(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  return day === 0 ? 6 : day - 1
}

interface DroppableDayProps {
  dateStr: string
  colIndex: number          // 1=Lun ... 7=Dom
  sessions: SesionTimeline[]
  partido: Partido | undefined
  isMatchDay: boolean
}

/**
 * DroppableDay — columna de día en la timeline DnD.
 *
 * Usa useDroppable (core) para recibir drops cross-day y
 * SortableContext (sortable) para reordenación vertical dentro del día.
 *
 * Accesibilidad:
 * - aria-label en el contenedor
 * - role="region" para screen readers
 * - Estados visuales claros para isOver / isToday
 */
export function DroppableDay({ dateStr, colIndex, sessions, partido, isMatchDay }: DroppableDayProps) {
  const { isOver, setNodeRef, active } = useDroppable({
    id: `day-${colIndex}`,
    data: {
      type: 'day',
      colIndex,
      dateStr,
    },
  })

  const weekday = dateToWeekday(dateStr)
  const isToday = dateStr === new Date().toISOString().split('T')[0]

  // Determine dominant match_day
  const dominantMD = isMatchDay ? 'MD' : sessions[0]?.match_day || null
  const mdColors = dominantMD ? MATCH_DAY_COLORS[dominantMD] : null

  // Sort sessions by orden for consistent display
  const sorted = [...sessions].sort((a, b) => (a.orden || 0) - (b.orden || 0))

  // IDs para SortableContext — deben ser únicos y estables
  const sortableIds = sorted.map((s) => `sesion-${s.id}`)

  // Carga total del día (minutos)
  const totalMinutos = sorted.reduce((sum, s) => sum + (s.duracion_total || 0), 0)

  // ¿Hay una sesión activa siendo arrastrada?
  const isActiveDragging = active !== null

  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label={`${DAY_NAMES[weekday]} ${new Date(dateStr + 'T12:00:00').getDate()}, ${sorted.length} sesiones${isMatchDay ? ', día de partido' : ''}`}
      className={`rounded-lg border min-h-[220px] flex flex-col overflow-hidden transition-all duration-200 ${
        isOver ? 'ring-2 ring-primary ring-offset-1 bg-primary/5 scale-[1.02]' : ''
      } ${isToday ? 'ring-2 ring-primary/30' : ''} ${
        mdColors ? `border-t-4 ${mdColors.border}` : 'border-t-4 border-t-transparent'
      }`}
    >
      {/* Day header */}
      <div className={`px-2 py-1.5 border-b text-center ${mdColors ? mdColors.bg : 'bg-muted/30'}`}>
        <p className="text-[10px] font-semibold text-muted-foreground">{DAY_NAMES[weekday]}</p>
        <p className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>
          {new Date(dateStr + 'T12:00:00').getDate()}
        </p>
        {dominantMD && (
          <Badge variant="outline" className={`text-[9px] px-1 py-0 mt-0.5 ${mdColors?.text || ''}`}>
            {dominantMD}
          </Badge>
        )}
      </div>

      {/* Day content — Sortable vertical list */}
      <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
        {/* Match card (no arrastrable) */}
        {isMatchDay && partido && (
          <Link
            href={`/partidos/${partido.id}`}
            className="block p-2 rounded bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
            tabIndex={0}
            aria-label={`Partido: ${partido.localia === 'local' ? 'vs' : '@'} ${partido.rival?.nombre || 'Rival'}${partido.hora ? ` a las ${partido.hora}` : ''}`}
          >
            <div className="flex items-center gap-1">
              <Swords className="h-3 w-3 text-amber-600" aria-hidden="true" />
              <span className="text-[10px] font-bold text-amber-800">PARTIDO</span>
            </div>
            <p className="text-xs font-medium truncate mt-0.5">
              {partido.localia === 'local' ? 'vs' : '@'} {partido.rival?.nombre || 'Rival'}
            </p>
            {partido.hora && <p className="text-[10px] text-amber-700">{partido.hora}h</p>}
          </Link>
        )}

        {/* Sortable session cards */}
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {sorted.map((s) => (
            <SesionDraggableCard key={s.id} session={s} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {!isMatchDay && sorted.length === 0 && (
          <div
            className="flex items-center justify-center h-full min-h-[80px]"
            aria-label="Sin sesiones"
          >
            <span className="text-[10px] text-muted-foreground/30">
              {isOver ? 'Soltar aquí' : '—'}
            </span>
          </div>
        )}

        {/* Drop hint when dragging */}
        {!isMatchDay && sorted.length === 0 && isOver && isActiveDragging && (
          <div className="text-center py-2" aria-hidden="true">
            <Plus className="h-4 w-4 mx-auto text-primary animate-bounce" />
          </div>
        )}
      </div>

      {/* Footer: carga total */}
      {totalMinutos > 0 && (
        <div
          className={`px-2 py-1 border-t text-center ${mdColors ? mdColors.bg : 'bg-muted/20'}`}
          aria-label={`Carga total del día: ${totalMinutos} minutos`}
        >
          <span className="text-[10px] text-muted-foreground">{totalMinutos}&apos; total</span>
        </div>
      )}
    </div>
  )
}
