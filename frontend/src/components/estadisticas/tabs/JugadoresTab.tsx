'use client'

import { useState, useMemo } from 'react'
import { ChartCard } from '../ChartCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { Users, ArrowUpDown } from 'lucide-react'
import type { JugadorStats } from '@/lib/api/estadisticasDashboard'

interface Props {
  jugadores: JugadorStats[]
}

type SortKey = 'minutos_totales' | 'goles' | 'asistencias' | 'amarillas' | 'convocatorias' | 'titularidades' | 'rojas'
type PosFilter = 'todos' | 'POR' | 'DFC' | 'LTD' | 'LTI' | 'MCD' | 'MC' | 'MCO' | 'ED' | 'EI' | 'DC'

const POS_GROUPS: Record<string, string[]> = {
  POR: ['POR'],
  DEF: ['DFC', 'LTD', 'LTI', 'CAD', 'CAI'],
  MED: ['MCD', 'MC', 'MCO', 'MD', 'MI'],
  ATK: ['ED', 'EI', 'DC', 'MP', 'SD'],
}

export function JugadoresTab({ jugadores }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('minutos_totales')
  const [sortAsc, setSortAsc] = useState(false)
  const [posFilter, setPosFilter] = useState<string>('todos')
  const [comparar, setComparar] = useState<string[]>([])

  const filtered = useMemo(() => {
    let list = [...jugadores]
    if (posFilter !== 'todos') {
      const positions = POS_GROUPS[posFilter] || [posFilter]
      list = list.filter((j) => positions.includes(j.posicion_principal))
    }
    list.sort((a, b) => {
      const va = a[sortKey] ?? 0
      const vb = b[sortKey] ?? 0
      return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number)
    })
    return list
  }, [jugadores, posFilter, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="pb-2 font-medium text-center cursor-pointer hover:text-foreground select-none"
      onClick={() => handleSort(k)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {sortKey === k && <ArrowUpDown className="h-3 w-3" />}
      </span>
    </th>
  )

  // Bar chart: top 20 by minutes
  const minutosData = jugadores
    .slice(0, 20)
    .map((j) => ({ name: `${j.nombre} ${j.apellidos?.charAt(0) || ''}`.trim(), min: j.minutos_totales }))

  // Scatter: Goles vs Asistencias
  const scatterData = jugadores
    .filter((j) => j.goles > 0 || j.asistencias > 0)
    .map((j) => ({ x: j.goles, y: j.asistencias, z: j.minutos_totales, name: `${j.nombre} ${j.apellidos?.charAt(0) || ''}` }))

  // Radar comparator
  const comparadosData = useMemo(() => {
    if (comparar.length < 2) return []
    const players = comparar.map((id) => jugadores.find((j) => j.jugador_id === id)).filter(Boolean) as JugadorStats[]
    const axes = ['goles', 'asistencias', 'minutos_totales', 'convocatorias', 'amarillas'] as const
    const maxVals = axes.map((a) => Math.max(...players.map((p) => p[a] || 0), 1))
    return axes.map((a, i) => {
      const row: Record<string, unknown> = { stat: a.charAt(0).toUpperCase() + a.slice(1).replace('_', ' ') }
      players.forEach((p) => { row[p.nombre] = Math.round(((p[a] || 0) / maxVals[i]) * 100) })
      return row
    })
  }, [comparar, jugadores])

  const toggleComparar = (id: string) => {
    setComparar((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['todos', 'POR', 'DEF', 'MED', 'ATK'].map((f) => (
          <button
            key={f}
            onClick={() => setPosFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              posFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f === 'todos' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5" /> Jugadores ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="pb-2 font-medium w-6" />
                  <th className="pb-2 font-medium">Jugador</th>
                  <th className="pb-2 font-medium text-center w-12">Pos</th>
                  <SortHeader k="convocatorias" label="Conv" />
                  <SortHeader k="titularidades" label="Tit" />
                  <SortHeader k="minutos_totales" label="Min" />
                  <SortHeader k="goles" label="Gol" />
                  <SortHeader k="asistencias" label="Ast" />
                  <SortHeader k="amarillas" label="TA" />
                  <SortHeader k="rojas" label="TR" />
                  <th className="pb-2 font-medium text-center">Min/Gol</th>
                  <th className="pb-2 font-medium text-center">% Tit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => (
                  <tr key={j.jugador_id} className="border-b last:border-0 row-hover">
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={comparar.includes(j.jugador_id)}
                        onChange={() => toggleComparar(j.jugador_id)}
                        className="h-3.5 w-3.5 rounded"
                        title="Comparar"
                      />
                    </td>
                    <td className="py-2 font-medium">
                      <span className="text-muted-foreground text-xs mr-1.5">{j.dorsal || '-'}</span>
                      {j.nombre} {j.apellidos}
                    </td>
                    <td className="py-2 text-center"><Badge variant="outline" className="text-[10px]">{j.posicion_principal}</Badge></td>
                    <td className="py-2 text-center">{j.convocatorias}</td>
                    <td className="py-2 text-center">{j.titularidades}</td>
                    <td className="py-2 text-center font-medium">{j.minutos_totales}</td>
                    <td className="py-2 text-center font-medium text-emerald-600">{j.goles || '-'}</td>
                    <td className="py-2 text-center text-blue-600">{j.asistencias || '-'}</td>
                    <td className="py-2 text-center text-amber-600">{j.amarillas || '-'}</td>
                    <td className="py-2 text-center text-red-600">{j.rojas || '-'}</td>
                    <td className="py-2 text-center text-muted-foreground">{j.minutos_por_gol ?? '-'}</td>
                    <td className="py-2 text-center">{j.ratio_titular}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Minutes bar chart */}
        <ChartCard title="Minutos por jugador (Top 20)" isEmpty={minutosData.length === 0}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={minutosData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip />
              <Bar dataKey="min" fill="#3B82F6" name="Minutos" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Scatter: Goles vs Asistencias */}
        <ChartCard title="Goles vs Asistencias" isEmpty={scatterData.length === 0} emptyMessage="Sin goles ni asistencias registrados">
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="x" name="Goles" tick={{ fontSize: 10 }} label={{ value: 'Goles', position: 'bottom', fontSize: 11 }} />
              <YAxis dataKey="y" name="Asistencias" tick={{ fontSize: 10 }} label={{ value: 'Asistencias', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <ZAxis dataKey="z" range={[40, 400]} name="Minutos" />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const d = payload[0].payload
                return (
                  <div className="bg-popover border rounded-lg px-3 py-2 text-xs shadow-md">
                    <p className="font-medium">{d.name}</p>
                    <p>Goles: {d.x} | Asist: {d.y}</p>
                    <p>Minutos: {d.z}</p>
                  </div>
                )
              }} />
              <Scatter data={scatterData} fill="#8B5CF6" />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Radar comparator */}
      {comparar.length >= 2 && (
        <ChartCard title={`Comparador: ${comparar.map((id) => jugadores.find((j) => j.jugador_id === id)?.nombre).join(' vs ')}`}>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={comparadosData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="stat" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              {comparar.map((id, i) => {
                const j = jugadores.find((j) => j.jugador_id === id)
                const colors = ['#3B82F6', '#F97316', '#8B5CF6']
                return j ? <Radar key={id} name={j.nombre} dataKey={j.nombre} stroke={colors[i]} fill={colors[i]} fillOpacity={0.2} /> : null
              })}
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}
