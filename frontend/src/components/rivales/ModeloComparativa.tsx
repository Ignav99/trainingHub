'use client'

/**
 * ModeloComparativa — Side-by-side visual comparison between
 * "Nuestro modelo de juego" and "Modelo del rival".
 *
 * Shows: system, style, offensive/defensive principles, transitions,
 * set pieces — with a score-like comparison.
 */

import { Swords, Shuffle, Target, Shield, Zap, Flag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { GameModel, InformeRivalEnriquecido, RivalJugadorClave } from '@/types'

interface ModeloComparativaProps {
  nuestroModelo: Pick<GameModel, 'sistema_juego' | 'estilo' | 'principios_ataque_organizado' | 'principios_defensa_organizada' | 'principios_transicion_of' | 'principios_transicion_def' | 'principios_balon_parado'> | null | undefined
  rivalInfo: InformeRivalEnriquecido | null | undefined
  className?: string
}

type ComparisonRow = {
  label: string
  icon: React.ReactNode
  nuestro: string | string[]
  rival: string | string[]
}

export function ModeloComparativa({ nuestroModelo, rivalInfo, className }: ModeloComparativaProps) {
  // Flatten our game model principles
  const nuestrasFortalezas = [
    ...(nuestroModelo?.principios_ataque_organizado || []).map(p => `Ataque: ${p}`),
    ...(nuestroModelo?.principios_defensa_organizada || []).map(p => `Defensa: ${p}`),
    ...(nuestroModelo?.principios_transicion_of || []).map(p => `Trans. Of: ${p}`),
  ].slice(0, 4)

  const rows: ComparisonRow[] = [
    {
      label: 'Sistema',
      icon: <Shuffle className="h-3.5 w-3.5" />,
      nuestro: nuestroModelo?.sistema_juego || '—',
      rival: rivalInfo?.sistema_juego || '—',
    },
    {
      label: 'Estilo',
      icon: <Target className="h-3.5 w-3.5" />,
      nuestro: nuestroModelo?.estilo || '—',
      rival: rivalInfo?.estilo || '—',
    },
    {
      label: 'Fortalezas',
      icon: <Shield className="h-3.5 w-3.5 text-emerald-500" />,
      nuestro: nuestrasFortalezas.length > 0 ? nuestrasFortalezas : ['—'],
      rival: rivalInfo?.fortalezas?.slice(0, 3) || [],
    },
    {
      label: 'Debilidades',
      icon: <Zap className="h-3.5 w-3.5 text-amber-500" />,
      nuestro: [],
      rival: rivalInfo?.debilidades?.slice(0, 3) || [],
    },
    {
      label: 'Jug. Clave',
      icon: <Target className="h-3.5 w-3.5" />,
      nuestro: 'Ver plantilla',
      rival: rivalInfo?.jugadores_clave?.map((j: RivalJugadorClave) =>
        `${j.nombre}${j.dorsal ? ` (#${j.dorsal})` : ''} — ${j.tipo}`
      ) || [],
    },
    {
      label: 'ABP',
      icon: <Flag className="h-3.5 w-3.5" />,
      nuestro: nuestroModelo?.principios_balon_parado?.slice(0, 2) || ['—'],
      rival: [
        rivalInfo?.abp_ofensivo && `Of: ${rivalInfo.abp_ofensivo}`,
        rivalInfo?.abp_defensivo && `Def: ${rivalInfo.abp_defensivo}`,
      ].filter(Boolean) as string[],
    },
  ]

  const getAdvantage = (row: ComparisonRow): 'nosotros' | 'rival' | 'neutral' => {
    if (!rivalInfo) return 'neutral'
    if (row.label === 'Debilidades') {
      const rivalLen = Array.isArray(row.rival) ? row.rival.length : 1
      if (rivalLen >= 3) return 'nosotros'
      if (rivalLen === 0) return 'rival'
      return 'neutral'
    }
    return 'neutral'
  }

  const ventajasNosotros = rows.filter(r => getAdvantage(r) === 'nosotros').length
  const ventajasRival = rows.filter(r => getAdvantage(r) === 'rival').length

  return (
    <Card className={cn('border-l-4 border-l-indigo-500', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-indigo-600" />
            <span>Comparativa: Nuestro modelo vs Rival</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-emerald-600 font-semibold">Nosotros +{ventajasNosotros}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-amber-600 font-semibold">Rival +{ventajasRival}</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-[90px_1fr_1fr] gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
          <span></span>
          <span className="text-emerald-600 text-center">Nosotros</span>
          <span className="text-amber-600 text-center">Rival</span>
        </div>

        {rows.map((row) => {
          const adv = getAdvantage(row)
          return (
            <div
              key={row.label}
              className="grid grid-cols-[90px_1fr_1fr] gap-2 items-start px-2 py-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-medium">
                {row.icon}
                <span>{row.label}</span>
              </div>

              <div className={cn(
                'text-center rounded-md py-1 px-2',
                adv === 'nosotros' && 'bg-emerald-50 ring-1 ring-emerald-200',
              )}>
                {renderValue(row.nuestro, 'nosotros')}
              </div>

              <div className={cn(
                'text-center rounded-md py-1 px-2',
                adv === 'rival' && 'bg-amber-50 ring-1 ring-amber-200',
              )}>
                {renderValue(row.rival, 'rival')}
              </div>
            </div>
          )
        })}

        {!rivalInfo && (
          <div className="text-center py-6 text-xs text-muted-foreground border rounded-lg border-dashed">
            <p>Genera un informe del rival para ver la comparativa</p>
            <p className="mt-1 text-[10px]">
              Ve a la pestaña &quot;Informes&quot; y usa el chat de IA
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function renderValue(value: string | string[], side: 'nosotros' | 'rival'): React.ReactNode {
  if (value === '—' || value === undefined || value === null) {
    return <span className="text-[10px] text-muted-foreground italic">Sin datos</span>
  }

  if (Array.isArray(value) && value.length === 0) {
    return <span className="text-[10px] text-muted-foreground italic">Sin datos</span>
  }

  if (Array.isArray(value)) {
    return (
      <ul className="space-y-0.5">
        {value.map((v, i) => (
          <li key={i} className="text-[10px] flex items-start gap-1 justify-center">
            <span className="text-muted-foreground mt-0.5">•</span>
            <span>{v}</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        'text-[10px] font-medium',
        side === 'nosotros' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
      )}
    >
      {value}
    </Badge>
  )
}
