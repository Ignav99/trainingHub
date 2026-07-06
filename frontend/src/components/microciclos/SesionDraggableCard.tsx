'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { GripVertical, Clock, ListChecks } from 'lucide-react'
import { MATCH_DAY_COLORS } from './SessionCard'
import type { SesionTimeline } from '@/types'

interface SesionDraggableCardProps {
  session: SesionTimeline
}

/**
 * Tarjeta de sesión arrastrable con soporte para sortable (vertical dentro del día)
 * y draggable (entre días) gracias a useSortable de @dnd-kit/sortable.
 *
 * Accesibilidad:
 * - Drag handle con aria-label y role="button"
 * - Keyboard: Enter/Space para iniciar drag (dnd-kit lo maneja nativamente)
 * - tabIndex en el handle para navegación por teclado
 */
export function SesionDraggableCard({ session }: SesionDraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: `sesion-${session.id}`,
    data: {
      type: 'sesion',
      session,
    },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
  }

  const mdColors = session.match_day ? MATCH_DAY_COLORS[session.match_day] : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card hover:shadow-md transition-shadow group ${
        isDragging ? 'opacity-40 shadow-lg ring-2 ring-primary/30' : ''
      } ${isOver ? 'ring-2 ring-primary/30 bg-primary/5' : ''} ${
        mdColors ? `border-l-4 ${mdColors.border}` : 'border-l-4 border-l-transparent'
      }`}
    >
      <div className="p-2.5">
        {/* Top row: match day + drag handle */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            {session.match_day && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                mdColors ? `${mdColors.bg} ${mdColors.text}` : 'bg-gray-100 text-gray-600'
              }`}>
                {session.match_day}
              </span>
            )}
            {session.estado === 'completada' && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Completada" />
            )}
            {session.estado === 'borrador' && (
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" title="Borrador" />
            )}
          </div>

          {/* Drag handle — accesible por teclado, evita navegación al hacer click */}
          <button
            {...listeners}
            {...attributes}
            type="button"
            aria-label={`Arrastrar sesión "${session.titulo}" para reordenar`}
            aria-roledescription="botón de arrastre"
            tabIndex={0}
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary cursor-grab active:cursor-grabbing touch-manipulation"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onKeyDown={(e) => {
              // Allow Enter/Space to activate drag via dnd-kit
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            title="Arrastrar para reordenar"
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Title — clickable link to session detail */}
        <Link
          href={`/sesiones/${session.id}`}
          className="block"
          tabIndex={isDragging ? -1 : 0}
          aria-label={`Ver sesión: ${session.titulo}`}
        >
          <p className="text-xs font-semibold leading-tight truncate hover:text-primary transition-colors">
            {session.titulo}
          </p>
        </Link>

        {/* Bottom row: meta */}
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
          {session.duracion_total && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {session.duracion_total}&apos;
            </span>
          )}
          {session.num_tareas > 0 && (
            <span className="flex items-center gap-0.5">
              <ListChecks className="h-3 w-3" aria-hidden="true" />
              {session.num_tareas}
            </span>
          )}
          {session.intensidad_objetivo && (
            <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${
              session.intensidad_objetivo === 'alta' ? 'bg-red-100 text-red-700' :
              session.intensidad_objetivo === 'media' ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>
              {session.intensidad_objetivo}
            </span>
          )}
          {session.fase_juego_principal && (
            <span className="text-[9px] text-muted-foreground truncate max-w-[60px]">
              {session.fase_juego_principal.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
