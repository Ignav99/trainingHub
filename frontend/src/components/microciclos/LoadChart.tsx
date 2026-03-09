import { Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MATCH_DAY_COLORS } from './SessionCard'
import type { MatchDay } from '@/types'

interface LoadChartSession {
  id: string
  titulo: string
  match_day: MatchDay
}

interface RpeData {
  registros_por_sesion: Record<string, { rpe_promedio: number; num_registros: number }>
  rpe_promedio_semana: number | null
}

interface LoadChartProps {
  sesiones: LoadChartSession[]
  rpe: RpeData
}

export function LoadChart({ sesiones, rpe }: LoadChartProps) {
  const hasData = rpe.rpe_promedio_semana !== null || Object.keys(rpe.registros_por_sesion).length > 0

  if (!hasData) return null

  const sessionsWithRpe = sesiones.filter((s) => rpe.registros_por_sesion[s.id])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Carga de Entrenamiento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Weekly average */}
        {rpe.rpe_promedio_semana !== null && (
          <div className="flex items-center gap-4 mb-4 pb-4 border-b">
            <div className={`text-3xl font-bold ${
              rpe.rpe_promedio_semana >= 7 ? 'text-red-600'
                : rpe.rpe_promedio_semana >= 5 ? 'text-amber-600'
                  : 'text-green-600'
            }`}>
              {rpe.rpe_promedio_semana}
            </div>
            <div>
              <p className="text-sm font-medium">RPE Promedio Semanal</p>
              <p className="text-xs text-muted-foreground">Media de todas las sesiones del microciclo</p>
            </div>
          </div>
        )}

        {/* Per-session RPE bars */}
        {sessionsWithRpe.length > 0 && (
          <div className="space-y-3">
            {sessionsWithRpe.map((s) => {
              const rpeInfo = rpe.registros_por_sesion[s.id]
              const pct = Math.min((rpeInfo.rpe_promedio / 10) * 100, 100)
              const color = rpeInfo.rpe_promedio >= 7 ? 'bg-red-500' : rpeInfo.rpe_promedio >= 5 ? 'bg-amber-500' : 'bg-green-500'
              const mdColors = s.match_day ? MATCH_DAY_COLORS[s.match_day] : null

              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`w-10 text-center text-[10px] font-bold rounded px-1 py-0.5 shrink-0 ${
                    mdColors ? `${mdColors.bg} ${mdColors.text}` : 'bg-gray-100 text-gray-600'
                  }`}>
                    {s.match_day || '\u2014'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate">{s.titulo}</span>
                      <span className="text-xs font-bold ml-2">{rpeInfo.rpe_promedio}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
