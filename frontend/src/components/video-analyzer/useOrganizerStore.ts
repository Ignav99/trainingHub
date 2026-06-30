'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from './utils'

export interface OrganizerClip {
  id: string
  sourceId: string
  sourceType: 'clip' | 'codeEvent'
  title: string
  startTime: number
  endTime: number
  color: string
  rowId: string
  addedAt: number
}

export interface OrganizerRow {
  id: string
  name: string
  color: string
}

interface OrganizerState {
  clips: OrganizerClip[]
  rows: OrganizerRow[]

  addClip: (clip: Omit<OrganizerClip, 'id' | 'addedAt'>) => void
  removeClip: (id: string) => void
  addRow: (name: string, color: string) => void
  updateRow: (id: string, patch: Partial<Omit<OrganizerRow, 'id'>>) => void
  removeRow: (id: string) => void
  moveClipToRow: (clipId: string, rowId: string) => void
}

export const useOrganizerStore = create<OrganizerState>()(
  persist(
    (set) => ({
      clips: [],
      rows: [],

      addClip: (clip) =>
        set((s) => ({
          clips: [
            ...s.clips,
            { ...clip, id: generateId(), addedAt: Date.now() },
          ],
        })),

      removeClip: (id) =>
        set((s) => ({ clips: s.clips.filter((c) => c.id !== id) })),

      addRow: (name, color) =>
        set((s) => ({
          rows: [...s.rows, { id: generateId(), name, color }],
        })),

      updateRow: (id, patch) =>
        set((s) => ({
          rows: s.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      removeRow: (id) =>
        set((s) => ({
          rows: s.rows.filter((r) => r.id !== id),
          clips: s.clips.filter((c) => c.rowId !== id),
        })),

      moveClipToRow: (clipId, rowId) =>
        set((s) => ({
          clips: s.clips.map((c) =>
            c.id === clipId ? { ...c, rowId } : c
          ),
        })),
    }),
    {
      name: 'kabin-organizer',
    }
  )
)
