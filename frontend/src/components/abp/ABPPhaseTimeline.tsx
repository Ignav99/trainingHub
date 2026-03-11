'use client'

import { Plus, Trash2, GripVertical } from 'lucide-react'
import { ABPFase } from '@/types'

interface ABPPhaseTimelineProps {
  fases: ABPFase[]
  activeFaseId: string | null
  onSelectFase: (id: string) => void
  onAddFase: () => void
  onDeleteFase: (id: string) => void
  onRenameFase: (id: string, nombre: string) => void
  readOnly?: boolean
}

export default function ABPPhaseTimeline({
  fases,
  activeFaseId,
  onSelectFase,
  onAddFase,
  onDeleteFase,
  onRenameFase,
  readOnly = false,
}: ABPPhaseTimelineProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-1">
      {fases.map((fase, idx) => (
        <div
          key={fase.id}
          className={`group flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors min-w-fit ${
            activeFaseId === fase.id
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => onSelectFase(fase.id)}
        >
          <span className="text-xs opacity-70">{idx + 1}.</span>
          <input
            className={`bg-transparent border-none outline-none w-24 text-sm font-medium ${
              activeFaseId === fase.id ? 'text-white placeholder-white/50' : 'text-gray-600 placeholder-gray-400'
            }`}
            value={fase.nombre}
            onChange={(e) => onRenameFase(fase.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            readOnly={readOnly}
          />
          {!readOnly && fases.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteFase(fase.id)
              }}
              className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ${
                activeFaseId === fase.id ? 'hover:bg-orange-600' : 'hover:bg-gray-300'
              }`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button
          onClick={onAddFase}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Fase
        </button>
      )}
    </div>
  )
}
