'use client'

/**
 * Panel de métricas del espacio dibujado en la pizarra.
 *
 * Traduce la zona marcada como espacio de juego a metros reales, calcula
 * m²/jugador y de ahí deriva densidad, tipo de esfuerzo y la condicionalidad
 * física dominante. Con un clic vuelca todo eso sobre la tarea.
 */

import React, { useState } from 'react'
import { Ruler, ChevronDown, ChevronUp, Wand2, Dumbbell, Check, Minus } from 'lucide-react'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import {
  boardSpaceSummary,
  classifySpace,
  summaryToTareaPatch,
  type TareaEspacioPatch,
} from '@/lib/tacticalMetrics'
import { CATEGORIAS_TAREA, TIPOS_ESFUERZO } from '@/lib/catalogos/canonico'

interface GeometryPanelProps {
  /** Jugadores de la tarea, usados si aún no hay monigotes en la pizarra */
  numJugadores?: number
  onApplyEspacio?: (patch: TareaEspacioPatch) => void
}

const nombreCategoria = (codigo: string) =>
  CATEGORIAS_TAREA.find((c) => c.codigo === codigo)?.nombre || codigo

const nombreEsfuerzo = (codigo: string) =>
  TIPOS_ESFUERZO.find((t) => t.codigo === codigo)?.nombre || codigo

export default function GeometryPanel({ numJugadores, onApplyEspacio }: GeometryPanelProps) {
  const zones = useTacticalBoardStore((s) => s.zones)
  const elements = useTacticalBoardStore((s) => s.elements)
  const [open, setOpen] = useState(true)
  const [applied, setApplied] = useState(false)

  const base = boardSpaceSummary(zones, elements)
  // Si aún no hay jugadores dibujados se usan los de la tarea
  const jugadores = base.jugadores > 0 ? base.jugadores : (numJugadores || 0)
  const clasificacion = base.geometria
    ? classifySpace(base.geometria.areaM2, jugadores, { conPorteros: base.porteros > 0 })
    : null
  const summary = { ...base, jugadores, clasificacion }

  if (!base.geometria) {
    return (
      <div className="absolute bottom-2 left-2 z-40 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 px-3 py-2 max-w-[230px]">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
          <Ruler className="h-3.5 w-3.5 text-blue-600" />
          Medidas del espacio
        </div>
        <p className="text-[10px] text-gray-500 mt-1 leading-snug">
          Dibuja una zona con la herramienta <strong>Zona</strong> y aquí verás sus metros,
          los m²/jugador y la condicionalidad física de la tarea.
        </p>
      </div>
    )
  }

  const geo = base.geometria
  const handleApply = () => {
    const patch = summaryToTareaPatch(summary)
    if (patch && onApplyEspacio) {
      onApplyEspacio(patch)
      setApplied(true)
      setTimeout(() => setApplied(false), 2200)
    }
  }

  return (
    <div className="absolute bottom-2 left-2 z-40 w-[248px] bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
          <Ruler className="h-3.5 w-3.5 text-blue-600" />
          {geo.anchoX} × {geo.altoY} m · {geo.areaM2} m²
        </span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronUp className="h-3.5 w-3.5 text-gray-400" />}
      </button>

      {open && (
        <div className="px-3 py-2.5 space-y-2.5">
          {/* Métricas base */}
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Superficie" value={`${geo.areaM2} m²`} />
            <Metric label="Jugadores" value={jugadores > 0 ? String(jugadores) : '—'} />
            <Metric label="Forma" value={geo.forma === 'circular' ? 'Circular' : geo.forma === 'cuadrado' ? 'Cuadrado' : 'Rectangular'} />
            <Metric
              label="m² / jugador"
              value={clasificacion ? `${clasificacion.m2PorJugador}` : '—'}
              accent={clasificacion?.color}
            />
          </div>

          {!clasificacion && (
            <p className="text-[10px] text-gray-500 leading-snug">
              Coloca jugadores en la pizarra (o indica el número en la tarea) para calcular
              la densidad y la condicionalidad.
            </p>
          )}

          {clasificacion && (
            <>
              {/* Franja espacial */}
              <div
                className="rounded-lg px-2 py-1.5"
                style={{ backgroundColor: `${clasificacion.color}1A`, border: `1px solid ${clasificacion.color}55` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold" style={{ color: clasificacion.color }}>
                    Espacio {clasificacion.etiqueta.toLowerCase()}
                  </span>
                  <span className="text-[9px] font-medium text-gray-500 uppercase">
                    Densidad {clasificacion.densidad}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 leading-snug mt-1">
                  {clasificacion.condicionalDominante}
                </p>
              </div>

              {/* Capacidad condicional dominante */}
              <div
                className="rounded-lg px-2 py-1.5"
                style={{ backgroundColor: `${clasificacion.capacidad.color}14`, border: `1px solid ${clasificacion.capacidad.color}55` }}
              >
                <div className="flex items-center gap-1.5">
                  <Dumbbell className="h-3 w-3" style={{ color: clasificacion.capacidad.color }} />
                  <span className="text-[11px] font-bold" style={{ color: clasificacion.capacidad.color }}>
                    {clasificacion.capacidad.nombre}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 leading-snug mt-1">
                  {clasificacion.capacidad.detalle}
                </p>
              </div>

              {/* Demandas de partido que se replican con este espacio */}
              <div>
                <div className="text-[9px] font-medium text-gray-400 uppercase mb-1">
                  Replica del partido {clasificacion.conPorteros ? '(con portero)' : '(sin portero)'}
                </div>
                <div className="space-y-0.5">
                  <Demanda ok={clasificacion.demandas.distancia_total} label="Distancia total" />
                  <Demanda ok={clasificacion.demandas.alta_intensidad} label="Alta intensidad" />
                  <Demanda ok={clasificacion.demandas.sprint} label="Sprint" />
                </div>
              </div>

              {/* Derivados */}
              <div className="space-y-1">
                <Row label="Esfuerzo" value={nombreEsfuerzo(clasificacion.tipoEsfuerzo)} />
                <Row label="FC esperada" value={`${clasificacion.fcEsperada[0]}–${clasificacion.fcEsperada[1]} ppm`} />
                <Row
                  label="Tipo de tarea"
                  value={clasificacion.categoriasSugeridas.map(nombreCategoria).join(' · ')}
                />
              </div>

              {onApplyEspacio && (
                <button
                  onClick={handleApply}
                  className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                    applied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {applied ? 'Aplicado a la tarea' : 'Aplicar a la tarea'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-2 py-1.5">
      <div className="text-[9px] font-medium text-gray-400 uppercase leading-none">{label}</div>
      <div className="text-[13px] font-bold mt-0.5" style={{ color: accent || '#111827' }}>{value}</div>
    </div>
  )
}

/** Una demanda del partido: se replica o no con este espacio. */
function Demanda({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`flex h-3 w-3 items-center justify-center rounded-full ${
          ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {ok ? <Check className="h-2 w-2" /> : <Minus className="h-2 w-2" />}
      </span>
      <span className={`text-[10px] ${ok ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{label}</span>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] text-gray-400 uppercase font-medium flex-shrink-0">{label}</span>
      <span className="text-[10px] text-gray-700 font-medium text-right">{value}</span>
    </div>
  )
}
