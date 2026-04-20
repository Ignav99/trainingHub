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
  isDirty: boolean
  saving: boolean
  zoneColor: string
  playerCounter: { team1: number; team2: number; gk: number }
  arrowCounter: number

  // Undo/Redo
  history: DiagramSnapshot[]
  historyIndex: number

  // Actions: state setters
  setNombre: (nombre: string) => void
  setDescripcion: (desc: string) => void
  setTipo: (tipo: BoardType) => void
  setPitchType: (pt: PitchType) => void
  setTags: (tags: string[]) => void
  setActiveTool: (tool: BoardTool) => void
  setSelectedElementId: (id: string | null) => void
  setZoneColor: (color: string) => void
  setSaving: (saving: boolean) => void
  setIsPlaying: (playing: boolean) => void
  markClean: () => void

  // Actions: diagram mutations
  addElement: (el: DiagramElement) => void
  updateElementPosition: (id: string, x: number, y: number) => void
  updateElementColor: (id: string, color: string) => void
  updateElementRotation: (id: string, rotation: number) => void
  addArrow: (arrow: DiagramArrow) => void
  updateArrowEndpoint: (id: string, endpoint: 'from' | 'to', pos: Position) => void
  addZone: (zone: DiagramZone) => void
  deleteSelected: () => void
  clearDiagram: () => void

  // Actions: undo/redo
  pushHistory: () => void
  undo: () => void
  redo: () => void

  // Actions: formations
  loadFormation: (formationName: string, team: 'home' | 'away') => void

  // Actions: keyframe management
  addKeyframe: () => void
  deleteKeyframe: (index: number) => void
  selectKeyframe: (index: number) => void
  updateKeyframeDuration: (index: number, duration: number) => void
  updateKeyframeTransition: (index: number, transition: TransitionType) => void
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
  isDirty: false,
  saving: false,
  zoneColor: '#3B82F6',
  playerCounter: { team1: 1, team2: 1, gk: 1 },
  arrowCounter: 1,
  history: [] as DiagramSnapshot[],
  historyIndex: -1,
}

export const useTacticalBoardStore = create<TacticalBoardState>((set, get) => ({
  ...initialState,

  // State setters
  setNombre: (nombre) => set({ nombre, isDirty: true }),
  setDescripcion: (descripcion) => set({ descripcion, isDirty: true }),
  setTipo: (tipo) => set({ tipo, isDirty: true }),
  setPitchType: (pitchType) => set({ pitchType, isDirty: true }),
  setTags: (tags) => set({ tags, isDirty: true }),
  setActiveTool: (activeTool) => set({ activeTool, selectedElementId: null }),
  setSelectedElementId: (selectedElementId) => set({ selectedElementId }),
  setZoneColor: (zoneColor) => set({ zoneColor }),
  setSaving: (saving) => set({ saving }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  markClean: () => set({ isDirty: false }),

  // Diagram mutations
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

  addZone: (zone) => {
    set((s) => ({
      zones: [...s.zones, zone],
      isDirty: true,
    }))
  },

  deleteSelected: () => {
    const { selectedElementId } = get()
    if (!selectedElementId) return
    get().pushHistory()
    set((s) => ({
      elements: s.elements.filter((el) => el.id !== selectedElementId),
      arrows: s.arrows.filter((ar) => ar.id !== selectedElementId),
      zones: s.zones.filter((z) => z.id !== selectedElementId),
      selectedElementId: null,
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
      const pctLeft = parseFloat(slot.left) / 100
      const pctTop = parseFloat(slot.top) / 100

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
