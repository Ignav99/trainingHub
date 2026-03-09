'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Swords } from 'lucide-react'
import type { PreMatchH2H } from '@/types'

export function HeadToHeadWidget({ data }: { data: PreMatchH2H[] }) {
  const wins = data.filter(h => h.resultado === 'victoria').length
  const draws = data.filter(h => h.resultado === 'empate').length
  const losses = data.filter(h => h.resultado === 'derrota').length
  const total = data.length

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-cyan-400" />
          <h4 className="text-sm font-bold text-white">Head to Head</h4>
        </div>

        {/* Summary bar */}
        {total > 0 && (
          <div className="space-y-2">
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-800">
              {wins > 0 && (
                <div
                  className="bg-emerald-500 transition-all"
                  style={{ width: `${(wins / total) * 100}%` }}
                />
              )}
              {draws > 0 && (
                <div
                  className="bg-amber-500 transition-all"
                  style={{ width: `${(draws / total) * 100}%` }}
                />
              )}
              {losses > 0 && (
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${(losses / total) * 100}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-emerald-400 font-medium">{wins}V</span>
              <span className="text-amber-400 font-medium">{draws}E</span>
              <span className="text-red-400 font-medium">{losses}D</span>
            </div>
          </div>
        )}

        {/* Match timeline */}
        <div className="space-y-1">
          {data.slice(0, 6).map((h, i) => {
            const resultColor = h.resultado === 'victoria'
              ? 'border-l-emerald-500'
              : h.resultado === 'empate'
                ? 'border-l-amber-500'
                : 'border-l-red-500'

            return (
              <div
                key={i}
                className={`flex items-center gap-2 py-1 px-2 rounded bg-slate-800/50 border-l-2 ${resultColor}`}
              >
                <span className="text-[10px] text-slate-500 w-16 shrink-0">
                  {h.fecha ? new Date(h.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '-'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {h.localia === 'local' ? 'L' : 'V'}
                </span>
                <span className={`text-xs font-bold ${
                  h.resultado === 'victoria' ? 'text-emerald-400' :
                  h.resultado === 'empate' ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {h.goles_favor}-{h.goles_contra}
                </span>
                {h.jornada && <span className="text-[10px] text-slate-500 ml-auto">J{h.jornada}</span>}
              </div>
            )
          })}
        </div>

        {data.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-2">Sin enfrentamientos previos</p>
        )}
      </CardContent>
    </Card>
  )
}
