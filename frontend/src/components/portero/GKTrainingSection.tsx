'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Sparkles,
  GripVertical,
  Clock,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { apiKey, apiFetcher } from '@/lib/swr'
import { porteroTareasApi } from '@/lib/api/sesiones'
import { PorteroTarea, PorteroTareaCreate } from '@/types'
import GKTaskCard from './GKTaskCard'
import GKTaskEditor from './GKTaskEditor'
import GKAIDesignChat from './GKAIDesignChat'

interface GKTrainingSectionProps {
  sesionId: string
  equipoId: string
  matchDay?: string
  intensidadObjetivo?: string
  isEditable: boolean
}

function SortableTaskItem({
  tarea,
  isEditable,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  tarea: PorteroTarea
  isEditable: boolean
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tarea.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <GKTaskCard
        tarea={tarea}
        isEditable={isEditable}
        onEdit={onEdit}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        dragHandle={
          isEditable ? (
            <button {...listeners} className="cursor-grab text-gray-300 hover:text-gray-400 touch-none">
              <GripVertical className="h-4 w-4" />
            </button>
          ) : undefined
        }
      />
    </div>
  )
}

export default function GKTrainingSection({
  sesionId,
  equipoId,
  matchDay,
  intensidadObjetivo,
  isEditable,
}: GKTrainingSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [editingTarea, setEditingTarea] = useState<PorteroTarea | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [aiInitialData, setAiInitialData] = useState<any>(null)

  const swrKey = apiKey(`/sesiones/${sesionId}/portero-tareas`)
  const { data, mutate } = useSWR<{ data: PorteroTarea[] }>(swrKey, apiFetcher)
  const tareas = data?.data || []

  const totalDuracion = tareas.reduce((sum, t) => sum + (t.duracion || 0), 0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleCreate = useCallback(async (taskData: PorteroTareaCreate | Partial<PorteroTarea>) => {
    await porteroTareasApi.create(sesionId, {
      sesion_id: sesionId,
      equipo_id: equipoId,
      nombre: (taskData as any).nombre || 'Nuevo ejercicio',
      descripcion: (taskData as any).descripcion,
      duracion: (taskData as any).duracion || 10,
      intensidad: (taskData as any).intensidad || 'media',
      tipo: (taskData as any).tipo,
      diagram: (taskData as any).diagram,
      notas: (taskData as any).notas,
      orden: tareas.length,
    })
    mutate()
  }, [sesionId, equipoId, tareas.length, mutate])

  const handleUpdate = useCallback(async (data: Partial<PorteroTarea>) => {
    if (!editingTarea) return
    await porteroTareasApi.update(sesionId, editingTarea.id, data)
    mutate()
  }, [sesionId, editingTarea, mutate])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Eliminar este ejercicio de portero?')) return
    await porteroTareasApi.delete(sesionId, id)
    mutate()
  }, [sesionId, mutate])

  const handleDuplicate = useCallback(async (tarea: PorteroTarea) => {
    await porteroTareasApi.create(sesionId, {
      sesion_id: sesionId,
      equipo_id: equipoId,
      nombre: `${tarea.nombre} (copia)`,
      descripcion: tarea.descripcion,
      duracion: tarea.duracion,
      intensidad: tarea.intensidad,
      tipo: tarea.tipo,
      diagram: tarea.diagram as any,
      notas: tarea.notas,
      orden: tareas.length,
    })
    mutate()
  }, [sesionId, equipoId, tareas.length, mutate])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tareas.findIndex(t => t.id === active.id)
    const newIndex = tareas.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...tareas]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    const updates = reordered.map((t, i) => ({ id: t.id, orden: i }))
    await porteroTareasApi.reorder(sesionId, updates)
    mutate()
  }, [tareas, sesionId, mutate])

  const handleAIApply = useCallback((aiData: {
    nombre: string
    descripcion: string
    duracion: number
    intensidad: string
    tipo: string
  }) => {
    setShowAI(false)
    setAiInitialData(aiData)
    setEditingTarea(null)
    setShowEditor(true)
  }, [])

  return (
    <div className="space-y-3">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-green-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-green-600" />
          )}
          <span className="text-lg">🧤</span>
          <h3 className="text-sm font-semibold text-gray-700">Entrenamiento de Porteros</h3>
          {tareas.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded-full">
              <Clock className="h-2.5 w-2.5" />
              {totalDuracion} min
            </span>
          )}
          <span className="text-xs text-gray-400">({tareas.length})</span>
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="space-y-2 pl-6">
          {tareas.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-green-200 rounded-lg bg-green-50/30">
              <p className="text-sm text-gray-400 mb-3">Sin ejercicios de portero</p>
              {isEditable && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => { setEditingTarea(null); setAiInitialData(null); setShowEditor(true) }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
                  >
                    <Plus className="h-3 w-3" /> Anadir ejercicio
                  </button>
                  <button
                    onClick={() => setShowAI(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
                  >
                    <Sparkles className="h-3 w-3" /> Disenar con IA
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={tareas.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1.5">
                    {tareas.map(tarea => (
                      <SortableTaskItem
                        key={tarea.id}
                        tarea={tarea}
                        isEditable={isEditable}
                        onEdit={() => {
                          setEditingTarea(tarea)
                          setAiInitialData(null)
                          setShowEditor(true)
                        }}
                        onDelete={() => handleDelete(tarea.id)}
                        onDuplicate={() => handleDuplicate(tarea)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {isEditable && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => { setEditingTarea(null); setAiInitialData(null); setShowEditor(true) }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100"
                  >
                    <Plus className="h-3 w-3" /> Anadir
                  </button>
                  <button
                    onClick={() => setShowAI(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100"
                  >
                    <Sparkles className="h-3 w-3" /> IA
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <GKTaskEditor
          tarea={editingTarea}
          sesionId={sesionId}
          equipoId={equipoId}
          initialData={aiInitialData}
          onSave={editingTarea ? handleUpdate : handleCreate}
          onClose={() => { setShowEditor(false); setEditingTarea(null); setAiInitialData(null) }}
        />
      )}

      {/* AI Design Modal */}
      {showAI && (
        <GKAIDesignChat
          sesionId={sesionId}
          matchDay={matchDay}
          intensidadObjetivo={intensidadObjetivo}
          onApply={handleAIApply}
          onClose={() => setShowAI(false)}
        />
      )}
    </div>
  )
}
