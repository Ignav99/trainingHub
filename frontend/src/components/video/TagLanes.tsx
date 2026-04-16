'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTaggingStore } from '@/stores/useTaggingStore'
import type { VideoTag, VideoTagCategory } from '@/lib/api/videoTags'

interface TagLanesProps {
  duration: number  // video duration in seconds
  onSeek: (ms: number) => void
  onTagSelect: (tagId: string) => void
  timeToPercent: (t: number) => number
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

export function TagLanes({ duration, onSeek, onTagSelect, timeToPercent }: TagLanesProps) {
  const tags = useTaggingStore((s) => s.tags)
  const categories = useTaggingStore((s) => s.categories)
  const selectedTagId = useTaggingStore((s) => s.selectedTagId)

  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set())
  const [hoveredTag, setHoveredTag] = useState<VideoTag | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  // Group tags by category
  const tagsByCategory = useMemo(() => {
    const map = new Map<string, VideoTag[]>()
    for (const tag of tags) {
      if (!map.has(tag.category_id)) map.set(tag.category_id, [])
      map.get(tag.category_id)!.push(tag)
    }
    return map
  }, [tags])

  // Only show categories that have tags
  const activeCats = useMemo(() => {
    return categories.filter((c) => tagsByCategory.has(c.id))
  }, [categories, tagsByCategory])

  const toggleLane = (catId: string) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  // Duration in ms for position calculations
  const durationMs = duration * 1000

  if (activeCats.length === 0) return null

  return (
    <div className="w-full border-t border-white/10 bg-[#0d0d0d]">
      {activeCats.map((cat) => {
        const catTags = tagsByCategory.get(cat.id) || []
        const isCollapsed = collapsedLanes.has(cat.id)

        return (
          <div key={cat.id} className="border-b border-white/5 last:border-b-0">
            {/* Lane header */}
            <button
              className="flex items-center gap-1 w-full px-1.5 py-0.5 text-[9px] hover:bg-white/5 transition-colors"
              style={{ color: cat.color }}
              onClick={() => toggleLane(cat.id)}
            >
              {isCollapsed
                ? <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                : <ChevronDown className="h-2.5 w-2.5 shrink-0" />
              }
              <span className="font-medium truncate">{cat.nombre}</span>
              <span className="text-white/30 ml-auto">{catTags.length}</span>
            </button>

            {/* Lane track */}
            {!isCollapsed && (
              <div className="relative w-full" style={{ height: 20 }}>
                {catTags.map((tag) => {
                  // Convert ms to percent of timeline
                  const leftPct = durationMs > 0 ? (tag.start_ms / durationMs) * 100 : 0
                  const widthPct = durationMs > 0 ? ((tag.end_ms - tag.start_ms) / durationMs) * 100 : 0
                  const isSelected = selectedTagId === tag.id

                  return (
                    <div
                      key={tag.id}
                      className={`absolute top-1 cursor-pointer rounded-sm transition-all ${
                        isSelected ? 'ring-1 ring-white z-10 brightness-125' : 'hover:brightness-110'
                      }`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 0.3)}%`,
                        height: 12,
                        backgroundColor: cat.color + (isSelected ? 'cc' : '80'),
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onTagSelect(tag.id)
                        onSeek(tag.start_ms)
                      }}
                      onMouseEnter={(e) => {
                        setHoveredTag(tag)
                        setTooltipPos({ x: e.clientX, y: e.clientY })
                      }}
                      onMouseLeave={() => {
                        setHoveredTag(null)
                        setTooltipPos(null)
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Tooltip */}
      {hoveredTag && tooltipPos && (
        <div
          className="fixed z-50 px-2 py-1 rounded bg-gray-800 border border-white/20 shadow-lg pointer-events-none"
          style={{
            left: tooltipPos.x + 8,
            top: tooltipPos.y - 30,
          }}
        >
          <div className="text-[10px] text-white/90">
            {formatMs(hoveredTag.start_ms)} — {formatMs(hoveredTag.end_ms)}
          </div>
          {hoveredTag.nota && (
            <div className="text-[9px] text-white/50 truncate max-w-[150px]">
              {hoveredTag.nota}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
