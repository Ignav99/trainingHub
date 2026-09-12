'use client'

import Link from 'next/link'
import { Activity, ArrowRight, Heart } from 'lucide-react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiKey } from '@/lib/swr'
import { useEquipoStore } from '@/stores/equipoStore'
import type { CargaEquipoResponse, CargaJugador } from '@/types'
import {
  acwrTone,
  nivelCargaLabel,
  playerCargaName,
  rpeTone,
  summarizeWarRoomCargas,
} from '@/lib/warRoomCargas'

interface RPEInfo {
  rpe_promedio_semana: number | null
  registros_por_sesion: Record<string, { rpe_promedio: number | null; num_registros: number }>
}

interface WarRoomCargasProps {
  rpe: RPEInfo
}

function detalleCarga(p: CargaJugador): string {
  const bits: string[] = []
  if (p.ratio_acwr != null) bits.push(`ACWR ${p.ratio_acwr.toFixed(2)}`)
  if (p.carga_aguda) bits.push(`aguda ${Math.round(p.carga_aguda)}`)
  return bits.join(' · ') || nivelCargaLabel(p.nivel_carga)
}

export function WarRoomCargas({ rpe }: WarRoomCargasProps) {
  const { equipoActivo } = useEquipoStore()
  const { data: cargaData } = useSWR<CargaEquipoResponse>(
    equipoActivo?.id ? apiKey('/carga/equipo/' + equipoActivo.id) : null,
  )

  const rpeVal = rpe.rpe_promedio_semana
  const rpeLook = rpeTone(rpeVal)
  const players = cargaData?.data || []
  const summary = summarizeWarRoomCargas(players)
  const acwrLook = acwrTone(summary.teamAcwr)
  const sesionesConRpe = Object.values(rpe.registros_por_sesion || {}).filter(
    (s) => s.rpe_promedio != null,
  ).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-600" />
            Cargas
          </CardTitle>
          <Link
            href="/rpe"
            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
          >
            Ver RPE <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi
            value={rpeVal != null ? rpeVal.toFixed(1) : '—'}
            label="RPE semana"
            className={rpeLook.className}
          />
          <Kpi
            value={summary.teamAcwr != null ? summary.teamAcwr.toFixed(2) : '—'}
            label={`ACWR · ${acwrLook.label}`}
            className={acwrLook.className}
          />
          <Kpi
            value={String(summary.enRiesgo)}
            label="En riesgo"
            className={summary.enRiesgo > 0 ? 'text-red-700' : 'text-emerald-700'}
          />
          <Kpi
            value={summary.wellnessMedio != null ? summary.wellnessMedio.toFixed(1) : '—'}
            label="Wellness"
            className="text-foreground"
          />
        </div>

        {rpeVal != null && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="outline" className={`text-[10px] ${rpeLook.badgeClass}`}>
              RPE {rpeLook.label}
            </Badge>
            {sesionesConRpe > 0 ? (
              <span>
                {sesionesConRpe} sesión{sesionesConRpe === 1 ? '' : 'es'} con RPE esta semana
              </span>
            ) : null}
            {summary.cargaMedia > 0 ? (
              <span>Carga aguda media {summary.cargaMedia.toFixed(0)}</span>
            ) : null}
          </div>
        )}

        {summary.alertados === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sin jugadores en alerta de carga. Nadie en crítico, alto, subcarga ni wellness bajo.
          </p>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            <AlertaGrupo
              title="Críticos"
              titleClass="text-red-700"
              players={summary.criticos}
              detail={(p) => detalleCarga(p)}
            />
            <AlertaGrupo
              title="Altos"
              titleClass="text-orange-700"
              players={summary.altos}
              detail={(p) => detalleCarga(p)}
            />
            <AlertaGrupo
              title="Subcarga"
              titleClass="text-sky-700"
              players={summary.subcarga}
              detail={(p) => detalleCarga(p)}
            />
            <AlertaGrupo
              title="Wellness bajo"
              titleClass="text-rose-700"
              players={summary.wellnessBajo}
              detail={(p) => `Wellness ${p.wellness_valor}`}
              icon
            />
            <AlertaGrupo
              title="Sin carga reciente"
              titleClass="text-amber-800"
              players={summary.inactivos}
              detail={(p) => `${p.dias_sin_actividad} días`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Kpi({
  value,
  label,
  className,
}: {
  value: string
  label: string
  className: string
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-2 text-center">
      <p className={`text-xl font-bold tabular-nums ${className}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

function AlertaGrupo({
  title,
  titleClass,
  players,
  detail,
  icon,
}: {
  title: string
  titleClass: string
  players: CargaJugador[]
  detail: (p: CargaJugador) => string
  icon?: boolean
}) {
  if (players.length === 0) return null
  return (
    <div className="space-y-1.5">
      <p className={`text-[10px] font-semibold ${titleClass}`}>
        {title}
        <span className="ml-1 tabular-nums opacity-80">({players.length})</span>
      </p>
      {players.map((p) => (
        <Link
          key={p.jugador_id}
          href={`/plantilla/${p.jugador_id}`}
          className="flex items-center justify-between gap-2 text-[11px] hover:underline"
        >
          <span className="truncate min-w-0">
            {icon ? <Heart className="inline h-3 w-3 mr-1 text-rose-500" /> : null}
            {playerCargaName(p)}
          </span>
          <span className={`${titleClass} shrink-0 tabular-nums`}>{detail(p)}</span>
        </Link>
      ))}
    </div>
  )
}
