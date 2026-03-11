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
import { PlayerStatusBadges } from '@/components/player/PlayerStatusBadges'
import { ManualRPEDialog } from '@/components/rpe/ManualRPEDialog'
import { WellnessDialog } from '@/components/rpe/WellnessDialog'
import { WellnessChartDialog } from '@/components/rpe/WellnessChartDialog'
import { LoadChartDialog } from '@/components/rpe/LoadChartDialog'
import { ExcelImportDialog } from '@/components/rpe/ExcelImportDialog'
import { useEquipoStore } from '@/stores/equipoStore'
import { cargaApi } from '@/lib/api/carga'
import { wellnessApi } from '@/lib/api/wellness'
import { jugadoresApi, Jugador } from '@/lib/api/jugadores'
import { apiKey } from '@/lib/swr'
import type { CargaEquipoResponse, CargaJugador, NivelCarga, WellnessAggregates, WellnessEntry, CargaDiaria } from '@/types'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useEffect } from 'react'

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
      estado: 'activo',
    }, ['equipo_id'])
  )

  const jugadores = jugadoresData?.data || []
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

  const data = cargaData?.data || []
  const resumen = cargaData?.resumen
  const totalAlertas = alertsData?.total_alertas || 0

  // Compute team wellness average from aggregates
  const wellnessValues = wellnessAggregates.filter((w) => w.wellness_last != null).map((w) => w.wellness_last!)
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
      {/* Header */}
      <PageHeader
        title="RPE / Wellness"
        description="Control de carga y bienestar de los jugadores"
        actions={
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
        }
      />

      {/* 5 Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-1.5"
          onClick={() => setShowManualRPE(true)}
        >
          <Activity className="h-5 w-5 text-blue-600" />
          <span className="text-xs font-medium">Registrar RPE Manual</span>
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
          <TrendingUp className="h-5 w-5 text-blue-500" />
          <span className="text-xs font-medium">Grafica de Carga</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-1.5"
          onClick={() => setShowChart(true)}
        >
          <BarChart3 className="h-5 w-5 text-violet-600" />
          <span className="text-xs font-medium">Grafica Wellness</span>
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

      {/* Summary cards */}
      <div className="animate-fade-in">
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Heart className="h-5 w-5 mx-auto mb-1 text-rose-500" />
                <p className={`text-2xl font-bold ${getWellnessColor(teamWellnessAvg)}`}>
                  {teamWellnessAvg != null ? teamWellnessAvg : '-'}
                  {teamWellnessAvg != null && <span className="text-sm font-normal text-muted-foreground">/25</span>}
                </p>
                <p className="text-xs text-muted-foreground">Wellness Equipo</p>
              </CardContent>
            </Card>
            <Card className={totalAlertas > 0 ? 'border-red-300' : ''}>
              <CardContent className="p-4 text-center">
                <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${totalAlertas > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                <p className={`text-2xl font-bold ${totalAlertas > 0 ? 'text-red-600' : ''}`}>
                  {totalAlertas}
                </p>
                <p className="text-xs text-muted-foreground">Alertas activas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">
                  {latestWellnessDate || '-'}
                </p>
                <p className="text-xs text-muted-foreground">Ultima actualizacion</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Player table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Jugadores</CardTitle>
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
                    <th className="pb-2 font-medium text-center">Carga 7d</th>
                    <th className="pb-2 font-medium text-center">ACWR</th>
                    <th className="pb-2 font-medium text-center">Nivel</th>
                    <th className="pb-2 font-medium text-center">Media Gral</th>
                    <th className="pb-2 font-medium text-center">Ult. 7d</th>
                    <th className="pb-2 font-medium text-center">Ultimo</th>
                    <th className="pb-2 font-medium text-center w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => {
                    const w = wellnessMap.get(item.jugador_id)
                    const isExpanded = expandedRow === item.jugador_id
                    return (
                      <>
                        <tr
                          key={item.jugador_id}
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
                          {/* Wellness columns */}
                          <td className={`py-2.5 text-center ${getWellnessBg(w?.wellness_general_avg ?? null)}`}>
                            <span className={`font-bold text-xs ${getWellnessColor(w?.wellness_general_avg ?? null)}`}>
                              {w?.wellness_general_avg != null ? w.wellness_general_avg.toFixed(1) : '-'}
                            </span>
                          </td>
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
                            <td colSpan={9} className="p-0">
                              {/* Load metrics bar */}
                              <div className="px-4 pt-3 pb-1 bg-muted/20 border-t flex flex-wrap items-center gap-4 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Aguda (EWMA): </span>
                                  <span className="font-bold">{item.carga_aguda.toFixed(0)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Cronica (EWMA): </span>
                                  <span className="font-bold">{item.carga_cronica.toFixed(0)}</span>
                                </div>
                                {item.monotonia != null && (
                                  <div>
                                    <span className="text-muted-foreground">Monotonia: </span>
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
                                  className="text-xs text-blue-600 h-6 px-2"
                                  onClick={(e) => { e.stopPropagation(); setLoadChartPlayer(item.jugador_id); setShowLoadChart(true) }}
                                >
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Ver grafica
                                </Button>
                              </div>
                              <ExpandedWellnessRow jugadorId={item.jugador_id} />
                            </td>
                          </tr>
                        )}
                      </>
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

/** Mini-chart row that loads player wellness history on expand */
function ExpandedWellnessRow({ jugadorId }: { jugadorId: string }) {
  const [history, setHistory] = useState<WellnessEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ sueno: 3, fatiga: 3, dolor: 3, estres: 3, humor: 3 })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const res = await wellnessApi.getPlayerHistory(jugadorId, { limit: 14 })
      setHistory(res.data.reverse())
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [jugadorId])

  const handleStartEdit = (entry: WellnessEntry) => {
    setEditingId(entry.id)
    setEditValues({
      sueno: entry.sueno,
      fatiga: entry.fatiga,
      dolor: entry.dolor,
      estres: entry.estres,
      humor: entry.humor,
    })
  }

  const handleSaveEdit = async (entry: WellnessEntry) => {
    setSaving(true)
    try {
      await wellnessApi.update(entry.id, {
        jugador_id: entry.jugador_id,
        fecha: entry.fecha,
        ...editValues,
      })
      toast.success('Registro actualizado')
      setEditingId(null)
      setLoading(true)
      await fetchData()
      mutate((key: string) => typeof key === 'string' && (key.includes('/wellness') || key.includes('/carga')), undefined, { revalidate: true })
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro de wellness?')) return
    setDeleting(id)
    try {
      await wellnessApi.delete(id)
      toast.success('Registro eliminado')
      setHistory((prev) => prev.filter((h) => h.id !== id))
      mutate((key: string) => typeof key === 'string' && (key.includes('/wellness') || key.includes('/carga')), undefined, { revalidate: true })
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        Sin registros de wellness
      </div>
    )
  }

  const FIELDS = [
    { key: 'sueno' as const, icon: Moon, color: 'text-indigo-600', label: 'Sue' },
    { key: 'fatiga' as const, icon: Zap, color: 'text-amber-600', label: 'Fat' },
    { key: 'dolor' as const, icon: Heart, color: 'text-red-600', label: 'Dol' },
    { key: 'estres' as const, icon: Brain, color: 'text-purple-600', label: 'Est' },
    { key: 'humor' as const, icon: Smile, color: 'text-emerald-600', label: 'Hum' },
  ]

  return (
    <div className="p-4 bg-muted/30 border-t space-y-4">
      {/* Chart + last entry summary */}
      <div className="flex items-center gap-6">
        <div className="flex-1 h-32">
          <p className="text-xs font-medium text-muted-foreground mb-1">Wellness total (ultimos 14 registros)</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <XAxis dataKey="fecha" tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 25]} tick={{ fontSize: 9 }} width={25} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="w-48 shrink-0">
          <p className="text-xs font-medium text-muted-foreground mb-2">Ultimo registro</p>
          <div className="grid grid-cols-5 gap-1 text-center">
            {FIELDS.map((f) => {
              const Icon = f.icon
              const val = (history[history.length - 1] as any)[f.key] as number
              return (
                <div key={f.key}>
                  <Icon className={`h-3 w-3 mx-auto ${f.color}`} />
                  <p className="text-[9px] text-muted-foreground">{f.label}</p>
                  <p className={`text-sm font-bold ${val <= 2 ? 'text-red-600' : val >= 4 ? 'text-green-600' : ''}`}>{val}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* History table with edit/delete */}
      <div className="overflow-x-auto max-h-48 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/80">
            <tr className="border-b">
              <th className="pb-1 text-left font-medium">Fecha</th>
              {FIELDS.map((f) => (
                <th key={f.key} className="pb-1 text-center font-medium">{f.label}</th>
              ))}
              <th className="pb-1 text-center font-medium">Total</th>
              <th className="pb-1 text-center font-medium w-20">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map((entry, idx) => {
              const isEditing = editingId === entry.id
              const total = isEditing
                ? editValues.sueno + editValues.fatiga + editValues.dolor + editValues.estres + editValues.humor
                : entry.total

              return (
                <tr key={entry.id} className={`border-b last:border-0 ${isEditing ? 'bg-blue-50/50' : ''}`}>
                  <td className="py-1.5">{entry.fecha}</td>
                  {FIELDS.map((f) => (
                    <td key={f.key} className="py-1.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={editValues[f.key]}
                          onChange={(e) => setEditValues({ ...editValues, [f.key]: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) })}
                          className="w-10 text-center border rounded px-1 py-0.5 text-xs"
                        />
                      ) : (
                        <span className={entry[f.key] <= 2 ? 'text-red-600 font-bold' : ''}>
                          {entry[f.key]}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className={`py-1.5 text-center font-bold ${
                    total >= 20 ? 'text-green-600' : total >= 15 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {total}
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
    </div>
  )
}
