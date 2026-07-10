'use client'

import { useState } from 'react'
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
  Edit3,
  Trash2,
  Loader2,
  AlertCircle,
  ClipboardList,
  Heart,
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
import { apiKey } from '@/lib/swr'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { microciclosApi } from '@/lib/api/microciclos'
import { gameModelsApi } from '@/lib/api/gameModels'
import { useEquipoStore } from '@/stores/equipoStore'
import { formatDate } from '@/lib/utils'
import type { VistaCompletaMicrociclo, Partido, PaginatedResponse, Jugador, Rival, GameModel } from '@/types'

import { SalaLunes } from '@/components/microciclos/SalaLunes'

// ============ Constants ============
const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  planificado: 'bg-blue-100 text-blue-700',
  en_curso: 'bg-emerald-100 text-emerald-700',
  completado: 'bg-violet-100 text-violet-700',
}

// ============ Helpers ============
function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
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
  const rangeLabel = `${formatDateShort(micro.fecha_inicio.slice(0, 10))} - ${formatDateShort(micro.fecha_fin.slice(0, 10))}`

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
      <SalaLunes
        microcicloId={id}
        data={data}
        jugadores={jugadores}
      />

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
