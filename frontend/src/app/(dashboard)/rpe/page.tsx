'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Heart,
  Loader2,
  RefreshCw,
  Moon,
  Zap,
  Brain,
  Smile,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ListPageSkeleton } from '@/components/ui/page-skeletons'
import { PageHeader } from '@/components/ui/page-header'
import { PlayerStatusBadges } from '@/components/player/PlayerStatusBadges'
import { useEquipoStore } from '@/stores/equipoStore'
import { rpeApi } from '@/lib/api/rpe'
import { cargaApi } from '@/lib/api/carga'
import { jugadoresApi, Jugador } from '@/lib/api/jugadores'
import { apiKey } from '@/lib/swr'
import { formatDate } from '@/lib/utils'
import type { CargaEquipoResponse, CargaJugador, NivelCarga, Sesion, PaginatedResponse } from '@/types'

const WELLNESS_FIELDS = [
  { key: 'sueno', label: 'Sueno', icon: Moon, color: 'text-indigo-600' },
  { key: 'fatiga', label: 'Fatiga', icon: Zap, color: 'text-amber-600' },
  { key: 'dolor', label: 'Dolor', icon: Heart, color: 'text-red-600' },
  { key: 'estres', label: 'Estres', icon: Brain, color: 'text-purple-600' },
  { key: 'humor', label: 'Humor', icon: Smile, color: 'text-emerald-600' },
] as const

function getNivelColor(nivel: NivelCarga): string {
  switch (nivel) {
    case 'critico': return 'bg-red-500'
    case 'alto': return 'bg-orange-500'
    case 'optimo': return 'bg-green-500'
    case 'bajo': return 'bg-blue-400'
    default: return 'bg-gray-400'
  }
}

