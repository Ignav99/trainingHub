'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { BarChart3, Trophy, Target, Shield, Activity, Loader2, ArrowRight, Users, Calendar, UserCheck, UserX } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ListPageSkeleton } from '@/components/ui/page-skeletons'
import { useEquipoStore } from '@/stores/equipoStore'
import { sesionesApi } from '@/lib/api/sesiones'
import { apiKey } from '@/lib/swr'
import type { Partido, PaginatedResponse } from '@/types'
import type { CargaSemanalData } from '@/lib/api/dashboard'

interface AsistenciaHistorico {
  jugador_id: string
  nombre: string
  apellidos: string
  dorsal: number | null
  posicion_principal: string
  total_sesiones: number
  presencias: number
  ausencias: number
  porcentaje: number
  motivos: Record<string, number>
  ultima_ausencia: string | null
}

const MOTIVO_LABELS: Record<string, string> = {
  lesion: 'Lesion',
  enfermedad: 'Enfermedad',
  sancion: 'Sancion',
  permiso: 'Permiso',
  seleccion: 'Seleccion',
  viaje: 'Viaje',
  otro: 'Otro',
}

export default function EstadisticasPage() {
  const { equipoActivo } = useEquipoStore()

  // SWR: partidos jugados
  const { data: partidosRes, isLoading: loadingPartidos } = useSWR<PaginatedResponse<Partido>>(
    apiKey('/partidos', {
      equipo_id: equipoActivo?.id,
      solo_jugados: true,
      limit: 50,
      direccion: 'desc',
    }, ['equipo_id'])
  )

  // SWR: carga semanal
  const { data: cargaSemanal, isLoading: loadingCarga } = useSWR<CargaSemanalData>(
    apiKey('/dashboard/carga-semanal', {
      equipo_id: equipoActivo?.id,
      semanas: 8,
    }, ['equipo_id'])
  )

  const loading = loadingPartidos || loadingCarga

  const partidos = partidosRes?.data || []

  const resumen = useMemo(() => {
    const victorias = partidos.filter((p) => p.resultado === 'victoria').length
    const empates = partidos.filter((p) => p.resultado === 'empate').length
    const derrotas = partidos.filter((p) => p.resultado === 'derrota').length
    const golesFavor = partidos.reduce((s, p) => s + (p.goles_favor || 0), 0)
    const golesContra = partidos.reduce((s, p) => s + (p.goles_contra || 0), 0)
    return { jugados: partidos.length, victorias, empates, derrotas, golesFavor, golesContra }
  }, [partidos])

  // Asistencia historico state (loaded on-demand when tab is clicked)
  const [asistenciaData, setAsistenciaData] = useState<AsistenciaHistorico[]>([])
  const [asistenciaMedia, setAsistenciaMedia] = useState(0)
  const [asistenciaLoading, setAsistenciaLoading] = useState(false)
  const [asistenciaLoaded, setAsistenciaLoaded] = useState(false)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const loadAsistenciaHistorico = async () => {
    if (!equipoActivo?.id) return
    setAsistenciaLoading(true)
    try {
      const res = await sesionesApi.getAsistenciaHistorico(
        equipoActivo.id,
        fechaDesde || undefined,
        fechaHasta || undefined,
      )
      setAsistenciaData(res.data)
      setAsistenciaMedia(res.media_equipo)
      setAsistenciaLoaded(true)
    } catch (err) {
      console.error('Error loading asistencia historico:', err)
    } finally {
      setAsistenciaLoading(false)
    }
  }

  const handleTabChange = (tab: string) => {
    if (tab === 'asistencia' && !asistenciaLoaded) {
      loadAsistenciaHistorico()
    }
  }

  if (!equipoActivo) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Selecciona un equipo para ver estadísticas</p>
      </div>
    )
  }

  if (loading) {
    return <ListPageSkeleton />
  }

  const maxRPE = cargaSemanal && cargaSemanal.semanas.length > 0
    ? Math.max(...cargaSemanal.semanas.map((s) => s.rpe_promedio), 10)
    : 10

  // Last 10 partidos for the bar chart (reversed to show oldest first)
  const ultimosPartidos = partidos.slice(0, 10).reverse()

  const winRate = resumen.jugados > 0
    ? Math.round((resumen.victorias / resumen.jugados) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />Estadísticas</h1>
        <p className="text-muted-foreground text-sm">{equipoActivo.nombre}</p>
      </div>

      {/* RFAF Competition link */}
      <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold">Competición RFAF</p>
              <p className="text-xs text-muted-foreground">Clasificación, resultados y goleadores en tiempo real</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/estadisticas/competicion">
              Ver competición
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resumen.jugados}</p>
                <p className="text-xs text-muted-foreground">Partidos jugados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{winRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {resumen.victorias}V {resumen.empates}E {resumen.derrotas}D
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resumen.golesFavor}</p>
                <p className="text-xs text-muted-foreground">
                  GF ({resumen.golesContra} GC)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {cargaSemanal?.promedio_global ?? '-'}
                </p>
                <p className="text-xs text-muted-foreground">RPE medio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Rendimiento / Asistencia */}
      <Tabs defaultValue="rendimiento" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="rendimiento">Rendimiento</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
        </TabsList>

        {/* ===== TAB: RENDIMIENTO ===== */}
        <TabsContent value="rendimiento" className="space-y-6">
          {/* Results bar chart */}
          {ultimosPartidos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resultados recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-40">
                  {ultimosPartidos.map((p) => {
                    const diff = (p.goles_favor || 0) - (p.goles_contra || 0)
                    const barColor =
                      p.resultado === 'victoria'
                        ? 'bg-emerald-500'
                        : p.resultado === 'empate'
                          ? 'bg-amber-400'
                          : 'bg-red-500'
                    const absHeight = Math.min(Math.abs(diff) + 1, 6)
                    const heightPct = (absHeight / 6) * 100

                    return (
                      <div key={p.id} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {p.goles_favor}-{p.goles_contra}
                        </span>
                        <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                          <div
                            className={`w-full max-w-[32px] rounded-t ${barColor} transition-all`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground truncate max-w-full text-center">
                          {p.rival?.nombre_corto || p.rival?.nombre?.slice(0, 6) || '?'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-4 mt-4 justify-center text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500" /> Victoria
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-400" /> Empate
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-red-500" /> Derrota
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* RPE weekly load chart */}
          {cargaSemanal && cargaSemanal.semanas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Carga semanal (RPE)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-40">
                  {cargaSemanal.semanas.map((s) => {
                    const heightPct = (s.rpe_promedio / maxRPE) * 100
                    const color =
                      s.rpe_promedio >= 7
                        ? 'bg-red-500'
                        : s.rpe_promedio >= 5
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'

                    return (
                      <div key={s.semana_inicio} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {s.rpe_promedio}
                        </span>
                        <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                          <div
                            className={`w-full max-w-[32px] rounded-t ${color} transition-all`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(s.semana_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Match history table */}
          {partidos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Historial de partidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Fecha</th>
                        <th className="pb-2 font-medium">Rival</th>
                        <th className="pb-2 font-medium text-center">Resultado</th>
                        <th className="pb-2 font-medium">Comp.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partidos.slice(0, 15).map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-2 text-muted-foreground">
                            {new Date(p.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="py-2">
                            <span className="inline-flex items-center gap-1.5">
                              {p.rival?.escudo_url && (
                                <img src={p.rival.escudo_url} alt="" className="w-4 h-4 object-contain" />
                              )}
                              <span className="text-[10px] text-muted-foreground mr-1">
                                {p.localia === 'local' ? 'vs' : '@'}
                              </span>
                              {p.rival?.nombre || 'Rival'}
                            </span>
                          </td>
                          <td className="py-2 text-center">
                            <Badge
                              variant="outline"
                              className={
                                p.resultado === 'victoria'
                                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                                  : p.resultado === 'empate'
                                    ? 'border-amber-300 text-amber-700 bg-amber-50'
                                    : 'border-red-300 text-red-700 bg-red-50'
                              }
                            >
                              {p.goles_favor}-{p.goles_contra}
                            </Badge>
                          </td>
                          <td className="py-2 text-muted-foreground capitalize text-xs">{p.competicion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {resumen.jugados === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No hay partidos jugados todavía. Las estadísticas aparecerán cuando registres resultados.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== TAB: ASISTENCIA ===== */}
        <TabsContent value="asistencia" className="space-y-6">
          {/* Media del equipo */}
          {asistenciaLoaded && (
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{asistenciaMedia}%</p>
                    <p className="text-xs text-muted-foreground">Media de asistencia del equipo</p>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{asistenciaData.length} jugadores</p>
                  <p>{asistenciaData.reduce((s, j) => s + j.total_sesiones, 0) > 0
                    ? `${asistenciaData[0]?.total_sesiones || 0} sesiones registradas`
                    : 'Sin datos'
                  }</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Date filters */}
          <div className="flex items-end gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Desde</label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-40"
              />
            </div>
            <Button size="sm" onClick={loadAsistenciaHistorico} disabled={asistenciaLoading}>
              {asistenciaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calendar className="h-4 w-4 mr-1" />}
              Filtrar
            </Button>
          </div>

          {/* Tabla de asistencia */}
          {asistenciaLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : asistenciaData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No hay datos de asistencia. Registra asistencia en las sesiones para ver estadísticas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Asistencia por jugador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground text-xs">
                        <th className="pb-2 font-medium">Jugador</th>
                        <th className="pb-2 font-medium text-center w-16">Dorsal</th>
                        <th className="pb-2 font-medium w-20">Posicion</th>
                        <th className="pb-2 font-medium text-center w-20">Sesiones</th>
                        <th className="pb-2 font-medium text-center w-20">Presencias</th>
                        <th className="pb-2 font-medium text-center w-20">Ausencias</th>
                        <th className="pb-2 font-medium w-48">Asistencia</th>
                        <th className="pb-2 font-medium w-32">Motivos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asistenciaData.map((j) => {
                        const barColor = j.porcentaje >= 90
                          ? 'bg-emerald-500'
                          : j.porcentaje >= 75
                            ? 'bg-amber-400'
                            : 'bg-red-500'
                        const textColor = j.porcentaje >= 90
                          ? 'text-emerald-700'
                          : j.porcentaje >= 75
                            ? 'text-amber-700'
                            : 'text-red-700'

                        return (
                          <tr key={j.jugador_id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2.5 font-medium">
                              {j.nombre} {j.apellidos}
                            </td>
                            <td className="py-2.5 text-center text-muted-foreground">
                              {j.dorsal || '-'}
                            </td>
                            <td className="py-2.5">
                              <Badge variant="outline" className="text-[10px]">{j.posicion_principal}</Badge>
                            </td>
                            <td className="py-2.5 text-center">{j.total_sesiones}</td>
                            <td className="py-2.5 text-center text-emerald-600 font-medium">{j.presencias}</td>
                            <td className="py-2.5 text-center text-red-600 font-medium">{j.ausencias}</td>
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${barColor} transition-all`}
                                    style={{ width: `${j.porcentaje}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-bold w-12 text-right ${textColor}`}>
                                  {j.porcentaje}%
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(j.motivos).map(([motivo, count]) => (
                                  <span key={motivo} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {MOTIVO_LABELS[motivo] || motivo} ({count})
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
