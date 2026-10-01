'use client'

import { useState, useEffect, Fragment } from 'react'
import useSWR, { mutate } from 'swr'
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Heart,
  Loader2,
  RefreshCw,
  BarChart3,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Save,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { SaludTabs } from '@/components/salud/SaludTabs'
import { ManualRPEDialog } from '@/components/rpe/ManualRPEDialog'
import { WellnessDialog } from '@/components/rpe/WellnessDialog'
import { ExcelImportDialog } from '@/components/rpe/ExcelImportDialog'
import { PlayerRpeCharts } from '@/components/rpe/PlayerRpeCharts'
import dynamic from 'next/dynamic'

const WellnessChartDialog = dynamic(() => import('@/components/rpe/WellnessChartDialog').then(m => ({ default: m.WellnessChartDialog })), { ssr: false })
const LoadChartDialog = dynamic(() => import('@/components/rpe/LoadChartDialog').then(m => ({ default: m.LoadChartDialog })), { ssr: false })
import { useEquipoStore } from '@/stores/equipoStore'
import { useFilialVisibilityStore } from '@/stores/filialVisibilityStore'
import { MostrarFilialToggle } from '@/components/jugadores/MostrarFilialToggle'
import { resolveTipoJugador } from '@/lib/jugadorTipo'
import { cargaApi } from '@/lib/api/carga'
import { rpeApi } from '@/lib/api/rpe'
import { wellnessApi } from '@/lib/api/wellness'
import { jugadoresApi, Jugador } from '@/lib/api/jugadores'
import { apiKey } from '@/lib/swr'
import type { CargaEquipoResponse, CargaJugador, NivelCarga, WellnessAggregates, CargaDiaria } from '@/types'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

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

function getWellnessColor(value: number | null, max: number = 25): string {
  if (value === null) return 'text-muted-foreground'
  const ratio = value / max
  if (ratio >= 0.8) return 'text-green-600'    // 20-25
  if (ratio >= 0.6) return 'text-amber-600'    // 15-19
  return 'text-red-600'                        // <15
}

function getWellnessBg(value: number | null): string {
  if (value === null) return ''
  if (value >= 20) return 'bg-green-50'
  if (value >= 15) return 'bg-amber-50'
  return 'bg-red-50'
}