function getNivelBadgeClass(nivel: NivelCarga): string {
  switch (nivel) {
    case 'critico': return 'bg-red-100 text-red-800 border-red-200'
    case 'alto': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'optimo': return 'bg-green-100 text-green-800 border-green-200'
    case 'bajo': return 'bg-blue-100 text-blue-800 border-blue-200'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getRowHighlight(nivel: NivelCarga): string {
  switch (nivel) {
    case 'critico': return 'bg-red-50/60'
    case 'alto': return 'bg-orange-50/40'
    default: return ''
  }
}

export default function RPEPage() {
  const { equipoActivo } = useEquipoStore()

  // SWR data fetching
  const { data: cargaData, isLoading: loadingCarga } = useSWR<CargaEquipoResponse>(
    equipoActivo?.id ? `/carga/equipo/${equipoActivo.id}` : null
  )

  const { data: sesionesData } = useSWR<PaginatedResponse<Sesion>>(
    apiKey('/sesiones', {
      equipo_id: equipoActivo?.id,
      estado: 'completada',
      limit: 10,
    }, ['equipo_id'])
  )

  const { data: jugadoresData } = useSWR<{ data: Jugador[]; total: number }>(
    apiKey('/jugadores', {
      equipo_id: equipoActivo?.id,
      estado: 'activo',
    }, ['equipo_id'])
  )

  const sesiones = sesionesData?.data || []
  const jugadores = jugadoresData?.data || []
  const loading = loadingCarga

  // Recalculating
  const [recalculating, setRecalculating] = useState(false)

  const handleRecalculate = async () => {
    if (!equipoActivo?.id) return
    setRecalculating(true)
    try {
      await cargaApi.recalcular(equipoActivo.id)
      mutate((key: string) => typeof key === 'string' && key.includes('/carga'), undefined, { revalidate: true })
    } catch (err: any) {
      toast.error(err.message || 'Error al recalcular')
    } finally {
      setRecalculating(false)
    }
  }

  // Wellness editing
  const [editingWellness, setEditingWellness] = useState<string | null>(null)
  const [wellnessInput, setWellnessInput] = useState('')
  const [savingWellness, setSavingWellness] = useState(false)

  const handleWellnessClick = (jugadorId: string, currentValue: number | null) => {
    setEditingWellness(jugadorId)
    setWellnessInput(currentValue?.toString() || '')
  }

  const handleWellnessSave = async (jugadorId: string) => {
    const val = parseInt(wellnessInput)
    if (isNaN(val) || val < 1 || val > 10) {
      setEditingWellness(null)
      return
    }
    setSavingWellness(true)
    try {
      await cargaApi.updateWellness(jugadorId, val)
      mutate((key: string) => typeof key === 'string' && key.includes('/carga'), undefined, { revalidate: true })
    } catch (err: any) {
      console.error('Error saving wellness:', err)
    } finally {
      setSavingWellness(false)
      setEditingWellness(null)
    }
  }

  // Register RPE dialog (keep manual RPE)
  const [showRegister, setShowRegister] = useState(false)
  const [selectedSesion, setSelectedSesion] = useState('')
  const [selectedJugador, setSelectedJugador] = useState('')
  const [rpeForm, setRpeForm] = useState({
    rpe: 5,
    duracion_percibida: 0,
    sueno: 5,
    fatiga: 5,
    dolor: 1,
    estres: 3,
    humor: 5,
    notas: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!selectedJugador) return
    setSaving(true)
    try {
      await rpeApi.create({
        jugador_id: selectedJugador,
        sesion_id: selectedSesion || undefined,
        fecha: new Date().toISOString().split('T')[0],
        rpe: rpeForm.rpe,
        duracion_percibida: rpeForm.duracion_percibida || undefined,
        sueno: rpeForm.sueno,
        fatiga: rpeForm.fatiga,
        dolor: rpeForm.dolor,
        estres: rpeForm.estres,
        humor: rpeForm.humor,
        notas: rpeForm.notas || undefined,
      })
      setShowRegister(false)
      mutate((key: string) => typeof key === 'string' && (key.includes('/rpe') || key.includes('/carga')), undefined, { revalidate: true })
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar RPE')
    } finally {
      setSaving(false)
    }
  }

  const data = cargaData?.data || []
  const resumen = cargaData?.resumen

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="RPE / Wellness"
        description="Control de carga auto-calculada y bienestar de los jugadores"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRecalculate}
              disabled={recalculating}
            >
              {recalculating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Recalcular
            </Button>
            <Button onClick={() => setShowRegister(true)}>
              <Activity className="h-4 w-4 mr-2" />
              Registrar RPE
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="animate-fade-in">
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : resumen ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{resumen.carga_media.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Carga media 7d (UA)</p>
            </CardContent>
          </Card>
          <Card className={resumen.jugadores_riesgo > 0 ? 'border-orange-300' : ''}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${resumen.jugadores_riesgo > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
              <p className={`text-2xl font-bold ${resumen.jugadores_riesgo > 0 ? 'text-orange-600' : ''}`}>
                {resumen.jugadores_riesgo}
              </p>
              <p className="text-xs text-muted-foreground">Jugadores en riesgo</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Heart className="h-5 w-5 mx-auto mb-1 text-rose-500" />
              <p className="text-2xl font-bold">
                {resumen.wellness_medio?.toFixed(1) || '-'}
              </p>
              <p className="text-xs text-muted-foreground">Wellness medio</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Player table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Carga por jugador</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Sin datos de carga. Pulsa "Recalcular" para generar datos desde sesiones y partidos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium w-8">#</th>
                    <th className="pb-2 font-medium">Jugador</th>
                    <th className="pb-2 font-medium">Estado</th>
                    <th className="pb-2 font-medium text-center">Carga 7d</th>
                    <th className="pb-2 font-medium text-center">ACWR</th>
                    <th className="pb-2 font-medium text-center">Nivel</th>
                    <th className="pb-2 font-medium text-center">Wellness</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr
                      key={item.jugador_id}
                      className={`border-b last:border-0 row-hover ${getRowHighlight(item.nivel_carga)}`}
                    >
                      <td className="py-2.5 text-xs font-bold text-muted-foreground text-center">
                        {item.dorsal || '-'}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {item.nombre} {item.apellidos}
                          </span>
                          {item.posicion_principal && (
                            <Badge variant="outline" className="text-[9px]">
                              {item.posicion_principal}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <PlayerStatusBadges
                          estado={item.estado || 'activo'}
                          nivelCarga={item.nivel_carga}
                        />
                      </td>
                      <td className="py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`inline-block w-2 h-2 rounded-full ${getNivelColor(item.nivel_carga)}`} />
                          <span className="font-medium">{item.carga_aguda.toFixed(0)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="font-mono text-xs">
                          {item.ratio_acwr != null ? item.ratio_acwr.toFixed(2) : '-'}
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getNivelBadgeClass(item.nivel_carga)}`}>
                          {item.nivel_carga}
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        {editingWellness === item.jugador_id ? (
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={wellnessInput}
                            onChange={(e) => setWellnessInput(e.target.value)}
                            onBlur={() => handleWellnessSave(item.jugador_id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleWellnessSave(item.jugador_id)
                              if (e.key === 'Escape') setEditingWellness(null)
                            }}
                            autoFocus
                            className="w-14 text-center border rounded px-1 py-0.5 text-sm"
                          />
                        ) : (
                          <button
                            onClick={() => handleWellnessClick(item.jugador_id, item.wellness_valor)}
                            className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
                            title="Click para editar wellness"
                          >
                            {item.wellness_valor != null ? (
                              <span className={`font-bold ${
                                item.wellness_valor >= 7 ? 'text-green-600' :
                                item.wellness_valor >= 4 ? 'text-amber-600' :
                                'text-red-600'
                              }`}>
                                {item.wellness_valor}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      </div>

      {/* Register RPE dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar RPE</DialogTitle>
            <DialogDescription>
              Registro de esfuerzo percibido y bienestar del jugador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jugador *</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={selectedJugador}
                  onChange={(e) => setSelectedJugador(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {jugadores.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.dorsal ? `${j.dorsal}. ` : ''}{j.nombre} {j.apellidos}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Sesion (opcional)</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={selectedSesion}
                  onChange={(e) => setSelectedSesion(e.target.value)}
                >
                  <option value="">Sin sesion</option>
                  {sesiones.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatDate(s.fecha)} - {s.titulo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* RPE slider */}
            <div className="space-y-2">
              <Label>RPE (1-10): <span className="font-bold">{rpeForm.rpe}</span></Label>
              <input
                type="range"
                min={1}
                max={10}
                value={rpeForm.rpe}
                onChange={(e) => setRpeForm({ ...rpeForm, rpe: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Muy facil</span>
                <span>Moderado</span>
                <span>Maximo</span>
              </div>
            </div>

            {/* Wellness fields */}
            <div className="grid grid-cols-5 gap-2">
              {WELLNESS_FIELDS.map((field) => {
                const Icon = field.icon
                return (
                  <div key={field.key} className="text-center space-y-1">
                    <Icon className={`h-4 w-4 mx-auto ${field.color}`} />
                    <p className="text-[10px] font-medium">{field.label}</p>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={rpeForm[field.key]}
                      onChange={(e) => setRpeForm({ ...rpeForm, [field.key]: parseInt(e.target.value) })}
                      className="w-full accent-primary h-1"
                    />
                    <p className="text-xs font-bold">{rpeForm[field.key]}</p>
                  </div>
                )
              })}
            </div>

            <div className="space-y-2">
              <Label>Duracion percibida (min)</Label>
              <Input
                type="number"
                min={0}
                value={rpeForm.duracion_percibida}
                onChange={(e) => setRpeForm({ ...rpeForm, duracion_percibida: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegister(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !selectedJugador}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
