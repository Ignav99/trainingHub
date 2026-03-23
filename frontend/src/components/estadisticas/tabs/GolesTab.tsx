'use client'

import { StatCard } from '../StatCard'
import { ChartCard } from '../ChartCard'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
  PieChart, Pie,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { Crosshair, Shield, Target, CornerDownRight } from 'lucide-react'
import type { EstadisticasDashboardResponse } from '@/lib/api/estadisticasDashboard'

interface Props {
  data: EstadisticasDashboardResponse
}

const PERIOD_LABELS: Record<string, string> = {
  '0_20': '0-20\'',
  '20_45': '20-45\'',
  '45_65': '45-65\'',
  '65_90': '65-90\'',
}

const TIPO_GOL_LABELS: Record<string, string> = {
  corner: 'Corner',
  falta_directa: 'Falta directa',
  falta_indirecta: 'Falta indirecta',
  penalti: 'Penalti',
  balon_filtrado: 'Balon filtrado',
  balon_espalda: 'Balon espalda',
  centro_lateral: 'Centro lateral',
  jugada_individual: 'Jugada individual',
  contraataque: 'Contraataque',
  saque_banda: 'Saque banda',
  error_rival: 'Error rival',
  otro: 'Otro',
}

const PIE_COLORS_FAVOR = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6', '#6366F1', '#EF4444']
const PIE_COLORS_CONTRA = ['#EF4444', '#F97316', '#FBBF24', '#9CA3AF', '#6B7280', '#374151', '#DC2626', '#FB923C']

export function GolesTab({ data }: Props) {
  const { goles, equipo, estadisticas_acumuladas: stats } = data
  const gf = equipo.goles_favor
  const gc = equipo.goles_contra

  // ABP percentages
  const abpKeys = ['corner', 'falta_directa', 'falta_indirecta', 'penalti', 'saque_banda']
  const golesABPFavor = Object.entries(goles.tipos_favor)
    .filter(([k]) => abpKeys.includes(k))
    .reduce((s, [, v]) => s + v, 0)
  const golesABPContra = Object.entries(goles.tipos_contra)
    .filter(([k]) => abpKeys.includes(k))
    .reduce((s, [, v]) => s + v, 0)

  const pctABPFavor = gf > 0 ? Math.round((golesABPFavor / gf) * 100) : 0
  const pctABPContra = gc > 0 ? Math.round((golesABPContra / gc) * 100) : 0

  // Period chart data
  const allPeriods = new Set([...Object.keys(goles.por_periodo_favor), ...Object.keys(goles.por_periodo_contra)])
  const periodData = Array.from(allPeriods)
    .sort()
    .map((p) => ({
      name: PERIOD_LABELS[p] || p,
      favor: goles.por_periodo_favor[p] || 0,
      contra: goles.por_periodo_contra[p] || 0,
    }))

  // Pie data
  const pieDataFavor = Object.entries(goles.tipos_favor)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v], i) => ({ name: TIPO_GOL_LABELS[k] || k, value: v, fill: PIE_COLORS_FAVOR[i % PIE_COLORS_FAVOR.length] }))

  const pieDataContra = Object.entries(goles.tipos_contra)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v], i) => ({ name: TIPO_GOL_LABELS[k] || k, value: v, fill: PIE_COLORS_CONTRA[i % PIE_COLORS_CONTRA.length] }))

  // Cumulative GF/GC line
  let acumGF = 0
  let acumGC = 0
  const acumData = data.evolucion_partidos.map((p) => {
    acumGF += p.goles_favor || 0
    acumGC += p.goles_contra || 0
    return {
      name: p.rival_nombre?.slice(0, 5) || `J${p.jornada || ''}`,
      GF: acumGF,
      GC: acumGC,
    }
  })

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Crosshair} value={gf} label="Goles a favor" color="emerald" />
        <StatCard icon={Shield} value={gc} label="Goles en contra" color="red" />
        <StatCard icon={Target} value={`${pctABPFavor}%`} label="Goles ABP favor" sublabel={`${golesABPFavor} de ${gf}`} color="blue" />
        <StatCard icon={CornerDownRight} value={`${pctABPContra}%`} label="Goles ABP contra" sublabel={`${golesABPContra} de ${gc}`} color="amber" />
      </div>

      {/* Goals by period */}
      <ChartCard title="Goles por periodo" isEmpty={periodData.length === 0}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={periodData}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="favor" fill="#10B981" name="A favor" radius={[4, 4, 0, 0]} />
            <Bar dataKey="contra" fill="#EF4444" name="En contra" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Pie charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard title="Como marcamos" isEmpty={pieDataFavor.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieDataFavor} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} label={({ name, value }) => `${name}: ${value}`}>
                {pieDataFavor.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Como nos marcan" isEmpty={pieDataContra.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieDataContra} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} label={({ name, value }) => `${name}: ${value}`}>
                {pieDataContra.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Zone distribution */}
      {(() => {
        const zf = goles.zonas_favor || {}
        const zc = goles.zonas_contra || {}
        const allZones = new Set([...Object.keys(zf), ...Object.keys(zc)])
        const ZONE_LABELS: Record<string, string> = {
          izquierda: 'Izquierda',
          central: 'Central',
          derecha: 'Derecha',
          central_lejana: 'Lejana',
        }
        const zoneData = ['izquierda', 'central', 'derecha', 'central_lejana']
          .filter((z) => allZones.has(z) || zf[z] || zc[z])
          .map((z) => ({
            name: ZONE_LABELS[z] || z,
            favor: zf[z] || 0,
            contra: zc[z] || 0,
          }))
        return (
          <ChartCard title="Goles por zona de ataque" isEmpty={zoneData.length === 0}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={zoneData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="favor" fill="#10B981" name="A favor" radius={[4, 4, 0, 0]} />
                <Bar dataKey="contra" fill="#EF4444" name="En contra" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )
      })()}

      {/* Cumulative line */}
      <ChartCard title="GF y GC acumulados" isEmpty={acumData.length === 0}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={acumData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="GF" stroke="#10B981" strokeWidth={2} name="Goles a favor" dot={{ r: 2 }} />
            <Line type="monotone" dataKey="GC" stroke="#EF4444" strokeWidth={2} name="Goles en contra" dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
