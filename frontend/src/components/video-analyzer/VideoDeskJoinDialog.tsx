'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatTime } from './utils'
import { reorderJoinRows, type JoinClipRow } from './videoDesk'

function JoinRow({
  row,
  index,
  total,
  onMove,
}: {
  row: JoinClipRow
  index: number
  total: number
  onMove: (delta: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} className="vd-join-row">
      <button
        type="button"
        className="vd-join-grip"
        aria-label={`Arrastrar ${row.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <span className="vd-join-index">{String(index + 1).padStart(2, '0')}</span>
      <span className="vd-join-copy">
        <span className="vd-join-title">{row.title}</span>
        <span className="vd-join-time">
          {formatTime(row.startTime)}–{formatTime(row.endTime)}
        </span>
      </span>
      <span className="vd-join-shift">
        <button
          type="button"
          aria-label={`Subir ${row.title}`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          aria-label={`Bajar ${row.title}`}
          disabled={index === total - 1}
          onClick={() => onMove(1)}
        >
          <ChevronDown size={14} />
        </button>
      </span>
    </li>
  )
}

export function VideoDeskJoinDialog({
  rows,
  defaultName,
  onClose,
  onDownload,
}: {
  rows: JoinClipRow[]
  defaultName: string
  onClose: () => void
  onDownload: (orderedIds: string[], fileName: string) => void
}) {
  const [order, setOrder] = useState(rows)
  const [name, setName] = useState(defaultName)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = (event: DragEndEvent) => {
    const over = event.over ? String(event.over.id) : ''
    if (!over) return
    setOrder((current) => reorderJoinRows(current, String(event.active.id), over))
  }

  return (
    <form
      className="vd-modal-back"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onSubmit={(e) => {
        e.preventDefault()
        if (order.length === 0) return
        onDownload(order.map((row) => row.id), name.trim() || defaultName)
      }}
    >
      <div className="vd-modal vd-join-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Vídeos unidos</h2>
        <p>
          Los recortes marcados para revisión. Arrastra o usa las flechas para el orden.
          Se descarga un solo MP4, en este ordenador.
        </p>
        {order.length === 0 ? (
          <p>Marca recortes con ⌘+clic o en el previsualizador.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={order.map((row) => row.id)} strategy={verticalListSortingStrategy}>
              <ol className="vd-join-list">
                {order.map((row, index) => (
                  <JoinRow
                    key={row.id}
                    row={row}
                    index={index}
                    total={order.length}
                    onMove={(delta) => {
                      setOrder((current) => {
                        const from = current.findIndex((item) => item.id === row.id)
                        const to = from + delta
                        if (from < 0 || to < 0 || to >= current.length) return current
                        return reorderJoinRows(current, current[from].id, current[to].id)
                      })
                    }}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
        <label>
          Nombre del archivo
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="vd-modal-actions">
          <button type="button" className="vd-btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="vd-btn vd-btn-accent" disabled={order.length === 0}>
            Descargar
          </button>
        </div>
      </div>
    </form>
  )
}
