'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

interface ChartCardProps {
  title: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
  isEmpty?: boolean
  emptyMessage?: string
}

export function ChartCard({ title, children, className, action, isEmpty, emptyMessage }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">{emptyMessage || 'Sin datos disponibles'}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
