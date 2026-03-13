'use client'

import { X } from 'lucide-react'
import { ABPAsignacion, ABP_ROLES, Jugador } from '@/types'
import { DiagramElement } from '@/components/tarea-editor/types'

interface ABPPlayerAssignerProps {
  elements: DiagramElement[]
  jugadores: Jugador[]
  asignaciones: ABPAsignacion[]
  onChange: (asignaciones: ABPAsignacion[]) => void
}

export default function ABPPlayerAssigner({ elements, jugadores, asignaciones, onChange }: ABPPlayerAssignerProps) {
  const getAsignacion = (elementId: string) => asignaciones.find(a => a.element_id === elementId)

  const updateAsignacion = (elementId: string, field: 'jugador_ids' | 'rol', value: string[] | string) => {
    const existing = asignaciones.find(a => a.element_id === elementId)
    if (existing) {
      onChange(asignaciones.map(a => {
        if (a.element_id !== elementId) return a
        if (field === 'jugador_ids') return { ...a, jugador_ids: value as string[], jugador_id: undefined }
        return { ...a, rol: (value as string) || undefined }
      }))
    } else {
      const newAsig: ABPAsignacion = { element_id: elementId }
      if (field === 'jugador_ids') newAsig.jugador_ids = value as string[]
      else newAsig.rol = (value as string) || undefined
      onChange([...asignaciones, newAsig])
    }
  }

  if (elements.length === 0) {
    return (
      <div className="text-xs text-gray-400 italic">
        Coloca jugadores en el campo para asignarlos
      </div>
    )
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-2">Asignar jugadores</label>
      <div className="space-y-2">
        {elements.map(el => {
          const asig = getAsignacion(el.id)
          const selectedIds = asig?.jugador_ids || (asig?.jugador_id ? [asig.jugador_id] : [])
          return (
            <div key={el.id} className="flex items-start gap-1.5 p-2 bg-white rounded-lg border border-gray-100">
              {/* Element badge */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                style={{ backgroundColor: el.color }}
              >
                {el.label}
              </div>

              <div className="flex-1 space-y-1">
                {/* Player tags */}
                <div className="flex flex-wrap gap-0.5 mb-0.5">
                  {selectedIds.map(jid => {
                    const j = jugadores.find(jg => jg.id === jid)
                    if (!j) return null
                    return (
                      <span key={jid} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-800">
                        {j.dorsal ? `${j.dorsal}.` : ''} {j.nombre}
                        <button
                          onClick={() => updateAsignacion(el.id, 'jugador_ids', selectedIds.filter(id => id !== jid))}
                          className="text-blue-400 hover:text-red-500 ml-0.5"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    )
                  })}
                </div>
                {/* Add player */}
                <select
                  value=""
                  onChange={e => {
                    if (e.target.value && !selectedIds.includes(e.target.value)) {
                      updateAsignacion(el.id, 'jugador_ids', [...selectedIds, e.target.value])
                    }
                    e.target.value = ''
                  }}
                  className="w-full px-1.5 py-1 text-[11px] border border-gray-200 rounded bg-white"
                >
                  <option value="">{selectedIds.length ? '+ Añadir jugador' : 'Seleccionar jugador'}</option>
                  {jugadores
                    .filter(j => !selectedIds.includes(j.id))
                    .map(j => (
                      <option key={j.id} value={j.id}>
                        {j.dorsal ? `${j.dorsal}. ` : ''}{j.nombre} {j.apellidos || ''}
                      </option>
                    ))}
                </select>

                {/* Role select */}
                <select
                  value={asig?.rol || ''}
                  onChange={e => updateAsignacion(el.id, 'rol', e.target.value)}
                  className="w-full px-1.5 py-1 text-[11px] border border-gray-200 rounded bg-white"
                >
                  <option value="">Sin rol</option>
                  {ABP_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
