'use client'

import Link from 'next/link'
import { FileText, Target, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardResumen } from '@/lib/api/dashboard'
import type { Partido } from '@/types'

interface QuickStatsProps {
  loading: boolean
  ultimoPartido: Partido | null
  proximoPartido: DashboardResumen['proximo_partido'] | undefined
}

export function QuickStats({ loading, ultimoPartido, proximoPartido }: QuickStatsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Informe de Partido */}
      <Card className="flex-1 border-l-3 border-l-blue-500">
        <CardContent className="p-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap">Informe</span>
          {loading ? (
            <Skeleton className="h-4 w-24" />
          ) : ultimoPartido ? (
            <Link
              href={`/partidos?match=${ultimoPartido.id}&tab=post-partido`}
              className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1"
            >
              {ultimoPartido.rival?.nombre || 'Ultimo partido'}
              {ultimoPartido.goles_favor !== undefined && (
                <span className="font-semibold">
                  {ultimoPartido.goles_favor}-{ultimoPartido.goles_contra}
                </span>
              )}
              <ArrowRight className="h-3 w-3 shrink-0" />
            </Link>
          ) : (
            <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[10px] py-0">
              Pendiente
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Plan de Partido */}
      <Card className="flex-1 border-l-3 border-l-emerald-500">
        <CardContent className="p-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap">Plan</span>
          {loading ? (
            <Skeleton className="h-4 w-24" />
          ) : proximoPartido ? (
            <Link
              href={`/partidos?match=${proximoPartido.id}&tab=pre-partido`}
              className="text-sm text-emerald-600 hover:underline truncate flex items-center gap-1"
            >
              vs {proximoPartido.rival?.nombre || 'Proximo rival'}
              <ArrowRight className="h-3 w-3 shrink-0" />
            </Link>
          ) : (
            <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[10px] py-0">
              Sin plan
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
