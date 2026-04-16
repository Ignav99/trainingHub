'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Tag, Settings, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTaggingStore } from '@/stores/useTaggingStore'
import { DescriptorPopover } from './DescriptorPopover'
import type { VideoTagCategory, VideoTagDescriptor } from '@/lib/api/videoTags'

interface TagMatrixProps {
  videoId: string
  equipoId: string
  getCurrentMs: () => number
  jugadores: Array<{ id: string; nombre: string; apellidos: string; dorsal?: number }>
}

export function TagMatrix({ videoId, equipoId, getCurrentMs, jugadores }: TagMatrixProps) {
  const categories = useTaggingStore((s) => s.categories)
  const categoriesLoaded = useTaggingStore((s) => s.categoriesLoaded)
  const activeCategory = useTaggingStore((s) => s.activeCategory)
  const isTagging = useTaggingStore((s) => s.isTagging)
  const fetchCategories = useTaggingStore((s) => s.fetchCategories)
  const seedCategories = useTaggingStore((s) => s.seedCategories)
  const startQuickTag = useTaggingStore((s) => s.startQuickTag)
  const finishQuickTag = useTaggingStore((s) => s.finishQuickTag)
  const cancelQuickTag = useTaggingStore((s) => s.cancelQuickTag)
  const setActiveCategory = useTaggingStore((s) => s.setActiveCategory)

  const [popoverCategory, setPopoverCategory] = useState<VideoTagCategory | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    if (!categoriesLoaded) {
      fetchCategories(equipoId)
    }
  }, [equipoId, categoriesLoaded, fetchCategories])

  const handleCategoryClick = (cat: VideoTagCategory, e: React.MouseEvent<HTMLButtonElement>) => {
    if (isTagging && activeCategory?.id === cat.id) {
      // Already tagging this category — finish without descriptor
      handleFinish(cat)
      return
    }

    if (cat.descriptors.length === 0) {
      // No descriptors — create tag immediately
      handleQuickCreate(cat)
      return
    }

    // Show descriptor popover
    const rect = e.currentTarget.getBoundingClientRect()
    setPopoverCategory(cat)
    setPopoverAnchor(rect)
    startQuickTag(cat, getCurrentMs())
  }

  const handleQuickCreate = async (cat: VideoTagCategory) => {
    startQuickTag(cat, getCurrentMs())
    const tag = await finishQuickTag(videoId)
    if (tag) {
      toast.success(`Tag: ${cat.nombre}`)
    }
  }

  const handleFinish = async (cat: VideoTagCategory, descriptorId?: string, jugadorId?: string) => {
    const tag = await finishQuickTag(videoId, descriptorId, jugadorId)
    if (tag) {
      const desc = descriptorId
        ? cat.descriptors.find((d) => d.id === descriptorId)?.nombre
        : undefined
      toast.success(`Tag: ${cat.nombre}${desc ? ` → ${desc}` : ''}`)
    }
    setPopoverCategory(null)
    setPopoverAnchor(null)
  }

  const handlePopoverSelect = (descriptor: VideoTagDescriptor | null, jugadorId?: string) => {
    if (!popoverCategory) return
    handleFinish(popoverCategory, descriptor?.id, jugadorId)
  }

  const handlePopoverClose = () => {
    cancelQuickTag()
    setPopoverCategory(null)
    setPopoverAnchor(null)
  }

  const handleSeed = async () => {
    await seedCategories(equipoId)
    toast.success('Categorías creadas')
  }

  if (categoriesLoaded && categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
        <Tag className="h-8 w-8 text-white/30" />
        <p className="text-xs text-white/50">No hay categorías de tagging</p>
        <Button
          size="sm"
          variant="outline"
          className="text-xs border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleSeed}
        >
          <Zap className="h-3 w-3 mr-1" />
          Crear categorías por defecto
        </Button>
      </div>
    )
  }

  // Group by fase
  const grouped = new Map<string, VideoTagCategory[]>()
  for (const cat of categories) {
    const key = cat.fase || 'general'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(cat)
  }

  const faseLabels: Record<string, string> = {
    ataque_organizado: 'Ataque',
    defensa_organizada: 'Defensa',
    transicion_ataque_defensa: 'Trans. A→D',
    transicion_defensa_ataque: 'Trans. D→A',
    abp: 'ABP',
    general: 'General',
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {/* Quick tag indicator */}
      {isTagging && activeCategory && (
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs animate-pulse"
          style={{ backgroundColor: activeCategory.color + '30', borderLeft: `3px solid ${activeCategory.color}` }}
        >
          <span className="text-white/90">Tagging: {activeCategory.nombre}</span>
          <button
            className="text-white/50 hover:text-white ml-auto text-[10px]"
            onClick={handlePopoverClose}
          >
            ESC
          </button>
        </div>
      )}

      {/* Category grid — grouped by fase */}
      {Array.from(grouped.entries()).map(([fase, cats]) => (
        <div key={fase}>
          {grouped.size > 1 && (
            <div className="text-[10px] text-white/40 uppercase tracking-wider px-1 mb-1">
              {faseLabels[fase] || fase}
            </div>
          )}
          <div className="grid grid-cols-3 gap-1">
            {cats.map((cat) => (
              <button
                key={cat.id}
                ref={(el) => { buttonRefs.current[cat.id] = el }}
                className={`
                  flex flex-col items-center gap-0.5 px-1 py-1.5 rounded text-[10px] font-medium
                  transition-all border border-transparent
                  ${activeCategory?.id === cat.id && isTagging
                    ? 'ring-1 ring-white/50'
                    : 'hover:border-white/20'
                  }
                `}
                style={{
                  backgroundColor: cat.color + '20',
                  color: cat.color,
                }}
                onClick={(e) => handleCategoryClick(cat, e)}
                title={cat.shortcut_key ? `Atajo: ${cat.shortcut_key}` : undefined}
              >
                <span className="truncate w-full text-center">{cat.nombre}</span>
                {cat.shortcut_key && (
                  <kbd className="text-[8px] text-white/40 bg-white/10 px-1 rounded">
                    {cat.shortcut_key}
                  </kbd>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Descriptor popover */}
      {popoverCategory && popoverAnchor && (
        <DescriptorPopover
          category={popoverCategory}
          anchor={popoverAnchor}
          jugadores={jugadores}
          onSelect={handlePopoverSelect}
          onClose={handlePopoverClose}
        />
      )}
    </div>
  )
}
