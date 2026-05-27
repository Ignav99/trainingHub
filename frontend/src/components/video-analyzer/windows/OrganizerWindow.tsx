'use client'
import { useState } from 'react'
import { useCodeWindowStore } from '../useCodeWindowStore'
import { Edit2 } from 'lucide-react'

interface OrganizerWindowProps {
  onOpenInStudio: (eventId: string) => void
  onSeekTo: (time: number) => void
}

function formatTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function OrganizerWindow({ onOpenInStudio, onSeekTo }: OrganizerWindowProps) {
  const { buttons, getEventsForVideo } = useCodeWindowStore()
  const events = getEventsForVideo()
  const [rowNames, setRowNames] = useState<Record<string, string>>({})
  const [editingRowId, setEditingRowId] = useState<string | null>(null)

  const rows = buttons.map(btn => ({
    btn,
    events: events
      .filter(e => e.buttonId === btn.id)
      .sort((a, b) => a.startTime - b.startTime),
  })).filter(row => row.events.length > 0)

  const getRowName = (btnId: string, fallback: string) => rowNames[btnId] ?? fallback

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm p-6 text-center">
        No hay clips. Usá la Botonera durante la reproducción.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {rows.map(({ btn, events: rowEvents }) => (
        <div key={btn.id} className="border-b border-white/5 last:border-b-0">
          {/* Row header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/60 sticky top-0">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: btn.color }} />
            {editingRowId === btn.id ? (
              <input
                autoFocus
                className="flex-1 bg-transparent text-xs text-white border-b border-zinc-500 outline-none"
                defaultValue={getRowName(btn.id, btn.label)}
                onBlur={(e) => {
                  setRowNames(p => ({ ...p, [btn.id]: e.target.value }))
                  setEditingRowId(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
              />
            ) : (
              <button
                className="flex-1 text-left text-xs font-semibold text-zinc-300 hover:text-white"
                onDoubleClick={() => setEditingRowId(btn.id)}
              >
                {getRowName(btn.id, btn.label)}
              </button>
            )}
            <span className="text-[10px] text-zinc-500">{rowEvents.length}</span>
          </div>

          {/* Events */}
          <div className="flex flex-wrap gap-2 p-2">
            {rowEvents.map(ev => (
              <div
                key={ev.id}
                className="flex items-center gap-2 rounded-lg px-3 py-2 bg-zinc-800 hover:bg-zinc-700 cursor-pointer transition-colors text-xs group"
                onClick={() => onSeekTo(ev.startTime)}
              >
                <span className="text-zinc-400 font-mono">
                  {formatTime(ev.startTime)}–{formatTime(ev.endTime)}
                </span>
                <button
                  className="text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Abrir en Studio"
                  onClick={(e) => { e.stopPropagation(); onOpenInStudio(ev.id) }}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
