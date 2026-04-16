'use client'

import { useEffect, useRef } from 'react'
import type { VideoTagCategory, VideoTagDescriptor } from '@/lib/api/videoTags'
import { PlayerQuickAssign } from './PlayerQuickAssign'
import { useState } from 'react'

interface DescriptorPopoverProps {
  category: VideoTagCategory
  anchor: DOMRect
  jugadores: Array<{ id: string; nombre: string; apellidos: string; dorsal?: number }>
  onSelect: (descriptor: VideoTagDescriptor | null, jugadorId?: string) => void
  onClose: () => void
}

export function DescriptorPopover({
  category,
  anchor,
  jugadores,
  onSelect,
  onClose,
}: DescriptorPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [showPlayerAssign, setShowPlayerAssign] = useState(false)
  const [selectedDescriptor, setSelectedDescriptor] = useState<VideoTagDescriptor | null>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onClose])

  const handleDescriptorClick = (desc: VideoTagDescriptor) => {
    if (jugadores.length > 0) {
      setSelectedDescriptor(desc)
      setShowPlayerAssign(true)
    } else {
      onSelect(desc)
    }
  }

  const handleSkipDescriptor = () => {
    if (jugadores.length > 0) {
      setSelectedDescriptor(null)
      setShowPlayerAssign(true)
    } else {
      onSelect(null)
    }
  }

  const handlePlayerSelect = (jugadorId?: string) => {
    onSelect(selectedDescriptor, jugadorId)
  }

  // Position popover near the anchor button
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(anchor.left, window.innerWidth - 200),
    top: anchor.bottom + 4,
    zIndex: 100,
  }

  if (showPlayerAssign) {
    return (
      <div ref={ref} style={style} className="w-48 bg-gray-900 border border-white/20 rounded-lg shadow-xl overflow-hidden">
        <div className="px-2 py-1.5 border-b border-white/10 flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
          <span className="text-[10px] text-white/70 truncate">
            {category.nombre}{selectedDescriptor ? ` → ${selectedDescriptor.nombre}` : ''}
          </span>
        </div>
        <PlayerQuickAssign
          jugadores={jugadores}
          onSelect={handlePlayerSelect}
          onSkip={() => handlePlayerSelect(undefined)}
        />
      </div>
    )
  }

  return (
    <div ref={ref} style={style} className="w-48 bg-gray-900 border border-white/20 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-white/10 flex items-center gap-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
        <span className="text-[10px] text-white/70 font-medium">{category.nombre}</span>
      </div>

      {/* Descriptors */}
      <div className="p-1 flex flex-col gap-0.5">
        {category.descriptors.map((desc, i) => (
          <button
            key={desc.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-white/80 hover:bg-white/10 transition-colors text-left"
            onClick={() => handleDescriptorClick(desc)}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: desc.color || category.color }}
            />
            <span className="truncate">{desc.nombre}</span>
            {desc.shortcut_key && (
              <kbd className="text-[8px] text-white/30 bg-white/5 px-1 rounded ml-auto">
                {desc.shortcut_key}
              </kbd>
            )}
          </button>
        ))}

        {/* Skip descriptor */}
        <button
          className="px-2 py-1 rounded text-[10px] text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors text-left"
          onClick={handleSkipDescriptor}
        >
          Sin descriptor →
        </button>
      </div>
    </div>
  )
}
