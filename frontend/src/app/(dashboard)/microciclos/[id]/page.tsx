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
import { apiKey } from '@/lib/swr'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { microciclosApi, CreateMicrocicloData } from '@/lib/api/microciclos'
import { useEquipoStore } from '@/stores/equipoStore'
import { formatDate } from '@/lib/utils'
import type { MicrocicloCompleto, Partido, PaginatedResponse, MatchDay } from '@/types'

import { WeekView } from '@/components/microciclos/WeekView'
import { LoadChart } from '@/components/microciclos/LoadChart'
import { MATCH_DAY_COLORS } from '@/components/microciclos/SessionCard'

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

export default function MicrocicloDetallePage() {
  const params = useParams()
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()
  const id = params.id as string

  // SWR for microciclo completo
  const { data, isLoading: loading, error: swrError } = useSWR<MicrocicloCompleto>(
    apiKey(`/microciclos/${id}/completo`)
  )
  const error = swrError ? (swrError.message || 'Error al cargar microciclo') : null

  // SWR for upcoming matches (for the edit dialog)
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

  // Edit dialog
  const [showEdit, setShowEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    partido_id: '',
    objetivo_principal: '',
    objetivo_tactico: '',
    objetivo_fisico: '',
    notas: '',
  })

  // Delete dialog
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const openEdit = () => {
    if (!data) return
    const m = data.microciclo
    setForm({
      partido_id: m.partido_id || '',
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

  // Weekly timeline data
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

  // Loading state
  if (loading) {
    return <DetailPageSkeleton />
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">{error || 'Microciclo no encontrado'}</p>
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Dashboard
        </Button>
      </div>
    )
  }

  const micro = data.microciclo
  const partido = micro.partidos
  const rangeLabel = `${formatDateShort(micro.fecha_inicio.slice(0, 10))} - ${formatDateShort(micro.fecha_fin.slice(0, 10))}`

  return (
    <div className="animate-fade-in space-y-6">
      {/* ============ Header ============ */}
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
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {rangeLabel}
              {micro.equipos && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{micro.equipos.nombre}</span>
                </>
              )}
            </p>

            {/* Objectives */}
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

      {/* ============ Card de Partido ============ */}
      {partido && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-amber-50">
                  {partido.rival?.escudo_url ? (
                    <Image src={partido.rival.escudo_url} alt="" width={24} height={24} className="object-contain" unoptimized />
                  ) : (
                    <Swords className="h-6 w-6 text-amber-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold">
                      {partido.localia === 'local' ? 'vs' : '@'}{' '}
                      {partido.rival?.nombre || 'Rival'}
                    </span>
                    {partido.rival?.nombre_corto && (
                      <Badge variant="outline" className="text-[10px]">{partido.rival.nombre_corto}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{formatDateLong(partido.fecha.slice(0, 10))}</span>
                    {partido.hora && <span>{partido.hora}h</span>}
                    {partido.competicion && <Badge variant="secondary" className="text-[10px]">{partido.competicion}</Badge>}
                    <Badge variant="outline" className="text-[10px]">{partido.localia === 'local' ? 'Local' : 'Visitante'}</Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {partido.goles_favor !== undefined && partido.goles_favor !== null && (
                  <div className="text-center">
                    <span className={`text-2xl font-bold ${
                      partido.goles_favor > (partido.goles_contra || 0) ? 'text-green-700'
                        : partido.goles_favor < (partido.goles_contra || 0) ? 'text-red-700'
                          : 'text-amber-700'
                    }`}>
                      {partido.goles_favor} - {partido.goles_contra}
                    </span>
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {partido.resultado || (
                        partido.goles_favor > (partido.goles_contra || 0) ? 'Victoria'
                          : partido.goles_favor < (partido.goles_contra || 0) ? 'Derrota' : 'Empate'
                      )}
                    </Badge>
                  </div>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/partidos/${partido.id}`}>
                    Ver partido <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ Disponibilidad de Plantilla ============ */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Disponibilidad de Plantilla
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <Card className="card-hover border-t-4 border-t-green-500">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{data.plantilla.disponibles}</p>
              <p className="text-sm text-green-600">Disponibles</p>
            </CardContent>
          </Card>
          <Card className="card-hover border-t-4 border-t-red-500">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-700">{data.plantilla.lesionados}</p>
              <p className="text-sm text-red-600">Lesionados</p>
            </CardContent>
          </Card>
          <Card className="card-hover border-t-4 border-t-yellow-500">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-700">{data.plantilla.en_recuperacion || 0}</p>
              <p className="text-sm text-yellow-600">Recuperacion</p>
            </CardContent>
          </Card>
          <Card className="card-hover border-t-4 border-t-amber-500">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-700">{data.plantilla.sancionados}</p>
              <p className="text-sm text-amber-600">Sancionados</p>
            </CardContent>
          </Card>
        </div>

        {/* Injured/Sanctioned lists */}
        {(data.plantilla.jugadores_lesionados.length > 0 || data.plantilla.jugadores_sancionados.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {data.plantilla.jugadores_lesionados.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-700">Jugadores lesionados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.plantilla.jugadores_lesionados.map((j) => (
                    <div key={j.id} className="flex items-center gap-3 p-2 rounded-lg bg-red-50/50">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">
                        {j.dorsal || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{j.nombre} {j.apellidos}</p>
                        <p className="text-[10px] text-muted-foreground">{j.posicion_principal}</p>
                      </div>
                      {j.fecha_vuelta_estimada && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          Vuelta: {formatDateShort(j.fecha_vuelta_estimada.slice(0, 10))}
                        </span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {data.plantilla.jugadores_sancionados.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-700">Jugadores sancionados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.plantilla.jugadores_sancionados.map((j) => (
                    <div key={j.id} className="flex items-center gap-3 p-2 rounded-lg bg-amber-50/50">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
                        {j.dorsal || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{j.nombre} {j.apellidos}</p>
                        <p className="text-[10px] text-muted-foreground">{j.posicion_principal}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* ============ Timeline Semanal ============ */}
      <WeekView
        weekDates={weekDates}
        sessionsByDate={sessionsByDate}
        partido={partido}
      />

      {/* ============ Lista de Sesiones ============ */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Sesiones ({data.sesiones.length})
        </h2>
        {data.sesiones.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No hay sesiones asociadas a este microciclo</p>
              <Button variant="outline" className="mt-3" asChild>
                <Link href="/sesiones/nueva">
                  <Plus className="h-4 w-4 mr-2" /> Crear sesion
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.sesiones.map((s) => {
              const mdColors = s.match_day ? MATCH_DAY_COLORS[s.match_day] : null
              const estadoInfo = ESTADO_SESION_COLORS[s.estado] || ESTADO_SESION_COLORS.borrador
              const rpeInfo = data.rpe.registros_por_sesion[s.id]

              return (
                <Link
                  key={s.id}
                  href={`/sesiones/${s.id}`}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors group"
                >
                  {/* MD badge */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    mdColors ? `${mdColors.bg} ${mdColors.text}` : 'bg-gray-100 text-gray-600'
                  }`}>
                    {s.match_day || '\u2014'}
                  </div>

                  {/* Session info */}
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
                      {s.num_tareas > 0 && (
                        <span>{s.num_tareas} tareas</span>
                      )}
                    </div>
                  </div>

                  {/* RPE */}
                  {rpeInfo && (
                    <div className="text-center shrink-0">
                      <p className={`text-lg font-bold ${
                        rpeInfo.rpe_promedio >= 7 ? 'text-red-600' : rpeInfo.rpe_promedio >= 5 ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {rpeInfo.rpe_promedio}
                      </p>
                      <p className="text-[10px] text-muted-foreground">RPE ({rpeInfo.num_registros})</p>
                    </div>
                  )}

                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ============ Carga de Entrenamiento (RPE) ============ */}
      <LoadChart sesiones={data.sesiones} rpe={data.rpe} />

      {/* ============ Notas ============ */}
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

      {/* ============ Edit Dialog ============ */}
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

            <div className="space-y-2">
              <Label>Objetivo principal</Label>
              <Input
                placeholder="Ej: Mejorar salida de balon bajo presion"
                value={form.objetivo_principal}
                onChange={(e) => setForm({ ...form, objetivo_principal: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Objetivo tactico</Label>
                <Input
                  placeholder="Ej: Progresion por interior"
                  value={form.objetivo_tactico}
                  onChange={(e) => setForm({ ...form, objetivo_tactico: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Objetivo fisico</Label>
                <Input
                  placeholder="Ej: Potencia aerobica"
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

      {/* ============ Delete Dialog ============ */}
      <Dialog open={showDelete} onOpenChange={(open) => !open && setShowDelete(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar microciclo</DialogTitle>
            <DialogDescription>
              Se eliminara el microciclo pero las sesiones asociadas se mantendran.
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
