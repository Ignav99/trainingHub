import { create } from 'zustand'
import {
  DiagramElement,
  DiagramArrow,
  DiagramZone,
  BoardTool,
  PitchType,
  BoardType,
  TransitionType,
  Keyframe,
  DiagramSnapshot,
  MAX_HISTORY,
  generateId,
  TEAM_COLORS,
  Position,
} from '@/components/tactical-board/types'
import { FORMATIONS } from '@/lib/formations'
import { metersToUnits } from '@/lib/tacticalMetrics'

/** Transformación aplicable a una selección o a un pegado. */
export interface SelectionTransform {
  /** Giro en grados alrededor del centro de la selección */
  rotate?: number
  /** Espejo horizontal ('h') o vertical ('v') */
  flip?: 'h' | 'v'
  /** Desplazamiento posterior */
  dx?: number
  dy?: number
}

interface BBox { minX: number; minY: number; maxX: number; maxY: number; cx: number; cy: number }

/** Bounding box de un conjunto de elementos/flechas/zonas. */
function bboxOf(snap: DiagramSnapshot): BBox | null {
  const xs: number[] = []
  const ys: number[] = []
  snap.elements.forEach((el) => { xs.push(el.position.x); ys.push(el.position.y) })
  snap.arrows.forEach((ar) => { xs.push(ar.from.x, ar.to.x); ys.push(ar.from.y, ar.to.y) })
  snap.zones.forEach((z) => {
    xs.push(z.position.x, z.position.x + z.width)
    ys.push(z.position.y, z.position.y + z.height)
  })
  if (xs.length === 0) return null
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
}

interface TransformMatrix { cx: number; cy: number; cos: number; sin: number; sx: number; sy: number; dx: number; dy: number }

function buildMatrix(box: BBox, t: SelectionTransform): TransformMatrix {
  const rad = ((t.rotate || 0) * Math.PI) / 180
  return {
    cx: box.cx,
    cy: box.cy,
    cos: Math.cos(rad),
    sin: Math.sin(rad),
    sx: t.flip === 'h' ? -1 : 1,
    sy: t.flip === 'v' ? -1 : 1,
    dx: t.dx || 0,
    dy: t.dy || 0,
  }
}

/** Espejo primero, giro después, todo alrededor del centro de la selección. */
function applyMatrix(p: Position, m: TransformMatrix): Position {
  const x0 = (p.x - m.cx) * m.sx
  const y0 = (p.y - m.cy) * m.sy
  return {
    x: Math.round(m.cx + x0 * m.cos - y0 * m.sin + m.dx),
    y: Math.round(m.cy + x0 * m.sin + y0 * m.cos + m.dy),
  }
}

/** Grados equivalentes que hay que sumar a la rotación propia de un elemento. */
function rotationDelta(m: TransformMatrix, t: SelectionTransform): number {
  const flipped = m.sx * m.sy < 0
  const rot = t.rotate || 0
  return flipped ? -rot : rot
}

function transformSnapshot(snap: DiagramSnapshot, t: SelectionTransform): DiagramSnapshot {
  const box = bboxOf(snap)
  if (!box) return snap
  const m = buildMatrix(box, t)
  const dRot = rotationDelta(m, t)
  const mirrorH = m.sx < 0
  const mirrorV = m.sy < 0

  return {
    elements: snap.elements.map((el) => ({
      ...el,
      position: applyMatrix(el.position, m),
      rotation: el.rotation !== undefined
        ? ((mirrorH !== mirrorV ? -el.rotation : el.rotation) + dRot + 360) % 360
        : el.rotation,
    })),
    arrows: snap.arrows.map((ar) => ({
      ...ar,
      from: applyMatrix(ar.from, m),
      to: applyMatrix(ar.to, m),
      // Un espejo invierte el sentido de la curvatura
      curvature: ar.curvature !== undefined && mirrorH !== mirrorV ? -ar.curvature : ar.curvature,
    })),
    zones: snap.zones.map((z) => {
      // Se transforma el centro y se conserva el tamaño; el giro va en `rotation`
      const center = applyMatrix({ x: z.position.x + z.width / 2, y: z.position.y + z.height / 2 }, m)
      const swap = Math.abs(((t.rotate || 0) % 180)) === 90
      const w = swap ? z.height : z.width
      const h = swap ? z.width : z.height
      const extraRot = swap ? 0 : dRot
      return {
        ...z,
        position: { x: Math.round(center.x - w / 2), y: Math.round(center.y - h / 2) },
        width: w,
        height: h,
        rotation: (((mirrorH !== mirrorV ? -(z.rotation || 0) : (z.rotation || 0)) + extraRot) + 360) % 360,
      }
    }),
  }
}

