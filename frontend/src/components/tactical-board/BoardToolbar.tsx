'use client'

import React from 'react'
import {
  Trash2, RotateCcw, MousePointer, Square, Circle as CircleIcon,
  Undo2, Redo2, Type, Copy, ClipboardPaste, Group, Ungroup,
  RotateCw, RotateCcw as RotateLeft, FlipHorizontal, FlipVertical, Download,
} from 'lucide-react'
import { BoardTool, ZONE_COLORS } from './types'
import { FORMATIONS } from '@/lib/formations'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import { ELEMENT_TOOLS, SymbolPreview } from './BoardSymbols'
import { ARROW_STYLES, ARROW_TYPE_ORDER, arrowGeometry, arrowHeadPoints, arrowBarPoints } from './arrowPaths'
import type { ArrowType } from '@/components/tarea-editor/types'

const Sep = () => <div className="w-px h-6 bg-gray-200 mx-0.5" />

function ToolButton({
  active, onClick, title, children, className = '',
}: {
  active?: boolean; onClick: () => void; title: string; children: React.ReactNode; className?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active ? 'bg-blue-600 text-white ring-2 ring-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } ${className}`}
    >
      {children}
    </button>
  )
}

function ActionButton({
  onClick, title, disabled, children, danger = false,
}: {
  onClick: () => void; title: string; disabled?: boolean; children: React.ReactNode; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg bg-gray-100 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed ${
        danger ? 'hover:bg-red-100 hover:text-red-600' : 'hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

/** Miniatura del trazo de cada tipo de movimiento. */
function ArrowPreview({ type }: { type: ArrowType }) {
  const style = ARROW_STYLES[type]
  const from = { x: 2, y: 10 }
  const to = { x: 30, y: 10 }
  const { d, tip, angle } = arrowGeometry({ type, from, to })
  const head = style.strokeWidth * 2.2
  const bar = arrowBarPoints(tip, angle, head * 0.8)

  return (
    <svg width="32" height="20" viewBox="0 0 32 20" style={{ display: 'block' }}>
      <path
        d={d} fill="none" stroke={style.color}
        strokeWidth={style.strokeWidth * 0.85} strokeDasharray={style.dash}
        strokeLinecap="round"
      />
      {style.head === 'arrow' && <polygon points={arrowHeadPoints(tip, angle, head)} fill={style.color} />}
      {style.head === 'double' && (
        <>
          <polygon points={arrowHeadPoints(tip, angle, head)} fill={style.color} />
          <polygon points={arrowHeadPoints({ x: tip.x - head * 0.85, y: tip.y }, angle, head)} fill={style.color} />
        </>
      )}
      {style.head === 'bar' && (
        <line x1={bar.x1} y1={bar.y1} x2={bar.x2} y2={bar.y2} stroke={style.color} strokeWidth={style.strokeWidth} strokeLinecap="round" />
      )}
    </svg>
  )
}

interface BoardToolbarProps {
  arrowStart: boolean
  onLoadFormation: (name: string, team: 'home' | 'away') => void
  /** Muestra el selector de campo dentro de la toolbar (modo embebido, sin barra superior) */
  showPitchSelector?: boolean
  onExport?: () => void
}

export default function BoardToolbar({
  arrowStart,
  onLoadFormation,
  showPitchSelector = false,
  onExport,
}: BoardToolbarProps) {
  const activeTool = useTacticalBoardStore((s) => s.activeTool)
  const selectedElementId = useTacticalBoardStore((s) => s.selectedElementId)
  const selectedElementIds = useTacticalBoardStore((s) => s.selectedElementIds)
  const zoneColor = useTacticalBoardStore((s) => s.zoneColor)
  const elements = useTacticalBoardStore((s) => s.elements)
  const arrows = useTacticalBoardStore((s) => s.arrows)
  const zones = useTacticalBoardStore((s) => s.zones)
  const clipboard = useTacticalBoardStore((s) => s.clipboard)
  const historyIndex = useTacticalBoardStore((s) => s.historyIndex)
  const history = useTacticalBoardStore((s) => s.history)
  const pitchType = useTacticalBoardStore((s) => s.pitchType)

  const setActiveTool = useTacticalBoardStore((s) => s.setActiveTool)
  const setZoneColor = useTacticalBoardStore((s) => s.setZoneColor)
  const setPitchType = useTacticalBoardStore((s) => s.setPitchType)
  const deleteSelected = useTacticalBoardStore((s) => s.deleteSelected)
  const clearDiagram = useTacticalBoardStore((s) => s.clearDiagram)
  const undo = useTacticalBoardStore((s) => s.undo)
  const redo = useTacticalBoardStore((s) => s.redo)
  const copySelected = useTacticalBoardStore((s) => s.copySelected)
  const pasteClipboard = useTacticalBoardStore((s) => s.pasteClipboard)
  const duplicateSelected = useTacticalBoardStore((s) => s.duplicateSelected)
  const transformSelection = useTacticalBoardStore((s) => s.transformSelection)
  const groupSelection = useTacticalBoardStore((s) => s.groupSelection)
  const ungroupSelection = useTacticalBoardStore((s) => s.ungroupSelection)

  const isZoneTool = activeTool === 'zone_rect' || activeTool === 'zone_circle'
  const selectionCount = new Set([...selectedElementIds, ...(selectedElementId ? [selectedElementId] : [])]).size
  const hasSelection = selectionCount > 0
  const hasClipboard = !!clipboard && (clipboard.elements.length + clipboard.arrows.length + clipboard.zones.length) > 0

  const jugadores = ELEMENT_TOOLS.filter((t) => t.grupo === 'jugadores')
  const material = ELEMENT_TOOLS.filter((t) => t.grupo === 'material')

  return (
    <div className="px-3 py-1.5 border-b border-gray-200 bg-white flex-shrink-0 space-y-1.5">
      {/* Fila 1 — herramientas de dibujo */}
      <div className="flex flex-wrap items-center gap-1">
        <ToolButton active={activeTool === 'select'} onClick={() => setActiveTool('select')} title="Seleccionar (V) · arrastra para englobar">
          <MousePointer className="h-4 w-4" />
        </ToolButton>

        <Sep />

        {/* Jugadores */}
        {jugadores.map((t) => (
          <ToolButton
            key={t.type}
            active={activeTool === t.type}
            onClick={() => setActiveTool(t.type as BoardTool)}
            title={t.label}
          >
            <SymbolPreview type={t.type} color={t.defaultColor} size={18} />
          </ToolButton>
        ))}

        <Sep />

        {/* Material */}
        {material.map((t) => (
          <ToolButton
            key={t.type}
            active={activeTool === t.type}
            onClick={() => setActiveTool(t.type as BoardTool)}
            title={t.label}
          >
            <SymbolPreview type={t.type} color={t.defaultColor} size={18} />
          </ToolButton>
        ))}

        <Sep />

        <ToolButton active={activeTool === 'text'} onClick={() => setActiveTool('text')} title="Texto">
          <Type className="h-4 w-4" />
        </ToolButton>

        <div className="flex-1" />

        <span className="text-[10px] text-gray-400 whitespace-nowrap">
          {elements.length} elem · {arrows.length} mov · {zones.length} zonas
        </span>
      </div>

      {/* Fila 2 — movimientos, zonas y acciones */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Movimientos */}
        {ARROW_TYPE_ORDER.map((type) => (
          <ToolButton
            key={type}
            active={activeTool === `arrow_${type}`}
            onClick={() => setActiveTool(`arrow_${type}` as BoardTool)}
            title={`${ARROW_STYLES[type].label} — ${ARROW_STYLES[type].hint}`}
          >
            <ArrowPreview type={type} />
          </ToolButton>
        ))}

        <Sep />

        {/* Zonas */}
        <ToolButton active={activeTool === 'zone_rect'} onClick={() => setActiveTool('zone_rect')} title="Zona rectangular (se mide en metros)">
          <Square className="h-4 w-4" style={{ color: activeTool === 'zone_rect' ? '#fff' : zoneColor }} />
        </ToolButton>
        <ToolButton active={activeTool === 'zone_circle'} onClick={() => setActiveTool('zone_circle')} title="Zona elíptica (se mide en metros)">
          <CircleIcon className="h-4 w-4" style={{ color: activeTool === 'zone_circle' ? '#fff' : zoneColor }} />
        </ToolButton>

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

        {/* Copiar / pegar / duplicar */}
        <ActionButton onClick={copySelected} disabled={!hasSelection} title="Copiar selección (Ctrl+C)">
          <Copy className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={() => pasteClipboard()} disabled={!hasClipboard} title="Pegar (Ctrl+V)">
          <ClipboardPaste className="h-4 w-4" />
        </ActionButton>
        <ActionButton
          onClick={() => pasteClipboard({ flip: 'h', dx: 24, dy: 24 })}
          disabled={!hasClipboard}
          title="Pegar invertido en horizontal (Ctrl+Shift+V)"
        >
          <span className="flex items-center">
            <ClipboardPaste className="h-4 w-4" />
            <FlipHorizontal className="h-3 w-3 -ml-1" />
          </span>
        </ActionButton>

        <Sep />

        {/* Transformaciones de la selección */}
        <ActionButton onClick={() => transformSelection({ rotate: -90 })} disabled={!hasSelection} title="Girar 90° a la izquierda ( [ )">
          <RotateLeft className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={() => transformSelection({ rotate: 90 })} disabled={!hasSelection} title="Girar 90° a la derecha ( ] )">
          <RotateCw className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={() => transformSelection({ flip: 'h' })} disabled={!hasSelection} title="Invertir horizontalmente (H)">
          <FlipHorizontal className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={() => transformSelection({ flip: 'v' })} disabled={!hasSelection} title="Invertir verticalmente (Shift+H)">
          <FlipVertical className="h-4 w-4" />
        </ActionButton>

        <Sep />

        {/* Agrupar */}
        <ActionButton onClick={groupSelection} disabled={selectionCount < 2} title="Agrupar (Ctrl+G)">
          <Group className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={ungroupSelection} disabled={!hasSelection} title="Desagrupar (Ctrl+Shift+G)">
          <Ungroup className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={duplicateSelected} disabled={!hasSelection} title="Duplicar (Ctrl+D)">
          <Copy className="h-4 w-4 rotate-180" />
        </ActionButton>

        <Sep />

        {/* Formaciones */}
        <select
          onChange={(e) => { if (e.target.value) { onLoadFormation(e.target.value, 'home'); e.target.value = '' } }}
          className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
          defaultValue=""
        >
          <option value="" disabled>Formación local</option>
          {FORMATIONS.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>
        <select
          onChange={(e) => { if (e.target.value) { onLoadFormation(e.target.value, 'away'); e.target.value = '' } }}
          className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
          defaultValue=""
        >
          <option value="" disabled>Formación visitante</option>
          {FORMATIONS.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>

        {showPitchSelector && (
          <select
            value={pitchType}
            onChange={(e) => setPitchType(e.target.value as 'full' | 'half')}
            className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
            title="El tipo de campo depende de la tarea"
          >
            <option value="full">Campo completo</option>
            <option value="half">Medio campo</option>
          </select>
        )}

        <div className="flex-1" />

        {/* Historial y borrado */}
        <ActionButton onClick={undo} disabled={historyIndex < 0} title="Deshacer (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={redo} disabled={historyIndex >= history.length - 1} title="Rehacer (Ctrl+Shift+Z)">
          <Redo2 className="h-4 w-4" />
        </ActionButton>
        {onExport && (
          <ActionButton onClick={onExport} title="Exportar imagen / animación">
            <Download className="h-4 w-4" />
          </ActionButton>
        )}
        <ActionButton onClick={deleteSelected} disabled={!hasSelection} title="Eliminar (Supr)" danger>
          <Trash2 className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={clearDiagram} title="Limpiar todo" danger>
          <RotateCcw className="h-4 w-4" />
        </ActionButton>
      </div>

      {/* Ayuda contextual */}
      {activeTool !== 'select' && (
        <div className="text-[11px] text-gray-500">
          {activeTool.startsWith('arrow_')
            ? arrowStart
              ? '2. Clic en el destino del movimiento'
              : `1. Clic en el origen — ${ARROW_STYLES[activeTool.replace('arrow_', '') as ArrowType]?.hint || ''}`
            : isZoneTool
              ? 'Clic y arrastra para dibujar la zona; después ajusta sus lados en metros desde el panel o arrastrando las esquinas'
              : activeTool === 'text'
                ? 'Clic en el campo para colocar un texto'
                : `Clic en el campo para colocar: ${ELEMENT_TOOLS.find((t) => t.type === activeTool)?.label || activeTool}`}
        </div>
      )}
      {activeTool === 'select' && (
        <div className="text-[11px] text-gray-400">
          Arrastra sobre el campo para englobar varios elementos · Ctrl+C/V copiar y pegar · Ctrl+Shift+V pegar invertido · Ctrl+G agrupar · [ ] girar · H invertir
        </div>
      )}
    </div>
  )
}
