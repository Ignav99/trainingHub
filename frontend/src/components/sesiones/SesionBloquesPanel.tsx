'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  Loader2,
  CircleDot,
  X,
  GripVertical,
  Video,
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SesionTareaPanel } from '@/components/sesion'
import type { Sesion, SesionBloque, SesionTarea, FaseSesion } from '@/types'
import {
  ADD_BLOQUE_OPTIONS,
  canRemoveBloque,
  createBloque,
  faseSesionFromBloque,
  normalizeOrden,
  resolveEstructura,
  type AddBloqueKind,
} from '@/lib/sesionEstructura'
import { cn } from '@/lib/utils'

function SortableBloqueWrapper({
  bloqueId,
  isDraggable,
  children,
}: {
  bloqueId: string
  isDraggable: boolean
  children: (dragHandle: React.ReactNode | null) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bloqueId,
    disabled: !isDraggable,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const dragHandle = isDraggable ? (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
      title="Arrastrar para reordenar"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  ) : null

  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  )
}

export interface SesionBloquesPanelProps {
  sesion: Sesion
  savingTareas?: boolean
  staffOptions: string[]
  formacionDialogStId: string | null
  onOpenTaskPicker: (fase: FaseSesion) => void
  onEstructuraChange: (bloques: SesionBloque[]) => void
  onMoveTarea: (tarea: SesionTarea, direction: 'up' | 'down', bloqueOrder: FaseSesion[]) => void
  onRemoveTarea: (tarea: SesionTarea) => void
  onDurationChange: (tareaId: string, duration: number) => void
  onDurationCommit: (tareaId: string) => void
  onResponsableChange: (tareaId: string, val: string) => void
  onResponsableBlur: () => void
  onNotasChange: (tareaId: string, val: string) => void
  onNotasBlur: () => void
  onToggleFormacion: (stId: string) => void
  onSaveEdit: (stId: string, form: Record<string, unknown>) => void | Promise<void>
  onAiEdit: (stId: string, instruction: string) => void | Promise<void>
}

