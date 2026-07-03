'use client'

import { Activity, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface RPEInfo {
  rpe_promedio_semana: number | null
  registros_por_sesion: Record<string, { rpe_promedio: number | null; num_registros: number }>
}

interface WarRoomCargasProps {
  rpe: RPEInfo
}

export function WarRoomCargas({ rpe }: WarRoomCargasProps) {
  const rpeVal = rpe.rpe_promedio_semana

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-orange-600" />
          Cargas (RPE)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-bold ${
            rpeVal === null ? 'text-muted-foreground' :
            rpeVal >= 7 ? 'text-red-600' :
            rpeVal >= 5 ? 'text-amber-600' :
            'text-green-600'
          }`}>
            {rpeVal !== null ? rpeVal.toFixed(1) : '--'}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Promedio semanal</p>
            {rpeVal !== null && (
              <Badge
                variant="outline"
                className={`text-[10px] mt-0.5 ${
                  rpeVal >= 7 ? 'bg-red-50 text-red-700 border-red-200' :
                  rpeVal >= 5 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-green-50 text-green-700 border-green-200'
                }`}
              >
                {rpeVal >= 7 ? 'Alta' : rpeVal >= 5 ? 'Moderada' : 'Baja'}
              </Badge>
            )}
          </div>
        </div>

        {/* ACWR quick view */}
        <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs">
          <span className="text-muted-foreground">ACWR equipo:</span>
          <span className="font-medium text-green-600 flex items-center gap-1">
            <TrendingDown className="h-3 w-3" /> 0.9-1.3 ✅
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
