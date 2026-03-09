'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import type { PreMatchOnceProbable } from '@/types'

export function OnceProbableWidget({ data }: { data: PreMatchOnceProbable }) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            <h4 className="text-sm font-bold text-white">Once Probable</h4>
          </div>
          <Badge className="bg-slate-800 text-slate-400 text-[9px]">
            {data.actas_analizadas} actas
          </Badge>
        </div>

        <div className="space-y-1">
          {data.jugadores.map((j, i) => (
            <div
              key={i}
              className="flex items-center gap-2 py-1 px-2 rounded bg-slate-800/50"
            >
              <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                {j.dorsal ?? '?'}
              </span>
              <span className="text-xs text-white flex-1 truncate">{j.nombre}</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: data.actas_analizadas }, (_, k) => (
                  <div
                    key={k}
                    className={`w-1.5 h-4 rounded-sm ${
                      k < j.apariciones ? 'bg-blue-500' : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-blue-400 font-medium w-8 text-right">
                {j.apariciones}/{data.actas_analizadas}
              </span>
            </div>
          ))}
        </div>

        {data.jugadores.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-2">Sin actas disponibles</p>
        )}
      </CardContent>
    </Card>
  )
}
