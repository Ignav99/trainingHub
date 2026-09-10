'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Circle, Triangle, Target, Trash2, RotateCcw, MousePointer,
  Minus, Square, Undo2, Redo2, Type, Expand, Shrink, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ABPPitch from '@/components/abp/ABPPitch'
import BoardArrow from '@/components/tactical-board/BoardArrow'
import { ARROW_STYLES, ARROW_TYPE_ORDER, arrowGeometry, arrowHeadPoints, arrowBarPoints } from '@/components/tactical-board/arrowPaths'
import { exportBoardPNG } from '@/components/tactical-board/utils'
import {
  DiagramData, DiagramElement, DiagramArrow, DiagramZone, ElementType, ArrowType,
  Position, TEAM_COLORS, ELEMENT_SIZES, generateId, emptyDiagramData,
} from '@/components/tarea-editor/types'
import { diagramToPayload, sanitizeDiagramData } from '@/lib/diagramUtils'
import { ContextoRoles, getRolesForContext, rolLabel } from '@/lib/tacticalRoles'

interface TacticalBoardProps {
  /** Identificador estable (ej. fase-subfase). Al cambiar, se hidrata desde diagramValue. */
  boardKey?: string
  diagramValue?: DiagramData
  onDiagramChange?: (data: DiagramData) => void
  value?: string
  onChange?: (base64: string) => void
  roleContext?: ContextoRoles
  jugadorLabel?: string
  height?: number
}

type BoardTool = 'select' | ElementType | `arrow_${ArrowType}` | 'zone_rect' | 'zone_circle'

const ZONE_COLORS = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899']
const TOKEN_TYPES: ElementType[] = ['player', 'player_gk', 'opponent', 'player_joker']

const Sep = () => <div className="w-px h-5 bg-gray-200 mx-1" />

function diagramFingerprint(data: DiagramData): string {
  return JSON.stringify({
    elements: data.elements,
    arrows: data.arrows,
    zones: data.zones,
  })
}

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

function hydrateFromDiagram(
  diagramValue: DiagramData | undefined,
  setElements: React.Dispatch<React.SetStateAction<DiagramElement[]>>,
  setArrows: React.Dispatch<React.SetStateAction<DiagramArrow[]>>,
  setZones: React.Dispatch<React.SetStateAction<DiagramZone[]>>,
  pendingStateRef: React.MutableRefObject<{ elements: DiagramElement[]; arrows: DiagramArrow[]; zones: DiagramZone[] }>,
  localFpRef: React.MutableRefObject<string>,
  lastEmittedFpRef: React.MutableRefObject<string>
) {
  const sanitized = sanitizeDiagramData(diagramValue ?? emptyDiagramData)
  const fp = diagramFingerprint(sanitized)
  setElements(sanitized.elements)
  setArrows(sanitized.arrows)
  setZones(sanitized.zones)
  pendingStateRef.current = {
    elements: sanitized.elements,
    arrows: sanitized.arrows,
    zones: sanitized.zones,
  }
  localFpRef.current = fp
  lastEmittedFpRef.current = fp
}

