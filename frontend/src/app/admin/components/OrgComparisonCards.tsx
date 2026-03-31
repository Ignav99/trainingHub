'use client'

import { useEffect, useState } from 'react'
import { Loader2, Bot, Calendar, Users, HardDrive, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

interface OrgStat {
  org_id: string
  nombre: string
  users: number
  sesiones: number
  ai_calls: number
  storage_mb: number
}

interface Comparisons {
  by_ai_calls: OrgStat[]
  by_sessions: OrgStat[]
  by_users: OrgStat[]
  by_storage: OrgStat[]
}

export default function OrgComparisonCards() {
  const [data, setData] = useState<Comparisons | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.get<Comparisons>('/admin/comparisons')
      setData(res)
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const rankings = [
    { title: 'Top clubs por llamadas AI', data: data.by_ai_calls, valueKey: 'ai_calls' as const, icon: Bot, color: 'text-indigo-600', bg: 'bg-indigo-50', suffix: '' },
    { title: 'Top clubs por sesiones', data: data.by_sessions, valueKey: 'sesiones' as const, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', suffix: '' },
    { title: 'Top clubs por usuarios', data: data.by_users, valueKey: 'users' as const, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', suffix: '' },
    { title: 'Top clubs por almacenamiento', data: data.by_storage, valueKey: 'storage_mb' as const, icon: HardDrive, color: 'text-cyan-600', bg: 'bg-cyan-50', suffix: ' MB' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {rankings.map(ranking => (
        <div key={ranking.title} className="bg-white rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${ranking.bg}`}>
              <ranking.icon className={`h-3.5 w-3.5 ${ranking.color}`} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{ranking.title}</h3>
          </div>
          <div className="space-y-2">
            {ranking.data.slice(0, 5).map((org, idx) => {
              const maxVal = ranking.data[0]?.[ranking.valueKey] || 1
              const pct = (org[ranking.valueKey] / maxVal) * 100
              return (
                <div key={org.org_id} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-400 w-4 text-right">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-gray-900 truncate">{org.nombre}</span>
                      <span className="text-xs font-medium text-gray-600 tabular-nums ml-2">
                        {org[ranking.valueKey]}{ranking.suffix}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${ranking.bg.replace('50', '400')} bg-opacity-60`}
                        style={{ width: `${pct}%`, backgroundColor: `var(--tw-${ranking.color.replace('text-', '')})` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            {ranking.data.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
