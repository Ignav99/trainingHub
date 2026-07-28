'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  closestCenter,
  pointerWithin,
  useDroppable,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import {
  AlertCircle,
  CheckCircle,
  ClipboardPaste,
  Copy,
  GripVertical,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { sesionesApi } from '@/lib/api/sesiones'
import type {
  FormacionEquipos,
  GrupoFormacion,
  Jugador,
  SesionTarea,
} from '@/types'

export const COLORES_EQUIPO = [
  { color: '#EF4444', nombre: 'Equipo Rojo' },
  { color: '#3B82F6', nombre: 'Equipo Azul' },
  { color: '#22C55E', nombre: 'Equipo Verde' },
  { color: '#F97316', nombre: 'Equipo Naranja' },
  { color: '#8B5CF6', nombre: 'Equipo Morado' },
  { color: '#EC4899', nombre: 'Equipo Rosa' },
  { color: '#FACC15', nombre: 'Equipo Amarillo' },
  { color: '#1F2937', nombre: 'Equipo Negro' },
]
const COLOR_SIN_ASIGNAR = { color: '#6B7280', nombre: 'Disponibles' }

const POS_ORDER: Record<string, number> = {
  POR: 0,
  DFC: 1, LTD: 1, LTI: 1, CAD: 1, CAI: 1,
  MCD: 2, MC: 2, MCO: 2, MID: 2, MII: 2,
  EXD: 3, EXI: 3, MP: 3, DC: 3, SD: 3,
}

function positionRank(pos?: string | null): number {
  if (!pos) return 9
  return POS_ORDER[pos] ?? 5
}

function sortIdsByPosition(ids: string[], map: Map<string, Jugador>): string[] {
  return [...ids].sort((a, b) => {
    const ja = map.get(a)
    const jb = map.get(b)
    const ra = positionRank(ja?.posicion_principal)
    const rb = positionRank(jb?.posicion_principal)
    if (ra !== rb) return ra - rb
    return (ja?.dorsal || 99) - (jb?.dorsal || 99)
  })
}

function getPositionColorClasses(posicion: string): string {
  if (posicion === 'POR') return 'bg-amber-200/80 text-amber-800'
  if (['DFC', 'LTD', 'LTI', 'CAD', 'CAI'].includes(posicion)) return 'bg-blue-200/80 text-blue-800'
  if (['MCD', 'MC', 'MCO', 'MID', 'MII'].includes(posicion)) return 'bg-green-200/80 text-green-800'
  if (['EXD', 'EXI', 'MP', 'DC', 'SD'].includes(posicion)) return 'bg-red-200/80 text-red-800'
  return 'bg-muted/60 text-muted-foreground'
}

const formacionCollisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args)
  if (pointer.length > 0) return pointer
  return closestCenter(args)
}

function cleanEmptyTeams(formacion: FormacionEquipos): FormacionEquipos {
  return {
    ...formacion,
    auto_generado: false,
    espacios: formacion.espacios.map((esp) => ({
      ...esp,
      grupos: esp.grupos.filter(
        (g) =>
          (g.tipo !== 'equipo' && g.tipo !== 'sin_asignar') || g.jugador_ids.length > 0
      ),
    })),
  }
}

/** Draft vacío: equipos según estructura + todos los disponibles en pool. */
export function buildDraftFormacion(
  estructura: string,
  disponibleIds: string[],
): FormacionEquipos {
  const parts = (estructura || '4v4').toLowerCase().split('+')[0].split(/v|x/)
  const nTeams = Math.max(2, parts.filter(Boolean).length || 2)
  const equipos: GrupoFormacion[] = COLORES_EQUIPO.slice(0, nTeams).map((c) => ({
    nombre: c.nombre,
    color: c.color,
    tipo: 'equipo' as const,
    jugador_ids: [],
  }))
  return {
    estructura_original: estructura || '4v4',
    auto_generado: false,
    espacios: [
      {
        nombre: 'Campo 1',
        estructura: estructura || '4v4',
        grupos: [
          ...equipos,
          {
            nombre: COLOR_SIN_ASIGNAR.nombre,
            color: COLOR_SIN_ASIGNAR.color,
            tipo: 'sin_asignar',
            jugador_ids: [...disponibleIds],
          },
        ],
      },
    ],
  }
}

