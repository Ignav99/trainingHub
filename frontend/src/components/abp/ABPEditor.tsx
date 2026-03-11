'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Circle, Triangle, Target, Trash2, RotateCcw, MousePointer,
  ArrowRight, Minus, Save, X,
} from 'lucide-react'
import FootballPitch from '@/components/tarea-editor/FootballPitch'
import {
  DiagramData, DiagramElement, DiagramArrow, ElementType, ArrowType,
  Position, TEAM_COLORS, ELEMENT_SIZES, generateId, emptyDiagramData,
} from '@/components/tarea-editor/types'
import ABPPhaseTimeline from './ABPPhaseTimeline'
import ABPPlayerAssigner from './ABPPlayerAssigner'
import {
  ABPJugada, ABPFase, ABPAsignacion, TipoABP, LadoABP, SubtipoABP,
  SistemaMarcaje, ABP_TIPOS, ABP_SUBTIPOS, ABP_ROLES,
} from '@/types'
import { Jugador } from '@/types'

type Tool = 'select' | 'player' | 'opponent' | 'player_gk' | 'cone' | 'ball' | 'mini_goal' | 'arrow_movement' | 'arrow_pass'

interface ABPEditorProps {
  jugada?: Partial<ABPJugada>
  jugadores?: Jugador[]
  onSave: (data: Partial<ABPJugada>) => void
  onCancel: () => void
  saving?: boolean
}

function createEmptyFase(orden: number): ABPFase {
  return {
    id: generateId(),
    nombre: orden === 0 ? 'Posicion inicial' : `Fase ${orden + 1}`,
    orden,
    diagram: { elements: [], arrows: [], zones: [], pitchType: 'half' },
  }
}

