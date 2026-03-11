'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts'
import { cargaApi } from '@/lib/api/carga'
import type { Jugador } from '@/lib/api/jugadores'
import type { CargaDiaria } from '@/types'

interface LoadChartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jugadores: Jugador[]
  equipoId: string
  initialJugadorId?: string
}

const RANGE_OPTIONS = [
  { value: '7', label: '7 dias' },
  { value: '14', label: '14 dias' },
  { value: '28', label: '28 dias' },
  { value: '56', label: '56 dias' },
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function LoadChartDialog({
  open,
  onOpenChange,
  jugadores,
  equipoId,
  initialJugadorId,
}: LoadChartDialogProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>(initialJugadorId || '')
  const [dias, setDias] = useState('28')
  const [data, setData] = useState<CargaDiaria[]>([])
  const [loading, setLoading] = useState(false)
  const [playerName, setPlayerName] = useState('')

  // Set initial player
  useEffect(() => {
    if (open && !selectedPlayer && jugadores.length > 0) {
      setSelectedPlayer(initialJugadorId || jugadores[0].id)
    }
  }, [open, jugadores, initialJugadorId])

  // Fetch data when player or range changes
  useEffect(() => {
    if (!open || !selectedPlayer) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await cargaApi.getHistorial(selectedPlayer, parseInt(dias))
        setData(res.data)
        setPlayerName([res.nombre, res.apellidos].filter(Boolean).join(' '))
      } catch {
        setData([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [open, selectedPlayer, dias])

  // Chart data with formatted dates
  const chartData = useMemo(() =>
    data.map((d) => ({
      ...d,
      label: formatDate(d.fecha),
    })),
    [data],
  )

  // ACWR safe zone bounds for reference area
  const maxAcwr = useMemo(() => {
    const acwrs = data.filter((d) => d.acwr != null).map((d) => d.acwr!)
    return acwrs.length > 0 ? Math.max(...acwrs, 2) : 2
  }, [data])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grafica de Carga</DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Jugador</label>
            <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar jugador" />
              </SelectTrigger>
              <SelectContent>
                {jugadores.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.dorsal ? `#${j.dorsal} ` : ''}{j.nombre} {j.apellidos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Periodo</label>
            <div className="flex gap-1">
              {RANGE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={dias === opt.value ? 'default' : 'outline'}
                  onClick={() => setDias(opt.value)}
                  className="text-xs"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Sin datos de carga para este jugador. Pulsa "Recalcular" primero.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chart 1: Stacked bar - daily load breakdown */}
            <div>
              <h3 className="text-sm font-medium mb-2">Carga Diaria (UA)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      Number(value).toFixed(0) + ' UA',
                      name === 'load_sesion' ? 'Sesion' : name === 'load_partido' ? 'Partido' : 'Manual',
                    ]}
                    labelFormatter={(label) => `Fecha: ${label}`}
                  />
                  <Legend
                    formatter={(value) =>
                      value === 'load_sesion' ? 'Sesion' : value === 'load_partido' ? 'Partido' : 'Manual'
                    }
                  />
                  <Bar dataKey="load_sesion" stackId="load" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="load_partido" stackId="load" fill="#22C55E" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="load_manual" stackId="load" fill="#F97316" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: EWMA lines + ACWR zone */}
            <div>
              <h3 className="text-sm font-medium mb-2">EWMA Aguda / Cronica</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      Number(value).toFixed(1),
                      name === 'ewma_acute' ? 'Aguda (7d)' : 'Cronica (28d)',
                    ]}
                  />
                  <Legend
                    formatter={(value) => (value === 'ewma_acute' ? 'Aguda (7d)' : 'Cronica (28d)')}
                  />
                  <Line type="monotone" dataKey="ewma_acute" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ewma_chronic" stroke="#22C55E" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 3: ACWR with zone bands */}
            <div>
              <h3 className="text-sm font-medium mb-2">ACWR (Ratio Aguda:Cronica)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, maxAcwr]} tick={{ fontSize: 10 }} width={35} />
                  <Tooltip
                    formatter={(value: any) => [
                      value != null ? Number(value).toFixed(2) : '-',
                      'ACWR',
                    ]}
                  />
                  {/* Zone bands */}
                  <ReferenceArea y1={0} y2={0.8} fill="#3B82F6" fillOpacity={0.08} />
                  <ReferenceArea y1={0.8} y2={1.5} fill="#22C55E" fillOpacity={0.1} />
                  <ReferenceArea y1={1.5} y2={2.0} fill="#F97316" fillOpacity={0.1} />
                  <ReferenceArea y1={2.0} y2={maxAcwr} fill="#EF4444" fillOpacity={0.08} />
                  <Line type="monotone" dataKey="acwr" stroke="#8B5CF6" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-3 justify-center text-[10px] text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-100 rounded" /> {'< 0.8 Bajo'}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-100 rounded" /> 0.8-1.5 Optimo</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-orange-100 rounded" /> 1.5-2.0 Alto</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-100 rounded" /> {'> 2.0 Critico'}</span>
              </div>
            </div>

            {/* Data table */}
            <div>
              <h3 className="text-sm font-medium mb-2">Detalle</h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto border rounded">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Fecha</th>
                      <th className="px-2 py-1.5 text-right font-medium">Sesion</th>
                      <th className="px-2 py-1.5 text-right font-medium">Partido</th>
                      <th className="px-2 py-1.5 text-right font-medium">Manual</th>
                      <th className="px-2 py-1.5 text-right font-medium">Total</th>
                      <th className="px-2 py-1.5 text-right font-medium">Aguda</th>
                      <th className="px-2 py-1.5 text-right font-medium">Cronica</th>
                      <th className="px-2 py-1.5 text-right font-medium">ACWR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data].reverse().map((d) => (
                      <tr key={d.fecha} className="border-t">
                        <td className="px-2 py-1">{d.fecha}</td>
                        <td className="px-2 py-1 text-right">{d.load_sesion > 0 ? d.load_sesion.toFixed(0) : '-'}</td>
                        <td className="px-2 py-1 text-right">{d.load_partido > 0 ? d.load_partido.toFixed(0) : '-'}</td>
                        <td className="px-2 py-1 text-right">{d.load_manual > 0 ? d.load_manual.toFixed(0) : '-'}</td>
                        <td className="px-2 py-1 text-right font-medium">{d.load_total > 0 ? d.load_total.toFixed(0) : '-'}</td>
                        <td className="px-2 py-1 text-right">{d.ewma_acute.toFixed(1)}</td>
                        <td className="px-2 py-1 text-right">{d.ewma_chronic.toFixed(1)}</td>
                        <td className="px-2 py-1 text-right font-mono">
                          {d.acwr != null ? (
                            <span className={
                              d.acwr > 2.0 ? 'text-red-600 font-bold' :
                              d.acwr > 1.5 ? 'text-orange-600' :
                              d.acwr >= 0.8 ? 'text-green-600' :
                              'text-blue-600'
                            }>
                              {d.acwr.toFixed(2)}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
