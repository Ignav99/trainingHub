'use client'

import { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { wellnessApi } from '@/lib/api/wellness'
import type { Jugador } from '@/lib/api/jugadores'
import type { WellnessEntry } from '@/types'

interface WellnessChartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jugadores: Jugador[]
  equipoId: string
}

const FIELD_COLORS: Record<string, string> = {
  sueno: '#6366F1',
  fatiga: '#D97706',
  dolor: '#DC2626',
  estres: '#9333EA',
  humor: '#059669',
}

const FIELD_LABELS: Record<string, string> = {
  sueno: 'Sueno',
  fatiga: 'Fatiga',
  dolor: 'Dolor',
  estres: 'Estres',
  humor: 'Humor',
}

function getTotalColor(total: number): string {
  if (total >= 20) return 'text-green-600'
  if (total >= 15) return 'text-amber-600'
  return 'text-red-600'
}

export function WellnessChartDialog({ open, onOpenChange, jugadores, equipoId }: WellnessChartDialogProps) {
  const [selectedJugador, setSelectedJugador] = useState('')
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0])
  const [history, setHistory] = useState<WellnessEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !selectedJugador) {
      setHistory([])
      return
    }
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const res = await wellnessApi.getPlayerHistory(selectedJugador, {
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          limit: 200,
        })
        setHistory(res.data.reverse()) // Oldest first for chart
      } catch {
        setHistory([])
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [open, selectedJugador, fechaDesde, fechaHasta])

  const chartData = useMemo(() =>
    history.map((h) => ({
      fecha: h.fecha,
      total: h.total,
      sueno: h.sueno,
      fatiga: h.fatiga,
      dolor: h.dolor,
      estres: h.estres,
      humor: h.humor,
    })),
    [history]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grafica Extendida — Wellness</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Jugador</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedJugador}
                onChange={(e) => setSelectedJugador(e.target.value)}
              >
                <option value="">Seleccionar jugador...</option>
                {jugadores.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.dorsal ? `${j.dorsal}. ` : ''}{j.nombre} {j.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
          </div>

          {!selectedJugador ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Selecciona un jugador para ver su evolucion de wellness
            </div>
          ) : loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Cargando datos...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Sin registros de wellness en este periodo
            </div>
          ) : (
            <>
              {/* Total wellness chart */}
              <div>
                <h3 className="text-sm font-medium mb-2">Wellness Total</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 25]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Total"
                      />
                      {/* Reference lines for thresholds */}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Individual fields chart */}
              <div>
                <h3 className="text-sm font-medium mb-2">Desglose por campo</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      {Object.entries(FIELD_COLORS).map(([key, color]) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={color}
                          strokeWidth={1.5}
                          dot={{ r: 3 }}
                          name={FIELD_LABELS[key]}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* History table */}
              <div>
                <h3 className="text-sm font-medium mb-2">Historial</h3>
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Fecha</th>
                        <th className="pb-2 font-medium text-center">Sueno</th>
                        <th className="pb-2 font-medium text-center">Fatiga</th>
                        <th className="pb-2 font-medium text-center">Dolor</th>
                        <th className="pb-2 font-medium text-center">Estres</th>
                        <th className="pb-2 font-medium text-center">Humor</th>
                        <th className="pb-2 font-medium text-center">Total</th>
                        <th className="pb-2 font-medium text-center">Alerta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...history].reverse().map((entry) => {
                        const hasAlert = entry.sueno <= 2 || entry.dolor <= 2
                        return (
                          <tr
                            key={entry.id}
                            className={`border-b last:border-0 ${hasAlert ? 'bg-red-50/60' : ''}`}
                          >
                            <td className="py-1.5">{entry.fecha}</td>
                            <td className={`py-1.5 text-center ${entry.sueno <= 2 ? 'text-red-600 font-bold' : ''}`}>{entry.sueno}</td>
                            <td className="py-1.5 text-center">{entry.fatiga}</td>
                            <td className={`py-1.5 text-center ${entry.dolor <= 2 ? 'text-red-600 font-bold' : ''}`}>{entry.dolor}</td>
                            <td className="py-1.5 text-center">{entry.estres}</td>
                            <td className="py-1.5 text-center">{entry.humor}</td>
                            <td className={`py-1.5 text-center font-bold ${getTotalColor(entry.total)}`}>
                              {entry.total}
                            </td>
                            <td className="py-1.5 text-center">
                              {hasAlert && <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" />}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
