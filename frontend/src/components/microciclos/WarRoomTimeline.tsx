'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  CollisionDetection,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { CalendarDays, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { DroppableDay } from './DroppableDay'
import { SesionDraggableCard } from './SesionDraggableCard'
import { MATCH_DAY_COLORS } from './SessionCard'
import { microciclosApi } from '@/lib/api/microciclos'
import type { SesionTimeline, Partido } from '@/types'

interface WarRoomTimelineProps {
  microcicloId: string
  weekDates: string[]
  sessionsByDate: Record<string, SesionTimeline[]>
  partido: Partido | undefined
}

/**
 * WarRoomTimeline — Timeline semanal con Drag & Drop multi-contenedor.
 *
 * Arquitectura DnD:
 * - DndContext (core) en el nivel superior para detección de colisiones cross-día
 * - SortableContext dentro de cada DroppableDay para reordenación vertical
 * - useSortable en SesionDraggableCard para animaciones suaves
 * - Persistencia automática al backend al soltar
 *
 * Accesibilidad:
 * - KeyboardSensor para navegación por teclado
 * - PointerSensor con distance: 8 para evitar activación accidental
 * - ARIA labels en todos los elementos interactivos
 */
export function WarRoomTimeline({ microcicloId, weekDates, sessionsByDate, partido }: WarRoomTimelineProps) {
  const [activeSession, setActiveSession] = useState<SesionTimeline | null>(null)
  const [saving, setSaving] = useState(false)
  const [localSessions, setLocalSessions] = useState<Record<string, SesionTimeline[]>>(sessionsByDate)

  // Track last persisted state to avoid unnecessary saves
  const lastPersistedRef = useRef<string>('')

  // Sync local state when server data changes
  useEffect(() => {
    setLocalSessions(sessionsByDate)
  }, [sessionsByDate])

  // Custom collision detection: prioritize pointerWithin for better precision
  const collisionDetection: CollisionDetection = useCallback((args) => {
    // First check pointerWithin for precise hit testing
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }
    // Fallback to closestCorners
    return closestCorners(args)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      // Keyboard activation for accessibility
    })
  )

  // ============ DRAG HANDLERS ============

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const session = active.data.current?.session as SesionTimeline | undefined
    setActiveSession(session || null)
  }, [])

  /**
   * onDragOver: Mueve la sesión entre arrays (días) en tiempo real.
   * Esto permite que SortableContext dentro de cada día refleje los cambios
   * durante el arrastre, dando feedback visual inmediato.
   */
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find source and target containers
    let sourceDate = ''
    let targetDate = ''

    for (const [dateStr, sessions] of Object.entries(localSessions)) {
      if (sessions.some((s) => `sesion-${s.id}` === activeId)) {
        sourceDate = dateStr
      }
      if (`day-${sessions.length > 0 ? weekDates.indexOf(dateStr) + 1 : 0}` === overId) {
        targetDate = dateStr
      }
      if (sessions.some((s) => `sesion-${s.id}` === overId)) {
        targetDate = dateStr
      }
    }

    // Determine target date from overId
    if (overId.startsWith('day-')) {
      const colIdx = parseInt(overId.split('-')[1]) - 1
      targetDate = weekDates[colIdx]
    } else if (overId.startsWith('sesion-')) {
      // Find which day contains the over session
      for (const [dateStr, sessions] of Object.entries(localSessions)) {
        if (sessions.some((s) => `sesion-${s.id}` === overId)) {
          targetDate = dateStr
          break
        }
      }
    }

    if (!sourceDate || !targetDate) return
    if (sourceDate === targetDate) return // Same day — sortable handles it

    // Move session between days
    setLocalSessions((prev) => {
      const newMap: Record<string, SesionTimeline[]> = {}
      for (const key of Object.keys(prev)) {
        newMap[key] = [...prev[key]]
      }

      const activeIndex = newMap[sourceDate].findIndex((s) => `sesion-${s.id}` === activeId)
      if (activeIndex === -1) return prev

      const [movedSession] = newMap[sourceDate].splice(activeIndex, 1)

      if (!newMap[targetDate]) newMap[targetDate] = []

      // Insert at end of target day
      newMap[targetDate].push(movedSession)

      return newMap
    })
  }, [localSessions, weekDates])

  /**
   * onDragEnd: Persiste el estado final al backend.
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveSession(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find source and target dates
    let sourceDate = ''
    let targetDate = ''

    for (const [dateStr, sessions] of Object.entries(localSessions)) {
      if (sessions.some((s) => `sesion-${s.id}` === activeId)) {
        sourceDate = dateStr
      }
    }

    if (overId.startsWith('day-')) {
      const colIdx = parseInt(overId.split('-')[1]) - 1
      targetDate = weekDates[colIdx]
    } else if (overId.startsWith('sesion-')) {
      for (const [dateStr, sessions] of Object.entries(localSessions)) {
        if (sessions.some((s) => `sesion-${s.id}` === overId)) {
          targetDate = dateStr
          break
        }
      }
    }

    if (!sourceDate || !targetDate) return

    // Within same day: sortable handles reorder via arrayMove
    let finalMap = { ...localSessions }

    if (sourceDate === targetDate) {
      const sessions = [...finalMap[sourceDate]]
      const oldIndex = sessions.findIndex((s) => `sesion-${s.id}` === activeId)
      const newIndex = sessions.findIndex((s) => `sesion-${s.id}` === overId)

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        finalMap = {
          ...finalMap,
          [sourceDate]: arrayMove(sessions, oldIndex, newIndex),
        }
      }
    }
    // Cross-day move already handled in onDragOver — just use current state

    setLocalSessions(finalMap)

    // Persist
    const stateSnapshot = JSON.stringify(finalMap)
    if (stateSnapshot !== lastPersistedRef.current) {
      lastPersistedRef.current = stateSnapshot
      persistReorder(finalMap)
    }
  }, [localSessions, weekDates])

  // ============ PERSISTENCIA ============

  const persistReorder = useCallback(async (dateMap: Record<string, SesionTimeline[]>) => {
    setSaving(true)
    try {
      const items = Object.entries(dateMap).flatMap(([dateStr, sessions]) => {
        const diaNumero = weekDates.indexOf(dateStr) + 1
        return sessions.map((s, orderIdx) => ({
          sesion_id: s.id,
          dia_numero: diaNumero,
          orden: orderIdx + 1,
        }))
      })

      await microciclosApi.reordenarSesiones(microcicloId, { sesiones: items })
      // Revalidate SWR cache
      mutate(
        (key: string) => typeof key === 'string' && key.includes('/microciclos'),
        undefined,
        { revalidate: true }
      )
      toast.success('Orden guardado', { duration: 1500 })
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar orden')
      // Revert to server state
      setLocalSessions(sessionsByDate)
      lastPersistedRef.current = ''
    } finally {
      setSaving(false)
    }
  }, [microcicloId, weekDates, sessionsByDate])

  // ============ RENDER ============

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
          Timeline Semanal
          {saving && (
            <span className="inline-flex items-center gap-1" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Guardando orden...</span>
            </span>
          )}
        </h2>
        <span className="text-[11px] text-muted-foreground" aria-hidden="true">
          Arrastra sesiones para reordenar
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements: {
            onDragStart({ active }) {
              const session = active.data.current?.session as SesionTimeline | undefined
              return `Has cogido la sesión "${session?.titulo || 'desconocida'}"`
            },
            onDragOver({ active, over }) {
              if (!over) return ''
              const dayLabel = over.id.toString().startsWith('day-')
                ? `el día ${over.id.toString().split('-')[1]}`
                : 'otra posición'
              return `La sesión se ha movido a ${dayLabel}`
            },
            onDragEnd({ active, over }) {
              const session = active.data.current?.session as SesionTimeline | undefined
              if (!over) return `La sesión "${session?.titulo || ''}" ha vuelto a su posición original`
              return `La sesión "${session?.titulo || ''}" se ha colocado en su nueva posición`
            },
            onDragCancel({ active }) {
              const session = active.data.current?.session as SesionTimeline | undefined
              return `Reordenación cancelada. La sesión "${session?.titulo || ''}" vuelve a su sitio`
            },
          },
          screenReaderInstructions: {
            draggable:
              'Para recoger una sesión, pulsa espacio o enter. Mientras la arrastras, usa las teclas de flecha para moverla. Pulsa espacio o enter de nuevo para soltarla en la nueva posición, o escape para cancelar.',
          },
        }}
      >
        <div className="grid grid-cols-7 gap-2" role="list" aria-label="Días del microciclo">
          {weekDates.map((dateStr, idx) => {
            const daySessions = localSessions[dateStr] || []
            const isMatchDay = !!(partido && partido.fecha.slice(0, 10) === dateStr)

            return (
              <DroppableDay
                key={dateStr}
                dateStr={dateStr}
                colIndex={idx + 1}
                sessions={daySessions}
                partido={partido}
                isMatchDay={isMatchDay}
              />
            )
          })}
        </div>

        {/* Drag overlay — aparece sobre todo mientras se arrastra */}
        <DragOverlay dropAnimation={null}>
          {activeSession ? (
            <div className="w-[180px] opacity-90 rotate-2 scale-105">
              <SesionDraggableCard session={activeSession} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* MD Legend */}
      <div className="flex flex-wrap gap-2 mt-3" role="list" aria-label="Leyenda Match Day">
        {Object.entries(MATCH_DAY_COLORS).map(([md, colors]) => (
          <div
            key={md}
            role="listitem"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] ${colors.bg} ${colors.text}`}
          >
            <span className="font-bold">{md}</span>
            <span>{colors.label}</span>
            <span className="text-[9px] opacity-60">({colors.carga})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
