'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Circle, Triangle, Target, Trash2, RotateCcw, MousePointer,
  ArrowRight, Minus, Save, X, Settings2, Square, Undo2, Redo2,
} from 'lucide-react'
import ABPPitch from './ABPPitch'
import {
  DiagramElement, DiagramArrow, DiagramZone, ElementType, ArrowType,
  Position, TEAM_COLORS, ELEMENT_SIZES, generateId,
} from '@/components/tarea-editor/types'
import {
  ABPJugada, ABPFase, TipoABP, LadoABP, SubtipoABP,
  SistemaMarcaje, ABP_TIPOS, ABP_SUBTIPOS, ABP_ROLES, ABPPlayerRol,
} from '@/types'

type Tool =
  | 'select' | 'player' | 'opponent' | 'player_gk'
  | 'cone' | 'ball' | 'mini_goal'
  | 'arrow_movement' | 'arrow_pass'
  | 'zone_rect' | 'zone_circle'

interface ABPEditorProps {
  jugada?: Partial<ABPJugada>
  onSave: (data: Partial<ABPJugada>) => void
  onCancel: () => void
  saving?: boolean
}

// Role abbreviations for display on player circles
const ROLE_ABBREV: Record<ABPPlayerRol, string> = {
  lanzador: 'LAN',
  bloqueador: 'BLQ',
  palo_corto: 'PC',
  palo_largo: 'PL',
  borde_area: 'BA',
  'señuelo': 'SEÑ',
  rechace: 'RCH',
  referencia: 'REF',
  barrera: 'BAR',
  marcaje_zonal: 'MZ',
  marcaje_individual: 'MI',
  portero: 'GK',
  otro: '?',
}

const ZONE_COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#EAB308',
  '#F97316', '#A855F7', '#06B6D4', '#FFFFFF',
]

const MAX_HISTORY = 30

interface DiagramSnapshot {
  elements: DiagramElement[]
  arrows: DiagramArrow[]
  zones: DiagramZone[]
  elementRoles: Record<string, ABPPlayerRol>
}

function getPitchView(tipo: TipoABP): 'full' | 'half' {
  return tipo === 'falta_lejana' ? 'full' : 'half'
}

