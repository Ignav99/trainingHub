'use client'

import { create } from 'zustand'
import type { DrawingElement } from '@/types'
import type { Clip, DrawingTool, FreezeFrame, ViewMode } from './types'
import { CLIP_COLORS } from './types'
import { generateId } from './utils'

interface VideoAnalyzerState {
  // Video
  src: string
  duration: number
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

  // View mode
  viewMode: ViewMode
  editingClipId: string | null
  activeFreezeFrameId: string | null

  // UI
  exportingClipId: string | null

  // Video actions
  setSrc: (src: string) => void
  setDuration: (d: number) => void
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
  mergeClips: (ids: string[]) => void

  // View mode actions
  setViewMode: (mode: ViewMode) => void
  enterClipEditor: (clipId: string) => void
  exitClipEditor: () => void
  setActiveFreezeFrameId: (id: string | null) => void

  // Freeze frame actions
  addFreezeFrame: (clipId: string, frame: FreezeFrame) => void
  updateFreezeFrame: (clipId: string, frameId: string, patch: Partial<Omit<FreezeFrame, 'id'>>) => void
  removeFreezeFrame: (clipId: string, frameId: string) => void

  // UI actions
  setExportingClipId: (id: string | null) => void
}

export const useVideoAnalyzerStore = create<VideoAnalyzerState>((set, get) => ({
  // Video
  src: '',
  duration: 0,
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

  // View mode
  viewMode: 'general',
  editingClipId: null,
  activeFreezeFrameId: null,

  // UI
  exportingClipId: null,

  // Video actions
  setSrc: (src) => set({ src }),
  setDuration: (duration) => set({ duration }),
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
      freezeFrames: [],
    }
    set({ clips: [...clips, clip], activeClipId: clip.id })
    return clip
  },
  updateClip: (id, patch) => {
    set({
      clips: get().clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
  },
  removeClip: (id) => {
    const { clips, activeClipId, editingClipId } = get()
    const updates: Partial<VideoAnalyzerState> = {
      clips: clips.filter((c) => c.id !== id),
      activeClipId: activeClipId === id ? null : activeClipId,
    }
    // If we're editing this clip, exit clip editor
    if (editingClipId === id) {
      updates.viewMode = 'general'
      updates.editingClipId = null
    }
    set(updates)
  },
  setActiveClipId: (activeClipId) => set({ activeClipId }),

  mergeClips: (ids) => {
    const { clips } = get()
    const toMerge = clips.filter((c) => ids.includes(c.id)).sort((a, b) => a.startTime - b.startTime)
    if (toMerge.length < 2) return

    const merged: Clip = {
      id: generateId(),
      title: toMerge.map((c) => c.title).join(' + '),
      startTime: toMerge[0].startTime,
      endTime: toMerge[toMerge.length - 1].endTime,
      color: toMerge[0].color,
      freezeFrames: toMerge.flatMap((c) => c.freezeFrames),
    }

    const remaining = clips.filter((c) => !ids.includes(c.id))
    set({ clips: [...remaining, merged], activeClipId: merged.id })
  },

  // View mode actions
  setViewMode: (viewMode) => set({ viewMode }),
  enterClipEditor: (clipId) => set({ viewMode: 'clip-editor', editingClipId: clipId, activeClipId: clipId, activeFreezeFrameId: null }),
  exitClipEditor: () => set({ viewMode: 'general', editingClipId: null, activeFreezeFrameId: null }),
  setActiveFreezeFrameId: (activeFreezeFrameId) => set({ activeFreezeFrameId }),

  // Freeze frame actions
  addFreezeFrame: (clipId, frame) => {
    set({
      clips: get().clips.map((c) =>
        c.id === clipId
          ? { ...c, freezeFrames: [...c.freezeFrames, frame] }
          : c
      ),
    })
  },
  updateFreezeFrame: (clipId, frameId, patch) => {
    set({
      clips: get().clips.map((c) =>
        c.id === clipId
          ? {
              ...c,
              freezeFrames: c.freezeFrames.map((f) =>
                f.id === frameId ? { ...f, ...patch } : f
              ),
            }
          : c
      ),
    })
  },
  removeFreezeFrame: (clipId, frameId) => {
    set({
      clips: get().clips.map((c) =>
        c.id === clipId
          ? { ...c, freezeFrames: c.freezeFrames.filter((f) => f.id !== frameId) }
          : c
      ),
    })
  },

  // UI actions
  setExportingClipId: (exportingClipId) => set({ exportingClipId }),
}))
