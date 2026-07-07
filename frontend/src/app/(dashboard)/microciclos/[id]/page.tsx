'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  Target,
  Brain,
  Dumbbell,
  Swords,
  Users,
  Clock,
  FileText,
  Edit3,
  Trash2,
  Loader2,
  ChevronRight,
  AlertCircle,
  ClipboardList,
  Plus,
  Heart,
  Apple,
  Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiKey } from '@/lib/swr'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { microciclosApi } from '@/lib/api/microciclos'
import { rivalesApi } from '@/lib/api/partidos'
import { gameModelsApi } from '@/lib/api/gameModels'
import { useEquipoStore } from '@/stores/equipoStore'
import { formatDate } from '@/lib/utils'
import type { VistaCompletaMicrociclo, Partido, PaginatedResponse, Jugador, Rival, GameModel } from '@/types'

import { WarRoomTimeline } from '@/components/microciclos/WarRoomTimeline'
import { LoadChart } from '@/components/microciclos/LoadChart'
import { SalaLunes } from '@/components/microciclos/SalaLunes'
import { WarRoomAlerts } from '@/components/microciclos/WarRoomAlerts'
import { WarRoomRivalResumen } from '@/components/microciclos/WarRoomRivalResumen'
import { WarRoomVideos } from '@/components/microciclos/WarRoomVideos'
import { WarRoomCargas } from '@/components/microciclos/WarRoomCargas'
import { PlanPartidoEditor } from '@/components/plan-partido/PlanPartidoEditor'

// ============ Constants ============
const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  planificado: 'bg-blue-100 text-blue-700',
  en_curso: 'bg-emerald-100 text-emerald-700',
  completado: 'bg-violet-100 text-violet-700',
}

const ESTADO_SESION_COLORS: Record<string, { bg: string; label: string }> = {
  completada: { bg: 'bg-green-100 text-green-800', label: 'Completada' },
  planificada: { bg: 'bg-blue-100 text-blue-800', label: 'Planificada' },
  borrador: { bg: 'bg-gray-100 text-gray-800', label: 'Borrador' },
  cancelada: { bg: 'bg-red-100 text-red-800', label: 'Cancelada' },
}

// ============ Helpers ============
function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const current = new Date(start + 'T12:00:00')
  const endDate = new Date(end + 'T12:00:00')
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