export default function ABPEditor({ jugada, onSave, onCancel, saving }: ABPEditorProps) {
  // Form state
  const [nombre, setNombre] = useState(jugada?.nombre || '')
  const [codigo, setCodigo] = useState(jugada?.codigo || '')
  const [tipo, setTipo] = useState<TipoABP>(jugada?.tipo || 'corner')
  const [lado, setLado] = useState<LadoABP>(jugada?.lado || 'ofensivo')
  const [subtipo, setSubtipo] = useState<SubtipoABP | ''>(jugada?.subtipo || '')
  const [descripcion, setDescripcion] = useState(jugada?.descripcion || '')
  const [senalCodigo, setSenalCodigo] = useState(jugada?.senal_codigo || '')
  const [sistemaMarcaje, setSistemaMarcaje] = useState<SistemaMarcaje | ''>(jugada?.sistema_marcaje || '')
  const [notasTacticas, setNotasTacticas] = useState(jugada?.notas_tacticas || '')
  const [tags, setTags] = useState<string[]>(jugada?.tags || [])
  const [tagInput, setTagInput] = useState('')

  // Single diagram
  const initialDiagram = jugada?.fases?.[0]?.diagram || { elements: [], arrows: [], zones: [], pitchType: 'half' }
  const [elements, setElements] = useState<DiagramElement[]>(initialDiagram.elements || [])
  const [arrows, setArrows] = useState<DiagramArrow[]>(initialDiagram.arrows || [])
  const [zones, setZones] = useState<DiagramZone[]>(initialDiagram.zones || [])

  // Role assignments per element (element_id → role)
  const initialRoles: Record<string, ABPPlayerRol> = {}
  jugada?.asignaciones?.forEach(a => {
    if (a.element_id && a.rol) initialRoles[a.element_id] = a.rol as ABPPlayerRol
  })
  const [elementRoles, setElementRoles] = useState<Record<string, ABPPlayerRol>>(initialRoles)

  // Editor state
  const [selectedTool, setSelectedTool] = useState<Tool>('select')
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [arrowStart, setArrowStart] = useState<Position | null>(null)
  const [playerCounter, setPlayerCounter] = useState({ team1: 1, team2: 1, gk: 1 })
  const [arrowCounter, setArrowCounter] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [zoneColor, setZoneColor] = useState(ZONE_COLORS[0])

  // Zone drawing state
  const [zoneDragStart, setZoneDragStart] = useState<Position | null>(null)
  const [zoneDragCurrent, setZoneDragCurrent] = useState<Position | null>(null)

  // Undo/Redo
  const [history, setHistory] = useState<DiagramSnapshot[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedoRef = useRef(false)

  const gRef = useRef<SVGGElement>(null)
  const pitchView = getPitchView(tipo)

  // Push snapshot to history before a change
  const pushHistory = useCallback(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false
      return
    }
    const snap: DiagramSnapshot = {
      elements: [...elements],
      arrows: [...arrows],
      zones: [...zones],
      elementRoles: { ...elementRoles },
    }
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1)
      trimmed.push(snap)
      if (trimmed.length > MAX_HISTORY) trimmed.shift()
      return trimmed
    })
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1))
  }, [elements, arrows, zones, elementRoles, historyIndex])

  // Undo
  const undo = useCallback(() => {
    if (historyIndex < 0) return
    const snap = history[historyIndex]
    if (!snap) return
    isUndoRedoRef.current = true
    setHistoryIndex(i => i - 1)
    setElements(snap.elements)
    setArrows(snap.arrows)
    setZones(snap.zones)
    setElementRoles(snap.elementRoles)
  }, [history, historyIndex])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const snap = history[historyIndex + 1]
    if (!snap) return
    isUndoRedoRef.current = true
    setHistoryIndex(i => i + 1)
    setElements(snap.elements)
    setArrows(snap.arrows)
    setZones(snap.zones)
    setElementRoles(snap.elementRoles)
  }, [history, historyIndex])

  // Delete selected
  const deleteSelected = useCallback(() => {
    if (!selectedElement) return
    pushHistory()
    setElements(prev => prev.filter(el => el.id !== selectedElement))
    setArrows(prev => prev.filter(ar => ar.id !== selectedElement))
    setZones(prev => prev.filter(z => z.id !== selectedElement))
    setElementRoles(prev => {
      const { [selectedElement]: _, ...rest } = prev
      return rest
    })
    setSelectedElement(null)
  }, [selectedElement, pushHistory])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [deleteSelected, undo, redo])

  // Get SVG coordinates from mouse event
  const getSvgPosition = useCallback((e: React.MouseEvent): Position => {
    const svg = gRef.current?.ownerSVGElement
    if (!svg) return { x: 0, y: 0 }
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(ctm.inverse())
    return {
      x: Math.round(svgPt.x),
      y: Math.round(svgPt.y),
    }
  }, [])

  // Click on pitch
  const handlePitchClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const pos = getSvgPosition(e)
    if (pos.x === 0 && pos.y === 0) return

    if (selectedTool.startsWith('arrow_')) {
      if (!arrowStart) {
        setArrowStart(pos)
      } else {
        pushHistory()
        const arrowType: ArrowType = selectedTool === 'arrow_pass' ? 'pass' : 'movement'
        const num = arrowCounter
        setArrowCounter(prev => prev + 1)
        const newArrow: DiagramArrow = {
          id: generateId(),
          type: arrowType,
          from: arrowStart,
          to: pos,
          color: arrowType === 'pass' ? '#FFFFFF' : '#FFFF00',
          label: String(num),
        }
        setArrows(prev => [...prev, newArrow])
        setArrowStart(null)
      }
      return
    }

    // Zone tools use mouseDown/mouseUp
    if (selectedTool === 'zone_rect' || selectedTool === 'zone_circle') return

    if (selectedTool === 'select') {
      setSelectedElement(null)
      return
    }

    pushHistory()
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
    setElements(prev => [...prev, newElement])
  }, [selectedTool, arrowStart, arrowCounter, playerCounter, getSvgPosition, pushHistory])

  // Zone drawing: mousedown starts drag
  const handlePitchMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (selectedTool !== 'zone_rect' && selectedTool !== 'zone_circle') return
    const pos = getSvgPosition(e)
    setZoneDragStart(pos)
    setZoneDragCurrent(pos)
  }, [selectedTool, getSvgPosition])

  // Mouse move: zone drag preview or element dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (zoneDragStart && (selectedTool === 'zone_rect' || selectedTool === 'zone_circle')) {
      const pos = getSvgPosition(e)
      setZoneDragCurrent(pos)
      return
    }
    if (!isDragging || !selectedElement) return
    const pos = getSvgPosition(e)
    if (pos.x === 0 && pos.y === 0) return
    setElements(prev => prev.map(el =>
      el.id === selectedElement ? { ...el, position: pos } : el
    ))
  }, [isDragging, selectedElement, getSvgPosition, zoneDragStart, selectedTool])

  // Mouse up: finish zone drag or element drag
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (zoneDragStart && zoneDragCurrent && (selectedTool === 'zone_rect' || selectedTool === 'zone_circle')) {
      const pos = getSvgPosition(e)
      const x = Math.min(zoneDragStart.x, pos.x)
      const y = Math.min(zoneDragStart.y, pos.y)
      const w = Math.abs(pos.x - zoneDragStart.x)
      const h = Math.abs(pos.y - zoneDragStart.y)

      if (w > 5 && h > 5) {
        pushHistory()
        const newZone: DiagramZone = {
          id: generateId(),
          position: { x, y },
          width: w,
          height: h,
          color: zoneColor,
          opacity: 0.3,
          shape: selectedTool === 'zone_circle' ? 'ellipse' : 'rectangle',
        }
        setZones(prev => [...prev, newZone])
      }
      setZoneDragStart(null)
      setZoneDragCurrent(null)
      return
    }
    setIsDragging(false)
  }, [zoneDragStart, zoneDragCurrent, selectedTool, getSvgPosition, zoneColor, pushHistory])

  // Drag element
  const handleElementMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    setSelectedElement(elementId)
    if (selectedTool === 'select') setIsDragging(true)
  }, [selectedTool])

  const clearDiagram = () => {
    pushHistory()
    setElements([])
    setArrows([])
    setZones([])
    setElementRoles({})
    setPlayerCounter({ team1: 1, team2: 1, gk: 1 })
    setArrowCounter(1)
    setSelectedElement(null)
    setArrowStart(null)
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const setRole = (elementId: string, role: ABPPlayerRol | '') => {
    pushHistory()
    if (!role) {
      const { [elementId]: _, ...rest } = elementRoles
      setElementRoles(rest)
    } else {
      setElementRoles(prev => ({ ...prev, [elementId]: role }))
    }
  }

  // Save
  const handleSave = () => {
    if (!nombre.trim()) return
    const diagram = { elements, arrows, zones, pitchType: pitchView }
    const fase: ABPFase = {
      id: jugada?.fases?.[0]?.id || generateId(),
      nombre: 'Principal',
      orden: 0,
      diagram,
    }
    const asignaciones = Object.entries(elementRoles).map(([element_id, rol]) => ({
      element_id,
      rol,
    }))
    onSave({
      nombre: nombre.trim(),
      codigo: codigo.trim() || undefined,
      tipo,
      lado,
      subtipo: subtipo || undefined,
      descripcion: descripcion.trim() || undefined,
      senal_codigo: senalCodigo.trim() || undefined,
      sistema_marcaje: sistemaMarcaje || undefined,
      notas_tacticas: notasTacticas.trim() || undefined,
      fases: [fase],
      asignaciones,
      tags,
    })
  }

  const getElementLabel = (element: DiagramElement): string => {
    const role = elementRoles[element.id]
    if (role) return ROLE_ABBREV[role]
    return element.label || ''
  }

  const selectedEl = elements.find(e => e.id === selectedElement)
  const isPlayerType = selectedEl && (selectedEl.type === 'player' || selectedEl.type === 'opponent' || selectedEl.type === 'player_gk')
  const isZoneTool = selectedTool === 'zone_rect' || selectedTool === 'zone_circle'

  // ============ Renderers ============

  const renderElement = (element: DiagramElement) => {
    const { id, type, position, color } = element
    const isSelected = selectedElement === id
    const size = ELEMENT_SIZES[type as keyof typeof ELEMENT_SIZES] || 24
    const displayLabel = getElementLabel(element)
    const hasRole = !!elementRoles[id]

    const commonProps = {
      key: id,
      style: { cursor: 'move' } as React.CSSProperties,
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
            <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontSize={hasRole ? 7 : 10} fontWeight="bold" fontFamily="Arial">
              {displayLabel}
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
    const isSelected = selectedElement === id
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    const arrowSize = 10
    const tipX = to.x - arrowSize * Math.cos(angle)
    const tipY = to.y - arrowSize * Math.sin(angle)
    const midX = (from.x + to.x) / 2
    const midY = (from.y + to.y) / 2
    const num = arrow.label || ''

    return (
      <g key={id} onClick={(e) => { e.stopPropagation(); setSelectedElement(id) }} style={{ cursor: 'pointer' }}>
        <line x1={from.x} y1={from.y} x2={tipX} y2={tipY}
          stroke={color || '#FFFFFF'} strokeWidth={isSelected ? 4 : 2.5}
          strokeDasharray={type === 'pass' ? '8,4' : 'none'}
        />
        <polygon
          points={`${to.x},${to.y} ${to.x - arrowSize * Math.cos(angle - Math.PI / 6)},${to.y - arrowSize * Math.sin(angle - Math.PI / 6)} ${to.x - arrowSize * Math.cos(angle + Math.PI / 6)},${to.y - arrowSize * Math.sin(angle + Math.PI / 6)}`}
          fill={color || '#FFFFFF'}
        />
        {num && (
          <>
            <circle cx={midX} cy={midY} r="10" fill="rgba(0,0,0,0.7)" />
            <text x={midX} y={midY + 1} textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="Arial">
              {num}
            </text>
          </>
        )}
      </g>
    )
  }

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

  const renderZoneDragPreview = () => {
    if (!zoneDragStart || !zoneDragCurrent) return null
    const x = Math.min(zoneDragStart.x, zoneDragCurrent.x)
    const y = Math.min(zoneDragStart.y, zoneDragCurrent.y)
    const w = Math.abs(zoneDragCurrent.x - zoneDragStart.x)
    const h = Math.abs(zoneDragCurrent.y - zoneDragStart.y)

    if (selectedTool === 'zone_circle') {
      return (
        <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2}
          fill={zoneColor} opacity={0.3} stroke="#FFFF00" strokeWidth="1" strokeDasharray="4,2" />
      )
    }
    return (
      <rect x={x} y={y} width={w} height={h}
        fill={zoneColor} opacity={0.3} stroke="#FFFF00" strokeWidth="1" strokeDasharray="4,2" />
    )
  }

  // Separator
  const Sep = () => <div className="w-px h-6 bg-gray-200 mx-0.5" />

  // Toolbar button
  const TB = ({ id, icon, label, color: c }: { id: Tool; icon: React.ReactNode; label: string; color?: string }) => (
    <button
      onClick={() => { setSelectedTool(id); setArrowStart(null) }}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        selectedTool === id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      title={label}
    >
      <span style={{ color: selectedTool === id ? 'white' : c }}>{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
        <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <X className="h-5 w-5" />
        </button>
        <input
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Nombre de la jugada..."
          className="flex-1 text-lg font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300"
          autoFocus
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoABP)} className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
            {ABP_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={lado} onChange={e => setLado(e.target.value as LadoABP)} className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
            <option value="ofensivo">Ofensivo</option>
            <option value="defensivo">Defensivo</option>
          </select>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="Mas opciones"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={!nombre.trim() || saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Collapsible settings panel */}
      {showSettings && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 max-w-5xl">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Codigo</label>
              <input value={codigo} onChange={e => setCodigo(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg" placeholder="COR-OF-01" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Subtipo</label>
              <select value={subtipo} onChange={e => setSubtipo(e.target.value as SubtipoABP)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
                <option value="">—</option>
                {ABP_SUBTIPOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Senal</label>
              <input value={senalCodigo} onChange={e => setSenalCodigo(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg" placeholder="Mano arriba" />
            </div>
            {lado === 'defensivo' && (
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Marcaje</label>
                <select value={sistemaMarcaje} onChange={e => setSistemaMarcaje(e.target.value as SistemaMarcaje)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white">
                  <option value="">—</option>
                  <option value="zonal">Zonal</option>
                  <option value="individual">Individual</option>
                  <option value="mixto">Mixto</option>
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Descripcion</label>
              <input value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg" placeholder="Descripcion breve..." />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Notas tacticas</label>
              <input value={notasTacticas} onChange={e => setNotasTacticas(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg" placeholder="Notas..." />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Etiquetas</label>
              <div className="flex items-center gap-1">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-700 rounded-full">
                    {tag}
                    <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-red-500"><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 min-w-[60px] px-2 py-0.5 text-[10px] border border-gray-200 rounded"
                  placeholder="+ etiqueta"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar + role selector */}
      <div className="px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex flex-wrap items-center gap-1">
          {/* Select */}
          <TB id="select" icon={<MousePointer className="h-4 w-4" />} label="Seleccionar" />

          <Sep />

          {/* Players */}
          <TB id="player" icon={<Circle className="h-4 w-4" />} label="Jugador" color={TEAM_COLORS.team1} />
          <TB id="opponent" icon={<Circle className="h-4 w-4" />} label="Rival" color={TEAM_COLORS.team2} />
          <TB id="player_gk" icon={<Circle className="h-4 w-4" />} label="Portero" color={TEAM_COLORS.goalkeeper} />

          <Sep />

          {/* Objects */}
          <TB id="cone" icon={<Triangle className="h-4 w-4" />} label="Cono" color="#FF6B00" />
          <TB id="ball" icon={<Target className="h-4 w-4" />} label="Balon" />
          <TB id="mini_goal" icon={<Minus className="h-4 w-4 rotate-90" />} label="Mini" />

          <Sep />

          {/* Arrows */}
          <TB id="arrow_movement" icon={<ArrowRight className="h-4 w-4" />} label="Movimiento" color="#FFFF00" />
          <TB id="arrow_pass" icon={<ArrowRight className="h-4 w-4" />} label="Pase" color="#FFFFFF" />

          <Sep />

          {/* Zones */}
          <TB id="zone_rect" icon={<Square className="h-4 w-4" />} label="Zona" color={zoneColor} />
          <TB id="zone_circle" icon={<Circle className="h-4 w-4" />} label="Elipse" color={zoneColor} />

          {/* Zone color picker */}
          {isZoneTool && (
            <div className="flex items-center gap-0.5 ml-1">
              {ZONE_COLORS.map(c => (
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
          <button onClick={deleteSelected} disabled={!selectedElement} className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-red-100 disabled:opacity-30" title="Eliminar (Delete)">
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={clearDiagram} className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-red-100" title="Limpiar todo">
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Role selector — appears when a player element is selected */}
          {isPlayerType && selectedEl && (
            <>
              <Sep />
              <span className="text-xs text-gray-500">Rol:</span>
              <select
                value={elementRoles[selectedEl.id] || ''}
                onChange={e => setRole(selectedEl.id, e.target.value as ABPPlayerRol | '')}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Sin rol</option>
                {ABP_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </>
          )}

          <div className="flex-1" />
          <span className="text-[10px] text-gray-400">{elements.length} elem, {arrows.length} flechas, {zones.length} zonas</span>
        </div>

        {/* Instructions */}
        {selectedTool !== 'select' && (
          <div className="text-[11px] text-gray-500 mt-1">
            {selectedTool.startsWith('arrow_')
              ? arrowStart
                ? '2. Click en el destino de la flecha'
                : '1. Click en el origen de la flecha'
              : isZoneTool
                ? 'Click y arrastra para dibujar la zona'
                : `Click en el campo para colocar: ${selectedTool === 'mini_goal' ? 'Mini porteria' : selectedTool}`}
          </div>
        )}
      </div>

      {/* Pitch — fills all remaining space */}
      <div
        className="flex-1 min-h-0 bg-green-900 overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsDragging(false); setZoneDragStart(null); setZoneDragCurrent(null) }}
      >
        <ABPPitch
          type={pitchView}
          className="w-full h-full"
          onClick={handlePitchClick}
          onMouseDown={handlePitchMouseDown}
        >
          <g ref={gRef}>
            {/* Zones first (background) */}
            {zones.map(renderZone)}
            {renderZoneDragPreview()}

            {/* Arrows */}
            {arrows.map(renderArrow)}
            {arrowStart && (
              <circle cx={arrowStart.x} cy={arrowStart.y} r="6" fill="#FFFF00" stroke="#000" strokeWidth="1" opacity="0.8" />
            )}

            {/* Elements on top */}
            {elements.map(renderElement)}
          </g>
        </ABPPitch>
      </div>
    </div>
  )
}
