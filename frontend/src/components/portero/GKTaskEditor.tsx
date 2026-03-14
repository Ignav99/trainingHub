'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { PorteroTarea, PorteroTareaCreate, PORTERO_TAREA_TIPOS, TipoPorteroTarea } from '@/types'
import { TareaGraphicEditor, DiagramData, emptyDiagramData } from '@/components/tarea-editor'

interface GKTaskEditorProps {
  tarea?: PorteroTarea | null
  sesionId: string
  equipoId: string
  onSave: (data: Partial<PorteroTarea> | PorteroTareaCreate) => Promise<void>
  onClose: () => void
  /** Pre-fill from AI proposal */
  initialData?: {
    nombre?: string
    descripcion?: string
    duracion?: number
    intensidad?: string
    tipo?: string
  }
}

export default function GKTaskEditor({ tarea, sesionId, equipoId, onSave, onClose, initialData }: GKTaskEditorProps) {
  const [nombre, setNombre] = useState(tarea?.nombre || initialData?.nombre || '')
  const [descripcion, setDescripcion] = useState(tarea?.descripcion || initialData?.descripcion || '')
  const [duracion, setDuracion] = useState(tarea?.duracion || initialData?.duracion || 10)
  const [intensidad, setIntensidad] = useState(tarea?.intensidad || initialData?.intensidad || 'media')
  const [tipo, setTipo] = useState<string>(tarea?.tipo || initialData?.tipo || '')
  const [notas, setNotas] = useState(tarea?.notas || '')
  const [diagram, setDiagram] = useState<DiagramData>(
    (tarea?.diagram as DiagramData) || { ...emptyDiagramData, pitchType: 'half' }
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialData) {
      if (initialData.nombre) setNombre(initialData.nombre)
      if (initialData.descripcion) setDescripcion(initialData.descripcion)
      if (initialData.duracion) setDuracion(initialData.duracion)
      if (initialData.intensidad) setIntensidad(initialData.intensidad)
      if (initialData.tipo) setTipo(initialData.tipo)
    }
  }, [initialData])

  const handleSave = async () => {
    if (!nombre.trim()) return
    setSaving(true)
    try {
      if (tarea) {
        // Update
        await onSave({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          duracion,
          intensidad,
          tipo: (tipo as TipoPorteroTarea) || undefined,
          notas: notas.trim() || undefined,
          diagram: diagram as any,
        })
      } else {
        // Create
        await onSave({
          sesion_id: sesionId,
          equipo_id: equipoId,
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          duracion,
          intensidad,
          tipo: (tipo as TipoPorteroTarea) || undefined,
          notas: notas.trim() || undefined,
          diagram: diagram as any,
          orden: 0,
        })
      }
      onClose()
    } catch (e) {
      console.error('Error saving GK task:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            {tarea ? 'Editar ejercicio de portero' : 'Nuevo ejercicio de portero'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Row 1: nombre + tipo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ej: Blocaje cruzado con desplazamiento"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Sin tipo</option>
                {PORTERO_TAREA_TIPOS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: duracion + intensidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Duracion (min)</label>
              <input
                type="number"
                value={duracion}
                onChange={e => setDuracion(parseInt(e.target.value) || 0)}
                min={1}
                max={60}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Intensidad</label>
              <select
                value={intensidad}
                onChange={e => setIntensidad(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          {/* Descripcion */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descripcion</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              placeholder="Organizacion del ejercicio, dinamica, variantes..."
            />
          </div>

          {/* Pizarra tactica */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pizarra tactica</label>
            <TareaGraphicEditor
              value={diagram}
              onChange={setDiagram}
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notas adicionales</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              placeholder="Coaching points, errores comunes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !nombre.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
