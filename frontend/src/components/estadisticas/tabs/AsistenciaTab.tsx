'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ChartCard } from '../ChartCard'
import { StatFilters } from '../StatFilters'
import { PlayerStatsTable } from '../PlayerStatsTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Users, ClipboardCheck } from 'lucide-react'
import { sesionesApi } from '@/lib/api/sesiones'
import type { AsistenciaConvocatoria, EstadisticasDashboardResponse } from '@/lib/api/estadisticasDashboard'

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

interface Props {
  data: EstadisticasDashboardResponse
  equipoId: string
}

export function AsistenciaTab({ data, equipoId }: Props) {
  const { asistencia_convocatorias } = data

  // Sesiones asistencia (on-demand)
  const [asistenciaData, setAsistenciaData] = useState<AsistenciaHistorico[]>([])
  const [asistenciaMedia, setAsistenciaMedia] = useState(0)
  const [asistenciaLoading, setAsistenciaLoading] = useState(false)
  const [asistenciaLoaded, setAsistenciaLoaded] = useState(false)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const loadAsistencia = async () => {
    if (!equipoId) return
    setAsistenciaLoading(true)
    try {
      const res = await sesionesApi.getAsistenciaHistorico(equipoId, fechaDesde || undefined, fechaHasta || undefined)
      setAsistenciaData(res.data)
      setAsistenciaMedia(res.media_equipo)
      setAsistenciaLoaded(true)
    } catch (err) {
      console.error('Error loading asistencia:', err)
    } finally {
      setAsistenciaLoading(false)
    }
  }

  const handleSubTabChange = (tab: string) => {
    if (tab === 'sesiones' && !asistenciaLoaded) loadAsistencia()
  }

  // Convocatorias bar chart data
  const convocatoriasBarData = asistencia_convocatorias
    .slice(0, 25)
    .map((j) => ({
      name: j.nombre?.split(' ').map((w: string) => w.charAt(0)).join('') || '?',
      fullName: j.nombre,
      porcentaje: j.porcentaje,
      fill: j.porcentaje >= 90 ? '#10B981' : j.porcentaje >= 70 ? '#FBBF24' : '#EF4444',
    }))

  return (
    <div className="space-y-6">
      <Tabs defaultValue="convocatorias" onValueChange={handleSubTabChange}>
        <TabsList>
          <TabsTrigger value="convocatorias">Convocatorias</TabsTrigger>
          <TabsTrigger value="sesiones">Sesiones</TabsTrigger>
        </TabsList>

        {/* ── CONVOCATORIAS ── */}
        <TabsContent value="convocatorias" className="space-y-6">
          {/* Bar chart */}
          <ChartCard title="% Convocatoria por jugador" isEmpty={convocatoriasBarData.length === 0}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={convocatoriasBarData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const d = payload[0].payload
                    return (
                      <div className="bg-popover border rounded-lg px-3 py-2 text-xs shadow-md">
                        <p className="font-medium">{d.fullName}</p>
                        <p>{d.porcentaje}%</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="porcentaje" radius={[4, 4, 0, 0]}>
                  {convocatoriasBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Convocatorias table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Convocatorias ({asistencia_convocatorias.length} jugadores)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs">
                      <th className="pb-2 font-medium">Jugador</th>
                      <th className="pb-2 font-medium text-center w-16">Dorsal</th>
                      <th className="pb-2 font-medium text-center w-20">Partidos</th>
                      <th className="pb-2 font-medium text-center w-20">Conv.</th>
                      <th className="pb-2 font-medium w-48">% Convocatoria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asistencia_convocatorias.map((j) => {
                      const barColor = j.porcentaje >= 90 ? 'bg-emerald-500' : j.porcentaje >= 70 ? 'bg-amber-400' : 'bg-red-500'
                      const textColor = j.porcentaje >= 90 ? 'text-emerald-700' : j.porcentaje >= 70 ? 'text-amber-700' : 'text-red-700'
                      return (
                        <tr key={j.jugador_id} className="border-b last:border-0 row-hover">
                          <td className="py-2.5 font-medium">{j.nombre}</td>
                          <td className="py-2.5 text-center text-muted-foreground">{j.dorsal || '-'}</td>
                          <td className="py-2.5 text-center">{j.total_partidos_jugados}</td>
                          <td className="py-2.5 text-center font-medium">{j.convocatorias}</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${j.porcentaje}%` }} />
                              </div>
                              <span className={`text-xs font-bold w-12 text-right ${textColor}`}>{j.porcentaje}%</span>
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
        </TabsContent>

        {/* ── SESIONES ── */}
        <TabsContent value="sesiones" className="space-y-6">
          <StatFilters
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
            onFechaDesdeChange={setFechaDesde}
            onFechaHastaChange={setFechaHasta}
            onFilter={loadAsistencia}
            loading={asistenciaLoading}
          />
          <PlayerStatsTable
            asistenciaData={asistenciaData}
            asistenciaMedia={asistenciaMedia}
            asistenciaLoading={asistenciaLoading}
            asistenciaLoaded={asistenciaLoaded}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
