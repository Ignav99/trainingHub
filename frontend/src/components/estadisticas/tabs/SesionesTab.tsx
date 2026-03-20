'use client'

import { StatCard } from '../StatCard'
import { ChartCard } from '../ChartCard'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'
import { Dumbbell, CheckCircle, Clock, Zap } from 'lucide-react'
import type { SesionesData } from '@/lib/api/estadisticasDashboard'
import type { CargaSemanalData } from '@/lib/api/dashboard'

interface Props {
  sesiones: SesionesData
  cargaSemanal?: CargaSemanalData
}

const MD_ORDER = ['MD+1', 'MD-4', 'MD-3', 'MD-2', 'MD-1']
const MD_COLORS: Record<string, string> = {
  'MD+1': '#22C55E',
  'MD-4': '#EF4444',
  'MD-3': '#F59E0B',
  'MD-2': '#3B82F6',
  'MD-1': '#8B5CF6',
}

const FASE_LABELS: Record<string, string> = {
  ataque_organizado: 'Ataque organizado',
  defensa_organizada: 'Defensa organizada',
  transicion_ataque_defensa: 'Trans. AT→DF',
  transicion_defensa_ataque: 'Trans. DF→AT',
}

const FASE_COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899']

const CARGA_LABELS: Record<string, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  muy_baja: 'Muy baja',
  recuperacion: 'Recuperacion',
}

const CARGA_COLORS: Record<string, string> = {
  alta: '#EF4444',
  media: '#F59E0B',
  baja: '#10B981',
  muy_baja: '#3B82F6',
  recuperacion: '#8B5CF6',
}

export function SesionesTab({ sesiones, cargaSemanal }: Props) {
  // Dominant load
  const cargaDominante = Object.entries(sesiones.por_carga)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '-'

  // Match Day bar data
  const mdData = MD_ORDER
    .filter((md) => sesiones.por_match_day[md] !== undefined)
    .map((md) => ({
      name: md,
      sesiones: sesiones.por_match_day[md] || 0,
      fill: MD_COLORS[md] || '#9CA3AF',
    }))
  // Add any non-standard MDs
  Object.entries(sesiones.por_match_day).forEach(([md, count]) => {
    if (!MD_ORDER.includes(md)) {
      mdData.push({ name: md, sesiones: count, fill: '#9CA3AF' })
    }
  })

  // Fase de juego pie
  const faseData = Object.entries(sesiones.por_fase_juego)
    .filter(([, v]) => v > 0)
    .map(([k, v], i) => ({
      name: FASE_LABELS[k] || k,
      value: v,
      fill: FASE_COLORS[i % FASE_COLORS.length],
    }))

  // Carga bar data
  const cargaData = Object.entries(sesiones.por_carga)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      name: CARGA_LABELS[k] || k,
      sesiones: v,
      fill: CARGA_COLORS[k] || '#9CA3AF',
    }))

  // RPE weekly (extended 12 weeks from cargaSemanal)
  const rpeData = (cargaSemanal?.semanas || []).map((s) => ({
    name: new Date(s.semana_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    rpe: s.rpe_promedio,
    fill: s.rpe_promedio >= 7 ? '#EF4444' : s.rpe_promedio >= 5 ? '#FBBF24' : '#10B981',
  }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Dumbbell} value={sesiones.total} label="Total sesiones" color="primary" />
        <StatCard icon={CheckCircle} value={sesiones.completadas} label="Completadas" color="emerald" />
        <StatCard icon={Clock} value={`${sesiones.duracion_media}'`} label="Duracion media" color="blue" />
        <StatCard icon={Zap} value={CARGA_LABELS[cargaDominante] || cargaDominante} label="Carga dominante" color="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Sessions by Match Day */}
        <ChartCard title="Sesiones por Match Day" isEmpty={mdData.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={mdData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="sesiones" radius={[4, 4, 0, 0]}>
                {mdData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Phases pie */}
        <ChartCard title="Distribucion por fase de juego" isEmpty={faseData.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={faseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} label={({ name, value }) => `${name}: ${value}`}>
                {faseData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Load distribution */}
        <ChartCard title="Distribucion por carga fisica" isEmpty={cargaData.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cargaData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="sesiones" radius={[4, 4, 0, 0]}>
                {cargaData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* RPE weekly */}
        <ChartCard title="RPE semanal" isEmpty={rpeData.length === 0} emptyMessage="Sin registros RPE">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rpeData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="rpe" radius={[4, 4, 0, 0]}>
                {rpeData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
