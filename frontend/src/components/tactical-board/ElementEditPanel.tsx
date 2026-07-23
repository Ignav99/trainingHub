'use client'

import React from 'react'
import { X, Ruler, Target } from 'lucide-react'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import { PLAYER_COLORS, ZONE_COLORS } from './types'
import { ELEMENT_TOOLS, ROTATABLE_ELEMENTS } from './BoardSymbols'
import { ARROW_STYLES, ARROW_TYPE_ORDER } from './arrowPaths'
import { zoneGeometry } from '@/lib/tacticalMetrics'
import type { ArrowType } from '@/components/tarea-editor/types'

const nombreElemento = (type: string) =>
  ELEMENT_TOOLS.find((t) => t.type === type)?.label
  || (type === 'text' ? 'Texto' : type)

export default function ElementEditPanel() {
  const selectedElementId = useTacticalBoardStore((s) => s.selectedElementId)
  const elements = useTacticalBoardStore((s) => s.elements)
  const arrows = useTacticalBoardStore((s) => s.arrows)
  const zones = useTacticalBoardStore((s) => s.zones)
  const setSelectedElementId = useTacticalBoardStore((s) => s.setSelectedElementId)
  const updateElementColor = useTacticalBoardStore((s) => s.updateElementColor)
  const updateElementLabel = useTacticalBoardStore((s) => s.updateElementLabel)
  const updateElementSize = useTacticalBoardStore((s) => s.updateElementSize)
  const updateElementRotation = useTacticalBoardStore((s) => s.updateElementRotation)
  const updateArrowLabel = useTacticalBoardStore((s) => s.updateArrowLabel)
  const updateArrowComment = useTacticalBoardStore((s) => s.updateArrowComment)
  const updateArrowType = useTacticalBoardStore((s) => s.updateArrowType)
  const updateArrowCurvature = useTacticalBoardStore((s) => s.updateArrowCurvature)
  const updateZoneLabel = useTacticalBoardStore((s) => s.updateZoneLabel)
  const updateZoneColor = useTacticalBoardStore((s) => s.updateZoneColor)
  const updateZoneOpacity = useTacticalBoardStore((s) => s.updateZoneOpacity)
  const setZoneSizeMeters = useTacticalBoardStore((s) => s.setZoneSizeMeters)
  const setZoneRotation = useTacticalBoardStore((s) => s.setZoneRotation)
  const setZonePlayingArea = useTacticalBoardStore((s) => s.setZonePlayingArea)
  const deleteSelected = useTacticalBoardStore((s) => s.deleteSelected)

  if (!selectedElementId) return null

  const element = elements.find((el) => el.id === selectedElementId)
  const arrow = arrows.find((ar) => ar.id === selectedElementId)
  const zone = zones.find((z) => z.id === selectedElementId)

  if (!element && !arrow && !zone) return null

  const titulo = element ? nombreElemento(element.type) : arrow ? 'Movimiento' : 'Zona'

  return (
    <div
      className="absolute top-2 right-2 w-60 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden max-h-[calc(100%-1rem)] overflow-y-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 sticky top-0">
        <span className="text-xs font-semibold text-gray-700">{titulo}</span>
        <button onClick={() => setSelectedElementId(null)} className="p-0.5 text-gray-400 hover:text-gray-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Jugadores */}
        {element && ['player', 'opponent', 'player_gk'].includes(element.type) && (
          <>
            <Field label="Etiqueta">
              <input
                type="text"
                value={element.label || ''}
                onChange={(e) => updateElementLabel(element.id, e.target.value)}
                className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none"
                placeholder="Num/Nombre"
              />
            </Field>
            <ColorPicker
              colors={PLAYER_COLORS}
              value={element.color}
              onChange={(c) => updateElementColor(element.id, c)}
            />
          </>
        )}

        {/* Texto */}
        {element && element.type === 'text' && (
          <>
            <Field label="Texto">
              <input
                type="text"
                value={element.label || ''}
                onChange={(e) => updateElementLabel(element.id, e.target.value)}
                className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none"
                placeholder="Escribe aqui..."
              />
            </Field>
            <Field label={`Tamaño: ${element.size || 13}px`}>
              <input
                type="range" min={8} max={40}
                value={element.size || 13}
                onChange={(e) => updateElementSize(element.id, parseInt(e.target.value))}
                className="mt-1 w-full"
              />
            </Field>
            <ColorPicker
              colors={PLAYER_COLORS}
              value={element.color}
              onChange={(c) => updateElementColor(element.id, c)}
            />
          </>
        )}

        {/* Material: color + giro */}
        {element && !['player', 'opponent', 'player_gk', 'text'].includes(element.type) && (
          <>
            <ColorPicker
              colors={PLAYER_COLORS}
              value={element.color}
              onChange={(c) => updateElementColor(element.id, c)}
            />
            {ROTATABLE_ELEMENTS.includes(element.type) && (
              <Field label={`Rotación: ${element.rotation || 0}°`}>
                <input
                  type="range" min={-180} max={180}
                  value={element.rotation || 0}
                  onChange={(e) => updateElementRotation(element.id, parseInt(e.target.value))}
                  className="mt-1 w-full"
                />
              </Field>
            )}
          </>
        )}

        {/* Movimiento */}
        {arrow && (
          <>
            <Field label="Tipo de movimiento">
              <select
                value={arrow.type}
                onChange={(e) => updateArrowType(arrow.id, e.target.value as ArrowType)}
                className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none"
              >
                {ARROW_TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>{ARROW_STYLES[t].label} — {ARROW_STYLES[t].hint}</option>
                ))}
              </select>
            </Field>
            {ARROW_STYLES[arrow.type]?.shape === 'curve' && (
              <Field label={`Curvatura: ${Math.round((arrow.curvature ?? 0.22) * 100)}%`}>
                <input
                  type="range" min={-80} max={80}
                  value={Math.round((arrow.curvature ?? 0.22) * 100)}
                  onChange={(e) => updateArrowCurvature(arrow.id, parseInt(e.target.value) / 100)}
                  className="mt-1 w-full"
                />
              </Field>
            )}
            <Field label="Etiqueta">
              <input
                type="text"
                value={arrow.label || ''}
                onChange={(e) => updateArrowLabel(arrow.id, e.target.value)}
                className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none"
                placeholder="Orden cronologico"
              />
            </Field>
            <Field label="Comentario">
              <textarea
                value={arrow.comment || ''}
                onChange={(e) => updateArrowComment(arrow.id, e.target.value)}
                className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none resize-none"
                placeholder="Nota sobre esta accion..."
                rows={2}
              />
            </Field>
          </>
        )}

        {/* Zona: medidas en metros */}
        {zone && (() => {
          const geo = zoneGeometry(zone)
          const esElipse = zone.shape === 'ellipse'
          return (
            <>
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-2 py-2">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 uppercase mb-1.5">
                  <Ruler className="h-3 w-3" />
                  Medidas reales
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-medium text-gray-500 uppercase block">
                      {esElipse ? 'Diámetro X (m)' : 'Largo (m)'}
                    </label>
                    <input
                      type="number" min={1} max={120} step={0.5}
                      value={geo.anchoX}
                      onChange={(e) => setZoneSizeMeters(zone.id, parseFloat(e.target.value) || 1, geo.altoY)}
                      className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-medium text-gray-500 uppercase block">
                      {esElipse ? 'Diámetro Y (m)' : 'Ancho (m)'}
                    </label>
                    <input
                      type="number" min={1} max={120} step={0.5}
                      value={geo.altoY}
                      onChange={(e) => setZoneSizeMeters(zone.id, geo.anchoX, parseFloat(e.target.value) || 1)}
                      className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-1.5 text-[11px] font-bold text-blue-800">
                  {geo.areaM2} m² · {geo.forma === 'circular' ? 'circular' : geo.forma}
                </div>
              </div>

              <button
                onClick={() => setZonePlayingArea(zone.id)}
                className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  zone.isPlayingArea
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="La zona marcada es la que se usa para calcular m²/jugador y el espacio de la tarea"
              >
                <Target className="h-3.5 w-3.5" />
                {zone.isPlayingArea ? 'Es el espacio de juego' : 'Marcar como espacio de juego'}
              </button>

              <Field label="Etiqueta">
                <input
                  type="text"
                  value={zone.label || ''}
                  onChange={(e) => updateZoneLabel(zone.id, e.target.value)}
                  className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none"
                  placeholder="Nombre zona"
                />
              </Field>
              <ColorPicker
                colors={ZONE_COLORS}
                value={zone.color}
                onChange={(c) => updateZoneColor(zone.id, c)}
              />
              <Field label={`Opacidad: ${Math.round((zone.opacity || 0.3) * 100)}%`}>
                <input
                  type="range" min={5} max={80}
                  value={Math.round((zone.opacity || 0.3) * 100)}
                  onChange={(e) => updateZoneOpacity(zone.id, parseInt(e.target.value) / 100)}
                  className="mt-1 w-full"
                />
              </Field>
              <Field label={`Rotación: ${zone.rotation || 0}°`}>
                <input
                  type="range" min={0} max={180}
                  value={zone.rotation || 0}
                  onChange={(e) => setZoneRotation(zone.id, parseInt(e.target.value))}
                  className="mt-1 w-full"
                />
              </Field>
            </>
          )
        })()}

        <button
          onClick={deleteSelected}
          className="w-full px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-gray-500 uppercase">{label}</label>
      {children}
    </div>
  )
}

function ColorPicker({
  colors, value, onChange,
}: {
  colors: readonly string[]; value?: string; onChange: (c: string) => void
}) {
  return (
    <Field label="Color">
      <div className="flex flex-wrap gap-1 mt-1">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${
              value === c ? 'border-yellow-400 scale-110' : 'border-gray-300'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </Field>
  )
}
