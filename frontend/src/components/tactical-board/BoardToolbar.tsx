'use client'

import React from 'react'
import {
  Circle, Triangle, Target, Trash2, RotateCcw, MousePointer,
  ArrowRight, Minus, Square, Undo2, Redo2,
} from 'lucide-react'
import { BoardTool, ZONE_COLORS, TEAM_COLORS } from './types'
import { FORMATIONS } from '@/lib/formations'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'

const Sep = () => <div className="w-px h-6 bg-gray-200 mx-0.5" />

function TB({ id, icon, label, color: c, activeTool, onSelect }: {
  id: BoardTool; icon: React.ReactNode; label: string; color?: string
  activeTool: BoardTool; onSelect: (tool: BoardTool) => void
}) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        activeTool === id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      title={label}
    >
      <span style={{ color: activeTool === id ? 'white' : c }}>{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  )
}

interface BoardToolbarProps {
  arrowStart: boolean
  onLoadFormation: (name: string, team: 'home' | 'away') => void
}

export default function BoardToolbar({ arrowStart, onLoadFormation }: BoardToolbarProps) {
  const activeTool = useTacticalBoardStore((s) => s.activeTool)
  const selectedElementId = useTacticalBoardStore((s) => s.selectedElementId)
  const zoneColor = useTacticalBoardStore((s) => s.zoneColor)
  const elements = useTacticalBoardStore((s) => s.elements)
  const arrows = useTacticalBoardStore((s) => s.arrows)
  const zones = useTacticalBoardStore((s) => s.zones)
  const historyIndex = useTacticalBoardStore((s) => s.historyIndex)
  const history = useTacticalBoardStore((s) => s.history)
  const setActiveTool = useTacticalBoardStore((s) => s.setActiveTool)
  const setZoneColor = useTacticalBoardStore((s) => s.setZoneColor)
  const deleteSelected = useTacticalBoardStore((s) => s.deleteSelected)
  const clearDiagram = useTacticalBoardStore((s) => s.clearDiagram)
  const undo = useTacticalBoardStore((s) => s.undo)
  const redo = useTacticalBoardStore((s) => s.redo)

  const isZoneTool = activeTool === 'zone_rect' || activeTool === 'zone_circle'

  const handleSelect = (tool: BoardTool) => {
    setActiveTool(tool)
  }

  return (
    <div className="px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
      <div className="flex flex-wrap items-center gap-1">
        {/* Select */}
        <TB id="select" icon={<MousePointer className="h-4 w-4" />} label="Seleccionar" activeTool={activeTool} onSelect={handleSelect} />

        <Sep />

        {/* Players */}
        <TB id="player" icon={<Circle className="h-4 w-4" />} label="Jugador" color={TEAM_COLORS.team1} activeTool={activeTool} onSelect={handleSelect} />
        <TB id="opponent" icon={<Circle className="h-4 w-4" />} label="Rival" color={TEAM_COLORS.team2} activeTool={activeTool} onSelect={handleSelect} />
        <TB id="player_gk" icon={<Circle className="h-4 w-4" />} label="Portero" color={TEAM_COLORS.goalkeeper} activeTool={activeTool} onSelect={handleSelect} />

        <Sep />

        {/* Objects */}
        <TB id="cone" icon={<Triangle className="h-4 w-4" />} label="Cono" color="#FF6B00" activeTool={activeTool} onSelect={handleSelect} />
        <TB id="ball" icon={<Target className="h-4 w-4" />} label="Balon" activeTool={activeTool} onSelect={handleSelect} />
        <TB id="mini_goal" icon={<Minus className="h-4 w-4 rotate-90" />} label="Mini" activeTool={activeTool} onSelect={handleSelect} />

        <Sep />

        {/* Arrows */}
        <TB id="arrow_movement" icon={<ArrowRight className="h-4 w-4" />} label="Movimiento" color="#FFFF00" activeTool={activeTool} onSelect={handleSelect} />
        <TB id="arrow_pass" icon={<ArrowRight className="h-4 w-4" />} label="Pase" color="#FFFFFF" activeTool={activeTool} onSelect={handleSelect} />

        <Sep />

        {/* Zones */}
        <TB id="zone_rect" icon={<Square className="h-4 w-4" />} label="Zona" color={zoneColor} activeTool={activeTool} onSelect={handleSelect} />
        <TB id="zone_circle" icon={<Circle className="h-4 w-4" />} label="Elipse" color={zoneColor} activeTool={activeTool} onSelect={handleSelect} />

        {/* Zone color picker */}
        {isZoneTool && (
          <div className="flex items-center gap-0.5 ml-1">
            {ZONE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setZoneColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  zoneColor === c ? 'border-yellow-400 scale-110' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        )}

        <Sep />

        {/* Formations */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              onLoadFormation(e.target.value, 'home')
              e.target.value = ''
            }
          }}
          className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
          defaultValue=""
        >
          <option value="" disabled>Formacion Local</option>
          {FORMATIONS.map((f) => (
            <option key={f.name} value={f.name}>{f.name}</option>
          ))}
        </select>
        <select
          onChange={(e) => {
            if (e.target.value) {
              onLoadFormation(e.target.value, 'away')
              e.target.value = ''
            }
          }}
          className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
          defaultValue=""
        >
          <option value="" disabled>Formacion Visitante</option>
          {FORMATIONS.map((f) => (
            <option key={f.name} value={f.name}>{f.name}</option>
          ))}
        </select>

        <Sep />

        {/* Undo / Redo */}
        <button onClick={undo} disabled={historyIndex < 0}
          className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed" title="Deshacer (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={redo} disabled={historyIndex >= history.length - 1}
          className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed" title="Rehacer (Ctrl+Shift+Z)">
          <Redo2 className="h-4 w-4" />
        </button>

        <Sep />

        {/* Delete & Clear */}
        <button onClick={deleteSelected} disabled={!selectedElementId} className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-red-100 disabled:opacity-30" title="Eliminar (Delete)">
          <Trash2 className="h-4 w-4" />
        </button>
        <button onClick={clearDiagram} className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-red-100" title="Limpiar todo">
          <RotateCcw className="h-4 w-4" />
        </button>

        <div className="flex-1" />
        <span className="text-[10px] text-gray-400">{elements.length} elem, {arrows.length} flechas, {zones.length} zonas</span>
      </div>

      {/* Instructions */}
      {activeTool !== 'select' && (
        <div className="text-[11px] text-gray-500 mt-1">
          {activeTool.startsWith('arrow_')
            ? arrowStart
              ? '2. Click en el destino de la flecha'
              : '1. Click en el origen de la flecha'
            : isZoneTool
              ? 'Click y arrastra para dibujar la zona'
              : `Click en el campo para colocar: ${activeTool === 'mini_goal' ? 'Mini porteria' : activeTool}`}
        </div>
      )}
    </div>
  )
}