/** Clona una selección con ids nuevos, manteniendo la estructura de grupos. */
function cloneSnapshot(snap: DiagramSnapshot): DiagramSnapshot {
  const groupMap = new Map<string, string>()
  const remapGroup = (gid?: string) => {
    if (!gid) return undefined
    if (!groupMap.has(gid)) groupMap.set(gid, generateId())
    return groupMap.get(gid)
  }
  return {
    elements: snap.elements.map((el) => ({ ...el, id: generateId(), groupId: remapGroup(el.groupId) })),
    arrows: snap.arrows.map((ar) => ({ ...ar, id: generateId(), groupId: remapGroup(ar.groupId) })),
    zones: snap.zones.map((z) => ({ ...z, id: generateId(), groupId: remapGroup(z.groupId), isPlayingArea: false })),
  }
}

/** Normaliza anchos/altos negativos tras arrastrar un tirador. */
function normalizeRect(x: number, y: number, w: number, h: number) {
  return {
    position: { x: Math.round(w < 0 ? x + w : x), y: Math.round(h < 0 ? y + h : y) },
    width: Math.round(Math.abs(w)),
    height: Math.round(Math.abs(h)),
  }
}

interface TacticalBoardState {
  // Board identity
  boardId: string | null
  nombre: string
  descripcion: string
  tipo: BoardType
  pitchType: PitchType
  tags: string[]

  // Diagram data (current frame or static board)
  elements: DiagramElement[]
  arrows: DiagramArrow[]
  zones: DiagramZone[]

  // Keyframes (animated mode)
  keyframes: Keyframe[]
  activeKeyframeIndex: number
  isPlaying: boolean

  // Editor state
  activeTool: BoardTool
  selectedElementId: string | null
  selectedElementIds: string[]
  isDirty: boolean
  saving: boolean
  zoneColor: string
  playerCounter: { team1: number; team2: number; gk: number }
  arrowCounter: number

  // Undo/Redo
  history: DiagramSnapshot[]
  historyIndex: number

  // Clipboard
  clipboard: DiagramSnapshot | null

  // Actions: state setters
  setNombre: (nombre: string) => void
  setDescripcion: (desc: string) => void
  setTipo: (tipo: BoardType) => void
  setPitchType: (pt: PitchType) => void
  setTags: (tags: string[]) => void
  setActiveTool: (tool: BoardTool) => void
  setSelectedElementId: (id: string | null) => void
  setSelectedElementIds: (ids: string[]) => void
  addToSelection: (id: string) => void
  selectAll: () => void
  setZoneColor: (color: string) => void
  setSaving: (saving: boolean) => void
  setIsPlaying: (playing: boolean) => void
  markClean: () => void

  // Actions: diagram mutations
  addElement: (el: DiagramElement) => void
  updateElementPosition: (id: string, x: number, y: number) => void
  moveSelectedBy: (dx: number, dy: number) => void
  updateElementColor: (id: string, color: string) => void
  updateElementRotation: (id: string, rotation: number) => void
  updateElementLabel: (id: string, label: string) => void
  updateElementSize: (id: string, size: number) => void
  addArrow: (arrow: DiagramArrow) => void
  updateArrowEndpoint: (id: string, endpoint: 'from' | 'to', pos: Position) => void
  updateArrowLabel: (id: string, label: string) => void
  updateArrowComment: (id: string, comment: string) => void
  updateArrowType: (id: string, type: DiagramArrow['type']) => void
  updateArrowCurvature: (id: string, curvature: number) => void
  addZone: (zone: DiagramZone) => void
  updateZoneLabel: (id: string, label: string) => void
  updateZoneColor: (id: string, color: string) => void
  updateZoneOpacity: (id: string, opacity: number) => void
  updateZonePosition: (id: string, x: number, y: number) => void
  deleteSelected: () => void
  clearDiagram: () => void

