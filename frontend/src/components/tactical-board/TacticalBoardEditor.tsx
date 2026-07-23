'use client'

import React, { useState, useRef, useCallback, useEffect, useId } from 'react'
import { Save, X, Download, Film, Image as ImageIcon } from 'lucide-react'
import ABPPitch from '@/components/abp/ABPPitch'
import {
  DiagramElement, DiagramArrow, DiagramZone, ElementType, ArrowType,
  Position, TEAM_COLORS, ELEMENT_SIZES, generateId,
} from '@/components/tarea-editor/types'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import { zoneGeometry, type TareaEspacioPatch } from '@/lib/tacticalMetrics'
import BoardToolbar from './BoardToolbar'
import KeyframeTimeline from './KeyframeTimeline'
import AnimationPlayer, { AnimationState } from './AnimationPlayer'
import ExportDialog from './ExportDialog'
import ElementEditPanel from './ElementEditPanel'
import GeometryPanel from './GeometryPanel'
import BoardArrow from './BoardArrow'
import { BoardDefs, ElementSymbol, ELEMENT_TOOLS, ROTATABLE_ELEMENTS } from './BoardSymbols'
import { RESIZE_HANDLES, HANDLE_CURSORS, type ResizeHandle } from './types'

interface TacticalBoardEditorProps {
  onSave: () => void
  onCancel: () => void
  /** Modo embebido: la barra superior la aporta el contenedor (p. ej. el editor de tarea) */
  embedded?: boolean
  /** Jugadores de la tarea, para el cálculo de m²/jugador cuando no hay monigotes en la pizarra */
  numJugadores?: number
  /** Vuelca el espacio calculado en la pizarra sobre los campos de la tarea */
  onApplyEspacio?: (patch: TareaEspacioPatch) => void
}

/** Tipos de herramienta que colocan un elemento en el campo. */
const PLACEMENT_TYPES = new Set<string>(ELEMENT_TOOLS.map((t) => t.type))