export default function RPEPage() {
  const { equipoActivo } = useEquipoStore()
  const mostrarFilial = useFilialVisibilityStore((s) => s.mostrarFilial)

  // SWR data fetching
  const { data: cargaData, isLoading: loadingCarga } = useSWR<CargaEquipoResponse>(
    equipoActivo?.id ? `/carga/equipo/${equipoActivo.id}` : null
  )

  const { data: wellnessData, isLoading: loadingWellness } = useSWR(
    equipoActivo?.id ? `/wellness/equipo/${equipoActivo.id}` : null,
    () => equipoActivo?.id ? wellnessApi.getTeam(equipoActivo.id) : null
  )

  const { data: alertsData } = useSWR(
    equipoActivo?.id ? `/wellness/equipo/${equipoActivo.id}/alertas` : null,
    () => equipoActivo?.id ? wellnessApi.getAlerts(equipoActivo.id) : null
  )

  const { data: jugadoresData } = useSWR<{ data: Jugador[]; total: number }>(
    apiKey('/jugadores', {
      equipo_id: equipoActivo?.id,
    }, ['equipo_id'])
  )

  const jugadores = (jugadoresData?.data || []).filter((j) => {
    const tipo = resolveTipoJugador(j)
    if (tipo === 'invitado' || tipo === 'prueba') return false
    if (tipo === 'juvenil' && !mostrarFilial) return false
    const disp = j.disponibilidad || (j.estado === 'activo' ? 'pleno' : 'fuera')
    return disp !== 'fuera' && !['sancionado', 'viaje', 'permiso', 'seleccion', 'baja'].includes(j.estado)
  })
  const wellnessAggregates = wellnessData?.data || []
  const wellnessMap = new Map(wellnessAggregates.map((w) => [w.jugador_id, w]))
  const loading = loadingCarga

  // Dialogs state
  const [showManualRPE, setShowManualRPE] = useState(false)
  const [showWellness, setShowWellness] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [showLoadChart, setShowLoadChart] = useState(false)
  const [loadChartPlayer, setLoadChartPlayer] = useState<string | undefined>()
  const [showImport, setShowImport] = useState(false)

  // Recalculating
  const [recalculating, setRecalculating] = useState(false)

  const handleRecalculate = async () => {
    if (!equipoActivo?.id) return
    setRecalculating(true)
    try {
      await cargaApi.recalcular(equipoActivo.id)
      mutate((key: string) => typeof key === 'string' && (key.includes('/carga') || key.includes('/wellness')), undefined, { revalidate: true })
    } catch (err: any) {
      toast.error(err.message || 'Error al recalcular')
    } finally {
      setRecalculating(false)
    }
  }

  // Expanded rows for mini-charts
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [wellnessCols, setWellnessCols] = useState(false)
  const [rpeCols, setRpeCols] = useState(false)

  const tipoById = new Map(
    (jugadoresData?.data || []).map((j) => [j.id, resolveTipoJugador(j)] as const)
  )
  const data = (cargaData?.data || []).filter((item) => {
    const tipo = item.tipo_jugador || tipoById.get(item.jugador_id) || 'plantilla'
    if (tipo === 'invitado') return false
    if (tipo === 'juvenil') return mostrarFilial
    return tipo === 'plantilla'
  })
  const resumenVisible = data.length
    ? {
        carga_media: data.reduce((s, d) => s + (d.carga_aguda || 0), 0) / data.length,
        jugadores_riesgo: data.filter((d) => d.nivel_carga === 'alto' || d.nivel_carga === 'critico').length,
      }
    : { carga_media: 0, jugadores_riesgo: 0 }
  const visibleIds = new Set(data.map((d) => d.jugador_id))
  const totalAlertas = (alertsData?.data || []).filter((a) => visibleIds.has(a.jugador_id)).length

  // Compute team wellness average from aggregates (same visible set)
  const wellnessValues = wellnessAggregates
    .filter((w) => visibleIds.has(w.jugador_id) && w.wellness_last != null)
    .map((w) => w.wellness_last!)
  const teamWellnessAvg = wellnessValues.length > 0
    ? Math.round((wellnessValues.reduce((a, b) => a + b, 0) / wellnessValues.length) * 10) / 10
    : null

  // Latest wellness date
  const latestWellnessDate = wellnessAggregates
    .map((w) => w.wellness_last_fecha)
    .filter(Boolean)
    .sort()
    .pop() || null

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <PageHeader
          title="RPE / Wellness"
          description="Control de carga y bienestar de los jugadores"
          actions={
            <>
            <MostrarFilialToggle />
            <Button
              variant="outline"
              size="sm"
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
            </>
          }
        />
        <SaludTabs />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-1.5"
          onClick={() => setShowManualRPE(true)}
        >
          <Activity className="h-5 w-5 text-sky-600" />
          <span className="text-xs font-medium">Registrar RPE</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-1.5"
          onClick={() => setShowWellness(true)}
        >
          <Heart className="h-5 w-5 text-rose-500" />
          <span className="text-xs font-medium">Registrar Wellness</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-1.5"
          onClick={() => { setLoadChartPlayer(undefined); setShowLoadChart(true) }}
        >
          <TrendingUp className="h-5 w-5 text-sky-500" />
          <span className="text-xs font-medium">Gráfica de carga</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-1.5"
          onClick={() => setShowChart(true)}
        >
          <BarChart3 className="h-5 w-5 text-teal-700" />
          <span className="text-xs font-medium">Gráfica wellness</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-1.5"
          onClick={() => setShowImport(true)}
        >
          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          <span className="text-xs font-medium">Importar Excel</span>
        </Button>
      </div>

      {/* KPI strip */}
      <div className="animate-fade-in">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border bg-rose-50/80 ring-1 ring-rose-100 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">Wellness equipo</p>
                <Heart className="h-4 w-4 text-rose-500" />
              </div>
              <p className={`text-3xl font-bold tabular-nums mt-1 tracking-tight ${getWellnessColor(teamWellnessAvg)}`}>
                {teamWellnessAvg != null ? teamWellnessAvg : '—'}
                {teamWellnessAvg != null && <span className="text-sm font-normal text-muted-foreground">/25</span>}
              </p>
            </div>
            <div className={`rounded-2xl border p-4 ring-1 ${totalAlertas > 0 ? 'bg-red-50 ring-red-100' : 'bg-card ring-border'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">Alertas</p>
                <AlertTriangle className={`h-4 w-4 ${totalAlertas > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              </div>
              <p className={`text-3xl font-bold tabular-nums mt-1 tracking-tight ${totalAlertas > 0 ? 'text-red-700' : ''}`}>
                {totalAlertas}
              </p>
            </div>
            <div className="rounded-2xl border bg-amber-50/80 ring-1 ring-amber-100 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">En riesgo</p>
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-3xl font-bold tabular-nums mt-1 tracking-tight text-amber-800">
                {resumenVisible.jugadores_riesgo}
              </p>
            </div>
            <div className="rounded-2xl border bg-sky-50/80 ring-1 ring-sky-100 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">Carga media (EWMA)</p>
                <Activity className="h-4 w-4 text-sky-600" />
              </div>
              <p className="text-3xl font-bold tabular-nums mt-1 tracking-tight text-sky-800">
                {data.length ? Math.round(resumenVisible.carga_media) : '—'}
              </p>
              {latestWellnessDate && (
                <p className="text-[11px] text-muted-foreground mt-1">Última wellness {latestWellnessDate}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Player table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Jugadores</CardTitle>
          <p className="text-xs text-muted-foreground">
            Carga (UA) = RPE × minutos efectivos · Al pulsar un jugador ves su RPE reciente, la carga y los registros
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
            </div>
          ) : data.length === 0 || data.every((d) => !d.carga_aguda && !d.ratio_acwr) ? (
            <EmptyState
              icon={<Activity className="h-12 w-12" />}
              title="Sin datos de carga"
              description="Pulsa Recalcular para generar la carga desde sesiones, partidos y RPE manual."
              action={
                <Button onClick={handleRecalculate} disabled={recalculating}>
                  {recalculating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Recalcular
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium w-8">#</th>
                    <th className="pb-2 font-medium">Jugador</th>
                    <th className="pb-2 font-medium text-center">Nivel</th>
                    <th className="pb-2 font-medium text-center">EWMA aguda</th>
                    <th className="pb-2 font-medium text-center">ACWR</th>
                    <th className="pb-2 font-medium text-center">
                      <button type="button" className="font-medium hover:text-foreground" onClick={() => setWellnessCols((v) => !v)}>
                        Wellness {wellnessCols ? '−' : '+'}
                      </button>
                    </th>
                    {wellnessCols && (
                      <>
                        <th className="pb-2 font-medium text-center">Últ. 7d</th>
                        <th className="pb-2 font-medium text-center">Último</th>
                      </>
                    )}
                    <th className="pb-2 font-medium text-center">
                      <button type="button" className="font-medium hover:text-foreground" onClick={() => setRpeCols((v) => !v)}>
                        RPE {rpeCols ? '−' : '+'}
                      </button>
                    </th>
                    {rpeCols && (
                      <>
                        <th className="pb-2 font-medium text-center">Martes</th>
                        <th className="pb-2 font-medium text-center">Jueves</th>
                        <th className="pb-2 font-medium text-center">Viernes</th>
                        <th className="pb-2 font-medium text-center">Partido</th>
                      </>
                    )}
                    <th className="pb-2 font-medium text-center">Carga (UA)</th>
                    <th className="pb-2 font-medium text-center w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => {
                    const w = wellnessMap.get(item.jugador_id)
                    const isExpanded = expandedRow === item.jugador_id
                    return (
                      <Fragment key={item.jugador_id}>
                        <tr
                          className={`border-b last:border-0 row-hover cursor-pointer ${getRowHighlight(item.nivel_carga)} ${w?.wellness_alerta ? 'bg-red-50/40' : ''}`}
                          onClick={() => setExpandedRow(isExpanded ? null : item.jugador_id)}
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
                              {w?.wellness_alerta && (
                                <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getNivelBadgeClass(item.nivel_carga)}`}>
                              {item.nivel_carga}
                            </span>
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
                          <td className={`py-2.5 text-center ${getWellnessBg(w?.wellness_general_avg ?? null)}`}>
                            <span className={`font-bold text-xs ${getWellnessColor(w?.wellness_general_avg ?? null)}`}>
                              {w?.wellness_general_avg != null ? w.wellness_general_avg.toFixed(1) : '-'}
                            </span>
                          </td>
                          {wellnessCols && (
                            <>
                              <td className={`py-2.5 text-center ${getWellnessBg(w?.wellness_7d_avg ?? null)}`}>
                                <span className={`font-bold text-xs ${getWellnessColor(w?.wellness_7d_avg ?? null)}`}>
                                  {w?.wellness_7d_avg != null ? w.wellness_7d_avg.toFixed(1) : '-'}
                                </span>
                              </td>
                              <td className={`py-2.5 text-center ${getWellnessBg(w?.wellness_last ?? null)}`}>
                                <span className={`font-bold text-xs ${getWellnessColor(w?.wellness_last ?? null)}`}>
                                  {w?.wellness_last != null ? w.wellness_last : '-'}
                                </span>
                              </td>
                            </>
                          )}
                          <td className="py-2.5 text-center">
                            <span className="font-bold text-xs">
                              {item.rpe_ultimo != null ? item.rpe_ultimo.toFixed(1) : '-'}
                            </span>
                            {item.rpe_ultimo_tipo && (
                              <span className="block text-[9px] text-muted-foreground">
                                {item.rpe_ultimo_tipo === 'partido' ? 'partido' : 'sesión'}
                              </span>
                            )}
                          </td>
                          {rpeCols && (
                            <>
                              <td className="py-2.5 text-center text-xs">{item.rpe_media_martes ?? '-'}</td>
                              <td className="py-2.5 text-center text-xs">{item.rpe_media_jueves ?? '-'}</td>
                              <td className="py-2.5 text-center text-xs">{item.rpe_media_viernes ?? '-'}</td>
                              <td className="py-2.5 text-center text-xs">{item.rpe_media_partido ?? '-'}</td>
                            </>
                          )}
                          <td className="py-2.5 text-center font-medium tabular-nums">
                            {item.carga_ua_ultimo != null ? Math.round(item.carga_ua_ultimo) : '-'}
                          </td>
                          <td className="py-2.5 text-center">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${item.jugador_id}-expanded`}>
                            <td colSpan={9 + (wellnessCols ? 2 : 0) + (rpeCols ? 4 : 0)} className="p-0">
                              {/* Load metrics bar */}
                              <div className="px-4 pt-3 pb-1 bg-muted/20 border-t flex flex-wrap items-center gap-4 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Aguda (EWMA): </span>
                                  <span className="font-bold">{item.carga_aguda.toFixed(0)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Crónica (EWMA): </span>
                                  <span className="font-bold">{item.carga_cronica.toFixed(0)}</span>
                                </div>
                                {item.monotonia != null && (
                                  <div>
                                    <span className="text-muted-foreground">Monotonía: </span>
                                    <span className={`font-bold ${item.monotonia > 2 ? 'text-orange-600' : ''}`}>{item.monotonia.toFixed(1)}</span>
                                  </div>
                                )}
                                {item.strain != null && (
                                  <div>
                                    <span className="text-muted-foreground">Strain: </span>
                                    <span className="font-bold">{item.strain.toFixed(0)}</span>
                                  </div>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs text-sky-700 h-6 px-2"
                                  onClick={(e) => { e.stopPropagation(); setLoadChartPlayer(item.jugador_id); setShowLoadChart(true) }}
                                >
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Ver gráfica
                                </Button>
                              </div>
                              <PlayerRpeCharts jugadorId={item.jugador_id} />
                              <ExpandedRPERow jugadorId={item.jugador_id} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ManualRPEDialog
        open={showManualRPE}
        onOpenChange={setShowManualRPE}
        jugadores={jugadores}
      />
      <WellnessDialog
        open={showWellness}
        onOpenChange={setShowWellness}
        jugadores={jugadores}
      />
      {equipoActivo?.id && (
        <>
          <WellnessChartDialog
            open={showChart}
            onOpenChange={setShowChart}
            jugadores={jugadores}
            equipoId={equipoActivo.id}
          />
          <LoadChartDialog
            open={showLoadChart}
            onOpenChange={setShowLoadChart}
            jugadores={jugadores}
            equipoId={equipoActivo.id}
            initialJugadorId={loadChartPlayer}
          />
        </>
      )}
      <ExcelImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        jugadores={jugadores}
      />
    </div>
  )
}

function rpeRecordTitle(entry: { titulo?: string | null; tipo?: string | null; partido_id?: string | null }): string {
  const title = (entry.titulo || '').trim()
  if (title) return title
  if (entry.tipo === 'partido' || entry.partido_id) return 'Partido'
  if (entry.tipo === 'manual') return 'Carga manual'
  return 'Sesión'
}

/** RPE y minutos de sesión, partido y carga manual. */
function ExpandedRPERow({ jugadorId }: { jugadorId: string }) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ rpe: 5, duracion_percibida: 60, titulo: '' })
  const [editFechaRpe, setEditFechaRpe] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const res = await rpeApi.listByJugador(jugadorId, { limit: 60 })
      setRecords((res.data || []).filter((row) => row.tipo !== 'wellness' && row.rpe != null))
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [jugadorId])

  const handleStartEdit = (entry: any) => {
    setEditingId(entry.id)
    setEditFechaRpe(entry.fecha || '')
    setEditValues({
      rpe: entry.rpe || 5,
      duracion_percibida: entry.duracion_percibida || 60,
      titulo: entry.titulo || '',
    })
  }

  const handleSaveEdit = async (entry: any) => {
    setSaving(true)
    try {
      const titulo = editValues.titulo.trim()
      await rpeApi.update(entry.id, {
        rpe: editValues.rpe,
        duracion_percibida: editValues.duracion_percibida,
        ...(titulo ? { titulo } : {}),
        fecha: editFechaRpe,
      })
      toast.success('RPE actualizado')
      setEditingId(null)
      setLoading(true)
      await fetchData()
      mutate((key: string) => typeof key === 'string' && (key.includes('/carga') || key.includes('/rpe')), undefined, { revalidate: true })
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro de RPE?')) return
    setDeleting(id)
    try {
      await rpeApi.delete(id)
      toast.success('Registro eliminado')
      setRecords((prev) => prev.filter((r) => r.id !== id))
      mutate((key: string) => typeof key === 'string' && (key.includes('/carga') || key.includes('/rpe')), undefined, { revalidate: true })
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="p-3 text-center text-xs text-muted-foreground border-t">
        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="p-4 bg-blue-50/30 border-t space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Activity className="h-3.5 w-3.5 text-blue-600" />
        Registros de RPE
      </p>
      {records.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin registros de RPE todavía.</p>
      ) : (
      <div className="overflow-x-auto max-h-40 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-blue-50/80">
            <tr className="border-b">
              <th className="pb-1 text-left font-medium">Fecha</th>
              <th className="pb-1 text-left font-medium">Titulo</th>
              <th className="pb-1 text-center font-medium">RPE</th>
              <th className="pb-1 text-center font-medium">Min</th>
              <th className="pb-1 text-center font-medium">Carga</th>
              <th className="pb-1 text-center font-medium w-20">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {records.map((entry) => {
              const isEditing = editingId === entry.id
              const carga = isEditing
                ? (editValues.rpe * editValues.duracion_percibida)
                : entry.carga_sesion

              return (
                <tr key={entry.id} className={`border-b last:border-0 ${isEditing ? 'bg-blue-50/50' : ''}`}>
                  <td className="py-1.5">
                    {isEditing ? (
                      <input
                        type="date"
                        value={editFechaRpe}
                        onChange={(e) => setEditFechaRpe(e.target.value)}
                        className="border rounded px-1.5 py-0.5 text-xs w-28"
                      />
                    ) : (
                      entry.fecha
                    )}
                  </td>
                  <td className="py-1.5">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editValues.titulo}
                        placeholder={rpeRecordTitle(entry)}
                        onChange={(e) => setEditValues({ ...editValues, titulo: e.target.value })}
                        className="w-full border rounded px-1.5 py-0.5 text-xs"
                      />
                    ) : (
                      <span className="text-muted-foreground">{rpeRecordTitle(entry)}</span>
                    )}
                  </td>
                  <td className="py-1.5 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={editValues.rpe}
                        onChange={(e) => setEditValues({ ...editValues, rpe: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) })}
                        className="w-12 text-center border rounded px-1 py-0.5 text-xs"
                      />
                    ) : (
                      <span className={`font-bold ${entry.rpe >= 8 ? 'text-red-600' : entry.rpe >= 6 ? 'text-amber-600' : 'text-green-600'}`}>
                        {entry.rpe}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min={1}
                        max={300}
                        value={editValues.duracion_percibida}
                        onChange={(e) => setEditValues({ ...editValues, duracion_percibida: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-14 text-center border rounded px-1 py-0.5 text-xs"
                      />
                    ) : (
                      <span>{entry.duracion_percibida || '-'}</span>
                    )}
                  </td>
                  <td className="py-1.5 text-center font-bold">
                    {carga != null ? Math.round(carga) : '-'}
                  </td>
                  <td className="py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(entry)}
                            disabled={saving}
                            className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                            title="Guardar"
                          >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                            title="Cancelar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(entry)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleting === entry.id}
                            className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Eliminar"
                          >
                            {deleting === entry.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}
