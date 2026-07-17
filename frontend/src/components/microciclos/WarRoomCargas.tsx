'use client'

import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiKey } from '@/lib/swr'
import { useEquipoStore } from '@/stores/equipoStore'
import type { CargaEquipoResponse } from '@/types'

interface RPEInfo {
  rpe_promedio_semana: number | null
  registros_por_sesion: Record<string, { rpe_promedio: number | null; num_registros: number }>
}

interface WarRoomCargasProps {
  rpe: RPEInfo
}

function acwrTone(acwr: number | null) {
  if (acwr == null) return { label: 'Sin datos', className: 'text-muted-foreground', Icon: Minus }
  if (acwr < 0.8) return { label: 'Bajo', className: 'text-sky-700', Icon: TrendingDown }
  if (acwr <= 1.5) return { label: 'Óptimo', className: 'text-emerald-700', Icon: TrendingUp }
  if (acwr <= 2.0) return { label: 'Alto', className: 'text-amber-700', Icon: TrendingUp }
  return { label: 'Crítico', className: 'text-red-700', Icon: TrendingUp }
}

export function WarRoomCargas({ rpe }: WarRoomCargasProps) {
  const { equipoActivo } = useEquipoStore()
  const { data: cargaData } = useSWR<CargaEquipoResponse>(
    equipoActivo?.id ? apiKey('/carga/equipo/' + equipoActivo.id) : null
  )

  const rpeVal = rpe.rpe_promedio_semana
  const acwrValues = (cargaData?.data || [])
    .map((j) => j.ratio_acwr)
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
  const teamAcwr =
    acwrValues.length > 0
      ? Math.round((acwrValues.reduce((a, b) => a + b, 0) / acwrValues.length) * 100) / 100
      : null
  const tone = acwrTone(teamAcwr)
  const ToneIcon = tone.Icon

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
          <div
            className={`text-3xl font-bold tabular-nums ${
              rpeVal === null
                ? 'text-muted-foreground'
                : rpeVal >= 7
                  ? 'text-red-600'
                  : rpeVal >= 5
                    ? 'text-amber-600'
                    : 'text-emerald-600'
            }`}
          >
            {rpeVal !== null ? rpeVal.toFixed(1) : '—'}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Promedio semanal</p>
            {rpeVal !== null && (
              <Badge
                variant="outline"
                className={`text-[10px] mt-0.5 ${
                  rpeVal >= 7
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : rpeVal >= 5
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {rpeVal >= 7 ? 'Alta' : rpeVal >= 5 ? 'Moderada' : 'Baja'}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs">
          <span className="text-muted-foreground">ACWR equipo:</span>
          <span className={`font-medium tabular-nums flex items-center gap-1 ${tone.className}`}>
            <ToneIcon className="h-3 w-3" />
            {teamAcwr != null ? teamAcwr.toFixed(2) : '—'}
            <span className="text-[10px] opacity-80">({tone.label})</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