export default function TacticalBoardEditor({
  onSave,
  onCancel,
  embedded = false,
  numJugadores,
  onApplyEspacio,
}: TacticalBoardEditorProps) {
  const nombre = useTacticalBoardStore((s) => s.nombre)
  const tipo = useTacticalBoardStore((s) => s.tipo)
  const pitchType = useTacticalBoardStore((s) => s.pitchType)
  const activeTool = useTacticalBoardStore((s) => s.activeTool)
  const selectedElementId = useTacticalBoardStore((s) => s.selectedElementId)
  const selectedElementIds = useTacticalBoardStore((s) => s.selectedElementIds)
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
  const setSelectedElementId = useTacticalBoardStore((s) => s.setSelectedElementId)
  const setSelectedElementIds = useTacticalBoardStore((s) => s.setSelectedElementIds)
  const addToSelection = useTacticalBoardStore((s) => s.addToSelection)
  const selectAll = useTacticalBoardStore((s) => s.selectAll)
  const moveSelectedBy = useTacticalBoardStore((s) => s.moveSelectedBy)
  const addElement = useTacticalBoardStore((s) => s.addElement)
  const updateElementPosition = useTacticalBoardStore((s) => s.updateElementPosition)
  const updateElementRotation = useTacticalBoardStore((s) => s.updateElementRotation)
  const addArrow = useTacticalBoardStore((s) => s.addArrow)
  const updateArrowEndpoint = useTacticalBoardStore((s) => s.updateArrowEndpoint)
  const addZone = useTacticalBoardStore((s) => s.addZone)
  const updateZonePosition = useTacticalBoardStore((s) => s.updateZonePosition)
  const resizeZone = useTacticalBoardStore((s) => s.resizeZone)
  const deleteSelected = useTacticalBoardStore((s) => s.deleteSelected)
  const pushHistory = useTacticalBoardStore((s) => s.pushHistory)
  const undo = useTacticalBoardStore((s) => s.undo)
  const redo = useTacticalBoardStore((s) => s.redo)
  const copySelected = useTacticalBoardStore((s) => s.copySelected)
  const cutSelected = useTacticalBoardStore((s) => s.cutSelected)
  const pasteClipboard = useTacticalBoardStore((s) => s.pasteClipboard)
  const duplicateSelected = useTacticalBoardStore((s) => s.duplicateSelected)
  const transformSelection = useTacticalBoardStore((s) => s.transformSelection)
  const groupSelection = useTacticalBoardStore((s) => s.groupSelection)
  const ungroupSelection = useTacticalBoardStore((s) => s.ungroupSelection)
  const setActiveTool = useTacticalBoardStore((s) => s.setActiveTool)
  const loadFormation = useTacticalBoardStore((s) => s.loadFormation)
  const updateElementLabel = useTacticalBoardStore((s) => s.updateElementLabel)

  const uid = useId().replace(/:/g, '')

  // Local interaction state
  const [isDragging, setIsDragging] = useState(false)
  const [arrowStart, setArrowStart] = useState<Position | null>(null)
  const [zoneDragStart, setZoneDragStart] = useState<Position | null>(null)
  const [zoneDragCurrent, setZoneDragCurrent] = useState<Position | null>(null)
  const [showExport, setShowExport] = useState(false)
  // Arrow endpoint dragging
  const [draggingEndpoint, setDraggingEndpoint] = useState<{ arrowId: string; endpoint: 'from' | 'to' } | null>(null)
  // Element rotation dragging
  const [isRotating, setIsRotating] = useState(false)
  // Zone dragging
  const [draggingZoneId, setDraggingZoneId] = useState<string | null>(null)
  const [zoneDragOffset, setZoneDragOffset] = useState<Position>({ x: 0, y: 0 })
  // Zone resizing (tiradores)
  const resizeRef = useRef<{ zoneId: string; handle: ResizeHandle; orig: { x: number; y: number; width: number; height: number } } | null>(null)
  // Marquee (rubber-band) selection
  const [marqueeStart, setMarqueeStart] = useState<Position | null>(null)
  const [marqueeEnd, setMarqueeEnd] = useState<Position | null>(null)
  // Ref-based marquee tracking (avoids stale closure issues with React state)
  const marqueeStartRef = useRef<Position | null>(null)
  const marqueeEndRef = useRef<Position | null>(null)
  // Multi-drag
  const lastDragPosRef = useRef<Position | null>(null)
  // Prevents click-to-deselect firing right after marquee finishes
  const didMarqueeRef = useRef(false)

  // Animation overlay state (during playback, we render these instead of store state)
  const [animState, setAnimState] = useState<AnimationState | null>(null)

  // Inline text editing
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [editingTextValue, setEditingTextValue] = useState('')
  const inlineInputRef = useRef<HTMLInputElement>(null)

  // Ref guard: prevents pitch click from clearing selection when an element was just interacted with
  const elementInteractionRef = useRef(false)

  const gRef = useRef<SVGGElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (gRef.current) svgRef.current = gRef.current.ownerSVGElement || null
  })

  // Focus the container on mount so keyboard shortcuts work immediately
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  const isAnimated = tipo === 'animated'
  const isHorizontal = pitchType === 'full'

  // Clear animation overlay when playback stops
  useEffect(() => {
    if (!isPlaying) setAnimState(null)
  }, [isPlaying])

  // Decide which data to render (animation overlay or store)
  const renderElements = isPlaying && animState ? animState.elements : elements
  const renderArrows = isPlaying && animState ? animState.arrows : arrows
  const renderZones = isPlaying && animState ? animState.zones : zones

  const allSelectedIds = React.useMemo(
    () => new Set([...selectedElementIds, ...(selectedElementId ? [selectedElementId] : [])]),
    [selectedElementIds, selectedElementId],
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPlaying) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const mod = e.ctrlKey || e.metaKey

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelected()
        return
      }
      if (e.key === 'Escape') {
        // Sale del modo colocacion y limpia lo que estuviera a medias
        setSelectedElementId(null)
        setArrowStart(null)
        setZoneDragStart(null)
        setZoneDragCurrent(null)
        setActiveTool('select')
        return
      }
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if (mod && (e.key === 'Z' || e.key.toLowerCase() === 'y')) {
        e.preventDefault()
        redo()
        return
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        selectAll()
        return
      }
      if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        copySelected()
        return
      }
      if (mod && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        cutSelected()
        return
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        // Ctrl+Shift+V pega la figura invertida (espejo horizontal)
        pasteClipboard(e.shiftKey ? { flip: 'h', dx: 24, dy: 24 } : undefined)
        return
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicateSelected()
        return
      }
      // Agrupar / desagrupar
      if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        if (e.shiftKey) ungroupSelection()
        else groupSelection()
        return
      }
      // Girar la selección
      if (!mod && (e.key === '[' || e.key === ']')) {
        e.preventDefault()
        transformSelection({ rotate: e.key === '[' ? -15 : 15 })
        return
      }
      // Invertir la selección
      if (!mod && e.key.toLowerCase() === 'h' && allSelectedIds.size > 0) {
        e.preventDefault()
        transformSelection({ flip: e.shiftKey ? 'v' : 'h' })
        return
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (allSelectedIds.size > 0) {
          e.preventDefault()
          const step = e.shiftKey ? 10 : 1
          if (e.key === 'ArrowUp') moveSelectedBy(0, -step)
          else if (e.key === 'ArrowDown') moveSelectedBy(0, step)
          else if (e.key === 'ArrowLeft') moveSelectedBy(-step, 0)
          else moveSelectedBy(step, 0)
          return
        }
      }
      if (e.key === 'v' && !mod && !e.altKey) {
        setActiveTool('select')
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    deleteSelected, undo, redo, setSelectedElementId, isPlaying, selectAll,
    copySelected, cutSelected, pasteClipboard, duplicateSelected,
    transformSelection, groupSelection, ungroupSelection,
    moveSelectedBy, setActiveTool, allSelectedIds,
  ])

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

    // Guard: if an element was just interacted with, skip clearing selection
    if (elementInteractionRef.current) {
      elementInteractionRef.current = false
      return
    }

    const pos = getSvgPosition(e)
    if (pos.x === 0 && pos.y === 0) return

    if (activeTool.startsWith('arrow_')) {
      if (!arrowStart) {
        setArrowStart(pos)
      } else {
        pushHistory()
        const arrowType = activeTool.replace('arrow_', '') as ArrowType
        const newArrow: DiagramArrow = {
          id: generateId(),
          type: arrowType,
          from: arrowStart,
          to: pos,
          label: String(arrowCounter),
        }
        addArrow(newArrow)
        setArrowStart(null)
      }
      return
    }

    if (activeTool === 'zone_rect' || activeTool === 'zone_circle') return

    if (activeTool === 'select') {
      if (didMarqueeRef.current) {
        didMarqueeRef.current = false
        return
      }
      setSelectedElementId(null)
      return
    }

    // Text tool
    if (activeTool === 'text') {
      pushHistory()
      const newTextId = generateId()
      addElement({
        id: newTextId,
        type: 'text',
        position: pos,
        label: 'Texto',
        color: '#FFFFFF',
      })
      setActiveTool('select')
      setSelectedElementId(newTextId)
      setEditingTextId(newTextId)
      setEditingTextValue('Texto')
      setTimeout(() => {
        inlineInputRef.current?.focus()
        inlineInputRef.current?.select()
      }, 30)
      return
    }

    if (!PLACEMENT_TYPES.has(activeTool)) return

    pushHistory()
    const elementType = activeTool as ElementType
    const meta = ELEMENT_TOOLS.find((t) => t.type === elementType)
    let label = ''
    let color = meta?.defaultColor

    if (elementType === 'player') {
      label = String(playerCounter.team1)
      color = TEAM_COLORS.team1
    } else if (elementType === 'opponent') {
      label = String(playerCounter.team2)
      color = TEAM_COLORS.team2
    } else if (elementType === 'player_gk') {
      label = 'GK'
      color = TEAM_COLORS.goalkeeper
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
    const pos = getSvgPosition(e)
    if (activeTool === 'zone_rect' || activeTool === 'zone_circle') {
      setZoneDragStart(pos)
      setZoneDragCurrent(pos)
      return
    }
    // Start marquee in select mode
    if (activeTool === 'select') {
      e.preventDefault()
      marqueeStartRef.current = pos
      marqueeEndRef.current = pos
      setMarqueeStart(pos)
      setMarqueeEnd(pos)
    }
  }, [activeTool, getSvgPosition, isPlaying])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPlaying) return

    // Zone resize (tiradores)
    if (resizeRef.current) {
      const pos = getSvgPosition(e)
      if (pos.x === 0 && pos.y === 0) return
      const { zoneId, handle, orig } = resizeRef.current
      let { x, y, width, height } = orig
      if (handle.includes('n')) { height = orig.y + orig.height - pos.y; y = pos.y }
      if (handle.includes('s')) { height = pos.y - orig.y }
      if (handle.includes('w')) { width = orig.x + orig.width - pos.x; x = pos.x }
      if (handle.includes('e')) { width = pos.x - orig.x }
      resizeZone(zoneId, { x, y, width, height })
      return
    }

    // Arrow endpoint dragging
    if (draggingEndpoint) {
      const pos = getSvgPosition(e)
      if (pos.x === 0 && pos.y === 0) return
      updateArrowEndpoint(draggingEndpoint.arrowId, draggingEndpoint.endpoint, pos)
      return
    }

    // Element rotation
    if (isRotating && selectedElementId) {
      const el = elements.find((it) => it.id === selectedElementId)
      if (el) {
        const pos = getSvgPosition(e)
        const angle = Math.atan2(pos.y - el.position.y, pos.x - el.position.x) * (180 / Math.PI)
        updateElementRotation(selectedElementId, Math.round(angle))
      }
      return
    }

    // Zone dragging (move existing zone)
    if (draggingZoneId) {
      const pos = getSvgPosition(e)
      if (pos.x === 0 && pos.y === 0) return
      updateZonePosition(draggingZoneId, pos.x - zoneDragOffset.x, pos.y - zoneDragOffset.y)
      return
    }

    if (zoneDragStart && (activeTool === 'zone_rect' || activeTool === 'zone_circle')) {
      setZoneDragCurrent(getSvgPosition(e))
      return
    }

    // Marquee update — use ref (avoids stale closure: marqueeStart state may lag one render)
    if (marqueeStartRef.current && activeTool === 'select') {
      const pos = getSvgPosition(e)
      marqueeEndRef.current = pos
      setMarqueeEnd(pos)
      return
    }

    // Multi-element drag (delta-based)
    if (isDragging && allSelectedIds.size > 1 && lastDragPosRef.current) {
      const pos = getSvgPosition(e)
      if (pos.x === 0 && pos.y === 0) return
      const dx = pos.x - lastDragPosRef.current.x
      const dy = pos.y - lastDragPosRef.current.y
      if (dx !== 0 || dy !== 0) moveSelectedBy(dx, dy)
      lastDragPosRef.current = pos
      return
    }

    // Single-element drag (absolute positioning)
    if (!isDragging || !selectedElementId) return
    const pos = getSvgPosition(e)
    if (pos.x === 0 && pos.y === 0) return
    updateElementPosition(selectedElementId, pos.x, pos.y)
  }, [isDragging, selectedElementId, allSelectedIds, getSvgPosition, zoneDragStart, activeTool, updateElementPosition, isPlaying, draggingEndpoint, updateArrowEndpoint, isRotating, elements, updateElementRotation, draggingZoneId, zoneDragOffset, updateZonePosition, moveSelectedBy, resizeZone])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPlaying) return

    if (resizeRef.current) {
      resizeRef.current = null
      elementInteractionRef.current = true
      setTimeout(() => { elementInteractionRef.current = false }, 0)
      return
    }

    if (draggingEndpoint) {
      setDraggingEndpoint(null)
      return
    }

    if (isRotating) {
      setIsRotating(false)
      elementInteractionRef.current = true
      setTimeout(() => { elementInteractionRef.current = false }, 0)
      return
    }

    if (draggingZoneId) {
      setDraggingZoneId(null)
      return
    }

    if (zoneDragStart && zoneDragCurrent && (activeTool === 'zone_rect' || activeTool === 'zone_circle')) {
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
          shape: activeTool === 'zone_circle' ? 'ellipse' : 'rectangle',
          // La primera zona que se dibuja pasa a ser el espacio de juego de referencia
          isPlayingArea: zones.length === 0,
        }
        addZone(newZone)
        setSelectedElementId(newZone.id)
      }
      setZoneDragStart(null)
      setZoneDragCurrent(null)
      return
    }

    // Marquee finalize — use refs (always current, no stale closure risk)
    if (marqueeStartRef.current && activeTool === 'select') {
      const start = marqueeStartRef.current
      const end = marqueeEndRef.current || start
      marqueeStartRef.current = null
      marqueeEndRef.current = null

      const minX = Math.min(start.x, end.x)
      const maxX = Math.max(start.x, end.x)
      const minY = Math.min(start.y, end.y)
      const maxY = Math.max(start.y, end.y)

      if (maxX - minX > 5 && maxY - minY > 5) {
        const inside = (x: number, y: number) => x >= minX && x <= maxX && y >= minY && y <= maxY
        const selectedIds: string[] = []
        elements.forEach((el) => {
          if (inside(el.position.x, el.position.y)) selectedIds.push(el.id)
        })
        // Una flecha entra en la selección si sus dos extremos están dentro
        arrows.forEach((ar) => {
          if (inside(ar.from.x, ar.from.y) && inside(ar.to.x, ar.to.y)) selectedIds.push(ar.id)
        })
        zones.forEach((z) => {
          const cx = z.position.x + z.width / 2
          const cy = z.position.y + z.height / 2
          if (inside(cx, cy)) selectedIds.push(z.id)
        })
        if (selectedIds.length > 0) {
          setSelectedElementIds(selectedIds)
          didMarqueeRef.current = true
        }
      }
      setMarqueeStart(null)
      setMarqueeEnd(null)
      lastDragPosRef.current = null
      return
    }

    setIsDragging(false)
    lastDragPosRef.current = null
  }, [zoneDragStart, zoneDragCurrent, activeTool, getSvgPosition, zoneColor, pushHistory, addZone, isPlaying, draggingEndpoint, isRotating, draggingZoneId, elements, arrows, zones, setSelectedElementIds, setSelectedElementId])

  const handleElementMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    if (isPlaying) return
    e.stopPropagation()
    elementInteractionRef.current = true
    setTimeout(() => { elementInteractionRef.current = false }, 0)

    // Arrow tool: use player position as arrow start/end point
    if (activeTool.startsWith('arrow_')) {
      const el = elements.find((it) => it.id === elementId)
      if (el) {
        const pos = el.position
        if (!arrowStart) {
          setArrowStart(pos)
        } else {
          pushHistory()
          const arrowType = activeTool.replace('arrow_', '') as ArrowType
          addArrow({
            id: generateId(),
            type: arrowType,
            from: arrowStart,
            to: pos,
            label: String(arrowCounter),
          })
          setArrowStart(null)
        }
      }
      return
    }

    if (activeTool === 'select') {
      if (e.shiftKey) {
        addToSelection(elementId)
      } else if (!allSelectedIds.has(elementId)) {
        setSelectedElementIds([elementId])
      }
      setIsDragging(true)
      lastDragPosRef.current = getSvgPosition(e)
    } else {
      setSelectedElementId(elementId)
    }
  }, [activeTool, setSelectedElementId, setSelectedElementIds, addToSelection, isPlaying, elements, arrowStart, arrowCounter, pushHistory, addArrow, getSvgPosition, allSelectedIds])

  const handleZoneMouseDown = useCallback((e: React.MouseEvent, zoneId: string) => {
    if (isPlaying) return
    if (activeTool !== 'select') return
    e.stopPropagation()
    elementInteractionRef.current = true
    setTimeout(() => { elementInteractionRef.current = false }, 0)

    if (e.shiftKey) {
      addToSelection(zoneId)
      return
    }
    if (!allSelectedIds.has(zoneId)) setSelectedElementIds([zoneId])

    // Start zone drag
    const zone = zones.find((z) => z.id === zoneId)
    if (zone) {
      const pos = getSvgPosition(e)
      pushHistory()
      if (useTacticalBoardStore.getState().selectedElementIds.length > 1) {
        // Zona dentro de una selección múltiple: se arrastra todo el conjunto
        setIsDragging(true)
        lastDragPosRef.current = pos
      } else {
        setDraggingZoneId(zoneId)
        setZoneDragOffset({ x: pos.x - zone.position.x, y: pos.y - zone.position.y })
      }
    }
  }, [activeTool, setSelectedElementIds, addToSelection, isPlaying, zones, getSvgPosition, pushHistory, allSelectedIds])

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, zone: DiagramZone, handle: ResizeHandle) => {
    e.stopPropagation()
    elementInteractionRef.current = true
    setTimeout(() => { elementInteractionRef.current = false }, 0)
    pushHistory()
    resizeRef.current = {
      zoneId: zone.id,
      handle,
      orig: { x: zone.position.x, y: zone.position.y, width: zone.width, height: zone.height },
    }
  }, [pushHistory])

  const handleLoadFormation = useCallback((name: string, team: 'home' | 'away') => {
    loadFormation(name, team)
  }, [loadFormation])

  const handleAnimationFrame = useCallback((state: AnimationState) => {
    setAnimState(state)
  }, [])

  // Arrow endpoint drag start
  const handleEndpointMouseDown = useCallback((e: React.MouseEvent, arrowId: string, endpoint: 'from' | 'to') => {
    e.stopPropagation()
    elementInteractionRef.current = true
    setTimeout(() => { elementInteractionRef.current = false }, 0)
    pushHistory()
    setDraggingEndpoint({ arrowId, endpoint })
  }, [pushHistory])

  // Rotation handle drag start
  const handleRotationMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    elementInteractionRef.current = true
    setTimeout(() => { elementInteractionRef.current = false }, 0)
    pushHistory()
    setIsRotating(true)
    setSelectedElementId(elementId)
  }, [pushHistory, setSelectedElementId])

  // Inline text editing helpers
  const startEditingText = useCallback((element: DiagramElement) => {
    if (isPlaying) return
    setEditingTextId(element.id)
    setEditingTextValue(element.label || '')
    setTimeout(() => {
      inlineInputRef.current?.focus()
      inlineInputRef.current?.select()
    }, 20)
  }, [isPlaying])

  const commitTextEdit = useCallback(() => {
    if (!editingTextId) return
    updateElementLabel(editingTextId, editingTextValue || 'Texto')
    setEditingTextId(null)
  }, [editingTextId, editingTextValue, updateElementLabel])

  const cancelTextEdit = useCallback(() => {
    setEditingTextId(null)
  }, [])

  const resetInteractions = useCallback(() => {
    setIsDragging(false)
    setZoneDragStart(null)
    setZoneDragCurrent(null)
    setDraggingEndpoint(null)
    setIsRotating(false)
    setDraggingZoneId(null)
    resizeRef.current = null
    marqueeStartRef.current = null
    marqueeEndRef.current = null
    setMarqueeStart(null)
    setMarqueeEnd(null)
    lastDragPosRef.current = null
  }, [])

  // ============ Renderers ============

  const renderElement = (element: DiagramElement) => {
    const { id, type, position, color, label, rotation } = element
    const isSelected = !isPlaying && allSelectedIds.has(id)

    const commonProps = {
      key: id,
      style: { cursor: isPlaying ? 'default' : 'move' } as React.CSSProperties,
      onMouseDown: (e: React.MouseEvent) => handleElementMouseDown(e, id),
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
    }

    // El texto se gestiona aparte porque tiene edición en línea
    if (type === 'text') {
      const fontSize = element.size || 13
      const currentLabel = editingTextId === id ? editingTextValue : (label || 'Texto')
      const textWidth = Math.max(80, currentLabel.length * fontSize * 0.6 + 24)
      const isEditing = editingTextId === id
      return (
        <g
          {...commonProps}
          transform={`translate(${position.x}, ${position.y})`}
          onDoubleClick={(e) => { e.stopPropagation(); startEditingText(element) }}
          style={{ cursor: isPlaying ? 'default' : isEditing ? 'text' : 'move' }}
        >
          {isSelected && !isEditing && (
            <rect x={-textWidth / 2 - 4} y={-fontSize / 2 - 4} width={textWidth + 8} height={fontSize + 8} fill="none" stroke="#FFE600" strokeWidth="1.5" strokeDasharray="4,2" rx="3" />
          )}
          {isEditing ? (
            <foreignObject x={-textWidth / 2 - 4} y={-fontSize / 2 - 6} width={textWidth + 8} height={fontSize + 12}>
              <input
                ref={inlineInputRef}
                value={editingTextValue}
                onChange={(e) => setEditingTextValue(e.target.value)}
                onBlur={commitTextEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitTextEdit() }
                  if (e.key === 'Escape') { e.preventDefault(); cancelTextEdit() }
                  e.stopPropagation()
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'rgba(0,0,0,0.75)',
                  color: color || '#FFFFFF',
                  border: '1.5px solid #FFE600',
                  borderRadius: '3px',
                  fontSize: `${fontSize}px`,
                  fontWeight: 'bold',
                  fontFamily: 'Arial',
                  textAlign: 'center',
                  outline: 'none',
                  padding: '0 4px',
                  boxSizing: 'border-box',
                }}
              />
            </foreignObject>
          ) : (
            <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill={color || '#FFFFFF'} fontSize={fontSize} fontWeight="bold" fontFamily="Arial">
              {label || 'Texto'}
            </text>
          )}
        </g>
      )
    }

    const rotatable = ROTATABLE_ELEMENTS.includes(type)
    const size = element.size || ELEMENT_SIZES[type as keyof typeof ELEMENT_SIZES] || 24

    return (
      <g {...commonProps} transform={`translate(${position.x}, ${position.y})`}>
        <g transform={rotatable && rotation ? `rotate(${rotation})` : undefined}>
          <ElementSymbol element={element} selected={isSelected} uid={uid} />
        </g>
        {/* Tirador de giro */}
        {rotatable && isSelected && !isPlaying && (
          <g onMouseDown={(e) => handleRotationMouseDown(e, id)} style={{ cursor: 'grab' }}>
            <line x1="0" y1={-size / 2 - 4} x2="0" y2={-size / 2 - 18} stroke="#FFE600" strokeWidth="1.5" strokeDasharray="3,2" />
            <circle cx="0" cy={-size / 2 - 22} r="5.5" fill="#FFE600" stroke="#000" strokeWidth="1" opacity="0.95" />
            <text x="0" y={-size / 2 - 21} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#000" fontFamily="Arial">↻</text>
          </g>
        )}
      </g>
    )
  }

  const renderArrow = (arrow: DiagramArrow) => {
    const isSelected = !isPlaying && allSelectedIds.has(arrow.id)
    return (
      <BoardArrow
        key={arrow.id}
        arrow={arrow}
        selected={isSelected}
        interactive={!isPlaying}
        onSelect={(e) => {
          e.stopPropagation()
          if (isPlaying) return
          elementInteractionRef.current = true
          setTimeout(() => { elementInteractionRef.current = false }, 0)
          setSelectedElementId(arrow.id)
        }}
        onEndpointMouseDown={(e, endpoint) => handleEndpointMouseDown(e, arrow.id, endpoint)}
      />
    )
  }

  const renderZone = (zone: DiagramZone) => {
    const { id, position, width, height, color, opacity, shape, label, rotation } = zone
    const isSelected = !isPlaying && allSelectedIds.has(id)
    const geo = zoneGeometry(zone)
    const cx = position.x + width / 2
    const cy = position.y + height / 2

    return (
      <g key={id}
        transform={rotation ? `rotate(${rotation}, ${cx}, ${cy})` : undefined}
        onMouseDown={(e) => handleZoneMouseDown(e, id)}
        onClick={(e) => { e.stopPropagation(); if (!isPlaying) { elementInteractionRef.current = true; setTimeout(() => { elementInteractionRef.current = false }, 0) } }}
        style={{ cursor: isPlaying ? 'default' : (activeTool === 'select' ? 'move' : 'pointer') }}
      >
        {shape === 'ellipse' ? (
          <ellipse
            cx={cx} cy={cy}
            rx={width / 2} ry={height / 2}
            fill={color} opacity={opacity || 0.3}
            stroke={isSelected ? '#FFE600' : zone.isPlayingArea ? '#FFFFFF' : 'none'}
            strokeWidth={isSelected ? 2 : zone.isPlayingArea ? 1.5 : 0}
            strokeDasharray={isSelected ? '6,3' : undefined}
          />
        ) : (
          <rect
            x={position.x} y={position.y} width={width} height={height}
            fill={color} opacity={opacity || 0.3}
            stroke={isSelected ? '#FFE600' : zone.isPlayingArea ? '#FFFFFF' : 'none'}
            strokeWidth={isSelected ? 2 : zone.isPlayingArea ? 1.5 : 0}
            strokeDasharray={isSelected ? '6,3' : undefined}
          />
        )}
        {label && (
          <text
            x={cx} y={cy}
            textAnchor="middle" dominantBaseline="middle"
            fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="Arial"
            opacity="0.9"
            style={{ pointerEvents: 'none' }}
          >
            {label}
          </text>
        )}
        {/* Cota en metros: siempre visible en el espacio de juego, y al seleccionar cualquier zona */}
        {!isPlaying && (isSelected || zone.isPlayingArea) && (
          <MeasureBadge
            x={cx}
            y={position.y - 8}
            text={`${geo.anchoX} × ${geo.altoY} m · ${geo.areaM2} m²`}
            highlight={!!zone.isPlayingArea}
          />
        )}
      </g>
    )
  }

  /** Tiradores de redimensionado de la zona seleccionada (solo si hay una única zona). */
  const renderZoneHandles = () => {
    if (isPlaying || activeTool !== 'select') return null
    const selectedZones = zones.filter((z) => allSelectedIds.has(z.id))
    if (selectedZones.length !== 1) return null
    const zone = selectedZones[0]
    // Si además hay otros elementos seleccionados, no se redimensiona: se mueve el conjunto
    if (allSelectedIds.size > 1) return null

    const { x, y } = zone.position
    const { width: w, height: h } = zone
    const pos: Record<ResizeHandle, [number, number]> = {
      nw: [x, y], n: [x + w / 2, y], ne: [x + w, y],
      e: [x + w, y + h / 2], se: [x + w, y + h], s: [x + w / 2, y + h],
      sw: [x, y + h], w: [x, y + h / 2],
    }
    const cx = x + w / 2
    const cy = y + h / 2

    return (
      <g transform={zone.rotation ? `rotate(${zone.rotation}, ${cx}, ${cy})` : undefined}>
        {RESIZE_HANDLES.map((handle) => {
          const [hx, hy] = pos[handle]
          return (
            <rect
              key={handle}
              x={hx - 4.5} y={hy - 4.5} width={9} height={9} rx={1.5}
              fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.4"
              style={{ cursor: HANDLE_CURSORS[handle] }}
              onMouseDown={(e) => handleResizeMouseDown(e, zone, handle)}
              onClick={(e) => e.stopPropagation()}
            />
          )
        })}
      </g>
    )
  }

  /** Recuadro de la selección múltiple (para ver qué se va a girar/invertir/agrupar). */
  const renderSelectionBox = () => {
    if (isPlaying || allSelectedIds.size < 2) return null
    const xs: number[] = []
    const ys: number[] = []
    elements.forEach((el) => { if (allSelectedIds.has(el.id)) { xs.push(el.position.x); ys.push(el.position.y) } })
    arrows.forEach((ar) => { if (allSelectedIds.has(ar.id)) { xs.push(ar.from.x, ar.to.x); ys.push(ar.from.y, ar.to.y) } })
    zones.forEach((z) => {
      if (allSelectedIds.has(z.id)) {
        xs.push(z.position.x, z.position.x + z.width)
        ys.push(z.position.y, z.position.y + z.height)
      }
    })
    if (xs.length === 0) return null
    const pad = 14
    const minX = Math.min(...xs) - pad
    const maxX = Math.max(...xs) + pad
    const minY = Math.min(...ys) - pad
    const maxY = Math.max(...ys) + pad

    return (
      <g pointerEvents="none">
        <rect
          x={minX} y={minY} width={maxX - minX} height={maxY - minY}
          fill="none" stroke="#38BDF8" strokeWidth="1.4" strokeDasharray="7,4" rx="4"
        />
        <MeasureBadge x={(minX + maxX) / 2} y={minY - 6} text={`${allSelectedIds.size} elementos`} />
      </g>
    )
  }

  const renderZoneDragPreview = () => {
    if (!zoneDragStart || !zoneDragCurrent) return null
    const x = Math.min(zoneDragStart.x, zoneDragCurrent.x)
    const y = Math.min(zoneDragStart.y, zoneDragCurrent.y)
    const w = Math.abs(zoneDragCurrent.x - zoneDragStart.x)
    const h = Math.abs(zoneDragCurrent.y - zoneDragStart.y)
    const geo = zoneGeometry({ width: w, height: h, shape: activeTool === 'zone_circle' ? 'ellipse' : 'rectangle' })

    return (
      <g pointerEvents="none">
        {activeTool === 'zone_circle' ? (
          <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={zoneColor} opacity={0.3} stroke="#FFE600" strokeWidth="1" strokeDasharray="4,2" />
        ) : (
          <rect x={x} y={y} width={w} height={h} fill={zoneColor} opacity={0.3} stroke="#FFE600" strokeWidth="1" strokeDasharray="4,2" />
        )}
        {w > 4 && h > 4 && (
          <MeasureBadge x={x + w / 2} y={y - 8} text={`${geo.anchoX} × ${geo.altoY} m · ${geo.areaM2} m²`} highlight />
        )}
      </g>
    )
  }

  const boardCanvas = (
    <div
      className="flex-1 min-h-0 bg-green-900 overflow-hidden relative"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={resetInteractions}
      onClick={() => containerRef.current?.focus()}
    >
      <ABPPitch
        type={pitchType}
        orientation={isHorizontal ? 'horizontal' : 'vertical'}
        className="w-full h-full"
        onClick={handlePitchClick}
        onMouseDown={handlePitchMouseDown}
      >
        <BoardDefs uid={uid} />
        <g ref={gRef}>
          {renderZones.map(renderZone)}
          {!isPlaying && renderZoneDragPreview()}
          {renderArrows.map(renderArrow)}
          {!isPlaying && arrowStart && (
            <circle cx={arrowStart.x} cy={arrowStart.y} r="6" fill="#FFE600" stroke="#000" strokeWidth="1" opacity="0.85" />
          )}
          {renderElements.map(renderElement)}
          {renderSelectionBox()}
          {renderZoneHandles()}
          {/* Marquee selection rectangle */}
          {!isPlaying && marqueeStart && marqueeEnd && (
            <rect
              x={Math.min(marqueeStart.x, marqueeEnd.x)}
              y={Math.min(marqueeStart.y, marqueeEnd.y)}
              width={Math.abs(marqueeEnd.x - marqueeStart.x)}
              height={Math.abs(marqueeEnd.y - marqueeStart.y)}
              fill="rgba(59,130,246,0.10)"
              stroke="#3B82F6"
              strokeWidth="1"
              strokeDasharray="4,2"
              pointerEvents="none"
            />
          )}
        </g>
      </ABPPitch>

      {/* Panel de propiedades del elemento seleccionado */}
      {!isPlaying && <ElementEditPanel />}

      {/* Métricas del espacio (metros, m²/jugador, condicionalidad) */}
      {!isPlaying && (
        <GeometryPanel numJugadores={numJugadores} onApplyEspacio={onApplyEspacio} />
      )}
    </div>
  )

  return (
    <div ref={containerRef} tabIndex={0} className="flex flex-col h-full outline-none">
      {/* Top bar */}
      {!embedded && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0">
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la pizarra..."
            className="flex-1 text-lg font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300"
          />
          <div className="flex items-center gap-2 flex-shrink-0">
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
      )}

      {/* Toolbar */}
      <BoardToolbar
        arrowStart={!!arrowStart}
        onLoadFormation={handleLoadFormation}
        onExport={() => setShowExport(true)}
      />

      {/* Pitch */}
      {boardCanvas}

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
          boardName={nombre || 'pizarra'}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}

/** Etiqueta de cota sobre el campo (fondo oscuro para que se lea sobre el césped). */
function MeasureBadge({ x, y, text, highlight = false }: { x: number; y: number; text: string; highlight?: boolean }) {
  const width = text.length * 5.6 + 12
  return (
    <g pointerEvents="none">
      <rect
        x={x - width / 2} y={y - 13} width={width} height={16} rx={3}
        fill={highlight ? 'rgba(250,204,21,0.92)' : 'rgba(17,24,39,0.82)'}
      />
      <text
        x={x} y={y - 5}
        textAnchor="middle" dominantBaseline="middle"
        fill={highlight ? '#111827' : '#FFFFFF'}
        fontSize="9.5" fontWeight="bold" fontFamily="Arial"
      >
        {text}
      </text>
    </g>
  )
}
