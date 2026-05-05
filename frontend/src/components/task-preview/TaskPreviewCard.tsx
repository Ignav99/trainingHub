'use client'

import React, { useState } from 'react'
import { Clock, Users, Target, Maximize2, Brain, ChevronDown, ChevronUp, Pencil, MessageCircle } from 'lucide-react'
import TacticalBoardMini from './TacticalBoardMini'
import type { DiagramData } from '../tarea-editor/types'

// Phase-session color mapping
const FASE_BORDER_COLORS: Record<string, string> = {
  calentamiento: 'border-l-green-500',
  activacion: 'border-l-green-500',
  desarrollo_1: 'border-l-blue-500',
  desarrollo_2: 'border-l-orange-500',
  vuelta_calma: 'border-l-purple-500',
}

// Density badge styles
const DENSIDAD_STYLES: Record<string, string> = {
  baja: 'bg-green-100 text-green-700',
  media: 'bg-yellow-100 text-yellow-700',
  alta: 'bg-orange-100 text-orange-700',
  'muy alta': 'bg-red-100 text-red-700',
}

// Cognitive level labels
const NIVEL_COG_LABELS: Record<number, string> = {
  1: 'Bajo',
  2: 'Medio-Bajo',
  3: 'Medio',
  4: 'Medio-Alto',
  5: 'Alto',
}

export interface TaskPreviewCardProps {
  titulo: string
  descripcion?: string
  duracion?: number
  categoria?: string
  fase_sesion?: string
  grafico_data?: DiagramData | null
  num_jugadores?: string
  estructura_equipos?: string
  espacio?: string
  densidad?: string
  nivel_cognitivo?: number
  fase_juego?: string
  principio_tactico?: string
  reglas?: string[]
  coaching_points?: string[]
  variantes?: string[]
  razon?: string
  tarea_id?: string
  errores_comunes?: string[]
  consignas_defensivas?: string[]
  material_necesario?: string[]
  // UI
  defaultExpanded?: boolean
  onEdit?: () => void
  onClickBoard?: () => void
  className?: string
}

export default function TaskPreviewCard({
  titulo,
  descripcion,
  duracion,
  categoria,
  fase_sesion,
  grafico_data,
  num_jugadores,
  estructura_equipos,
  espacio,
  densidad,
  nivel_cognitivo,
  fase_juego,
  principio_tactico,
  reglas,
  coaching_points,
  variantes,
  razon,
  tarea_id,
  errores_comunes,
  consignas_defensivas,
  material_necesario,
  defaultExpanded = false,
  onEdit,
  onClickBoard,
  className = '',
}: TaskPreviewCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const borderColor = fase_sesion ? FASE_BORDER_COLORS[fase_sesion] || 'border-l-gray-300' : 'border-l-gray-300'

  return (
    <div className={`bg-card border rounded-lg border-l-4 ${borderColor} overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Main card: horizontal layout */}
      <div className="flex flex-col sm:flex-row">
        {/* Left: Tactical Board */}
        <div
          className="relative sm:w-[40%] w-full shrink-0 cursor-pointer bg-[#1a3a0a]"
          onClick={onClickBoard}
        >
          <div className="aspect-[525/680] sm:aspect-auto sm:h-full">
            <TacticalBoardMini
              data={grafico_data}
              width="100%"
              height="100%"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Duration badge overlay */}
          {duracion && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {duracion}′
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="text-sm font-semibold leading-tight line-clamp-2">{titulo}</h3>
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1 mb-2">
            {categoria && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                {categoria}
              </span>
            )}
            {densidad && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${DENSIDAD_STYLES[densidad] || 'bg-gray-100 text-gray-600'}`}>
                {densidad}
              </span>
            )}
            {nivel_cognitivo && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                Cog: {NIVEL_COG_LABELS[nivel_cognitivo] || nivel_cognitivo}
              </span>
            )}
            {tarea_id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                Biblioteca
              </span>
            )}
          </div>

          {/* Description (2 lines truncated) */}
          {descripcion && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{descripcion}</p>
          )}

          {/* Info grid */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-auto">
            {num_jugadores && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {num_jugadores}
              </span>
            )}
            {espacio && (
              <span className="flex items-center gap-1">
                <Maximize2 className="h-3 w-3" />
                {espacio}
              </span>
            )}
            {estructura_equipos && (
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {estructura_equipos}
              </span>
            )}
            {fase_juego && (
              <span className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                {fase_juego}
              </span>
            )}
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors self-start"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Menos' : 'Mas detalles'}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-muted/20">
          {/* Rules */}
          {reglas && reglas.length > 0 && (
            <div>
              <h4 className="text-[11px] font-medium text-muted-foreground uppercase mb-1">Reglas</h4>
              <div className="space-y-0.5">
                {reglas.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-primary font-bold">{i + 1}.</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coaching points */}
          {coaching_points && coaching_points.length > 0 && (
            <div>
              <h4 className="text-[11px] font-medium text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Coaching Points
              </h4>
              <div className="flex flex-wrap gap-1">
                {coaching_points.map((cp, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded">
                    {cp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Variantes */}
          {variantes && variantes.length > 0 && (
            <div>
              <h4 className="text-[11px] font-medium text-muted-foreground uppercase mb-1">Variantes</h4>
              <ul className="space-y-0.5">
                {variantes.map((v, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary">-</span> {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Errores comunes */}
          {errores_comunes && errores_comunes.length > 0 && (
            <div>
              <h4 className="text-[11px] font-medium text-muted-foreground uppercase mb-1">Errores comunes</h4>
              <ul className="space-y-0.5">
                {errores_comunes.map((e, i) => (
                  <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                    <span>!</span> {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Consignas */}
          {consignas_defensivas && consignas_defensivas.length > 0 && (
            <div>
              <h4 className="text-[11px] font-medium text-muted-foreground uppercase mb-1">Consignas defensivas</h4>
              <ul className="space-y-0.5">
                {consignas_defensivas.map((c, i) => (
                  <li key={i} className="text-xs text-muted-foreground">- {c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Material */}
          {material_necesario && material_necesario.length > 0 && (
            <div>
              <h4 className="text-[11px] font-medium text-muted-foreground uppercase mb-1">Material</h4>
              <div className="flex flex-wrap gap-1">
                {material_necesario.map((m, i) => (
                  <span key={i} className="text-[11px] px-1.5 py-0.5 bg-muted rounded">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Razon / Justification */}
          {razon && (
            <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground italic">
              {razon}
            </div>
          )}

          {/* Principio tactico */}
          {principio_tactico && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Principio:</span> {principio_tactico}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
