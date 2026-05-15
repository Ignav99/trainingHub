'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CodeButton, CodeEvent } from './types'
import { generateId } from './utils'

const DEFAULT_BUTTONS: CodeButton[] = [
  { id: 'btn-1', label: 'Ataque', color: '#ef4444', shortcut: '1', preRoll: 5, postRoll: 5 },
  { id: 'btn-2', label: 'Defensa', color: '#3b82f6', shortcut: '2', preRoll: 5, postRoll: 5 },
  { id: 'btn-3', label: 'Transición', color: '#22c55e', shortcut: '3', preRoll: 4, postRoll: 6 },
  { id: 'btn-4', label: 'Córner', color: '#f59e0b', shortcut: '4', preRoll: 3, postRoll: 8 },
]

interface CodeWindowState {
  // Buttons — persisted globally (user creates once, reuses across videos)
  buttons: CodeButton[]

  // Events — persisted per videoKey
  events: Record<string, CodeEvent[]>   // key: videoKey (partidoId or sanitized filename)
  currentVideoKey: string

  // UI state
  isEditMode: boolean
  activeButtonId: string | null         // last pressed button (visual feedback)

  // ─── Setters ───────────────────────────────────────────────────────────────
  setCurrentVideoKey: (key: string) => void
  setEditMode: (v: boolean) => void
  setActiveButtonId: (id: string | null) => void

  // ─── Button management ─────────────────────────────────────────────────────
  addButton: (btn: Omit<CodeButton, 'id'>) => CodeButton
  updateButton: (id: string, patch: Partial<Omit<CodeButton, 'id'>>) => void
  removeButton: (id: string) => void
  reorderButtons: (ids: string[]) => void

  // ─── Event management ──────────────────────────────────────────────────────
  recordEvent: (buttonId: string, timestamp: number, duration: number) => CodeEvent
  removeEvent: (videoKey: string, eventId: string) => void
  getEventsForVideo: (videoKey?: string) => CodeEvent[]
  getEventsByButton: (buttonId: string, videoKey?: string) => CodeEvent[]

  // ─── Reset ─────────────────────────────────────────────────────────────────
  resetEvents: (videoKey?: string) => void
}

export const useCodeWindowStore = create<CodeWindowState>()(
  persist(
    (set, get) => ({
      buttons: DEFAULT_BUTTONS,
      events: {},
      currentVideoKey: '',
      isEditMode: false,
      activeButtonId: null,

      setCurrentVideoKey: (key) => set({ currentVideoKey: key }),
      setEditMode: (isEditMode) => set({ isEditMode }),
      setActiveButtonId: (activeButtonId) => set({ activeButtonId }),

      addButton: (btn) => {
        const newBtn: CodeButton = { ...btn, id: generateId() }
        set((s) => ({ buttons: [...s.buttons, newBtn] }))
        return newBtn
      },

      updateButton: (id, patch) => {
        set((s) => ({
          buttons: s.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        }))
      },

      removeButton: (id) => {
        set((s) => ({ buttons: s.buttons.filter((b) => b.id !== id) }))
      },

      reorderButtons: (ids) => {
        set((s) => {
          const map = new Map(s.buttons.map((b) => [b.id, b]))
          return { buttons: ids.map((id) => map.get(id)).filter(Boolean) as CodeButton[] }
        })
      },

      recordEvent: (buttonId, timestamp, duration) => {
        const { currentVideoKey, buttons, events } = get()
        const btn = buttons.find((b) => b.id === buttonId)
        if (!btn) throw new Error(`Button ${buttonId} not found`)

        const event: CodeEvent = {
          id: generateId(),
          buttonId,
          timestamp,
          startTime: Math.max(0, timestamp - btn.preRoll),
          endTime: Math.min(duration, timestamp + btn.postRoll),
        }

        const key = currentVideoKey || '_default'
        const existing = events[key] || []
        set({ events: { ...events, [key]: [...existing, event] } })
        return event
      },

      removeEvent: (videoKey, eventId) => {
        set((s) => {
          const existing = s.events[videoKey] || []
          return { events: { ...s.events, [videoKey]: existing.filter((e) => e.id !== eventId) } }
        })
      },

      getEventsForVideo: (videoKey) => {
        const key = videoKey ?? get().currentVideoKey ?? '_default'
        return get().events[key] || []
      },

      getEventsByButton: (buttonId, videoKey) => {
        return get().getEventsForVideo(videoKey).filter((e) => e.buttonId === buttonId)
      },

      resetEvents: (videoKey) => {
        if (videoKey) {
          set((s) => ({ events: { ...s.events, [videoKey]: [] } }))
        } else {
          set({ events: {} })
        }
      },
    }),
    {
      name: 'kabin-code-window',
      // Persist buttons + events. Skip transient UI state.
      partialize: (s) => ({ buttons: s.buttons, events: s.events }),
    }
  )
)
