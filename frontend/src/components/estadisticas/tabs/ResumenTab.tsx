'use client'

import Link from 'next/link'
import { Trophy, Shield, Target, Activity, ArrowRight, TrendingUp, Flame } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '../StatCard'
import { ChartCard } from '../ChartCard'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import type { EstadisticasDashboardResponse } from '@/lib/api/estadisticasDashboard'
import type { CargaSemanalData } from '@/lib/api/dashboard'

interface ResumenTabProps {
  data: EstadisticasDashboardResponse
  cargaSemanal?: CargaSemanalData
}

export function ResumenTab({ data, cargaSemanal }: ResumenTabProps) {
  const { equipo, jugadores } = data
  const winRate = equipo.total_partidos > 0
    ? Math.round((equipo.victorias / equipo.total_partidos) * 100)
    : 0

  const rpeMedia = cargaSemanal?.promedio_global ?? null
  const disponibles = jugadores.length

  // Racha actual
  const partidos = data.evolucion_partidos
  let racha = ''
  if (partidos.length > 0) {
    const last = partidos[partidos.length - 1]
    let count = 1
    const tipo = last.resultado
    for (let i = partidos.length - 2; i >= 0; i--) {
      if (partidos[i].resultado === tipo) count++
      else break
    }
    const label = tipo === 'victoria' ? 'V' : tipo === 'empate' ? 'E' : 'D'
    racha = `${count}${label}`
  }

  // Last 15 results for bar chart
  const ultimos = partidos.slice(-15).map((p) => {
    const diff = (p.goles_favor || 0) - (p.goles_contra || 0)
    return {
      name: p.rival_nombre?.slice(0, 6) || '?',
      diff,
      score: `${p.goles_favor}-${p.goles_contra}`,
      resultado: p.resultado,
      fill: p.resultado === 'victoria' ? '#10B981' : p.resultado === 'empate' ? '#FBBF24' : '#EF4444',
    }
  })

  // RPE weekly data
  const rpeData = (cargaSemanal?.semanas || []).map((s) => ({
    name: new Date(s.semana_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    rpe: s.rpe_promedio,
    fill: s.rpe_promedio >= 7 ? '#EF4444' : s.rpe_promedio >= 5 ? '#FBBF24' : '#10B981',
  }))

  // Radar: Local vs Visitante
  const maxPJ = Math.max(equipo.local.pj, equipo.visitante.pj, 1)
  const radarData = [
    { stat: 'PG', local: equipo.local.pg, visitante: equipo.visitante.pg },
    { stat: 'PE', local: equipo.local.pe, visitante: equipo.visitante.pe },
    { stat: 'PP', local: equipo.local.pp, visitante: equipo.visitante.pp },
    { stat: 'GF', local: equipo.local.gf, visitante: equipo.visitante.gf },
    { stat: 'GC', local: equipo.local.gc, visitante: equipo.visitante.gc },
    { stat: 'Pts', local: equipo.local.pg * 3 + equipo.local.pe, visitante: equipo.visitante.pg * 3 + equipo.visitante.pe },
  ]

  return (
    <div className="space-y-6">
      {/* RFAF Banner */}
      <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold">Competicion RFAF</p>
              <p className="text-xs text-muted-foreground">Clasificacion, resultados y goleadores en tiempo real</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/estadisticas/competicion">
              Ver competicion
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Trophy} value={equipo.total_partidos} label="Partidos jugados" color="primary" />
        <StatCard icon={Shield} value={`${winRate}%`} label="Win rate" sublabel={`${equipo.victorias}V ${equipo.empates}E ${equipo.derrotas}D`} color="emerald" />
        <StatCard icon={Target} value={`${equipo.goles_favor}/${equipo.goles_contra}`} label="GF / GC" color="blue" />
        <StatCard icon={Activity} value={rpeMedia ?? '-'} label="RPE medio" color="orange" />
        <StatCard icon={TrendingUp} value={disponibles} label="Jugadores" color="purple" />
        <StatCard icon={Flame} value={racha || '-'} label="Racha actual" color={racha.includes('V') ? 'emerald' : racha.includes('D') ? 'red' : 'amber'} />
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Last results */}
        <ChartCard title="Ultimos resultados" isEmpty={ultimos.length === 0}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ultimos}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-popover border rounded-lg px-3 py-2 text-xs shadow-md">
                      <p className="font-medium">{d.name}</p>
                      <p>{d.score}</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="diff" radius={[4, 4, 0, 0]}>
                {ultimos.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Victoria</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" /> Empate</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" /> Derrota</span>
          </div>
        </ChartCard>

        {/* RPE weekly */}
        <ChartCard title="Carga semanal (RPE)" isEmpty={rpeData.length === 0} emptyMessage="Sin registros RPE">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={rpeData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  return (
                    <div className="bg-popover border rounded-lg px-3 py-2 text-xs shadow-md">
                      <p>RPE: <span className="font-bold">{payload[0].value}</span></p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="rpe" radius={[4, 4, 0, 0]}>
                {rpeData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Radar: Local vs Visitante */}
      <ChartCard title="Local vs Visitante" isEmpty={equipo.total_partidos === 0}>
        <div className="flex justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="stat" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              <Radar name="Local" dataKey="local" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
              <Radar name="Visitante" dataKey="visitante" stroke="#F97316" fill="#F97316" fillOpacity={0.3} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-6 justify-center text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> Local ({equipo.local.pj} PJ)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-500" /> Visitante ({equipo.visitante.pj} PJ)</span>
        </div>
      </ChartCard>
    </div>
  )
}
