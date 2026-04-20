'use client'

import React from 'react'
import { X } from 'lucide-react'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import { PLAYER_COLORS, ZONE_COLORS } from './types'

export default function ElementEditPanel() {
  const selectedElementId = useTacticalBoardStore((s) => s.selectedElementId)
  const elements = useTacticalBoardStore((s) => s.elements)
  const arrows = useTacticalBoardStore((s) => s.arrows)
  const zones = useTacticalBoardStore((s) => s.zones)
  const setSelectedElementId = useTacticalBoardStore((s) => s.setSelectedElementId)
  const updateElementColor = useTacticalBoardStore((s) => s.updateElementColor)
  const updateElementLabel = useTacticalBoardStore((s) => s.updateElementLabel)
  const updateElementRotation = useTacticalBoardStore((s) => s.updateElementRotation)
  const updateArrowLabel = useTacticalBoardStore((s) => s.updateArrowLabel)
  const updateArrowComment = useTacticalBoardStore((s) => s.updateArrowComment)
  const updateZoneLabel = useTacticalBoardStore((s) => s.updateZoneLabel)
  const updateZoneColor = useTacticalBoardStore((s) => s.updateZoneColor)
  const updateZoneOpacity = useTacticalBoardStore((s) => s.updateZoneOpacity)
  const deleteSelected = useTacticalBoardStore((s) => s.deleteSelected)

  if (!selectedElementId) return null

  const element = elements.find((el) => el.id === selectedElementId)
  const arrow = arrows.find((ar) => ar.id === selectedElementId)
  const zone = zones.find((z) => z.id === selectedElementId)

  if (!element && !arrow && !zone) return null

  return (
    <div
      className="absolute top-2 right-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-700">
          {element ? (element.type === 'text' ? 'Texto' : element.type === 'mini_goal' ? 'Mini Porteria' : element.type === 'player_gk' ? 'Portero' : element.type === 'player' ? 'Jugador' : element.type === 'opponent' ? 'Rival' : element.type) : arrow ? 'Flecha' : 'Zona'}
        </span>
        <button onClick={() => setSelectedElementId(null)} className="p-0.5 text-gray-400 hover:text-gray-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Player/GK/Opponent edit */}
        {element && ['player', 'opponent', 'player_gk'].includes(element.type) && (
          <>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase">Etiqueta</label>
              <input
                type="text"
                value={element.label || ''}
                onChange={(e) => updateElementLabel(element.id, e.target.value)}
                className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none"
                placeholder="Num/Nombre"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase">Color</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {PLAYER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateElementColor(element.id, c)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      element.color === c ? 'border-yellow-400 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Text element edit */}
        {element && element.type === 'text' && (
          <>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase">Texto</label>
              <input
                type="text"
                value={element.label || ''}
                onChange={(e) => updateElementLabel(element.id, e.target.value)}
                className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none"
                placeholder="Escribe aqui..."
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase">Color</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {PLAYER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateElementColor(element.id, c)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      element.color === c ? 'border-yellow-400 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Mini-goal edit */}
        {element && element.type === 'mini_goal' && (
          <div>
            <label className="text-[10px] font-medium text-gray-500 uppercase">Rotacion: {element.rotation || 0}°</label>
            <input
              type="range"
              min={-180}
              max={180}
              value={element.rotation || 0}
              onChange={(e) => updateElementRotation(element.id, parseInt(e.target.value))}
              className="mt-1 w-full"
            />
          </div>
        )}

        {/* Arrow edit */}
        {arrow && (
          <>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase">Etiqueta</label>
              <input
                type="text"
                value={arrow.label || ''}
                onChange={(e) => updateArrowLabel(arrow.id, e.target.value)}
                className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none"
                placeholder="Num/Nombre"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase">Comentario</label>
              <textarea
                value={arrow.comment || ''}
                onChange={(e) => updateArrowComment(arrow.id, e.target.value)}
                className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none resize-none"
                placeholder="Nota sobre esta accion..."
                rows={2}
              />
            </div>
          </>
        )}

        {/* Zone edit */}
        {zone && (
          <>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase">Etiqueta</label>
              <input
                type="text"
                value={zone.label || ''}
                onChange={(e) => updateZoneLabel(zone.id, e.target.value)}
                className="mt-0.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none"
                placeholder="Nombre zona"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase">Color</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {ZONE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => updateZoneColor(zone.id, c)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      zone.color === c ? 'border-yellow-400 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase">Opacidad: {Math.round((zone.opacity || 0.3) * 100)}%</label>
              <input
                type="range"
                min={5}
                max={80}
                value={Math.round((zone.opacity || 0.3) * 100)}
                onChange={(e) => updateZoneOpacity(zone.id, parseInt(e.target.value) / 100)}
                className="mt-1 w-full"
              />
            </div>
          </>
        )}

        {/* Delete button */}
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