  // Actions: geometría de zonas (metros)
  resizeZone: (id: string, rect: { x: number; y: number; width: number; height: number }) => void
  setZoneSizeMeters: (id: string, largoM: number, anchoM: number) => void
  setZoneRotation: (id: string, rotation: number) => void
  setZonePlayingArea: (id: string) => void

  // Actions: undo/redo
  pushHistory: () => void
  undo: () => void
  redo: () => void

  // Actions: clipboard + transformaciones + grupos
  getSelection: () => DiagramSnapshot
  copySelected: () => void
  cutSelected: () => void
  pasteClipboard: (transform?: SelectionTransform) => void
  duplicateSelected: () => void
  transformSelection: (transform: SelectionTransform) => void
  groupSelection: () => void
  ungroupSelection: () => void
  /** Amplía una lista de ids para incluir a todos los miembros de sus grupos */
  expandWithGroups: (ids: string[]) => string[]
  nudgeSelected: (dx: number, dy: number) => void

  // Actions: formations
  loadFormation: (formationName: string, team: 'home' | 'away') => void

  // Actions: keyframe management
  addKeyframe: () => void
  deleteKeyframe: (index: number) => void
  selectKeyframe: (index: number) => void
  updateKeyframeDuration: (index: number, duration: number) => void
  updateKeyframeTransition: (index: number, transition: TransitionType) => void
  updateKeyframeNotes: (index: number, notes: string) => void
  saveCurrentToKeyframe: () => void

  // Actions: board lifecycle
  loadBoard: (board: any) => void
  getSnapshot: () => { elements: DiagramElement[]; arrows: DiagramArrow[]; zones: DiagramZone[] }
  reset: () => void
}

const initialState = {
  boardId: null as string | null,
  nombre: '',
  descripcion: '',
  tipo: 'static' as BoardType,
  pitchType: 'full' as PitchType,
  tags: [] as string[],
  elements: [] as DiagramElement[],
  arrows: [] as DiagramArrow[],
  zones: [] as DiagramZone[],
  keyframes: [] as Keyframe[],
  activeKeyframeIndex: 0,
  isPlaying: false,
  activeTool: 'select' as BoardTool,
  selectedElementId: null as string | null,
  selectedElementIds: [] as string[],
  isDirty: false,
  saving: false,
  zoneColor: '#3B82F6',
  playerCounter: { team1: 1, team2: 1, gk: 1 },
  arrowCounter: 1,
  history: [] as DiagramSnapshot[],
  historyIndex: -1,
  clipboard: null as DiagramSnapshot | null,
}

