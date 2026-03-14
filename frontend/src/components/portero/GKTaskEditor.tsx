'use client'

import { useState, useEffect } from 'react'
import { X, Save, BookmarkPlus } from 'lucide-react'
import { PorteroTarea, PorteroTareaCreate, PORTERO_TAREA_TIPOS, TipoPorteroTarea } from '@/types'
import { TareaGraphicEditor, DiagramData, emptyDiagramData } from '@/components/tarea-editor'

interface GKTaskEditorProps {
  tarea?: PorteroTarea | null
  sesionId: string
  equipoId: string
  onSave: (data: Partial<PorteroTarea> | PorteroTareaCreate) => Promise<void>
  onSaveToLibrary?: (data: {
    nombre: string
    descripcion?: string
    duracion: number
    grafico_data?: any
  }) => Promise<void>
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

export default function GKTaskEditor({ tarea, sesionId, equipoId, onSave, onSaveToLibrary, onClose, initialData }: GKTaskEditorProps) {
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

  const handleSaveToLibrary = async () => {
    if (!onSaveToLibrary || !nombre.trim()) return
    setSaving(true)
    try {
      const hasDiagram = diagram.elements.length > 0 || diagram.arrows.length > 0
      await onSaveToLibrary({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        duracion,
        grafico_data: hasDiagram ? diagram : undefined,
      })
    } catch (e) {
      console.error('Error saving to library:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧤</span>
            <h3 className="text-sm font-semibold text-gray-900">
              {tarea ? 'Editar ejercicio de portero' : 'Nuevo ejercicio de portero'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content — two columns: form left, pitch right */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left column: form fields */}
            <div className="p-5 space-y-3 border-r border-gray-100">
              {/* nombre + tipo */}
              <div className="grid grid-cols-3 gap-2">
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

              {/* duracion + intensidad */}
              <div className="grid grid-cols-2 gap-2">
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
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Organizacion del ejercicio, dinamica, variantes..."
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notas / Coaching points</label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Coaching points, errores comunes, material..."
                />
              </div>
            </div>

            {/* Right column: tactical pitch */}
            <div className="p-4 bg-gray-50">
              <label className="block text-xs font-medium text-gray-500 mb-2">Pizarra tactica (Modo Pro: click en pantalla completa)</label>
              <TareaGraphicEditor
                value={diagram}
                onChange={setDiagram}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
          <div>
            {onSaveToLibrary && (
              <button
                onClick={handleSaveToLibrary}
                disabled={saving || !nombre.trim()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-50"
                title="Guardar tambien en la biblioteca de tareas"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                Guardar en Biblioteca
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
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
    </div>
  )
}
