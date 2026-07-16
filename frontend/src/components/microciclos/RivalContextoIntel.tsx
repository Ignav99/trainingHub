'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  AlertTriangle,
  Flame,
  Goal,
  Home,
  Loader2,
  Plane,
  RefreshCw,
  ShieldAlert,
  Snowflake,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { rivalesApi } from '@/lib/api/partidos'
import { apiKey } from '@/lib/swr'
import type { PreMatchIntel, PreMatchRachaEstado } from '@/types'

interface RivalContextoIntelProps {
  rivalId?: string
  competicionId?: string
  rivalNombre?: string
}

const RACHA_STYLES: Record<
  PreMatchRachaEstado['estado'],
  { bg: string; border: string; text: string; icon: typeof Flame }
> = {
  caliente: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    icon: Flame,
  },
  fria: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-800',
    icon: Snowflake,
  },
  irregular: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: TrendingUp,
  },
  estable: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    icon: TrendingUp,
  },
  desconocido: {
    bg: 'bg-muted/50',
    border: 'border-border',
    text: 'text-muted-foreground',
    icon: TrendingUp,
  },
}

function ResultChip({ result }: { result: string }) {
  return (
    <span
      className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center ${
        result === 'V'
          ? 'bg-emerald-600 text-white'
          : result === 'E'
            ? 'bg-amber-500 text-white'
            : result === 'D'
              ? 'bg-red-600 text-white'
              : 'bg-muted text-muted-foreground'
      }`}
    >
      {result || '-'}
    </span>
  )
}

function MinuteChart({
  buckets,
  marcados,
  encajados,
}: {
  buckets: string[]
  marcados: number[]
  encajados: number[]
}) {
  const maxVal = Math.max(...marcados, ...encajados, 1)

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-32">
        {buckets.map((bucket, i) => {
          const scored = marcados[i] ?? 0
          const conceded = encajados[i] ?? 0
          const scoredH = (scored / maxVal) * 100
          const concededH = (conceded / maxVal) * 100
          return (
            <div key={bucket} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
              <div className="flex items-end justify-center gap-0.5 w-full h-24">
                <div
                  className="w-[42%] bg-emerald-500 rounded-t-sm transition-all"
                  style={{ height: `${scoredH}%`, minHeight: scored > 0 ? 4 : 0 }}
                  title={`Marcados: ${scored}`}
                />
                <div
                  className="w-[42%] bg-red-400 rounded-t-sm transition-all"
                  style={{ height: `${concededH}%`, minHeight: conceded > 0 ? 4 : 0 }}
                  title={`Encajados: ${conceded}`}
                />
              </div>
              <span className="text-[8px] text-muted-foreground text-center leading-tight">{bucket}&apos;</span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-emerald-500" />
          Goles marcados
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-red-400" />
          Goles encajados
        </span>
      </div>
    </div>
  )
}

function NetMinuteChart({
  buckets,
  marcados,
  encajados,
}: {
  buckets: string[]
  marcados: number[]
  encajados: number[]
}) {
  const net = buckets.map((_, i) => (marcados[i] ?? 0) - (encajados[i] ?? 0))
  const maxAbs = Math.max(...net.map(Math.abs), 1)

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground">
        Balance por tramo (verde = dominan, rojo = vulnerable)
      </p>
      <div className="space-y-1.5">
        {buckets.map((bucket, i) => {
          const value = net[i]
          const width = (Math.abs(value) / maxAbs) * 100
          const isPositive = value >= 0
          return (
            <div key={bucket} className="flex items-center gap-2 text-[10px]">
              <span className="w-12 shrink-0 text-muted-foreground text-right">{bucket}&apos;</span>
              <div className="flex-1 h-4 bg-muted/50 rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                <div
                  className={`absolute inset-y-0 ${isPositive ? 'left-1/2 bg-emerald-500' : 'right-1/2 bg-red-400'}`}
                  style={{ width: `${width / 2}%` }}
                />
              </div>
              <span className={`w-6 text-right font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                {value > 0 ? `+${value}` : value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PitchMinuteHeatmap({
  buckets,
  marcados,
  encajados,
}: {
  buckets: string[]
  marcados: number[]
  encajados: number[]
}) {
  const maxVal = Math.max(...marcados, ...encajados, 1)

  return (
    <div className="rounded-lg border bg-emerald-950/5 overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Mapa temporal del partido
        </span>
        <span className="text-[9px] text-muted-foreground">0&apos; → 90&apos;</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex h-10 rounded-md overflow-hidden border border-emerald-800/20">
          {buckets.map((bucket, i) => {
            const scored = marcados[i] ?? 0
            const conceded = encajados[i] ?? 0
            const net = scored - conceded
            const intensity = Math.abs(net) / maxVal
            const bg =
              net > 0
                ? `rgba(16, 185, 129, ${0.15 + intensity * 0.65})`
                : net < 0
                  ? `rgba(248, 113, 113, ${0.15 + intensity * 0.65})`
                  : 'rgba(148, 163, 184, 0.12)'
            return (
              <div
                key={bucket}
                className="flex-1 flex flex-col items-center justify-center border-r last:border-r-0 border-emerald-800/10 text-[8px]"
                style={{ backgroundColor: bg }}
                title={`${bucket}': ${scored} GF, ${conceded} GC`}
              >
                <span className="font-bold text-foreground/80">{scored}/{conceded}</span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-[8px] text-muted-foreground px-0.5">
          {buckets.map((b) => (
            <span key={b} className="flex-1 text-center">{b}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function HalvesChart({
  marcados1t,
  marcados2t,
  encajados1t,
  encajados2t,
}: {
  marcados1t: number
  marcados2t: number
  encajados1t: number
  encajados2t: number
}) {
  const maxHalf = Math.max(marcados1t, marcados2t, encajados1t, encajados2t, 1)

  const bar = (label: string, scored: number, conceded: number) => (
    <div className="space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] w-14 text-muted-foreground">Marcados</span>
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${(scored / maxHalf) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-emerald-600 w-4">{scored}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] w-14 text-muted-foreground">Encajados</span>
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full"
              style={{ width: `${(conceded / maxHalf) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-red-500 w-4">{conceded}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="grid grid-cols-2 gap-4">
      {bar('1ª parte', marcados1t, encajados1t)}
      {bar('2ª parte', marcados2t, encajados2t)}
    </div>
  )
}

function CasaFueraGoalsChart({
  casa,
  fuera,
}: {
  casa?: { gf: number; gc: number }
  fuera?: { gf: number; gc: number }
}) {
  if (!casa?.gf && !casa?.gc && !fuera?.gf && !fuera?.gc) return null
  const maxVal = Math.max(casa?.gf ?? 0, casa?.gc ?? 0, fuera?.gf ?? 0, fuera?.gc ?? 0, 1)

  const row = (label: string, gf: number, gc: number) => (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-[9px] w-6 text-emerald-600">GF</span>
        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${((gf ?? 0) / maxVal) * 100}%` }} />
        </div>
        <span className="text-[10px] w-4 font-bold">{gf ?? 0}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] w-6 text-red-500">GC</span>
        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-red-400" style={{ width: `${((gc ?? 0) / maxVal) * 100}%` }} />
        </div>
        <span className="text-[10px] w-4 font-bold">{gc ?? 0}</span>
      </div>
    </div>
  )

  return (
    <div className="grid grid-cols-2 gap-4">
      {row('En casa', casa?.gf ?? 0, casa?.gc ?? 0)}
      {row('Fuera', fuera?.gf ?? 0, fuera?.gc ?? 0)}
    </div>
  )
}

function buildGoalInsights(
  ctx: NonNullable<PreMatchIntel['contexto_stats']>
): string[] {
  const insights: string[] = []
  const { buckets, marcados, encajados } = ctx.goles_por_minuto
  const totalMarcados = marcados.reduce((a, b) => a + b, 0)
  const totalEncajados = encajados.reduce((a, b) => a + b, 0)

  if (totalMarcados > 0) {
    const maxIdx = marcados.indexOf(Math.max(...marcados))
    if (marcados[maxIdx] > 0) {
      insights.push(`Marcan con más frecuencia entre ${buckets[maxIdx]}' (${marcados[maxIdx]} goles)`)
    }
  }
  if (totalEncajados > 0) {
    const maxIdx = encajados.indexOf(Math.max(...encajados))
    if (encajados[maxIdx] > 0) {
      insights.push(`Encajan más goles entre ${buckets[maxIdx]}' (${encajados[maxIdx]} goles)`)
    }
  }

  const { marcados_1t, marcados_2t, encajados_1t, encajados_2t } = ctx.mitades
  if (marcados_2t > marcados_1t && marcados_2t > 0) {
    insights.push('Equipo más goleador en la 2ª parte')
  } else if (marcados_1t > marcados_2t && marcados_1t > 0) {
    insights.push('Suelen marcar más en la 1ª parte')
  }
  if (encajados_2t > encajados_1t && encajados_2t > 0) {
    insights.push('Vulnerables al final del partido (más goles encajados en 2ª parte)')
  }

  if (ctx.casa.pj > 0 && ctx.fuera.pj > 0) {
    const casaPct = ctx.casa.pct_victoria ?? 0
    const fueraPct = ctx.fuera.pct_victoria ?? 0
    if (casaPct - fueraPct >= 25) {
      insights.push('Muy fuertes en casa respecto a fuera')
    } else if (fueraPct - casaPct >= 25) {
      insights.push('Rinden mejor fuera que en casa')
    }
  }

  return insights.slice(0, 4)
}

function SideStatsBlock({
  title,
  icon: Icon,
  stats,
  clasPct,
}: {
  title: string
  icon: typeof Home
  stats?: { pj: number; pg: number; gf: number; gc: number; pct_victoria?: number | null; media_gf?: number | null; media_gc?: number | null }
  clasPct?: number
}) {
  const pct = clasPct ?? stats?.pct_victoria
  if (!stats?.pj && pct == null) return null

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-sm font-bold text-emerald-600">{pct != null ? `${pct}%` : '-'}</div>
          <div className="text-[9px] text-muted-foreground uppercase">Victorias</div>
        </div>
        <div>
          <div className="text-sm font-bold">{stats?.gf ?? '-'}</div>
          <div className="text-[9px] text-muted-foreground uppercase">GF</div>
        </div>
        <div>
          <div className="text-sm font-bold text-red-500">{stats?.gc ?? '-'}</div>
          <div className="text-[9px] text-muted-foreground uppercase">GC</div>
        </div>
      </div>
      {(stats?.media_gf != null || stats?.media_gc != null) && (
        <p className="text-[10px] text-muted-foreground text-center">
          Media {stats.media_gf ?? '-'} GF · {stats.media_gc ?? '-'} GC por partido
          {stats.pj ? ` (${stats.pj} PJ)` : ''}
        </p>
      )}
    </div>
  )
}

export function RivalContextoIntel({ rivalId, competicionId, rivalNombre }: RivalContextoIntelProps) {
  const [refreshing, setRefreshing] = useState(false)

  const { data: intel, mutate, isLoading } = useSWR<PreMatchIntel>(
    rivalId && competicionId
      ? apiKey(`/rivales/${rivalId}/intel`, { competicion_id: competicionId })
      : null
  )

  const handleRefresh = async () => {
    if (!rivalId || !competicionId) return
    setRefreshing(true)
    try {
      await rivalesApi.populateIntel(rivalId, competicionId)
      await mutate()
      toast.success('Intel del rival actualizada')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar intel')
    } finally {
      setRefreshing(false)
    }
  }

  if (!rivalId || !competicionId) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-4 text-center">
        Vincula una competición RFEF al equipo para ver intel automática del rival.
      </p>
    )
  }

  if (isLoading && !intel) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando intel del rival...
      </div>
    )
  }

  if (!intel) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center space-y-3">
        <p className="text-xs text-muted-foreground">Sin intel RFEF para este rival.</p>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
          Generar intel
        </Button>
      </div>
    )
  }

  const ctx = intel.contexto_stats
  const racha = ctx?.racha ?? {
    estado: 'desconocido' as const,
    etiqueta: 'Sin datos',
    victorias: 0,
    empates: 0,
    derrotas: 0,
    puntos: 0,
    ultimos_5: intel.clasificacion?.ultimos_5 ?? [],
  }
  const rachaStyle = RACHA_STYLES[racha.estado]
  const RachaIcon = rachaStyle.icon

  const sancionados = (intel.tarjetas?.jugadores ?? []).filter((j) => j.estado === 'Sancionado')
  const apercibidos = (intel.tarjetas?.jugadores ?? []).filter((j) => j.estado === 'Apercibido')
  const goalInsights = ctx ? buildGoalInsights(ctx) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">RFEF Auto</Badge>
          {intel.generated_at && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(intel.generated_at).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Actualizar
        </Button>
      </div>

      {/* Racha banner */}
      <div className={`rounded-lg border p-3 ${rachaStyle.bg} ${rachaStyle.border}`}>
        <div className="flex items-start gap-3">
          <RachaIcon className={`h-5 w-5 shrink-0 mt-0.5 ${rachaStyle.text}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${rachaStyle.text}`}>{racha.etiqueta}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground">Últimos 5:</span>
              {(racha.ultimos_5.length ? racha.ultimos_5 : intel.clasificacion?.ultimos_5 ?? []).map((r, i) => (
                <ResultChip key={i} result={r} />
              ))}
              <span className="text-[10px] text-muted-foreground ml-1">
                {racha.puntos} pts · {racha.victorias}V {racha.empates}E {racha.derrotas}D
              </span>
            </div>
          </div>
          {intel.clasificacion?.posicion && (
            <div className="text-center shrink-0">
              <div className="text-xl font-black text-foreground">{intel.clasificacion.posicion}º</div>
              <div className="text-[9px] text-muted-foreground">{intel.clasificacion.puntos} pts</div>
            </div>
          )}
        </div>
      </div>

      {/* Casa / Fuera + Liga */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <SideStatsBlock
          title="En casa"
          icon={Home}
          stats={ctx?.casa}
          clasPct={intel.clasificacion?.pct_victoria_casa}
        />
        <SideStatsBlock
          title="Fuera"
          icon={Plane}
          stats={ctx?.fuera}
          clasPct={intel.clasificacion?.pct_victoria_fuera}
        />
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <span className="text-xs font-semibold">Liga total</span>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-sm font-bold text-emerald-600">{intel.clasificacion?.gf ?? ctx?.liga.gf ?? '-'}</div>
              <div className="text-[9px] text-muted-foreground uppercase">GF</div>
            </div>
            <div>
              <div className="text-sm font-bold text-red-500">{intel.clasificacion?.gc ?? ctx?.liga.gc ?? '-'}</div>
              <div className="text-[9px] text-muted-foreground uppercase">GC</div>
            </div>
          </div>
          {ctx?.liga.media_gf != null && (
            <p className="text-[10px] text-muted-foreground text-center">
              Media {ctx.liga.media_gf} GF · {ctx.liga.media_gc} GC
            </p>
          )}
        </div>
      </div>

      {/* Mitades + casa/fuera goles */}
      {ctx?.mitades && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <p className="text-xs font-semibold">Goles por mitad</p>
            <HalvesChart
              marcados1t={ctx.mitades.marcados_1t}
              marcados2t={ctx.mitades.marcados_2t}
              encajados1t={ctx.mitades.encajados_1t}
              encajados2t={ctx.mitades.encajados_2t}
            />
            {(ctx.casa.gf > 0 || ctx.fuera.gf > 0) && (
              <>
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold mb-3">Goles casa vs fuera</p>
                  <CasaFueraGoalsChart casa={ctx.casa} fuera={ctx.fuera} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Goles por minuto — gráficas */}
      {ctx?.goles_por_minuto && ctx.actas_con_goles_minuto > 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Análisis temporal de goles</p>
              <span className="text-[10px] text-muted-foreground">{ctx.actas_con_goles_minuto} actas</span>
            </div>

            {goalInsights.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {goalInsights.map((tip, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                    {tip}
                  </Badge>
                ))}
              </div>
            )}

            <PitchMinuteHeatmap
              buckets={ctx.goles_por_minuto.buckets}
              marcados={ctx.goles_por_minuto.marcados}
              encajados={ctx.goles_por_minuto.encajados}
            />

            <MinuteChart
              buckets={ctx.goles_por_minuto.buckets}
              marcados={ctx.goles_por_minuto.marcados}
              encajados={ctx.goles_por_minuto.encajados}
            />

            <NetMinuteChart
              buckets={ctx.goles_por_minuto.buckets}
              marcados={ctx.goles_por_minuto.marcados}
              encajados={ctx.goles_por_minuto.encajados}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Goleadores */}
        {intel.goleadores_rival && intel.goleadores_rival.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <Goal className="h-3.5 w-3.5 text-emerald-600" />
                <p className="text-xs font-semibold">Máximos goleadores</p>
              </div>
              {intel.goleadores_rival.slice(0, 5).map((g, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="truncate">{g.jugador}</span>
                  <span className="font-bold text-emerald-600 shrink-0 ml-2">{g.goles}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Sancionados / Apercibidos */}
        {(sancionados.length > 0 || apercibidos.length > 0 || (intel.sanciones_oficiales?.length ?? 0) > 0) && (
          <Card className="border-amber-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <p className="text-xs font-semibold">Sanciones jornada</p>
              </div>
              {sancionados.map((j, i) => (
                <div key={`s-${i}`} className="flex items-center gap-2 text-xs rounded bg-red-50 px-2 py-1">
                  <ShieldAlert className="h-3 w-3 text-red-600 shrink-0" />
                  <span className="font-medium text-red-800">{j.nombre}</span>
                  <Badge variant="destructive" className="text-[9px] ml-auto">Sancionado</Badge>
                </div>
              ))}
              {apercibidos.map((j, i) => (
                <div key={`a-${i}`} className="flex items-center gap-2 text-xs rounded bg-amber-50 px-2 py-1">
                  <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                  <span className="font-medium text-amber-800">{j.nombre}</span>
                  <Badge className="bg-amber-100 text-amber-800 text-[9px] ml-auto">Apercibido</Badge>
                </div>
              ))}
              {(intel.sanciones_oficiales ?? [])
                .filter((s) => s.categoria?.toLowerCase().includes('jugador'))
                .slice(0, 3)
                .map((s, i) => (
                  <div key={`o-${i}`} className="text-[10px] text-muted-foreground truncate">
                    {s.persona_nombre}: {s.descripcion}
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Ultimos resultados */}
      {intel.ultimos_resultados && intel.ultimos_resultados.length > 0 && rivalNombre && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold">Últimos partidos</p>
            {intel.ultimos_resultados.map((r, i) => {
              const rivalLower = rivalNombre.toLowerCase()
              const isLocal = r.local.toLowerCase().includes(rivalLower) || rivalLower.includes(r.local.toLowerCase())
              const gf = isLocal ? r.goles_local : r.goles_visitante
              const gc = isLocal ? r.goles_visitante : r.goles_local
              const res = gf > gc ? 'V' : gf < gc ? 'D' : 'E'
              return (
                <div key={i} className="flex items-center gap-2 text-[11px] py-1 border-b last:border-0">
                  <span className="text-muted-foreground w-6">J{r.jornada}</span>
                  <ResultChip result={res} />
                  <span className="truncate flex-1">{r.local} {r.goles_local}-{r.goles_visitante} {r.visitante}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
