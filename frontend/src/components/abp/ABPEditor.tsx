'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Circle, Triangle, Target, Trash2, RotateCcw, MousePointer,
  ArrowRight, Minus, Save, X, ChevronDown, ChevronUp, Settings2,
} from 'lucide-react'
import ABPPitch from './ABPPitch'
import {
  DiagramElement, DiagramArrow, ElementType, ArrowType,
  Position, TEAM_COLORS, ELEMENT_SIZES, generateId,
} from '@/components/tarea-editor/types'
import {
  ABPJugada, ABPFase, TipoABP, LadoABP, SubtipoABP,
  SistemaMarcaje, ABP_TIPOS, ABP_SUBTIPOS, ABP_ROLES, ABPPlayerRol,
} from '@/types'

type Tool = 'select' | 'player' | 'opponent' | 'player_gk' | 'cone' | 'ball' | 'mini_goal' | 'arrow_movement' | 'arrow_pass'

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

  const gRef = useRef<SVGGElement>(null)
  const pitchView = getPitchView(tipo)

  // Get SVG coordinates from mouse event — uses getScreenCTM for accurate
  // coordinate mapping that handles preserveAspectRatio padding correctly
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

    if (selectedTool === 'select') {
      setSelectedElement(null)
      return
    }

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
  }, [selectedTool, arrowStart, arrowCounter, playerCounter, getSvgPosition])

  // Drag
  const handleElementMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    setSelectedElement(elementId)
    if (selectedTool === 'select') setIsDragging(true)
  }, [selectedTool])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedElement) return
    const pos = getSvgPosition(e)
    if (pos.x === 0 && pos.y === 0) return
    setElements(prev => prev.map(el =>
      el.id === selectedElement ? { ...el, position: pos } : el
    ))
  }, [isDragging, selectedElement, getSvgPosition])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  const deleteSelected = () => {
    if (!selectedElement) return
    setElements(prev => prev.filter(el => el.id !== selectedElement))
    setArrows(prev => prev.filter(ar => ar.id !== selectedElement))
    const { [selectedElement]: _, ...rest } = elementRoles
    setElementRoles(rest)
    setSelectedElement(null)
  }

  const clearDiagram = () => {
    setElements([])
    setArrows([])
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

  // Assign role to selected element
  const setRole = (elementId: string, role: ABPPlayerRol | '') => {
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
    const diagram = { elements, arrows, zones: [], pitchType: pitchView }
    const fase: ABPFase = {
      id: jugada?.fases?.[0]?.id || generateId(),
      nombre: 'Principal',
      orden: 0,
      diagram,
    }
    // Build asignaciones from elementRoles
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

  // Get the display label for an element (role abbreviation or number)
  const getElementLabel = (element: DiagramElement): string => {
    const role = elementRoles[element.id]
    if (role) return ROLE_ABBREV[role]
    return element.label || ''
  }

  // Selected element info for role panel
  const selectedEl = elements.find(e => e.id === selectedElement)
  const isPlayerType = selectedEl && (selectedEl.type === 'player' || selectedEl.type === 'opponent' || selectedEl.type === 'player_gk')

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
      <g key={id} onClick={() => setSelectedElement(id)} style={{ cursor: 'pointer' }}>
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
          {/* Quick tipo/lado selectors inline */}
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
        <div className="flex flex-wrap items-center gap-1.5">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => { setSelectedTool(tool.id); setArrowStart(null) }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedTool === tool.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={tool.label}
            >
              <span style={{ color: selectedTool === tool.id ? 'white' : tool.color }}>{tool.icon}</span>
              <span className="hidden lg:inline">{tool.label}</span>
            </button>
          ))}
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button onClick={deleteSelected} disabled={!selectedElement} className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-red-100 disabled:opacity-30" title="Eliminar">
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={clearDiagram} className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-red-100" title="Limpiar todo">
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Role selector — appears when a player element is selected */}
          {isPlayerType && selectedEl && (
            <>
              <div className="w-px h-6 bg-gray-200 mx-1" />
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
          <span className="text-[10px] text-gray-400">{elements.length} elem, {arrows.length} flechas</span>
        </div>

        {/* Instructions */}
        {selectedTool !== 'select' && (
          <div className="text-[11px] text-gray-500 mt-1">
            {selectedTool.startsWith('arrow_')
              ? arrowStart
                ? '2. Click en el destino de la flecha'
                : '1. Click en el origen de la flecha'
              : `Click en el campo para colocar: ${tools.find(t => t.id === selectedTool)?.label}`}
          </div>
        )}
      </div>

      {/* Pitch — fills all remaining space */}
      <div
        className="flex-1 min-h-0 bg-green-900 overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <ABPPitch
          type={pitchView}
          className="w-full h-full"
          onClick={handlePitchClick}
        >
          <g ref={gRef}>
            {arrows.map(arrow => renderArrow(arrow))}
            {arrowStart && (
              <circle cx={arrowStart.x} cy={arrowStart.y} r="6" fill="#FFFF00" stroke="#000" strokeWidth="1" opacity="0.8" />
            )}
            {elements.map(renderElement)}
          </g>
        </ABPPitch>
      </div>
    </div>
  )
}
