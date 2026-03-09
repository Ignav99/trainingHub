import Image from 'next/image'
import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Partido } from '@/types'
import type { CargaSemanalData } from '@/lib/api/dashboard'

interface ChartSectionProps {
  ultimosPartidos: Partido[]
  partidos: Partido[]
  cargaSemanal: CargaSemanalData | undefined
  maxRPE: number
  jugados: number
}

export function ChartSection({ ultimosPartidos, partidos, cargaSemanal, maxRPE, jugados }: ChartSectionProps) {
  return (
    <div className="space-y-6">
      {/* Results bar chart */}
      {ultimosPartidos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultados recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {ultimosPartidos.map((p) => {
                const diff = (p.goles_favor || 0) - (p.goles_contra || 0)
                const barColor =
                  p.resultado === 'victoria'
                    ? 'bg-emerald-500'
                    : p.resultado === 'empate'
                      ? 'bg-amber-400'
                      : 'bg-red-500'
                const absHeight = Math.min(Math.abs(diff) + 1, 6)
                const heightPct = (absHeight / 6) * 100

                return (
                  <div key={p.id} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {p.goles_favor}-{p.goles_contra}
                    </span>
                    <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                      <div
                        className={`w-full max-w-[32px] rounded-t ${barColor} transition-all`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground truncate max-w-full text-center">
                      {p.rival?.nombre_corto || p.rival?.nombre?.slice(0, 6) || '?'}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 mt-4 justify-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" /> Victoria
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400" /> Empate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500" /> Derrota
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RPE weekly load chart */}
      {cargaSemanal && cargaSemanal.semanas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Carga semanal (RPE)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {cargaSemanal.semanas.map((s) => {
                const heightPct = (s.rpe_promedio / maxRPE) * 100
                const color =
                  s.rpe_promedio >= 7
                    ? 'bg-red-500'
                    : s.rpe_promedio >= 5
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'

                return (
                  <div key={s.semana_inicio} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {s.rpe_promedio}
                    </span>
                    <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                      <div
                        className={`w-full max-w-[32px] rounded-t ${color} transition-all`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(s.semana_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match history table */}
      {partidos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de partidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Fecha</th>
                    <th className="pb-2 font-medium">Rival</th>
                    <th className="pb-2 font-medium text-center">Resultado</th>
                    <th className="pb-2 font-medium">Comp.</th>
                  </tr>
                </thead>
                <tbody>
                  {partidos.slice(0, 15).map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 text-muted-foreground">
                        {new Date(p.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center gap-1.5">
                          {p.rival?.escudo_url && (
                            <Image src={p.rival.escudo_url} alt="" width={16} height={16} className="object-contain" unoptimized />
                          )}
                          <span className="text-[10px] text-muted-foreground mr-1">
                            {p.localia === 'local' ? 'vs' : '@'}
                          </span>
                          {p.rival?.nombre || 'Rival'}
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        <Badge
                          variant="outline"
                          className={
                            p.resultado === 'victoria'
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                              : p.resultado === 'empate'
                                ? 'border-amber-300 text-amber-700 bg-amber-50'
                                : 'border-red-300 text-red-700 bg-red-50'
                          }
                        >
                          {p.goles_favor}-{p.goles_contra}
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground capitalize text-xs">{p.competicion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {jugados === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay partidos jugados todavía. Las estadísticas aparecerán cuando registres resultados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
