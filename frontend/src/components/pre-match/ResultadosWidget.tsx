'use client'

import { Card, CardContent } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'
import type { PreMatchResultado } from '@/types'

export function ResultadosWidget({
  data,
  rivalNombre,
}: {
  data: PreMatchResultado[]
  rivalNombre: string
}) {
  const rivalLower = rivalNombre.toLowerCase()

  function getResult(r: PreMatchResultado) {
    const isLocal = r.local.toLowerCase().includes(rivalLower) || rivalLower.includes(r.local.toLowerCase())
    const gf = isLocal ? r.goles_local : r.goles_visitante
    const gc = isLocal ? r.goles_visitante : r.goles_local
    if (gf > gc) return 'V'
    if (gf < gc) return 'D'
    return 'E'
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-purple-400" />
          <h4 className="text-sm font-bold text-white">Ultimos Resultados</h4>
        </div>

        {/* Streak display */}
        <div className="flex items-center gap-1.5">
          {data.map((r, i) => {
            const result = getResult(r)
            return (
              <span
                key={i}
                className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center ${
                  result === 'V' ? 'bg-emerald-600 text-white' :
                  result === 'E' ? 'bg-amber-500 text-white' :
                  'bg-red-600 text-white'
                }`}
              >
                {result}
              </span>
            )
          })}
        </div>

        {/* Mini match results */}
        <div className="space-y-1">
          {data.map((r, i) => {
            const result = getResult(r)
            return (
              <div
                key={i}
                className="flex items-center gap-2 py-1 px-2 rounded bg-slate-800/50 text-[11px]"
              >
                <span className="text-slate-500 w-6">J{r.jornada}</span>
                <span className="text-slate-300 flex-1 truncate text-right">{r.local}</span>
                <span className={`font-bold px-1.5 ${
                  result === 'V' ? 'text-emerald-400' :
                  result === 'D' ? 'text-red-400' :
                  'text-amber-400'
                }`}>
                  {r.goles_local}-{r.goles_visitante}
                </span>
                <span className="text-slate-300 flex-1 truncate">{r.visitante}</span>
              </div>
            )
          })}
        </div>

        {data.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-2">Sin resultados registrados</p>
        )}
      </CardContent>
    </Card>
  )
}
