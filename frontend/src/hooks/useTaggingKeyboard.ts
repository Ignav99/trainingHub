'use client'

import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { useTaggingStore } from '@/stores/useTaggingStore'
import type { VideoTagCategory } from '@/lib/api/videoTags'

interface UseTaggingKeyboardOptions {
  videoId: string | undefined
  getCurrentMs: () => number
  onSeek: (ms: number) => void
  onPlay: () => void
  onPause: () => void
  isPlaying: boolean
  duration: number
  onToggleDrawMode: () => void
  onToggleShortcutOverlay: () => void
  enabled: boolean
}

export function useTaggingKeyboard({
  videoId,
  getCurrentMs,
  onSeek,
  onPlay,
  onPause,
  isPlaying,
  duration,
  onToggleDrawMode,
  onToggleShortcutOverlay,
  enabled,
}: UseTaggingKeyboardOptions) {
  const categories = useTaggingStore((s) => s.categories)
  const tags = useTaggingStore((s) => s.tags)
  const selectedTagId = useTaggingStore((s) => s.selectedTagId)
  const isTagging = useTaggingStore((s) => s.isTagging)
  const activeCategory = useTaggingStore((s) => s.activeCategory)
  const mode = useTaggingStore((s) => s.mode)

  const startQuickTag = useTaggingStore((s) => s.startQuickTag)
  const finishQuickTag = useTaggingStore((s) => s.finishQuickTag)
  const cancelQuickTag = useTaggingStore((s) => s.cancelQuickTag)
  const deleteTag = useTaggingStore((s) => s.deleteTag)
  const setSelectedTagId = useTaggingStore((s) => s.setSelectedTagId)

  // In-point / Out-point refs
  const inPointRef = useRef<number | null>(null)

  // Find category by shortcut key
  const getCategoryByKey = useCallback(
    (key: string): VideoTagCategory | undefined => {
      return categories.find((c) => c.shortcut_key === key)
    },
    [categories]
  )

  // Navigate to prev/next tag
  const navigateTag = useCallback(
    (direction: 'prev' | 'next') => {
      if (tags.length === 0) return
      const currentMs = getCurrentMs()
      const sorted = [...tags].sort((a, b) => a.start_ms - b.start_ms)

      if (direction === 'next') {
        const next = sorted.find((t) => t.start_ms > currentMs + 100)
        if (next) {
          setSelectedTagId(next.id)
          onSeek(next.start_ms)
        }
      } else {
        const prev = [...sorted].reverse().find((t) => t.start_ms < currentMs - 100)
        if (prev) {
          setSelectedTagId(prev.id)
          onSeek(prev.start_ms)
        }
      }
    },
    [tags, getCurrentMs, onSeek, setSelectedTagId]
  )

  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      // Don't interfere with cmd/ctrl shortcuts
      if (e.metaKey || e.ctrlKey) return

      // ======= Number keys: Quick tag (1-9) =======
      if (!e.shiftKey && e.key >= '1' && e.key <= '9' && mode === 'tag') {
        e.preventDefault()
        const cat = getCategoryByKey(e.key)
        if (!cat || !videoId) return

        if (isTagging && activeCategory?.id === cat.id) {
          // Already tagging this — finish without descriptor
          finishQuickTag(videoId).then((tag) => {
            if (tag) toast.success(`Tag: ${cat.nombre}`)
          })
        } else if (cat.descriptors.length === 0) {
          // No descriptors — create immediately
          startQuickTag(cat, getCurrentMs())
          finishQuickTag(videoId).then((tag) => {
            if (tag) toast.success(`Tag: ${cat.nombre}`)
          })
        } else {
          // Start tagging, wait for Shift+N for descriptor
          startQuickTag(cat, getCurrentMs())
          toast(`${cat.nombre} — Shift+1-${cat.descriptors.length} para descriptor`, {
            duration: 3000,
          })
        }
        return
      }

      // ======= Shift+Number: Assign descriptor =======
      if (e.shiftKey && e.key >= '!' && e.key <= '(' && isTagging && activeCategory && videoId) {
        e.preventDefault()
        // Shift+1 = '!', Shift+2 = '@', etc. — map to index
        const shiftMap: Record<string, number> = {
          '!': 0, '@': 1, '#': 2, '$': 3, '%': 4, '^': 5, '&': 6, '*': 7, '(': 8,
        }
        const idx = shiftMap[e.key]
        if (idx !== undefined && idx < activeCategory.descriptors.length) {
          const desc = activeCategory.descriptors[idx]
          finishQuickTag(videoId, desc.id).then((tag) => {
            if (tag) toast.success(`Tag: ${activeCategory.nombre} → ${desc.nombre}`)
          })
        }
        return
      }

      switch (e.key) {
        // ======= I = In-point =======
        case 'i':
        case 'I': {
          e.preventDefault()
          inPointRef.current = getCurrentMs()
          toast('In-point marcado', { duration: 2000 })
          break
        }

        // ======= O = Out-point + create tag =======
        case 'o':
        case 'O': {
          e.preventDefault()
          if (inPointRef.current === null) {
            toast.error('Primero marca el In-point (I)')
            break
          }
          if (!activeCategory || !videoId) {
            toast.error('Selecciona una categoría primero (1-9)')
            inPointRef.current = null
            break
          }
          const startMs = inPointRef.current
          const endMs = getCurrentMs()
          if (endMs <= startMs) {
            toast.error('Out-point debe ser posterior al In-point')
            break
          }
          // Create tag with custom range
          const { createTag } = useTaggingStore.getState()
          createTag(videoId, {
            video_id: videoId,
            category_id: activeCategory.id,
            start_ms: startMs,
            end_ms: endMs,
          }).then((tag) => {
            if (tag) toast.success(`Tag: ${activeCategory.nombre} (${((endMs - startMs) / 1000).toFixed(1)}s)`)
          })
          inPointRef.current = null
          cancelQuickTag()
          break
        }

        // ======= [ / ] = Navigate prev/next tag =======
        case '[': {
          e.preventDefault()
          navigateTag('prev')
          break
        }
        case ']': {
          e.preventDefault()
          navigateTag('next')
          break
        }

        // ======= Delete selected tag =======
        case 'Delete':
        case 'Backspace': {
          if (selectedTagId && mode === 'tag') {
            e.preventDefault()
            deleteTag(selectedTagId)
            toast.success('Tag eliminado')
          }
          break
        }

        // ======= Escape = Cancel tagging =======
        case 'Escape': {
          if (isTagging) {
            e.preventDefault()
            e.stopPropagation()
            cancelQuickTag()
            toast('Tagging cancelado', { duration: 1500 })
          }
          break
        }

        // ======= D = Toggle draw mode =======
        case 'd':
        case 'D': {
          e.preventDefault()
          onToggleDrawMode()
          break
        }

        // ======= ? = Show shortcuts =======
        case '?': {
          e.preventDefault()
          onToggleShortcutOverlay()
          break
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    enabled, mode, videoId, categories, isTagging, activeCategory, selectedTagId,
    getCategoryByKey, getCurrentMs, startQuickTag, finishQuickTag, cancelQuickTag,
    deleteTag, setSelectedTagId, navigateTag, onToggleDrawMode, onToggleShortcutOverlay,
  ])
}
