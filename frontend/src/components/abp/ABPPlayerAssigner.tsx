'use client'

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

  const updateAsignacion = (elementId: string, field: 'jugador_id' | 'rol', value: string) => {
    const existing = asignaciones.find(a => a.element_id === elementId)
    if (existing) {
      onChange(asignaciones.map(a =>
        a.element_id === elementId ? { ...a, [field]: value || undefined } : a
      ))
    } else {
      onChange([...asignaciones, { element_id: elementId, [field]: value || undefined }])
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
          return (
            <div key={el.id} className="flex items-center gap-1.5 p-2 bg-white rounded-lg border border-gray-100">
              {/* Element badge */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: el.color }}
              >
                {el.label}
              </div>

              <div className="flex-1 space-y-1">
                {/* Player select */}
                <select
                  value={asig?.jugador_id || ''}
                  onChange={e => updateAsignacion(el.id, 'jugador_id', e.target.value)}
                  className="w-full px-1.5 py-1 text-[11px] border border-gray-200 rounded bg-white"
                >
                  <option value="">Sin asignar</option>
                  {jugadores.map(j => (
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
