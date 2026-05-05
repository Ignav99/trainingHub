'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Circle,
  Triangle,
  Target,
  Trash2,
  RotateCcw,
  MousePointer,
  ArrowRight,
  Minus,
  Maximize2,
  Minimize2,
  Square,
  Undo2,
  Redo2,
} from 'lucide-react'
import FootballPitch from './FootballPitch'
import {
  DiagramData,
  DiagramElement,
  DiagramArrow,
  DiagramZone,
  ElementType,
  ArrowType,
  Position,
  TEAM_COLORS,
  ELEMENT_SIZES,
  generateId,
  emptyDiagramData,
} from './types'

interface TareaGraphicEditorProps {
  value?: DiagramData
  onChange?: (data: DiagramData) => void
  readOnly?: boolean
}

type Tool =
  | 'select'
  | 'player'
  | 'opponent'
  | 'player_gk'
  | 'cone'
  | 'ball'
  | 'mini_goal'
  | 'arrow_movement'
  | 'arrow_pass'
  | 'zone_rect'
  | 'zone_circle'

const ZONE_COLORS = [
  '#3B82F6', // Azul
  '#EF4444', // Rojo
  '#22C55E', // Verde
  '#EAB308', // Amarillo
  '#F97316', // Naranja
  '#A855F7', // Morado
  '#06B6D4', // Cyan
  '#FFFFFF', // Blanco
]

const MAX_HISTORY = 30

// Normalize element position: handles both {position: {x,y}} and {x, y} formats
function normalizePosition(el: any): { x: number; y: number } | null {
  if (el.position && typeof el.position.x === 'number') return el.position
  if (typeof el.x === 'number' && typeof el.y === 'number') return { x: el.x, y: el.y }
  return null
}

// Ensure grafico_data from DB always has valid arrays, normalizing position formats
function sanitizeDiagramData(raw: any): DiagramData {
  if (!raw || typeof raw !== 'object') return emptyDiagramData
  return {
    pitchType: raw.pitchType || 'full',
    elements: Array.isArray(raw.elements)
      ? raw.elements
          .filter((e: any) => e && normalizePosition(e))
          .map((e: any) => ({ ...e, position: normalizePosition(e) }))
      : [],
    arrows: Array.isArray(raw.arrows)
      ? raw.arrows.filter((a: any) => a && a.from && a.to && typeof a.from.x === 'number' && typeof a.to.x === 'number')
      : [],
    zones: Array.isArray(raw.zones)
      ? raw.zones
          .filter((z: any) => z && (z.position || (typeof z.x === 'number' && typeof z.y === 'number')))
          .map((z: any) => ({ ...z, position: z.position || { x: z.x, y: z.y } }))
      : [],
  }
}

