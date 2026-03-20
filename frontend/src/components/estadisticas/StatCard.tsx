'use client'

import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  icon: LucideIcon
  value: string | number
  label: string
  sublabel?: string
  color?: string
  trend?: 'up' | 'down' | 'neutral'
}

const COLOR_MAP: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-emerald-500/10 text-emerald-600',
  blue: 'bg-blue-500/10 text-blue-600',
  amber: 'bg-amber-500/10 text-amber-600',
  red: 'bg-red-500/10 text-red-600',
  orange: 'bg-orange-500/10 text-orange-600',
  purple: 'bg-purple-500/10 text-purple-600',
  rose: 'bg-rose-500/10 text-rose-600',
}

export function StatCard({ icon: Icon, value, label, sublabel, color = 'primary' }: StatCardProps) {
  const colorClasses = COLOR_MAP[color] || COLOR_MAP.primary

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold truncate">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
