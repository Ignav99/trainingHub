'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import useSWR, { mutate } from 'swr'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
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
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Target,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Plus,
  Download,
  Eye,
  CircleDot,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  X,
  Search,
  Shuffle,
  Save,
  GripVertical,
  Package,
  UserCheck,
  UserX,
  RefreshCw,
  Minus,
  UserPlus,
  Pencil,
  Wand2,
  Send,
  Copy,
  ClipboardPaste,
  UserCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { PageHeader } from '@/components/ui/page-header'
import ABPSessionLink from '@/components/abp/ABPSessionLink'
import TareaGraphicEditor from '@/components/tarea-editor/TareaGraphicEditor'
import { emptyDiagramData } from '@/components/tarea-editor/types'
import { TacticalBoardMini } from '@/components/task-preview'
import GKTrainingSection from '@/components/portero/GKTrainingSection'
import { sesionesApi, SesionUpdateData } from '@/lib/api/sesiones'
import { tareasApi } from '@/lib/api/tareas'
import { jugadoresApi } from '@/lib/api/jugadores'
import {
  Sesion,
  SesionTarea,
  EstadoSesion,
  FaseSesion,
  Tarea,
  Jugador,
  Asistencia,
  AsistenciaListResponse,
  MotivoAusencia,
  TipoParticipacion,
  FormacionEquipos,
  GrupoFormacion,
  EspacioFormacion,
  EntrenamientoMargen,
  EntrenamientoMargenCreate,
  EntrenamientoMargenTareaCreate,
  FaseRecuperacion,
  TipoEjercicioMargen,
  FASES_RECUPERACION,
  TIPOS_EJERCICIO_MARGEN,
} from '@/types'
import { PlayerStatusBadges } from '@/components/player/PlayerStatusBadges'
import { cargaApi } from '@/lib/api/carga'
import { entrenamientosMargenApi } from '@/lib/api/entrenamientosMargen'
import { medicoApi } from '@/lib/api/medico'
import type { CargaJugador, RegistroMedico } from '@/types'

const MATCH_DAY_COLORS: Record<string, string> = {
  'MD+1': 'bg-green-100 text-green-800',
  'MD+2': 'bg-green-50 text-green-700',
  'MD-4': 'bg-red-100 text-red-800',
  'MD-3': 'bg-orange-100 text-orange-800',
  'MD-2': 'bg-blue-100 text-blue-800',
  'MD-1': 'bg-purple-100 text-purple-800',
  'MD': 'bg-amber-100 text-amber-800',
}

const FASE_LABELS: Record<string, string> = {
  activacion: 'Activacion',
  desarrollo_1: 'Desarrollo 1',
  desarrollo_2: 'Desarrollo 2',
  desarrollo_3: 'Desarrollo 3',
  desarrollo_4: 'Desarrollo 4',
  desarrollo_5: 'Desarrollo 5',
  desarrollo_6: 'Desarrollo 6',
  vuelta_calma: 'Vuelta a Calma',
}

const ALL_DESARROLLO_FASES: FaseSesion[] = ['desarrollo_1', 'desarrollo_2', 'desarrollo_3', 'desarrollo_4', 'desarrollo_5', 'desarrollo_6']

const FASE_ORDER: FaseSesion[] = ['activacion', 'desarrollo_1', 'desarrollo_2', 'desarrollo_3', 'desarrollo_4', 'desarrollo_5', 'desarrollo_6', 'vuelta_calma']

const ESTADO_CONFIG: Record<string, { color: string; label: string }> = {
  borrador: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Borrador' },
  planificada: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Planificada' },
  completada: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Completada' },
  cancelada: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Cancelada' },
}

const MATCH_DAYS = ['MD+1', 'MD+2', 'MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD']
const INTENSIDADES = ['alta', 'media', 'baja', 'muy_baja']
const MATERIALES_SUGERIDOS = ['Petos', 'Conos', 'Vallas', 'Porterias reducidas', 'Balones', 'Picas', 'Escaleras', 'Gomas']
const MOTIVOS_AUSENCIA: { value: MotivoAusencia; label: string }[] = [
  { value: 'lesion', label: 'Lesion' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'sancion', label: 'Sancion' },
  { value: 'permiso', label: 'Permiso' },
  { value: 'seleccion', label: 'Seleccion' },
  { value: 'viaje', label: 'Viaje' },
  { value: 'otro', label: 'Otro' },
]

const POSITION_ORDER: Record<string, number> = {
  POR: 0, DFC: 1, LTD: 2, LTI: 3, CAD: 4, CAI: 5,
  MCD: 6, MC: 7, MCO: 8, MID: 9, MII: 10,
  EXD: 11, EXI: 12, MP: 13, DC: 14, SD: 15,
}

const COLORES_EQUIPO = [
  { color: '#EF4444', nombre: 'Equipo Rojo' },
  { color: '#3B82F6', nombre: 'Equipo Azul' },
  { color: '#22C55E', nombre: 'Equipo Verde' },
  { color: '#F97316', nombre: 'Equipo Naranja' },
  { color: '#8B5CF6', nombre: 'Equipo Morado' },
  { color: '#EC4899', nombre: 'Equipo Rosa' },
  { color: '#FACC15', nombre: 'Equipo Amarillo' },
  { color: '#1F2937', nombre: 'Equipo Negro' },
]
const COLOR_SIN_ASIGNAR = { color: '#6B7280', nombre: 'Sin asignar' }

function getPositionColorClasses(posicion: string): string {
  if (posicion === 'POR') return 'bg-amber-200/80 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
  if (['DFC', 'LTD', 'LTI', 'CAD', 'CAI'].includes(posicion)) return 'bg-blue-200/80 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
  if (['MCD', 'MC', 'MCO', 'MID', 'MII'].includes(posicion)) return 'bg-green-200/80 text-green-800 dark:bg-green-900/60 dark:text-green-200'
  if (['EXD', 'EXI', 'MP', 'DC', 'SD'].includes(posicion)) return 'bg-red-200/80 text-red-800 dark:bg-red-900/60 dark:text-red-200'
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
    espacios: formacion.espacios.map(esp => ({
      ...esp,
      grupos: esp.grupos.filter(g =>
        (g.tipo !== 'equipo' && g.tipo !== 'sin_asignar') || g.jugador_ids.length > 0
      ),
    })),
  }
}

// ============ Helper: Debounced auto-save ============
function useAutoSave(sesionId: string, delay = 800) {
  const timerRef = useRef<NodeJS.Timeout>()
  const [saving, setSaving] = useState(false)
  const dirtyRef = useRef(false)

  const save = useCallback(
    (data: SesionUpdateData) => {
      dirtyRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(async () => {
        setSaving(true)
        try {
          await sesionesApi.update(sesionId, data)
        } catch (err) {
          console.error('Auto-save failed:', err)
        } finally {
          dirtyRef.current = false
          setSaving(false)
        }
      }, delay)
    },
    [sesionId, delay]
  )

  return { save, saving, dirtyRef }
}

// ============ DnD: Sortable Player Item ============
function SortablePlayer({ id, jugador, color }: { id: string; jugador: Jugador | undefined; color: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md bg-background cursor-grab active:cursor-grabbing hover:border-border transition-colors text-xs ${jugador?.es_invitado ? 'border-2 border-yellow-400' : 'border border-border/50'}`}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="font-bold text-muted-foreground w-5 text-center">
        {jugador?.dorsal || '?'}
      </span>
      <span className="truncate flex-1">
        {jugador ? (jugador.apodo || `${jugador.nombre} ${jugador.apellidos?.charAt(0) || ''}.`) : 'Jugador...'}
      </span>
      {jugador?.posicion_principal && (
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${getPositionColorClasses(jugador.posicion_principal)}`}>
          {jugador.posicion_principal}
        </span>
      )}
    </div>
  )
}

