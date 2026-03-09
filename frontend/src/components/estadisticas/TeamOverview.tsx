import Link from 'next/link'
import { Trophy, Shield, Target, Activity, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { CargaSemanalData } from '@/lib/api/dashboard'

interface Resumen {
  jugados: number
  victorias: number
  empates: number
  derrotas: number
  golesFavor: number
  golesContra: number
}

interface TeamOverviewProps {
  resumen: Resumen
  winRate: number
  cargaSemanal: CargaSemanalData | undefined
}

export function TeamOverview({ resumen, winRate, cargaSemanal }: TeamOverviewProps) {
  return (
    <>
      {/* RFAF Competition link */}
      <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold">Competición RFAF</p>
              <p className="text-xs text-muted-foreground">Clasificación, resultados y goleadores en tiempo real</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/estadisticas/competicion">
              Ver competición
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resumen.jugados}</p>
                <p className="text-xs text-muted-foreground">Partidos jugados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{winRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {resumen.victorias}V {resumen.empates}E {resumen.derrotas}D
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resumen.golesFavor}</p>
                <p className="text-xs text-muted-foreground">
                  GF ({resumen.golesContra} GC)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {cargaSemanal?.promedio_global ?? '-'}
                </p>
                <p className="text-xs text-muted-foreground">RPE medio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
