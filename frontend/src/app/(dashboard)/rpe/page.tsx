'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  Calendar,
  TrendingUp,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Moon,
  Zap,
  Heart,
  Brain,
  Smile,
} from 'lucide-react'
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
import { useEquipoStore } from '@/stores/equipoStore'
import { rpeApi } from '@/lib/api/rpe'
import { sesionesApi } from '@/lib/api/sesiones'
import { jugadoresApi, Jugador } from '@/lib/api/jugadores'
import { usePageReady } from '@/components/providers/PageReadyProvider'
import { formatDate } from '@/lib/utils'
import type { RPEResumenEquipo, Sesion } from '@/types'

const WELLNESS_FIELDS = [
  { key: 'sueno', label: 'Sueno', icon: Moon, color: 'text-indigo-600' },
  { key: 'fatiga', label: 'Fatiga', icon: Zap, color: 'text-amber-600' },
  { key: 'dolor', label: 'Dolor', icon: Heart, color: 'text-red-600' },
  { key: 'estres', label: 'Estres', icon: Brain, color: 'text-purple-600' },
  { key: 'humor', label: 'Humor', icon: Smile, color: 'text-emerald-600' },
] as const

function getRPEColor(rpe: number): string {
  if (rpe <= 3) return 'bg-green-100 text-green-800'
  if (rpe <= 5) return 'bg-yellow-100 text-yellow-800'
  if (rpe <= 7) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

export default function RPEPage() {
  const { equipoActivo } = useEquipoStore()
  const [resumen, setResumen] = useState<RPEResumenEquipo | null>(null)
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [loading, setLoading] = useState(true)

  // Register RPE dialog
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

  usePageReady(loading)

  useEffect(() => {
    if (!equipoActivo?.id) return
    setLoading(true)

    Promise.allSettled([
      rpeApi.getResumen(equipoActivo.id),
      sesionesApi.list({ equipo_id: equipoActivo.id, estado: 'completada', limit: 10 }),
      jugadoresApi.list({ equipo_id: equipoActivo.id, estado: 'activo' }),
    ])
      .then(([resRes, sesRes, jugRes]) => {
        if (resRes.status === 'fulfilled') setResumen(resRes.value)
        if (sesRes.status === 'fulfilled') setSesiones(sesRes.value?.data || [])
        if (jugRes.status === 'fulfilled') setJugadores(jugRes.value?.data || [])
      })
      .finally(() => setLoading(false))
  }, [equipoActivo?.id])

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
      // Refresh
      if (equipoActivo?.id) {
        rpeApi.getResumen(equipoActivo.id).then(setResumen).catch(console.error)
      }
    } catch (err: any) {
      alert(err.message || 'Error al registrar RPE')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            RPE y Wellness
          </h1>
          <p className="text-muted-foreground mt-1">
            Control de carga y bienestar de los jugadores
          </p>
        </div>
        <Button onClick={() => setShowRegister(true)}>
          <Activity className="h-4 w-4 mr-2" />
          Registrar RPE
        </Button>
      </div>

      {/* Team averages */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : resumen?.promedios_equipo ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`inline-flex px-3 py-1 rounded-full text-lg font-bold ${getRPEColor(resumen.promedios_equipo.rpe_promedio || 0)}`}>
                {resumen.promedios_equipo.rpe_promedio?.toFixed(1) || '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">RPE medio equipo</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{resumen.promedios_equipo.carga_promedio?.toFixed(0) || '-'}</p>
              <p className="text-xs text-muted-foreground">Carga media (UA)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{resumen.promedios_equipo.total_registros}</p>
              <p className="text-xs text-muted-foreground">Registros totales</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Player list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumen por jugador</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
            </div>
          ) : !resumen?.data?.length ? (
            <div className="text-center py-8">
              <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Sin datos de RPE todavia. Registra el primer RPE despues de una sesion.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Jugador</th>
                    <th className="pb-2 font-medium text-center">Registros</th>
                    <th className="pb-2 font-medium text-center">RPE medio</th>
                    <th className="pb-2 font-medium text-center">Carga media</th>
                    <th className="pb-2 font-medium text-center">Ultimo RPE</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.data.map((item) => (
                    <tr key={item.jugador.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          {item.jugador.dorsal && (
                            <span className="text-xs font-bold text-muted-foreground w-6 text-center">
                              {item.jugador.dorsal}
                            </span>
                          )}
                          <span className="font-medium">
                            {item.jugador.nombre} {item.jugador.apellidos}
                          </span>
                          <Badge variant="outline" className="text-[9px]">
                            {item.jugador.posicion_principal}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2.5 text-center">{item.num_registros}</td>
                      <td className="py-2.5 text-center">
                        {item.rpe_promedio != null ? (
                          <Badge className={getRPEColor(item.rpe_promedio)}>
                            {item.rpe_promedio.toFixed(1)}
                          </Badge>
                        ) : '-'}
                      </td>
                      <td className="py-2.5 text-center">
                        {item.carga_promedio?.toFixed(0) || '-'}
                      </td>
                      <td className="py-2.5 text-center">
                        {item.ultimo_registro ? (
                          <div>
                            <Badge className={getRPEColor(item.ultimo_registro.rpe)}>
                              {item.ultimo_registro.rpe}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDate(item.ultimo_registro.fecha)}
                            </p>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register dialog */}
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
