'use client'

import { StatCard } from '../StatCard'
import { ChartCard } from '../ChartCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { HeartPulse, Activity, Calendar, Users } from 'lucide-react'
import type { MedicoData } from '@/lib/api/estadisticasDashboard'

interface Props {
  medico: MedicoData
  totalJugadores: number
}

const TIPO_LABELS: Record<string, string> = {
  lesion: 'Lesion',
  enfermedad: 'Enfermedad',
  rehabilitacion: 'Rehabilitacion',
  molestias: 'Molestias',
}

const TIPO_COLORS: Record<string, string> = {
  lesion: '#EF4444',
  enfermedad: '#F59E0B',
  rehabilitacion: '#3B82F6',
  molestias: '#8B5CF6',
}

const ESTADO_BADGE: Record<string, string> = {
  activa: 'bg-red-100 text-red-700',
  en_recuperacion: 'bg-amber-100 text-amber-700',
  alta: 'bg-emerald-100 text-emerald-700',
}

export function EnfermeriaTab({ medico, totalJugadores }: Props) {
  const tasaLesional = totalJugadores > 0
    ? ((medico.total_registros / totalJugadores) * 100).toFixed(1)
    : '0'

  // Pie: by type
  const pieData = Object.entries(medico.por_tipo)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      name: TIPO_LABELS[k] || k,
      value: v,
      fill: TIPO_COLORS[k] || '#9CA3AF',
    }))

  // Bar: days off by player
  const diasBajaData = medico.por_jugador
    .filter((j) => j.dias_baja > 0)
    .slice(0, 15)
    .map((j) => ({
      name: j.nombre?.split(' ')[0] || '?',
      fullName: j.nombre,
      dias: j.dias_baja,
      registros: j.registros,
    }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={HeartPulse} value={medico.activos} label="Lesiones activas" color="red" />
        <StatCard icon={Activity} value={medico.en_recuperacion} label="En recuperacion" color="amber" />
        <StatCard icon={Calendar} value={medico.dias_baja_totales} label="Dias baja totales" color="purple" />
        <StatCard icon={Users} value={`${tasaLesional}%`} label="Tasa lesional" sublabel={`${medico.total_registros} registros / ${totalJugadores} jug.`} color="orange" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie: by type */}
        <ChartCard title="Registros por tipo" isEmpty={pieData.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Bar: days off by player */}
        <ChartCard title="Dias de baja por jugador" isEmpty={diasBajaData.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={diasBajaData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={60} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-popover border rounded-lg px-3 py-2 text-xs shadow-md">
                      <p className="font-medium">{d.fullName}</p>
                      <p>{d.dias} dias | {d.registros} registros</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="dias" fill="#EF4444" name="Dias baja" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent records table */}
      {medico.registros_recientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HeartPulse className="h-5 w-5" />
              Registros recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="pb-2 font-medium">Jugador</th>
                    <th className="pb-2 font-medium">Titulo</th>
                    <th className="pb-2 font-medium text-center">Tipo</th>
                    <th className="pb-2 font-medium text-center">Estado</th>
                    <th className="pb-2 font-medium">Fecha inicio</th>
                    <th className="pb-2 font-medium">Fecha alta</th>
                  </tr>
                </thead>
                <tbody>
                  {medico.registros_recientes.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 row-hover">
                      <td className="py-2.5 font-medium">{r.jugador_nombre}</td>
                      <td className="py-2.5 text-muted-foreground">{r.titulo}</td>
                      <td className="py-2.5 text-center">
                        <Badge variant="outline" className="text-[10px]">{TIPO_LABELS[r.tipo] || r.tipo}</Badge>
                      </td>
                      <td className="py-2.5 text-center">
                        <Badge className={`text-[10px] ${ESTADO_BADGE[r.estado] || 'bg-gray-100 text-gray-700'}`}>
                          {r.estado === 'en_recuperacion' ? 'Recuperacion' : r.estado}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted-foreground text-xs">
                        {r.fecha_inicio ? new Date(r.fecha_inicio).toLocaleDateString('es-ES') : '-'}
                      </td>
                      <td className="py-2.5 text-muted-foreground text-xs">
                        {r.fecha_alta ? new Date(r.fecha_alta).toLocaleDateString('es-ES') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
