'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Circle,
  Triangle,
  Target,
  Move,
  Trash2,
  RotateCcw,
  Download,
  MousePointer,
  ArrowRight,
  Minus,
} from 'lucide-react'
import FootballPitch from './FootballPitch'
import {
  DiagramData,
  DiagramElement,
  DiagramArrow,
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

type Tool = 'select' | 'player' | 'opponent' | 'player_gk' | 'cone' | 'ball' | 'mini_goal' | 'arrow_movement' | 'arrow_pass'

export default function TareaGraphicEditor({
  value = emptyDiagramData,
  onChange,
  readOnly = false,
}: TareaGraphicEditorProps) {
  const [data, setData] = useState<DiagramData>(value)
  const [selectedTool, setSelectedTool] = useState<Tool>('select')
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [arrowStart, setArrowStart] = useState<Position | null>(null)
  const [playerCounter, setPlayerCounter] = useState({ team1: 1, team2: 1, gk: 1 })

  const svgRef = useRef<SVGSVGElement>(null)

  // Actualizar datos y notificar al padre
  const updateData = useCallback((newData: DiagramData) => {
    setData(newData)
    onChange?.(newData)
  }, [onChange])

  // Obtener posicion relativa al SVG
  const getSvgPosition = (e: React.MouseEvent): Position => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    const viewBox = svgRef.current.viewBox.baseVal
    const scaleX = viewBox.width / rect.width
    const scaleY = viewBox.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  // Manejar click en el campo
  const handlePitchClick = (e: React.MouseEvent<SVGSVGElement>) => {
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

  // Manejar drag de elemento
  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (readOnly) return
    e.stopPropagation()
    setSelectedElement(elementId)
    if (selectedTool === 'select') {
      setIsDragging(true)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement) return
    const pos = getSvgPosition(e)
    updateData({
      ...data,
      elements: data.elements.map(el =>
        el.id === selectedElement ? { ...el, position: pos } : el
      ),
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Eliminar elemento seleccionado
  const deleteSelected = () => {
    if (!selectedElement) return
    updateData({
      ...data,
      elements: data.elements.filter(el => el.id !== selectedElement),
      arrows: data.arrows.filter(ar => ar.id !== selectedElement),
    })
    setSelectedElement(null)
  }

  // Limpiar todo
  const clearAll = () => {
    updateData(emptyDiagramData)
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
      style: { cursor: readOnly ? 'default' : 'move' },
      onMouseDown: (e: React.MouseEvent) => handleElementMouseDown(e, id),
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
          <g {...commonProps} transform={`translate(${position.x}, ${position.y})`}>
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
      <g key={id} onClick={() => setSelectedElement(id)} style={{ cursor: 'pointer' }}>
        {/* Linea */}
        <line
          x1={from.x}
          y1={from.y}
          x2={tipX}
          y2={tipY}
          stroke={color || '#FFFFFF'}
          strokeWidth={isSelected ? 4 : 2}
          strokeDasharray={type === 'pass' ? '8,4' : 'none'}
        />
        {/* Punta de flecha */}
        <polygon
          points={`
            ${to.x},${to.y}
            ${to.x - arrowSize * Math.cos(angle - Math.PI / 6)},${to.y - arrowSize * Math.sin(angle - Math.PI / 6)}
            ${to.x - arrowSize * Math.cos(angle + Math.PI / 6)},${to.y - arrowSize * Math.sin(angle + Math.PI / 6)}
          `}
          fill={color || '#FFFFFF'}
        />
      </g>
    )
  }

  // Herramientas disponibles
  const tools: { id: Tool; icon: React.ReactNode; label: string; color?: string }[] = [
    { id: 'select', icon: <MousePointer className="h-4 w-4" />, label: 'Seleccionar' },
    { id: 'player', icon: <Circle className="h-4 w-4" />, label: 'Jugador', color: TEAM_COLORS.team1 },
    { id: 'opponent', icon: <Circle className="h-4 w-4" />, label: 'Rival', color: TEAM_COLORS.team2 },
    { id: 'player_gk', icon: <Circle className="h-4 w-4" />, label: 'Portero', color: TEAM_COLORS.goalkeeper },
    { id: 'cone', icon: <Triangle className="h-4 w-4" />, label: 'Cono', color: '#FF6B00' },
    { id: 'ball', icon: <Target className="h-4 w-4" />, label: 'Balon' },
    { id: 'mini_goal', icon: <Minus className="h-4 w-4 rotate-90" />, label: 'Mini porteria' },
    { id: 'arrow_movement', icon: <ArrowRight className="h-4 w-4" />, label: 'Movimiento', color: '#FFFF00' },
    { id: 'arrow_pass', icon: <ArrowRight className="h-4 w-4" />, label: 'Pase', color: '#FFFFFF' },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-100 rounded-lg">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => {
                setSelectedTool(tool.id)
                setArrowStart(null)
              }}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTool === tool.id
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-200'
              }`}
              title={tool.label}
            >
              <span style={{ color: selectedTool === tool.id ? 'white' : tool.color }}>
                {tool.icon}
              </span>
              <span className="hidden sm:inline">{tool.label}</span>
            </button>
          ))}

          <div className="flex-1" />

          {/* Acciones */}
          <button
            onClick={deleteSelected}
            disabled={!selectedElement}
            className="p-2 rounded-lg bg-white text-gray-700 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Eliminar seleccionado"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={clearAll}
            className="p-2 rounded-lg bg-white text-gray-700 hover:bg-red-100 hover:text-red-600"
            title="Limpiar todo"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Instrucciones */}
      {!readOnly && selectedTool !== 'select' && (
        <div className="text-sm text-gray-500 px-2">
          {selectedTool.startsWith('arrow_')
            ? arrowStart
              ? 'Haz click en el destino de la flecha'
              : 'Haz click en el origen de la flecha'
            : `Haz click en el campo para colocar: ${tools.find(t => t.id === selectedTool)?.label}`}
        </div>
      )}

      {/* Campo de futbol */}
      <div
        className="border border-gray-300 rounded-lg overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <FootballPitch
          type={data.pitchType}
          width={600}
          height={450}
          onClick={handlePitchClick}
        >
          <g ref={svgRef as any}>
            {/* Zonas primero (fondo) */}
            {data.zones.map(zone => (
              <rect
                key={zone.id}
                x={zone.position.x}
                y={zone.position.y}
                width={zone.width}
                height={zone.height}
                fill={zone.color}
                opacity={zone.opacity || 0.3}
              />
            ))}

            {/* Flechas */}
            {data.arrows.map(renderArrow)}

            {/* Flecha temporal mientras se dibuja */}
            {arrowStart && (
              <circle cx={arrowStart.x} cy={arrowStart.y} r="5" fill="#FFFF00" />
            )}

            {/* Elementos */}
            {data.elements.map(renderElement)}
          </g>
        </FootballPitch>
      </div>

      {/* Info */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {data.elements.length} elementos, {data.arrows.length} flechas
        </span>
        {!readOnly && selectedElement && (
          <span>
            Elemento seleccionado - Presiona Supr o usa el boton para eliminar
          </span>
        )}
      </div>
    </div>
  )
}