export const useTacticalBoardStore = create<TacticalBoardState>((set, get) => ({
  ...initialState,

  // State setters
  setNombre: (nombre) => set({ nombre, isDirty: true }),
  setDescripcion: (descripcion) => set({ descripcion, isDirty: true }),
  setTipo: (tipo) => set({ tipo, isDirty: true }),
  setPitchType: (pitchType) => set({ pitchType, isDirty: true }),
  setTags: (tags) => set({ tags, isDirty: true }),
  setActiveTool: (activeTool) => set({ activeTool, selectedElementId: null, selectedElementIds: [] }),
  setSelectedElementId: (selectedElementId) => {
    if (!selectedElementId) {
      set({ selectedElementId: null, selectedElementIds: [] })
      return
    }
    // Pinchar un miembro de un grupo selecciona el grupo entero
    const ids = get().expandWithGroups([selectedElementId])
    set({
      selectedElementId: ids.length === 1 ? selectedElementId : null,
      selectedElementIds: ids.length === 1 ? [] : ids,
    })
  },
  setSelectedElementIds: (ids) => {
    const expanded = get().expandWithGroups(ids)
    set({
      selectedElementIds: expanded,
      selectedElementId: expanded.length === 1 ? expanded[0] : null,
    })
  },
  addToSelection: (id) => {
    const s = get()
    const members = s.expandWithGroups([id])
    const already = members.every((m) => s.selectedElementIds.includes(m))
    const newIds = already
      ? s.selectedElementIds.filter((i) => !members.includes(i))
      : Array.from(new Set([...s.selectedElementIds, ...members]))
    set({ selectedElementIds: newIds, selectedElementId: newIds.length === 1 ? newIds[0] : null })
  },
  selectAll: () => {
    const { elements, arrows, zones } = get()
    const ids = [...elements.map((e) => e.id), ...arrows.map((a) => a.id), ...zones.map((z) => z.id)]
    set({ selectedElementIds: ids, selectedElementId: null })
  },
  setZoneColor: (zoneColor) => set({ zoneColor }),
  setSaving: (saving) => set({ saving }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  markClean: () => set({ isDirty: false }),

  // Diagram mutations
  /**
   * Anade un elemento. La herramienta activa NO se resetea: asi se pueden
   * sembrar 4-5 jugadores seguidos sin volver a picar el icono (Esc o
   * "Seleccionar" para salir del modo colocacion).
   */
  addElement: (el) => {
    const state = get()
    const counter = { ...state.playerCounter }
    if (el.type === 'player') counter.team1++
    else if (el.type === 'opponent') counter.team2++
    else if (el.type === 'player_gk') counter.gk++
    set((s) => ({
      elements: [...s.elements, el],
      playerCounter: counter,
      isDirty: true,
    }))
  },

  updateElementPosition: (id, x, y) => {
    set((s) => ({
      elements: s.elements.map((el) =>
        el.id === id ? { ...el, position: { x, y } } : el
      ),
      isDirty: true,
    }))
  },

  moveSelectedBy: (dx, dy) => {
    const state = get()
    const selectedElementIds = [
      ...state.selectedElementIds,
      ...(state.selectedElementId ? [state.selectedElementId] : []),
    ]
    if (selectedElementIds.length === 0 || (dx === 0 && dy === 0)) return
    set((s) => ({
      elements: s.elements.map((el) =>
        selectedElementIds.includes(el.id)
          ? { ...el, position: { x: el.position.x + dx, y: el.position.y + dy } }
          : el
      ),
      arrows: s.arrows.map((ar) =>
        selectedElementIds.includes(ar.id)
          ? { ...ar, from: { x: ar.from.x + dx, y: ar.from.y + dy }, to: { x: ar.to.x + dx, y: ar.to.y + dy } }
          : ar
      ),
      zones: s.zones.map((z) =>
        selectedElementIds.includes(z.id)
          ? { ...z, position: { x: z.position.x + dx, y: z.position.y + dy } }
          : z
      ),
      isDirty: true,
    }))
  },

  updateElementColor: (id, color) => {
    set((s) => ({
      elements: s.elements.map((el) => el.id === id ? { ...el, color } : el),
      isDirty: true,
    }))
  },

  updateElementRotation: (id, rotation) => {
    set((s) => ({
      elements: s.elements.map((el) => el.id === id ? { ...el, rotation } : el),
      isDirty: true,
    }))
  },

  updateElementLabel: (id, label) => {
    set((s) => ({
      elements: s.elements.map((el) => el.id === id ? { ...el, label } : el),
      isDirty: true,
    }))
  },

  updateElementSize: (id, size) => {
    set((s) => ({
      elements: s.elements.map((el) => el.id === id ? { ...el, size } : el),
      isDirty: true,
    }))
  },

  addArrow: (arrow) => {
    set((s) => ({
      arrows: [...s.arrows, arrow],
      arrowCounter: s.arrowCounter + 1,
      isDirty: true,
    }))
  },

  updateArrowEndpoint: (id, endpoint, pos) => {
    set((s) => ({
      arrows: s.arrows.map((ar) => ar.id === id ? { ...ar, [endpoint]: pos } : ar),
      isDirty: true,
    }))
  },

  updateArrowLabel: (id, label) => {
    set((s) => ({
      arrows: s.arrows.map((ar) => ar.id === id ? { ...ar, label } : ar),
      isDirty: true,
    }))
  },

  updateArrowComment: (id, comment) => {
    set((s) => ({
      arrows: s.arrows.map((ar) => ar.id === id ? { ...ar, comment } : ar),
      isDirty: true,
    }))
  },

  updateArrowType: (id, type) => {
    set((s) => ({
      // Al cambiar de tipo se adopta el color por defecto salvo que se haya personalizado
      arrows: s.arrows.map((ar) => ar.id === id ? { ...ar, type, color: undefined } : ar),
      isDirty: true,
    }))
  },

  updateArrowCurvature: (id, curvature) => {
    set((s) => ({
      arrows: s.arrows.map((ar) => ar.id === id ? { ...ar, curvature } : ar),
      isDirty: true,
    }))
  },

  addZone: (zone) => {
    set((s) => ({
      zones: [...s.zones, zone],
      isDirty: true,
    }))
  },

  updateZoneLabel: (id, label) => {
    set((s) => ({
      zones: s.zones.map((z) => z.id === id ? { ...z, label } : z),
      isDirty: true,
    }))
  },

  updateZoneColor: (id, color) => {
    set((s) => ({
      zones: s.zones.map((z) => z.id === id ? { ...z, color } : z),
      isDirty: true,
    }))
  },

  updateZoneOpacity: (id, opacity) => {
    set((s) => ({
      zones: s.zones.map((z) => z.id === id ? { ...z, opacity } : z),
      isDirty: true,
    }))
  },

  updateZonePosition: (id, x, y) => {
    set((s) => ({
      zones: s.zones.map((z) => z.id === id ? { ...z, position: { x, y } } : z),
      isDirty: true,
    }))
  },

  deleteSelected: () => {
    const { selectedElementId, selectedElementIds } = get()
    const idsToDelete = new Set([...selectedElementIds, ...(selectedElementId ? [selectedElementId] : [])])
    if (idsToDelete.size === 0) return
    get().pushHistory()
    set((s) => ({
      elements: s.elements.filter((el) => !idsToDelete.has(el.id)),
      arrows: s.arrows.filter((ar) => !idsToDelete.has(ar.id)),
      zones: s.zones.filter((z) => !idsToDelete.has(z.id)),
      selectedElementId: null,
      selectedElementIds: [],
      isDirty: true,
    }))
  },

  // Geometría de zonas (los metros salen de aquí)
  resizeZone: (id, rect) => {
    const norm = normalizeRect(rect.x, rect.y, rect.width, rect.height)
    // Mínimo 1 m de lado para que la zona siga siendo agarrable
    if (norm.width < 10 || norm.height < 10) return
    set((s) => ({
      zones: s.zones.map((z) => z.id === id ? { ...z, ...norm } : z),
      isDirty: true,
    }))
  },

  setZoneSizeMeters: (id, largoM, anchoM) => {
    const width = Math.max(10, Math.round(metersToUnits(largoM)))
    const height = Math.max(10, Math.round(metersToUnits(anchoM)))
    set((s) => ({
      zones: s.zones.map((z) => {
        if (z.id !== id) return z
        // Se redimensiona desde el centro para que la zona no "salte"
        const cx = z.position.x + z.width / 2
        const cy = z.position.y + z.height / 2
        return {
          ...z,
          width,
          height,
          position: { x: Math.round(cx - width / 2), y: Math.round(cy - height / 2) },
        }
      }),
      isDirty: true,
    }))
  },

  setZoneRotation: (id, rotation) => {
    set((s) => ({
      zones: s.zones.map((z) => z.id === id ? { ...z, rotation } : z),
      isDirty: true,
    }))
  },

  setZonePlayingArea: (id) => {
    set((s) => ({
      // Solo una zona puede ser el espacio de juego de referencia
      zones: s.zones.map((z) => ({ ...z, isPlayingArea: z.id === id ? !z.isPlayingArea : false })),
      isDirty: true,
    }))
  },

  clearDiagram: () => {
    get().pushHistory()
    set({
      elements: [],
      arrows: [],
      zones: [],
      playerCounter: { team1: 1, team2: 1, gk: 1 },
      arrowCounter: 1,
      selectedElementId: null,
      isDirty: true,
    })
  },

  // Undo/Redo
  pushHistory: () => {
    const { elements, arrows, zones, historyIndex, history } = get()
    const snap: DiagramSnapshot = {
      elements: [...elements],
      arrows: [...arrows],
      zones: [...zones],
    }
    const trimmed = history.slice(0, historyIndex + 1)
    trimmed.push(snap)
    if (trimmed.length > MAX_HISTORY) trimmed.shift()
    set({
      history: trimmed,
      historyIndex: Math.min(historyIndex + 1, MAX_HISTORY - 1),
    })
  },

  undo: () => {
    const { historyIndex, history } = get()
    if (historyIndex < 0) return
    const snap = history[historyIndex]
    if (!snap) return
    set({
      historyIndex: historyIndex - 1,
      elements: snap.elements,
      arrows: snap.arrows,
      zones: snap.zones,
    })
  },

  redo: () => {
    const { historyIndex, history } = get()
    if (historyIndex >= history.length - 1) return
    const snap = history[historyIndex + 1]
    if (!snap) return
    set({
      historyIndex: historyIndex + 1,
      elements: snap.elements,
      arrows: snap.arrows,
      zones: snap.zones,
    })
  },

  // Clipboard + transformaciones + grupos
  expandWithGroups: (ids) => {
    const { elements, arrows, zones } = get()
    const idSet = new Set(ids)
    const all = [
      ...elements.map((e) => ({ id: e.id, groupId: e.groupId })),
      ...arrows.map((a) => ({ id: a.id, groupId: a.groupId })),
      ...zones.map((z) => ({ id: z.id, groupId: z.groupId })),
    ]
    const groupIds = new Set(
      all.filter((it) => idSet.has(it.id) && it.groupId).map((it) => it.groupId as string)
    )
    if (groupIds.size === 0) return ids
    all.forEach((it) => { if (it.groupId && groupIds.has(it.groupId)) idSet.add(it.id) })
    return Array.from(idSet)
  },

  getSelection: () => {
    const { selectedElementId, selectedElementIds, elements, arrows, zones } = get()
    const ids = new Set([...selectedElementIds, ...(selectedElementId ? [selectedElementId] : [])])
    return {
      elements: elements.filter((el) => ids.has(el.id)),
      arrows: arrows.filter((ar) => ids.has(ar.id)),
      zones: zones.filter((z) => ids.has(z.id)),
    }
  },

  copySelected: () => {
    const sel = get().getSelection()
    if (sel.elements.length === 0 && sel.arrows.length === 0 && sel.zones.length === 0) return
    set({ clipboard: JSON.parse(JSON.stringify(sel)) })
  },

  cutSelected: () => {
    get().copySelected()
    get().deleteSelected()
  },

  pasteClipboard: (transform) => {
    const { clipboard } = get()
    if (!clipboard) return
    const count = clipboard.elements.length + clipboard.arrows.length + clipboard.zones.length
    if (count === 0) return
    get().pushHistory()

    const OFFSET = 24
    // Sin transformación explícita se pega desplazado; con ella se pega en el sitio
    const t: SelectionTransform = transform
      ? transform
      : { dx: OFFSET, dy: OFFSET }
    const pasted = cloneSnapshot(transformSnapshot(JSON.parse(JSON.stringify(clipboard)), t))

    const newIds = [
      ...pasted.elements.map((e) => e.id),
      ...pasted.arrows.map((a) => a.id),
      ...pasted.zones.map((z) => z.id),
    ]

    set((s) => ({
      elements: [...s.elements, ...pasted.elements],
      arrows: [...s.arrows, ...pasted.arrows],
      zones: [...s.zones, ...pasted.zones],
      selectedElementIds: newIds,
      selectedElementId: newIds.length === 1 ? newIds[0] : null,
      isDirty: true,
      activeTool: 'select',
    }))
  },

  duplicateSelected: () => {
    const sel = get().getSelection()
    const count = sel.elements.length + sel.arrows.length + sel.zones.length
    if (count === 0) return
    get().pushHistory()
    const OFFSET = 24
    const copy = cloneSnapshot(
      transformSnapshot(JSON.parse(JSON.stringify(sel)), { dx: OFFSET, dy: OFFSET })
    )
    const newIds = [
      ...copy.elements.map((e) => e.id),
      ...copy.arrows.map((a) => a.id),
      ...copy.zones.map((z) => z.id),
    ]
    set((s) => ({
      elements: [...s.elements, ...copy.elements],
      arrows: [...s.arrows, ...copy.arrows],
      zones: [...s.zones, ...copy.zones],
      selectedElementIds: newIds,
      selectedElementId: newIds.length === 1 ? newIds[0] : null,
      isDirty: true,
    }))
  },

  transformSelection: (transform) => {
    const sel = get().getSelection()
    const count = sel.elements.length + sel.arrows.length + sel.zones.length
    if (count === 0) return
    get().pushHistory()
    const transformed = transformSnapshot(JSON.parse(JSON.stringify(sel)), transform)

    const elMap = new Map(transformed.elements.map((e) => [e.id, e]))
    const arMap = new Map(transformed.arrows.map((a) => [a.id, a]))
    const znMap = new Map(transformed.zones.map((z) => [z.id, z]))

    set((s) => ({
      elements: s.elements.map((el) => elMap.get(el.id) || el),
      arrows: s.arrows.map((ar) => arMap.get(ar.id) || ar),
      zones: s.zones.map((z) => znMap.get(z.id) || z),
      isDirty: true,
    }))
  },

  groupSelection: () => {
    const sel = get().getSelection()
    const ids = new Set([
      ...sel.elements.map((e) => e.id),
      ...sel.arrows.map((a) => a.id),
      ...sel.zones.map((z) => z.id),
    ])
    if (ids.size < 2) return
    get().pushHistory()
    const groupId = generateId()
    set((s) => ({
      elements: s.elements.map((el) => (ids.has(el.id) ? { ...el, groupId } : el)),
      arrows: s.arrows.map((ar) => (ids.has(ar.id) ? { ...ar, groupId } : ar)),
      zones: s.zones.map((z) => (ids.has(z.id) ? { ...z, groupId } : z)),
      isDirty: true,
    }))
  },

  ungroupSelection: () => {
    const sel = get().getSelection()
    const ids = new Set([
      ...sel.elements.map((e) => e.id),
      ...sel.arrows.map((a) => a.id),
      ...sel.zones.map((z) => z.id),
    ])
    if (ids.size === 0) return
    get().pushHistory()
    const strip = <T extends { id: string; groupId?: string }>(it: T): T =>
      ids.has(it.id) ? { ...it, groupId: undefined } : it
    set((s) => ({
      elements: s.elements.map(strip),
      arrows: s.arrows.map(strip),
      zones: s.zones.map(strip),
      isDirty: true,
    }))
  },

  nudgeSelected: (dx, dy) => {
    get().moveSelectedBy(dx, dy)
  },

  // Formations
  loadFormation: (formationName, team) => {
    const formation = FORMATIONS.find((f) => f.name === formationName)
    if (!formation) return
    get().pushHistory()

    const state = get()
    const isHome = team === 'home'
    const color = isHome ? TEAM_COLORS.team1 : TEAM_COLORS.team2

    // Full field is displayed horizontally (1050x680), half is vertical (680x525)
    const isHorizontal = state.pitchType === 'full'

    const newElements: DiagramElement[] = formation.slots.map((slot) => {
      let pctLeft = parseFloat(slot.left) / 100
      let pctTop = parseFloat(slot.top) / 100

      // Mirror away team so they face opposite direction
      if (!isHome) {
        pctLeft = 1 - pctLeft
        pctTop = 1 - pctTop
      }

      let x: number, y: number
      if (isHorizontal) {
        // Convert vertical coordinates (680x1050) to horizontal (1050x680)
        const vx = Math.round(pctLeft * 680)
        const vy = Math.round(pctTop * 1050)
        x = 1050 - vy
        y = vx
      } else {
        x = Math.round(pctLeft * 680)
        y = Math.round(pctTop * 525)
      }

      return {
        id: generateId(),
        type: slot.position === 'POR' ? 'player_gk' : (isHome ? 'player' : 'opponent'),
        position: { x, y },
        label: slot.label,
        color: slot.position === 'POR' ? TEAM_COLORS.goalkeeper : color,
      }
    })

    // Remove existing players of this team type, keep everything else
    const typeToRemove = isHome ? ['player', 'player_gk'] : ['opponent']
    const filtered = state.elements.filter((el) => !typeToRemove.includes(el.type))

    set({
      elements: [...filtered, ...newElements],
      isDirty: true,
    })
  },

  // Keyframe management
  addKeyframe: () => {
    const { elements, arrows, zones, keyframes } = get()
    const newKf: Keyframe = {
      id: generateId(),
      orden: keyframes.length,
      nombre: `Frame ${keyframes.length + 1}`,
      duration_ms: 2000,
      elements: JSON.parse(JSON.stringify(elements)),
      arrows: JSON.parse(JSON.stringify(arrows)),
      zones: JSON.parse(JSON.stringify(zones)),
      transition_type: 'linear',
    }
    set({
      keyframes: [...keyframes, newKf],
      activeKeyframeIndex: keyframes.length,
      isDirty: true,
    })
  },

  deleteKeyframe: (index) => {
    const { keyframes, activeKeyframeIndex } = get()
    if (keyframes.length <= 1) return
    const updated = keyframes.filter((_, i) => i !== index).map((kf, i) => ({ ...kf, orden: i }))
    const newIndex = Math.min(activeKeyframeIndex, updated.length - 1)
    const kf = updated[newIndex]
    set({
      keyframes: updated,
      activeKeyframeIndex: newIndex,
      elements: kf ? JSON.parse(JSON.stringify(kf.elements)) : [],
      arrows: kf ? JSON.parse(JSON.stringify(kf.arrows)) : [],
      zones: kf ? JSON.parse(JSON.stringify(kf.zones)) : [],
      isDirty: true,
    })
  },

  selectKeyframe: (index) => {
    const state = get()
    // Save current state to active keyframe before switching
    const kfs = [...state.keyframes]
    if (kfs[state.activeKeyframeIndex]) {
      kfs[state.activeKeyframeIndex] = {
        ...kfs[state.activeKeyframeIndex],
        elements: JSON.parse(JSON.stringify(state.elements)),
        arrows: JSON.parse(JSON.stringify(state.arrows)),
        zones: JSON.parse(JSON.stringify(state.zones)),
      }
    }
    const target = kfs[index]
    if (!target) return
    set({
      keyframes: kfs,
      activeKeyframeIndex: index,
      elements: JSON.parse(JSON.stringify(target.elements)),
      arrows: JSON.parse(JSON.stringify(target.arrows)),
      zones: JSON.parse(JSON.stringify(target.zones)),
      selectedElementId: null,
    })
  },

  updateKeyframeDuration: (index, duration) => {
    set((s) => ({
      keyframes: s.keyframes.map((kf, i) => i === index ? { ...kf, duration_ms: duration } : kf),
      isDirty: true,
    }))
  },

  updateKeyframeTransition: (index, transition) => {
    set((s) => ({
      keyframes: s.keyframes.map((kf, i) => i === index ? { ...kf, transition_type: transition } : kf),
      isDirty: true,
    }))
  },

  updateKeyframeNotes: (index, notes) => {
    set((s) => ({
      keyframes: s.keyframes.map((kf, i) => i === index ? { ...kf, notes } : kf),
      isDirty: true,
    }))
  },

  saveCurrentToKeyframe: () => {
    const { elements, arrows, zones, keyframes, activeKeyframeIndex } = get()
    if (!keyframes[activeKeyframeIndex]) return
    const updated = [...keyframes]
    updated[activeKeyframeIndex] = {
      ...updated[activeKeyframeIndex],
      elements: JSON.parse(JSON.stringify(elements)),
      arrows: JSON.parse(JSON.stringify(arrows)),
      zones: JSON.parse(JSON.stringify(zones)),
    }
    set({ keyframes: updated, isDirty: true })
  },

  // Board lifecycle
  loadBoard: (board) => {
    // Convert server frames to keyframes
    const keyframes: Keyframe[] = (board.frames || []).map((f: any, i: number) => ({
      id: f.id || generateId(),
      orden: f.orden ?? i,
      nombre: f.nombre || `Frame ${i + 1}`,
      duration_ms: f.duration_ms || 2000,
      elements: f.elements || [],
      arrows: f.arrows || [],
      zones: f.zones || [],
      transition_type: f.transition_type || 'linear',
    }))

    set({
      boardId: board.id,
      nombre: board.nombre || '',
      descripcion: board.descripcion || '',
      tipo: board.tipo || 'static',
      pitchType: board.pitch_type || 'full',
      tags: board.tags || [],
      elements: board.elements || [],
      arrows: board.arrows || [],
      zones: board.zones || [],
      keyframes,
      activeKeyframeIndex: 0,
      isPlaying: false,
      isDirty: false,
      saving: false,
      activeTool: 'select',
      selectedElementId: null,
      selectedElementIds: [],
      history: [],
      historyIndex: -1,
      playerCounter: { team1: 1, team2: 1, gk: 1 },
      arrowCounter: 1,
    })
  },

  getSnapshot: () => {
    const { elements, arrows, zones } = get()
    return { elements, arrows, zones }
  },

  reset: () => set(initialState),
}))