// ============ Component ============
export default function MicrocicloDetallePage() {
  const params = useParams()
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()
  const id = params.id as string

  // WAR ROOM — uses VistaCompletaMicrociclo (includes plan_partido, informe_rival, alertas)
  const { data, isLoading: loading, error: swrError } = useSWR<VistaCompletaMicrociclo>(
    apiKey(`/microciclos/${id}/completo`)
  )
  const error = swrError ? (swrError.message || 'Error al cargar microciclo') : null

  // Jugadores for SalaLunes
  const { data: jugadoresResponse } = useSWR<PaginatedResponse<Jugador>>(
    data?.microciclo?.equipo_id
      ? apiKey('/jugadores', { equipo_id: data.microciclo.equipo_id, limit: 100 })
      : null
  )
  const jugadores = jugadoresResponse?.data ?? []

  // Upcoming matches for edit dialog
  const { data: matchesResponse } = useSWR<PaginatedResponse<Partido>>(
    equipoActivo?.id
      ? apiKey('/partidos', {
          equipo_id: equipoActivo.id,
          solo_pendientes: true,
          orden: 'fecha',
          direccion: 'asc',
          limit: 20,
        })
      : null
  )
  const upcomingMatches = matchesResponse?.data || []

  // Edit dialog state
  const [showEdit, setShowEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    partido_id: '',
    rival_id: '',
    game_model_id: '',
    objetivo_principal: '',
    objetivo_tactico: '',
    objetivo_fisico: '',
    notas: '',
  })

  // Select options for edit dialog
  const { data: rivalesData } = useSWR<PaginatedResponse<Rival>>(
    equipoActivo?.id ? apiKey('/rivales', { limit: 100 }) : null
  )
  const { data: gameModelsData } = useSWR<{ data: GameModel[] }>(
    equipoActivo?.id ? `game-models-${equipoActivo.id}` : null,
    () => gameModelsApi.list(equipoActivo!.id)
  )
  const rivales = rivalesData?.data || []
  const gameModels = gameModelsData?.data || []

  // Delete dialog
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const openEdit = () => {
    if (!data) return
    const m = data.microciclo
    setForm({
      partido_id: m.partido_id || '',
      rival_id: m.rival_id || '',
      game_model_id: m.game_model_id || '',
      objetivo_principal: m.objetivo_principal || '',
      objetivo_tactico: m.objetivo_tactico || '',
      objetivo_fisico: m.objetivo_fisico || '',
      notas: m.notas || '',
    })
    setShowEdit(true)
  }

  const handleSave = async () => {
    if (!data) return
    setSaving(true)
    try {
      await microciclosApi.update(data.microciclo.id, {
        partido_id: form.partido_id || undefined,
        rival_id: form.rival_id || undefined,
        game_model_id: form.game_model_id || undefined,
        objetivo_principal: form.objetivo_principal || undefined,
        objetivo_tactico: form.objetivo_tactico || undefined,
        objetivo_fisico: form.objetivo_fisico || undefined,
        notas: form.notas || undefined,
      })
      setShowEdit(false)
      mutate((key: string) => typeof key === 'string' && key.includes('/microciclos'), undefined, { revalidate: true })
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!data) return
    setDeleting(true)
    try {
      await microciclosApi.delete(data.microciclo.id)
      router.replace('/')
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  // Weekly timeline
  const weekDates = useMemo(() => {
    if (!data) return []
    return getDatesInRange(
      data.microciclo.fecha_inicio.slice(0, 10),
      data.microciclo.fecha_fin.slice(0, 10),
    )
  }, [data])

  const sessionsByDate = useMemo(() => {
    if (!data) return {}
    const map: Record<string, typeof data.sesiones> = {}
    data.sesiones.forEach((s) => {
      const key = s.fecha.split('T')[0]
      if (!map[key]) map[key] = []
      map[key].push(s)
    })
    return map
  }, [data])

  // Loading
  if (loading) return <DetailPageSkeleton />

  // Error
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">{error || 'Microciclo no encontrado'}</p>
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver al Dashboard
        </Button>
      </div>
    )
  }

  const micro = data.microciclo
  const partido = micro.partidos
  const rangeLabel = `${formatDateShort(micro.fecha_inicio.slice(0, 10))} - ${formatDateShort(micro.fecha_fin.slice(0, 10))}`
  const nuevaSesionUrl = `/sesiones/nueva?microciclo_id=${id}${data.plan_partido?.id ? `&plan_partido_id=${data.plan_partido.id}` : ''}`

  return (
    <div className="animate-fade-in space-y-6">
      {/* ============ HEADER ============ */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Microciclo</h1>
              <Badge className={ESTADO_COLORS[micro.estado] || ESTADO_COLORS.borrador}>
                {micro.estado.replace('_', ' ')}
              </Badge>
              {micro.equipos && (
                <Badge variant="outline" className="text-xs">{micro.equipos.nombre}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{rangeLabel}</span>
            </div>

            {/* Objectives row */}
            <div className="flex flex-wrap gap-3 mt-3">
              {micro.objetivo_principal && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Target className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">{micro.objetivo_principal}</span>
                </div>
              )}
              {micro.objetivo_tactico && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span>{micro.objetivo_tactico}</span>
                </div>
              )}
              {micro.objetivo_fisico && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Dumbbell className="h-4 w-4 text-orange-600" />
                  <span>{micro.objetivo_fisico}</span>
                </div>
              )}
            </div>

            {/* Rival + Game Model row */}
            <div className="flex flex-wrap gap-3 mt-2">
              {micro.rivales && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Swords className="h-4 w-4 text-amber-600" />
                  <span className="text-muted-foreground">Rival:</span>
                  <span className="font-medium">{micro.rivales.nombre_corto || micro.rivales.nombre}</span>
                </div>
              )}
              {micro.game_models && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Brain className="h-4 w-4 text-violet-600" />
                  <span className="text-muted-foreground">Modelo:</span>
                  <span className="font-medium">{micro.game_models.nombre || micro.game_models.sistema_juego}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Edit3 className="h-4 w-4 mr-1" /> Editar
            </Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
            </Button>
          </div>
        </div>
      </div>

      {/* ============ WAR ROOM GRID ============ */}
      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">🏟️ War Room</TabsTrigger>
          <TabsTrigger value="sala-lunes">📹 Sala del Lunes</TabsTrigger>
          <TabsTrigger value="plan-partido">📋 Plan de Partido</TabsTrigger>
        </TabsList>

        {/* ========== TAB: WAR ROOM ========== */}
        <TabsContent value="resumen" className="space-y-6 mt-4">

          {/* ROW 1: WarRoomTimeline + Alertas */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Week timeline — 3 cols wide */}
            <div className="lg:col-span-3">
              <WarRoomTimeline
                microcicloId={id}
                weekDates={weekDates}
                sessionsByDate={sessionsByDate}
                partido={partido}
              />
            </div>
            {/* Alertas panel — 1 col */}
            <div className="lg:col-span-1">
              <WarRoomAlerts alertas={data.alertas || []} />
            </div>
          </div>

          {/* ROW 2: Plantilla + Partido/Rival + Cargas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Plantilla */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Plantilla
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-green-50">
                    <p className="text-2xl font-bold text-green-700">{data.plantilla.disponibles}</p>
                    <p className="text-[11px] text-green-600">Disponibles</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-50">
                    <p className="text-2xl font-bold text-red-700">{data.plantilla.lesionados}</p>
                    <p className="text-[11px] text-red-600">Lesionados</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-yellow-50">
                    <p className="text-2xl font-bold text-yellow-700">{data.plantilla.en_recuperacion || 0}</p>
                    <p className="text-[11px] text-yellow-600">Recuperación</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-50">
                    <p className="text-2xl font-bold text-amber-700">{data.plantilla.sancionados}</p>
                    <p className="text-[11px] text-amber-600">Sancionados</p>
                  </div>
                </div>

                {/* Lesionados list */}
                {data.plantilla.jugadores_lesionados.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[11px] font-semibold text-red-700">🚑 Lesionados</p>
                    {data.plantilla.jugadores_lesionados.slice(0, 2).map((j) => (
                      <div key={j.id} className="flex items-center gap-2 p-1.5 rounded bg-red-50/60">
                        <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold text-red-700 shrink-0">
                          {j.dorsal || '?'}
                        </span>
                        <span className="text-[11px] font-medium truncate">{j.nombre}</span>
                        {j.fecha_vuelta_estimada && (
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                            {formatDateShort(j.fecha_vuelta_estimada.slice(0, 10))}
                          </span>
                        )}
                      </div>
                    ))}
                    {data.plantilla.jugadores_lesionados.length > 2 && (
                      <p className="text-[10px] text-muted-foreground text-center">
                        +{data.plantilla.jugadores_lesionados.length - 2} más
                      </p>
                    )}
                  </div>
                )}

                {/* Sancionados */}
                {data.plantilla.jugadores_sancionados.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[11px] font-semibold text-amber-700">🟡 Sancionados</p>
                    {data.plantilla.jugadores_sancionados.map((j) => (
                      <div key={j.id} className="flex items-center gap-2 p-1.5 rounded bg-amber-50/60">
                        <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700 shrink-0">
                          {j.dorsal || '?'}
                        </span>
                        <span className="text-[11px] font-medium truncate">{j.nombre}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full mt-3 text-[11px]" asChild>
                  <Link href="/plantilla">
                    Ver plantilla completa
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Partido + Rival */}
            <WarRoomRivalResumen
              rivalInfo={data.informe_rival}
              partido={partido}
            />

            {/* Cargas + Nutrición */}
            <div className="space-y-4">
              <WarRoomCargas rpe={data.rpe} />

              {/* Nutrición quick */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Apple className="h-4 w-4 text-green-600" />
                    Nutrición
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-600">🍽️</span>
                      <span>Plan PRE-partido asignado</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-blue-600">💊</span>
                      <span>Suplementación actualizada</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-1 text-[10px]" asChild>
                      <Link href="/nutricion">
                        <Apple className="h-3 w-3 mr-1" /> Ver nutrición
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ROW 3: Videos */}
          <WarRoomVideos
            microcicloId={id}
            planPartido={data.plan_partido ? { id: data.plan_partido.id } : null}
          />

          {/* ROW 4: Lista de Sesiones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Sesiones ({data.sesiones.length})
              </h2>
              <Button size="sm" asChild>
                <Link href={nuevaSesionUrl}>
                  <Plus className="h-4 w-4 mr-1" /> Nueva sesión
                </Link>
              </Button>
            </div>
            {data.sesiones.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>No hay sesiones asociadas a este microciclo</p>
                  <Button variant="outline" className="mt-3" asChild>
                    <Link href={nuevaSesionUrl}>
                      <Plus className="h-4 w-4 mr-2" /> Crear sesión
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {data.sesiones.map((s) => {
                  const estadoInfo = ESTADO_SESION_COLORS[s.estado] || ESTADO_SESION_COLORS.borrador
                  const rpeInfo = data.rpe.registros_por_sesion[s.id]
                  const mdMap: Record<string, { bg: string; text: string }> = {
                    'MD+1': { bg: 'bg-green-100', text: 'text-green-700' },
                    'MD-4': { bg: 'bg-red-100', text: 'text-red-700' },
                    'MD-3': { bg: 'bg-orange-100', text: 'text-orange-700' },
                    'MD-2': { bg: 'bg-blue-100', text: 'text-blue-700' },
                    'MD-1': { bg: 'bg-purple-100', text: 'text-purple-700' },
                    'MD': { bg: 'bg-amber-100', text: 'text-amber-700' },
                  }
                  const mdStyle = s.match_day ? mdMap[s.match_day] : null

                  return (
                    <Link
                      key={s.id}
                      href={`/sesiones/${s.id}`}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors group"
                    >
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        mdStyle ? `${mdStyle.bg} ${mdStyle.text}` : 'bg-gray-100 text-gray-600'
                      }`}>
                        {s.match_day || '\u2014'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium group-hover:text-primary transition-colors">{s.titulo}</span>
                          <Badge variant="outline" className={`text-[10px] ${estadoInfo.bg}`}>
                            {estadoInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{formatDateLong(s.fecha.slice(0, 10))}</span>
                          {s.duracion_total && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {s.duracion_total} min
                            </span>
                          )}
                          {s.num_tareas > 0 && <span>{s.num_tareas} tareas</span>}
                          <Badge variant="secondary" className="text-[10px]">{s.fase_juego_principal || 'General'}</Badge>
                        </div>
                      </div>

                      {rpeInfo?.rpe_promedio && (
                        <div className="text-center shrink-0">
                          <p className={`text-lg font-bold ${
                            rpeInfo.rpe_promedio >= 7 ? 'text-red-600' : rpeInfo.rpe_promedio >= 5 ? 'text-amber-600' : 'text-green-600'
                          }`}>
                            {rpeInfo.rpe_promedio}
                          </p>
                          <p className="text-[10px] text-muted-foreground">RPE</p>
                        </div>
                      )}

                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* ROW 5: Carga gráfico (full-width) */}
          <LoadChart sesiones={data.sesiones} rpe={data.rpe} />

          {/* ROW 6: Notas */}
          {micro.notas && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{micro.notas}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== TAB: SALA DEL LUNES ========== */}
        <TabsContent value="sala-lunes" className="mt-4">
          <SalaLunes
            microcicloId={id}
            data={data}
            jugadores={jugadores}
          />
        </TabsContent>

        {/* ========== TAB: PLAN DE PARTIDO ========== */}
        <TabsContent value="plan-partido" className="mt-4">
          <PlanPartidoEditor
            microcicloId={id}
            partidoId={partido?.id || micro.partido_id || ''}
            plan={data.plan_partido || null}
            jugadores={jugadores}
            onSaved={(plan) => {
              mutate((key: string) => typeof key === 'string' && key.includes(`/microciclos/${id}`), undefined, { revalidate: true })
              toast.success('Plan de partido actualizado')
            }}
          />
        </TabsContent>
      </Tabs>

      {/* ============ EDIT DIALOG ============ */}
      <Dialog open={showEdit} onOpenChange={(open) => !open && setShowEdit(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Microciclo</DialogTitle>
            <DialogDescription>
              Semana del {rangeLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Partido de referencia</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.partido_id}
                onChange={(e) => setForm({ ...form, partido_id: e.target.value })}
              >
                <option value="">Sin partido asignado</option>
                {upcomingMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatDate(m.fecha)} - {m.localia === 'local' ? 'vs' : '@'} {m.rival?.nombre || 'Rival'} ({m.competicion})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rival</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.rival_id}
                  onChange={(e) => setForm({ ...form, rival_id: e.target.value })}
                >
                  <option value="">Sin rival</option>
                  {rivales.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre_corto || r.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Modelo de juego</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.game_model_id}
                  onChange={(e) => setForm({ ...form, game_model_id: e.target.value })}
                >
                  <option value="">Sin modelo</option>
                  {gameModels.map((gm) => (
                    <option key={gm.id} value={gm.id}>
                      {gm.nombre || gm.sistema_juego || 'Modelo'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Objetivo principal</Label>
              <Input
                placeholder="Ej: Mejorar salida de balón bajo presión"
                value={form.objetivo_principal}
                onChange={(e) => setForm({ ...form, objetivo_principal: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Objetivo táctico</Label>
                <Input
                  placeholder="Ej: Progresión por interior"
                  value={form.objetivo_tactico}
                  onChange={(e) => setForm({ ...form, objetivo_tactico: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Objetivo físico</Label>
                <Input
                  placeholder="Ej: Potencia aeróbica"
                  value={form.objetivo_fisico}
                  onChange={(e) => setForm({ ...form, objetivo_fisico: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                placeholder="Observaciones sobre la semana..."
                rows={3}
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DELETE DIALOG ============ */}
      <Dialog open={showDelete} onOpenChange={(open) => !open && setShowDelete(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar microciclo</DialogTitle>
            <DialogDescription>
              Se eliminará el microciclo pero las sesiones asociadas se mantendrán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
