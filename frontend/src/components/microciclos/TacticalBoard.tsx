'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  Circle, Triangle, Target, Trash2, RotateCcw, MousePointer,
  ArrowRight, Minus, Square, Undo2, Redo2, Type,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import ABPPitch from '@/components/abp/ABPPitch'
import {
  DiagramElement, DiagramArrow, DiagramZone, ElementType, ArrowType,
  Position, TEAM_COLORS, ELEMENT_SIZES, generateId,
} from '@/components/tarea-editor/types'

interface TacticalBoardProps {
  value?: string
  onChange?: (base64: string) => void
  height?: number
  showFormations?: boolean
}

type BoardTool = 'select' | ElementType | 'arrow_movement' | 'arrow_pass' | 'zone_rect' | 'zone_circle'

const ZONE_COLORS = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899']

const Sep = () => <div className="w-px h-5 bg-gray-200 mx-1" />

function TB({ id, icon, label, color, activeTool, onSelect }: {
  id: BoardTool; icon: React.ReactNode; label: string; color?: string
  activeTool: BoardTool; onSelect: (tool: BoardTool) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
        activeTool === id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      title={label}
    >
      <span style={{ color: activeTool === id ? 'white' : color }}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export function TacticalBoard({ value, onChange, height = 300, showFormations = false }: TacticalBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const [elements, setElements] = useState<DiagramElement[]>([])
  const [arrows, setArrows] = useState<DiagramArrow[]>([])
  const [zones, setZones] = useState<DiagramZone[]>([])
  const [activeTool, setActiveTool] = useState<BoardTool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoneColor, setZoneColor] = useState(ZONE_COLORS[0])
  const [arrowStart, setArrowStart] = useState<Position | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [zoneDragStart, setZoneDragStart] = useState<Position | null>(null)
  const [zoneDragCurrent, setZoneDragCurrent] = useState<Position | null>(null)
  const [history, setHistory] = useState<{ elements: DiagramElement[]; arrows: DiagramArrow[]; zones: DiagramZone[] }[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [playerCounter, setPlayerCounter] = useState({ team1: 1, team2: 1 })
  const [arrowCounter, setArrowCounter] = useState(1)

  const isZoneTool = activeTool === 'zone_rect' || activeTool === 'zone_circle'

  const pushHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ elements, arrows, zones })
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [elements, arrows, zones, history, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex < 0) return
    const state = history[historyIndex]
    setElements(state.elements)
    setArrows(state.arrows)
    setZones(state.zones)
    setHistoryIndex(historyIndex - 1)
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const state = history[historyIndex + 1]
    setElements(state.elements)
    setArrows(state.arrows)
    setZones(state.zones)
    setHistoryIndex(historyIndex + 1)
  }, [history, historyIndex])

  const clearDiagram = useCallback(() => {
    pushHistory()
    setElements([])
    setArrows([])
    setZones([])
    setSelectedId(null)
  }, [pushHistory])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    pushHistory()
    setElements((prev) => prev.filter((e) => e.id !== selectedId))
    setArrows((prev) => prev.filter((a) => a.id !== selectedId))
    setZones((prev) => prev.filter((z) => z.id !== selectedId))
    setSelectedId(null)
  }, [selectedId, pushHistory])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || e.key === 'y')) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelected, undo, redo])

  useEffect(() => {
    if (gRef.current) svgRef.current = gRef.current.ownerSVGElement || null
  })

  const getSvgPosition = useCallback((e: React.MouseEvent): Position => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(ctm.inverse())
    return { x: Math.round(svgPt.x), y: Math.round(svgPt.y) }
  }, [])

  const exportToPng = useCallback(() => {
    const svg = svgRef.current
    if (!svg || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const width = rect.width
    const heightValue = height
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width * 2
      canvas.height = heightValue * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#2D5016'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/png')
      onChange?.(dataUrl)
    }
    img.src = url
  }, [height, onChange])

  const handlePitchClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
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
        setArrows((prev) => [...prev, newArrow])
        setArrowCounter((c) => c + 1)
        setArrowStart(null)
      }
      return
    }

    if (activeTool === 'zone_rect' || activeTool === 'zone_circle') return

    if (activeTool === 'select') {
      setSelectedId(null)
      return
    }

    if (activeTool === 'text') {
      pushHistory()
      const newText: DiagramElement = {
        id: generateId(),
        type: 'text',
        position: pos,
        label: 'Texto',
        color: '#FFFFFF',
      }
      setElements((prev) => [...prev, newText])
      setSelectedId(newText.id)
      return
    }

    pushHistory()
    const elementType = activeTool as ElementType
    let label = ''
    let color = TEAM_COLORS.team1
    let newCounter = playerCounter

    if (elementType === 'player') {
      label = String(playerCounter.team1)
      color = TEAM_COLORS.team1
      newCounter = { ...playerCounter, team1: playerCounter.team1 + 1 }
    } else if (elementType === 'opponent') {
      label = String(playerCounter.team2)
      color = TEAM_COLORS.team2
      newCounter = { ...playerCounter, team2: playerCounter.team2 + 1 }
    } else if (elementType === 'player_gk') {
      label = 'GK'
      color = TEAM_COLORS.goalkeeper
    } else if (elementType === 'cone') {
      color = '#FF6B00'
    } else if (elementType === 'ball') {
      color = '#FFFFFF'
    }

    const newElement: DiagramElement = {
      id: generateId(),
      type: elementType,
      position: pos,
      label,
      color,
    }
    setElements((prev) => [...prev, newElement])
    if (elementType === 'player' || elementType === 'opponent') {
      setPlayerCounter(newCounter)
    }
    exportToPng()
  }, [activeTool, arrowStart, arrowCounter, playerCounter, getSvgPosition, pushHistory, exportToPng])

  const handlePitchMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const pos = getSvgPosition(e)
    if (activeTool === 'zone_rect' || activeTool === 'zone_circle') {
      setZoneDragStart(pos)
      setZoneDragCurrent(pos)
    }
  }, [activeTool, getSvgPosition])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (zoneDragStart && isZoneTool) {
      setZoneDragCurrent(getSvgPosition(e))
      return
    }
    if (!isDragging || !selectedId) return
    const pos = getSvgPosition(e)
    const element = elements.find((el) => el.id === selectedId)
    const zone = zones.find((z) => z.id === selectedId)
    if (element) {
      setElements((prev) => prev.map((el) => el.id === selectedId ? { ...el, position: { x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } } : el))
    } else if (zone) {
      setZones((prev) => prev.map((z) => z.id === selectedId ? { ...z, position: { x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } } : z))
    }
  }, [zoneDragStart, isZoneTool, isDragging, selectedId, elements, zones, dragOffset, getSvgPosition])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (zoneDragStart && zoneDragCurrent && isZoneTool) {
      const pos = getSvgPosition(e)
      const x = Math.min(zoneDragStart.x, pos.x)
      const y = Math.min(zoneDragStart.y, pos.y)
      const w = Math.abs(pos.x - zoneDragStart.x)
      const h = Math.abs(pos.y - zoneDragStart.y)
      if (w > 10 && h > 10) {
        pushHistory()
        const newZone: DiagramZone = {
          id: generateId(),
          position: { x, y },
          width: w,
          height: h,
          color: zoneColor,
          opacity: 0.3,
          shape: activeTool === 'zone_circle' ? 'ellipse' : 'rectangle',
        }
        setZones((prev) => [...prev, newZone])
        exportToPng()
      }
      setZoneDragStart(null)
      setZoneDragCurrent(null)
      return
    }
    setIsDragging(false)
  }, [zoneDragStart, zoneDragCurrent, isZoneTool, activeTool, zoneColor, getSvgPosition, pushHistory, exportToPng])

  const handleElementMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    if (activeTool === 'select') {
      setSelectedId(elementId)
      setIsDragging(true)
      const pos = getSvgPosition(e)
      const el = elements.find((e) => e.id === elementId)
      const z = zones.find((z) => z.id === elementId)
      if (el) setDragOffset({ x: pos.x - el.position.x, y: pos.y - el.position.y })
      else if (z) setDragOffset({ x: pos.x - z.position.x, y: pos.y - z.position.y })
    } else {
      setSelectedId(elementId)
    }
  }, [activeTool, elements, zones, getSvgPosition])

  const renderElement = (element: DiagramElement) => {
    const { id, type, position, color, label } = element
    const isSelected = selectedId === id
    const size = ELEMENT_SIZES[type as keyof typeof ELEMENT_SIZES] || 24

    const commonProps = {
      key: id,
      style: { cursor: activeTool === 'select' ? 'move' : 'pointer' } as React.CSSProperties,
      onMouseDown: (e: React.MouseEvent) => handleElementMouseDown(e, id),
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
    }

    switch (type) {
      case 'player':
      case 'opponent':
      case 'player_gk':
        return (
          <g {...commonProps} transform={`translate(${position.x}, ${position.y})`}>
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
            <circle cx="0" cy="0" r={size / 2} fill="#FFFFFF" stroke={isSelected ? '#FFFF00' : '#333333'} strokeWidth={isSelected ? 2.5 : 1.5} />
          </g>
        )
      case 'text':
        return (
          <g {...commonProps} transform={`translate(${position.x}, ${position.y})`}>
            <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill={color || '#FFFFFF'} fontSize="13" fontWeight="bold" fontFamily="Arial">
              {label || 'Texto'}
            </text>
          </g>
        )
      case 'mini_goal':
        return (
          <g {...commonProps} transform={`translate(${position.x}, ${position.y})`}>
            <rect x="-20" y="-12" width="40" height="24" fill="rgba(255,255,255,0.1)" stroke={isSelected ? '#FFFF00' : '#FFFFFF'} strokeWidth={isSelected ? 3 : 2} rx="2" />
          </g>
        )
      default:
        return null
    }
  }

  const renderArrow = (arrow: DiagramArrow) => {
    const { id, from, to, type, color } = arrow
    const isSelected = selectedId === id
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    const arrowSize = 10
    const tipX = to.x - arrowSize * Math.cos(angle)
    const tipY = to.y - arrowSize * Math.sin(angle)

    return (
      <g key={id} onClick={(e) => { e.stopPropagation(); setSelectedId(id) }} style={{ cursor: 'pointer' }}>
        <line x1={from.x} y1={from.y} x2={tipX} y2={tipY}
          stroke={color || '#FFFFFF'} strokeWidth={isSelected ? 4 : 2.5}
          strokeDasharray={type === 'pass' ? '8,4' : 'none'}
        />
        <polygon
          points={`${to.x},${to.y} ${to.x - arrowSize * Math.cos(angle - Math.PI / 6)},${to.y - arrowSize * Math.sin(angle - Math.PI / 6)} ${to.x - arrowSize * Math.cos(angle + Math.PI / 6)},${to.y - arrowSize * Math.sin(angle + Math.PI / 6)}`}
          fill={color || '#FFFFFF'}
        />
      </g>
    )
  }

  const renderZone = (zone: DiagramZone) => {
    const { id, position, width, height, color, shape } = zone
    const isSelected = selectedId === id

    return (
      <g key={id}
        onMouseDown={(e) => handleElementMouseDown(e, id)}
        onClick={(e) => { e.stopPropagation(); setSelectedId(id) }}
        style={{ cursor: activeTool === 'select' ? 'move' : 'pointer' }}
      >
        {shape === 'ellipse' ? (
          <ellipse
            cx={position.x + width / 2} cy={position.y + height / 2}
            rx={width / 2} ry={height / 2}
            fill={color} opacity={0.3}
            stroke={isSelected ? '#FFFF00' : 'none'} strokeWidth={isSelected ? 2 : 0}
          />
        ) : (
          <rect
            x={position.x} y={position.y} width={width} height={height}
            fill={color} opacity={0.3}
            stroke={isSelected ? '#FFFF00' : 'none'} strokeWidth={isSelected ? 2 : 0}
          />
        )}
      </g>
    )
  }

  const renderZonePreview = () => {
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
    <Card className="p-2 space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <TB id="select" icon={<MousePointer className="h-3.5 w-3.5" />} label="Seleccionar" activeTool={activeTool} onSelect={setActiveTool} />
        <Sep />
        <TB id="player" icon={<Circle className="h-3.5 w-3.5" />} label="Jugador" color={TEAM_COLORS.team1} activeTool={activeTool} onSelect={setActiveTool} />
        <TB id="opponent" icon={<Circle className="h-3.5 w-3.5" />} label="Rival" color={TEAM_COLORS.team2} activeTool={activeTool} onSelect={setActiveTool} />
        <TB id="player_gk" icon={<Circle className="h-3.5 w-3.5" />} label="Portero" color={TEAM_COLORS.goalkeeper} activeTool={activeTool} onSelect={setActiveTool} />
        <Sep />
        <TB id="cone" icon={<Triangle className="h-3.5 w-3.5" />} label="Cono" color="#FF6B00" activeTool={activeTool} onSelect={setActiveTool} />
        <TB id="ball" icon={<Target className="h-3.5 w-3.5" />} label="Balon" activeTool={activeTool} onSelect={setActiveTool} />
        <TB id="mini_goal" icon={<Minus className="h-3.5 w-3.5 rotate-90" />} label="Mini" activeTool={activeTool} onSelect={setActiveTool} />
        <Sep />
        <TB id="arrow_movement" icon={<ArrowRight className="h-3.5 w-3.5" />} label="Movimiento" color="#FFFF00" activeTool={activeTool} onSelect={setActiveTool} />
        <TB id="arrow_pass" icon={<ArrowRight className="h-3.5 w-3.5" />} label="Pase" color="#FFFFFF" activeTool={activeTool} onSelect={setActiveTool} />
        <Sep />
        <TB id="zone_rect" icon={<Square className="h-3.5 w-3.5" />} label="Zona" color={zoneColor} activeTool={activeTool} onSelect={setActiveTool} />
        <TB id="zone_circle" icon={<Circle className="h-3.5 w-3.5" />} label="Elipse" color={zoneColor} activeTool={activeTool} onSelect={setActiveTool} />
        {isZoneTool && (
          <div className="flex items-center gap-0.5 ml-1">
            {ZONE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setZoneColor(c)}
                className={`w-4 h-4 rounded-full border-2 ${zoneColor === c ? 'border-yellow-400 scale-110' : 'border-gray-300'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
        <Sep />
        <TB id="text" icon={<Type className="h-3.5 w-3.5" />} label="Texto" activeTool={activeTool} onSelect={setActiveTool} />
        <Sep />
        <button
          type="button"
          onClick={undo}
          disabled={historyIndex < 0}
          className="p-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30"
          title="Deshacer"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="p-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30"
          title="Rehacer"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={deleteSelected}
          disabled={!selectedId}
          className="p-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-red-100 disabled:opacity-30"
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={clearDiagram}
          className="p-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-red-100"
          title="Limpiar"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden border border-white/10"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <ABPPitch
          type="half"
          orientation="vertical"
          className="w-full h-full"
          onClick={handlePitchClick}
          onMouseDown={handlePitchMouseDown}
        >
          <g ref={gRef}>
            {zones.map(renderZone)}
            {renderZonePreview()}
            {arrows.map(renderArrow)}
            {arrowStart && <circle cx={arrowStart.x} cy={arrowStart.y} r="6" fill="#FFFF00" stroke="#000" strokeWidth="1" opacity="0.8" />}
            {elements.map(renderElement)}
          </g>
        </ABPPitch>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-[10px] text-muted-foreground">
          {activeTool.startsWith('arrow_')
            ? (arrowStart ? '2. Click destino' : '1. Click origen')
            : isZoneTool
              ? 'Click y arrastra para dibujar zona'
              : 'Selecciona una herramienta y click en el campo'}
        </p>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={exportToPng}>
          Guardar dibujo
        </Button>
      </div>
    </Card>
  )
}
