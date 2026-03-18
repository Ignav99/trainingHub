'use client'

import { create } from 'zustand'
import type { DrawingElement } from '@/types'
import type { Clip, DrawingTool } from './types'
import { CLIP_COLORS } from './types'
import { generateId } from './utils'

interface VideoAnalyzerState {
  // Video
  src: string
  duration: number
  currentTime: number
  isPlaying: boolean

  // Drawing
  tool: DrawingTool
  color: string
  strokeWidth: number
  selectedId: string | null
  elements: DrawingElement[]

  // Clips
  clips: Clip[]
  activeClipId: string | null

  // UI
  showSaveDialog: boolean
  exportingClipId: string | null
  sidebarTab: 'moments' | 'clips'

  // Video actions
  setSrc: (src: string) => void
  setDuration: (d: number) => void
  setCurrentTime: (t: number) => void
  setIsPlaying: (p: boolean) => void

  // Drawing actions
  setTool: (t: DrawingTool) => void
  setColor: (c: string) => void
  setStrokeWidth: (w: number) => void
  setSelectedId: (id: string | null) => void
  setElements: (els: DrawingElement[]) => void
  updateSelectedElementProps: (patch: Partial<Pick<DrawingElement, 'color' | 'strokeWidth'>>) => void

  // Clip actions
  addClip: (startTime: number, endTime: number, title?: string) => Clip
  updateClip: (id: string, patch: Partial<Omit<Clip, 'id'>>) => void
  removeClip: (id: string) => void
  setActiveClipId: (id: string | null) => void

  // UI actions
  setShowSaveDialog: (v: boolean) => void
  setExportingClipId: (id: string | null) => void
  setSidebarTab: (tab: 'moments' | 'clips') => void
}

export const useVideoAnalyzerStore = create<VideoAnalyzerState>((set, get) => ({
  // Video
  src: '',
  duration: 0,
  currentTime: 0,
  isPlaying: false,

  // Drawing
  tool: 'select',
  color: '#ef4444',
  strokeWidth: 4,
  selectedId: null,
  elements: [],

  // Clips
  clips: [],
  activeClipId: null,

  // UI
  showSaveDialog: false,
  exportingClipId: null,
  sidebarTab: 'moments',

  // Video actions
  setSrc: (src) => set({ src }),
  setDuration: (duration) => set({ duration }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  // Drawing actions
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setElements: (elements) => set({ elements }),
  updateSelectedElementProps: (patch) => {
    const { selectedId, elements } = get()
    if (!selectedId) return
    set({
      elements: elements.map((el) =>
        el.id === selectedId ? { ...el, ...patch } : el
      ),
    })
  },

  // Clip actions
  addClip: (startTime, endTime, title) => {
    const { clips } = get()
    const colorIdx = clips.length % CLIP_COLORS.length
    const clip: Clip = {
      id: generateId(),
      title: title || `Clip ${clips.length + 1}`,
      startTime,
      endTime,
      color: CLIP_COLORS[colorIdx],
    }
    set({ clips: [...clips, clip], activeClipId: clip.id, sidebarTab: 'clips' })
    return clip
  },
  updateClip: (id, patch) => {
    set({
      clips: get().clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
  },
  removeClip: (id) => {
    const { clips, activeClipId } = get()
    set({
      clips: clips.filter((c) => c.id !== id),
      activeClipId: activeClipId === id ? null : activeClipId,
    })
  },
  setActiveClipId: (activeClipId) => set({ activeClipId }),

  // UI actions
  setShowSaveDialog: (showSaveDialog) => set({ showSaveDialog }),
  setExportingClipId: (exportingClipId) => set({ exportingClipId }),
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
}))
