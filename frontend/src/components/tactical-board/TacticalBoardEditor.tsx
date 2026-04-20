'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Save, X, Download, Film, Image as ImageIcon } from 'lucide-react'
import ABPPitch from '@/components/abp/ABPPitch'
import {
  DiagramElement, DiagramArrow, DiagramZone, ElementType, ArrowType,
  Position, TEAM_COLORS, ELEMENT_SIZES, generateId,
} from '@/components/tarea-editor/types'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import BoardToolbar from './BoardToolbar'
import KeyframeTimeline from './KeyframeTimeline'
import AnimationPlayer, { AnimationState } from './AnimationPlayer'
import ExportDialog from './ExportDialog'

interface TacticalBoardEditorProps {
  onSave: () => void
  onCancel: () => void
}

export default function TacticalBoardEditor({ onSave, onCancel }: TacticalBoardEditorProps) {
  const nombre = useTacticalBoardStore((s) => s.nombre)
  const tipo = useTacticalBoardStore((s) => s.tipo)
  const pitchType = useTacticalBoardStore((s) => s.pitchType)
  const activeTool = useTacticalBoardStore((s) => s.activeTool)
  const selectedElementId = useTacticalBoardStore((s) => s.selectedElementId)
  const elements = useTacticalBoardStore((s) => s.elements)
  const arrows = useTacticalBoardStore((s) => s.arrows)
  const zones = useTacticalBoardStore((s) => s.zones)
  const zoneColor = useTacticalBoardStore((s) => s.zoneColor)
  const saving = useTacticalBoardStore((s) => s.saving)
  const playerCounter = useTacticalBoardStore((s) => s.playerCounter)
  const arrowCounter = useTacticalBoardStore((s) => s.arrowCounter)
  const isPlaying = useTacticalBoardStore((s) => s.isPlaying)

  const setNombre = useTacticalBoardStore((s) => s.setNombre)
  const setTipo = useTacticalBoardStore((s) => s.setTipo)
  const setPitchType = useTacticalBoardStore((s) => s.setPitchType)
  const setSelectedElementId = useTacticalBoardStore((s) => s.setSelectedElementId)
  const addElement = useTacticalBoardStore((s) => s.addElement)
  const updateElementPosition = useTacticalBoardStore((s) => s.updateElementPosition)
  const addArrow = useTacticalBoardStore((s) => s.addArrow)
  const addZone = useTacticalBoardStore((s) => s.addZone)
  const deleteSelected = useTacticalBoardStore((s) => s.deleteSelected)
  const pushHistory = useTacticalBoardStore((s) => s.pushHistory)
  const undo = useTacticalBoardStore((s) => s.undo)
  const redo = useTacticalBoardStore((s) => s.redo)
  const loadFormation = useTacticalBoardStore((s) => s.loadFormation)

  // Local interaction state
  const [isDragging, setIsDragging] = useState(false)
  const [arrowStart, setArrowStart] = useState<Position | null>(null)
  const [zoneDragStart, setZoneDragStart] = useState<Position | null>(null)
  const [zoneDragCurrent, setZoneDragCurrent] = useState<Position | null>(null)
  const [showExport, setShowExport] = useState(false)

  // Animation overlay state (during playback, we render these instead of store state)
  const [animState, setAnimState] = useState<AnimationState | null>(null)

  const gRef = useRef<SVGGElement>(null)
  // Get SVG ref from gRef's parent for export
  const svgRef = useRef<SVGSVGElement | null>(null)
  useEffect(() => {
    if (gRef.current) svgRef.current = gRef.current.ownerSVGElement || null
  })

  const isAnimated = tipo === 'animated'

  // Clear animation overlay when playback stops
  useEffect(() => {
    if (!isPlaying) setAnimState(null)
  }, [isPlaying])

  // Decide which data to render (animation overlay or store)
  const renderElements = isPlaying && animState ? animState.elements : elements
  const renderArrows = isPlaying && animState ? animState.arrows : arrows
  const renderZones = isPlaying && animState ? animState.zones : zones

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPlaying) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
        return
      }
      if (e.key === 'Escape') {
        setSelectedElementId(null)
        setArrowStart(null)
        setZoneDragStart(null)
        setZoneDragCurrent(null)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || e.key === 'y')) {
        e.preventDefault()
        redo()
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelected, undo, redo, setSelectedElementId, isPlaying])

  // SVG coordinate conversion
  const getSvgPosition = useCallback((e: React.MouseEvent): Position => {
    const svg = gRef.current?.ownerSVGElement
    if (!svg) return { x: 0, y: 0 }
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(ctm.inverse())
    return { x: Math.round(svgPt.x), y: Math.round(svgPt.y) }
  }, [])

  // Click on pitch
  const handlePitchClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isPlaying) return
    const pos = getSvgPosition(e)
    if (pos.x === 0 && pos.y === 0) return

    if (activeTool.startsWith('arrow_')) {
      if (!arrowStart) {
        setArrowStart(pos)
      } else {
        pushHistory()
        const arrowType: ArrowType = activeTool === 'arrow_pass' ? 'pass' : 'movement'
        const newArrow: DiagramArrow = {
          id: generateId(),
          type: arrowType,
          from: arrowStart,
          to: pos,
          color: arrowType === 'pass' ? '#FFFFFF' : '#FFFF00',
          label: String(arrowCounter),
        }
        addArrow(newArrow)
        setArrowStart(null)
      }
      return
    }

    if (activeTool === 'zone_rect' || activeTool === 'zone_circle') return

    if (activeTool === 'select') {
      setSelectedElementId(null)
      return
    }

    pushHistory()
    const elementType = activeTool as ElementType
    let label = ''
    let color = TEAM_COLORS.team1

    if (elementType === 'player') {
      label = String(playerCounter.team1)
      color = TEAM_COLORS.team1
    } else if (elementType === 'opponent') {
      label = String(playerCounter.team2)
      color = TEAM_COLORS.team2
    } else if (elementType === 'player_gk') {
      label = 'GK'
      color = TEAM_COLORS.goalkeeper
    } else if (elementType === 'cone') {
      color = '#FF6B00'
    } else if (elementType === 'ball') {
      color = '#FFFFFF'
    }

    addElement({
      id: generateId(),
      type: elementType,
      position: pos,
      label,
      color,
    })
  }, [activeTool, arrowStart, arrowCounter, playerCounter, getSvgPosition, pushHistory, addArrow, addElement, setSelectedElementId, isPlaying])

  // Zone drawing
  const handlePitchMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (isPlaying) return
    if (activeTool !== 'zone_rect' && activeTool !== 'zone_circle') return
    const pos = getSvgPosition(e)
    setZoneDragStart(pos)
    setZoneDragCurrent(pos)
  }, [activeTool, getSvgPosition, isPlaying])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPlaying) return
    if (zoneDragStart && (activeTool === 'zone_rect' || activeTool === 'zone_circle')) {
      setZoneDragCurrent(getSvgPosition(e))
      return
    }
    if (!isDragging || !selectedElementId) return
    const pos = getSvgPosition(e)
    if (pos.x === 0 && pos.y === 0) return
    updateElementPosition(selectedElementId, pos.x, pos.y)
  }, [isDragging, selectedElementId, getSvgPosition, zoneDragStart, activeTool, updateElementPosition, isPlaying])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPlaying) return
    if (zoneDragStart && zoneDragCurrent && (activeTool === 'zone_rect' || activeTool === 'zone_circle')) {
      const pos = getSvgPosition(e)
      const x = Math.min(zoneDragStart.x, pos.x)
      const y = Math.min(zoneDragStart.y, pos.y)
      const w = Math.abs(pos.x - zoneDragStart.x)
      const h = Math.abs(pos.y - zoneDragStart.y)

      if (w > 5 && h > 5) {
        pushHistory()
        addZone({
          id: generateId(),
          position: { x, y },
          width: w,
          height: h,
          color: zoneColor,
          opacity: 0.3,
          shape: activeTool === 'zone_circle' ? 'ellipse' : 'rectangle',
        })
      }
      setZoneDragStart(null)
      setZoneDragCurrent(null)
      return
    }
    setIsDragging(false)
  }, [zoneDragStart, zoneDragCurrent, activeTool, getSvgPosition, zoneColor, pushHistory, addZone, isPlaying])

  const handleElementMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    if (isPlaying) return
    e.stopPropagation()
    setSelectedElementId(elementId)
    if (activeTool === 'select') setIsDragging(true)
  }, [activeTool, setSelectedElementId, isPlaying])

  const handleLoadFormation = useCallback((name: string, team: 'home' | 'away') => {
    loadFormation(name, team)
  }, [loadFormation])

  const handleAnimationFrame = useCallback((state: AnimationState) => {
    setAnimState(state)
  }, [])

  // ============ Renderers ============

  const renderElement = (element: DiagramElement) => {
    const { id, type, position, color, label } = element
    const isSelected = !isPlaying && selectedElementId === id
    const size = ELEMENT_SIZES[type as keyof typeof ELEMENT_SIZES] || 24

    const commonProps = {
      key: id,
      style: { cursor: isPlaying ? 'default' : 'move' } as React.CSSProperties,
      onMouseDown: (e: React.MouseEvent) => handleElementMouseDown(e, id),
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
    }

    switch (type) {
      case 'player':
      case 'opponent':
      case 'player_gk':
        return (
          <g {...commonProps} transform={`translate(${position.x}, ${position.y})`}>
            <circle cx="2" cy="2" r={size / 2} fill="rgba(0,0,0,0.3)" />
            <circle cx="0" cy="0" r={size / 2} fill={color} stroke={isSelected ? '#FFFF00' : '#FFFFFF'} strokeWidth={isSelected ? 3 : 2} />
            <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="Arial">
              {label || ''}
            </text>
          </g>
        )
      case 'cone':
        return (
          <g {...commonProps} transform={`translate(${position.x}, ${position.y})`}>
            <polygon points="0,-10 8,8 -8,8" fill={color} stroke={isSelected ? '#FFFF00' : '#000000'} strokeWidth={isSelected ? 2 : 1} />
          </g>
        )
      case 'ball':
        return (
          <g {...commonProps} transform={`translate(${position.x}, ${position.y})`}>
            <circle cx="0" cy="0" r={size / 2} fill="#FFFFFF" stroke="#000000" strokeWidth="1" />
            <circle cx="-2" cy="-2" r="2" fill="#000000" />
            <circle cx="3" cy="0" r="2" fill="#000000" />
            <circle cx="0" cy="3" r="2" fill="#000000" />
          </g>
        )
      case 'mini_goal':
        return (
          <g {...commonProps} transform={`translate(${position.x}, ${position.y})`}>
            <rect x="-20" y="-12" width="40" height="24" fill="none" stroke={isSelected ? '#FFFF00' : '#FFFFFF'} strokeWidth={isSelected ? 3 : 2} />
          </g>
        )
      default:
        return null
    }
  }

  const renderArrow = (arrow: DiagramArrow) => {
    const { id, from, to, type, color } = arrow
    const isSelected = !isPlaying && selectedElementId === id
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    const arrowSize = 10
    const tipX = to.x - arrowSize * Math.cos(angle)
    const tipY = to.y - arrowSize * Math.sin(angle)
    const midX = (from.x + to.x) / 2
    const midY = (from.y + to.y) / 2

    return (
      <g key={id} onClick={(e) => { e.stopPropagation(); if (!isPlaying) setSelectedElementId(id) }} style={{ cursor: isPlaying ? 'default' : 'pointer' }}>
        <line x1={from.x} y1={from.y} x2={tipX} y2={tipY}
          stroke={color || '#FFFFFF'} strokeWidth={isSelected ? 4 : 2.5}
          strokeDasharray={type === 'pass' ? '8,4' : 'none'}
        />
        <polygon
          points={`${to.x},${to.y} ${to.x - arrowSize * Math.cos(angle - Math.PI / 6)},${to.y - arrowSize * Math.sin(angle - Math.PI / 6)} ${to.x - arrowSize * Math.cos(angle + Math.PI / 6)},${to.y - arrowSize * Math.sin(angle + Math.PI / 6)}`}
          fill={color || '#FFFFFF'}
        />
        {arrow.label && (
          <>
            <circle cx={midX} cy={midY} r="10" fill="rgba(0,0,0,0.7)" />
            <text x={midX} y={midY + 1} textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="Arial">
              {arrow.label}
            </text>
          </>
        )}
      </g>
    )
  }

  const renderZone = (zone: DiagramZone) => {
    const { id, position, width, height, color, opacity, shape } = zone
    const isSelected = !isPlaying && selectedElementId === id

    return (
      <g key={id} onClick={(e) => { e.stopPropagation(); if (!isPlaying) setSelectedElementId(id) }} style={{ cursor: isPlaying ? 'default' : 'pointer' }}>
        {shape === 'ellipse' ? (
          <ellipse
            cx={position.x + width / 2} cy={position.y + height / 2}
            rx={width / 2} ry={height / 2}
            fill={color} opacity={opacity || 0.3}
            stroke={isSelected ? '#FFFF00' : 'none'} strokeWidth={isSelected ? 2 : 0}
            strokeDasharray={isSelected ? '6,3' : 'none'}
          />
        ) : (
          <rect
            x={position.x} y={position.y} width={width} height={height}
            fill={color} opacity={opacity || 0.3}
            stroke={isSelected ? '#FFFF00' : 'none'} strokeWidth={isSelected ? 2 : 0}
            strokeDasharray={isSelected ? '6,3' : 'none'}
          />
        )}
      </g>
    )
  }

  const renderZoneDragPreview = () => {
    if (!zoneDragStart || !zoneDragCurrent) return null
    const x = Math.min(zoneDragStart.x, zoneDragCurrent.x)
    const y = Math.min(zoneDragStart.y, zoneDragCurrent.y)
    const w = Math.abs(zoneDragCurrent.x - zoneDragStart.x)
    const h = Math.abs(zoneDragCurrent.y - zoneDragStart.y)

    if (activeTool === 'zone_circle') {
      return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={zoneColor} opacity={0.3} stroke="#FFFF00" strokeWidth="1" strokeDasharray="4,2" />
    }
    return <rect x={x} y={y} width={w} height={h} fill={zoneColor} opacity={0.3} stroke="#FFFF00" strokeWidth="1" strokeDasharray="4,2" />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
        <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la pizarra..."
          className="flex-1 text-lg font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300"
          autoFocus
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={pitchType}
            onChange={(e) => setPitchType(e.target.value as 'full' | 'half')}
            className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
          >
            <option value="full">Campo Completo</option>
            <option value="half">Medio Campo</option>
          </select>

          {/* Mode toggle */}
          <button
            onClick={() => setTipo(isAnimated ? 'static' : 'animated')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isAnimated
                ? 'bg-purple-50 border-purple-300 text-purple-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {isAnimated ? <Film className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
            {isAnimated ? 'Animada' : 'Estatica'}
          </button>

          {/* Export */}
          <button
            onClick={() => setShowExport(true)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Exportar"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            onClick={onSave}
            disabled={!nombre.trim() || saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <BoardToolbar
        arrowStart={!!arrowStart}
        onLoadFormation={handleLoadFormation}
      />

      {/* Pitch */}
      <div
        className="flex-1 min-h-0 bg-green-900 overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsDragging(false); setZoneDragStart(null); setZoneDragCurrent(null) }}
      >
        <ABPPitch
          type={pitchType}
          className="w-full h-full"
          onClick={handlePitchClick}
          onMouseDown={handlePitchMouseDown}
        >
          <g ref={gRef}>
            {renderZones.map(renderZone)}
            {!isPlaying && renderZoneDragPreview()}
            {renderArrows.map(renderArrow)}
            {!isPlaying && arrowStart && (
              <circle cx={arrowStart.x} cy={arrowStart.y} r="6" fill="#FFFF00" stroke="#000" strokeWidth="1" opacity="0.8" />
            )}
            {renderElements.map(renderElement)}
          </g>
        </ABPPitch>
      </div>

      {/* Animation controls (only in animated mode) */}
      {isAnimated && (
        <>
          <KeyframeTimeline />
          <AnimationPlayer onFrame={handleAnimationFrame} />
        </>
      )}

      {/* Export dialog */}
      {showExport && (
        <ExportDialog
          svgRef={svgRef}
          isAnimated={isAnimated}
          boardName={nombre}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