export function SesionBloquesPanel({
  sesion,
  savingTareas,
  staffOptions,
  formacionDialogStId,
  onOpenTaskPicker,
  onEstructuraChange,
  onMoveTarea,
  onRemoveTarea,
  onDurationChange,
  onDurationCommit,
  onResponsableChange,
  onResponsableBlur,
  onNotasChange,
  onNotasBlur,
  onToggleFormacion,
  onSaveEdit,
  onAiEdit,
}: SesionBloquesPanelProps) {
  const tareas = sesion.tareas || []

  const tareasByFase = useMemo(
    () =>
      tareas.reduce(
        (acc, st) => {
          const fase = st.fase_sesion || 'sin_fase'
          if (!acc[fase]) acc[fase] = []
          acc[fase].push(st)
          return acc
        },
        {} as Record<string, SesionTarea[]>
      ),
    [tareas]
  )

  const [bloques, setBloques] = useState<SesionBloque[]>(() =>
    resolveEstructura(sesion.estructura_fases, tareas)
  )
  const [showAddMenu, setShowAddMenu] = useState(false)

  useEffect(() => {
    setBloques(resolveEstructura(sesion.estructura_fases, tareas))
  }, [sesion.id, sesion.estructura_fases, tareas])

  const persistBloques = useCallback(
    (next: SesionBloque[]) => {
      const normalized = normalizeOrden(next)
      setBloques(normalized)
      onEstructuraChange(normalized)
    },
    [onEstructuraChange]
  )

  const bloqueOrderFases = useMemo(
    () =>
      bloques
        .map((b) => faseSesionFromBloque(b))
        .filter((f): f is FaseSesion => f !== null),
    [bloques]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = bloques.findIndex((b) => b.id === active.id)
    const newIndex = bloques.findIndex((b) => b.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    persistBloques(arrayMove(bloques, oldIndex, newIndex))
  }

  const handleAddBloque = (kind: AddBloqueKind) => {
    const created = createBloque(kind, bloques)
    if (created) {
      persistBloques([...bloques, created])
      setShowAddMenu(false)
    }
  }

  const handleRemoveBloque = (bloque: SesionBloque) => {
    if (!canRemoveBloque(bloque, tareas)) return
    persistBloques(bloques.filter((b) => b.id !== bloque.id))
  }

  const updateBloque = (id: string, patch: Partial<SesionBloque>) => {
    persistBloques(bloques.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  const availableAddOptions = ADD_BLOQUE_OPTIONS.filter((opt) => {
    if (opt.kind === 'desarrollo') {
      return createBloque('desarrollo', bloques) !== null
    }
    return createBloque(opt.kind, bloques) !== null
  })

  const renderBloqueCard = (bloque: SesionBloque, dragHandle: React.ReactNode | null) => {
    const fase = faseSesionFromBloque(bloque)
    const tareasBloque = fase ? tareasByFase[fase] || [] : []
    const hasTareas = tareasBloque.length > 0
    const tareasDuration = tareasBloque.reduce(
      (s, t) => s + (t.duracion_override || t.tarea?.duracion_total || 0),
      0
    )
    const displayDuration = bloque.duracion_objetivo ?? (hasTareas ? tareasDuration : null)
    const isVideo = bloque.tipo === 'videoanalisis'
    const removable = canRemoveBloque(bloque, tareas)

    return (
      <Card key={bloque.id} className={cn('card-hover', !hasTareas && !bloque.notas && 'border-dashed')}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {dragHandle}
            {isVideo ? (
              <Video className="h-4 w-4 text-violet-600 shrink-0" />
            ) : (
              <CircleDot className={cn('h-4 w-4 shrink-0', hasTareas ? 'text-primary' : 'text-muted-foreground')} />
            )}
            <input
              className="font-medium bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none min-w-0 flex-1"
              value={bloque.label}
              onChange={(e) => updateBloque(bloque.id, { label: e.target.value })}
              aria-label="Nombre del bloque"
            />
            <div className="flex items-center gap-1 shrink-0">
              <Input
                type="number"
                min={0}
                max={180}
                placeholder="min"
                className="h-7 w-16 text-xs text-center px-1"
                value={bloque.duracion_objetivo ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  updateBloque(bloque.id, {
                    duracion_objetivo: v === '' ? null : Math.max(0, parseInt(v, 10) || 0),
                  })
                }}
              />
              {displayDuration != null && displayDuration > 0 && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">min</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {fase && (
              <Button variant="ghost" size="sm" onClick={() => onOpenTaskPicker(fase)}>
                <Plus className="h-4 w-4 mr-1" /> Añadir tarea
              </Button>
            )}
            {removable && (
              <button
                type="button"
                onClick={() => handleRemoveBloque(bloque)}
                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Quitar bloque"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {hasTareas ? (
          <div>
            {tareasBloque.map((st, idx) => (
              <div key={st.id}>
                <SesionTareaPanel
                  st={st}
                  index={idx}
                  totalInFase={tareasBloque.length}
                  staffOptions={staffOptions}
                  isFormacionExpanded={formacionDialogStId === st.id}
                  onMoveUp={() => onMoveTarea(st, 'up', bloqueOrderFases)}
                  onMoveDown={() => onMoveTarea(st, 'down', bloqueOrderFases)}
                  onRemove={() => onRemoveTarea(st)}
                  onDurationChange={(val) => onDurationChange(st.id, val)}
                  onDurationCommit={() => onDurationCommit(st.id)}
                  onResponsableChange={(val) => onResponsableChange(st.id, val)}
                  onResponsableBlur={onResponsableBlur}
                  onNotasChange={(val) => onNotasChange(st.id, val)}
                  onNotasBlur={onNotasBlur}
                  onToggleFormacion={() => onToggleFormacion(st.id)}
                  onSaveEdit={async (form) => { await onSaveEdit(st.id, form) }}
                  onAiEdit={async (instruction) => { await onAiEdit(st.id, instruction) }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {isVideo ? (
              <p className="text-sm text-muted-foreground">
                Bloque de videoanálisis — añade notas sobre qué revisar y duración estimada arriba.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center">Sin tareas asignadas</p>
            )}
            <textarea
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 min-h-[72px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={
                isVideo
                  ? 'Ej: Análisis del partido vs rival, clips de presión alta…'
                  : 'Notas del bloque (opcional)…'
              }
              value={bloque.notas || ''}
              onChange={(e) => updateBloque(bloque.id, { notas: e.target.value })}
            />
          </div>
        )}
      </Card>
    )
  }

  const renderAddOptions = (options: typeof ADD_BLOQUE_OPTIONS) => (
    <div className="flex flex-col gap-1 p-2 min-w-[14rem] rounded-lg border bg-card shadow-md">
      {options.map((opt) => (
        <button
          key={opt.kind}
          type="button"
          className="text-left rounded-md px-3 py-2 hover:bg-muted transition-colors"
          onClick={() => handleAddBloque(opt.kind)}
        >
          <div className="font-medium text-sm">{opt.label}</div>
          <div className="text-xs text-muted-foreground">{opt.description}</div>
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 relative">
          <h2 className="font-semibold">Diseño de la sesión</h2>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={availableAddOptions.length === 0}
            onClick={() => setShowAddMenu((v) => !v)}
          >
            <Plus className="h-3 w-3 mr-1" /> Añadir bloque
          </Button>
          {showAddMenu && availableAddOptions.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-1">
              {renderAddOptions(availableAddOptions)}
            </div>
          )}
        </div>
        {savingTareas && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Guardando tareas...
          </span>
        )}
      </div>

      {bloques.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <Pencil className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-medium text-foreground">Sesión sin bloques todavía</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Añade activación, desarrollo, vuelta a la calma, videoanálisis u otros bloques según
            necesites. Cada uno es editable en nombre y duración.
          </p>
          <Button className="mt-4" size="sm" onClick={() => setShowAddMenu(true)}>
            <Plus className="h-4 w-4 mr-1" /> Añadir primer bloque
          </Button>
          {showAddMenu && (
            <div className="mt-4 flex justify-center">{renderAddOptions(ADD_BLOQUE_OPTIONS)}</div>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={bloques.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {bloques.map((bloque) => (
                <SortableBloqueWrapper
                  key={bloque.id}
                  bloqueId={bloque.id}
                  isDraggable={bloques.length > 1}
                >
                  {(dragHandle) => renderBloqueCard(bloque, dragHandle)}
                </SortableBloqueWrapper>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
