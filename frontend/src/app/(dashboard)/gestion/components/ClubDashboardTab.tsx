'use client'

import { useEffect, useState } from 'react'
import { Users, UserCheck, Calendar, ClipboardList, Swords, HeartPulse, Bot, HardDrive, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi } from '@/lib/api/clubAdmin'
import type { ClubDashboard, ClubEquipo, TeamAnalytics, CoachActivity } from './types'

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function ClubDashboardTab() {
  const [dashboard, setDashboard] = useState<ClubDashboard | null>(null)
  const [equipos, setEquipos] = useState<ClubEquipo[]>([])
  const [analytics, setAnalytics] = useState<{ per_team: TeamAnalytics[]; coach_activity: CoachActivity[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dash, eq, anal] = await Promise.all([
        clubAdminApi.getDashboard(),
        clubAdminApi.getEquipos(),
        clubAdminApi.getAnalytics(6),
      ])
      setDashboard(dash)
      setEquipos(eq)
      setAnalytics(anal)
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!dashboard) return null

  const kpiCards = [
    { label: 'Jugadores', value: dashboard.total_jugadores, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Staff', value: dashboard.total_staff, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Sesiones (mes)', value: dashboard.sesiones_mes, icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Tareas (mes)', value: dashboard.tareas_mes, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Partidos', value: dashboard.partidos_temporada, icon: Swords, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Lesiones activas', value: dashboard.lesiones_activas, icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-50' },
  ]

  // Chart data
  const sesionesPerTeam = equipos.map(e => ({
    name: e.nombre.length > 12 ? e.nombre.slice(0, 12) + '...' : e.nombre,
    sesiones: e.sesiones_mes,
  }))

  const tareasPerCoach = (analytics?.coach_activity || [])
    .filter(c => c.sesiones_creadas > 0)
    .map(c => ({
      name: c.nombre.length > 15 ? c.nombre.slice(0, 15) + '...' : c.nombre,
      sesiones: c.sesiones_creadas,
    }))

  const teamPieData = (analytics?.per_team || []).map(t => ({
    name: t.equipo_nombre,
    value: t.sesiones + t.tareas,
  }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.bg} mb-3`}>
              <card.icon className={`h-4.5 w-4.5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Extra KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-50">
            <Bot className="h-4.5 w-4.5 text-indigo-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{dashboard.ai_calls_mes}</p>
            <p className="text-xs text-gray-500">Llamadas AI (mes)</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-cyan-50">
            <HardDrive className="h-4.5 w-4.5 text-cyan-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{dashboard.storage_mb} MB</p>
            <p className="text-xs text-gray-500">Almacenamiento</p>
          </div>
        </div>
      </div>

      {/* Charts 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions per team */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Sesiones por equipo (este mes)</h3>
          {sesionesPerTeam.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sesionesPerTeam}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="sesiones" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Sin datos</p>
          )}
        </div>

        {/* Activity by coach */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Sesiones por entrenador</h3>
          {tareasPerCoach.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tareasPerCoach} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="sesiones" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Sin datos</p>
          )}
        </div>

        {/* Team activity distribution */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribucion de actividad por equipo</h3>
          {teamPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={teamPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {teamPieData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Sin datos</p>
          )}
        </div>

        {/* Team stats table */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Resumen por equipo</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-gray-500">Equipo</th>
                  <th className="pb-2 font-medium text-gray-500 text-right">Jugadores</th>
                  <th className="pb-2 font-medium text-gray-500 text-right">Staff</th>
                  <th className="pb-2 font-medium text-gray-500 text-right">Sesiones</th>
                  <th className="pb-2 font-medium text-gray-500 text-right">Partidos</th>
                </tr>
              </thead>
              <tbody>
                {equipos.map(e => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-2 font-medium text-gray-900">{e.nombre}</td>
                    <td className="py-2 text-right tabular-nums">{e.num_jugadores}</td>
                    <td className="py-2 text-right tabular-nums">{e.num_staff}</td>
                    <td className="py-2 text-right tabular-nums">{e.sesiones_mes}</td>
                    <td className="py-2 text-right tabular-nums">{e.num_partidos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
