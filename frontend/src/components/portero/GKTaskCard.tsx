'use client'

import { Clock, Trash2, Edit2, Copy } from 'lucide-react'
import { PorteroTarea, PORTERO_TAREA_TIPOS } from '@/types'

interface GKTaskCardProps {
  tarea: PorteroTarea
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  isEditable: boolean
  dragHandle?: React.ReactNode
}

export default function GKTaskCard({ tarea, onEdit, onDelete, onDuplicate, isEditable, dragHandle }: GKTaskCardProps) {
  const tipoInfo = PORTERO_TAREA_TIPOS.find(t => t.value === tarea.tipo)
  const intensidadColor = tarea.intensidad === 'alta' ? 'text-red-600 bg-red-50' :
    tarea.intensidad === 'baja' ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'

  return (
    <div className="flex items-center gap-2 p-3 bg-white border border-gray-100 rounded-lg group hover:shadow-sm transition-shadow">
      {dragHandle}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{tarea.nombre}</span>
          {tipoInfo && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: tipoInfo.color }}
            >
              {tipoInfo.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="flex items-center gap-0.5 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            {tarea.duracion} min
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${intensidadColor}`}>
            {tarea.intensidad}
          </span>
        </div>
      </div>

      {isEditable && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 text-gray-300 hover:text-blue-500" title="Editar">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDuplicate} className="p-1 text-gray-300 hover:text-green-500" title="Duplicar">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 text-gray-300 hover:text-red-500" title="Eliminar">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
