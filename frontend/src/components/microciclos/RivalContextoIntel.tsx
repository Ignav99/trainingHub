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
  Users,
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
      <div className="flex items-end gap-1 h-28">
        {buckets.map((bucket, i) => {
          const scored = marcados[i] ?? 0
          const conceded = encajados[i] ?? 0
          const scoredH = (scored / maxVal) * 100
          const concededH = (conceded / maxVal) * 100
          return (
            <div key={bucket} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
              <div className="flex items-end justify-center gap-0.5 w-full h-20">
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
              <span className="text-[8px] text-muted-foreground text-center leading-tight">{bucket}</span>
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
  const onceTitulares = intel.once_probable?.jugadores.slice(0, 11) ?? []

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

      {/* Mitades */}
      {ctx?.mitades && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">1ª parte</p>
            <div className="flex justify-around text-center">
              <div>
                <div className="text-sm font-bold text-emerald-600">{ctx.mitades.marcados_1t}</div>
                <div className="text-[9px] text-muted-foreground">Marcados</div>
              </div>
              <div>
                <div className="text-sm font-bold text-red-500">{ctx.mitades.encajados_1t}</div>
                <div className="text-[9px] text-muted-foreground">Encajados</div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">2ª parte</p>
            <div className="flex justify-around text-center">
              <div>
                <div className="text-sm font-bold text-emerald-600">{ctx.mitades.marcados_2t}</div>
                <div className="text-[9px] text-muted-foreground">Marcados</div>
              </div>
              <div>
                <div className="text-sm font-bold text-red-500">{ctx.mitades.encajados_2t}</div>
                <div className="text-[9px] text-muted-foreground">Encajados</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goles por minuto */}
      {ctx?.goles_por_minuto && ctx.actas_con_goles_minuto > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Fortalezas y debilidades por minutos</p>
              <span className="text-[10px] text-muted-foreground">{ctx.actas_con_goles_minuto} actas</span>
            </div>
            <MinuteChart
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

      {/* Once probable compact */}
      {onceTitulares.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              <p className="text-xs font-semibold">11 probable</p>
              {intel.once_probable && (
                <Badge variant="outline" className="text-[9px]">
                  {intel.once_probable.actas_analizadas} actas
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {onceTitulares.map((j, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-[11px] px-2 py-1 rounded ${
                    j.sancionado ? 'bg-red-50 line-through text-red-700' : 'bg-muted/40'
                  }`}
                >
                  <span className="w-5 text-center text-muted-foreground font-mono">{j.dorsal ?? '·'}</span>
                  <span className="truncate flex-1">{j.nombre}</span>
                  {j.sancionado && (
                    <Badge variant="destructive" className="text-[8px] h-4 px-1">Sanc.</Badge>
                  )}
                  <span className="text-[9px] text-muted-foreground">{j.apariciones}/{intel.once_probable?.actas_analizadas}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
