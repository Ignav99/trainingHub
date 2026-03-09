'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy } from 'lucide-react'
import type { PreMatchClasificacion } from '@/types'

export function ClasificacionWidget({ data }: { data: PreMatchClasificacion }) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          <h4 className="text-sm font-bold text-white">Clasificacion</h4>
        </div>

        <div className="flex items-center gap-3">
          {data.posicion && (
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <span className="text-xl font-black text-amber-400">{data.posicion}o</span>
            </div>
          )}
          <div className="flex-1 grid grid-cols-3 gap-2">
            <StatBox label="PTS" value={data.puntos} color="text-white" />
            <StatBox label="PJ" value={data.pj} />
            <StatBox label="DG" value={data.gf != null && data.gc != null ? (data.gf - data.gc) : undefined} color={(data.gf ?? 0) - (data.gc ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5 text-center">
          <MiniStat label="PG" value={data.pg} color="text-emerald-400" />
          <MiniStat label="PE" value={data.pe} color="text-amber-400" />
          <MiniStat label="PP" value={data.pp} color="text-red-400" />
          <MiniStat label="GF" value={data.gf} color="text-emerald-400" />
          <MiniStat label="GC" value={data.gc} color="text-red-400" />
        </div>

        {data.ultimos_5 && data.ultimos_5.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 mr-1">Racha:</span>
            {data.ultimos_5.map((r, i) => (
              <span
                key={i}
                className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${
                  r === 'V' ? 'bg-emerald-600 text-white' :
                  r === 'E' ? 'bg-amber-500 text-white' :
                  r === 'D' ? 'bg-red-600 text-white' :
                  'bg-slate-700 text-slate-400'
                }`}
              >
                {r || '-'}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatBox({ label, value, color = 'text-slate-300' }: { label: string; value?: number; color?: string }) {
  return (
    <div className="bg-slate-800 rounded p-1.5 text-center">
      <div className={`text-base font-bold ${color}`}>{value ?? '-'}</div>
      <div className="text-[9px] text-slate-500 uppercase">{label}</div>
    </div>
  )
}

function MiniStat({ label, value, color = 'text-slate-300' }: { label: string; value?: number; color?: string }) {
  return (
    <div>
      <div className={`text-sm font-bold ${color}`}>{value ?? '-'}</div>
      <div className="text-[9px] text-slate-500">{label}</div>
    </div>
  )
}
