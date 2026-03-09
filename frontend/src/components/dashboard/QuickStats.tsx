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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Informe de Partido */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Informe de Partido</h3>
              {loading ? (
                <Skeleton className="h-4 w-32 mt-1" />
              ) : ultimoPartido ? (
                <Link
                  href={`/partidos?match=${ultimoPartido.id}&tab=post-partido`}
                  className="text-sm text-blue-600 hover:underline mt-1 block"
                >
                  {ultimoPartido.rival?.nombre || 'Ultimo partido'} ·{' '}
                  {ultimoPartido.goles_favor !== undefined
                    ? `${ultimoPartido.goles_favor}-${ultimoPartido.goles_contra}`
                    : 'Ver informe'}
                  <ArrowRight className="h-3 w-3 inline ml-1" />
                </Link>
              ) : (
                <Badge variant="outline" className="mt-1 border-amber-300 text-amber-700 bg-amber-50">
                  Pendiente
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan de Partido */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <Target className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Plan de Partido</h3>
              {loading ? (
                <Skeleton className="h-4 w-32 mt-1" />
              ) : proximoPartido ? (
                <Link
                  href={`/partidos?match=${proximoPartido.id}&tab=pre-partido`}
                  className="text-sm text-emerald-600 hover:underline mt-1 block"
                >
                  vs {proximoPartido.rival?.nombre || 'Proximo rival'}
                  <ArrowRight className="h-3 w-3 inline ml-1" />
                </Link>
              ) : (
                <Badge variant="outline" className="mt-1 border-amber-300 text-amber-700 bg-amber-50">
                  Plan no creado
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