export function TacticalBoard({
  boardKey,
  diagramValue,
  onDiagramChange,
  onChange,
  roleContext,
  jugadorLabel = 'Jugador',
}: TacticalBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const pngTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastEmittedFpRef = useRef('')
  const localFpRef = useRef('')
  const isDirtyRef = useRef(false)
  const hydratedBoardKeyRef = useRef<string | undefined>(undefined)
  const dragMovedRef = useRef(false)
  const suppressPitchClickRef = useRef(false)
  const pendingStateRef = useRef<{ elements: DiagramElement[]; arrows: DiagramArrow[]; zones: DiagramZone[] }>({
    elements: [],
    arrows: [],
    zones: [],
  })

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
  const [isExpanded, setIsExpanded] = useState(false)

  const roleOptions = roleContext ? getRolesForContext(roleContext) : []
  const isZoneTool = activeTool === 'zone_rect' || activeTool === 'zone_circle'
  const selectedElement = elements.find((e) => e.id === selectedId)
  const selectedArrow = arrows.find((a) => a.id === selectedId)
  const selectedZone = zones.find((z) => z.id === selectedId)

  // Hidratar solo al montar o al cambiar de pizarra (boardKey). Tras editar, el estado local manda.
  useEffect(() => {
    const key = boardKey ?? '__default__'
    if (hydratedBoardKeyRef.current === key && isDirtyRef.current) return
    if (hydratedBoardKeyRef.current === key && !isDirtyRef.current) {
      const fp = diagramFingerprint(sanitizeDiagramData(diagramValue ?? emptyDiagramData))
      if (fp === localFpRef.current) return
    }
    isDirtyRef.current = false
    hydratedBoardKeyRef.current = key
    setSelectedId(null)
    hydrateFromDiagram(
      diagramValue,
      setElements,
      setArrows,
      setZones,
      pendingStateRef,
      localFpRef,
      lastEmittedFpRef
    )
  }, [boardKey, diagramValue])

  const emitDiagramNow = useCallback((
    nextElements: DiagramElement[],
    nextArrows: DiagramArrow[],
    nextZones: DiagramZone[]
  ) => {
    if (!onDiagramChange) return
    if (emitTimerRef.current) clearTimeout(emitTimerRef.current)
    const payload = diagramToPayload(nextElements, nextArrows, nextZones)
    const fp = diagramFingerprint(payload)
    lastEmittedFpRef.current = fp
    localFpRef.current = fp
    pendingStateRef.current = { elements: nextElements, arrows: nextArrows, zones: nextZones }
    onDiagramChange(payload)
  }, [onDiagramChange])

  const scheduleEmit = useCallback((
    nextElements: DiagramElement[],
    nextArrows: DiagramArrow[],
    nextZones: DiagramZone[]
  ) => {
    if (!onDiagramChange) return
    pendingStateRef.current = { elements: nextElements, arrows: nextArrows, zones: nextZones }
    localFpRef.current = diagramFingerprint(diagramToPayload(nextElements, nextArrows, nextZones))
    if (emitTimerRef.current) clearTimeout(emitTimerRef.current)
    emitTimerRef.current = setTimeout(() => {
      emitDiagramNow(nextElements, nextArrows, nextZones)
    }, 350)
  }, [onDiagramChange, emitDiagramNow])

  const flushEmit = useCallback(() => {
    const { elements: els, arrows: arr, zones: zon } = pendingStateRef.current
    emitDiagramNow(els, arr, zon)
  }, [emitDiagramNow])

  const exportToPng = useCallback(() => {
    const svg = svgRef.current
    if (!svg || !onChange) return
    void exportBoardPNG(svg, { maxWidth: 900, mime: 'image/png' })
      .then((png) => onChange(png))
      .catch(() => { /* ignore capture errors */ })
  }, [onChange])

  const schedulePngExport = useCallback(() => {
    if (!onChange) return
    if (pngTimerRef.current) clearTimeout(pngTimerRef.current)
    pngTimerRef.current = setTimeout(() => exportToPng(), 400)
  }, [exportToPng, onChange])

  const applyLocalState = useCallback((
    nextElements: DiagramElement[],
    nextArrows: DiagramArrow[],
    nextZones: DiagramZone[],
    options?: { emit?: 'immediate' | 'debounced' | false; exportPng?: boolean }
  ) => {
    isDirtyRef.current = true
    setElements(nextElements)
    setArrows(nextArrows)
    setZones(nextZones)
    pendingStateRef.current = { elements: nextElements, arrows: nextArrows, zones: nextZones }
    localFpRef.current = diagramFingerprint(diagramToPayload(nextElements, nextArrows, nextZones))
    if (options?.emit === 'immediate') {
      emitDiagramNow(nextElements, nextArrows, nextZones)
    } else if (options?.emit !== false) {
      scheduleEmit(nextElements, nextArrows, nextZones)
    }
    if (options?.exportPng !== false) schedulePngExport()
  }, [scheduleEmit, schedulePngExport, emitDiagramNow])

  const applyState = useCallback((
    nextElements: DiagramElement[],
    nextArrows: DiagramArrow[],
    nextZones: DiagramZone[],
    exportPng = true
  ) => {
    applyLocalState(nextElements, nextArrows, nextZones, { emit: 'immediate', exportPng })
  }, [applyLocalState])

  const pushHistory = useCallback(() => {
    const { elements: curElements, arrows: curArrows, zones: curZones } = pendingStateRef.current
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ elements: curElements, arrows: curArrows, zones: curZones })
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex < 0) return
    const state = history[historyIndex]
    applyState(state.elements, state.arrows, state.zones)
    setHistoryIndex(historyIndex - 1)
  }, [history, historyIndex, applyState])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const state = history[historyIndex + 1]
    applyState(state.elements, state.arrows, state.zones)
    setHistoryIndex(historyIndex + 1)
  }, [history, historyIndex, applyState])

  const clearDiagram = useCallback(() => {
    pushHistory()
    applyState([], [], [])
    setSelectedId(null)
  }, [pushHistory, applyState])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    pushHistory()
    const { elements: curElements, arrows: curArrows, zones: curZones } = pendingStateRef.current
    const nextElements = curElements.filter((e) => e.id !== selectedId)
    const nextArrows = curArrows.filter((a) => a.id !== selectedId)
    const nextZones = curZones.filter((z) => z.id !== selectedId)
    applyState(nextElements, nextArrows, nextZones)
    setSelectedId(null)
  }, [selectedId, pushHistory, applyState])

  const updateElement = useCallback((id: string, patch: Partial<DiagramElement>, recordHistory = false) => {
    if (recordHistory) pushHistory()
    const { elements: curElements, arrows: curArrows, zones: curZones } = pendingStateRef.current
    const nextElements = curElements.map((e) => (e.id === id ? { ...e, ...patch } : e))
    applyLocalState(nextElements, curArrows, curZones, { emit: 'debounced' })
  }, [pushHistory, applyLocalState])

  const updateArrow = useCallback((id: string, patch: Partial<DiagramArrow>) => {
    const { elements: curElements, arrows: curArrows, zones: curZones } = pendingStateRef.current
    const nextArrows = curArrows.map((a) => (a.id === id ? { ...a, ...patch } : a))
    applyLocalState(curElements, nextArrows, curZones, { emit: 'debounced' })
  }, [applyLocalState])

  const updateZone = useCallback((id: string, patch: Partial<DiagramZone>) => {
    const { elements: curElements, arrows: curArrows, zones: curZones } = pendingStateRef.current
    const nextZones = curZones.map((z) => (z.id === id ? { ...z, ...patch } : z))
    applyLocalState(curElements, curArrows, nextZones, { emit: 'debounced' })
  }, [applyLocalState])

  const clearSelection = useCallback(() => {
    flushEmit()
    setSelectedId(null)
  }, [flushEmit])

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
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelected, undo, redo, isExpanded])

  useEffect(() => {
    if (gRef.current) svgRef.current = gRef.current.ownerSVGElement || null
  })

  useEffect(() => () => {
    if (pngTimerRef.current) clearTimeout(pngTimerRef.current)
    if (emitTimerRef.current) clearTimeout(emitTimerRef.current)
  }, [])

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

  const handlePitchClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const pos = getSvgPosition(e)
    if (pos.x === 0 && pos.y === 0) return

    const { elements: curElements, arrows: curArrows, zones: curZones } = pendingStateRef.current

    if (activeTool.startsWith('arrow_')) {
      if (!arrowStart) {
        setArrowStart(pos)
      } else {
        pushHistory()
        const arrowType = activeTool.replace('arrow_', '') as ArrowType
        const style = ARROW_STYLES[arrowType]
        const newArrow: DiagramArrow = {
          id: generateId(),
          type: arrowType,
          from: arrowStart,
          to: pos,
          color: style?.color,
          label: String(arrowCounter),
          curvature: style?.shape === 'curve' ? 0.22 : undefined,
        }
        applyState(curElements, [...curArrows, newArrow], curZones)
        setArrowCounter((c) => c + 1)
        setArrowStart(null)
        setSelectedId(newArrow.id)
        setActiveTool('select')
      }
      return
    }

    if (activeTool === 'zone_rect' || activeTool === 'zone_circle') return

    if (activeTool === 'select') {
      if (!suppressPitchClickRef.current) clearSelection()
      else suppressPitchClickRef.current = false
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
      applyState([...curElements, newText], curArrows, curZones)
      setActiveTool('select')
      suppressPitchClickRef.current = true
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
    } else if (elementType === 'player_joker') {
      label = 'C'
      color = TEAM_COLORS.joker
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
    applyState([...curElements, newElement], curArrows, curZones)
    if (elementType === 'player' || elementType === 'opponent') {
      setPlayerCounter(newCounter)
    }
    if (TOKEN_TYPES.includes(elementType)) {
      // Mantener herramienta activa para colocar varios; rol opcional
      setSelectedId(null)
      suppressPitchClickRef.current = true
    }
  }, [activeTool, arrowStart, arrowCounter, playerCounter, getSvgPosition, pushHistory, applyState, clearSelection])

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
    dragMovedRef.current = true
    const pos = getSvgPosition(e)
    const element = elements.find((el) => el.id === selectedId)
    const zone = zones.find((z) => z.id === selectedId)
    if (element) {
      setElements((prev) => {
        const next = prev.map((el) =>
          el.id === selectedId ? { ...el, position: { x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } } : el
        )
        pendingStateRef.current = { ...pendingStateRef.current, elements: next }
        return next
      })
    } else if (zone) {
      setZones((prev) => {
        const next = prev.map((z) =>
          z.id === selectedId ? { ...z, position: { x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } } : z
        )
        pendingStateRef.current = { ...pendingStateRef.current, zones: next }
        return next
      })
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
        const { elements: curElements, arrows: curArrows, zones: curZones } = pendingStateRef.current
        const newZone: DiagramZone = {
          id: generateId(),
          position: { x, y },
          width: w,
          height: h,
          color: zoneColor,
          opacity: 0.3,
          shape: activeTool === 'zone_circle' ? 'ellipse' : 'rectangle',
        }
        applyState(curElements, curArrows, [...curZones, newZone])
      }
      setZoneDragStart(null)
      setZoneDragCurrent(null)
      return
    }
    if (isDragging && dragMovedRef.current) {
      const { elements: curElements, arrows: curArrows, zones: curZones } = pendingStateRef.current
      applyState(curElements, curArrows, curZones)
    }
    dragMovedRef.current = false
    setIsDragging(false)
  }, [zoneDragStart, zoneDragCurrent, isZoneTool, activeTool, zoneColor, isDragging, getSvgPosition, pushHistory, applyState])

  const selectElement = useCallback((elementId: string, openPanel = true) => {
    suppressPitchClickRef.current = true
    if (openPanel) {
      setSelectedId(elementId)
      setActiveTool('select')
    }
  }, [])

  const handleElementMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    e.preventDefault()
    dragMovedRef.current = false
    if (activeTool === 'select') {
      selectElement(elementId, true)
      setIsDragging(true)
      const pos = getSvgPosition(e)
      const el = elements.find((item) => item.id === elementId)
      const z = zones.find((item) => item.id === elementId)
      if (el) setDragOffset({ x: pos.x - el.position.x, y: pos.y - el.position.y })
      else if (z) setDragOffset({ x: pos.x - z.position.x, y: pos.y - z.position.y })
    } else if (TOKEN_TYPES.includes(elements.find((item) => item.id === elementId)?.type as ElementType)) {
      // Con herramienta de colocación activa, permitir seguir añadiendo en el campo
      return
    } else {
      selectElement(elementId, true)
    }
  }, [activeTool, elements, zones, getSvgPosition, selectElement])

  const renderElement = (element: DiagramElement) => {
    const { id, type, position, color, label, jugador, rol } = element
    const isSelected = selectedId === id
    const size = ELEMENT_SIZES[type as keyof typeof ELEMENT_SIZES] || 24
    const roleText = rol && roleOptions.length ? rolLabel(rol, roleOptions) : rol

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
      case 'player_joker':
        return (
          <g {...commonProps} transform={`translate(${position.x}, ${position.y})`}>
            <circle cx="0" cy="0" r={size / 2} fill={color} stroke={isSelected ? '#FFFF00' : '#FFFFFF'} strokeWidth={isSelected ? 3 : 2} />
            <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill={type === 'player_joker' || color === '#EAB308' ? '#111827' : '#FFFFFF'} fontSize="10" fontWeight="bold" fontFamily="Arial">
              {label || ''}
            </text>
            {(jugador || roleText) && (
              <>
                {jugador && (
                  <text x="0" y={size / 2 + 10} textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="600" fontFamily="Arial">
                    {jugador.length > 12 ? `${jugador.slice(0, 11)}…` : jugador}
                  </text>
                )}
                {roleText && (
                  <text x="0" y={size / 2 + (jugador ? 20 : 10)} textAnchor="middle" fill="#FDE047" fontSize="7" fontFamily="Arial">
                    {roleText.length > 14 ? `${roleText.slice(0, 13)}…` : roleText}
                  </text>
                )}
              </>
            )}
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

  const renderArrow = (arrow: DiagramArrow) => (
    <BoardArrow
      key={arrow.id}
      arrow={arrow}
      selected={selectedId === arrow.id}
      interactive
      onSelect={(e) => {
        e.stopPropagation()
        selectElement(arrow.id, true)
      }}
    />
  )

  const renderZone = (zone: DiagramZone) => {
    const { id, position, width, height, color, shape, label } = zone
    const isSelected = selectedId === id

    return (
      <g key={id}
        onMouseDown={(e) => handleElementMouseDown(e, id)}
        onClick={(e) => { e.stopPropagation(); selectElement(id, true) }}
        style={{ cursor: activeTool === 'select' ? 'move' : 'pointer' }}
      >
        {shape === 'ellipse' ? (
          <ellipse
            cx={position.x + width / 2} cy={position.y + height / 2}
            rx={width / 2} ry={height / 2}
            fill={color} opacity={0.3}
            stroke={isSelected ? '#FFFF00' : color} strokeWidth={isSelected ? 2 : 1}
          />
        ) : (
          <rect
            x={position.x} y={position.y} width={width} height={height}
            fill={color} opacity={0.3}
            stroke={isSelected ? '#FFFF00' : color} strokeWidth={isSelected ? 2 : 1}
          />
        )}
        {label && (
          <text
            x={position.x + width / 2}
            y={position.y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#FFFFFF"
            fontSize="11"
            fontWeight="bold"
            fontFamily="Arial"
          >
            {label}
          </text>
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

  const elementPanel = (selectedElement || selectedArrow || selectedZone) && (
    <div
      className="absolute top-2 right-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 z-[60] overflow-hidden pointer-events-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-700">
          {selectedArrow
            ? 'Movimiento'
            : selectedZone
              ? 'Zona'
              : selectedElement?.type === 'opponent'
                ? 'Jugador rival'
                : selectedElement?.type === 'player_gk'
                  ? 'Portero'
                  : selectedElement?.type === 'player_joker'
                    ? 'Comodín'
                    : selectedElement?.type === 'text'
                      ? 'Comentario'
                      : 'Jugador'}
        </span>
        <button type="button" onClick={clearSelection} className="p-0.5 text-gray-400 hover:text-gray-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        {selectedElement && TOKEN_TYPES.includes(selectedElement.type) && (
          <>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Dorsal / etiqueta</Label>
              <Input
                value={selectedElement.label ?? ''}
                onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
                className="h-7 text-xs"
                placeholder="Ej: 8, GK"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">{jugadorLabel}</Label>
              <Input
                value={selectedElement.jugador ?? ''}
                onChange={(e) => updateElement(selectedElement.id, { jugador: e.target.value })}
                className="h-7 text-xs"
                placeholder="Nombre del jugador..."
              />
            </div>
            {roleContext && roleOptions.length > 0 && (
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground">Rol táctico (opcional)</Label>
                <Select
                  value={selectedElement.rol ?? '__none__'}
                  onValueChange={(v) => updateElement(selectedElement.id, { rol: v === '__none__' ? undefined : v })}
                >
                  <SelectTrigger className="h-7 text-xs" onPointerDown={(e) => e.stopPropagation()}>
                    <SelectValue placeholder="Sin rol (opcional)" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[200]">
                    <SelectItem value="__none__" className="text-xs text-muted-foreground">Sin rol</SelectItem>
                    {roleOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}
        {selectedElement?.type === 'text' && (
          <div className="space-y-0.5">
            <Label className="text-[10px] text-muted-foreground">Comentario</Label>
            <Input
              value={selectedElement.label ?? ''}
              onChange={(e) => updateElement(selectedElement.id, { label: e.target.value })}
              className="h-7 text-xs"
              placeholder="Texto en el campo..."
            />
          </div>
        )}
        {selectedArrow && (
          <>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Tipo</Label>
              <Select
                value={selectedArrow.type}
                onValueChange={(v) => updateArrow(selectedArrow.id, { type: v as ArrowType, color: ARROW_STYLES[v as ArrowType]?.color })}
              >
                <SelectTrigger className="h-7 text-xs" onPointerDown={(e) => e.stopPropagation()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[200]">
                  {ARROW_TYPE_ORDER.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{ARROW_STYLES[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Etiqueta</Label>
              <Input
                value={selectedArrow.label ?? ''}
                onChange={(e) => updateArrow(selectedArrow.id, { label: e.target.value })}
                className="h-7 text-xs"
                placeholder="Orden"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] text-muted-foreground">Comentario</Label>
              <Input
                value={selectedArrow.comment ?? ''}
                onChange={(e) => updateArrow(selectedArrow.id, { comment: e.target.value })}
                className="h-7 text-xs"
                placeholder="Nota de la acción..."
              />
            </div>
          </>
        )}
        {selectedZone && (
          <div className="space-y-0.5">
            <Label className="text-[10px] text-muted-foreground">Etiqueta de zona</Label>
            <Input
              value={selectedZone.label ?? ''}
              onChange={(e) => updateZone(selectedZone.id, { label: e.target.value })}
              className="h-7 text-xs"
              placeholder="Ej: presión, pasillo..."
            />
          </div>
        )}
      </div>
    </div>
  )

  const boardCard = (
    <Card
      className={
        isExpanded
          ? 'fixed inset-4 z-[100] flex flex-col p-2 space-y-2 overflow-y-auto shadow-2xl'
          : 'p-2 space-y-2'
      }
    >
      <div className="flex flex-wrap items-center gap-1">
        <TB id="select" icon={<MousePointer className="h-3.5 w-3.5" />} label="Seleccionar" activeTool={activeTool} onSelect={setActiveTool} />
        <Sep />
        <TB id="player" icon={<Circle className="h-3.5 w-3.5" />} label="Jugador" color={TEAM_COLORS.team1} activeTool={activeTool} onSelect={setActiveTool} />
        <TB id="opponent" icon={<Circle className="h-3.5 w-3.5" />} label="Rival" color={TEAM_COLORS.team2} activeTool={activeTool} onSelect={setActiveTool} />
        <TB id="player_gk" icon={<Circle className="h-3.5 w-3.5" />} label="Portero" color={TEAM_COLORS.goalkeeper} activeTool={activeTool} onSelect={setActiveTool} />
        <TB id="player_joker" icon={<Circle className="h-3.5 w-3.5" />} label="Comodín" color={TEAM_COLORS.joker} activeTool={activeTool} onSelect={setActiveTool} />
        <Sep />
        <TB id="cone" icon={<Triangle className="h-3.5 w-3.5" />} label="Cono" color="#FF6B00" activeTool={activeTool} onSelect={setActiveTool} />
        <TB id="ball" icon={<Target className="h-3.5 w-3.5" />} label="Balon" activeTool={activeTool} onSelect={setActiveTool} />
        <TB id="mini_goal" icon={<Minus className="h-3.5 w-3.5 rotate-90" />} label="Mini" activeTool={activeTool} onSelect={setActiveTool} />
        <TB id="text" icon={<Type className="h-3.5 w-3.5" />} label="Texto" activeTool={activeTool} onSelect={setActiveTool} />
        <Sep />
        {ARROW_TYPE_ORDER.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveTool(`arrow_${type}`)}
            title={`${ARROW_STYLES[type].label} — ${ARROW_STYLES[type].hint}`}
            className={`flex items-center px-1 py-1 rounded-lg ${
              activeTool === `arrow_${type}` ? 'bg-blue-600 ring-2 ring-blue-300' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <ArrowPreview type={type} />
          </button>
        ))}
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
        <button type="button" onClick={undo} disabled={historyIndex < 0} className="p-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30" title="Deshacer">
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30" title="Rehacer">
          <Redo2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={deleteSelected} disabled={!selectedId} className="p-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-red-100 disabled:opacity-30" title="Eliminar">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={clearDiagram} className="p-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-red-100" title="Limpiar">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1" />
        <button type="button" onClick={() => setIsExpanded((v) => !v)} className="p-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200" title={isExpanded ? 'Contraer' : 'Ampliar ventana'}>
          {isExpanded ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div
        ref={containerRef}
        className={`relative ${isExpanded ? 'w-full flex-1 min-h-0 rounded-lg overflow-hidden border border-white/10 bg-[#2D5016]' : 'w-full rounded-lg overflow-hidden border border-white/10 bg-[#2D5016]'}`}
        style={isExpanded ? undefined : { aspectRatio: '680 / 525' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {elementPanel}
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
            ? (arrowStart ? '2. Click destino de la flecha' : '1. Click origen — luego destino')
            : isZoneTool
              ? 'Click y arrastra para dibujar zona'
              : selectedArrow
                ? 'Añade etiqueta y comentario al movimiento'
                : roleContext
                  ? 'Coloca jugadores, flechas, zonas y comentarios; usa Seleccionar para roles'
                  : 'Selecciona una herramienta y click en el campo'}
        </p>
        {onChange && (
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={exportToPng}>
            Guardar dibujo
          </Button>
        )}
      </div>
    </Card>
  )

  if (isExpanded && typeof document !== 'undefined') {
    return createPortal(
      <>
        <div className="fixed inset-0 z-[99] bg-black/60" onClick={() => setIsExpanded(false)} />
        {boardCard}
      </>,
      document.body
    )
  }

  return boardCard
}
