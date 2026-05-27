'use client'
import { List, Video, Plus } from 'lucide-react'

interface MainToolbarProps {
  onOpenBotonera: () => void
  onOpenOrganizer: () => void
  clipCount: number
}

export function MainToolbar({ onOpenBotonera, onOpenOrganizer, clipCount }: MainToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-t border-white/10 shrink-0">
      {/* Left: clip count */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Video className="w-3.5 h-3.5" />
        <span>{clipCount} clips</span>
      </div>

      {/* Center: main actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenBotonera}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Botonera
        </button>
        <button
          onClick={onOpenOrganizer}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium transition-colors"
        >
          <List className="w-3.5 h-3.5" />
          Organizer
        </button>
      </div>

      {/* Right: keyboard hints */}
      <div className="text-[10px] text-zinc-600">
        B · Botonera &nbsp; O · Organizer
      </div>
    </div>
  )
}
