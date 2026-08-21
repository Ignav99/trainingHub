'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import useSWR, { mutate } from 'swr'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
  Plus,
  Download,
  Eye,
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
  Pencil,
  Copy,
  UserCircle,
  ClipboardList,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { PageHeader } from '@/components/ui/page-header'
import ABPSessionLink from '@/components/abp/ABPSessionLink'
import TareaGraphicEditor from '@/components/tarea-editor/TareaGraphicEditor'
import { emptyDiagramData } from '@/components/tarea-editor/types'
import { TacticalBoardMini } from '@/components/task-preview'
import { FormacionEquiposDialog } from '@/components/sesion/FormacionEquiposDialog'
import GKTrainingSection from '@/components/portero/GKTrainingSection'
import { SesionPhaseNav, type SesionPhase } from '@/components/sesiones/SesionPhaseNav'
import { SesionCierrePanel } from '@/components/sesiones/SesionCierrePanel'
import { SesionDefinirForm } from '@/components/sesiones/SesionDefinirForm'
import { SesionMaterialPanel } from '@/components/sesiones/SesionMaterialPanel'
import { SesionBloquesPanel } from '@/components/sesiones/SesionBloquesPanel'
import { sesionesApi, SesionUpdateData } from '@/lib/api/sesiones'
import { jugadoresApi } from '@/lib/api/jugadores'
import {
  Sesion,
  SesionTarea,
  SesionBloque,
  EstadoSesion,
  FaseSesion,
  Tarea,
  Jugador,
  Asistencia,
  AsistenciaListResponse,
  MotivoAusencia,
  TipoParticipacion,
  FormacionEquipos,
  EntrenamientoMargen,
} from '@/types'
import { PlayerStatusBadges } from '@/components/player/PlayerStatusBadges'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import TareaCreatorFullscreen, { type TareaCreatorData } from '@/components/tareas/TareaCreatorFullscreen'
import { madreToCreatorPrefill } from '@/lib/tareaVariante'
import { variantesFromReglas } from '@/lib/tareaNarrative'
import { cargaApi } from '@/lib/api/carga'
import { entrenamientosMargenApi } from '@/lib/api/entrenamientosMargen'
import { suggestAttendanceFromDisponibilidad } from '@/lib/jugadorTipo'
import type { CargaJugador } from '@/types'
import { MATCH_DAYS as MATCH_DAYS_CATALOG, DIAS_CARGA } from '@/lib/catalogos/canonico'
import { TaskPickerDialog } from '@/components/tareas/TaskPickerDialog'
import MargenPanel from '@/components/margen/MargenPanel'
import { duracionBloquePartido, faseSesionFromBloque, isPartidoCondicionado, resolveEstructura } from '@/lib/sesionEstructura'

const MATCH_DAY_COLORS: Record<string, string> = {
  'MD+1': 'bg-green-100 text-green-800',
  'MD+2': 'bg-green-50 text-green-700',
  'MD-4': 'bg-red-100 text-red-800',
  'MD-3': 'bg-orange-100 text-orange-800',
  'MD-2': 'bg-blue-100 text-blue-800',
  'MD-1': 'bg-purple-100 text-purple-800',
  'MD': 'bg-amber-100 text-amber-800',
  'PT-R': 'bg-emerald-50 text-emerald-800',
  'PT-A': 'bg-sky-100 text-sky-800',
  'PT-V': 'bg-amber-100 text-amber-900',
  'PT-I': 'bg-orange-100 text-orange-900',
  'PT-E': 'bg-indigo-100 text-indigo-800',
  'PT-F': 'bg-rose-100 text-rose-800',
}

const FASE_LABELS: Record<string, string> = {
  activacion: 'Activación',
  desarrollo_1: 'Desarrollo 1',
  desarrollo_2: 'Desarrollo 2',
  desarrollo_3: 'Desarrollo 3',
  desarrollo_4: 'Desarrollo 4',
  desarrollo_5: 'Desarrollo 5',
  desarrollo_6: 'Desarrollo 6',
  vuelta_calma: 'Vuelta a calma',
}

const ALL_DESARROLLO_FASES: FaseSesion[] = ['desarrollo_1', 'desarrollo_2', 'desarrollo_3', 'desarrollo_4', 'desarrollo_5', 'desarrollo_6']

const FASE_ORDER: FaseSesion[] = ['activacion', 'desarrollo_1', 'desarrollo_2', 'desarrollo_3', 'desarrollo_4', 'desarrollo_5', 'desarrollo_6', 'vuelta_calma']

const ESTADO_CONFIG: Record<string, { color: string; label: string }> = {
  borrador: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Borrador' },
  planificada: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Planificada' },
  completada: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Completada' },
  cancelada: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Cancelada' },
}

const MATCH_DAYS = MATCH_DAYS_CATALOG.map((d) => d.codigo)
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

