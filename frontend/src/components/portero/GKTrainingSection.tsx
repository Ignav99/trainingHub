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
  BookOpen,
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
import { tareasApi } from '@/lib/api/tareas'
import { PorteroTarea, PorteroTareaCreate, Tarea } from '@/types'
import GKTaskCard from './GKTaskCard'
import GKTaskEditor from './GKTaskEditor'
import GKAIDesignChat from './GKAIDesignChat'
import { TaskPickerDialog } from '@/components/tareas/TaskPickerDialog'
import TareaCreatorFullscreen, {
  type TareaCreatorData,
} from '@/components/tareas/TareaCreatorFullscreen'
import { CATEGORIAS_PORTERO } from '@/lib/catalogos/canonico'

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
  const [expanded, setExpanded] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingTarea, setEditingTarea] = useState<PorteroTarea | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [aiInitialData, setAiInitialData] = useState<any>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creatorOpen, setCreatorOpen] = useState(false)

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
    if (!confirm('¿Eliminar este ejercicio de portero?')) return
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

  const handleSaveToLibrary = useCallback(async (data: {
    nombre: string
    descripcion?: string
    duracion: number
    grafico_data?: any
  }) => {
    await porteroTareasApi.saveToLibrary(sesionId, data)
    alert('Ejercicio guardado en la biblioteca (categoría Porteros)')
  }, [sesionId])

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

  const handleAddFromLibrary = useCallback(async (tarea: Tarea) => {
    await porteroTareasApi.create(sesionId, {
      sesion_id: sesionId,
      equipo_id: equipoId,
      nombre: tarea.titulo,
      descripcion: tarea.descripcion,
      duracion: tarea.duracion_total || 10,
      intensidad: (tarea.densidad as any) || 'media',
      diagram: tarea.grafico_data,
      orden: tareas.length,
    })
    mutate()
  }, [sesionId, equipoId, tareas.length, mutate])

  const handleCreateLibraryTask = useCallback(async (data: TareaCreatorData) => {
    const created = await tareasApi.create({
      ...data,
      categoria_id: data.categoria_id || 'POR',
      modalidad: data.modalidad || 'global',
      es_publica: true,
      equipo_id: equipoId,
    } as any)
    await handleAddFromLibrary(created)
    setCreatorOpen(false)
  }, [equipoId, handleAddFromLibrary])

  const porteroCats = CATEGORIAS_PORTERO.map((c) => c.codigo)

  return (
    <div className="space-y-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 p-3 sm:p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
        type="button"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-emerald-700" />
          ) : (
            <ChevronRight className="h-4 w-4 text-emerald-700" />
          )}
          <h3 className="text-sm font-semibold text-emerald-900">Entrenamiento de Porteros</h3>
          {tareas.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-full">
              <Clock className="h-2.5 w-2.5" />
              {totalDuracion} min
            </span>
          )}
          <span className="text-xs text-muted-foreground">({tareas.length})</span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-2">
          {tareas.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-emerald-200 rounded-xl bg-white/60">
              <p className="text-sm text-muted-foreground mb-3">Sin ejercicios de portero</p>
              {isEditable && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
                  >
                    <BookOpen className="h-3 w-3" /> Biblioteca POR
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatorOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                  >
                    <Plus className="h-3 w-3" /> Crear ejercicio
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingTarea(null); setAiInitialData(null); setShowEditor(true) }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/40 border rounded-lg hover:bg-muted"
                  >
                    Editor rápido
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAI(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100"
                  >
                    <Sparkles className="h-3 w-3" /> IA
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
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 rounded-lg hover:bg-amber-100"
                  >
                    <BookOpen className="h-3 w-3" /> Biblioteca
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatorOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                  >
                    <Plus className="h-3 w-3" /> Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingTarea(null); setAiInitialData(null); setShowEditor(true) }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-muted-foreground bg-muted/50 rounded-lg hover:bg-muted"
                  >
                    Rápido
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAI(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100"
                  >
                    <Sparkles className="h-3 w-3" /> IA
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showEditor && (
        <GKTaskEditor
          tarea={editingTarea}
          sesionId={sesionId}
          equipoId={equipoId}
          initialData={aiInitialData}
          onSave={editingTarea ? handleUpdate : handleCreate}
          onSaveToLibrary={handleSaveToLibrary}
          onClose={() => { setShowEditor(false); setEditingTarea(null); setAiInitialData(null) }}
        />
      )}

      {showAI && (
        <GKAIDesignChat
          sesionId={sesionId}
          matchDay={matchDay}
          intensidadObjetivo={intensidadObjetivo}
          onApply={handleAIApply}
          onClose={() => setShowAI(false)}
        />
      )}

      <TaskPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        faseLabel="porteros"
        description="Biblioteca de ejercicios de portero con la misma calidad de pizarra y detalle."
        allowedCategorias={porteroCats}
        defaultCategoria="POR"
        compactFilters
        onAdd={handleAddFromLibrary}
        onCreateManual={() => {
          setPickerOpen(false)
          setCreatorOpen(true)
        }}
      />

      <TareaCreatorFullscreen
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onSubmit={handleCreateLibraryTask}
        variant="portero"
        defaultCategoria="POR"
        title="Crear ejercicio de portero"
        numJugadoresDefault={1}
        faseLabel="Porteros"
      />
    </div>
  )
}