export default function TareaGraphicEditor({
  value = emptyDiagramData,
  onChange,
  readOnly = false,
}: TareaGraphicEditorProps) {
  const [data, setData] = useState<DiagramData>(() => sanitizeDiagramData(value))
  const [selectedTool, setSelectedTool] = useState<Tool>('select')
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [arrowStart, setArrowStart] = useState<Position | null>(null)
  const [playerCounter, setPlayerCounter] = useState({ team1: 1, team2: 1, gk: 1 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoneColor, setZoneColor] = useState(ZONE_COLORS[0])

  // Zone drawing state
  const [zoneDragStart, setZoneDragStart] = useState<Position | null>(null)
  const [zoneDragCurrent, setZoneDragCurrent] = useState<Position | null>(null)

  // Undo/Redo
  const [history, setHistory] = useState<DiagramData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedoRef = useRef(false)

  // Track if we're modifying data internally (to skip useEffect sync)
  const internalChangeRef = useRef(false)
  // Track data snapshot at drag start (for single undo entry per drag)
  const dragStartDataRef = useRef<DiagramData | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync external value changes — skip if we just changed data internally
  useEffect(() => {
    if (internalChangeRef.current) {
      internalChangeRef.current = false
      return
    }
    setData(sanitizeDiagramData(value))
  }, [value])

  // Push to history before each change
  const pushHistory = useCallback((currentData: DiagramData) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(currentData)
      if (newHistory.length > MAX_HISTORY) newHistory.shift()
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1))
  }, [historyIndex])

  // Actualizar datos y notificar al padre (for discrete actions like add/delete)
  const updateData = useCallback((newData: DiagramData) => {
    if (!isUndoRedoRef.current) {
      pushHistory(data)
    }
    isUndoRedoRef.current = false
    internalChangeRef.current = true
    setData(newData)
    onChange?.(newData)
  }, [onChange, data, pushHistory])


  // Undo
  const undo = useCallback(() => {
    if (historyIndex < 0) return
    const prev = history[historyIndex]
    if (!prev) return
    isUndoRedoRef.current = true
    setHistoryIndex(i => i - 1)
    setData(prev)
    onChange?.(prev)
  }, [history, historyIndex, onChange])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const next = history[historyIndex + 1]
    if (!next) return
    isUndoRedoRef.current = true
    setHistoryIndex(i => i + 1)
    setData(next)
    onChange?.(next)
  }, [history, historyIndex, onChange])

  // Eliminar elemento seleccionado
  const deleteSelected = useCallback(() => {
    if (!selectedElement) return
    updateData({
      ...data,
      elements: data.elements.filter(el => el.id !== selectedElement),
      arrows: data.arrows.filter(ar => ar.id !== selectedElement),
      zones: data.zones.filter(z => z.id !== selectedElement),
    })
    setSelectedElement(null)
  }, [selectedElement, data, updateData])

  // Keyboard shortcuts
  useEffect(() => {
    if (readOnly) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
        return
      }

      if (e.key === 'Escape') {
        setSelectedElement(null)
        setArrowStart(null)
        setZoneDragStart(null)
        setZoneDragCurrent(null)
        if (isFullscreen) setIsFullscreen(false)
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
  }, [readOnly, isFullscreen, deleteSelected, undo, redo])

  // Global mouse listeners for smooth dragging (works even if mouse leaves SVG)
  useEffect(() => {
    if (!isDragging || !selectedElement) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const viewBox = svg.viewBox.baseVal
      const scaleX = viewBox.width / rect.width
      const scaleY = viewBox.height / rect.height
      const pos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
      internalChangeRef.current = true
      setData(prev => ({
        ...prev,
        elements: prev.elements.map(el =>
          el.id === selectedElement ? { ...el, position: pos } : el
        ),
      }))
    }

    const handleGlobalMouseUp = () => {
      if (dragStartDataRef.current) {
        // Commit: push original state to history, notify parent of final position
        pushHistory(dragStartDataRef.current)
        dragStartDataRef.current = null
        internalChangeRef.current = true
        setData(prev => {
          onChange?.(prev)
          return prev
        })
      }
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, selectedElement, onChange, pushHistory])

  // Obtener posicion relativa al SVG — uses the actual <svg> ref
  const getSvgPosition = (e: React.MouseEvent): Position => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const viewBox = svg.viewBox.baseVal
    const scaleX = viewBox.width / rect.width
    const scaleY = viewBox.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  // Manejar click en el campo
  const handlePitchClick = (e: React.MouseEvent<SVGSVGElement>) => {
    addDebug(`pitchClick | target=${(e.target as Element).tagName} | tool=${selectedTool}`)
    if (readOnly) return
    const pos = getSvgPosition(e)

    // Si estamos dibujando una flecha
    if (selectedTool.startsWith('arrow_')) {
      if (!arrowStart) {
        setArrowStart(pos)
      } else {
        const arrowType: ArrowType = selectedTool === 'arrow_pass' ? 'pass' : 'movement'
        const newArrow: DiagramArrow = {
          id: generateId(),
          type: arrowType,
          from: arrowStart,
          to: pos,
          color: arrowType === 'pass' ? '#FFFFFF' : '#FFFF00',
        }
        updateData({
          ...data,
          arrows: [...data.arrows, newArrow],
        })
        setArrowStart(null)
      }
      return
    }

    // Zone tools use mouseDown/mouseUp, not click
    if (selectedTool === 'zone_rect' || selectedTool === 'zone_circle') return

    // Si es herramienta de seleccion, deseleccionar
    if (selectedTool === 'select') {
      setSelectedElement(null)
      return
    }

    // Crear nuevo elemento
    const elementType = selectedTool as ElementType
    let label = ''
    let color = TEAM_COLORS.team1

    if (elementType === 'player') {
      label = String(playerCounter.team1)
      setPlayerCounter(prev => ({ ...prev, team1: prev.team1 + 1 }))
      color = TEAM_COLORS.team1
    } else if (elementType === 'opponent') {
      label = String(playerCounter.team2)
      setPlayerCounter(prev => ({ ...prev, team2: prev.team2 + 1 }))
      color = TEAM_COLORS.team2
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

    updateData({
      ...data,
      elements: [...data.elements, newElement],
    })
  }

  // Zone drawing: mousedown starts drag
  const handlePitchMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly) return
    if (selectedTool !== 'zone_rect' && selectedTool !== 'zone_circle') return
    const pos = getSvgPosition(e)
    setZoneDragStart(pos)
    setZoneDragCurrent(pos)
  }

  // Zone drawing: mousemove updates preview (element drag is handled by global listener)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (zoneDragStart && (selectedTool === 'zone_rect' || selectedTool === 'zone_circle')) {
      const pos = getSvgPosition(e)
      setZoneDragCurrent(pos)
    }
  }

  // Zone drawing: mouseup creates zone (element drag commit is in global listener)
  const handleMouseUp = (e: React.MouseEvent) => {
    // Finish zone drag
    if (zoneDragStart && zoneDragCurrent && (selectedTool === 'zone_rect' || selectedTool === 'zone_circle')) {
      const pos = getSvgPosition(e)
      const x = Math.min(zoneDragStart.x, pos.x)
      const y = Math.min(zoneDragStart.y, pos.y)
      const w = Math.abs(pos.x - zoneDragStart.x)
      const h = Math.abs(pos.y - zoneDragStart.y)

      // Only create zone if it has meaningful size
      if (w > 5 && h > 5) {
        const newZone: DiagramZone = {
          id: generateId(),
          position: { x, y },
          width: w,
          height: h,
          color: zoneColor,
          opacity: 0.3,
          shape: selectedTool === 'zone_circle' ? 'ellipse' : 'rectangle',
        }
        updateData({
          ...data,
          zones: [...data.zones, newZone],
        })
      }

      setZoneDragStart(null)
      setZoneDragCurrent(null)
    }
  }

  // Debug log state
  const [debugLog, setDebugLog] = useState<string[]>([])
  const addDebug = (msg: string) => {
    setDebugLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${msg}`])
  }

  // Manejar drag de elemento
  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    addDebug(`mouseDown on "${elementId}" | readOnly=${readOnly} | tool=${selectedTool}`)
    if (readOnly) return
    e.preventDefault()
    e.stopPropagation()
    setSelectedElement(elementId)
    if (selectedTool === 'select') {
      dragStartDataRef.current = data // snapshot for undo
      setIsDragging(true)
      addDebug(`DRAG START: element=${elementId}`)
    }
  }

  // Limpiar todo
  const clearAll = () => {
    updateData({ ...emptyDiagramData, pitchType: data.pitchType })
    setPlayerCounter({ team1: 1, team2: 1, gk: 1 })
    setSelectedElement(null)
    setArrowStart(null)
  }

  // Renderizar elemento
  const renderElement = (element: DiagramElement) => {
    const { id, type, position, label, color } = element
    const isSelected = selectedElement === id
    const size = ELEMENT_SIZES[type as keyof typeof ELEMENT_SIZES] || 24

    const commonProps = {
      key: id,
      style: { cursor: readOnly ? 'default' : 'move', pointerEvents: 'all' as const },
      onMouseDown: (e: React.MouseEvent) => handleElementMouseDown(e, id),
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
    }

    switch (type) {
      case 'player':
      case 'opponent':
      case 'player_gk':
        return (
          <g {...commonProps} transform={`translate(${position.x}, ${position.y})`}>
            {/* Sombra */}
            <circle cx="2" cy="2" r={size / 2} fill="rgba(0,0,0,0.3)" />
            {/* Circulo principal */}
            <circle
              cx="0"
              cy="0"
              r={size / 2}
              fill={color}
              stroke={isSelected ? '#FFFF00' : '#FFFFFF'}
              strokeWidth={isSelected ? 3 : 2}
            />
            {/* Numero/Label */}
            <text
              x="0"
              y="1"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#FFFFFF"
              fontSize={type === 'player_gk' ? 8 : 10}
              fontWeight="bold"
              fontFamily="Arial"
            >
              {label}
            </text>
          </g>
        )

      case 'cone':
        return (
          <g {...commonProps} transform={`translate(${position.x}, ${position.y})`}>
            <polygon
              points="0,-10 8,8 -8,8"
              fill={color}
              stroke={isSelected ? '#FFFF00' : '#000000'}
              strokeWidth={isSelected ? 2 : 1}
            />
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
          <g
            {...commonProps}
            transform={`translate(${position.x}, ${position.y}) rotate(${element.rotation || 0})`}
            onDoubleClick={(e) => {
              if (readOnly || selectedTool !== 'select') return
              e.stopPropagation()
              const newRotation = ((element.rotation || 0) + 90) % 360
              updateData({
                ...data,
                elements: data.elements.map(el =>
                  el.id === id ? { ...el, rotation: newRotation } : el
                ),
              })
            }}
          >
            <rect
              x="-20"
              y="-12"
              width="40"
              height="24"
              fill="none"
              stroke={isSelected ? '#FFFF00' : '#FFFFFF'}
              strokeWidth={isSelected ? 3 : 2}
            />
            {/* Red */}
            <line x1="-20" y1="-12" x2="-15" y2="12" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
            <line x1="20" y1="-12" x2="15" y2="12" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
          </g>
        )

      default:
        return null
    }
  }

  // Renderizar flecha
  const renderArrow = (arrow: DiagramArrow) => {
    const { id, from, to, type, color } = arrow
    const isSelected = selectedElement === id

    // Calcular angulo para la punta de flecha
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    const arrowSize = 10
    const tipX = to.x - arrowSize * Math.cos(angle)
    const tipY = to.y - arrowSize * Math.sin(angle)

    return (
      <g key={id} onClick={(e) => { e.stopPropagation(); if (!readOnly) setSelectedElement(id) }} style={{ cursor: readOnly ? 'default' : 'pointer' }}>
        {/* Invisible thick hit area for easier clicking */}
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke="transparent"
          strokeWidth={14}
          pointerEvents="stroke"
        />
        {/* Linea visible */}
        <line
          x1={from.x}
          y1={from.y}
          x2={tipX}
          y2={tipY}
          stroke={color || '#FFFFFF'}
          strokeWidth={isSelected ? 4 : 2}
          strokeDasharray={type === 'pass' ? '8,4' : 'none'}
          pointerEvents="none"
        />
        {/* Punta de flecha */}
        <polygon
          points={`
            ${to.x},${to.y}
            ${to.x - arrowSize * Math.cos(angle - Math.PI / 6)},${to.y - arrowSize * Math.sin(angle - Math.PI / 6)}
            ${to.x - arrowSize * Math.cos(angle + Math.PI / 6)},${to.y - arrowSize * Math.sin(angle + Math.PI / 6)}
          `}
          fill={color || '#FFFFFF'}
          pointerEvents="none"
        />
        {/* Selection indicator */}
        {isSelected && (
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#FFFF00"
            strokeWidth={2}
            strokeDasharray="4,4"
            opacity={0.7}
            pointerEvents="none"
          />
        )}
      </g>
    )
  }

  // Renderizar zona
  const renderZone = (zone: DiagramZone) => {
    const { id, position, width, height, color, opacity, shape } = zone
    const isSelected = selectedElement === id

    return (
      <g
        key={id}
        onClick={(e) => { e.stopPropagation(); setSelectedElement(id) }}
        style={{ cursor: 'pointer' }}
      >
        {shape === 'ellipse' ? (
          <ellipse
            cx={position.x + width / 2}
            cy={position.y + height / 2}
            rx={width / 2}
            ry={height / 2}
            fill={color}
            opacity={opacity || 0.3}
            stroke={isSelected ? '#FFFF00' : 'none'}
            strokeWidth={isSelected ? 2 : 0}
            strokeDasharray={isSelected ? '6,3' : 'none'}
          />
        ) : (
          <rect
            x={position.x}
            y={position.y}
            width={width}
            height={height}
            fill={color}
            opacity={opacity || 0.3}
            stroke={isSelected ? '#FFFF00' : 'none'}
            strokeWidth={isSelected ? 2 : 0}
            strokeDasharray={isSelected ? '6,3' : 'none'}
          />
        )}
      </g>
    )
  }

  // Zone drag preview
  const renderZoneDragPreview = () => {
    if (!zoneDragStart || !zoneDragCurrent) return null
    const x = Math.min(zoneDragStart.x, zoneDragCurrent.x)
    const y = Math.min(zoneDragStart.y, zoneDragCurrent.y)
    const w = Math.abs(zoneDragCurrent.x - zoneDragStart.x)
    const h = Math.abs(zoneDragCurrent.y - zoneDragStart.y)

    if (selectedTool === 'zone_circle') {
      return (
        <ellipse
          cx={x + w / 2}
          cy={y + h / 2}
          rx={w / 2}
          ry={h / 2}
          fill={zoneColor}
          opacity={0.3}
          stroke="#FFFF00"
          strokeWidth="1"
          strokeDasharray="4,2"
        />
      )
    }
    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={zoneColor}
        opacity={0.3}
        stroke="#FFFF00"
        strokeWidth="1"
        strokeDasharray="4,2"
      />
    )
  }

  const isZoneTool = selectedTool === 'zone_rect' || selectedTool === 'zone_circle'

  // Separator component
  const Sep = () => <div className="w-px h-6 bg-gray-700 mx-0.5" />

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-900 rounded-lg">
      {/* Select */}
      <ToolButton
        active={selectedTool === 'select'}
        onClick={() => { setSelectedTool('select'); setArrowStart(null) }}
        icon={<MousePointer className="h-4 w-4" />}
        label="Seleccionar"
        fullscreen={isFullscreen}
      />

      <Sep />

      {/* Players */}
      <ToolButton
        active={selectedTool === 'player'}
        onClick={() => { setSelectedTool('player'); setArrowStart(null) }}
        icon={<Circle className="h-4 w-4" />}
        label="Jugador"
        color={TEAM_COLORS.team1}
        fullscreen={isFullscreen}
      />
      <ToolButton
        active={selectedTool === 'opponent'}
        onClick={() => { setSelectedTool('opponent'); setArrowStart(null) }}
        icon={<Circle className="h-4 w-4" />}
        label="Rival"
        color={TEAM_COLORS.team2}
        fullscreen={isFullscreen}
      />
      <ToolButton
        active={selectedTool === 'player_gk'}
        onClick={() => { setSelectedTool('player_gk'); setArrowStart(null) }}
        icon={<Circle className="h-4 w-4" />}
        label="Portero"
        color={TEAM_COLORS.goalkeeper}
        fullscreen={isFullscreen}
      />

      <Sep />

      {/* Objects */}
      <ToolButton
        active={selectedTool === 'cone'}
        onClick={() => { setSelectedTool('cone'); setArrowStart(null) }}
        icon={<Triangle className="h-4 w-4" />}
        label="Cono"
        color="#FF6B00"
        fullscreen={isFullscreen}
      />
      <ToolButton
        active={selectedTool === 'ball'}
        onClick={() => { setSelectedTool('ball'); setArrowStart(null) }}
        icon={<Target className="h-4 w-4" />}
        label="Balon"
        fullscreen={isFullscreen}
      />
      <ToolButton
        active={selectedTool === 'mini_goal'}
        onClick={() => { setSelectedTool('mini_goal'); setArrowStart(null) }}
        icon={<Minus className="h-4 w-4 rotate-90" />}
        label="Mini"
        fullscreen={isFullscreen}
      />

      <Sep />

      {/* Arrows */}
      <ToolButton
        active={selectedTool === 'arrow_movement'}
        onClick={() => { setSelectedTool('arrow_movement'); setArrowStart(null) }}
        icon={<ArrowRight className="h-4 w-4" />}
        label="Movimiento"
        color="#FFFF00"
        fullscreen={isFullscreen}
      />
      <ToolButton
        active={selectedTool === 'arrow_pass'}
        onClick={() => { setSelectedTool('arrow_pass'); setArrowStart(null) }}
        icon={<ArrowRight className="h-4 w-4" />}
        label="Pase"
        color="#FFFFFF"
        fullscreen={isFullscreen}
      />

      <Sep />

      {/* Zones */}
      <ToolButton
        active={selectedTool === 'zone_rect'}
        onClick={() => { setSelectedTool('zone_rect'); setArrowStart(null) }}
        icon={<Square className="h-4 w-4" />}
        label="Zona"
        color={zoneColor}
        fullscreen={isFullscreen}
      />
      <ToolButton
        active={selectedTool === 'zone_circle'}
        onClick={() => { setSelectedTool('zone_circle'); setArrowStart(null) }}
        icon={<Circle className="h-4 w-4" />}
        label="Elipse"
        color={zoneColor}
        fullscreen={isFullscreen}
      />

      {/* Zone color picker — only visible when zone tool active */}
      {isZoneTool && (
        <div className="flex items-center gap-0.5 ml-1">
          {ZONE_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setZoneColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${
                zoneColor === c ? 'border-yellow-400 scale-110' : 'border-gray-600'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      )}

      <div className="flex-1" />

      {/* Undo/Redo */}
      <button
        onClick={undo}
        disabled={historyIndex < 0}
        className="p-1.5 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        title="Deshacer (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <button
        onClick={redo}
        disabled={historyIndex >= history.length - 1}
        className="p-1.5 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        title="Rehacer (Ctrl+Shift+Z)"
      >
        <Redo2 className="h-4 w-4" />
      </button>

      <Sep />

      {/* Delete & Clear */}
      <button
        onClick={deleteSelected}
        disabled={!selectedElement}
        className="p-1.5 rounded-md text-gray-400 hover:bg-red-900/50 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Eliminar seleccionado (Delete)"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <button
        onClick={clearAll}
        className="p-1.5 rounded-md text-gray-400 hover:bg-red-900/50 hover:text-red-400"
        title="Limpiar todo"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="p-1.5 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white"
        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (Modo Pro)'}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  )

  const pitchContent = (
    <g>
      {/* Zonas primero (fondo) */}
      {data.zones.map(renderZone)}

      {/* Zone drag preview */}
      {renderZoneDragPreview()}

      {/* Flechas */}
      {data.arrows.map(renderArrow)}

      {/* Flecha temporal mientras se dibuja */}
      {arrowStart && (
        <circle cx={arrowStart.x} cy={arrowStart.y} r="5" fill="#FFFF00" />
      )}

      {/* Elementos */}
      {data.elements.map(renderElement)}
    </g>
  )

  const instructions = !readOnly && selectedTool !== 'select' && (
    <div className={`text-sm px-2 py-1 ${isFullscreen ? 'text-gray-300' : 'text-gray-500'}`}>
      {selectedTool.startsWith('arrow_')
        ? arrowStart
          ? 'Haz click en el destino de la flecha'
          : 'Haz click en el origen de la flecha'
        : isZoneTool
          ? 'Click y arrastra para dibujar la zona'
          : `Haz click en el campo para colocar: ${selectedTool === 'mini_goal' ? 'Mini porteria' : selectedTool}`}
    </div>
  )

  const info = (
    <div className={`flex items-center justify-between text-xs ${isFullscreen ? 'text-gray-400' : 'text-gray-400'}`}>
      <span>
        {data.elements.length} elementos, {data.arrows.length} flechas, {data.zones.length} zonas
      </span>
      {!readOnly && selectedElement && (
        <span>Seleccionado — Delete para eliminar</span>
      )}
    </div>
  )

  // Fullscreen Pro Mode
  if (isFullscreen) {
    return (
      <div ref={containerRef} className="fixed inset-0 z-[70] bg-gray-950 flex flex-col">
        {/* Fullscreen header */}
        <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">Pizarra Tactica — Modo Pro</span>
            {instructions}
          </div>
          <button
            onClick={() => setIsFullscreen(false)}
            className="px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg"
          >
            Cerrar (Esc)
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2">
          {toolbar}
        </div>

        {/* Pitch — fills remaining space */}
        <div
          className="flex-1 flex items-center justify-center p-4 overflow-hidden select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setZoneDragStart(null); setZoneDragCurrent(null) }}
        >
          <FootballPitch
            ref={svgRef}
            type={data.pitchType}
            height="100%"
            className="max-w-full max-h-full"
            onClick={handlePitchClick}
            onMouseDown={handlePitchMouseDown}
          >
            {pitchContent}
          </FootballPitch>
        </div>

        {/* Info */}
        <div className="px-4 py-2 border-t border-gray-800">
          {info}
        </div>
      </div>
    )
  }

  // Normal mode — responsive
  return (
    <div className="space-y-2">
      {/* Toolbar */}
      {!readOnly && toolbar}

      {/* Instrucciones */}
      {instructions}

      {/* Campo de futbol — responsive, fills container width */}
      <div
        className="border border-gray-300 rounded-lg overflow-hidden bg-gray-900 select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setZoneDragStart(null); setZoneDragCurrent(null) }}
      >
        <FootballPitch
          ref={svgRef}
          type={data.pitchType}
          onClick={handlePitchClick}
          onMouseDown={handlePitchMouseDown}
        >
          {pitchContent}
        </FootballPitch>
      </div>

      {/* Info */}
      {info}

      {/* Debug panel — REMOVE after fixing */}
      <div className="mt-2 p-3 bg-gray-900 rounded-lg text-xs font-mono text-green-400 max-h-48 overflow-auto">
        <div className="font-bold text-yellow-400 mb-1">DEBUG: readOnly={String(readOnly)} | tool={selectedTool} | selected={selectedElement || 'none'} | dragging={String(isDragging)} | elements={data.elements.length}</div>
        {debugLog.length === 0 && <div className="text-gray-500">Haz click en un elemento para ver los eventos...</div>}
        {debugLog.map((log, i) => <div key={i}>{log}</div>)}
      </div>
    </div>
  )
}

// Toolbar button component
function ToolButton({
  active,
  onClick,
  icon,
  label,
  color,
  fullscreen = false,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  color?: string
  fullscreen?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? 'bg-white text-gray-900'
          : 'text-gray-300 hover:bg-gray-700'
      }`}
      title={label}
    >
      <span style={{ color: active ? (color || '#111') : color }}>
        {icon}
      </span>
      <span className={fullscreen ? '' : 'hidden sm:inline'}>{label}</span>
    </button>
  )
}
