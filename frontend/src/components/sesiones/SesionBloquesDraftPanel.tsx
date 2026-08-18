'use client'

import { useCallback, useMemo, useState } from 'react'
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
  CircleDot,
  X,
  GripVertical,
  Video,
  Pencil,
  Clock,
  Trash2,
  Shirt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Tarea, SesionBloque, FaseSesion } from '@/types'
import {
  ADD_BLOQUE_OPTIONS,
  createBloque,
  emptyPartido,
  faseSesionFromBloque,
  isPartidoCondicionado,
  normalizeOrden,
  type AddBloqueKind,
} from '@/lib/sesionEstructura'
import { cn } from '@/lib/utils'

export interface DraftTareaItem {
  tarea: Tarea
  fase: string
  orden: number
  duracion_override?: number
}

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

function canRemoveDraftBloque(bloque: SesionBloque, tareas: DraftTareaItem[]): boolean {
  if (bloque.tipo === 'videoanalisis' || bloque.tipo === 'partido_condicionado') return true
  return !tareas.some((t) => t.fase === bloque.tipo)
}

export interface SesionBloquesDraftPanelProps {
  bloques: SesionBloque[]
  onBloquesChange: (bloques: SesionBloque[]) => void
  tareas: DraftTareaItem[]
  onOpenTaskPicker: (fase: FaseSesion) => void
  onRemoveTarea: (index: number) => void
}

export function SesionBloquesDraftPanel({
  bloques,
  onBloquesChange,
  tareas,
  onOpenTaskPicker,
  onRemoveTarea,
}: SesionBloquesDraftPanelProps) {
  const [showAddMenu, setShowAddMenu] = useState(false)

  const tareasByFase = useMemo(
    () =>
      tareas.reduce(
        (acc, t, idx) => {
          const fase = t.fase || 'sin_fase'
          if (!acc[fase]) acc[fase] = []
          acc[fase].push({ ...t, _index: idx })
          return acc
        },
        {} as Record<string, (DraftTareaItem & { _index: number })[]>
      ),
    [tareas]
  )

  const persistBloques = useCallback(
    (next: SesionBloque[]) => {
      onBloquesChange(normalizeOrden(next))
    },
    [onBloquesChange]
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
    if (!canRemoveDraftBloque(bloque, tareas)) return
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

  const renderBloqueCard = (bloque: SesionBloque, dragHandle: React.ReactNode | null) => {
    const fase = faseSesionFromBloque(bloque)
    const tareasBloque = fase ? tareasByFase[fase] || [] : []
    const hasTareas = tareasBloque.length > 0
    const tareasDuration = tareasBloque.reduce(
      (s, t) => s + (t.duracion_override || t.tarea.duracion_total || 0),
      0
    )
    const displayDuration = bloque.duracion_objetivo ?? (hasTareas ? tareasDuration : null)
    const isVideo = bloque.tipo === 'videoanalisis'
    const isPartido = isPartidoCondicionado(bloque)
    const removable = canRemoveDraftBloque(bloque, tareas)

    return (
      <Card key={bloque.id} className={cn('card-hover', !hasTareas && !bloque.notas && !isPartido && 'border-dashed')}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {dragHandle}
            {isVideo ? (
              <Video className="h-4 w-4 text-violet-600 shrink-0" />
            ) : isPartido ? (
              <Shirt className="h-4 w-4 text-amber-700 shrink-0" />
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
                  const mins = v === '' ? null : Math.max(0, parseInt(v, 10) || 0)
                  updateBloque(bloque.id, {
                    duracion_objetivo: mins,
                    ...(isPartido
                      ? {
                          partido: {
                            ...(bloque.partido || emptyPartido(mins || 20)),
                            duracion_min: mins || 20,
                          },
                        }
                      : {}),
                  })
                }}
              />
              {displayDuration != null && displayDuration > 0 && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">min</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {fase && !isPartido && (
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
          <div className="divide-y">
            {tareasBloque.map((item) => (
              <div
                key={`${item.tarea.id}-${item._index}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.tarea.titulo}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {item.duracion_override || item.tarea.duracion_total || 0} min
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveTarea(item._index)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Quitar tarea"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : isPartido ? (
          <div className="p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Partido 11 vs 11 a campo normal. Las alineaciones (con peto / sin peto), la pizarra y
              las jugadas ABP se completan al abrir la sesión.
            </p>
            <textarea
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 min-h-[64px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Objetivo del partido (qué se trabaja)…"
              value={bloque.partido?.objetivo || ''}
              onChange={(e) =>
                updateBloque(bloque.id, {
                  partido: {
                    ...(bloque.partido || emptyPartido(bloque.duracion_objetivo || 20)),
                    objetivo: e.target.value,
                  },
                })
              }
            />
            <textarea
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 min-h-[56px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Normas o condicionantes (opcional)…"
              value={bloque.partido?.normas || ''}
              onChange={(e) =>
                updateBloque(bloque.id, {
                  partido: {
                    ...(bloque.partido || emptyPartido(bloque.duracion_objetivo || 20)),
                    normas: e.target.value,
                  },
                })
              }
            />
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {isVideo ? (
              <p className="text-sm text-muted-foreground">
                Bloque de videoanálisis — añade notas sobre qué revisar y duración estimada arriba.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Sin tareas — pulsa «Añadir tarea» para elegir de la biblioteca o crear una nueva
              </p>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 relative">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
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
        <p className="text-xs text-muted-foreground">
          Opcional — puedes completar el diseño después de crear la sesión
        </p>
      </div>

      {bloques.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <Pencil className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-medium text-foreground">Empieza añadiendo bloques</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Añade activación, desarrollo, partido condicionado (11 vs 11), vuelta a la calma o
            videoanálisis. En cada bloque de tareas podrás elegir de la biblioteca o crear ejercicios.
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