// ============ DnD: Droppable Group Container ============
function DroppableGroup({
  grupo,
  jugadoresMap,
  espacioIdx,
  grupoIdx,
  onRemoveGroup,
  onRenameGroup,
  onChangeColor,
}: {
  grupo: GrupoFormacion
  jugadoresMap: Map<string, Jugador>
  espacioIdx: number
  grupoIdx: number
  onRemoveGroup?: (espacioIdx: number, grupoIdx: number) => void
  onRenameGroup?: (espacioIdx: number, grupoIdx: number, name: string) => void
  onChangeColor?: (espacioIdx: number, grupoIdx: number, color: string) => void
}) {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const isSinAsignar = grupo.tipo === 'sin_asignar'
  // Use 15% opacity for background color
  const bgStyle = { backgroundColor: isSinAsignar ? '#6B728015' : `${grupo.color}15` }
  const borderStyle = {
    borderColor: isSinAsignar ? '#6B728040' : `${grupo.color}40`,
    borderStyle: isSinAsignar ? 'dashed' as const : 'solid' as const,
  }
  const dotStyle = { backgroundColor: grupo.color }

  const droppableId = `${espacioIdx}-${grupoIdx}`
  // Create sortable IDs that encode the group they belong to
  const itemIds = grupo.jugador_ids.map((jid) => `${droppableId}::${jid}`)

  // Make the group itself a drop target so players can be dropped on the container
  const { setNodeRef: setDroppableRef } = useDroppable({ id: droppableId })

  return (
    <div
      ref={setDroppableRef}
      className={`rounded-lg border p-2 min-w-[140px] flex-1 ${isSinAsignar ? 'bg-muted/30' : ''}`}
      style={{ ...bgStyle, ...borderStyle }}
    >
      <div className="flex items-center gap-1.5 mb-2 px-1">
        {isSinAsignar ? (
          <UserPlus className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <button
            className="w-2.5 h-2.5 rounded-full shrink-0 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-primary/50 transition-all"
            style={dotStyle}
            onClick={() => onChangeColor && setShowColorPicker(!showColorPicker)}
            title="Cambiar color"
          />
        )}
        {grupo.tipo === 'equipo' && onRenameGroup ? (
          <input
            className="text-xs font-semibold truncate bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none w-full min-w-0"
            value={grupo.nombre}
            onChange={(e) => onRenameGroup(espacioIdx, grupoIdx, e.target.value)}
          />
        ) : (
          <span className="text-xs font-semibold truncate">{grupo.nombre}</span>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{grupo.jugador_ids.length}</span>
        {grupo.tipo === 'equipo' && onRemoveGroup && (
          <button
            onClick={() => onRemoveGroup(espacioIdx, grupoIdx)}
            className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
            title="Eliminar equipo"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {showColorPicker && onChangeColor && (
        <div className="flex gap-1 mb-2 px-1 flex-wrap">
          {COLORES_EQUIPO.map((c) => (
            <button
              key={c.color}
              className={`w-4 h-4 rounded-full border-2 transition-all ${grupo.color === c.color ? 'border-foreground scale-125' : 'border-transparent hover:scale-110'}`}
              style={{ backgroundColor: c.color }}
              onClick={() => { onChangeColor(espacioIdx, grupoIdx, c.color); setShowColorPicker(false) }}
              title={c.nombre}
            />
          ))}
        </div>
      )}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-1 min-h-[32px]">
          {grupo.jugador_ids.map((jid) => (
            <SortablePlayer
              key={`${droppableId}::${jid}`}
              id={`${droppableId}::${jid}`}
              jugador={jugadoresMap.get(jid)}
              color={grupo.color}
            />
          ))}
          {isSinAsignar && grupo.jugador_ids.length === 0 && (
            <div className="text-[10px] text-muted-foreground text-center py-2 italic">
              Arrastra jugadores aqui
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ============ Formation Panel for a Task ============
function FormacionPanel({
  sesionId,
  sesionTarea,
  jugadoresMap,
  onFormacionChange,
  onCopy,
  onPaste,
  hasCopied,
  copiedFrom,
}: {
  sesionId: string
  sesionTarea: SesionTarea
  jugadoresMap: Map<string, Jugador>
  onFormacionChange: (stId: string, formacion: FormacionEquipos | null) => void
  onCopy?: () => void
  onPaste?: () => void
  hasCopied?: boolean
  copiedFrom?: string
}) {
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [activeId, setActiveId] = useState<string | null>(null)
  const saveTimerRef = useRef<NodeJS.Timeout>()
  const statusTimerRef = useRef<NodeJS.Timeout>()

  const formacion = sesionTarea.formacion_equipos

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleGenerar = async () => {
    setGenerating(true)
    try {
      const result = await sesionesApi.generarEquiposTarea(sesionId, sesionTarea.id)
      onFormacionChange(sesionTarea.id, result)
      setLastSaved(new Date())
      setSaveStatus('saved')
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
      statusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 4000)
    } catch (err: any) {
      console.error('Error generating formation:', err)
      setSaveStatus('error')
    } finally {
      setGenerating(false)
    }
  }

  const handleLimpiar = async () => {
    try {
      await sesionesApi.limpiarFormacion(sesionId, sesionTarea.id)
      onFormacionChange(sesionTarea.id, null)
      setSaveStatus('idle')
      setLastSaved(null)
    } catch (err) {
      console.error('Error clearing formation:', err)
    }
  }

  const debouncedSave = useCallback((newFormacion: FormacionEquipos) => {
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
  }, [sesionId, sesionTarea.id])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || !formacion) return

    const activeIdStr = active.id as string
    const overIdStr = over.id as string

    // Parse IDs: format is "espacioIdx-grupoIdx::jugadorId"
    const [activeGroup, activeJugadorId] = activeIdStr.split('::')
    const [overGroup, overJugadorId] = overIdStr.split('::')

    if (!activeJugadorId) return

    // If dropped on same position, do nothing
    if (activeIdStr === overIdStr) return

    // Parse group coords
    const [activeEspIdx, activeGrpIdx] = activeGroup.split('-').map(Number)

    // Determine target group
    let targetEspIdx: number
    let targetGrpIdx: number
    if (overJugadorId) {
      // Dropped on another player - use that player's group
      ;[targetEspIdx, targetGrpIdx] = overGroup.split('-').map(Number)
    } else {
      // Dropped on a group container directly
      ;[targetEspIdx, targetGrpIdx] = overGroup.split('-').map(Number)
    }

    // Build updated formation
    const rawFormacion: FormacionEquipos = {
      ...formacion,
      auto_generado: false,
      espacios: formacion.espacios.map((espacio, ei) => ({
        ...espacio,
        grupos: espacio.grupos.map((grupo, gi) => {
          let newIds = [...grupo.jugador_ids]

          // Remove from source group
          if (ei === activeEspIdx && gi === activeGrpIdx) {
            newIds = newIds.filter((id) => id !== activeJugadorId)
          }

          // Add to target group
          if (ei === targetEspIdx && gi === targetGrpIdx) {
            if (!newIds.includes(activeJugadorId)) {
              // Insert at the position of the over item
              if (overJugadorId && overJugadorId !== activeJugadorId) {
                const overIdx = newIds.indexOf(overJugadorId)
                if (overIdx >= 0) {
                  newIds.splice(overIdx, 0, activeJugadorId)
                } else {
                  newIds.push(activeJugadorId)
                }
              } else {
                newIds.push(activeJugadorId)
              }
            }
          }

          return { ...grupo, jugador_ids: newIds }
        }),
      })),
    }

    // Clean empty equipo and sin_asignar groups
    const newFormacion = cleanEmptyTeams(rawFormacion)

    onFormacionChange(sesionTarea.id, newFormacion)
    debouncedSave(newFormacion)
  }

  const handleAddEquipo = (espacioIdx: number) => {
    if (!formacion) return
    const espacio = formacion.espacios[espacioIdx]
    if (!espacio) return

    // Find first unused color
    const usedColors = new Set(espacio.grupos.filter(g => g.tipo === 'equipo').map(g => g.color))
    const available = COLORES_EQUIPO.find(c => !usedColors.has(c.color))
    if (!available) return // All colors used

    const newGrupo: GrupoFormacion = {
      nombre: available.nombre,
      color: available.color,
      tipo: 'equipo',
      jugador_ids: [],
    }

    // Insert before comodin/portero/sin_asignar groups
    const insertIdx = espacio.grupos.findIndex(g => g.tipo !== 'equipo')
    const newGrupos = [...espacio.grupos]
    if (insertIdx >= 0) {
      newGrupos.splice(insertIdx, 0, newGrupo)
    } else {
      newGrupos.push(newGrupo)
    }

    const newFormacion: FormacionEquipos = {
      ...formacion,
      auto_generado: false,
      espacios: formacion.espacios.map((esp, ei) =>
        ei === espacioIdx ? { ...esp, grupos: newGrupos } : esp
      ),
    }

    onFormacionChange(sesionTarea.id, newFormacion)
    debouncedSave(newFormacion)
  }

  const handleRemoveGroup = (espacioIdx: number, grupoIdx: number) => {
    if (!formacion) return
    const espacio = formacion.espacios[espacioIdx]
    const grupo = espacio?.grupos[grupoIdx]
    if (!grupo || grupo.tipo !== 'equipo') return

    const displacedPlayers = grupo.jugador_ids

    let newGrupos = espacio.grupos.filter((_, gi) => gi !== grupoIdx)

    // If there are displaced players, move them to sin_asignar
    if (displacedPlayers.length > 0) {
      const sinAsignarIdx = newGrupos.findIndex(g => g.tipo === 'sin_asignar')
      if (sinAsignarIdx >= 0) {
        // Add to existing sin_asignar group
        newGrupos = newGrupos.map((g, gi) =>
          gi === sinAsignarIdx
            ? { ...g, jugador_ids: [...g.jugador_ids, ...displacedPlayers] }
            : g
        )
      } else {
        // Create new sin_asignar group
        newGrupos.push({
          nombre: COLOR_SIN_ASIGNAR.nombre,
          color: COLOR_SIN_ASIGNAR.color,
          tipo: 'sin_asignar',
          jugador_ids: displacedPlayers,
        })
      }
    }

    const newFormacion: FormacionEquipos = {
      ...formacion,
      auto_generado: false,
      espacios: formacion.espacios.map((esp, ei) =>
        ei === espacioIdx ? { ...esp, grupos: newGrupos } : esp
      ),
    }

    onFormacionChange(sesionTarea.id, newFormacion)
    debouncedSave(newFormacion)
  }

  const handleRenameGroup = (espacioIdx: number, grupoIdx: number, newName: string) => {
    if (!formacion) return
    const newFormacion: FormacionEquipos = {
      ...formacion,
      auto_generado: false,
      espacios: formacion.espacios.map((esp, ei) =>
        ei === espacioIdx
          ? { ...esp, grupos: esp.grupos.map((g, gi) => gi === grupoIdx ? { ...g, nombre: newName } : g) }
          : esp
      ),
    }
    onFormacionChange(sesionTarea.id, newFormacion)
    debouncedSave(newFormacion)
  }

  const handleChangeColor = (espacioIdx: number, grupoIdx: number, newColor: string) => {
    if (!formacion) return
    const newFormacion: FormacionEquipos = {
      ...formacion,
      auto_generado: false,
      espacios: formacion.espacios.map((esp, ei) =>
        ei === espacioIdx
          ? { ...esp, grupos: esp.grupos.map((g, gi) => gi === grupoIdx ? { ...g, color: newColor } : g) }
          : esp
      ),
    }
    onFormacionChange(sesionTarea.id, newFormacion)
    debouncedSave(newFormacion)
  }

  const handleTogglePorteros = () => {
    if (!formacion) return
    // Check if porteros group already exists
    const hasPorteroGroup = formacion.espacios.some(esp => esp.grupos.some(g => g.tipo === 'portero'))

    // Find all es_portero player IDs from jugadoresMap
    const porteroIds = new Set<string>()
    jugadoresMap.forEach((j, id) => {
      if (j.posicion_principal === 'POR') porteroIds.add(id)
    })

    if (porteroIds.size === 0) return

    let newFormacion: FormacionEquipos
    if (!hasPorteroGroup) {
      // ON: extract porteros from their groups into a new "Porteros" group
      newFormacion = {
        ...formacion,
        auto_generado: false,
        espacios: formacion.espacios.map(esp => {
          const porterosInEspacio: string[] = []
          const newGrupos = esp.grupos.map(g => {
            const extracted = g.jugador_ids.filter(id => porteroIds.has(id))
            porterosInEspacio.push(...extracted)
            return { ...g, jugador_ids: g.jugador_ids.filter(id => !porteroIds.has(id)) }
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
      // OFF: dissolve portero groups, move GKs to sin_asignar
      newFormacion = {
        ...formacion,
        auto_generado: false,
        espacios: formacion.espacios.map(esp => {
          const porteroGroup = esp.grupos.find(g => g.tipo === 'portero')
          if (!porteroGroup) return esp
          const porIds = porteroGroup.jugador_ids
          let newGrupos = esp.grupos.filter(g => g.tipo !== 'portero')
          // Add to sin_asignar
          const saIdx = newGrupos.findIndex(g => g.tipo === 'sin_asignar')
          if (saIdx >= 0) {
            newGrupos = newGrupos.map((g, i) => i === saIdx ? { ...g, jugador_ids: [...g.jugador_ids, ...porIds] } : g)
          } else {
            newGrupos.push({ nombre: 'Sin asignar', color: '#6B7280', tipo: 'sin_asignar', jugador_ids: porIds })
          }
          return { ...esp, grupos: newGrupos }
        }),
      }
    }

    onFormacionChange(sesionTarea.id, newFormacion)
    debouncedSave(newFormacion)
  }

  const hasPorteroGroup = formacion?.espacios.some(esp => esp.grupos.some(g => g.tipo === 'portero')) ?? false

  // Find the active player for the drag overlay
  const activeJugadorId = activeId?.split('::')[1]
  const activeJugador = activeJugadorId ? jugadoresMap.get(activeJugadorId) : undefined

  if (!formacion) {
    return (
      <div className="flex items-center justify-center py-4 gap-3">
        <Button size="sm" onClick={handleGenerar} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
          Auto-generar equipos
        </Button>
        {hasCopied && onPaste && (
          <Button size="sm" variant="outline" onClick={onPaste}>
            <ClipboardPaste className="h-4 w-4 mr-1" /> Pegar de &quot;{copiedFrom}&quot;
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {formacion.estructura_original}
          </Badge>
          {formacion.auto_generado && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Auto-generado
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Guardando...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-[10px] text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Guardado
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-[10px] text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Error al guardar
            </span>
          )}
          {lastSaved && saveStatus === 'idle' && (
            <span className="text-[10px] text-muted-foreground">
              Guardado {lastSaved.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleGenerar} disabled={generating}>
            {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Regenerar
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={handleLimpiar}>
            <Trash2 className="h-3 w-3 mr-1" /> Limpiar
          </Button>
          {onCopy && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCopy}>
              <Copy className="h-3 w-3 mr-1" /> Copiar
            </Button>
          )}
          {hasCopied && onPaste && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={onPaste}>
              <ClipboardPaste className="h-3 w-3 mr-1" /> Pegar de &quot;{copiedFrom}&quot;
            </Button>
          )}
          {formacion.espacios.length === 1 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleAddEquipo(0)}
              disabled={formacion.espacios[0].grupos.filter(g => g.tipo === 'equipo').length >= COLORES_EQUIPO.length}
            >
              <Plus className="h-3 w-3 mr-1" /> Equipo
            </Button>
          ) : null}
          <div className="flex items-center gap-1.5 ml-1 border-l pl-2">
            <span className="text-[10px] text-muted-foreground">POR aparte</span>
            <Switch
              checked={hasPorteroGroup}
              onCheckedChange={handleTogglePorteros}
              className="scale-75"
            />
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={formacionCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {formacion.espacios.map((espacio, espacioIdx) => (
          <div key={espacioIdx}>
            {formacion.espacios.length > 1 && (
              <div className="flex items-center gap-2 mb-1.5">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {espacio.nombre} ({espacio.estructura})
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] px-1.5"
                  onClick={() => handleAddEquipo(espacioIdx)}
                  disabled={espacio.grupos.filter(g => g.tipo === 'equipo').length >= COLORES_EQUIPO.length}
                >
                  <Plus className="h-2.5 w-2.5 mr-0.5" /> Equipo
                </Button>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {espacio.grupos.filter(g => g.tipo !== 'sin_asignar').map((grupo, grupoIdx) => {
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
            {/* Sin asignar zone - rendered separately at bottom */}
            {espacio.grupos.filter(g => g.tipo === 'sin_asignar').map((grupo) => {
              const realIdx = espacio.grupos.indexOf(grupo)
              return (
                <div key={`sin-asignar-${espacioIdx}`} className="mt-2">
                  <DroppableGroup
                    grupo={grupo}
                    jugadoresMap={jugadoresMap}
                    espacioIdx={espacioIdx}
                    grupoIdx={realIdx}
                  />
                </div>
              )
            })}
          </div>
        ))}

        <DragOverlay>
          {activeId && activeJugador ? (
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md bg-background border-2 shadow-lg text-xs ${activeJugador.es_invitado ? 'border-yellow-400' : 'border-primary'}`}>
              <GripVertical className="h-3 w-3 text-primary shrink-0" />
              <span className="font-bold w-5 text-center">{activeJugador.dorsal || '?'}</span>
              <span>{activeJugador.apodo || `${activeJugador.nombre} ${activeJugador.apellidos?.charAt(0) || ''}.`}</span>
              {activeJugador.posicion_principal && (
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${getPositionColorClasses(activeJugador.posicion_principal)}`}>
                  {activeJugador.posicion_principal}
                </span>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

// ============ Sortable Phase Card Wrapper ============
function SortablePhaseCard({ fase, isDraggable, children }: {
  fase: string
  isDraggable: boolean
  children: (dragHandle: React.ReactNode | null) => React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fase, disabled: !isDraggable })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const dragHandle = isDraggable ? (
    <button
      {...attributes}
      {...listeners}
      className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
      title="Arrastrar para reordenar fase"
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

// ============ Main Component ============
export default function SesionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sesionId = params.id as string

  // Core data fetching via SWR
  const { data: sesionData, error: swrError, isLoading } = useSWR<Sesion>(
    sesionId ? `/sesiones/${sesionId}` : null
  )
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const loading = isLoading && !sesion
  const error = swrError ? (swrError.message || 'Error al cargar la sesion') : null

  const { save: autoSave, saving: autoSaving, dirtyRef } = useAutoSave(sesionId)

  // Sync SWR data to local state (skip if autosave is pending to prevent overwriting edits)
  useEffect(() => {
    if (sesionData && !dirtyRef.current) {
      setSesion(sesionData)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesionData])

  // Action states
  const [deleting, setDeleting] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [previewingPdf, setPreviewingPdf] = useState(false)
  const [savingTareas, setSavingTareas] = useState(false)

  // Task picker
  const [taskPickerOpen, setTaskPickerOpen] = useState(false)
  const [taskPickerFase, setTaskPickerFase] = useState<FaseSesion>('activacion')
  const [taskSearchQuery, setTaskSearchQuery] = useState('')
  const [taskSearchCategory, setTaskSearchCategory] = useState('')
  const [taskSearchResults, setTaskSearchResults] = useState<Tarea[]>([])
  const [searchingTasks, setSearchingTasks] = useState(false)

  // Asistencia state
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const jugadoresRef = useRef<Jugador[]>([])
  useEffect(() => { jugadoresRef.current = jugadores }, [jugadores])
  const [asistencias, setAsistencias] = useState<Map<string, { presente: boolean; motivo?: MotivoAusencia; notas?: string; tipo_participacion: TipoParticipacion[] }>>(new Map())
  const [asistenciasLoaded, setAsistenciasLoaded] = useState(false)
  const [savingAsistencias, setSavingAsistencias] = useState(false)

  // Carga data for asistencia badges
  const [cargaMap, setCargaMap] = useState<Map<string, CargaJugador>>(new Map())

  // Entrenamientos al margen
  const [margenMap, setMargenMap] = useState<Map<string, EntrenamientoMargen>>(new Map())
  const [margenLoaded, setMargenLoaded] = useState(false)
  const [margenExpanded, setMargenExpanded] = useState<Set<string>>(new Set())
  const [margenEditing, setMargenEditing] = useState<string | null>(null) // jugador_id being edited
  const [margenSaving, setMargenSaving] = useState(false)
  const [margenForm, setMargenForm] = useState<{
    registro_medico_id?: string
    objetivo?: string
    notas?: string
    responsable?: string
    fase_recuperacion?: FaseRecuperacion
    duracion_estimada?: number
    tareas: EntrenamientoMargenTareaCreate[]
  }>({ tareas: [] })
  const [jugadorRegistros, setJugadorRegistros] = useState<RegistroMedico[]>([])

  // Per-task formation panel state
  const [expandedFormaciones, setExpandedFormaciones] = useState<Set<string>>(new Set())

  // Clipboard for copy/paste formations between tasks
  const [copiedFormacion, setCopiedFormacion] = useState<{
    formacion: FormacionEquipos
    taskName: string
  } | null>(null)

  // Invitados state
  const [crossTeamDialogOpen, setCrossTeamDialogOpen] = useState(false)
  const [quickAddDialogOpen, setQuickAddDialogOpen] = useState(false)
  const [orgJugadores, setOrgJugadores] = useState<Jugador[]>([])
  const [orgJugadoresLoading, setOrgJugadoresLoading] = useState(false)
  const [orgSearchQuery, setOrgSearchQuery] = useState('')
  const [addingInvitado, setAddingInvitado] = useState(false)
  const [quickAddForm, setQuickAddForm] = useState({
    nombre: '',
    apellidos: '',
    posicion_principal: 'MC',
  })

  // Task editing state
  const [editingTarea, setEditingTarea] = useState<SesionTarea | null>(null)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiPreview, setAiPreview] = useState<Record<string, any> | null>(null)

  // Task creation state (in picker)
  const [pickerTab, setPickerTab] = useState<'biblioteca' | 'crear'>('biblioteca')
  const [newTaskForm, setNewTaskForm] = useState({ titulo: '', descripcion: '', duracion_total: 10 })
  const [creatingTask, setCreatingTask] = useState(false)
  const [aiCreatePrompt, setAiCreatePrompt] = useState('')
  const [aiCreating, setAiCreating] = useState(false)

  // Phase management — track explicitly added/removed fases
  const [addedFases, setAddedFases] = useState<Set<FaseSesion>>(new Set())
  const [removedFases, setRemovedFases] = useState<Set<FaseSesion>>(new Set())

  // Build jugadores lookup map
  const jugadoresMap = new Map<string, Jugador>()
  for (const j of jugadores) {
    jugadoresMap.set(j.id, j)
  }

  // ============ Load data ============
  const jugadoresLoadedRef = useRef(false)

  const loadJugadores = async () => {
    if (!sesion?.equipo_id || jugadoresLoadedRef.current) return
    try {
      const response = await jugadoresApi.list({ equipo_id: sesion.equipo_id, limit: 100 })
      const teamPlayers = (response.data as unknown as Jugador[]).filter((j) => !j.es_invitado)
      const teamIds = new Set(teamPlayers.map((j) => j.id))
      // Preserve invitados/cross-team players already in state (from loadAsistencias)
      setJugadores((prev) => {
        const extras = prev.filter((j) => !teamIds.has(j.id))
        return [...teamPlayers, ...extras]
      })
      jugadoresLoadedRef.current = true
    } catch (err) {
      console.error('Error loading jugadores:', err)
    }
  }

  const loadAsistencias = async () => {
    if (asistenciasLoaded) return
    try {
      const response = await sesionesApi.getAsistencias(sesionId)
      const map = new Map<string, { presente: boolean; motivo?: MotivoAusencia; notas?: string; tipo_participacion: TipoParticipacion[] }>()
      const extraPlayers: Jugador[] = []
      for (const a of response.data) {
        const tp = (a.tipo_participacion as TipoParticipacion[] | undefined) || []
        map.set(a.jugador_id, {
          presente: a.presente,
          motivo: a.motivo_ausencia as MotivoAusencia | undefined,
          notas: a.notas,
          tipo_participacion: a.presente && tp.length === 0 ? ['sesion'] : tp,
        })
        // Collect invitados/cross-team players from DB join data (not relying on jugadores closure)
        if (a.jugador && (a.jugador.es_invitado || (sesion?.equipo_id && a.jugador.equipo_id !== sesion.equipo_id))) {
          extraPlayers.push({
            ...a.jugador,
            es_invitado: a.jugador.es_invitado ?? true,
          } as unknown as Jugador)
        }
      }
      // Merge invitados/cross-team players into jugadores (dedup with functional update)
      if (extraPlayers.length > 0) {
        setJugadores((prev) => {
          const ids = new Set(prev.map((j) => j.id))
          const toAdd = extraPlayers.filter((j) => !ids.has(j.id))
          return toAdd.length > 0 ? [...prev, ...toAdd] : prev
        })
      }
      // NOTE: No auto-marking injured/sick players as absent — the coach decides.
      // PlayerStatusBadges already shows lesionado/enfermo/sancionado badges.
      // When the coach manually toggles absent, the motivo auto-fills via toggleAsistencia.
      setAsistencias(map)
      setAsistenciasLoaded(true)
    } catch (err) {
      console.error('Error loading asistencias:', err)
    }
  }

  // ============ Entrenamientos al Margen ============
  const loadMargen = async () => {
    if (margenLoaded) return
    try {
      const data = await entrenamientosMargenApi.listBySesion(sesionId)
      const map = new Map<string, EntrenamientoMargen>()
      for (const ent of data) {
        map.set(ent.jugador_id, ent)
      }
      setMargenMap(map)
      setMargenLoaded(true)
    } catch (err) {
      console.error('Error loading margen:', err)
    }
  }

  const startMargenEdit = async (jugadorId: string) => {
    const existing = margenMap.get(jugadorId)
    if (existing) {
      setMargenForm({
        registro_medico_id: existing.registro_medico_id,
        objetivo: existing.objetivo || '',
        notas: existing.notas || '',
        responsable: existing.responsable || '',
        fase_recuperacion: existing.fase_recuperacion as FaseRecuperacion | undefined,
        duracion_estimada: existing.duracion_estimada,
        tareas: existing.tareas.map(t => ({
          tarea_id: t.tarea_id,
          orden: t.orden,
          titulo_custom: t.titulo_custom,
          descripcion_custom: t.descripcion_custom,
          duracion: t.duracion,
          series: t.series,
          repeticiones: t.repeticiones,
          descanso: t.descanso,
          carga: t.carga,
          tipo_ejercicio: t.tipo_ejercicio as TipoEjercicioMargen | undefined,
          notas: t.notas,
        })),
      })
    } else {
      setMargenForm({ tareas: [] })
    }
    // Load medical records for this player
    if (sesion?.equipo_id) {
      try {
        const registros = await medicoApi.list(sesion.equipo_id, {
          jugador_id: jugadorId,
          estado: 'activo',
        })
        // Also fetch en_recuperacion
        const registros2 = await medicoApi.list(sesion.equipo_id, {
          jugador_id: jugadorId,
          estado: 'en_recuperacion',
        })
        setJugadorRegistros([...registros, ...registros2])
      } catch {
        setJugadorRegistros([])
      }
    }
    setMargenEditing(jugadorId)
  }

  const saveMargen = async (jugadorId: string) => {
    if (!sesion) return
    setMargenSaving(true)
    try {
      const existing = margenMap.get(jugadorId)
      if (existing) {
        // Update existing
        await entrenamientosMargenApi.update(existing.id, {
          registro_medico_id: margenForm.registro_medico_id,
          objetivo: margenForm.objetivo,
          notas: margenForm.notas,
          responsable: margenForm.responsable,
          fase_recuperacion: margenForm.fase_recuperacion,
          duracion_estimada: margenForm.duracion_estimada,
        })
        // Replace tareas
        await entrenamientosMargenApi.updateTareas(existing.id, margenForm.tareas)
      } else {
        // Create new
        await entrenamientosMargenApi.create({
          sesion_id: sesionId,
          jugador_id: jugadorId,
          registro_medico_id: margenForm.registro_medico_id,
          objetivo: margenForm.objetivo,
          notas: margenForm.notas,
          responsable: margenForm.responsable,
          fase_recuperacion: margenForm.fase_recuperacion,
          duracion_estimada: margenForm.duracion_estimada,
          tareas: margenForm.tareas,
        })
      }
      // Reload
      setMargenLoaded(false)
      await loadMargen()
      setMargenEditing(null)
      toast.success('Trabajo al margen guardado')
    } catch (err: any) {
      toast.error(err.message || 'Error guardando trabajo al margen')
    } finally {
      setMargenSaving(false)
    }
  }

  const deleteMargen = async (jugadorId: string) => {
    const existing = margenMap.get(jugadorId)
    if (!existing) return
    try {
      await entrenamientosMargenApi.delete(existing.id)
      setMargenLoaded(false)
      await loadMargen()
      toast.success('Trabajo al margen eliminado')
    } catch (err: any) {
      toast.error(err.message || 'Error eliminando')
    }
  }

  const addMargenTarea = () => {
    setMargenForm(prev => ({
      ...prev,
      tareas: [...prev.tareas, {
        orden: prev.tareas.length + 1,
        titulo_custom: '',
        duracion: undefined,
        series: undefined,
        tipo_ejercicio: undefined,
      }],
    }))
  }

  const removeMargenTarea = (idx: number) => {
    setMargenForm(prev => ({
      ...prev,
      tareas: prev.tareas.filter((_, i) => i !== idx).map((t, i) => ({ ...t, orden: i + 1 })),
    }))
  }

  const updateMargenTarea = (idx: number, field: string, value: any) => {
    setMargenForm(prev => ({
      ...prev,
      tareas: prev.tareas.map((t, i) => i === idx ? { ...t, [field]: value } : t),
    }))
  }

  // ============ Field update with autosave ============
  const updateField = (field: string, value: any) => {
    setSesion((prev) => prev ? { ...prev, [field]: value } : prev)
    autoSave({ [field]: value } as SesionUpdateData)
  }

  // ============ Estado ============
  const handleUpdateEstado = async (nuevoEstado: EstadoSesion) => {
    try {
      await sesionesApi.update(sesionId, { estado: nuevoEstado } as SesionUpdateData)
      setSesion((prev) => prev ? { ...prev, estado: nuevoEstado } : prev)
      mutate((key: string) => typeof key === 'string' && key.includes('/sesiones'), undefined, { revalidate: true })
    } catch (err) {
      console.error('Error updating estado:', err)
    }
  }

  // ============ Delete ============
  const handleDelete = async () => {
    if (!confirm('Estas seguro de que quieres eliminar esta sesion?')) return
    setDeleting(true)
    try {
      await sesionesApi.delete(sesionId)
      mutate((key: string) => typeof key === 'string' && key.includes('/sesiones'), undefined, { revalidate: true })
      router.push('/sesiones')
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar')
      setDeleting(false)
    }
  }

  // ============ PDF ============
  const handlePreviewPdf = async () => {
    setPreviewingPdf(true)
    try {
      await sesionesApi.previewPdf(sesionId)
    } catch (err) {
      toast.error('Error al generar vista previa del PDF')
    } finally {
      setPreviewingPdf(false)
    }
  }

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true)
    try {
      await sesionesApi.generatePdf(sesionId)
      toast.success('PDF descargado')
    } catch (err) {
      toast.error('Error al descargar PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  // ============ Tareas management ============
  const tareasByFase = sesion?.tareas?.reduce((acc, st) => {
    const fase = st.fase_sesion || 'sin_fase'
    if (!acc[fase]) acc[fase] = []
    acc[fase].push(st)
    return acc
  }, {} as Record<string, SesionTarea[]>) || {}

  const allTareas = sesion?.tareas || []

  // Dynamic phases: always activacion + desarrollo_1 + desarrollo_2 + vuelta_calma by default.
  // User can add desarrollo_3..6 and remove empty non-required phases.
  const activeFases = useMemo(() => {
    const defaultFases: FaseSesion[] = ['activacion', 'desarrollo_1', 'desarrollo_2', 'vuelta_calma']
    const result: FaseSesion[] = []
    for (const fase of FASE_ORDER) {
      const hasTasks = (tareasByFase[fase]?.length || 0) > 0
      const isDefault = defaultFases.includes(fase)
      const isAdded = addedFases.has(fase)
      const isRemoved = removedFases.has(fase)
      if (hasTasks || ((isDefault || isAdded) && !isRemoved)) {
        result.push(fase)
      }
    }
    return result
  }, [tareasByFase, addedFases, removedFases])

  // Draggable desarrollo phases for phase reordering
  const draggableFases = useMemo(
    () => activeFases.filter(f => f.startsWith('desarrollo_')),
    [activeFases]
  )

  const phaseSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const handlePhaseReorder = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !sesion) return

    const oldIndex = draggableFases.indexOf(active.id as FaseSesion)
    const newIndex = draggableFases.indexOf(over.id as FaseSesion)
    if (oldIndex < 0 || newIndex < 0) return

    // The target slot names stay the same (desarrollo_1, desarrollo_2, ...),
    // we reorder which tasks go into which slot.
    const reordered = arrayMove(draggableFases, oldIndex, newIndex)

    // Build mapping: reordered[i] had tasks, they move to draggableFases[i] slot
    const newTareas = allTareas.map(t => {
      const srcIdx = reordered.indexOf(t.fase_sesion as FaseSesion)
      if (srcIdx < 0) return t // not a desarrollo task, keep as-is
      return { ...t, fase_sesion: draggableFases[srcIdx] }
    })

    // Swap fase_notas to match
    const oldNotas = { ...(sesion.fase_notas || {}) }
    const newNotas = { ...oldNotas }
    for (let i = 0; i < draggableFases.length; i++) {
      newNotas[draggableFases[i]] = oldNotas[reordered[i]] || ''
    }

    // Optimistic UI update
    setSesion(prev => prev ? { ...prev, tareas: newTareas, fase_notas: newNotas } : prev)

    // Persist
    saveTareasBatch(newTareas)
    autoSave({ fase_notas: newNotas } as SesionUpdateData)
  }

  const handleAddFase = () => {
    // Find the next desarrollo phase not already active
    const nextFase = ALL_DESARROLLO_FASES.find(f => !activeFases.includes(f))
    if (nextFase) {
      setAddedFases(prev => { const next = new Set(prev); next.add(nextFase); return next })
      setRemovedFases(prev => { const next = new Set(prev); next.delete(nextFase); return next })
    }
  }

  const handleRemoveFase = (fase: FaseSesion) => {
    if ((tareasByFase[fase]?.length || 0) > 0) return // Can't remove phase with tasks
    setRemovedFases(prev => { const next = new Set(prev); next.add(fase); return next })
    setAddedFases(prev => { const next = new Set(prev); next.delete(fase); return next })
  }

  const saveBatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveTareasBatch = async (newTareas: SesionTarea[]) => {
    setSavingTareas(true)
    try {
      const batch = newTareas.map((t, i) => ({
        tarea_id: t.tarea_id,
        orden: i + 1,
        fase_sesion: t.fase_sesion,
        duracion_override: t.duracion_override,
        notas: t.notas,
        responsable: t.responsable,
      }))
      const updated = await sesionesApi.batchUpdateTareas(sesionId, batch)
      setSesion(updated)
    } catch (err) {
      console.error('Error saving tareas:', err)
    } finally {
      setSavingTareas(false)
    }
  }

  const debouncedSaveTareasBatch = useCallback((tareas: SesionTarea[]) => {
    if (saveBatchTimerRef.current) clearTimeout(saveBatchTimerRef.current)
    saveBatchTimerRef.current = setTimeout(() => saveTareasBatch(tareas), 600)
  }, [sesionId])

  const handleAddTarea = async (tarea: Tarea, fase: FaseSesion) => {
    const existingInFase = tareasByFase[fase] || []
    const newSesionTarea: SesionTarea = {
      id: `temp-${Date.now()}`,
      sesion_id: sesionId,
      tarea_id: tarea.id,
      orden: existingInFase.length + 1,
      fase_sesion: fase,
      created_at: new Date().toISOString(),
      tarea,
    }
    const newAll = [...allTareas, newSesionTarea]
    setSesion((prev) => prev ? { ...prev, tareas: newAll } : prev)
    setTaskPickerOpen(false)
    await saveTareasBatch(newAll)
  }

  const handleRemoveTarea = async (tareaToRemove: SesionTarea) => {
    const newAll = allTareas.filter((t) => t.id !== tareaToRemove.id)
    setSesion((prev) => prev ? { ...prev, tareas: newAll } : prev)
    await saveTareasBatch(newAll)
  }

  const handleMoveTarea = async (tareaToMove: SesionTarea, direction: 'up' | 'down') => {
    const fase = tareaToMove.fase_sesion
    const faseTareas = [...(tareasByFase[fase] || [])]
    const idx = faseTareas.findIndex((t) => t.id === tareaToMove.id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= faseTareas.length) return

    ;[faseTareas[idx], faseTareas[swapIdx]] = [faseTareas[swapIdx], faseTareas[idx]]

    // Rebuild full list maintaining phase order
    const newAll: SesionTarea[] = []
    for (const f of activeFases) {
      if (f === fase) {
        newAll.push(...faseTareas)
      } else {
        newAll.push(...(tareasByFase[f] || []))
      }
    }
    setSesion((prev) => prev ? { ...prev, tareas: newAll } : prev)
    await saveTareasBatch(newAll)
  }

  const handleUpdateTareaDuration = (tareaId: string, duration: number) => {
    const newAll = allTareas.map((t) =>
      t.id === tareaId ? { ...t, duracion_override: duration } : t
    )
    setSesion((prev) => prev ? { ...prev, tareas: newAll } : prev)
  }

  const handleCommitTareaDuration = (tareaId: string) => {
    // Save current state on blur/Enter — avoids race conditions with debounce
    saveTareasBatch(allTareas)
  }

  const handleUpdateTareaNotas = (tareaId: string, notas: string) => {
    const newAll = allTareas.map((t) =>
      t.id === tareaId ? { ...t, notas } : t
    )
    setSesion((prev) => prev ? { ...prev, tareas: newAll } : prev)
  }

  const handleUpdateTareaResponsable = (tareaId: string, responsable: string) => {
    const newAll = allTareas.map((t) =>
      t.id === tareaId ? { ...t, responsable } : t
    )
    setSesion((prev) => prev ? { ...prev, tareas: newAll } : prev)
  }

  const staffOptions = useMemo(() => {
    const names = new Set<string>()
    sesion?.staff_asistentes?.forEach(s => s.nombre && names.add(s.nombre))
    allTareas.forEach(t => t.responsable && names.add(t.responsable))
    return Array.from(names).sort()
  }, [sesion?.staff_asistentes, allTareas])

  // ============ Per-task formation ============
  const toggleFormacionPanel = (stId: string) => {
    setExpandedFormaciones((prev) => {
      const next = new Set(prev)
      if (next.has(stId)) {
        next.delete(stId)
      } else {
        next.add(stId)
        // Ensure jugadores + invitados are loaded for the formation panel
        loadJugadores()
        loadAsistencias()
      }
      return next
    })
  }

  const handleFormacionChange = (stId: string, formacion: FormacionEquipos | null) => {
    setSesion((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        tareas: prev.tareas?.map((t) =>
          t.id === stId ? { ...t, formacion_equipos: formacion } : t
        ),
      }
    })
  }

  const handleCopyFormacion = (st: SesionTarea) => {
    if (!st.formacion_equipos) return
    setCopiedFormacion({
      formacion: structuredClone(st.formacion_equipos),
      taskName: st.tarea?.titulo || 'tarea',
    })
    toast.success('Equipos copiados')
  }

  const handlePasteFormacion = async (stId: string) => {
    if (!copiedFormacion) return
    try {
      const pasted = { ...copiedFormacion.formacion, auto_generado: false }
      await sesionesApi.guardarFormacion(sesionId, stId, pasted)
      handleFormacionChange(stId, pasted)
      toast.success('Equipos pegados')
    } catch (err) {
      toast.error('Error al pegar equipos')
    }
  }

  // ============ Task editing ============
  const openEditTarea = (st: SesionTarea) => {
    // Helper: convert array fields to newline-separated strings for textarea display
    const toStr = (val: any) => Array.isArray(val) ? val.join('\n') : (val || '')
    setEditingTarea(st)
    setEditForm({
      titulo: st.tarea?.titulo || '',
      descripcion: st.tarea?.descripcion || '',
      duracion_total: st.tarea?.duracion_total || 0,
      reglas_tecnicas: toStr(st.tarea?.reglas_tecnicas),
      reglas_tacticas: toStr(st.tarea?.reglas_tacticas),
      consignas_ofensivas: toStr(st.tarea?.consignas_ofensivas),
      consignas_defensivas: toStr(st.tarea?.consignas_defensivas),
      variantes: toStr(st.tarea?.variantes),
      espacio_largo: st.tarea?.espacio_largo || 0,
      espacio_ancho: st.tarea?.espacio_ancho || 0,
      errores_comunes: toStr(st.tarea?.errores_comunes),
      progresiones: toStr(st.tarea?.progresiones),
      estructura_equipos: st.tarea?.estructura_equipos || '',
      num_jugadores_min: st.tarea?.num_jugadores_min || 0,
      num_jugadores_max: st.tarea?.num_jugadores_max || 0,
      material: st.tarea?.material || [],
      num_series: st.tarea?.num_series || 1,
      posicion_entrenador: st.tarea?.posicion_entrenador || '',
      densidad: st.tarea?.densidad || '',
      nivel_cognitivo: st.tarea?.nivel_cognitivo || 2,
      fase_juego: st.tarea?.fase_juego || '',
      principio_tactico: st.tarea?.principio_tactico || '',
      grafico_data: st.tarea?.grafico_data || null,
    })
    setAiInstruction('')
    setAiPreview(null)
  }

  const handleSaveEdit = async () => {
    if (!editingTarea) return
    // Resolve real sesion_tarea ID (may have changed from temp- after batch save)
    const realSt = sesion?.tareas?.find(t =>
      t.tarea_id === editingTarea.tarea_id && t.fase_sesion === editingTarea.fase_sesion
    ) || editingTarea
    if (realSt.id.startsWith('temp-')) {
      toast.error('La tarea aun se esta guardando, espera un momento')
      return
    }
    setSavingEdit(true)
    try {
      const result = await sesionesApi.duplicarYEditarTarea(sesionId, realSt.id, editForm)
      // Update the local session state
      setSesion((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          tareas: prev.tareas?.map((t) =>
            t.id === realSt.id
              ? { ...t, tarea_id: result.tarea_id, tarea: result.tareas || result.tarea }
              : t
          ),
        }
      })
      setEditingTarea(null)
      toast.success('Tarea editada')
    } catch (err: any) {
      console.error('Error saving edit:', err)
      toast.error(err?.message || 'Error al guardar cambios')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleAiEdit = async () => {
    if (!editingTarea || !aiInstruction.trim()) return
    const realSt = sesion?.tareas?.find(t =>
      t.tarea_id === editingTarea.tarea_id && t.fase_sesion === editingTarea.fase_sesion
    ) || editingTarea
    if (realSt.id.startsWith('temp-')) {
      toast.error('La tarea aun se esta guardando, espera un momento')
      return
    }
    setAiProcessing(true)
    setAiPreview(null)
    try {
      const result = await sesionesApi.aiEditTarea(sesionId, realSt.id, aiInstruction)
      setSesion((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          tareas: prev.tareas?.map((t) =>
            t.id === realSt.id
              ? { ...t, tarea_id: result.tarea_id, tarea: result.tareas || result.tarea }
              : t
          ),
        }
      })
      setEditingTarea(null)
      setAiInstruction('')
      toast.success('Tarea editada con IA')
    } catch (err: any) {
      console.error('Error with AI edit:', err)
      toast.error(err?.message || 'Error al editar con IA')
    } finally {
      setAiProcessing(false)
    }
  }

  // ============ Task picker search ============
  const searchTasks = async () => {
    setSearchingTasks(true)
    try {
      const res = await tareasApi.list({
        busqueda: taskSearchQuery || undefined,
        categoria: taskSearchCategory || undefined,
        limit: 20,
        biblioteca: true,
      })
      setTaskSearchResults(res.data)
    } catch (err) {
      console.error('Error searching tasks:', err)
    } finally {
      setSearchingTasks(false)
    }
  }

  useEffect(() => {
    if (taskPickerOpen && pickerTab === 'biblioteca') searchTasks()
  }, [taskPickerOpen, taskSearchQuery, taskSearchCategory, pickerTab])

  // ============ Task creation from scratch ============
  const handleCreateTask = async () => {
    if (!newTaskForm.titulo.trim()) return
    setCreatingTask(true)
    try {
      const updated = await sesionesApi.createTareaInSesion(sesionId, {
        titulo: newTaskForm.titulo,
        descripcion: newTaskForm.descripcion || undefined,
        duracion_total: newTaskForm.duracion_total,
        fase_sesion: taskPickerFase,
      })
      setSesion(updated)
      setTaskPickerOpen(false)
      setNewTaskForm({ titulo: '', descripcion: '', duracion_total: 10 })
    } catch (err: any) {
      console.error('Error creating task:', err)
      toast.error(err?.message || 'Error al crear tarea')
    } finally {
      setCreatingTask(false)
    }
  }

  const handleAiCreateTask = async () => {
    if (!aiCreatePrompt.trim()) return
    setAiCreating(true)
    try {
      const updated = await sesionesApi.aiCreateTareaInSesion(sesionId, {
        prompt: aiCreatePrompt,
        fase_sesion: taskPickerFase,
      })
      setSesion(updated)
      setTaskPickerOpen(false)
      setAiCreatePrompt('')
    } catch (err: any) {
      console.error('Error AI creating task:', err)
      toast.error(err?.message || 'Error al generar tarea con IA')
    } finally {
      setAiCreating(false)
    }
  }

  // ============ Asistencia ============
  const loadCargaData = async () => {
    if (!sesion?.equipo_id || cargaMap.size > 0) return
    try {
      const res = await cargaApi.getEquipo(sesion.equipo_id)
      const map = new Map<string, CargaJugador>()
      for (const p of res.data) map.set(p.jugador_id, p)
      setCargaMap(map)
    } catch {}
  }

  const handleTabChange = (tab: string) => {
    if (tab === 'asistencia') {
      loadJugadores()
      loadAsistencias()
      loadCargaData()
      loadMargen()
    }
  }

  const toggleAsistencia = (jugadorId: string) => {
    const jugador = jugadores.find((j) => j.id === jugadorId)
    const estadoToMotivo: Record<string, MotivoAusencia> = {
      lesionado: 'lesion', enfermo: 'enfermedad', sancionado: 'sancion',
      permiso: 'permiso', seleccion: 'seleccion', viaje: 'viaje',
    }
    setAsistencias((prev) => {
      const next = new Map(prev)
      const current = next.get(jugadorId)
      if (current) {
        const willBePresent = !current.presente
        const autoMotivo = !willBePresent && jugador ? estadoToMotivo[jugador.estado as string] : undefined
        next.set(jugadorId, {
          ...current,
          presente: willBePresent,
          motivo: willBePresent ? undefined : (autoMotivo || current.motivo),
          tipo_participacion: willBePresent ? ['sesion'] : [],
        })
      } else {
        const autoMotivo = jugador ? estadoToMotivo[jugador.estado as string] : undefined
        next.set(jugadorId, { presente: false, motivo: autoMotivo, tipo_participacion: [] })
      }
      return next
    })
  }

  const toggleTipoParticipacion = (jugadorId: string, tipo: TipoParticipacion) => {
    setAsistencias((prev) => {
      const next = new Map(prev)
      const current = next.get(jugadorId)
      if (!current) return next
      const tipos = current.tipo_participacion || []
      const has = tipos.includes(tipo)
      let updated: TipoParticipacion[]
      if (has) {
        updated = tipos.filter((t) => t !== tipo)
      } else if (tipo === 'presente') {
        // "Presente" is exclusive — remove sesion/fisio/margen
        updated = ['presente']
      } else {
        // Selecting sesion/fisio/margen removes "presente"
        updated = [...tipos.filter((t) => t !== 'presente'), tipo]
      }
      next.set(jugadorId, { ...current, tipo_participacion: updated })
      return next
    })
  }

  const setMotivoAusencia = (jugadorId: string, motivo: MotivoAusencia) => {
    setAsistencias((prev) => {
      const next = new Map(prev)
      const current = next.get(jugadorId) || { presente: false, tipo_participacion: [] as TipoParticipacion[] }
      next.set(jugadorId, { ...current, motivo })
      return next
    })
  }

  const saveAsistencias = async () => {
    setSavingAsistencias(true)
    try {
      const list = jugadores.map((j) => {
        const a = asistencias.get(j.id)
        const presente = a?.presente ?? true
        return {
          jugador_id: j.id,
          presente,
          motivo_ausencia: !presente ? a?.motivo : undefined,
          notas: a?.notas,
          tipo_participacion: presente ? (a?.tipo_participacion?.length ? a.tipo_participacion : ['sesion']) : [],
        }
      })
      await sesionesApi.saveAsistenciasBatch(sesionId, list)
    } catch (err) {
      console.error('Error saving asistencias:', err)
    } finally {
      setSavingAsistencias(false)
    }
  }

  // ============ Invitados ============
  const loadOrgJugadores = async () => {
    if (orgJugadores.length > 0) return
    setOrgJugadoresLoading(true)
    try {
      const response = await jugadoresApi.list({ organizacion_completa: true })
      setOrgJugadores(response.data as unknown as Jugador[])
    } catch (err: any) {
      console.error('Error loading org jugadores:', err)
      toast.error(err?.message || 'Error al cargar jugadores de la organización')
    } finally {
      setOrgJugadoresLoading(false)
    }
  }

  const handleAddCrossTeamPlayer = async (jugadorId: string) => {
    setAddingInvitado(true)
    try {
      // Check if already in local list — just make visible
      const existing = jugadores.find((j) => j.id === jugadorId)
      if (existing) {
        // Already in local state, just ensure asistencia exists
        setAsistencias((prev) => {
          const next = new Map(prev)
          if (!next.has(jugadorId)) {
            next.set(jugadorId, { presente: true, tipo_participacion: ['sesion'] })
          }
          return next
        })
        setCrossTeamDialogOpen(false)
        return
      }

      try {
        await sesionesApi.addCrossTeamPlayer(sesionId, jugadorId)
      } catch (err: any) {
        // If "already in session" error, just add to local state
        if (err?.message?.includes('ya esta en la sesion')) {
          // Player has a DB record but wasn't in local state — add them
        } else {
          throw err
        }
      }

      // Add to local jugadores list
      const orgJug = orgJugadores.find((j) => j.id === jugadorId)
      if (orgJug) {
        setJugadores((prev) => [...prev, orgJug as unknown as Jugador])
        setAsistencias((prev) => {
          const next = new Map(prev)
          next.set(jugadorId, { presente: true, tipo_participacion: ['sesion'] })
          return next
        })
      }
      setCrossTeamDialogOpen(false)
    } catch (err: any) {
      console.error('Error adding cross-team player:', err)
      toast.error(err?.message || 'Error al anadir jugador')
    } finally {
      setAddingInvitado(false)
    }
  }

  const handleQuickAddGuest = async () => {
    if (!quickAddForm.nombre.trim()) return
    setAddingInvitado(true)
    try {
      const result = await sesionesApi.quickAddGuest(sesionId, {
        nombre: quickAddForm.nombre.trim(),
        apellidos: quickAddForm.apellidos.trim(),
        posicion_principal: quickAddForm.posicion_principal,
      })
      // Add to local lists
      setJugadores((prev) => [...prev, result.jugador])
      setAsistencias((prev) => {
        const next = new Map(prev)
        next.set(result.jugador.id, { presente: true, tipo_participacion: ['sesion'] })
        return next
      })
      setQuickAddDialogOpen(false)
      setQuickAddForm({ nombre: '', apellidos: '', posicion_principal: 'MC' })
    } catch (err: any) {
      console.error('Error quick-adding guest:', err)
      toast.error(err?.message || 'Error al crear jugador')
    } finally {
      setAddingInvitado(false)
    }
  }

  const handleRemoveFromSession = (jugadorId: string) => {
    setJugadores((prev) => prev.filter((j) => j.id !== jugadorId))
    setAsistencias((prev) => {
      const next = new Map(prev)
      next.delete(jugadorId)
      return next
    })
  }

  const presentesCount = jugadores.filter((j) => {
    const a = asistencias.get(j.id)
    return a?.presente ?? true
  }).length

  const enSesionCount = jugadores.filter((j) => {
    const a = asistencias.get(j.id)
    if (!(a?.presente ?? true)) return false
    const tipos = a?.tipo_participacion || ['sesion']
    return tipos.includes('sesion')
  }).length

  // ============ Derived ============
  const completedFases = activeFases.filter((f) => tareasByFase[f]?.length > 0)
  const totalDuration = allTareas.reduce((sum, st) => sum + (st.duracion_override || st.tarea?.duracion_total || 0), 0)

  // ============ Render ============
  if (loading) {
    return <DetailPageSkeleton />
  }

  if (error || !sesion) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p className="text-destructive mb-4">{error || 'Sesion no encontrada'}</p>
          <Button variant="outline" asChild>
            <Link href="/sesiones"><ArrowLeft className="h-4 w-4 mr-2" />Volver a sesiones</Link>
          </Button>
        </div>
      </div>
    )
  }

  const estadoConfig = ESTADO_CONFIG[sesion.estado] || ESTADO_CONFIG.borrador

  // Group jugadores by position for asistencia
  const jugadoresByPosition = jugadores.reduce((acc, j) => {
    const pos = j.posicion_principal || 'Otro'
    if (!acc[pos]) acc[pos] = []
    acc[pos].push(j)
    return acc
  }, {} as Record<string, Jugador[]>)

  const sortedPositions = Object.keys(jugadoresByPosition).sort(
    (a, b) => (POSITION_ORDER[a] ?? 99) - (POSITION_ORDER[b] ?? 99)
  )

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <Link href="/sesiones" className="hover:text-foreground transition-colors">Sesiones</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{sesion.titulo}</span>
      </nav>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            {/* Editable title */}
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <input
                className="text-2xl font-bold bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none transition-colors py-0.5 min-w-[200px]"
                value={sesion.titulo}
                onChange={(e) => updateField('titulo', e.target.value)}
              />
              {/* Match Day selector */}
              <select
                className={`text-xs font-bold px-2.5 py-1 rounded border-0 cursor-pointer ${MATCH_DAY_COLORS[sesion.match_day] || 'bg-muted'}`}
                value={sesion.match_day}
                onChange={(e) => updateField('match_day', e.target.value)}
              >
                {MATCH_DAYS.map((md) => (
                  <option key={md} value={md}>{md}</option>
                ))}
              </select>
              {/* Estado dropdown */}
              <select
                className={`text-xs font-medium px-2 py-1 rounded border cursor-pointer ${estadoConfig.color}`}
                value={sesion.estado}
                onChange={(e) => handleUpdateEstado(e.target.value as EstadoSesion)}
              >
                <option value="borrador">Borrador</option>
                <option value="planificada">Planificada</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
              {autoSaving && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Guardando...
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <input
                  type="date"
                  className="bg-transparent border-none outline-none cursor-pointer"
                  value={sesion.fecha}
                  onChange={(e) => updateField('fecha', e.target.value)}
                />
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <input
                  type="time"
                  className="bg-transparent border-none outline-none cursor-pointer w-24"
                  value={sesion.hora || ''}
                  onChange={(e) => updateField('hora', e.target.value || null)}
                  placeholder="--:--"
                />
              </span>
              <span className="flex items-center gap-1 text-xs">
                {totalDuration || sesion.duracion_total || 0} min
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {allTareas.length} tareas
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviewPdf} disabled={previewingPdf} title="Vista previa PDF">
            {previewingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={handleGeneratePdf} disabled={generatingPdf} title="Descargar PDF">
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={handleDelete} disabled={deleting} className="text-destructive hover:bg-destructive/10" title="Eliminar">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Completeness bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 flex gap-1">
          {activeFases.map((fase) => (
            <div
              key={fase}
              className={`h-2 flex-1 rounded-full transition-colors ${tareasByFase[fase]?.length ? 'bg-primary' : 'bg-muted'}`}
              title={`${FASE_LABELS[fase]}: ${tareasByFase[fase]?.length ? 'Completa' : 'Vacia'}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {completedFases.length}/{activeFases.length} fases
        </span>
      </div>

      {/* Tabs - only 2: Diseno and Asistencia */}
      <Tabs defaultValue="diseno" onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="diseno">Diseno</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
        </TabsList>

        {/* ==================== TAB: DISENO ==================== */}
        <TabsContent value="diseno">
          {/* Metadata */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Objetivo principal</label>
                  <Textarea
                    value={sesion.objetivo_principal || ''}
                    onChange={(e) => updateField('objetivo_principal', e.target.value)}
                    placeholder="Ej: Mejorar salida de balon bajo presion"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Intensidad</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={sesion.intensidad_objetivo || ''}
                    onChange={(e) => updateField('intensidad_objetivo', e.target.value || null)}
                  >
                    <option value="">Sin definir</option>
                    {INTENSIDADES.map((i) => (
                      <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1).replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Rival</label>
                  <Input
                    value={sesion.rival || ''}
                    onChange={(e) => updateField('rival', e.target.value || null)}
                    placeholder="Nombre del rival"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Competicion</label>
                  <Input
                    value={sesion.competicion || ''}
                    onChange={(e) => updateField('competicion', e.target.value || null)}
                    placeholder="Liga, Copa..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Lugar</label>
                  <Input
                    value={sesion.lugar || ''}
                    onChange={(e) => updateField('lugar', e.target.value || null)}
                    placeholder="Campo, instalacion..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Notas pre-sesion</label>
                  <Textarea
                    value={sesion.notas_pre || ''}
                    onChange={(e) => updateField('notas_pre', e.target.value || null)}
                    placeholder="Notas para antes de la sesion"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Notas post-sesion</label>
                  <Textarea
                    value={sesion.notas_post || ''}
                    onChange={(e) => updateField('notas_post', e.target.value || null)}
                    placeholder="Notas despues de la sesion"
                    rows={2}
                  />
                </div>
              </div>

              {/* Materiales */}
              <div className="mt-4">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Materiales</label>
                <div className="flex flex-wrap gap-2">
                  {(sesion.materiales || []).map((mat, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {mat}
                      <button
                        onClick={() => {
                          const newMats = (sesion.materiales || []).filter((_, i) => i !== idx)
                          updateField('materiales', newMats)
                        }}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {MATERIALES_SUGERIDOS.filter((m) => !(sesion.materiales || []).includes(m)).map((mat) => (
                    <button
                      key={mat}
                      onClick={() => updateField('materiales', [...(sesion.materiales || []), mat])}
                      className="px-2 py-1 text-xs border border-dashed rounded-full text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                    >
                      + {mat}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fases de sesion */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">Tareas de la Sesion</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleAddFase}
                  disabled={!ALL_DESARROLLO_FASES.some(f => !activeFases.includes(f))}
                >
                  <Plus className="h-3 w-3 mr-1" /> Fase
                </Button>
              </div>
              {savingTareas && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Guardando tareas...
                </span>
              )}
            </div>

            {(() => {
              const renderPhaseCard = (fase: FaseSesion, dragHandle: React.ReactNode | null) => {
                const tareas = tareasByFase[fase] || []
                const hasTareas = tareas.length > 0
                const faseDuration = tareas.reduce((s, t) => s + (t.duracion_override || t.tarea?.duracion_total || 0), 0)
                const isRemovable = !hasTareas && fase !== 'activacion' && fase !== 'desarrollo_1'
                const faseNota = sesion.fase_notas?.[fase]

                return (
                  <Card key={fase} className={`card-hover ${!hasTareas ? 'border-dashed' : ''}`}>
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                      <div className="flex items-center gap-2">
                        {dragHandle}
                        <CircleDot className={`h-4 w-4 ${hasTareas ? 'text-primary' : 'text-muted-foreground'}`} />
                        <h3 className="font-medium">{FASE_LABELS[fase]}</h3>
                        {hasTareas && (
                          <span className="text-xs text-muted-foreground">{faseDuration} min</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTaskPickerFase(fase)
                            setPickerTab('biblioteca')
                            setTaskPickerOpen(true)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Anadir tarea
                        </Button>
                        {isRemovable && (
                          <button
                            onClick={() => handleRemoveFase(fase)}
                            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Quitar fase"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {hasTareas ? (
                      <div className="divide-y">
                        {tareas.map((st, idx) => {
                          const isExpanded = expandedFormaciones.has(st.id)
                          const hasFormacion = !!st.formacion_equipos
                          const hasEstructura = !!st.tarea?.estructura_equipos

                          return (
                            <div key={st.id}>
                              <div className="p-4 hover:bg-muted/30 transition-colors group">
                                <div className="flex items-start gap-3">
                                  <div className="flex flex-col items-center gap-1 pt-1">
                                    <button
                                      onClick={() => handleMoveTarea(st, 'up')}
                                      disabled={idx === 0}
                                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    >
                                      <ChevronUp className="h-3 w-3" />
                                    </button>
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                                      {idx + 1}
                                    </div>
                                    <button
                                      onClick={() => handleMoveTarea(st, 'down')}
                                      disabled={idx === tareas.length - 1}
                                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    >
                                      <ChevronDown className="h-3 w-3" />
                                    </button>
                                  </div>
                                  {/* Mini tactical board */}
                                  {st.tarea?.grafico_data && (
                                    <div className="w-56 h-36 shrink-0 rounded-lg overflow-hidden border border-border/30">
                                      <TacticalBoardMini
                                        data={st.tarea.grafico_data as any}
                                        width="100%"
                                        height="100%"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium">{st.tarea?.titulo || 'Tarea sin titulo'}</h4>
                                      {st.tarea?.categoria && (
                                        <Badge variant="outline" className="text-[10px]">
                                          {st.tarea.categoria.nombre}
                                        </Badge>
                                      )}
                                      {hasEstructura && (
                                        <Badge variant="outline" className="text-[10px]">
                                          {st.tarea?.estructura_equipos}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <input
                                          type="number"
                                          min={1}
                                          max={120}
                                          className="w-16 text-sm bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          value={st.duracion_override || st.tarea?.duracion_total || 0}
                                          onChange={(e) => handleUpdateTareaDuration(st.id, parseInt(e.target.value) || 0)}
                                          onBlur={() => handleCommitTareaDuration(st.id)}
                                          onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
                                        />
                                        <span className="text-xs text-muted-foreground">min</span>
                                      </div>
                                      {st.tarea?.num_jugadores_min && (
                                        <span className="text-xs text-muted-foreground">
                                          {st.tarea.num_jugadores_min}{st.tarea.num_jugadores_max ? `-${st.tarea.num_jugadores_max}` : ''} jug.
                                        </span>
                                      )}
                                      <div className="flex items-center gap-1">
                                        <UserCircle className="h-3 w-3 text-muted-foreground" />
                                        <input
                                          list={`staff-${st.id}`}
                                          className="w-24 text-xs bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none"
                                          placeholder="CT..."
                                          value={st.responsable || ''}
                                          onChange={(e) => handleUpdateTareaResponsable(st.id, e.target.value)}
                                          onBlur={() => debouncedSaveTareasBatch(allTareas)}
                                        />
                                        <datalist id={`staff-${st.id}`}>
                                          {staffOptions.map(name => <option key={name} value={name} />)}
                                        </datalist>
                                      </div>
                                    </div>
                                    <input
                                      className="mt-1 text-sm text-muted-foreground bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none w-full italic"
                                      placeholder="Notas de la tarea..."
                                      value={st.notas || ''}
                                      onChange={(e) => handleUpdateTareaNotas(st.id, e.target.value)}
                                      onBlur={() => debouncedSaveTareasBatch(allTareas)}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {/* Edit task button */}
                                    <button
                                      onClick={() => openEditTarea(st)}
                                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                      title="Editar tarea"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    {/* Equipos toggle button */}
                                    <button
                                      onClick={() => toggleFormacionPanel(st.id)}
                                      className={`p-1.5 rounded-md transition-colors ${
                                        isExpanded
                                          ? 'bg-primary/10 text-primary'
                                          : hasFormacion
                                            ? 'text-primary hover:bg-primary/10'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                      }`}
                                      title="Equipos"
                                    >
                                      <Users className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveTarea(st)}
                                      className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Eliminar tarea"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Inline Formation Panel */}
                              {isExpanded && (
                                <div className="px-4 pb-4 pt-0 ml-10 mr-4">
                                  <div className="border rounded-lg p-3 bg-muted/20">
                                    <FormacionPanel
                                      sesionId={sesionId}
                                      sesionTarea={st}
                                      jugadoresMap={jugadoresMap}
                                      onFormacionChange={handleFormacionChange}
                                      onCopy={() => handleCopyFormacion(st)}
                                      onPaste={() => handlePasteFormacion(st.id)}
                                      hasCopied={!!copiedFormacion}
                                      copiedFrom={copiedFormacion?.taskName}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        {faseNota ? (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground italic">{faseNota}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Sin tareas asignadas</p>
                        )}
                        <input
                          className="mt-2 text-sm text-center bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none w-full"
                          placeholder="Nota para esta fase (ej: Reservado para PF)..."
                          value={sesion.fase_notas?.[fase] || ''}
                          onChange={(e) => {
                            const newNotas = { ...(sesion.fase_notas || {}), [fase]: e.target.value }
                            updateField('fase_notas', newNotas)
                          }}
                        />
                      </div>
                    )}
                  </Card>
                )
              }

              return (
                <>
                  {/* activacion — fixed, not draggable */}
                  {activeFases.includes('activacion') && renderPhaseCard('activacion', null)}

                  {/* desarrollo phases — draggable */}
                  <DndContext sensors={phaseSensors} collisionDetection={closestCenter} onDragEnd={handlePhaseReorder}>
                    <SortableContext items={draggableFases} strategy={verticalListSortingStrategy}>
                      {draggableFases.map(fase => (
                        <SortablePhaseCard key={fase} fase={fase} isDraggable={draggableFases.length > 1}>
                          {(dragHandle) => renderPhaseCard(fase, dragHandle)}
                        </SortablePhaseCard>
                      ))}
                    </SortableContext>
                  </DndContext>

                  {/* vuelta_calma — fixed, not draggable */}
                  {activeFases.includes('vuelta_calma') && renderPhaseCard('vuelta_calma', null)}
                </>
              )
            })()}
          </div>

          {/* ABP Section - Set Pieces linked to this session */}
          {sesion?.equipo_id && (
            <div className="mt-6 p-4 bg-orange-50/50 border border-orange-100 rounded-xl">
              <ABPSessionLink sesionId={sesionId} equipoId={sesion.equipo_id} />
            </div>
          )}

          {/* GK Training Section */}
          {sesion?.equipo_id && (
            <div className="mt-6 p-4 bg-green-50/50 border border-green-100 rounded-xl">
              <GKTrainingSection
                sesionId={sesionId}
                equipoId={sesion.equipo_id}
                matchDay={sesion.match_day}
                intensidadObjetivo={sesion.intensidad_objetivo}
                isEditable={true}
              />
            </div>
          )}
        </TabsContent>

        {/* ==================== TAB: ASISTENCIA ==================== */}
        <TabsContent value="asistencia">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Control de Asistencia
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 border border-blue-200">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-semibold text-blue-700">{enSesionCount}</span>
                      <span className="text-blue-600 text-xs">en sesión</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{presentesCount}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="font-medium">{jugadores.length}</span>
                      <span className="text-muted-foreground">presentes</span>
                    </div>
                  </div>
                  <Button onClick={saveAsistencias} disabled={savingAsistencias} size="sm">
                    {savingAsistencias ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                    Guardar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {jugadores.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Cargando jugadores...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sortedPositions.map((pos) => (
                    <div key={pos}>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{pos}</h4>
                      <div className="space-y-1">
                        {jugadoresByPosition[pos].map((jugador) => {
                          const asistencia = asistencias.get(jugador.id)
                          const presente = asistencia?.presente ?? true
                          const tipos = asistencia?.tipo_participacion || (presente ? ['sesion'] : [])

                          const isMargen = presente && (tipos.includes('margen') || tipos.includes('fisio'))
                          const hasMargenWorkout = margenMap.has(jugador.id)
                          const margenWorkout = margenMap.get(jugador.id)
                          const isMargenExpanded = margenExpanded.has(jugador.id)
                          const isEditingMargen = margenEditing === jugador.id

                          return (
                            <div key={jugador.id}>
                            <div
                              className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                                presente ? 'bg-green-50/50' : 'bg-red-50/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                  {jugador.dorsal || '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium flex items-center gap-1.5">
                                    {jugador.nombre} {jugador.apellidos}
                                    {jugador.es_invitado && (
                                      <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
                                        Invitado
                                      </Badge>
                                    )}
                                    <PlayerStatusBadges estado={jugador.estado} />
                                  </p>
                                  {/* Carga / wellness / tarjetas badges */}
                                  {(() => {
                                    const c = cargaMap.get(jugador.id)
                                    if (!c) return null
                                    const nivelColors: Record<string, string> = {
                                      critico: 'bg-red-500', alto: 'bg-orange-500', optimo: 'bg-green-500', bajo: 'bg-blue-400',
                                    }
                                    const wellnessColor = (c.wellness_valor ?? 99) >= 20 ? 'text-green-600' : (c.wellness_valor ?? 99) >= 15 ? 'text-amber-600' : 'text-red-600'
                                    return (
                                      <div className="flex items-center gap-2 mt-0.5">
                                        {/* Carga nivel */}
                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <span className={`w-1.5 h-1.5 rounded-full ${nivelColors[c.nivel_carga] || 'bg-gray-400'}`} />
                                          {c.carga_aguda.toFixed(0)} UA
                                        </span>
                                        {/* Wellness */}
                                        {c.wellness_valor != null && (
                                          <span className={`text-[10px] font-medium ${wellnessColor}`}>
                                            W:{c.wellness_valor}
                                          </span>
                                        )}
                                        {/* Tarjetas */}
                                        {c.tarjetas_amarillas > 0 && c.tarjetas_amarillas < 4 && (
                                          <span className="text-[10px] font-medium text-yellow-600">
                                            {c.tarjetas_amarillas}TA
                                          </span>
                                        )}
                                        {c.tarjetas_amarillas >= 4 && (
                                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-600 bg-orange-50 px-1 rounded">
                                            <AlertTriangle className="h-2.5 w-2.5" />
                                            {c.tarjetas_amarillas}TA
                                          </span>
                                        )}
                                        {c.tarjetas_rojas > 0 && (
                                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 rounded">
                                            {c.tarjetas_rojas}TR
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {presente && (
                                  <div className="flex items-center gap-1">
                                    {([
                                      { key: 'sesion' as TipoParticipacion, label: 'Sesion', activeClass: 'bg-blue-100 text-blue-700 border-blue-300' },
                                      { key: 'fisio' as TipoParticipacion, label: 'Fisio', activeClass: 'bg-purple-100 text-purple-700 border-purple-300' },
                                      { key: 'margen' as TipoParticipacion, label: 'Margen', activeClass: 'bg-amber-100 text-amber-700 border-amber-300' },
                                      { key: 'presente' as TipoParticipacion, label: 'Presente', activeClass: 'bg-gray-200 text-gray-700 border-gray-400' },
                                    ] as const).map((chip) => (
                                      <button
                                        key={chip.key}
                                        onClick={() => toggleTipoParticipacion(jugador.id, chip.key)}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                                          tipos.includes(chip.key)
                                            ? chip.activeClass
                                            : 'bg-muted/50 text-muted-foreground border-transparent hover:border-muted-foreground/30'
                                        }`}
                                      >
                                        {chip.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {!presente && (
                                  <select
                                    className="text-xs border rounded px-2 py-1 bg-background"
                                    value={asistencia?.motivo || ''}
                                    onChange={(e) => setMotivoAusencia(jugador.id, e.target.value as MotivoAusencia)}
                                  >
                                    <option value="">Motivo...</option>
                                    {MOTIVOS_AUSENCIA.map((m) => (
                                      <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                  </select>
                                )}
                                <Switch
                                  checked={presente}
                                  onCheckedChange={() => toggleAsistencia(jugador.id)}
                                />
                                {(jugador.es_invitado || (sesion?.equipo_id && jugador.equipo_id && jugador.equipo_id !== sesion.equipo_id)) && (
                                  <button
                                    onClick={() => handleRemoveFromSession(jugador.id)}
                                    className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                                    title="Quitar de la sesión"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* ── Margen section ── */}
                            {isMargen && (
                              <div className="ml-3 mr-3 mb-1">
                                {!isEditingMargen && !hasMargenWorkout && (
                                  <button
                                    onClick={() => startMargenEdit(jugador.id)}
                                    className="w-full py-1.5 px-3 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Asignar trabajo al margen
                                  </button>
                                )}
                                {!isEditingMargen && hasMargenWorkout && margenWorkout && (
                                  <div
                                    className="py-1.5 px-3 bg-amber-50 border border-amber-200 rounded-md cursor-pointer hover:bg-amber-100 transition-colors"
                                    onClick={() => setMargenExpanded(prev => {
                                      const next = new Set(prev)
                                      next.has(jugador.id) ? next.delete(jugador.id) : next.add(jugador.id)
                                      return next
                                    })}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-xs text-amber-800">
                                        <span className="font-semibold">{margenWorkout.objetivo || 'Trabajo al margen'}</span>
                                        {margenWorkout.fase_recuperacion && (
                                          <span className="px-1.5 py-0.5 rounded-full bg-amber-200/50 text-[9px] font-medium">
                                            {FASES_RECUPERACION.find(f => f.value === margenWorkout.fase_recuperacion)?.label || margenWorkout.fase_recuperacion}
                                          </span>
                                        )}
                                        <span className="text-amber-600">{margenWorkout.tareas.length} ejercicios</span>
                                        {margenWorkout.responsable && <span className="text-amber-600">· {margenWorkout.responsable}</span>}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); startMargenEdit(jugador.id) }}
                                          className="p-1 rounded hover:bg-amber-200 text-amber-600"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        {isMargenExpanded ? <ChevronUp className="h-3 w-3 text-amber-500" /> : <ChevronDown className="h-3 w-3 text-amber-500" />}
                                      </div>
                                    </div>
                                    {isMargenExpanded && (
                                      <div className="mt-2 pt-2 border-t border-amber-200">
                                        <table className="w-full text-[10px]">
                                          <thead>
                                            <tr className="text-amber-700">
                                              <th className="text-left font-medium pb-1">#</th>
                                              <th className="text-left font-medium pb-1">Ejercicio</th>
                                              <th className="text-left font-medium pb-1">Tipo</th>
                                              <th className="text-left font-medium pb-1">Dur.</th>
                                              <th className="text-left font-medium pb-1">Series</th>
                                              <th className="text-left font-medium pb-1">Reps</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {margenWorkout.tareas.map((t, idx) => (
                                              <tr key={t.id} className="border-t border-amber-100">
                                                <td className="py-0.5">{idx + 1}</td>
                                                <td className="py-0.5 font-medium">{t.titulo_custom || t.tarea?.titulo || ''}</td>
                                                <td className="py-0.5">
                                                  {t.tipo_ejercicio && (
                                                    <span className="px-1 py-0.5 rounded text-white text-[8px]" style={{ background: TIPOS_EJERCICIO_MARGEN.find(te => te.value === t.tipo_ejercicio)?.color || '#6B7280' }}>
                                                      {t.tipo_ejercicio}
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="py-0.5">{t.duracion ? `${t.duracion}'` : ''}</td>
                                                <td className="py-0.5">{t.series || ''}</td>
                                                <td className="py-0.5">{t.repeticiones || ''}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {isEditingMargen && (
                                  <div className="py-3 px-3 bg-amber-50 border border-amber-300 rounded-lg space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-semibold text-amber-800">Trabajo al Margen</span>
                                      <div className="flex items-center gap-1">
                                        {hasMargenWorkout && (
                                          <button
                                            onClick={() => { if (confirm('Eliminar trabajo al margen?')) deleteMargen(jugador.id) }}
                                            className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5"
                                          >
                                            Eliminar
                                          </button>
                                        )}
                                        <button
                                          onClick={() => setMargenEditing(null)}
                                          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-0.5"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={() => saveMargen(jugador.id)}
                                          disabled={margenSaving}
                                          className="text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded disabled:opacity-50"
                                        >
                                          {margenSaving ? 'Guardando...' : 'Guardar'}
                                        </button>
                                      </div>
                                    </div>
                                    {/* Form fields */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] font-medium text-amber-700 block mb-0.5">Objetivo</label>
                                        <input
                                          type="text"
                                          value={margenForm.objetivo || ''}
                                          onChange={e => setMargenForm(p => ({ ...p, objetivo: e.target.value }))}
                                          className="w-full text-xs border border-amber-200 rounded px-2 py-1 bg-white"
                                          placeholder="Ej: Recuperacion isquiotibial"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-medium text-amber-700 block mb-0.5">Responsable</label>
                                        <input
                                          type="text"
                                          value={margenForm.responsable || ''}
                                          onChange={e => setMargenForm(p => ({ ...p, responsable: e.target.value }))}
                                          className="w-full text-xs border border-amber-200 rounded px-2 py-1 bg-white"
                                          placeholder="Ej: Preparador fisico"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-medium text-amber-700 block mb-0.5">Fase recuperacion</label>
                                        <select
                                          value={margenForm.fase_recuperacion || ''}
                                          onChange={e => setMargenForm(p => ({ ...p, fase_recuperacion: (e.target.value || undefined) as FaseRecuperacion | undefined }))}
                                          className="w-full text-xs border border-amber-200 rounded px-2 py-1 bg-white"
                                        >
                                          <option value="">Sin fase</option>
                                          {FASES_RECUPERACION.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-medium text-amber-700 block mb-0.5">Duracion estimada (min)</label>
                                        <input
                                          type="number"
                                          value={margenForm.duracion_estimada || ''}
                                          onChange={e => setMargenForm(p => ({ ...p, duracion_estimada: e.target.value ? parseInt(e.target.value) : undefined }))}
                                          className="w-full text-xs border border-amber-200 rounded px-2 py-1 bg-white"
                                          min={1}
                                        />
                                      </div>
                                    </div>
                                    {jugadorRegistros.length > 0 && (
                                      <div>
                                        <label className="text-[10px] font-medium text-amber-700 block mb-0.5">Vinculado a lesion</label>
                                        <select
                                          value={margenForm.registro_medico_id || ''}
                                          onChange={e => setMargenForm(p => ({ ...p, registro_medico_id: e.target.value || undefined }))}
                                          className="w-full text-xs border border-amber-200 rounded px-2 py-1 bg-white"
                                        >
                                          <option value="">Sin vincular</option>
                                          {jugadorRegistros.map(r => (
                                            <option key={r.id} value={r.id}>{r.titulo} ({r.tipo})</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                    {/* Exercise list */}
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="text-[10px] font-medium text-amber-700">Ejercicios</label>
                                        <button
                                          onClick={addMargenTarea}
                                          className="text-[10px] text-amber-600 hover:text-amber-800 font-medium flex items-center gap-0.5"
                                        >
                                          <Plus className="h-3 w-3" /> Anadir
                                        </button>
                                      </div>
                                      {margenForm.tareas.length === 0 && (
                                        <p className="text-[10px] text-amber-500 italic">Sin ejercicios. Pulsa "Añadir" para agregar.</p>
                                      )}
                                      {margenForm.tareas.length > 0 && (
                                        <div className="grid grid-cols-6 gap-1 mb-1">
                                          <span className="col-span-2 text-[9px] font-semibold text-amber-600 uppercase">Ejercicio</span>
                                          <span className="text-[9px] font-semibold text-amber-600 uppercase">Tipo</span>
                                          <span className="text-[9px] font-semibold text-amber-600 uppercase">Min</span>
                                          <span className="text-[9px] font-semibold text-amber-600 uppercase">Series</span>
                                          <span className="text-[9px] font-semibold text-amber-600 uppercase">Reps</span>
                                        </div>
                                      )}
                                      <div className="space-y-2">
                                        {margenForm.tareas.map((t, idx) => (
                                          <div key={idx} className="bg-white border border-amber-200 rounded p-2">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-[10px] font-medium text-amber-700">#{idx + 1}</span>
                                              <button onClick={() => removeMargenTarea(idx)} className="text-red-400 hover:text-red-600">
                                                <X className="h-3 w-3" />
                                              </button>
                                            </div>
                                            <div className="grid grid-cols-6 gap-1">
                                              <div className="col-span-2">
                                                <input
                                                  type="text"
                                                  value={t.titulo_custom || ''}
                                                  onChange={e => updateMargenTarea(idx, 'titulo_custom', e.target.value)}
                                                  className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5"
                                                  placeholder="Nombre del ejercicio"
                                                />
                                              </div>
                                              <div>
                                                <select
                                                  value={t.tipo_ejercicio || ''}
                                                  onChange={e => updateMargenTarea(idx, 'tipo_ejercicio', e.target.value || undefined)}
                                                  className="w-full text-[10px] border border-gray-200 rounded px-1 py-0.5"
                                                >
                                                  <option value="">Tipo</option>
                                                  {TIPOS_EJERCICIO_MARGEN.map(te => (
                                                    <option key={te.value} value={te.value}>{te.label}</option>
                                                  ))}
                                                </select>
                                              </div>
                                              <div>
                                                <input
                                                  type="number"
                                                  value={t.duracion ?? ''}
                                                  onChange={e => updateMargenTarea(idx, 'duracion', e.target.value ? parseInt(e.target.value) : undefined)}
                                                  className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5"
                                                  placeholder="Min"
                                                  min={1}
                                                />
                                              </div>
                                              <div>
                                                <input
                                                  type="number"
                                                  value={t.series ?? ''}
                                                  onChange={e => updateMargenTarea(idx, 'series', e.target.value ? parseInt(e.target.value) : undefined)}
                                                  className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5"
                                                  placeholder="Series"
                                                  min={1}
                                                />
                                              </div>
                                              <div>
                                                <input
                                                  type="text"
                                                  value={t.repeticiones || ''}
                                                  onChange={e => updateMargenTarea(idx, 'repeticiones', e.target.value)}
                                                  className="w-full text-[10px] border border-gray-200 rounded px-1.5 py-0.5"
                                                  placeholder="Reps"
                                                />
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 mt-1">
                                              <input
                                                type="text"
                                                value={t.descanso || ''}
                                                onChange={e => updateMargenTarea(idx, 'descanso', e.target.value)}
                                                className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5"
                                                placeholder="Descanso (ej: 30s, 1min)"
                                              />
                                              <input
                                                type="text"
                                                value={t.carga || ''}
                                                onChange={e => updateMargenTarea(idx, 'carga', e.target.value)}
                                                className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5"
                                                placeholder="Carga (ej: 10kg)"
                                              />
                                              <input
                                                type="text"
                                                value={t.notas || ''}
                                                onChange={e => updateMargenTarea(idx, 'notas', e.target.value)}
                                                className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5"
                                                placeholder="Notas"
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    {/* Notes */}
                                    <div>
                                      <label className="text-[10px] font-medium text-amber-700 block mb-0.5">Notas generales</label>
                                      <textarea
                                        value={margenForm.notas || ''}
                                        onChange={e => setMargenForm(p => ({ ...p, notas: e.target.value }))}
                                        className="w-full text-xs border border-amber-200 rounded px-2 py-1 bg-white resize-none"
                                        rows={2}
                                        placeholder="Observaciones..."
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Invitados section */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Anadir jugadores
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCrossTeamDialogOpen(true)
                          loadOrgJugadores()
                        }}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        De otro equipo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAddDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Jugador manual
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-8 flex justify-between items-center">
        <Button variant="ghost" asChild>
          <Link href="/sesiones"><ArrowLeft className="h-4 w-4 mr-2" />Volver a sesiones</Link>
        </Button>
        <Button asChild>
          <Link href="/sesiones/nueva-ai"><Sparkles className="h-4 w-4 mr-2" />Nueva sesion con IA</Link>
        </Button>
      </div>

      {/* ==================== TASK PICKER DIALOG ==================== */}
      <Dialog open={taskPickerOpen} onOpenChange={setTaskPickerOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Anadir tarea a {FASE_LABELS[taskPickerFase]}</DialogTitle>
            <DialogDescription>Busca en la biblioteca o crea una tarea nueva.</DialogDescription>
          </DialogHeader>

          {/* Tab switcher */}
          <div className="flex gap-1 border-b mb-4">
            <button
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${pickerTab === 'biblioteca' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setPickerTab('biblioteca')}
            >
              Biblioteca
            </button>
            <button
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${pickerTab === 'crear' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setPickerTab('crear')}
            >
              Crear nueva
            </button>
          </div>

          {pickerTab === 'biblioteca' ? (
            <>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar tareas..."
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  value={taskSearchCategory}
                  onChange={(e) => setTaskSearchCategory(e.target.value)}
                >
                  <option value="">Todas las categorias</option>
                  <option value="RND">Rondo</option>
                  <option value="JDP">Juego de Posicion</option>
                  <option value="POS">Posesion</option>
                  <option value="EVO">Evoluciones</option>
                  <option value="AVD">Ataque vs Defensa</option>
                  <option value="PCO">Partido Condicionado</option>
                  <option value="ACO">Acc. Combinadas</option>
                  <option value="SSG">Futbol Reducido</option>
                  <option value="ABP">Balon Parado</option>
                </select>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
                {searchingTasks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : taskSearchResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron tareas
                  </div>
                ) : (
                  taskSearchResults.map((tarea) => (
                    <button
                      key={tarea.id}
                      onClick={() => handleAddTarea(tarea, taskPickerFase)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{tarea.titulo}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {tarea.categoria && (
                              <Badge variant="outline" className="text-[10px]">{tarea.categoria.nombre}</Badge>
                            )}
                            <span>{tarea.duracion_total} min</span>
                            <span>{tarea.num_jugadores_min}{tarea.num_jugadores_max ? `-${tarea.num_jugadores_max}` : ''} jug.</span>
                            {tarea.estructura_equipos && (
                              <Badge variant="outline" className="text-[10px]">{tarea.estructura_equipos}</Badge>
                            )}
                          </div>
                        </div>
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Manual creation form */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Crear manualmente</h4>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Titulo *</label>
                  <Input
                    value={newTaskForm.titulo}
                    onChange={(e) => setNewTaskForm(f => ({ ...f, titulo: e.target.value }))}
                    placeholder="Nombre del ejercicio"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripcion</label>
                  <Textarea
                    value={newTaskForm.descripcion}
                    onChange={(e) => setNewTaskForm(f => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Descripcion del ejercicio..."
                    rows={2}
                  />
                </div>
                <div className="w-32">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Duracion (min)</label>
                  <Input
                    type="number"
                    value={newTaskForm.duracion_total}
                    onChange={(e) => setNewTaskForm(f => ({ ...f, duracion_total: parseInt(e.target.value) || 10 }))}
                  />
                </div>
                <Button
                  onClick={handleCreateTask}
                  disabled={creatingTask || !newTaskForm.titulo.trim()}
                  size="sm"
                >
                  {creatingTask ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Crear tarea
                </Button>
              </div>

              {/* AI creation */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Generar con IA
                </h4>
                <p className="text-xs text-muted-foreground">
                  Describe el ejercicio que quieres y la IA lo generara completo.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={aiCreatePrompt}
                    onChange={(e) => setAiCreatePrompt(e.target.value)}
                    placeholder="Ej: Rondo 4v2 con transiciones, 15 minutos..."
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiCreateTask() } }}
                  />
                  <Button
                    onClick={handleAiCreateTask}
                    disabled={aiCreating || !aiCreatePrompt.trim()}
                    size="sm"
                  >
                    {aiCreating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                    Generar
                  </Button>
                </div>
                {aiCreating && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Generando tarea con IA...
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== CROSS-TEAM PLAYER DIALOG ==================== */}
      <Dialog open={crossTeamDialogOpen} onOpenChange={setCrossTeamDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Anadir jugador de otro equipo</DialogTitle>
            <DialogDescription>Selecciona un jugador de otro equipo de tu organizacion.</DialogDescription>
          </DialogHeader>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre..."
              value={orgSearchQuery}
              onChange={(e) => setOrgSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 min-h-[150px]">
            {orgJugadoresLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (() => {
              const currentTeamPlayerIds = new Set(jugadores.map((j) => j.id))
              const filtered = orgJugadores.filter((j) => {
                // Exclude players already in the session's team
                if (j.equipo_id === sesion?.equipo_id && !j.es_invitado) return false
                // Exclude players already added
                if (currentTeamPlayerIds.has(j.id)) return false
                // Search filter
                if (orgSearchQuery) {
                  const q = orgSearchQuery.toLowerCase()
                  const fullName = `${j.nombre} ${j.apellidos}`.toLowerCase()
                  if (!fullName.includes(q)) return false
                }
                return true
              })

              // Group by team
              const byTeam = filtered.reduce((acc, j) => {
                const teamName = (j as any).equipos?.nombre || 'Sin equipo'
                if (!acc[teamName]) acc[teamName] = []
                acc[teamName].push(j)
                return acc
              }, {} as Record<string, typeof filtered>)

              if (Object.keys(byTeam).length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No se encontraron jugadores disponibles
                  </div>
                )
              }

              return Object.entries(byTeam).map(([teamName, players]) => (
                <div key={teamName}>
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 px-1">
                    {teamName}
                  </h5>
                  {players.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => handleAddCrossTeamPlayer(j.id)}
                      disabled={addingInvitado}
                      className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        {j.dorsal || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{j.nombre} {j.apellidos}</p>
                        <p className="text-xs text-muted-foreground">{j.posicion_principal}</p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              ))
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== QUICK-ADD GUEST DIALOG ==================== */}
      <Dialog open={quickAddDialogOpen} onOpenChange={setQuickAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anadir jugador manual</DialogTitle>
            <DialogDescription>Crea un jugador temporal para esta sesion (pruebas, invitados, etc.)</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Nombre *</label>
              <Input
                value={quickAddForm.nombre}
                onChange={(e) => setQuickAddForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre del jugador"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Apellidos</label>
              <Input
                value={quickAddForm.apellidos}
                onChange={(e) => setQuickAddForm((f) => ({ ...f, apellidos: e.target.value }))}
                placeholder="Apellidos"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Posicion</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={quickAddForm.posicion_principal}
                onChange={(e) => setQuickAddForm((f) => ({ ...f, posicion_principal: e.target.value }))}
              >
                <option value="POR">Portero</option>
                <option value="DFC">Defensa Central</option>
                <option value="LTD">Lateral Derecho</option>
                <option value="LTI">Lateral Izquierdo</option>
                <option value="MCD">Mediocentro Defensivo</option>
                <option value="MC">Mediocentro</option>
                <option value="MCO">Mediocentro Ofensivo</option>
                <option value="EXD">Extremo Derecho</option>
                <option value="EXI">Extremo Izquierdo</option>
                <option value="DC">Delantero Centro</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleQuickAddGuest}
              disabled={addingInvitado || !quickAddForm.nombre.trim()}
            >
              {addingInvitado ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Anadir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== EDIT TASK DIALOG ==================== */}
      <Dialog open={!!editingTarea} onOpenChange={(open) => { if (!open) setEditingTarea(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar tarea
            </DialogTitle>
            <DialogDescription>
              Los cambios se guardan como copia — la tarea original en la biblioteca no se modifica.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* Manual edit fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Titulo</label>
                <Input
                  value={editForm.titulo || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, titulo: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripcion</label>
                <Textarea
                  value={editForm.descripcion || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, descripcion: e.target.value }))}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Duracion (min)</label>
                <Input
                  type="number"
                  value={editForm.duracion_total || 0}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, duracion_total: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Series</label>
                <Input
                  type="number"
                  value={editForm.num_series || 1}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, num_series: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Espacio largo (m)</label>
                  <Input
                    type="number"
                    value={editForm.espacio_largo || 0}
                    onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, espacio_largo: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Espacio ancho (m)</label>
                  <Input
                    type="number"
                    value={editForm.espacio_ancho || 0}
                    onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, espacio_ancho: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Estructura equipos</label>
                <Input
                  value={editForm.estructura_equipos || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, estructura_equipos: e.target.value }))}
                  placeholder="Ej: 4v4+2"
                />
              </div>

              {/* Jugadores */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Jug. min</label>
                  <Input
                    type="number"
                    value={editForm.num_jugadores_min || 0}
                    onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, num_jugadores_min: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Jug. max</label>
                  <Input
                    type="number"
                    value={editForm.num_jugadores_max || 0}
                    onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, num_jugadores_max: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* Tactico */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Fase de juego</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={editForm.fase_juego || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, fase_juego: e.target.value || null }))}
                >
                  <option value="">Sin definir</option>
                  <option value="ataque_organizado">Ataque organizado</option>
                  <option value="defensa_organizada">Defensa organizada</option>
                  <option value="transicion_ataque_defensa">Transicion ataque-defensa</option>
                  <option value="transicion_defensa_ataque">Transicion defensa-ataque</option>
                  <option value="balon_parado_ofensivo">Balon parado ofensivo</option>
                  <option value="balon_parado_defensivo">Balon parado defensivo</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Principio tactico</label>
                <Input
                  value={editForm.principio_tactico || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, principio_tactico: e.target.value }))}
                  placeholder="Ej: Salida de balon"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Densidad</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={editForm.densidad || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, densidad: e.target.value || null }))}
                >
                  <option value="">Sin definir</option>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nivel cognitivo</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={editForm.nivel_cognitivo || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, nivel_cognitivo: parseInt(e.target.value) || null }))}
                >
                  <option value="">Sin definir</option>
                  <option value="1">1 - Bajo</option>
                  <option value="2">2 - Medio</option>
                  <option value="3">3 - Alto</option>
                </select>
              </div>

              {/* Reglas y consignas */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Reglas tecnicas</label>
                <Textarea
                  value={editForm.reglas_tecnicas || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, reglas_tecnicas: e.target.value }))}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Reglas tacticas</label>
                <Textarea
                  value={editForm.reglas_tacticas || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, reglas_tacticas: e.target.value }))}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Consignas ofensivas</label>
                <Textarea
                  value={editForm.consignas_ofensivas || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, consignas_ofensivas: e.target.value }))}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Consignas defensivas</label>
                <Textarea
                  value={editForm.consignas_defensivas || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, consignas_defensivas: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Coaching */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Errores comunes</label>
                <Textarea
                  value={editForm.errores_comunes || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, errores_comunes: e.target.value }))}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Posicion entrenador</label>
                <Input
                  value={editForm.posicion_entrenador || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, posicion_entrenador: e.target.value }))}
                  placeholder="Ej: Fuera del campo, lateral..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Variantes</label>
                <Textarea
                  value={editForm.variantes || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, variantes: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Progresiones</label>
                <Textarea
                  value={editForm.progresiones || ''}
                  onChange={(e) => setEditForm((f: Record<string, any>) => ({ ...f, progresiones: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>

            {/* Pizarra Tactica */}
            <details className="border-t pt-4 mt-4">
              <summary className="text-sm font-semibold cursor-pointer flex items-center gap-2 select-none">
                <Target className="h-4 w-4 text-primary" />
                Pizarra Tactica
                <span className="text-xs font-normal text-muted-foreground ml-1">(click para abrir)</span>
              </summary>
              <div className="mt-3">
                <TareaGraphicEditor
                  value={editForm.grafico_data || emptyDiagramData}
                  onChange={(data) => setEditForm((f: Record<string, any>) => ({ ...f, grafico_data: data }))}
                  readOnly={false}
                />
              </div>
            </details>

            {/* AI Edit section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                Editar con IA
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Describe los cambios que quieres y la IA modificara la tarea automaticamente.
              </p>
              <div className="flex gap-2">
                <Input
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder="Ej: Hazla mas intensa, anade variante con presion tras perdida..."
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiEdit() } }}
                />
                <Button
                  onClick={handleAiEdit}
                  disabled={aiProcessing || !aiInstruction.trim()}
                  size="sm"
                >
                  {aiProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  Aplicar
                </Button>
              </div>
              {aiProcessing && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Procesando cambios con IA...
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTarea(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
