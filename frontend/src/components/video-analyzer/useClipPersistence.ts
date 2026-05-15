'use client'

import { useEffect, useRef } from 'react'
import type { Clip } from './types'

const STORAGE_PREFIX = 'kabin-video-clips-'

/**
 * Persists clip metadata to localStorage keyed by partidoId.
 * Restores on mount, saves (debounced 500ms) on every clip change.
 *
 * Note: freeze frame imageData is intentionally NOT persisted — each base64
 * JPEG is ~100KB and localStorage has a 5MB limit. Clip start/end/title/color
 * is the valuable part; freeze frames can be recaptured when the user
 * re-opens the same video file.
 */
export function useClipPersistence(
  partidoId: string,
  clips: Clip[],
  setClipsFromStorage: (clips: Clip[]) => void
) {
  const storageKey = `${STORAGE_PREFIX}${partidoId}`
  const isRestoredRef = useRef(false)

  // Restore clips from localStorage on mount
  useEffect(() => {
    if (isRestoredRef.current) return
    isRestoredRef.current = true
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Clip[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClipsFromStorage(parsed)
        }
      }
    } catch {
      // Ignore corrupt or unavailable storage
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Persist on every clip change (debounced 500ms)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isRestoredRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      try {
        if (clips.length > 0) {
          const toSave = clips.map(({ id, title, startTime, endTime, color }) => ({
            id,
            title,
            startTime,
            endTime,
            color,
            freezeFrames: [],
          }))
          localStorage.setItem(storageKey, JSON.stringify(toSave))
        } else {
          localStorage.removeItem(storageKey)
        }
      } catch {
        // Ignore storage quota errors silently
      }
    }, 500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [clips, storageKey])
}
