'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Goal } from 'lucide-react'
import type { PreMatchGoleador } from '@/types'

export function GoleadoresWidget({ data }: { data: PreMatchGoleador[] }) {
  const maxGoles = Math.max(...data.map(g => g.goles), 1)

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Goal className="h-4 w-4 text-emerald-400" />
          <h4 className="text-sm font-bold text-white">Goleadores</h4>
        </div>

        <div className="space-y-2">
          {data.slice(0, 5).map((g, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 text-[10px] text-slate-500 text-right">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-white truncate">{g.jugador}</span>
                  <span className="text-xs font-bold text-emerald-400 ml-2">{g.goles}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${(g.goles / maxGoles) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {data.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-2">Sin goleadores registrados</p>
        )}
      </CardContent>
    </Card>
  )
}
