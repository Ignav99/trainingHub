'use client'

import { useMemo } from 'react'
import { Trash2, Clock, User, Filter } from 'lucide-react'
import { useTaggingStore } from '@/stores/useTaggingStore'
import type { VideoTag, VideoTagCategory } from '@/lib/api/videoTags'

interface TagListProps {
  onSeek: (ms: number) => void
  jugadores: Array<{ id: string; nombre: string; apellidos: string; dorsal?: number }>
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function TagList({ onSeek, jugadores }: TagListProps) {
  const tags = useTaggingStore((s) => s.tags)
  const categories = useTaggingStore((s) => s.categories)
  const selectedTagId = useTaggingStore((s) => s.selectedTagId)
  const setSelectedTagId = useTaggingStore((s) => s.setSelectedTagId)
  const deleteTag = useTaggingStore((s) => s.deleteTag)
  const filters = useTaggingStore((s) => s.filters)
  const setFilters = useTaggingStore((s) => s.setFilters)

  const catMap = useMemo(() => {
    const map = new Map<string, VideoTagCategory>()
    for (const cat of categories) map.set(cat.id, cat)
    return map
  }, [categories])

  const playerMap = useMemo(() => {
    const map = new Map<string, { nombre: string; apellidos: string; dorsal?: number }>()
    for (const j of jugadores) map.set(j.id, j)
    return map
  }, [jugadores])

  // Apply filters
  const filteredTags = useMemo(() => {
    let result = [...tags]
    if (filters.categoryId) result = result.filter((t) => t.category_id === filters.categoryId)
    if (filters.jugadorId) result = result.filter((t) => t.jugador_id === filters.jugadorId)
    if (filters.fase) result = result.filter((t) => t.fase === filters.fase)
    if (filters.source) result = result.filter((t) => t.source === filters.source)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((t) => {
        const cat = catMap.get(t.category_id)
        return (
          cat?.nombre.toLowerCase().includes(q) ||
          t.nota?.toLowerCase().includes(q)
        )
      })
    }
    return result.sort((a, b) => a.start_ms - b.start_ms)
  }, [tags, filters, catMap])

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, VideoTag[]>()
    for (const tag of filteredTags) {
      if (!map.has(tag.category_id)) map.set(tag.category_id, [])
      map.get(tag.category_id)!.push(tag)
    }
    return map
  }, [filteredTags])

  const handleTagClick = (tag: VideoTag) => {
    setSelectedTagId(tag.id)
    onSeek(tag.start_ms)
  }

  const handleDelete = async (e: React.MouseEvent, tagId: string) => {
    e.stopPropagation()
    await deleteTag(tagId)
  }

  const hasFilters = filters.categoryId || filters.jugadorId || filters.fase || filters.source || filters.search

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/10">
        <Filter className="h-3 w-3 text-white/30" />
        <input
          value={filters.search || ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
          placeholder="Buscar tags..."
          className="flex-1 bg-transparent text-[11px] text-white/80 placeholder:text-white/30 outline-none"
        />
        {hasFilters && (
          <button
            className="text-[9px] text-white/40 hover:text-white/60 px-1"
            onClick={() => setFilters({})}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b border-white/10">
          {categories.map((cat) => {
            const isActive = filters.categoryId === cat.id
            return (
              <button
                key={cat.id}
                className="px-1.5 py-0.5 rounded-full text-[9px] transition-all"
                style={{
                  backgroundColor: isActive ? cat.color + '40' : 'transparent',
                  color: isActive ? cat.color : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${isActive ? cat.color + '60' : 'rgba(255,255,255,0.1)'}`,
                }}
                onClick={() =>
                  setFilters({ ...filters, categoryId: isActive ? undefined : cat.id })
                }
              >
                {cat.nombre}
              </button>
            )
          })}
        </div>
      )}

      {/* Tag list */}
      <div className="flex-1 overflow-y-auto">
        {filteredTags.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-white/30">
            <Clock className="h-6 w-6" />
            <p className="text-[11px]">No hay tags</p>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([catId, catTags]) => {
            const cat = catMap.get(catId)
            if (!cat) return null
            return (
              <div key={catId}>
                {/* Category header */}
                <div
                  className="sticky top-0 flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium bg-black/80 backdrop-blur-sm"
                  style={{ color: cat.color }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.nombre}
                  <span className="text-white/30 ml-auto">{catTags.length}</span>
                </div>

                {/* Tags */}
                {catTags.map((tag) => {
                  const player = tag.jugador_id ? playerMap.get(tag.jugador_id) : null
                  const isSelected = selectedTagId === tag.id

                  return (
                    <button
                      key={tag.id}
                      className={`
                        w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors
                        ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}
                      `}
                      onClick={() => handleTagClick(tag)}
                    >
                      {/* Time */}
                      <span className="text-[10px] font-mono text-white/50 w-12 shrink-0">
                        {formatMs(tag.start_ms)}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {tag.nota && (
                            <span className="text-[10px] text-white/60 truncate">
                              {tag.nota}
                            </span>
                          )}
                        </div>
                        {player && (
                          <div className="flex items-center gap-1 text-[9px] text-white/40">
                            <User className="h-2.5 w-2.5" />
                            {player.dorsal && <span>#{player.dorsal}</span>}
                            <span className="truncate">{player.nombre}</span>
                          </div>
                        )}
                      </div>

                      {/* Duration badge */}
                      <span className="text-[9px] text-white/30 shrink-0">
                        {((tag.end_ms - tag.start_ms) / 1000).toFixed(0)}s
                      </span>

                      {/* Delete */}
                      <button
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-white/20 transition-all"
                        onClick={(e) => handleDelete(e, tag.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </button>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      {/* Footer count */}
      <div className="px-2 py-1 border-t border-white/10 text-[10px] text-white/30">
        {filteredTags.length} tag{filteredTags.length !== 1 ? 's' : ''}
        {hasFilters ? ' (filtrado)' : ''}
      </div>
    </div>
  )
}
