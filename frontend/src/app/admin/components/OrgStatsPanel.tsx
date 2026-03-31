'use client'

import { useEffect, useState } from 'react'
import { Loader2, Calendar, ClipboardList, Users, Swords, Bot, HardDrive, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

interface OrgStats {
  organizacion: { id: string; nombre: string }
  totals: { sesiones: number; tareas: number; jugadores: number; partidos: number }
  ai_calls: number
  storage_mb: number
  logins_30d: number
  per_team: Array<{
    equipo_id: string
    nombre: string
    categoria?: string
    sesiones: number
    tareas: number
    jugadores: number
    partidos: number
  }>
  suscripcion?: any
}

export default function OrgStatsPanel({ orgId }: { orgId: string }) {
  const [stats, setStats] = useState<OrgStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [orgId])

  const loadStats = async () => {
    setLoading(true)
    try {
      const data = await api.get<OrgStats>(`/admin/organizaciones/${orgId}/stats`)
      setStats(data)
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!stats) return null

  const kpis = [
    { label: 'Sesiones', value: stats.totals.sesiones, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Tareas', value: stats.totals.tareas, icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Jugadores', value: stats.totals.jugadores, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Partidos', value: stats.totals.partidos, icon: Swords, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'AI calls', value: stats.ai_calls, icon: Bot, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Storage', value: `${stats.storage_mb} MB`, icon: HardDrive, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Logins (30d)', value: stats.logins_30d, icon: LogIn, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div className="border-t pt-4 mt-4 space-y-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estadisticas detalladas</h4>

      {/* KPI row */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="text-center">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.bg} mx-auto mb-1`}>
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
            </div>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{kpi.value}</p>
            <p className="text-[10px] text-gray-500">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Per-team breakdown */}
      {stats.per_team.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-gray-500 mb-2">Desglose por equipo</h5>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 font-medium text-gray-500">Equipo</th>
                  <th className="text-right py-1.5 font-medium text-gray-500">Ses.</th>
                  <th className="text-right py-1.5 font-medium text-gray-500">Tar.</th>
                  <th className="text-right py-1.5 font-medium text-gray-500">Jug.</th>
                  <th className="text-right py-1.5 font-medium text-gray-500">Part.</th>
                </tr>
              </thead>
              <tbody>
                {stats.per_team.map(t => (
                  <tr key={t.equipo_id} className="border-b last:border-0">
                    <td className="py-1.5 text-gray-900 font-medium">
                      {t.nombre}
                      {t.categoria && <span className="ml-1 text-gray-400">({t.categoria})</span>}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{t.sesiones}</td>
                    <td className="py-1.5 text-right tabular-nums">{t.tareas}</td>
                    <td className="py-1.5 text-right tabular-nums">{t.jugadores}</td>
                    <td className="py-1.5 text-right tabular-nums">{t.partidos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
