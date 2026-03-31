'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi } from '@/lib/api/clubAdmin'
import type { TeamAnalytics, CoachActivity } from './types'

import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<{ per_team: TeamAnalytics[]; coach_activity: CoachActivity[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [meses, setMeses] = useState(6)

  useEffect(() => { loadData() }, [meses])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await clubAdminApi.getAnalytics(meses)
      setAnalytics(data)
    } catch (err: any) {
      toast.error(err.message || 'Error')
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

  if (!analytics) return null

  const teamChartData = analytics.per_team.map(t => ({
    name: t.equipo_nombre.length > 15 ? t.equipo_nombre.slice(0, 15) + '...' : t.equipo_nombre,
    Sesiones: t.sesiones,
    Tareas: t.tareas,
  }))

  const coachData = analytics.coach_activity
    .sort((a, b) => b.sesiones_creadas - a.sesiones_creadas)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Periodo:</span>
        {[1, 3, 6].map(m => (
          <button
            key={m}
            onClick={() => setMeses(m)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              meses === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {m} mes{m > 1 ? 'es' : ''}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team comparison */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Comparacion por equipo</h3>
          {teamChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Sesiones" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tareas" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Sin datos</p>
          )}
        </div>

        {/* Coach activity table */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Actividad por entrenador</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-gray-500">Nombre</th>
                  <th className="pb-2 font-medium text-gray-500">Rol</th>
                  <th className="pb-2 font-medium text-gray-500 text-right">Sesiones</th>
                  <th className="pb-2 font-medium text-gray-500 text-right">Ultimo login</th>
                </tr>
              </thead>
              <tbody>
                {coachData.map(c => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2.5 font-medium text-gray-900">{c.nombre}</td>
                    <td className="py-2.5 text-gray-600 capitalize">{c.rol.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 text-right tabular-nums font-medium">{c.sesiones_creadas}</td>
                    <td className="py-2.5 text-right text-gray-500 tabular-nums text-xs">
                      {c.last_login ? new Date(c.last_login).toLocaleDateString('es-ES') : 'Nunca'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {coachData.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Sin actividad</p>
          )}
        </div>
      </div>
    </div>
  )
}
