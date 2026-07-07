'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  CalendarDays,
  Plus,
  Loader2,
  ChevronRight,
  Target,
  Dumbbell,
  Brain,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Swords,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { apiKey } from '@/lib/swr'
import { microciclosApi } from '@/lib/api/microciclos'
import { rivalesApi } from '@/lib/api/partidos'
import { gameModelsApi } from '@/lib/api/gameModels'
import { useEquipoStore } from '@/stores/equipoStore'
import { formatDate } from '@/lib/utils'
import type { Microciclo, PaginatedResponse, Partido, Rival, GameModel } from '@/types'

// ============ Constants ============
const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  planificado: 'bg-blue-100 text-blue-700',
  en_curso: 'bg-emerald-100 text-emerald-700',
  completado: 'bg-violet-100 text-violet-700',
}

const ESTADO_ICONS: Record<string, React.ReactNode> = {
  borrador: <Clock className="h-3.5 w-3.5 text-gray-500" />,
  planificado: <CalendarDays className="h-3.5 w-3.5 text-blue-500" />,
  en_curso: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  completado: <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" />,
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

// ============ Component ============
export default function MicrociclosListPage() {
  const { equipoActivo } = useEquipoStore()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    partido_id: '',
    rival_id: '',
    game_model_id: '',
    objetivo_principal: '',
  })

  const { data, isLoading, error } = useSWR<PaginatedResponse<Microciclo>>(
    equipoActivo?.id
      ? apiKey('/microciclos', { equipo_id: equipoActivo.id, limit: 12, page })
      : null
  )

  // Rivales y game models para el formulario de creación
  const { data: rivalesData } = useSWR<PaginatedResponse<Rival>>(
    equipoActivo?.id ? apiKey('/rivales', { limit: 100 }) : null
  )
  const { data: gameModelsData } = useSWR<{ data: GameModel[] }>(
    equipoActivo?.id ? `game-models-${equipoActivo.id}` : null,
    () => gameModelsApi.list(equipoActivo!.id)
  )
  const { data: partidosData } = useSWR<PaginatedResponse<Partido>>(
    equipoActivo?.id
      ? apiKey('/partidos', { equipo_id: equipoActivo.id, solo_pendientes: true, limit: 50 })
      : null
  )

  const rivales = rivalesData?.data || []
  const gameModels = gameModelsData?.data || []
  const partidos = partidosData?.data || []

  const handleCreate = async () => {
    if (!equipoActivo?.id || !form.fecha_inicio || !form.fecha_fin) return
    setCreating(true)
    try {
      const created = await microciclosApi.create({
        equipo_id: equipoActivo.id,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        partido_id: form.partido_id || undefined,
        rival_id: form.rival_id || undefined,
        game_model_id: form.game_model_id || undefined,
        objetivo_principal: form.objetivo_principal || undefined,
      })
      toast.success('Microciclo creado')
      setShowCreate(false)
      setForm({ fecha_inicio: '', fecha_fin: '', partido_id: '', rival_id: '', game_model_id: '', objetivo_principal: '' })
      mutate(
        (key: string) => typeof key === 'string' && key.includes('/microciclos'),
        undefined,
        { revalidate: true }
      )
      // Auto-link sessions and match
      try {
        await microciclosApi.linkSesiones(created.id)
      } catch {
        // ignore
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al crear microciclo')
    } finally {
      setCreating(false)
    }
  }

  const microciclos = data?.data || []
  const total = data?.total || 0
  const pages = data?.pages || 1

  // Separar activo del resto
  const activo = microciclos.find(m => m.estado === 'en_curso')
  const resto = microciclos.filter(m => m.estado !== 'en_curso')

  return (
    <div className="animate-fade-in space-y-8">
      {/* ============ HEADER ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <CalendarDays className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">Microciclos</h1>
            {total > 0 && (
              <Badge variant="secondary" className="text-xs">{total}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Planificación semanal de {equipoActivo?.nombre || 'tu equipo'}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo microciclo
        </Button>
      </div>

      {/* ============ LOADING ============ */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* ============ ERROR ============ */}
      {error && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <p className="font-medium">Error al cargar microciclos</p>
            <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ============ EMPTY ============ */}
      {!isLoading && !error && microciclos.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              No hay microciclos aún
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Crea sesiones y vincúlalas a un microciclo para empezar a planificar
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" /> Crear primer microciclo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ============ MICROCICLO ACTIVO ============ */}
      {activo && (
        <div>
          <h2 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            EN CURSO
          </h2>
          <Link href={`/microciclos/${activo.id}`}>
            <Card className="hover:shadow-lg transition-all border-emerald-200 bg-emerald-50/30 cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={ESTADO_COLORS[activo.estado]}>
                        {ESTADO_ICONS[activo.estado]}
                        <span className="ml-1">{activo.estado.replace('_', ' ')}</span>
                      </Badge>
                      {activo.equipos && (
                        <Badge variant="outline" className="text-xs">{activo.equipos.nombre}</Badge>
                      )}
                    </div>

                    <p className="text-lg font-bold">
                      {formatDateShort(activo.fecha_inicio.slice(0, 10))} — {formatDateShort(activo.fecha_fin.slice(0, 10))}
                    </p>

                    {/* Objetivos */}
                    <div className="flex flex-wrap gap-3 mt-3">
                      {activo.objetivo_principal && (
                        <div className="flex items-center gap-1.5 text-sm text-emerald-700">
                          <Target className="h-4 w-4" />
                          <span className="font-medium">{activo.objetivo_principal}</span>
                        </div>
                      )}
                      {activo.objetivo_tactico && (
                        <div className="flex items-center gap-1.5 text-sm text-blue-700">
                          <Brain className="h-4 w-4" />
                          <span>{activo.objetivo_tactico}</span>
                        </div>
                      )}
                      {activo.objetivo_fisico && (
                        <div className="flex items-center gap-1.5 text-sm text-orange-700">
                          <Dumbbell className="h-4 w-4" />
                          <span>{activo.objetivo_fisico}</span>
                        </div>
                      )}
                    </div>

                    {/* Partido */}
                    {activo.partidos && (
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <Users className="h-4 w-4 text-amber-600" />
                        <span>
                          {activo.partidos.localia === 'local' ? 'vs' : '@'}{' '}
                          <span className="font-semibold">{activo.partidos.rival?.nombre || activo.partidos.rival?.nombre_corto || 'Rival'}</span>
                        </span>
                        <span className="text-muted-foreground">
                          {formatDate(activo.partidos.fecha)}
                        </span>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* ============ LISTA DE MICROCICLOS ============ */}
      {resto.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            {activo ? 'ANTERIORES' : 'MICROCICLOS'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resto.map((m) => (
              <Link key={m.id} href={`/microciclos/${m.id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer group h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={ESTADO_COLORS[m.estado] || ESTADO_COLORS.borrador}>
                        {ESTADO_ICONS[m.estado]}
                        <span className="ml-1 text-[10px]">{m.estado.replace('_', ' ')}</span>
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                    </div>

                    <p className="font-semibold text-sm">
                      {formatDateShort(m.fecha_inicio.slice(0, 10))} — {formatDateShort(m.fecha_fin.slice(0, 10))}
                    </p>

                    {m.objetivo_principal && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                        {m.objetivo_principal}
                      </p>
                    )}

                    {/* Partido info */}
                    {m.partidos && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-700">
                        <Swords className="h-3 w-3" />
                        <span>
                          {m.partidos.localia === 'local' ? 'vs' : '@'}{' '}
                          {m.partidos.rival?.nombre || m.partidos.rival?.nombre_corto || 'Rival'}
                        </span>
                      </div>
                    )}

                    {m.equipos && (
                      <p className="text-[10px] text-muted-foreground mt-1.5">{m.equipos.nombre}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ============ PAGINACION ============ */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage(p => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* ============ CREATE DIALOG ============ */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && setShowCreate(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo microciclo</DialogTitle>
            <DialogDescription>
              Crea una semana de planificación y vincúlala al rival, partido y modelo de juego.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={form.fecha_fin}
                  onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Partido de referencia</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.partido_id}
                onChange={(e) => setForm({ ...form, partido_id: e.target.value })}
              >
                <option value="">Sin partido asignado</option>
                {partidos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatDate(p.fecha)} - {p.localia === 'local' ? 'vs' : '@'} {p.rival?.nombre || 'Rival'}
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !form.fecha_inicio || !form.fecha_fin}
            >
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear microciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
