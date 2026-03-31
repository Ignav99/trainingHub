'use client'

import { Building, Users, Trophy, CreditCard, TrendingUp } from 'lucide-react'
import type { Overview } from './types'

export default function OverviewCards({ overview }: { overview: Overview }) {
  const cards = [
    { label: 'Organizaciones', value: overview.total_organizaciones, icon: Building, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Usuarios', value: overview.total_usuarios, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Equipos', value: overview.total_equipos, icon: Trophy, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Subs activas', value: overview.suscripciones_activas, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'En trial', value: overview.suscripciones_trial, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.bg} mb-3`}>
            <card.icon className={`h-4.5 w-4.5 ${card.color}`} />
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
        </div>
      ))}
    </div>
  )
}
