'use client'

import { useState, useMemo } from 'react'
import { StatCard } from '../StatCard'
import { ChartCard } from '../ChartCard'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
  PieChart, Pie,
} from 'recharts'
import { Crosshair, Target, CornerDownRight, ArrowLeftRight } from 'lucide-react'
import type { EstadisticasDashboardResponse } from '@/lib/api/estadisticasDashboard'

interface Props {
  data: EstadisticasDashboardResponse
}

const STAT_OPTIONS = [
  { key: 'tiros_a_puerta', label: 'Tiros a puerta' },
  { key: 'ocasiones_gol', label: 'Ocasiones de gol' },
  { key: 'saques_esquina', label: 'Corners' },
  { key: 'faltas_cometidas', label: 'Faltas' },
  { key: 'balones_recuperados', label: 'Recuperaciones' },
  { key: 'balones_perdidos', label: 'Perdidas' },
] as const

type LocaliaFilter = 'todos' | 'local' | 'visitante'

export function PartidoStatsTab({ data }: Props) {
  const { estadisticas_acumuladas: stats, evolucion_partidos } = data
  const [selectedStat, setSelectedStat] = useState<string>('tiros_a_puerta')
  const [localia, setLocalia] = useState<LocaliaFilter>('todos')

  const filteredPartidos = useMemo(() => {
    if (localia === 'todos') return evolucion_partidos
    return evolucion_partidos.filter((p) => p.localia === localia)
  }, [evolucion_partidos, localia])

  const pcs = stats.partidos_con_estadisticas || 1

  // Horizontal comparison bars
  const comparacion = [
    { stat: 'Tiros a puerta', equipo: stats.tiros_a_puerta, rival: stats.rival_tiros_a_puerta },
    { stat: 'Ocasiones gol', equipo: stats.ocasiones_gol, rival: stats.rival_ocasiones_gol },
    { stat: 'Corners', equipo: stats.saques_esquina, rival: stats.rival_saques_esquina },
    { stat: 'Faltas', equipo: stats.faltas_cometidas, rival: stats.rival_faltas_cometidas },
    { stat: 'Amarillas', equipo: stats.tarjetas_amarillas, rival: stats.rival_tarjetas_amarillas },
    { stat: 'Rojas', equipo: stats.tarjetas_rojas, rival: stats.rival_tarjetas_rojas },
    { stat: 'Fueras juego', equipo: stats.fueras_juego, rival: stats.rival_fueras_juego },
  ]

  // Evolution line chart data
  const lineData = filteredPartidos.map((p) => ({
    name: p.rival_nombre?.slice(0, 5) || `J${p.jornada || ''}`,
    equipo: (p as unknown as Record<string, unknown>)[selectedStat] ?? null,
    rival: (p as unknown as Record<string, unknown>)[`rival_${selectedStat}`] ?? null,
  }))

  // Pie: Recuperaciones vs Perdidas
  const recPerd = [
    { name: 'Recuperados', value: stats.balones_recuperados, fill: '#10B981' },
    { name: 'Perdidos', value: stats.balones_perdidos, fill: '#EF4444' },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex gap-2">
        {(['todos', 'local', 'visitante'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setLocalia(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              localia === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f === 'todos' ? 'Todos' : f === 'local' ? 'Local' : 'Visitante'}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Crosshair} value={stats.promedios?.tiros_a_puerta?.toFixed(1) || '0'} label="Tiros/partido" color="blue" />
        <StatCard icon={CornerDownRight} value={stats.promedios?.saques_esquina?.toFixed(1) || '0'} label="Corners/partido" color="amber" />
        <StatCard
          icon={Target}
          value={stats.tiros_a_puerta > 0 ? `${Math.round((data.equipo.goles_favor / stats.tiros_a_puerta) * 100)}%` : '-'}
          label="Eficacia (GF/Tiros)"
          color="emerald"
        />
        <StatCard icon={ArrowLeftRight} value={`${stats.balones_recuperados}/${stats.balones_perdidos}`} label="Recup. / Perdidas" color="purple" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Horizontal comparison */}
        <ChartCard title="Equipo vs Rivales (acumulado)" isEmpty={stats.partidos_con_estadisticas === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparacion} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="stat" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="equipo" fill="#3B82F6" name="Equipo" radius={[0, 4, 4, 0]} />
              <Bar dataKey="rival" fill="#9CA3AF" name="Rivales" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Pie: Recuperaciones vs Perdidas */}
        <ChartCard title="Balones recuperados vs perdidos" isEmpty={recPerd.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={recPerd} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} label={({ name, value }) => `${name}: ${value}`}>
                {recPerd.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Evolution line chart */}
      <ChartCard
        title="Evolucion por jornada"
        isEmpty={lineData.length === 0}
        action={
          <select
            value={selectedStat}
            onChange={(e) => setSelectedStat(e.target.value)}
            className="text-xs border rounded px-2 py-1 bg-background"
          >
            {STAT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        }
      >
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="equipo" stroke="#3B82F6" name="Equipo" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="rival" stroke="#9CA3AF" name="Rival" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