function SortablePlayer({
  id,
  jugador,
}: {
  id: string
  jugador: Jugador | undefined
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        // Mientras arrastras, el original se queda fijo; el overlay sigue al cursor.
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        opacity: isDragging ? 0.25 : 1,
      }}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md bg-background cursor-grab active:cursor-grabbing hover:border-border transition-colors text-xs touch-none select-none ${
        jugador?.es_invitado ? 'border-2 border-yellow-400' : 'border border-border/50'
      } ${isDragging ? 'ring-1 ring-primary/30' : ''}`}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="font-bold text-muted-foreground w-5 text-center">
        {jugador?.dorsal || '?'}
      </span>
      <span className="truncate flex-1">
        {jugador
          ? jugador.apodo || `${jugador.nombre} ${jugador.apellidos?.charAt(0) || ''}.`
          : 'Jugador…'}
      </span>
      {jugador?.posicion_principal && (
        <span
          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${getPositionColorClasses(jugador.posicion_principal)}`}
        >
          {jugador.posicion_principal}
        </span>
      )}
    </div>
  )
}

function DroppableGroup({
  grupo,
  jugadoresMap,
  espacioIdx,
  grupoIdx,
  onRemoveGroup,
  onRenameGroup,
  onChangeColor,
  compact,
}: {
  grupo: GrupoFormacion
  jugadoresMap: Map<string, Jugador>
  espacioIdx: number
  grupoIdx: number
  onRemoveGroup?: (espacioIdx: number, grupoIdx: number) => void
  onRenameGroup?: (espacioIdx: number, grupoIdx: number, name: string) => void
  onChangeColor?: (espacioIdx: number, grupoIdx: number, color: string) => void
  compact?: boolean
}) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const isSinAsignar = grupo.tipo === 'sin_asignar'
  const droppableId = `${espacioIdx}-${grupoIdx}`
  const sortedIds = sortIdsByPosition(grupo.jugador_ids, jugadoresMap)
  const itemIds = sortedIds.map((jid) => `${droppableId}::${jid}`)
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: droppableId })

  return (
    <div
      ref={setDroppableRef}
      className={`rounded-xl border p-3 min-h-[140px] flex flex-col transition-[box-shadow,border-color,background-color] ${
        compact ? 'min-w-[160px] flex-1' : 'min-h-[220px]'
      } ${isSinAsignar ? 'bg-muted/30 border-dashed' : ''} ${
        isOver ? 'ring-2 ring-primary/60 ring-offset-1 border-primary/50' : ''
      }`}
      style={{
        backgroundColor: isOver
          ? isSinAsignar
            ? 'rgba(59,130,246,0.08)'
            : `${grupo.color}28`
          : isSinAsignar
            ? undefined
            : `${grupo.color}12`,
        borderColor: isOver
          ? undefined
          : isSinAsignar
            ? undefined
            : `${grupo.color}55`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-2 px-0.5">
        {isSinAsignar ? (
          <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <button
            type="button"
            className="w-3 h-3 rounded-full shrink-0 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-primary/50"
            style={{ backgroundColor: grupo.color }}
            onClick={() => onChangeColor && setShowColorPicker(!showColorPicker)}
            title="Cambiar color"
          />
        )}
        {grupo.tipo === 'equipo' && onRenameGroup ? (
          <input
            className="text-sm font-semibold truncate bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none w-full min-w-0"
            value={grupo.nombre}
            onChange={(e) => onRenameGroup(espacioIdx, grupoIdx, e.target.value)}
          />
        ) : (
          <span className="text-sm font-semibold truncate">{grupo.nombre}</span>
        )}
        <span className="text-[11px] text-muted-foreground ml-auto shrink-0 tabular-nums">
          {grupo.jugador_ids.length}
        </span>
        {grupo.tipo === 'equipo' && onRemoveGroup && (
          <button
            type="button"
            onClick={() => onRemoveGroup(espacioIdx, grupoIdx)}
            className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
            title="Eliminar equipo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {showColorPicker && onChangeColor && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {COLORES_EQUIPO.map((c) => (
            <button
              type="button"
              key={c.color}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                grupo.color === c.color ? 'border-foreground scale-110' : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: c.color }}
              onClick={() => {
                onChangeColor(espacioIdx, grupoIdx, c.color)
                setShowColorPicker(false)
              }}
              title={c.nombre}
            />
          ))}
        </div>
      )}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5 flex-1 min-h-[48px]">
          {sortedIds.map((jid) => (
            <SortablePlayer
              key={`${droppableId}::${jid}`}
              id={`${droppableId}::${jid}`}
              jugador={jugadoresMap.get(jid)}
            />
          ))}
          {grupo.jugador_ids.length === 0 && (
            <div className="text-[11px] text-muted-foreground text-center py-6 italic border border-dashed rounded-lg">
              {isSinAsignar ? 'Convocatoria sin asignar' : 'Arrastra jugadores aquí'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sesionId: string
  sesionTarea: SesionTarea | null
  jugadoresMap: Map<string, Jugador>
  /** IDs convocados a la sesión (presentes con tipo sesión). */
  disponiblesIds: string[]
  onFormacionChange: (stId: string, formacion: FormacionEquipos | null) => void
  onCopy?: () => void
  onPaste?: () => void
  hasCopied?: boolean
  copiedFrom?: string
}

export function FormacionEquiposDialog({
  open,
  onOpenChange,
  sesionId,
  sesionTarea,
  jugadoresMap,
  disponiblesIds,
  onFormacionChange,
  onCopy,
  onPaste,
  hasCopied,
  copiedFrom,
}: Props) {
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [activeId, setActiveId] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const statusTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const syncedRef = useRef<string | null>(null)

  const formacion = sesionTarea?.formacion_equipos || null
  const titulo = sesionTarea?.tarea?.titulo || 'Tarea'
  const estructura =
    sesionTarea?.tarea?.estructura_equipos ||
    formacion?.estructura_original ||
    '4v4'

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Evita activar al hacer click; el overlay se ancla al centro del cursor.
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor)
  )

  const debouncedSave = useCallback(
    (newFormacion: FormacionEquipos) => {
      if (!sesionTarea) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setSaveStatus('saving')
      saveTimerRef.current = setTimeout(async () => {
        setSaving(true)
        try {
          await sesionesApi.guardarFormacion(sesionId, sesionTarea.id, newFormacion)
          setLastSaved(new Date())
          setSaveStatus('saved')
          if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
          statusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 4000)
        } catch (err) {
          console.error('Error saving formation:', err)
          setSaveStatus('error')
        } finally {
          setSaving(false)
        }
      }, 500)
    },
    [sesionId, sesionTarea]
  )

  const applyFormacion = useCallback(
    (next: FormacionEquipos) => {
      if (!sesionTarea) return
      onFormacionChange(sesionTarea.id, next)
      debouncedSave(next)
    },
    [sesionTarea, onFormacionChange, debouncedSave]
  )

  const handleGenerar = async () => {
    if (!sesionTarea) return
    setGenerating(true)
    try {
      const result = await sesionesApi.generarEquiposTarea(sesionId, sesionTarea.id)
      onFormacionChange(sesionTarea.id, result)
      setLastSaved(new Date())
      setSaveStatus('saved')
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
      statusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 4000)
    } catch (err) {
      console.error('Error generating formation:', err)
      setSaveStatus('error')
    } finally {
      setGenerating(false)
    }
  }

  const handleStartDraft = () => {
    if (!sesionTarea) return
    const draft = buildDraftFormacion(estructura, disponiblesIds)
    applyFormacion(draft)
  }

  const handleLimpiar = async () => {
    if (!sesionTarea) return
    try {
      await sesionesApi.limpiarFormacion(sesionId, sesionTarea.id)
      onFormacionChange(sesionTarea.id, null)
      setSaveStatus('idle')
      setLastSaved(null)
      syncedRef.current = null
    } catch (err) {
      console.error('Error clearing formation:', err)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || !formacion || !sesionTarea) return

    const activeIdStr = active.id as string
    const overIdStr = over.id as string
    const [activeGroup, activeJugadorId] = activeIdStr.split('::')
    const [overGroup, overJugadorId] = overIdStr.split('::')
    if (!activeJugadorId || activeIdStr === overIdStr) return

    const [activeEspIdx, activeGrpIdx] = activeGroup.split('-').map(Number)
    let targetEspIdx: number
    let targetGrpIdx: number
    if (overJugadorId) {
      ;[targetEspIdx, targetGrpIdx] = overGroup.split('-').map(Number)
    } else {
      ;[targetEspIdx, targetGrpIdx] = overGroup.split('-').map(Number)
    }

    const rawFormacion: FormacionEquipos = {
      ...formacion,
      auto_generado: false,
      espacios: formacion.espacios.map((espacio, ei) => ({
        ...espacio,
        grupos: espacio.grupos.map((grupo, gi) => {
          let newIds = [...grupo.jugador_ids]
          if (ei === activeEspIdx && gi === activeGrpIdx) {
            newIds = newIds.filter((id) => id !== activeJugadorId)
          }
          if (ei === targetEspIdx && gi === targetGrpIdx) {
            if (!newIds.includes(activeJugadorId)) {
              if (overJugadorId && overJugadorId !== activeJugadorId) {
                const overIdx = newIds.indexOf(overJugadorId)
                if (overIdx >= 0) newIds.splice(overIdx, 0, activeJugadorId)
                else newIds.push(activeJugadorId)
              } else {
                newIds.push(activeJugadorId)
              }
            }
          }
          return {
            ...grupo,
            jugador_ids: sortIdsByPosition(newIds, jugadoresMap),
          }
        }),
      })),
    }

    applyFormacion(cleanEmptyTeams(rawFormacion))
  }

  const handleAddEquipo = (espacioIdx: number) => {
    if (!formacion) return
    const espacio = formacion.espacios[espacioIdx]
    if (!espacio) return
    const usedColors = new Set(
      espacio.grupos.filter((g) => g.tipo === 'equipo').map((g) => g.color)
    )
    const available = COLORES_EQUIPO.find((c) => !usedColors.has(c.color))
    if (!available) return

    const newGrupo: GrupoFormacion = {
      nombre: available.nombre,
      color: available.color,
      tipo: 'equipo',
      jugador_ids: [],
    }
    const insertIdx = espacio.grupos.findIndex((g) => g.tipo !== 'equipo')
    const newGrupos = [...espacio.grupos]
    if (insertIdx >= 0) newGrupos.splice(insertIdx, 0, newGrupo)
    else newGrupos.push(newGrupo)

    applyFormacion({
      ...formacion,
      auto_generado: false,
      espacios: formacion.espacios.map((esp, ei) =>
        ei === espacioIdx ? { ...esp, grupos: newGrupos } : esp
      ),
    })
  }

  const handleRemoveGroup = (espacioIdx: number, grupoIdx: number) => {
    if (!formacion) return
    const espacio = formacion.espacios[espacioIdx]
    const grupo = espacio?.grupos[grupoIdx]
    if (!grupo || grupo.tipo !== 'equipo') return
    const displacedPlayers = grupo.jugador_ids
    let newGrupos = espacio.grupos.filter((_, gi) => gi !== grupoIdx)
    if (displacedPlayers.length > 0) {
      const sinAsignarIdx = newGrupos.findIndex((g) => g.tipo === 'sin_asignar')
      if (sinAsignarIdx >= 0) {
        newGrupos = newGrupos.map((g, gi) =>
          gi === sinAsignarIdx
            ? { ...g, jugador_ids: [...g.jugador_ids, ...displacedPlayers] }
            : g
        )
      } else {
        newGrupos.push({
          nombre: COLOR_SIN_ASIGNAR.nombre,
          color: COLOR_SIN_ASIGNAR.color,
          tipo: 'sin_asignar',
          jugador_ids: displacedPlayers,
        })
      }
    }
    applyFormacion({
      ...formacion,
      auto_generado: false,
      espacios: formacion.espacios.map((esp, ei) =>
        ei === espacioIdx ? { ...esp, grupos: newGrupos } : esp
      ),
    })
  }

  const handleRenameGroup = (espacioIdx: number, grupoIdx: number, newName: string) => {
    if (!formacion) return
    applyFormacion({
      ...formacion,
      auto_generado: false,
      espacios: formacion.espacios.map((esp, ei) =>
        ei === espacioIdx
          ? {
              ...esp,
              grupos: esp.grupos.map((g, gi) =>
                gi === grupoIdx ? { ...g, nombre: newName } : g
              ),
            }
          : esp
      ),
    })
  }

  const handleChangeColor = (espacioIdx: number, grupoIdx: number, newColor: string) => {
    if (!formacion) return
    applyFormacion({
      ...formacion,
      auto_generado: false,
      espacios: formacion.espacios.map((esp, ei) =>
        ei === espacioIdx
          ? {
              ...esp,
              grupos: esp.grupos.map((g, gi) =>
                gi === grupoIdx ? { ...g, color: newColor } : g
              ),
            }
          : esp
      ),
    })
  }

  const handleTogglePorteros = () => {
    if (!formacion) return
    const hasPorteroGroup = formacion.espacios.some((esp) =>
      esp.grupos.some((g) => g.tipo === 'portero')
    )
    const porteroIds = new Set<string>()
    jugadoresMap.forEach((j, id) => {
      if (j.posicion_principal === 'POR') porteroIds.add(id)
    })
    if (porteroIds.size === 0) return

    let newFormacion: FormacionEquipos
    if (!hasPorteroGroup) {
      newFormacion = {
        ...formacion,
        auto_generado: false,
        espacios: formacion.espacios.map((esp) => {
          const porterosInEspacio: string[] = []
          const newGrupos = esp.grupos.map((g) => {
            const extracted = g.jugador_ids.filter((id) => porteroIds.has(id))
            porterosInEspacio.push(...extracted)
            return { ...g, jugador_ids: g.jugador_ids.filter((id) => !porteroIds.has(id)) }
          })
          if (porterosInEspacio.length > 0) {
            newGrupos.push({
              nombre: 'Porteros',
              color: '#F59E0B',
              tipo: 'portero',
              jugador_ids: porterosInEspacio,
            })
          }
          return { ...esp, grupos: newGrupos }
        }),
      }
    } else {
      newFormacion = {
        ...formacion,
        auto_generado: false,
        espacios: formacion.espacios.map((esp) => {
          const porteroGroup = esp.grupos.find((g) => g.tipo === 'portero')
          if (!porteroGroup) return esp
          const porIds = porteroGroup.jugador_ids
          let newGrupos = esp.grupos.filter((g) => g.tipo !== 'portero')
          const saIdx = newGrupos.findIndex((g) => g.tipo === 'sin_asignar')
          if (saIdx >= 0) {
            newGrupos = newGrupos.map((g, i) =>
              i === saIdx ? { ...g, jugador_ids: [...g.jugador_ids, ...porIds] } : g
            )
          } else {
            newGrupos.push({
              nombre: COLOR_SIN_ASIGNAR.nombre,
              color: COLOR_SIN_ASIGNAR.color,
              tipo: 'sin_asignar',
              jugador_ids: porIds,
            })
          }
          return { ...esp, grupos: newGrupos }
        }),
      }
    }
    applyFormacion(newFormacion)
  }

  useEffect(() => {
    if (!open) syncedRef.current = null
  }, [open])

  // Sync missing convocados into sin_asignar once per open/task (+ when roster loads)
  useEffect(() => {
    if (!open || !sesionTarea?.formacion_equipos) return
    const current = sesionTarea.formacion_equipos
    const key = `${sesionTarea.id}:${disponiblesIds.join(',')}`
    if (syncedRef.current === key) return
    syncedRef.current = key
    const assigned = new Set<string>()
    current.espacios.forEach((e) =>
      e.grupos.forEach((g) => g.jugador_ids.forEach((id) => assigned.add(id)))
    )
    const missing = disponiblesIds.filter((id) => !assigned.has(id))
    if (missing.length === 0) return
    const next: FormacionEquipos = {
      ...current,
      auto_generado: false,
      espacios: current.espacios.map((esp, ei) => {
        if (ei !== 0) return esp
        const saIdx = esp.grupos.findIndex((g) => g.tipo === 'sin_asignar')
        if (saIdx >= 0) {
          return {
            ...esp,
            grupos: esp.grupos.map((g, gi) =>
              gi === saIdx
                ? { ...g, jugador_ids: [...g.jugador_ids, ...missing] }
                : g
            ),
          }
        }
        return {
          ...esp,
          grupos: [
            ...esp.grupos,
            {
              nombre: COLOR_SIN_ASIGNAR.nombre,
              color: COLOR_SIN_ASIGNAR.color,
              tipo: 'sin_asignar' as const,
              jugador_ids: missing,
            },
          ],
        }
      }),
    }
    applyFormacion(next)
  }, [open, sesionTarea?.id, sesionTarea?.formacion_equipos, disponiblesIds, applyFormacion])

  const hasPorteroGroup =
    formacion?.espacios.some((esp) => esp.grupos.some((g) => g.tipo === 'portero')) ?? false
  const activeJugadorId = activeId?.split('::')[1]
  const activeJugador = activeJugadorId ? jugadoresMap.get(activeJugadorId) : undefined

  const equiposCount = useMemo(() => {
    if (!formacion) return 0
    return formacion.espacios.reduce(
      (n, e) => n + e.grupos.filter((g) => g.tipo === 'equipo').length,
      0
    )
  }, [formacion])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-muted-foreground" />
            Equipos · {titulo}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
            <span>Convocatoria: {disponiblesIds.length} jugadores</span>
            <Badge variant="outline" className="text-[10px]">
              {estructura}
            </Badge>
            {formacion?.auto_generado && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Auto-generado
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Guardando…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" /> Guardado
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" /> Error al guardar
              </span>
            )}
            {lastSaved && saveStatus === 'idle' && (
              <span className="text-muted-foreground">
                Guardado{' '}
                {lastSaved.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            {saving ? null : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/20 shrink-0 flex-wrap">
          <Button size="sm" className="h-8 text-xs" onClick={handleGenerar} disabled={generating}>
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : formacion ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1" />
            )}
            {formacion ? 'Regenerar' : 'Auto-generar'}
          </Button>
          {!formacion && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleStartDraft}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Empezar vacío
            </Button>
          )}
          {formacion && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleAddEquipo(0)}
                disabled={equiposCount >= COLORES_EQUIPO.length}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Equipo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={handleLimpiar}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpiar
              </Button>
            </>
          )}
          {onCopy && formacion && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCopy}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
            </Button>
          )}
          {hasCopied && onPaste && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={onPaste}>
              <ClipboardPaste className="h-3.5 w-3.5 mr-1" /> Pegar de &quot;{copiedFrom}&quot;
            </Button>
          )}
          {formacion && (
            <div className="flex items-center gap-1.5 ml-auto border-l pl-3">
              <span className="text-[10px] text-muted-foreground">POR aparte</span>
              <Switch
                checked={hasPorteroGroup}
                onCheckedChange={handleTogglePorteros}
                className="scale-75"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {!formacion ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Users className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground max-w-sm">
                Genera equipos automáticamente con la convocatoria de la sesión, o empieza
                vacío y arrastra jugadores a los cuadrantes.
              </p>
              <div className="flex gap-2 mt-2">
                <Button onClick={handleGenerar} disabled={generating}>
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Auto-generar
                </Button>
                <Button variant="outline" onClick={handleStartDraft}>
                  Empezar vacío
                </Button>
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={formacionCollisionDetection}
              measuring={{
                droppable: { strategy: MeasuringStrategy.Always },
              }}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {formacion.espacios.map((espacio, espacioIdx) => {
                const teams = espacio.grupos.filter((g) => g.tipo !== 'sin_asignar')
                const pool = espacio.grupos.filter((g) => g.tipo === 'sin_asignar')
                return (
                  <div key={espacioIdx} className="space-y-3 mb-4">
                    {formacion.espacios.length > 1 && (
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {espacio.nombre} ({espacio.estructura})
                      </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3">
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1">
                          Disponibles
                        </p>
                        {pool.map((grupo) => {
                          const realIdx = espacio.grupos.indexOf(grupo)
                          return (
                            <DroppableGroup
                              key={`pool-${espacioIdx}-${realIdx}`}
                              grupo={{ ...grupo, nombre: COLOR_SIN_ASIGNAR.nombre }}
                              jugadoresMap={jugadoresMap}
                              espacioIdx={espacioIdx}
                              grupoIdx={realIdx}
                              compact
                            />
                          )
                        })}
                        {pool.length === 0 && (
                          <div className="rounded-xl border border-dashed p-4 text-center text-[11px] text-muted-foreground">
                            Todos asignados
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-2">
                          Equipos ({teams.filter((t) => t.tipo === 'equipo').length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {teams.map((grupo) => {
                            const realIdx = espacio.grupos.indexOf(grupo)
                            return (
                              <DroppableGroup
                                key={`${espacioIdx}-${realIdx}`}
                                grupo={grupo}
                                jugadoresMap={jugadoresMap}
                                espacioIdx={espacioIdx}
                                grupoIdx={realIdx}
                                onRemoveGroup={handleRemoveGroup}
                                onRenameGroup={handleRenameGroup}
                                onChangeColor={handleChangeColor}
                              />
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
                {activeId && activeJugador ? (
                  <div
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md bg-background border-2 shadow-xl text-xs cursor-grabbing pointer-events-none ${
                      activeJugador.es_invitado ? 'border-yellow-400' : 'border-primary'
                    }`}
                    style={{ width: 200 }}
                  >
                    <GripVertical className="h-3 w-3 text-primary shrink-0" />
                    <span className="font-bold w-5 text-center">
                      {activeJugador.dorsal || '?'}
                    </span>
                    <span className="truncate flex-1">
                      {activeJugador.apodo ||
                        `${activeJugador.nombre} ${activeJugador.apellidos?.charAt(0) || ''}.`}
                    </span>
                    {activeJugador.posicion_principal && (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${getPositionColorClasses(activeJugador.posicion_principal)}`}
                      >
                        {activeJugador.posicion_principal}
                      </span>
                    )}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