export default function ABPEditor({ jugada, jugadores = [], onSave, onCancel, saving }: ABPEditorProps) {
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

  // Fases state
  const [fases, setFases] = useState<ABPFase[]>(
    jugada?.fases?.length ? jugada.fases : [createEmptyFase(0)]
  )
  const [activeFaseId, setActiveFaseId] = useState<string>(
    jugada?.fases?.[0]?.id || fases[0].id
  )

  // Assignments
  const [asignaciones, setAsignaciones] = useState<ABPAsignacion[]>(jugada?.asignaciones || [])

  // Editor state
  const [selectedTool, setSelectedTool] = useState<Tool>('select')
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [arrowStart, setArrowStart] = useState<Position | null>(null)
  const [playerCounter, setPlayerCounter] = useState({ team1: 1, team2: 1, gk: 1 })

  const svgRef = useRef<SVGSVGElement>(null)

  // Derive pitch type from ABP tipo
  const pitchView = ABP_TIPOS.find(t => t.value === tipo)?.pitchView || 'half'

  // Current phase diagram
  const activeFase = fases.find(f => f.id === activeFaseId) || fases[0]
  const currentDiagram: DiagramData = {
    elements: activeFase?.diagram?.elements || [],
    arrows: activeFase?.diagram?.arrows || [],
    zones: activeFase?.diagram?.zones || [],
    pitchType: pitchView,
  }

  // Update diagram for current phase
  const updateDiagram = useCallback((newDiagram: Partial<DiagramData>) => {
    setFases(prev => prev.map(f =>
      f.id === activeFaseId
        ? { ...f, diagram: { ...f.diagram, ...newDiagram } }
        : f
    ))
  }, [activeFaseId])

  // SVG position helper
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

  // Click on pitch
  const handlePitchClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const pos = getSvgPosition(e)

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
        updateDiagram({ arrows: [...currentDiagram.arrows, newArrow] })
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
    updateDiagram({ elements: [...currentDiagram.elements, newElement] })
  }

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    setSelectedElement(elementId)
    if (selectedTool === 'select') setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement) return
    const pos = getSvgPosition(e)
    updateDiagram({
      elements: currentDiagram.elements.map(el =>
        el.id === selectedElement ? { ...el, position: pos } : el
      ),
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  const deleteSelected = () => {
    if (!selectedElement) return
    updateDiagram({
      elements: currentDiagram.elements.filter(el => el.id !== selectedElement),
      arrows: currentDiagram.arrows.filter(ar => ar.id !== selectedElement),
    })
    setSelectedElement(null)
  }

  const clearDiagram = () => {
    updateDiagram({ elements: [], arrows: [], zones: [] })
    setPlayerCounter({ team1: 1, team2: 1, gk: 1 })
    setSelectedElement(null)
    setArrowStart(null)
  }

  // Phase management
  const addFase = () => {
    const newFase = createEmptyFase(fases.length)
    // Copy elements from current phase to new phase
    const currentElements = activeFase?.diagram?.elements || []
    if (currentElements.length > 0) {
      newFase.diagram.elements = JSON.parse(JSON.stringify(currentElements))
    }
    setFases([...fases, newFase])
    setActiveFaseId(newFase.id)
  }

  const deleteFase = (id: string) => {
    if (fases.length <= 1) return
    const newFases = fases.filter(f => f.id !== id)
    setFases(newFases)
    if (activeFaseId === id) setActiveFaseId(newFases[0].id)
  }

  const renameFase = (id: string, nombre: string) => {
    setFases(prev => prev.map(f => f.id === id ? { ...f, nombre } : f))
  }

  // Tags
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  // Save
  const handleSave = () => {
    if (!nombre.trim()) return
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
      fases: fases.map((f, i) => ({ ...f, orden: i })),
      asignaciones,
      tags,
    })
  }

  // Render element (same as TareaGraphicEditor)
  const renderElement = (element: DiagramElement) => {
    const { id, type, position, label, color } = element
    const isSelected = selectedElement === id
    const size = ELEMENT_SIZES[type as keyof typeof ELEMENT_SIZES] || 24

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
            <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontSize={type === 'player_gk' ? 8 : 10} fontWeight="bold" fontFamily="Arial">
              {label}
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

    return (
      <g key={id} onClick={() => setSelectedElement(id)} style={{ cursor: 'pointer' }}>
        <line x1={from.x} y1={from.y} x2={tipX} y2={tipY} stroke={color || '#FFFFFF'} strokeWidth={isSelected ? 4 : 2} strokeDasharray={type === 'pass' ? '8,4' : 'none'} />
        <polygon
          points={`${to.x},${to.y} ${to.x - arrowSize * Math.cos(angle - Math.PI / 6)},${to.y - arrowSize * Math.sin(angle - Math.PI / 6)} ${to.x - arrowSize * Math.cos(angle + Math.PI / 6)},${to.y - arrowSize * Math.sin(angle + Math.PI / 6)}`}
          fill={color || '#FFFFFF'}
        />
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
    { id: 'arrow_movement', icon: <ArrowRight className="h-4 w-4" />, label: 'Movimiento', color: '#FFFF00' },
    { id: 'arrow_pass', icon: <ArrowRight className="h-4 w-4" />, label: 'Pase', color: '#FFFFFF' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900">
          {jugada?.id ? 'Editar jugada' : 'Nueva jugada'}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="h-4 w-4" />
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

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Editor area */}
        <div className="flex-1 flex flex-col overflow-auto p-4 space-y-3">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-gray-100 rounded-lg">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => { setSelectedTool(tool.id); setArrowStart(null) }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedTool === tool.id ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'
                }`}
                title={tool.label}
              >
                <span style={{ color: selectedTool === tool.id ? 'white' : tool.color }}>{tool.icon}</span>
                <span className="hidden lg:inline">{tool.label}</span>
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={deleteSelected} disabled={!selectedElement} className="p-1.5 rounded-lg bg-white text-gray-700 hover:bg-red-100 disabled:opacity-50" title="Eliminar">
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={clearDiagram} className="p-1.5 rounded-lg bg-white text-gray-700 hover:bg-red-100" title="Limpiar">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Pitch */}
          <div
            className="border border-gray-300 rounded-lg overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <FootballPitch
              type={pitchView}
              width={600}
              height={pitchView === 'quarter' ? 300 : 450}
              onClick={handlePitchClick}
            >
              <g ref={svgRef as any}>
                {currentDiagram.zones.map(zone => (
                  <rect key={zone.id} x={zone.position.x} y={zone.position.y} width={zone.width} height={zone.height} fill={zone.color} opacity={zone.opacity || 0.3} />
                ))}
                {currentDiagram.arrows.map(renderArrow)}
                {arrowStart && <circle cx={arrowStart.x} cy={arrowStart.y} r="5" fill="#FFFF00" />}
                {currentDiagram.elements.map(renderElement)}
              </g>
            </FootballPitch>
          </div>

          {/* Phase timeline */}
          <ABPPhaseTimeline
            fases={fases}
            activeFaseId={activeFaseId}
            onSelectFase={setActiveFaseId}
            onAddFase={addFase}
            onDeleteFase={deleteFase}
            onRenameFase={renameFase}
          />

          {/* Phase description */}
          <input
            type="text"
            placeholder="Descripcion de esta fase..."
            value={activeFase?.descripcion || ''}
            onChange={(e) => setFases(prev => prev.map(f => f.id === activeFaseId ? { ...f, descripcion: e.target.value } : f))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
          />
        </div>

        {/* Right: Properties panel */}
        <div className="w-80 border-l border-gray-200 overflow-y-auto bg-gray-50 p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="Ej: Corner corto izquierdo" />
          </div>

          {/* Code */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Codigo</label>
            <input value={codigo} onChange={e => setCodigo(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="COR-OF-01" />
          </div>

          {/* Type + Side */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value as TipoABP)} className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white">
                {ABP_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lado</label>
              <select value={lado} onChange={e => setLado(e.target.value as LadoABP)} className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white">
                <option value="ofensivo">Ofensivo</option>
                <option value="defensivo">Defensivo</option>
              </select>
            </div>
          </div>

          {/* Subtype */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subtipo</label>
            <select value={subtipo} onChange={e => setSubtipo(e.target.value as SubtipoABP)} className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white">
              <option value="">Sin subtipo</option>
              {ABP_SUBTIPOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Signal */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Senal / Codigo para jugadores</label>
            <input value={senalCodigo} onChange={e => setSenalCodigo(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="Ej: Mano arriba" />
          </div>

          {/* Marking system (defensive) */}
          {lado === 'defensivo' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sistema de marcaje</label>
              <select value={sistemaMarcaje} onChange={e => setSistemaMarcaje(e.target.value as SistemaMarcaje)} className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white">
                <option value="">Sin definir</option>
                <option value="zonal">Zonal</option>
                <option value="individual">Individual</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripcion</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
          </div>

          {/* Tactical notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas tacticas</label>
            <textarea value={notasTacticas} onChange={e => setNotasTacticas(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Etiquetas</label>
            <div className="flex gap-1.5 flex-wrap mb-1.5">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                  {tag}
                  <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded"
                placeholder="Nueva etiqueta"
              />
              <button onClick={addTag} className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">+</button>
            </div>
          </div>

          {/* Player assignments */}
          {jugadores.length > 0 && (
            <ABPPlayerAssigner
              elements={currentDiagram.elements.filter(e => e.type === 'player' || e.type === 'player_gk')}
              jugadores={jugadores}
              asignaciones={asignaciones}
              onChange={setAsignaciones}
            />
          )}
        </div>
      </div>
    </div>
  )
}
