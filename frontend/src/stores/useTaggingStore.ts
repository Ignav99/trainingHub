'use client'

import { create } from 'zustand'
import { videoTagsApi, type VideoTagCategory, type VideoTag, type CreateTagData } from '@/lib/api/videoTags'

export type TagFilter = {
  categoryId?: string
  jugadorId?: string
  fase?: string
  source?: string
  search?: string
}

export type SidebarTab = 'tagging' | 'tags' | 'playlists'

interface TaggingState {
  // Data
  categories: VideoTagCategory[]
  tags: VideoTag[]
  categoriesLoaded: boolean

  // UI
  activeTab: SidebarTab
  activeCategory: VideoTagCategory | null
  selectedTagId: string | null
  filters: TagFilter
  isTagging: boolean
  tagStartMs: number | null
  mode: 'tag' | 'draw'

  // Actions
  setActiveTab: (tab: SidebarTab) => void
  setActiveCategory: (cat: VideoTagCategory | null) => void
  setSelectedTagId: (id: string | null) => void
  setFilters: (filters: TagFilter) => void
  setIsTagging: (v: boolean) => void
  setTagStartMs: (ms: number | null) => void
  setMode: (mode: 'tag' | 'draw') => void

  // Async actions
  fetchCategories: (equipoId: string) => Promise<void>
  fetchTags: (videoId: string) => Promise<void>
  createTag: (videoId: string, data: CreateTagData) => Promise<VideoTag | null>
  updateTag: (tagId: string, data: Partial<CreateTagData>) => Promise<void>
  deleteTag: (tagId: string) => Promise<void>
  seedCategories: (equipoId: string) => Promise<void>

  // Quick tag (keyboard shortcut: press key → create tag at current time)
  startQuickTag: (category: VideoTagCategory, currentMs: number) => void
  finishQuickTag: (videoId: string, descriptorId?: string, jugadorId?: string) => Promise<VideoTag | null>
  cancelQuickTag: () => void

  // Reset
  reset: () => void
}

const initialState = {
  categories: [] as VideoTagCategory[],
  tags: [] as VideoTag[],
  categoriesLoaded: false,
  activeTab: 'tagging' as SidebarTab,
  activeCategory: null as VideoTagCategory | null,
  selectedTagId: null as string | null,
  filters: {} as TagFilter,
  isTagging: false,
  tagStartMs: null as number | null,
  mode: 'tag' as 'tag' | 'draw',
}

export const useTaggingStore = create<TaggingState>((set, get) => ({
  ...initialState,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setSelectedTagId: (id) => set({ selectedTagId: id }),
  setFilters: (filters) => set({ filters }),
  setIsTagging: (v) => set({ isTagging: v }),
  setTagStartMs: (ms) => set({ tagStartMs: ms }),
  setMode: (mode) => set({ mode }),

  fetchCategories: async (equipoId) => {
    try {
      const res = await videoTagsApi.listCategories(equipoId)
      set({ categories: res.data, categoriesLoaded: true })
    } catch (err) {
      console.error('Failed to fetch tag categories:', err)
    }
  },

  fetchTags: async (videoId) => {
    try {
      const res = await videoTagsApi.listTags(videoId)
      set({ tags: res.data })
    } catch (err) {
      console.error('Failed to fetch tags:', err)
    }
  },

  createTag: async (videoId, data) => {
    try {
      const tag = await videoTagsApi.createTag(videoId, data)
      set((s) => ({ tags: [...s.tags, tag] }))
      return tag
    } catch (err) {
      console.error('Failed to create tag:', err)
      return null
    }
  },

  updateTag: async (tagId, data) => {
    try {
      const updated = await videoTagsApi.updateTag(tagId, data)
      set((s) => ({
        tags: s.tags.map((t) => (t.id === tagId ? updated : t)),
      }))
    } catch (err) {
      console.error('Failed to update tag:', err)
    }
  },

  deleteTag: async (tagId) => {
    try {
      await videoTagsApi.deleteTag(tagId)
      set((s) => ({
        tags: s.tags.filter((t) => t.id !== tagId),
        selectedTagId: s.selectedTagId === tagId ? null : s.selectedTagId,
      }))
    } catch (err) {
      console.error('Failed to delete tag:', err)
    }
  },

  seedCategories: async (equipoId) => {
    try {
      await videoTagsApi.seedCategories(equipoId)
      await get().fetchCategories(equipoId)
    } catch (err) {
      console.error('Failed to seed categories:', err)
    }
  },

  startQuickTag: (category, currentMs) => {
    set({
      activeCategory: category,
      isTagging: true,
      tagStartMs: currentMs,
    })
  },

  finishQuickTag: async (videoId, descriptorId, jugadorId) => {
    const { activeCategory, tagStartMs } = get()
    if (!activeCategory || tagStartMs === null) return null

    const endMs = tagStartMs + activeCategory.default_duration_secs * 1000
    const data: CreateTagData = {
      video_id: videoId,
      category_id: activeCategory.id,
      start_ms: tagStartMs,
      end_ms: endMs,
      descriptor_id: descriptorId,
      jugador_id: jugadorId,
      fase: activeCategory.fase || undefined,
    }

    const tag = await get().createTag(videoId, data)
    set({ isTagging: false, tagStartMs: null, activeCategory: null })
    return tag
  },

  cancelQuickTag: () => {
    set({ isTagging: false, tagStartMs: null, activeCategory: null })
  },

  reset: () => set(initialState),
}))
