'use client'

import React, { useState } from 'react'
import { Clock, Users, Maximize2, Brain, ChevronDown, ChevronUp, Pencil, MessageCircle, Target, AlertTriangle, Package } from 'lucide-react'
import TacticalBoardMini from './TacticalBoardMini'
import type { TareaPizarraData } from '@/components/tactical-board/types'

const FASE_ACCENT: Record<string, { bar: string; badge: string; label: string }> = {
  calentamiento:  { bar: 'bg-green-500',  badge: 'bg-green-100 text-green-800',  label: 'Calentamiento' },
  activacion:     { bar: 'bg-green-500',  badge: 'bg-green-100 text-green-800',  label: 'Activación' },
  desarrollo_1:   { bar: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-800',    label: 'Desarrollo 1' },
  desarrollo_2:   { bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800',label: 'Desarrollo 2' },
  vuelta_calma:   { bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800',label: 'Vuelta a calma' },
}

const DENSIDAD_DOTS: Record<string, { dots: number; color: string; label: string }> = {
  baja:     { dots: 1, color: 'bg-green-500',  label: 'Baja' },
  media:    { dots: 2, color: 'bg-yellow-500', label: 'Media' },
  alta:     { dots: 3, color: 'bg-orange-500', label: 'Alta' },
  'muy alta':{ dots: 4, color: 'bg-red-500',   label: 'Muy alta' },
}

const NIVEL_COG: Record<number, { label: string; color: string }> = {
  1: { label: 'Cog. Bajo',      color: 'text-green-600' },
  2: { label: 'Cog. Medio-Bajo',color: 'text-lime-600' },
  3: { label: 'Cog. Medio',     color: 'text-yellow-600' },
  4: { label: 'Cog. Medio-Alto',color: 'text-orange-600' },
  5: { label: 'Cog. Alto',      color: 'text-red-600' },
}

export interface TaskPreviewCardProps {
  titulo: string
  descripcion?: string
  duracion?: number
  categoria?: string
  fase_sesion?: string
  grafico_data?: TareaPizarraData | null
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

  const accent = fase_sesion ? FASE_ACCENT[fase_sesion] : undefined
  const densityInfo = densidad ? DENSIDAD_DOTS[densidad] : undefined
  const cogInfo = nivel_cognitivo ? NIVEL_COG[nivel_cognitivo] : undefined

  const hasDetails = (reglas?.length ?? 0) > 0
    || (coaching_points?.length ?? 0) > 0
    || (variantes?.length ?? 0) > 0
    || (errores_comunes?.length ?? 0) > 0
    || (consignas_defensivas?.length ?? 0) > 0
    || (material_necesario?.length ?? 0) > 0
    || !!razon || !!principio_tactico

  return (
    <div className={`bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all ${className}`}>
      {/* Top accent bar */}
      {accent && <div className={`h-1 w-full ${accent.bar}`} />}

      {/* Tactical board — hero area */}
      <div
        className="relative w-full bg-[#1a3a0a] cursor-pointer"
        style={{ paddingBottom: '56%' }}
        onClick={onClickBoard}
      >
        <div className="absolute inset-0">
          <TacticalBoardMini
            data={grafico_data}
            width="100%"
            height="100%"
            className="w-full h-full"
            animate
          />
        </div>

        {/* Duration badge */}
        {duracion && (
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {duracion}′
          </div>
        )}

        {/* Phase badge */}
        {accent && (
          <div className={`absolute top-2 right-2 ${accent.badge} text-[10px] font-semibold px-2 py-0.5 rounded-full`}>
            {accent.label}
          </div>
        )}

        {/* Library badge */}
        {tarea_id && (
          <div className="absolute bottom-2 left-2 bg-blue-500/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1">
            <Target className="h-2.5 w-2.5" />
            Biblioteca
          </div>
        )}

        {/* Edit button */}
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-lg transition-colors"
            title="Modificar en chat"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Details section */}
      <div className="p-3">
        {/* Title */}
        <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2">{titulo}</h3>

        {/* Metrics row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
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

        {/* Intensity + cognitive row */}
        <div className="flex items-center gap-3 mb-2">
          {densityInfo && (
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1,2,3,4].map(i => (
                  <div
                    key={i}
                    className={`w-1.5 h-3 rounded-sm ${i <= densityInfo.dots ? densityInfo.color : 'bg-muted'}`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">{densityInfo.label}</span>
            </div>
          )}
          {cogInfo && (
            <span className={`text-[11px] font-medium ${cogInfo.color}`}>
              {cogInfo.label}
            </span>
          )}
          {categoria && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium ml-auto">
              {categoria}
            </span>
          )}
        </div>

        {/* Description — collapsed */}
        {descripcion && !expanded && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{descripcion}</p>
        )}

        {/* Expand toggle */}
        {hasDetails && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full pt-1 border-t"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Menos detalles' : 'Ver detalles'}
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3 bg-muted/20">
          {descripcion && (
            <p className="text-xs text-muted-foreground">{descripcion}</p>
          )}

          {reglas && reglas.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Reglas</h4>
              <div className="space-y-1">
                {reglas.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-primary font-bold shrink-0 mt-0.5">{i + 1}.</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {coaching_points && coaching_points.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Coaching Points
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {coaching_points.map((cp, i) => (
                  <span key={i} className="text-[11px] px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                    {cp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {variantes && variantes.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Variantes</h4>
              <ul className="space-y-1">
                {variantes.map((v, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">→</span> {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errores_comunes && errores_comunes.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                Errores comunes
              </h4>
              <ul className="space-y-1">
                {errores_comunes.map((e, i) => (
                  <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                    <span className="shrink-0">!</span> {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {consignas_defensivas && consignas_defensivas.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Consignas defensivas</h4>
              <ul className="space-y-1">
                {consignas_defensivas.map((c, i) => (
                  <li key={i} className="text-xs text-muted-foreground">- {c}</li>
                ))}
              </ul>
            </div>
          )}

          {material_necesario && material_necesario.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Package className="h-3 w-3" />
                Material
              </h4>
              <div className="flex flex-wrap gap-1">
                {material_necesario.map((m, i) => (
                  <span key={i} className="text-[11px] px-1.5 py-0.5 bg-muted rounded border">{m}</span>
                ))}
              </div>
            </div>
          )}

          {principio_tactico && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Principio táctico:</span> {principio_tactico}
            </div>
          )}

          {razon && (
            <div className="p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground italic border-l-2 border-primary/30">
              {razon}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
