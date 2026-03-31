'use client'

import { useEffect, useState } from 'react'
import {
  Building, Users, CreditCard, Bot,
  TrendingUp, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

import OrgComparisonCards from './OrgComparisonCards'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

interface PlatformAnalytics {
  total_orgs: number
  new_orgs_30d: number
  total_users: number
  active_users_30d: number
  mrr_cents: number
  mrr_eur: number
  plan_distribution: Record<string, number>
  status_distribution: Record<string, number>
}

export default function PlatformAnalyticsTab() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await api.get<PlatformAnalytics>('/admin/platform-analytics')
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

  const kpis = [
    { label: 'Organizaciones', value: analytics.total_orgs, sub: `+${analytics.new_orgs_30d} (30d)`, icon: Building, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Usuarios activos (30d)', value: analytics.active_users_30d, sub: `${analytics.total_users} total`, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'MRR', value: `${analytics.mrr_eur}€`, sub: 'Ingresos mensuales', icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Nuevos clubs (30d)', value: analytics.new_orgs_30d, sub: 'Crecimiento', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  // Plan distribution chart
  const planData = Object.entries(analytics.plan_distribution).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }))

  // Status distribution chart
  const statusData = Object.entries(analytics.status_distribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.bg} mb-3`}>
              <kpi.icon className={`h-4.5 w-4.5 ${kpi.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan distribution */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribucion por plan</h3>
          {planData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={planData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label>
                  {planData.map((_, idx) => (
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

        {/* Status distribution */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Estado de suscripciones</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Sin datos</p>
          )}
        </div>
      </div>

      {/* Org comparisons */}
      <OrgComparisonCards />
    </div>
  )
}
