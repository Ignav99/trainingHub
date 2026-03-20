'use client'

import { StatCard } from '../StatCard'
import { ChartCard } from '../ChartCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { AlertTriangle, ShieldAlert, CreditCard, Users } from 'lucide-react'
import type { EstadisticasDashboardResponse, JugadorStats } from '@/lib/api/estadisticasDashboard'

interface Props {
  data: EstadisticasDashboardResponse
}

const APERCIBIMIENTO_LIMITE = 5

export function DisciplinaTab({ data }: Props) {
  const { estadisticas_acumuladas: stats, evolucion_partidos, jugadores } = data

  // KPIs
  const faltasCometidas = stats.faltas_cometidas
  const faltasRecibidas = stats.rival_faltas_cometidas
  const totalAmarillas = stats.tarjetas_amarillas
  const totalRojas = stats.tarjetas_rojas

  // Line chart: Faltas by match
  const faltasData = evolucion_partidos.map((p) => ({
    name: p.rival_nombre?.slice(0, 5) || `J${p.jornada || ''}`,
    cometidas: p.faltas_cometidas ?? 0,
    recibidas: p.rival_faltas_cometidas ?? 0,
  }))

  // Bar: Cards by player
  const jugadoresConTarjetas = jugadores
    .filter((j) => j.amarillas > 0 || j.rojas > 0)
    .sort((a, b) => (b.amarillas + b.rojas * 2) - (a.amarillas + a.rojas * 2))
    .map((j) => ({
      name: `${j.nombre} ${j.apellidos?.charAt(0) || ''}`.trim(),
      amarillas: j.amarillas,
      rojas: j.rojas,
    }))

  // Bar: Cards by match
  const tarjetasPorPartido = evolucion_partidos
    .filter((p) => (p.tarjetas_amarillas ?? 0) > 0 || (p.tarjetas_rojas ?? 0) > 0)
    .map((p) => ({
      name: p.rival_nombre?.slice(0, 5) || `J${p.jornada || ''}`,
      amarillas: p.tarjetas_amarillas ?? 0,
      rojas: p.tarjetas_rojas ?? 0,
    }))

  // Apercibidos
  const apercibidos = jugadores
    .filter((j) => j.amarillas >= APERCIBIMIENTO_LIMITE - 1 && j.amarillas > 0)
    .sort((a, b) => b.amarillas - a.amarillas)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} value={faltasCometidas} label="Faltas cometidas" color="amber" />
        <StatCard icon={ShieldAlert} value={faltasRecibidas} label="Faltas recibidas" color="blue" />
        <StatCard icon={CreditCard} value={totalAmarillas} label="Tarjetas amarillas" color="amber" />
        <StatCard icon={CreditCard} value={totalRojas} label="Tarjetas rojas" color="red" />
      </div>

      {/* Faltas evolution */}
      <ChartCard title="Faltas cometidas vs recibidas" isEmpty={faltasData.length === 0}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={faltasData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="cometidas" stroke="#F59E0B" strokeWidth={2} name="Cometidas" dot={{ r: 2 }} connectNulls />
            <Line type="monotone" dataKey="recibidas" stroke="#3B82F6" strokeWidth={2} name="Recibidas" dot={{ r: 2 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Cards by player */}
        <ChartCard title="Tarjetas por jugador" isEmpty={jugadoresConTarjetas.length === 0}>
          <ResponsiveContainer width="100%" height={Math.max(200, jugadoresConTarjetas.length * 28)}>
            <BarChart data={jugadoresConTarjetas} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip />
              <Legend />
              <Bar dataKey="amarillas" stackId="a" fill="#FBBF24" name="Amarillas" />
              <Bar dataKey="rojas" stackId="a" fill="#EF4444" name="Rojas" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cards by match */}
        <ChartCard title="Tarjetas por jornada" isEmpty={tarjetasPorPartido.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={tarjetasPorPartido}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="amarillas" fill="#FBBF24" name="Amarillas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rojas" fill="#EF4444" name="Rojas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Apercibidos */}
      {apercibidos.length > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              Apercibidos (cerca de sancion)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {apercibidos.map((j) => (
                <div key={j.jugador_id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{j.dorsal || '-'}</span>
                    <span className="text-sm font-medium">{j.nombre} {j.apellidos}</span>
                    <Badge variant="outline" className="text-[10px]">{j.posicion_principal}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-amber-600">{j.amarillas} amarillas</span>
                    {j.amarillas >= APERCIBIMIENTO_LIMITE && (
                      <Badge className="bg-red-100 text-red-700 text-[10px]">SANCIONADO</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
