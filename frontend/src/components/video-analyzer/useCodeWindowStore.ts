'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CodeButton, CodeEvent } from './types'
import { generateId } from './utils'
import {
  DEFAULT_DESK_BUTTONS,
  clipRangeFromPress,
  clampClipTimes,
  migrateDeskButtons,
} from './videoDesk'

interface CodeWindowState {
  buttons: CodeButton[]
  events: Record<string, CodeEvent[]>
  currentVideoKey: string
  isEditMode: boolean
  activeButtonId: string | null

  setCurrentVideoKey: (key: string) => void
  setEditMode: (v: boolean) => void
  setActiveButtonId: (id: string | null) => void

  addButton: (btn: Omit<CodeButton, 'id'>) => CodeButton
  updateButton: (id: string, patch: Partial<Omit<CodeButton, 'id'>>) => void
  removeButton: (id: string) => void
  reorderButtons: (ids: string[]) => void

  recordEvent: (buttonId: string, timestamp: number, duration: number) => CodeEvent
  updateEvent: (
    videoKey: string,
    eventId: string,
    patch: Partial<Pick<CodeEvent, 'startTime' | 'endTime' | 'notes' | 'title'>>,
    duration?: number
  ) => void
  removeEvent: (videoKey: string, eventId: string) => void
  getEventsForVideo: (videoKey?: string) => CodeEvent[]
  getEventsByButton: (buttonId: string, videoKey?: string) => CodeEvent[]
  resetEvents: (videoKey?: string) => void
}

export const useCodeWindowStore = create<CodeWindowState>()(
  persist(
    (set, get) => ({
      buttons: DEFAULT_DESK_BUTTONS.map((b) => ({ ...b })),
      events: {},
      currentVideoKey: '',
      isEditMode: false,
      activeButtonId: null,

      setCurrentVideoKey: (key) => set({ currentVideoKey: key }),
      setEditMode: (isEditMode) => set({ isEditMode }),
      setActiveButtonId: (activeButtonId) => set({ activeButtonId }),

      addButton: (btn) => {
        const newBtn: CodeButton = {
          ...btn,
          id: generateId(),
          size: btn.size || 'm',
          preRoll: Number.isFinite(btn.preRoll) ? btn.preRoll : 5,
          postRoll: Number.isFinite(btn.postRoll) ? btn.postRoll : 5,
        }
        set((s) => ({ buttons: [...s.buttons, newBtn] }))
        return newBtn
      },

      updateButton: (id, patch) => {
        set((s) => ({
          buttons: s.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        }))
      },

      removeButton: (id) => {
        set((s) => ({
          buttons: s.buttons.filter((b) => b.id !== id),
          activeButtonId: s.activeButtonId === id ? null : s.activeButtonId,
        }))
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

        const range = clipRangeFromPress(timestamp, duration, btn.preRoll, btn.postRoll)
        const event: CodeEvent = {
          id: generateId(),
          buttonId,
          timestamp,
          startTime: range.startTime,
          endTime: range.endTime,
        }

        const key = currentVideoKey || '_default'
        const existing = events[key] || []
        set({ events: { ...events, [key]: [...existing, event] }, activeButtonId: buttonId })
        return event
      },

      updateEvent: (videoKey, eventId, patch, duration) => {
        set((s) => {
          const existing = s.events[videoKey] || []
          return {
            events: {
              ...s.events,
              [videoKey]: existing.map((e) => {
                if (e.id !== eventId) return e
                const next = { ...e, ...patch }
                if (duration != null && (patch.startTime != null || patch.endTime != null)) {
                  const clamped = clampClipTimes(next.startTime, next.endTime, duration)
                  next.startTime = clamped.startTime
                  next.endTime = clamped.endTime
                }
                return next
              }),
            },
          }
        })
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
      version: 2,
      partialize: (s) => ({ buttons: s.buttons, events: s.events }),
      migrate: (persisted, version) => {
        const state = (persisted || {}) as { buttons?: CodeButton[]; events?: Record<string, CodeEvent[]> }
        return {
          buttons: version < 2 ? migrateDeskButtons(state.buttons) : migrateDeskButtons(state.buttons),
          events: state.events || {},
        }
      },
    }
  )
)