// ============ Helper: Debounced auto-save ============
function useAutoSave(sesionId: string, delay = 800) {
  const timerRef = useRef<NodeJS.Timeout>()
  const pendingRef = useRef<SesionUpdateData>({})
  const [saving, setSaving] = useState(false)
  const dirtyRef = useRef(false)

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
    const data = pendingRef.current
    if (!data || Object.keys(data).length === 0) {
      dirtyRef.current = false
      return
    }
    pendingRef.current = {}
    setSaving(true)
    try {
      await sesionesApi.update(sesionId, data)
    } catch (err: any) {
      console.error('Auto-save failed:', err)
      const msg: string = err?.message || ''
      if (msg.includes('permiso') || msg.includes('plan') || msg.includes('suscripci')) {
        toast.error(msg)
      }
      // Re-queue so a later flush can retry
      pendingRef.current = { ...data, ...pendingRef.current }
      dirtyRef.current = true
      throw err
    } finally {
      if (Object.keys(pendingRef.current).length === 0) {
        dirtyRef.current = false
      }
      setSaving(false)
    }
  }, [sesionId])

  const save = useCallback(
    (data: SesionUpdateData) => {
      dirtyRef.current = true
      // Merge: evita que un patch (keywords) pise otro pendiente (objetivo)
      pendingRef.current = { ...pendingRef.current, ...data }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        void flush()
      }, delay)
    },
    [delay, flush]
  )

  return { save, flush, saving, dirtyRef }
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

  const { save: autoSave, flush: flushAutoSave, saving: autoSaving, dirtyRef } = useAutoSave(sesionId)

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
  const [phase, setPhase] = useState<SesionPhase>('definir')
  const [asistenciaSavedOnce, setAsistenciaSavedOnce] = useState(false)

  // Task picker
  const [taskPickerOpen, setTaskPickerOpen] = useState(false)
  const [taskPickerFase, setTaskPickerFase] = useState<FaseSesion>('activacion')

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
  const [convocatoriaTab, setConvocatoriaTab] = useState<'asistencia' | 'margen'>('asistencia')

  // Per-task formation panel state
  const [formacionDialogStId, setFormacionDialogStId] = useState<string | null>(null)

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

  // Task creation state
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [creatorFromMother, setCreatorFromMother] = useState<Tarea | null>(null)
  const [aiCreating, setAiCreating] = useState(false)
  const legacyEstructuraMigrated = useRef(false)

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
      // NOTE: jugadores aún no cargados aquí; se rellenan huecos al tener plantilla
      // según disponibilidad operativa (fuera/individual/grupo).
      setAsistencias(map)
      if (map.size > 0) setAsistenciaSavedOnce(true)
      setAsistenciasLoaded(true)
    } catch (err) {
      console.error('Error loading asistencias:', err)
    }
  }

  // ============ Entrenamientos al Margen ============
  const loadMargen = async (force = false) => {
    if (margenLoaded && !force) return
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

  const reloadMargen = async () => {
    setMargenLoaded(false)
    await loadMargen(true)
  }

  // ============ Field update with autosave ============
  const updateField = (field: string, value: any) => {
    setSesion((prev) => prev ? { ...prev, [field]: value } : prev)
    autoSave({ [field]: value } as SesionUpdateData)
  }

  /** Aplica varios campos en un solo autosave (evita que keywords pise objetivo). */
  const updateFields = (patch: Record<string, any>) => {
    setSesion((prev) => prev ? { ...prev, ...patch } : prev)
    autoSave(patch as SesionUpdateData)
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
  const handlePreviewPdf = async (variant: 'reducido' | 'extendido' = 'reducido') => {
    setPreviewingPdf(true)
    try {
      await flushAutoSave()
      await sesionesApi.previewPdf(sesionId, variant, { fecha: sesion?.fecha })
    } catch (err) {
      toast.error('Error al generar vista previa del PDF')
    } finally {
      setPreviewingPdf(false)
    }
  }

  const handleGeneratePdf = async (variant: 'reducido' | 'extendido' = 'reducido') => {
    setGeneratingPdf(true)
    try {
      await flushAutoSave()
      await sesionesApi.generatePdf(sesionId, variant, { fecha: sesion?.fecha })
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

  const bloquesResueltos = useMemo(
    () => resolveEstructura(sesion?.estructura_fases, allTareas),
    [sesion?.estructura_fases, allTareas]
  )

  const faseOrderFromEstructura = useMemo((): FaseSesion[] => {
    return bloquesResueltos
      .map((b) => faseSesionFromBloque(b))
      .filter((f): f is FaseSesion => f !== null)
  }, [bloquesResueltos])

  useEffect(() => {
    if (!sesion || legacyEstructuraMigrated.current) return
    if (sesion.estructura_fases && sesion.estructura_fases.length > 0) {
      legacyEstructuraMigrated.current = true
      return
    }
    const derived = resolveEstructura(null, sesion.tareas)
    if (derived.length > 0) {
      legacyEstructuraMigrated.current = true
      updateField('estructura_fases', derived)
    }
  }, [sesion?.id, sesion?.estructura_fases, sesion?.tareas])

  const handleEstructuraChange = useCallback(
    (bloques: SesionBloque[]) => {
      setSesion((prev) => (prev ? { ...prev, estructura_fases: bloques } : prev))
      updateField('estructura_fases', bloques)
    },
    [updateField]
  )

  const saveBatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveTareasBatch = async (newTareas: SesionTarea[]) => {
    setSavingTareas(true)
    try {
      const batch = newTareas.map((t, i) => ({
        tarea_id: t.tarea_id,
        orden: i + 1,
        fase_sesion: t.fase_sesion || 'desarrollo_1',
        duracion_override: t.duracion_override ?? undefined,
        notas: t.notas || undefined,
        responsable: t.responsable || undefined,
      }))
      const updated = await sesionesApi.batchUpdateTareas(sesionId, batch)
      setSesion(updated)
    } catch (err: any) {
      console.error('Error saving tareas:', err)
      toast.error(err?.message || 'No se pudieron guardar las tareas')
      // Recargar desde servidor para no dejar estado fantasma
      try {
        const fresh = await sesionesApi.get(sesionId)
        setSesion(fresh)
      } catch {}
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

  const handleMoveTarea = async (
    tareaToMove: SesionTarea,
    direction: 'up' | 'down',
    bloqueOrder: FaseSesion[] = faseOrderFromEstructura
  ) => {
    const fase = tareaToMove.fase_sesion
    const faseTareas = [...(tareasByFase[fase] || [])]
    const idx = faseTareas.findIndex((t) => t.id === tareaToMove.id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= faseTareas.length) return

    ;[faseTareas[idx], faseTareas[swapIdx]] = [faseTareas[swapIdx], faseTareas[idx]]

    const newAll: SesionTarea[] = []
    for (const f of bloqueOrder) {
      if (f === fase) {
        newAll.push(...faseTareas)
      } else {
        newAll.push(...(tareasByFase[f] || []))
      }
    }
    setSesion((prev) => (prev ? { ...prev, tareas: newAll } : prev))
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
  const openFormacionDialog = (stId: string) => {
    loadJugadores()
    loadAsistencias()
    setFormacionDialogStId(stId)
  }

  const formacionDialogTarea = useMemo(
    () => sesion?.tareas?.find((t) => t.id === formacionDialogStId) || null,
    [sesion?.tareas, formacionDialogStId]
  )

  const disponiblesIds = useMemo(() => {
    const ids: string[] = []
    asistencias.forEach((a, jid) => {
      if (a.presente && (a.tipo_participacion || []).includes('sesion')) ids.push(jid)
    })
    return ids
  }, [asistencias])

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

  // ============ Task editing (inline — no modal) ============
  const handleInlineSaveEdit = useCallback(async (stId: string, form: Record<string, any>) => {
    const realSt = sesion?.tareas?.find(t => t.id === stId)
    if (!realSt) return
    if (realSt.id.startsWith('temp-')) {
      toast.error('La tarea aún se está guardando, espera un momento')
      return
    }
    try {
      const wasMadre = !realSt.tarea?.tarea_origen_id
      const result = await sesionesApi.duplicarYEditarTarea(sesionId, realSt.id, form)
      const updated = result.tareas || result.tarea
      setSesion((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          tareas: prev.tareas?.map((t) =>
            t.id === realSt.id
              ? { ...t, tarea_id: result.tarea_id, tarea: updated }
              : t
          ),
        }
      })
      if (wasMadre && updated?.tarea_origen_id) {
        toast.success('Variante creada en la biblioteca. La madre no se ha tocado.')
      } else {
        toast.success('Cambios guardados')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar cambios')
      throw err
    }
  }, [sesion, sesionId])

  const handleInlineAiEdit = useCallback(async (stId: string, instruction: string) => {
    const realSt = sesion?.tareas?.find(t => t.id === stId)
    if (!realSt) return
    if (realSt.id.startsWith('temp-')) {
      toast.error('La tarea aún se está guardando, espera un momento')
      return
    }
    try {
      const result = await sesionesApi.aiEditTarea(sesionId, realSt.id, instruction)
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
      const updated = result.tareas || result.tarea
      const wasMadre = !realSt.tarea?.tarea_origen_id
      if (wasMadre && updated?.tarea_origen_id) {
        toast.success('Variante creada con IA. La madre no se ha tocado.')
      } else {
        toast.success('Tarea editada con IA')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al editar con IA')
      throw err
    }
  }, [sesion, sesionId])

  // ============ Task picker ============
  // La ficha completa llega de "Crea tu ejercicio" (TareaCreatorFullscreen)
  const handleCreateTask = async (data: TareaCreatorData) => {
    const updated = await sesionesApi.createTareaInSesion(sesionId, {
      ...data,
      fase_sesion: taskPickerFase,
      desarrollo: data.desarrollo || data.descripcion || undefined,
      descripcion: data.desarrollo || data.descripcion || undefined,
      reglas: data.reglas || undefined,
      variantes: variantesFromReglas(data.reglas),
      anotaciones: data.anotaciones || undefined,
      tipo_variante: data.tipo_variante || 'original',
      tarea_origen_id: data.tarea_origen_id || undefined,
      modalidad: data.modalidad,
      objetivos_tacticos: data.objetivos_tacticos,
      objetivos_tecnicos: data.objetivos_tecnicos,
      orientaciones_fisicas: data.orientaciones_fisicas,
      etiquetas_fisicas: data.etiquetas_fisicas,
      principio_tactico: data.principio_tactico,
      subprincipio_tactico: data.subprincipio_tactico,
      complejidad: data.complejidad || undefined,
    })
    setSesion(updated)
    setCreatorOpen(false)
  }

  const handleAiCreateTask = async (prompt: string) => {
    if (!prompt.trim()) return
    setAiCreating(true)
    try {
      const updated = await sesionesApi.aiCreateTareaInSesion(sesionId, {
        prompt,
        fase_sesion: taskPickerFase,
      })
      setSesion(updated)
      setTaskPickerOpen(false)
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

  const handlePhaseChange = (next: SesionPhase) => {
    setPhase(next)
    if (next === 'convocatoria' || next === 'diseno' || next === 'cierre') {
      loadJugadores()
      loadAsistencias()
      loadCargaData()
      loadMargen()
    }
  }

  // Abrir en convocatoria: precargar plantilla / asistencia
  useEffect(() => {
    if (!sesionId) return
    loadJugadores()
    loadAsistencias()
    loadCargaData()
    loadMargen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesionId])

  // Rellenar jugadores sin fila de asistencia según disponibilidad operativa
  useEffect(() => {
    if (!asistenciasLoaded || jugadores.length === 0) return
    setAsistencias((prev) => {
      let changed = false
      const next = new Map(prev)
      for (const j of jugadores) {
        if (next.has(j.id)) continue
        const suggestion = suggestAttendanceFromDisponibilidad(j)
        next.set(j.id, {
          presente: suggestion.presente,
          motivo: suggestion.motivo_ausencia,
          tipo_participacion: suggestion.tipo_participacion as TipoParticipacion[],
        })
        changed = true
      }
      return changed ? next : prev
    })
  }, [asistenciasLoaded, jugadores])

  const toggleAsistencia = (jugadorId: string) => {
    const jugador = jugadores.find((j) => j.id === jugadorId)
    setAsistencias((prev) => {
      const next = new Map(prev)
      const current = next.get(jugadorId)
      if (current) {
        const willBePresent = !current.presente
        if (willBePresent && jugador) {
          const suggestion = suggestAttendanceFromDisponibilidad(jugador)
          next.set(jugadorId, {
            ...current,
            presente: true,
            motivo: undefined,
            tipo_participacion: (suggestion.tipo_participacion.length
              ? suggestion.tipo_participacion
              : ['sesion']) as TipoParticipacion[],
          })
        } else if (willBePresent) {
          next.set(jugadorId, {
            ...current,
            presente: true,
            motivo: undefined,
            tipo_participacion: ['sesion'],
          })
        } else {
          const suggestion = jugador ? suggestAttendanceFromDisponibilidad(jugador) : null
          next.set(jugadorId, {
            ...current,
            presente: false,
            motivo: suggestion?.motivo_ausencia || current.motivo || 'otro',
            tipo_participacion: [],
          })
        }
      } else {
        const suggestion = jugador
          ? suggestAttendanceFromDisponibilidad(jugador)
          : { presente: true, tipo_participacion: ['sesion'] as const }
        next.set(jugadorId, {
          presente: suggestion.presente,
          motivo: 'motivo_ausencia' in suggestion ? suggestion.motivo_ausencia : undefined,
          tipo_participacion: suggestion.tipo_participacion as TipoParticipacion[],
        })
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
        if (a) {
          const presente = a.presente
          return {
            jugador_id: j.id,
            presente,
            motivo_ausencia: !presente ? a.motivo : undefined,
            notas: a.notas,
            tipo_participacion: presente
              ? (a.tipo_participacion?.length ? a.tipo_participacion : ['sesion'])
              : [],
          }
        }
        const suggestion = suggestAttendanceFromDisponibilidad(j)
        return {
          jugador_id: j.id,
          presente: suggestion.presente,
          motivo_ausencia: suggestion.presente ? undefined : suggestion.motivo_ausencia,
          tipo_participacion: suggestion.presente
            ? (suggestion.tipo_participacion.length ? suggestion.tipo_participacion : ['sesion'])
            : [],
        }
      })
      await sesionesApi.saveAsistenciasBatch(sesionId, list)
      setAsistenciaSavedOnce(true)
      toast.success('Convocatoria guardada')
    } catch (err) {
      console.error('Error saving asistencias:', err)
      toast.error('No se pudo guardar la convocatoria')
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
  const completedBloques = bloquesResueltos.filter((b) => {
    if (b.tipo === 'videoanalisis') {
      return !!(b.notas?.trim() || (b.duracion_objetivo && b.duracion_objetivo > 0))
    }
    if (isPartidoCondicionado(b)) {
      const p = b.partido
      return !!(
        p?.objetivo?.trim() ||
        p?.normas?.trim() ||
        duracionBloquePartido(b) > 0 ||
        Object.keys(p?.equipo_peto || {}).length > 0
      )
    }
    return (tareasByFase[b.tipo]?.length || 0) > 0
  })
  const totalDuration =
    allTareas.reduce((sum, st) => sum + (st.duracion_override || st.tarea?.duracion_total || 0), 0) +
    bloquesResueltos.reduce((sum, b) => sum + duracionBloquePartido(b), 0)

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
              {/* Match day / Día de carga */}
              {sesion.es_pretemporada || sesion.contexto_periodo === 'pretemporada' || sesion.contexto_periodo === 'transicion' ? (
                <select
                  className={`text-xs font-bold px-2.5 py-1 rounded border-0 cursor-pointer ${MATCH_DAY_COLORS[sesion.dia_carga || ''] || 'bg-amber-50 text-amber-900'}`}
                  value={sesion.dia_carga || ''}
                  onChange={(e) => updateField('dia_carga', e.target.value)}
                  title="Día de carga (pretemporada)"
                >
                  <option value="">Día de carga…</option>
                  {DIAS_CARGA.map((d) => (
                    <option key={d.codigo} value={d.codigo}>
                      {d.codigo} — {d.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className={`text-xs font-bold px-2.5 py-1 rounded border-0 cursor-pointer ${MATCH_DAY_COLORS[sesion.match_day] || 'bg-muted'}`}
                  value={sesion.match_day}
                  onChange={(e) => updateField('match_day', e.target.value)}
                >
                  {MATCH_DAYS.map((md) => (
                    <option key={md} value={md}>{md}</option>
                  ))}
                </select>
              )}
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
          <Button variant="outline" size="icon" onClick={() => handlePreviewPdf('reducido')} disabled={previewingPdf} title="Vista previa PDF reducido">
            {previewingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleGeneratePdf('reducido')} disabled={generatingPdf} title="Descargar PDF reducido">
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={handleDelete} disabled={deleting} className="text-destructive hover:bg-destructive/10" title="Eliminar">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Phase timeline */}
      <div className="mb-6 space-y-3">
        <SesionPhaseNav
          value={phase}
          onChange={handlePhaseChange}
          done={{
            definir: !!(sesion.objetivo_principal && sesion.fecha && (sesion.fases_juego?.length || sesion.match_day)),
            convocatoria: asistenciaSavedOnce,
            diseno: bloquesResueltos.length > 0 && (allTareas.length > 0 || completedBloques.length > 0),
            cierre: sesion.estado === 'planificada' || sesion.estado === 'completada',
          }}
        />
        <div className="flex items-center gap-3">
          <div className="flex-1 flex gap-1">
            {bloquesResueltos.map((bloque) => {
              const filled =
                bloque.tipo === 'videoanalisis'
                  ? !!(bloque.notas?.trim() || (bloque.duracion_objetivo && bloque.duracion_objetivo > 0))
                  : isPartidoCondicionado(bloque)
                    ? !!(
                        bloque.partido?.objetivo?.trim() ||
                        duracionBloquePartido(bloque) > 0 ||
                        Object.keys(bloque.partido?.equipo_peto || {}).length > 0
                      )
                    : (tareasByFase[bloque.tipo]?.length || 0) > 0
              return (
                <div
                  key={bloque.id}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${filled ? 'bg-primary' : 'bg-muted'}`}
                  title={`${bloque.label}: ${filled ? 'Con contenido' : 'Vacío'}`}
                />
              )
            })}
          </div>
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
            {completedBloques.length}/{bloquesResueltos.length || 0} bloques · {totalDuration || sesion.duracion_total || 0} min
          </span>
        </div>
        {sesion.microciclo_id && (
          <Link
            href={`/microciclos/${sesion.microciclo_id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1 hover:bg-sky-100"
          >
            Ver en Sala del Lunes / microciclo
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* ==================== FASE: DEFINIR ==================== */}
      {phase === 'definir' && (
        <div className="space-y-4 animate-fade-in">
          <SesionDefinirForm
            value={{
              titulo: sesion.titulo || '',
              fecha: sesion.fecha || '',
              hora: sesion.hora || '',
              lugar: sesion.lugar || '',
              match_day: sesion.match_day || 'MD-3',
              dia_carga: sesion.dia_carga || '',
              contexto_periodo: sesion.contexto_periodo || (sesion.es_pretemporada ? 'pretemporada' : 'competicion'),
              es_pretemporada: !!sesion.es_pretemporada,
              rival: sesion.rival || '',
              competicion: sesion.competicion || '',
              partido_id: sesion.partido_id || null,
              fases_juego: sesion.fases_juego || (sesion.fase_juego_principal ? [sesion.fase_juego_principal] : []),
              subfases: sesion.subfases || [],
              abp_config: sesion.abp_config || null,
              contenidos_tecnicos_of: sesion.contenidos_tecnicos_of || sesion.contenidos_ofensivos || [],
              contenidos_tecnicos_def: sesion.contenidos_tecnicos_def || sesion.contenidos_defensivos || [],
              objetivo_principal: sesion.objetivo_principal || '',
              keywords: sesion.keywords || [],
              objetivo_fisico: sesion.objetivo_fisico || '',
              objetivo_psicologico: sesion.objetivo_psicologico || '',
            }}
            rivalLocked={!!sesion.partido_id && !sesion.es_pretemporada}
            onChange={(patch) => {
              const next: Record<string, any> = { ...patch }
              if ('contenidos_tecnicos_of' in patch) {
                next.contenidos_ofensivos = patch.contenidos_tecnicos_of
              }
              if ('contenidos_tecnicos_def' in patch) {
                next.contenidos_defensivos = patch.contenidos_tecnicos_def
              }
              updateFields(next)
            }}
          />
          <div className="flex justify-end">
            <Button onClick={() => handlePhaseChange('convocatoria')}>
              Ir a Convocatoria
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ==================== FASE: DISENO (tareas + material) ==================== */}
      {phase === 'diseno' && sesion && (
        <div className="space-y-4 animate-fade-in">
          <SesionBloquesPanel
            sesion={sesion}
            savingTareas={savingTareas}
            staffOptions={staffOptions}
            formacionDialogStId={formacionDialogStId}
            jugadores={jugadores.filter((j) => {
              const a = asistencias.get(j.id)
              if (!(a?.presente ?? true)) return false
              const tipos = a?.tipo_participacion || ['sesion']
              return tipos.includes('sesion')
            })}
            onOpenTaskPicker={(fase) => {
              setTaskPickerFase(fase)
              setTaskPickerOpen(true)
            }}
            onEstructuraChange={handleEstructuraChange}
            onMoveTarea={handleMoveTarea}
            onRemoveTarea={handleRemoveTarea}
            onDurationChange={handleUpdateTareaDuration}
            onDurationCommit={handleCommitTareaDuration}
            onResponsableChange={handleUpdateTareaResponsable}
            onResponsableBlur={() => debouncedSaveTareasBatch(allTareas)}
            onNotasChange={handleUpdateTareaNotas}
            onNotasBlur={() => debouncedSaveTareasBatch(allTareas)}
            onToggleFormacion={openFormacionDialog}
            onSaveEdit={handleInlineSaveEdit}
            onAiEdit={handleInlineAiEdit}
          />

          {/* Resumen trabajo al margen (linkeado desde convocatoria) */}
          {margenMap.size > 0 && (
            <button
              type="button"
              onClick={() => {
                setConvocatoriaTab('margen')
                handlePhaseChange('convocatoria')
              }}
              className="mt-4 w-full rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-left hover:bg-amber-50 transition-colors"
            >
              <p className="text-sm font-semibold text-amber-900">
                Trabajo al margen · {margenMap.size} jugador{margenMap.size === 1 ? '' : 'es'}
              </p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                {Array.from(margenMap.values()).reduce((n, e) => n + (e.tareas?.length || 0), 0)} ejercicios asignados · Abrir pestaña en convocatoria
              </p>
            </button>
          )}

          {/* ABP Section - Set Pieces linked to this session */}
          {sesion?.equipo_id && (
            <div className="mt-6 p-4 bg-orange-50/50 border border-orange-100 rounded-xl">
              <ABPSessionLink sesionId={sesionId} equipoId={sesion.equipo_id} />
            </div>
          )}

          {/* GK Training Section */}
          {sesion?.equipo_id && (
            <div className="mt-6">
              <GKTrainingSection
                sesionId={sesionId}
                equipoId={sesion.equipo_id}
                matchDay={sesion.match_day}
                intensidadObjetivo={sesion.intensidad_objetivo}
                isEditable={true}
              />
            </div>
          )}

          <SesionMaterialPanel
            value={sesion.materiales || []}
            derivedFromTareas={(sesion.tareas || []).flatMap((st) => st.tarea?.material || [])}
            onChange={(mats) => updateField('materiales', mats)}
          />

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => handlePhaseChange('convocatoria')}>
              Volver a Convocatoria
            </Button>
            <Button type="button" onClick={() => handlePhaseChange('cierre')}>
              Siguiente: Cierre
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ==================== FASE: CONVOCATORIA ==================== */}
      {phase === 'convocatoria' && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Convocatoria
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
                    {margenMap.size > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
                        <span className="font-semibold text-amber-800">{margenMap.size}</span>
                        <span className="text-amber-700 text-xs">al margen</span>
                      </div>
                    )}
                  </div>
                  {convocatoriaTab === 'asistencia' && (
                    <Button onClick={saveAsistencias} disabled={savingAsistencias} size="sm">
                      {savingAsistencias ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                      Guardar
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-1 mt-3 border-b">
                <button
                  type="button"
                  onClick={() => setConvocatoriaTab('asistencia')}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    convocatoriaTab === 'asistencia'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Asistencia
                </button>
                <button
                  type="button"
                  onClick={() => setConvocatoriaTab('margen')}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    convocatoriaTab === 'margen'
                      ? 'border-amber-500 text-amber-800'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Trabajo al margen
                  {margenMap.size > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                      {margenMap.size}
                    </span>
                  )}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {convocatoriaTab === 'margen' ? (
                <MargenPanel
                  sesionId={sesionId}
                  equipoId={sesion?.equipo_id}
                  players={jugadores.flatMap((jugador) => {
                    const asistencia = asistencias.get(jugador.id)
                    const suggestion = !asistencia ? suggestAttendanceFromDisponibilidad(jugador) : null
                    const presente = asistencia?.presente ?? suggestion?.presente ?? true
                    const tipos = asistencia?.tipo_participacion
                      || (suggestion?.tipo_participacion as TipoParticipacion[] | undefined)
                      || (presente ? ['sesion'] : [])
                    if (!presente || !(tipos.includes('margen') || tipos.includes('fisio'))) return []
                    const tipoLabel = [
                      tipos.includes('margen') ? 'Margen' : null,
                      tipos.includes('fisio') ? 'Fisio' : null,
                    ].filter(Boolean).join(' · ')
                    return [{ jugador, tipoLabel }]
                  })}
                  margenMap={margenMap}
                  onReload={reloadMargen}
                />
              ) : jugadores.length === 0 ? (
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
                          const suggestion = !asistencia ? suggestAttendanceFromDisponibilidad(jugador) : null
                          const presente = asistencia?.presente ?? suggestion?.presente ?? true
                          const tipos = asistencia?.tipo_participacion
                            || (suggestion?.tipo_participacion as TipoParticipacion[] | undefined)
                            || (presente ? ['sesion'] : [])

                          const isMargen = presente && (tipos.includes('margen') || tipos.includes('fisio'))
                          const hasMargenWorkout = margenMap.has(jugador.id)
                          const margenWorkout = margenMap.get(jugador.id)

                          return (
                            <div key={jugador.id}>
                            <div
                              className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                                presente ? 'bg-green-50/50' : 'bg-red-50/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <PlayerAvatar player={jugador} size="sm" preferDorsalFallback />
                                <div>
                                  <p className="text-sm font-medium flex items-center gap-1.5">
                                    {jugador.nombre} {jugador.apellidos}
                                    {jugador.es_invitado && (
                                      <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
                                        Invitado
                                      </Badge>
                                    )}
                                    <PlayerStatusBadges estado={jugador.estado} disponibilidad={jugador.disponibilidad} />
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

                            {/* Margen — resumen; edición completa en pestaña */}
                            {isMargen && (
                              <div className="ml-3 mr-3 mb-1">
                                <button
                                  type="button"
                                  onClick={() => setConvocatoriaTab('margen')}
                                  className="w-full py-1.5 px-3 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors flex items-center justify-between gap-2"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <Plus className="h-3 w-3" />
                                    {hasMargenWorkout
                                      ? (margenWorkout?.objetivo || 'Trabajo al margen')
                                      : 'Asignar trabajo al margen'}
                                  </span>
                                  <span className="text-amber-600">
                                    {hasMargenWorkout
                                      ? `${margenWorkout?.tareas?.length || 0} ejercicios →`
                                      : 'Abrir pestaña →'}
                                  </span>
                                </button>
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

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => handlePhaseChange('definir')}>
              Volver a Definir
            </Button>
            <Button type="button" onClick={() => handlePhaseChange('diseno')}>
              Siguiente: Diseño
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ==================== CAMPO eliminado (rediseño) — bloque oculto ==================== */}
      {false && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h3 className="font-semibold text-slate-900">Modo campo</h3>
            <p className="text-sm text-slate-600">
              Vista operativa para dirigir la sesión. Abre la pizarra o exporta el PDF.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/pizarra?sesion=${sesionId}`}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Abrir pizarra
                </Link>
              </Button>
              <Button variant="outline" onClick={() => handlePreviewPdf('reducido')} disabled={previewingPdf}>
                {previewingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                Vista previa PDF reducido
              </Button>
              <Button variant="outline" onClick={() => handleGeneratePdf('reducido')} disabled={generatingPdf}>
                {generatingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Descargar PDF reducido
              </Button>
            </div>
          </div>

          {(sesion?.tareas || []).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <h3 className="font-semibold text-slate-900">Secuencia en pista</h3>
              <ol className="space-y-2">
                {(sesion?.tareas || [])
                  .slice()
                  .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                  .map((st, idx) => (
                    <li key={st.id} className="flex items-start gap-3 text-sm border-b border-slate-100 pb-2 last:border-0">
                      <span className="font-mono text-xs text-slate-400 w-6 shrink-0 pt-0.5">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{st.tarea?.titulo || 'Tarea'}</p>
                        <p className="text-xs text-slate-500">
                          {st.duracion_override || st.tarea?.duracion_total || 0} min
                          {st.fase_sesion ? ` · ${FASE_LABELS[st.fase_sesion] || st.fase_sesion}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
              </ol>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={() => handlePhaseChange('diseno')}>
              Volver a Diseño
            </Button>
            <Button type="button" onClick={() => handlePhaseChange('cierre')}>
              Siguiente: Cierre
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ==================== FASE: CIERRE ==================== */}
      {phase === 'cierre' && (
        <SesionCierrePanel
          sesionId={sesionId}
          estado={sesion.estado}
          tareas={sesion.tareas || []}
          cargaSesion={sesion.carga_sesion}
          intensidadCalculada={sesion.intensidad_calculada || sesion.intensidad_objetivo}
          shareToken={sesion.share_token}
          shareUrl={sesion.share_token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/sesiones/${sesion.share_token}` : null}
          onCerrarPlanificacion={async () => {
            const updated = await sesionesApi.cerrarPlanificacion(sesionId)
            setSesion(updated)
            mutate(`/api/v1/sesiones/${sesionId}`)
          }}
          onEnableShare={async () => {
            const updated = await sesionesApi.enableShare(sesionId)
            setSesion(updated)
          }}
          onPreviewPdf={handlePreviewPdf}
          onDownloadPdf={handleGeneratePdf}
        />
      )}

      {/* Footer */}
      <div className="mt-8 flex justify-between items-center">
        <Button variant="ghost" asChild>
          <Link href="/sesiones"><ArrowLeft className="h-4 w-4 mr-2" />Volver a sesiones</Link>
        </Button>
        <Button asChild>
          <Link href="/sesiones/nueva"><Plus className="h-4 w-4 mr-2" />Nueva sesión</Link>
        </Button>
      </div>

      <FormacionEquiposDialog
        open={!!formacionDialogStId}
        onOpenChange={(open) => { if (!open) setFormacionDialogStId(null) }}
        sesionId={sesionId}
        sesionTarea={formacionDialogTarea}
        jugadoresMap={jugadoresMap}
        disponiblesIds={disponiblesIds}
        onFormacionChange={handleFormacionChange}
        onCopy={formacionDialogTarea ? () => handleCopyFormacion(formacionDialogTarea) : undefined}
        onPaste={formacionDialogStId ? () => handlePasteFormacion(formacionDialogStId) : undefined}
        hasCopied={!!copiedFormacion}
        copiedFrom={copiedFormacion?.taskName}
      />

      <TaskPickerDialog
        open={taskPickerOpen}
        onOpenChange={setTaskPickerOpen}
        faseLabel={FASE_LABELS[taskPickerFase] || taskPickerFase}
        onAdd={(tarea) => handleAddTarea(tarea, taskPickerFase)}
        onCreateManual={() => {
          setCreatorFromMother(null)
          setCreatorOpen(true)
        }}
        onCreateVariante={(madre) => {
          setTaskPickerOpen(false)
          setCreatorFromMother(madre)
          setCreatorOpen(true)
        }}
        onAiCreate={handleAiCreateTask}
        aiCreating={aiCreating}
      />

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
                      <PlayerAvatar player={j} size="sm" preferDorsalFallback />
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

      {/* "Crea tu ejercicio" — creador de tarea a pantalla completa */}
      <TareaCreatorFullscreen
        open={creatorOpen}
        onClose={() => {
          setCreatorOpen(false)
          setCreatorFromMother(null)
        }}
        onSubmit={async (data) => {
          await handleCreateTask(data)
          setCreatorFromMother(null)
        }}
        onClonar={() => {
          setCreatorOpen(false)
          setCreatorFromMother(null)
          setTaskPickerOpen(true)
        }}
        numJugadoresDefault={Array.from(asistencias.values()).filter((a) => a.presente).length || 16}
        faseLabel={FASE_LABELS[taskPickerFase] || taskPickerFase}
        initialFromMother={
          creatorFromMother ? madreToCreatorPrefill(creatorFromMother) : undefined
        }
        title={creatorFromMother ? 'Crear variante' : undefined}
      />

    </div>
  )
}
